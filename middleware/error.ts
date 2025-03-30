import { Context, Next } from "hono";

// Middleware to handle errors
export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error("Unhandled error:", error);
    
    if (error instanceof Error) {
      return c.json({
        error: "An unexpected error occurred",
        message: error.message,
        stack: Deno.env.get("NODE_ENV") === "development" ? error.stack : undefined
      }, 500);
    }
    
    return c.json({
      error: "An unexpected error occurred"
    }, 500);
  }
}

// Middleware to handle not found routes
export function notFoundHandler(c: Context) {
  return c.json({
    error: "Not Found",
    message: `No route found for ${c.req.method} ${c.req.url}`
  }, 404);
} 