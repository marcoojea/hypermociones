import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./site-schema";

export function getSiteDb() {
  if (!env.DB) throw new Error("La base de datos de cuentas no está disponible en este entorno.");
  return drizzle(env.DB, { schema });
}
