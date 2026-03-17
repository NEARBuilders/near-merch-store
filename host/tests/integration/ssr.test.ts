import { Effect } from "every-plugin/effect";
import { loadConfig as loadBosConfig } from "everything-dev/config";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { loadRouterModule } from "@/services/federation.server";
import type { RouterModule } from "@/types";

async function consumeStream(stream: ReadableStream): Promise<string> {
	const reader = stream.getReader();
	const decoder = new TextDecoder();
	let html = "";
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		html += decoder.decode(value, { stream: true });
	}
	html += decoder.decode();
	return html;
}

const mockApiClient = {
	getFeaturedProducts: vi.fn().mockResolvedValue({ products: [] }),
	getCarouselCollections: vi.fn().mockResolvedValue({ collections: [] }),
	getCollections: vi.fn().mockResolvedValue({
		collections: [{ slug: "collectibles", name: "Collectibles" }],
	}),
	getCollection: vi.fn().mockResolvedValue({
		collection: {
			slug: "collectibles",
			name: "Collectibles",
			description: "Collection description",
		},
		products: [],
	}),
	getProducts: vi.fn().mockResolvedValue({ products: [], total: 0 }),
	getProductTypes: vi.fn().mockResolvedValue({ productTypes: [] }),
	getProduct: vi.fn().mockImplementation(({ id }: { id: string }) =>
		Promise.resolve({
			product: {
				id,
				slug: id,
				title: `SSR Product ${id}`,
				description: `SSR description for ${id}`,
				price: 10,
				currency: "USD",
				thumbnailImage: "https://example.com/ssr.png",
				images: [{ url: "https://example.com/ssr.png" }],
				variants: [{ availableForSale: true }],
				options: [],
				collections: [{ slug: "collectibles", name: "Collectibles" }],
			},
		}),
	),
};

