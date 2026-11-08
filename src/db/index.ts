import { Pool, neonConfig } from "@neondatabase/serverless";
import WebSocket from "ws";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

neonConfig.webSocketConstructor = WebSocket;

// Use the Neon POOLER connection URL. WebSockets support interactive transactions;
// unlike HTTP-only queries, joins/locks/atomic membership renewals remain safe.
const globalForDb = globalThis as unknown as { fitnessPool?: Pool };
function getPool() {
  // The placeholder permits local UI preview without contacting a database.
  // Every real DB query still requires a valid DATABASE_URL.
  if (!globalForDb.fitnessPool) {
    globalForDb.fitnessPool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://unused:unused@localhost:5432/unused", max: 5 });
  }
  return globalForDb.fitnessPool;
}

// Lazy connection lets a credential-free demo build and render without connecting.
export const db = drizzle({ client: getPool(), schema });
