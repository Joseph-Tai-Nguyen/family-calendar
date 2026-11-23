/** Bindings available to the Worker (see wrangler.jsonc and .dev.vars.example). */
export interface AppEnv {
  ASSETS: Fetcher;
  KV: KVNamespace;
  APP_URL: string;
  SPREADSHEET_TITLE: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** base64-encoded 32-byte key used to encrypt Google refresh tokens at rest */
  TOKEN_ENCRYPTION_KEY: string;
}

/** Stored at KV key `user:<google sub>` */
export interface UserRecord {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  /** AES-GCM encrypted refresh token (base64url iv.ciphertext) */
  refreshToken: string;
  spreadsheetId?: string;
  feedToken?: string;
  createdAt: string;
}
