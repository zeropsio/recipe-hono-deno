import { drizzle } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Client } from "pg";
import * as schema from "../db/schema.ts";
import { pgSQL } from "drizzle-orm/pg-core";
import * as fs from "https://deno.land/std@0.202.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.202.0/path/mod.ts";

// Get connection details from environment
const databaseUrl = Deno.env.get("DATABASE_URL") || "postgres://postgres:postgres@localhost:5432/hono_app";

async function generateSchema() {
  console.log("Generating SQL schema from Drizzle schema...");
  
  // Generate SQL
  const sql = pgSQL.dialect.createTableSQL(schema.users) +
    pgSQL.dialect.createTableSQL(schema.tasks) +
    pgSQL.dialect.createTableSQL(schema.sessions);
  
  // Create directory if it doesn't exist
  await fs.ensureDir("./migrations");
  
  // Write SQL to file
  const filePath = path.join("./migrations", "schema.sql");
  await Deno.writeTextFile(filePath, sql);
  
  console.log(`Schema generated and saved to ${filePath}`);
}

// Run the generation
if (import.meta.main) {
  await generateSchema();
} 