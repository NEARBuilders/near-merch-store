import { Effect } from 'every-plugin/effect';
import type { MockupStyle, MockupStyleInfo, MockupTaskResult, MockupResult } from '../schema';

interface PrintfulMockupStyleV2 {
  placement: string;
  display_name: string;
  technique: string;
  print_area_width: number;
  print_area_height: number;
  print_area_type: string;
  dpi: number;
  mockup_styles: Array<{
    id: number;
    category_name: string;
    view_name: string;
    restricted_to_variants: number[] | null;
  }>;
}

interface PrintfulMockupTaskV2 {
  id: number;
  status: 'pending' | 'completed' | 'failed';
  catalog_variant_mockups: Array<{
    catalog_variant_id: number;
    mockups: Array<{
      placement: string;
      mockup_style_id: number;
      mockup_url: string;
    }>;
  }>;
  failure_reasons: string[];
  _links?: {
    self?: { href: string };
  };
}

export class PrintfulMockupService {
  private v2BaseUrl = 'https://api.printful.com/v2';

  constructor(
    private readonly apiKey: string,
    private readonly storeId?: string
  ) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
    if (this.storeId) {
      headers['X-PF-Store-Id'] = this.storeId;
    }
    return headers;
  }

  getMockupStyles(productId: number) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(
          `${this.v2BaseUrl}/catalog-products/${productId}/mockup-styles`,
          { headers: this.getHeaders() }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to get mockup styles: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { data: PrintfulMockupStyleV2[] };

        const styles: MockupStyleInfo[] = [];
        for (const placementStyle of result.data) {
          for (const mockupStyle of placementStyle.mockup_styles) {
            styles.push({
              id: String(mockupStyle.id),
              name: `${mockupStyle.category_name} - ${mockupStyle.view_name}`,
              category: mockupStyle.category_name,
              placement: placementStyle.placement,
              technique: placementStyle.technique,
              viewName: mockupStyle.view_name,
            });
          }
        }

        return { styles };
      },
      catch: (e) => new Error(`Failed to get mockup styles: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  generateMockups(params: {
    productId: number;
    variantIds: number[];
    files: Array<{ placement: string; imageUrl: string; technique?: string }>;
    mockupStyleIds?: number[];
    styles?: MockupStyle[];
    format?: 'jpg' | 'png';
  }) {
    return Effect.tryPromise({
      try: async () => {
        const placements = params.files.map((f) => ({
          placement: f.placement,
          technique: f.technique || 'dtg',
          layers: [
            {
              type: 'file' as const,
              url: f.imageUrl,
            },
          ],
        }));

        const requestBody = {
          format: params.format || 'jpg',
          products: [
            {
              source: 'catalog' as const,
              mockup_style_ids: params.mockupStyleIds || [],
              catalog_product_id: params.productId,
              catalog_variant_ids: params.variantIds,
              placements,
            },
          ],
        };

        const response = await fetch(`${this.v2BaseUrl}/mockup-tasks`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to generate mockups: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { data: PrintfulMockupTaskV2[] };
        const task = result.data[0];
        return { taskId: String(task?.id || '') };
      },
      catch: (e) => new Error(`Failed to generate mockups: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  getMockupResult(taskId: string) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(
          `${this.v2BaseUrl}/mockup-tasks?id=${taskId}`,
          { headers: this.getHeaders() }
        );

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Failed to get mockup result: ${response.status} - ${errorBody}`);
        }

        const result = (await response.json()) as { data: PrintfulMockupTaskV2[] };
        const task = result.data[0];

        if (!task) {
          return { status: 'failed' as const, mockups: [] };
        }

        if (task.status === 'completed' && task.catalog_variant_mockups) {
          const mockups: MockupResult[] = [];
          
          for (const variantMockup of task.catalog_variant_mockups) {
            for (const mockup of variantMockup.mockups) {
              mockups.push({
                variantId: variantMockup.catalog_variant_id,
                placement: mockup.placement,
                style: String(mockup.mockup_style_id),
                imageUrl: mockup.mockup_url,
              });
            }
          }

          return { status: 'completed' as const, mockups };
        }

        if (task.status === 'failed' && task.failure_reasons?.length > 0) {
          return { 
            status: 'failed' as const, 
            mockups: [],
            error: task.failure_reasons.join(', '),
          };
        }

        return { 
          status: task.status as 'pending' | 'failed', 
          mockups: [] 
        };
      },
      catch: (e) => new Error(`Failed to get mockup result: ${e instanceof Error ? e.message : String(e)}`),
    });
  }

  pollMockupTask(taskId: string, maxAttempts = 30, intervalMs = 2000): Effect.Effect<MockupTaskResult, Error> {
    return Effect.gen(this, function* () {
      let attempts = 0;

      while (attempts < maxAttempts) {
        const result = yield* this.getMockupResult(taskId);

        if (result.status === 'completed') {
          return result;
        }

        if (result.status === 'failed') {
          return yield* Effect.fail(new Error(`Mockup generation failed for task ${taskId}`));
        }

        yield* Effect.sleep(`${intervalMs} millis`);
        attempts++;
      }

      return yield* Effect.fail(new Error(`Mockup generation timed out for task ${taskId}`));
    });
  }

  generateAndWaitForMockups(params: {
    productId: number;
    variantIds: number[];
    files: Array<{ placement: string; imageUrl: string; technique?: string }>;
    mockupStyleIds?: number[];
    styles?: MockupStyle[];
    format?: 'jpg' | 'png';
  }): Effect.Effect<MockupTaskResult, Error> {
    return Effect.gen(this, function* () {
      const { taskId } = yield* this.generateMockups(params);
      return yield* this.pollMockupTask(taskId);
    });
  }
}
