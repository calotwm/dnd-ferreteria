export const config = {
  env: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? "0.0.0.0",
  jwtSecret: process.env.JWT_SECRET ?? "dev-jwt-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshSecret: process.env.REFRESH_SECRET ?? "dev-refresh-secret",
  refreshExpiresIn: process.env.REFRESH_EXPIRES_IN ?? "7d",
  cookieName: "dnd_refresh",
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucketName: process.env.R2_BUCKET_NAME ?? "",
    publicUrl: process.env.R2_PUBLIC_URL ?? "",
  },
  /** True when R2/S3 credentials are configured; otherwise use DB BLOB fallback. */
  get r2Enabled(): boolean {
    return Boolean(this.r2.accessKeyId && this.r2.secretAccessKey && this.r2.bucketName);
  },
};

export type AppConfig = typeof config;
