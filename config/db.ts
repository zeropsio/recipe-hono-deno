import { createClient } from "redis";
import { Pool, PoolClient } from "postgres";
import { drizzle } from "drizzle-orm";
import * as schema from "../db/schema.ts";

// PostgreSQL connection pool
export const pgPool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL") || "postgres://postgres:postgres@localhost:5432/hono_app",
  tls: {
    enabled: false,
  },
});

// Create Drizzle ORM instance
export const db = drizzle(pgPool, { schema });

// Redis client
export const redisClient = createClient({
  hostname: Deno.env.get("REDIS_HOST") || "localhost",
  port: parseInt(Deno.env.get("REDIS_PORT") || "6379")
});

// Initialize Redis connection
export async function initRedis() {
  await redisClient.connect();
  console.log("Redis connection established");
}

// Initialize and test database connection
export async function initDb() {
  try {
    // Test connection using Drizzle
    const result = await db.select({ value: 1 }).execute();
    console.log("PostgreSQL connection established");
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
    throw error;
  }
} 