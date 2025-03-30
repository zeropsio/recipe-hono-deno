import { Context, Next } from "hono";
import { AuthService } from "../services/auth-service.ts";

const authService = new AuthService();

// Middleware to check if the user is authenticated
export async function authenticate(c: Context, next: Next) {
  const sessionId = c.req.header("X-Session-ID") || c.req.cookie("session_id");
  
  if (!sessionId) {
    return c.json({ error: "Authentication required" }, 401);
  }
  
  const user = await authService.getSession(sessionId);
  
  if (!user) {
    return c.json({ error: "Invalid or expired session" }, 401);
  }
  
  // Store the authenticated user in the context
  c.set("user", user);
  c.set("sessionId", sessionId);
  
  await next();
} 