import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle",
  schema: "./db/site-schema.ts",
  dialect: "sqlite",
});
