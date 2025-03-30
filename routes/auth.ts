import { Hono } from "hono";
import { zValidator } from "hono/zod-validator";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { AuthService } from "../services/auth-service.ts";
import { authenticate } from "../middleware/auth.ts";

const authService = new AuthService();
const auth = new Hono();

// Register validation schema
const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6)
});

// Login validation schema
const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

// Register a new user
auth.post(
  "/register", 
  zValidator("json", registerSchema),
  async (c) => {
    const { username, email, password } = c.req.valid("json");
    
    const result = await authService.register(username, email, password);
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    // Don't return the password hash
    const { password_hash, ...user } = result.user!;
    
    return c.json({ 
      message: "User registered successfully",
      user
    }, 201);
  }
);

// Login a user
auth.post(
  "/login", 
  zValidator("json", loginSchema),
  async (c) => {
    const { username, password } = c.req.valid("json");
    
    const result = await authService.login(username, password);
    
    if (!result.success) {
      return c.json({ error: result.error }, 401);
    }
    
    // Set the session cookie
    c.cookie("session_id", result.session!, {
      httpOnly: true,
      secure: Deno.env.get("NODE_ENV") === "production",
      sameSite: "Strict",
      maxAge: 86400, // 24 hours
      path: "/"
    });
    
    // Don't return the password hash
    const { password_hash, ...user } = result.user!;
    
    return c.json({
      message: "Login successful",
      user,
      sessionId: result.session
    });
  }
);

// Get current user
auth.get(
  "/me",
  authenticate,
  (c) => {
    const user = c.get("user");
    
    // Don't return the password hash
    const { password_hash, ...userData } = user;
    
    return c.json({ user: userData });
  }
);

// Logout
auth.post(
  "/logout",
  authenticate,
  async (c) => {
    const sessionId = c.get("sessionId");
    
    await authService.logout(sessionId);
    
    // Clear the session cookie
    c.cookie("session_id", "", {
      httpOnly: true,
      secure: Deno.env.get("NODE_ENV") === "production",
      sameSite: "Strict",
      maxAge: 0,
      path: "/"
    });
    
    return c.json({ message: "Logged out successfully" });
  }
);

export default auth; 