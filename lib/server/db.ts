import { Pool } from "pg"

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.warn("DATABASE_URL is not set. API routes will fail without it.")
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
})
