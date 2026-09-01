import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

export interface StorageResult {
  storage: "r2" | "blob";
  url: string | null;
  data: Buffer | null;
}

export interface StorageAdapter {
  save(key: string, data: Buffer, contentType: string): Promise<StorageResult>;
}

/**
 * Storage adapter: Cloudflare R2 (S3-compatible) when credentials are present,
 * otherwise DB BLOB (returns the raw bytes for the caller to persist).
 */
class R2Storage implements StorageAdapter {
  private client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }

  async save(key: string, data: Buffer, contentType: string): Promise<StorageResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: config.r2.bucketName,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    const base = config.r2.publicUrl || `https://${config.r2.bucketName}.r2.dev`;
    return { storage: "r2", url: `${base}/${key}`, data: null };
  }
}

class BlobStorage implements StorageAdapter {
  async save(_key: string, data: Buffer, _contentType: string): Promise<StorageResult> {
    return { storage: "blob", url: null, data };
  }
}

let adapter: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (!adapter) {
    adapter = config.r2Enabled ? new R2Storage() : new BlobStorage();
  }
  return adapter;
}

export function storageMode(): "r2" | "blob" {
  return config.r2Enabled ? "r2" : "blob";
}
