import { AwsClient } from 'aws4fetch';

interface AwsSignOptions {
  signQuery?: boolean;
  allHeaders?: boolean;
  expires?: number;
  appendSessionToken?: boolean;
}

export class R2Client {
  private client: AwsClient;
  private bucket: string;
  private endpoint: string;
  private publicUrl: string;

  constructor(config: {
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    endpoint: string;
    publicUrl?: string;
  }) {
    this.client = new AwsClient({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      service: 's3',
      region: 'auto',
    });
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
    this.publicUrl = config.publicUrl || `${config.endpoint}/${config.bucket}`;
  }

  async generatePresignedPutUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    const signed = await this.client.sign(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      aws: { signQuery: true, allHeaders: true, expires: expiresIn } as Parameters<typeof this.client.sign>[1] extends { aws?: infer A } ? A : never,
    });
    return signed.url;
  }

  async generatePresignedGetUrl(key: string, expiresIn = 3600): Promise<string> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    const signed = await this.client.sign(url, {
      aws: { signQuery: true, expires: expiresIn } as Parameters<typeof this.client.sign>[1] extends { aws?: infer A } ? A : never,
    });
    return signed.url;
  }

  async deleteObject(key: string): Promise<void> {
    const url = `${this.endpoint}/${this.bucket}/${key}`;
    const response = await this.client.fetch(url, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete object: ${response.status} ${await response.text()}`);
    }
  }

  async headObject(key: string): Promise<{ size: number; contentType?: string; lastModified?: Date } | null> {
    try {
      const url = `${this.endpoint}/${this.bucket}/${key}`;
      const response = await this.client.fetch(url, { method: 'HEAD' });
      if (!response.ok) return null;
      return {
        size: parseInt(response.headers.get('content-length') ?? '0', 10),
        contentType: response.headers.get('content-type') ?? undefined,
        lastModified: response.headers.get('last-modified')
          ? new Date(response.headers.get('last-modified')!)
          : undefined,
      };
    } catch {
      return null;
    }
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`;
  }

  getBucket(): string {
    return this.bucket;
  }
}