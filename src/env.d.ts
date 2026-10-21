// Cloudflare bindings type declarations
interface CloudflareEnv {
  DB: D1Database;
  R2: R2Bucket;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production';
    }
  }
}

export {};
