declare module "cloudflare:workers" {
  import type { drizzle } from "drizzle-orm/d1";

  export const env: {
    DB?: Parameters<typeof drizzle>[0];
  };
}
