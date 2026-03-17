import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// Prevent multiple connections during Next.js HMR in development
declare global {
  // eslint-disable-next-line no-var
  var _pgClient: ReturnType<typeof postgres> | undefined
}

const client =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis._pgClient ?? (postgres as any)(process.env.DATABASE_URL!, { max: 10, family: 4 })

if (process.env.NODE_ENV !== "production") globalThis._pgClient = client

export const db = drizzle(client, { schema })
