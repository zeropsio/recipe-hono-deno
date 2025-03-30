import { Hono } from "hono";
import { pgPool, db, redisClient } from "../config/db.ts";

const health = new Hono();

health.get("/", async (c) => {
  const response = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      api: { status: "healthy" },
      postgresql: { status: "unknown" },
      redis: { status: "unknown" }
    }
  };

  // Check PostgreSQL
  try {
    const start = performance.now();
    // Using Drizzle ORM for the health check
    await db.select({ value: 1 }).execute();
    const end = performance.now();
    
    response.services.postgresql = {
      status: "healthy",
      responseTime: `${(end - start).toFixed(2)}ms`
    };
  } catch (error) {
    console.error("PostgreSQL health check failed:", error);
    response.services.postgresql = {
      status: "unhealthy",
      error: error.message
    };
    response.status = "degraded";
  }

  // Check Redis
  try {
    const start = performance.now();
    await redisClient.ping();
    const end = performance.now();
    
    response.services.redis = {
      status: "healthy",
      responseTime: `${(end - start).toFixed(2)}ms`
    };
  } catch (error) {
    console.error("Redis health check failed:", error);
    response.services.redis = {
      status: "unhealthy",
      error: error.message
    };
    response.status = "degraded";
  }

  // If any service is down, change status to "degraded"
  if (Object.values(response.services).some(service => service.status === "unhealthy")) {
    response.status = "degraded";
  }

  const statusCode = response.status === "ok" ? 200 : 503;
  return c.json(response, statusCode);
});

export default health; 