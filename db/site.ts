import { drizzle } from "drizzle-orm/d1";

import * as schema from "./site-schema";
import { getRuntimeEnv } from "./runtime-env";

export async function getSiteDb() {
  const env = await getRuntimeEnv();
  if (!env.DB) throw new Error("La base de datos de cuentas no está disponible en este entorno.");
  return drizzle(env.DB, { schema });
}