describe("SSR Stream Lifecycle", () => {
	let routerModule: RouterModule;
	let config: any;

	beforeAll(async () => {
		globalThis.$apiClient = mockApiClient as never;
		const loadedConfig = await loadBosConfig();
		if (!loadedConfig) {
			throw new Error("Failed to load config for SSR tests");
		}
		config = loadedConfig.runtime;
		const uiUrl = process.env.BOS_UI_URL;
		const uiSsrUrl = process.env.BOS_UI_SSR_URL ?? uiUrl;
		if (uiUrl) config.ui.url = uiUrl;
		if (uiSsrUrl) config.ui.ssrUrl = uiSsrUrl;
		routerModule = await Effect.runPromise(loadRouterModule(config));
	});

	describe("Stream Completion", () => {
		it("completes stream for root route without timeout", async () => {
			const startTime = Date.now();

			const head = await routerModule.getRouteHead("/", {
				assetsUrl: config.ui.url,
				runtimeConfig: {
					env: config.env,
					account: config.account,
					hostUrl: config.hostUrl,
					apiBase: "/api",
					rpcBase: "/api/rpc",
					assetsUrl: config.ui.url,
				},
			});

			const elapsed = Date.now() - startTime;

			expect(head).toBeDefined();
			expect(head.meta).toBeDefined();
			expect(elapsed).toBeLessThan(5000);
		});

		it("completes head extraction for product and collection routes", async () => {
			const [productHead, collectionHead] = await Promise.all([
				routerModule.getRouteHead("/products/ssr-product-1", {
					assetsUrl: config.ui.url,
					runtimeConfig: {
						env: config.env,
						account: config.account,
						hostUrl: config.hostUrl,
						apiBase: "/api",
						rpcBase: "/api/rpc",
						assetsUrl: config.ui.url,
					},
				}),
				routerModule.getRouteHead("/collections/collectibles", {
					assetsUrl: config.ui.url,
					runtimeConfig: {
						env: config.env,
						account: config.account,
						hostUrl: config.hostUrl,
						apiBase: "/api",
						rpcBase: "/api/rpc",
						assetsUrl: config.ui.url,
					},
				}),
			]);

			expect(productHead.meta.length).toBeGreaterThan(0);
			expect(collectionHead.meta.length).toBeGreaterThan(0);
		});

		// NOTE: Authenticated routes are configured with `ssr: false` in the demo UI.
	});

	describe("SSR Configuration", () => {
		it("renders layout route metadata", async () => {
			const head = await routerModule.getRouteHead("/", {
				assetsUrl: config.ui.url,
				runtimeConfig: {
					env: config.env,
					account: config.account,
					hostUrl: config.hostUrl,
					apiBase: "/api",
					rpcBase: "/api/rpc",
					assetsUrl: config.ui.url,
				},
			});

			const titleMeta = head.meta.find(
				(m) => m && typeof m === "object" && "title" in m,
			);
			expect(titleMeta).toBeDefined();
		});

		// NOTE: Auth routes behavior depends on auth strategy.
	});

	describe("SSR Routes", () => {
		const STREAM_TIMEOUT = 5000;

		it("renders root route with full SSR", { timeout: 6000 }, async () => {
			const request = new Request("http://localhost/");
			const startTime = Date.now();

			const result = await routerModule.renderToStream(request, {
				assetsUrl: config.ui.url,
				runtimeConfig: {
					env: config.env,
					account: config.account,
					hostUrl: config.hostUrl,
					apiBase: "/api",
					rpcBase: "/api/rpc",
					assetsUrl: config.ui.url,
				},
			});

			const html = await consumeStream(result.stream);
			const elapsed = Date.now() - startTime;

			expect(elapsed).toBeLessThan(STREAM_TIMEOUT);
			expect(result.statusCode).toBe(200);
			expect(html).toContain("<!DOCTYPE html>");
			expect(html).toContain("</html>");
			expect(html).toContain("NEAR Merch Store");
		});

		it("renders product route with full SSR", { timeout: 6000 }, async () => {
			const request = new Request("http://localhost/products/ssr-product-1");
			const result = await routerModule.renderToStream(request, {
				assetsUrl: config.ui.url,
				runtimeConfig: {
					env: config.env,
					account: config.account,
					hostUrl: config.hostUrl,
					apiBase: "/api",
					rpcBase: "/api/rpc",
					assetsUrl: config.ui.url,
				},
			});

			const html = await consumeStream(result.stream);
			expect(result.statusCode).toBe(200);
			expect(html).toContain("SSR Product ssr-product-1");
		});
	});

	describe("Full Stream Rendering", () => {
		const STREAM_TIMEOUT = 5000;

		it(
			"completes full stream render for root route",
			{ timeout: 6000 },
			async () => {
				const request = new Request("http://localhost/");
				const startTime = Date.now();

				const result = await routerModule.renderToStream(request, {
					assetsUrl: config.ui.url,
					runtimeConfig: {
						env: config.env,
						account: config.account,
						hostUrl: config.hostUrl,
						apiBase: "/api",
						rpcBase: "/api/rpc",
						assetsUrl: config.ui.url,
					},
				});

				const html = await consumeStream(result.stream);
				const elapsed = Date.now() - startTime;

				expect(elapsed).toBeLessThan(STREAM_TIMEOUT);
				expect(result.statusCode).toBe(200);
				expect(html).toContain("<!DOCTYPE html>");
				expect(html).toContain("</html>");
			},
		);

		it(
			"completes full stream render for collection route",
			{ timeout: 6000 },
			async () => {
				const request = new Request("http://localhost/collections/collectibles");
				const result = await routerModule.renderToStream(request, {
					assetsUrl: config.ui.url,
					runtimeConfig: {
						env: config.env,
						account: config.account,
						hostUrl: config.hostUrl,
						apiBase: "/api",
						rpcBase: "/api/rpc",
						assetsUrl: config.ui.url,
					},
				});

				const html = await consumeStream(result.stream);
				expect(result.statusCode).toBe(200);
				expect(html).toContain("Collectibles");
			},
		);
	});
});
