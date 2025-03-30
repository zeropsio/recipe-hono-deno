import { pgPool, db } from "../config/db.ts";
import { readAll } from "https://deno.land/std@0.202.0/streams/read_all.ts";
import { drizzle } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import * as schema from "../db/schema.ts";

async function initDatabase() {
  try {
    console.log("Initializing database schema...");
    
    // Check if we have a migration file
    let sql = "";
    try {
      const file = await Deno.open("migrations/schema.sql");
      sql = new TextDecoder().decode(await readAll(file));
      file.close();
      console.log("Using generated SQL migration");
    } catch (error) {
      console.log("No migration file found, using Drizzle schema directly");
      
      // Create tables directly using Drizzle
      await db.execute(schema.users);
      await db.execute(schema.tasks);
      await db.execute(schema.sessions);
      
      console.log("Database schema initialized successfully with Drizzle");
      return;
    }
    
    // Run schema SQL from migration file
    await pgPool.queryObject(sql);
    
    console.log("Database schema initialized successfully from migration");
  } catch (error) {
    console.error("Error initializing database schema:", error);
    throw error;
  } finally {
    // Close the pool
    await pgPool.end();
  }
}

// Run the initialization
if (import.meta.main) {
  await initDatabase();
} 