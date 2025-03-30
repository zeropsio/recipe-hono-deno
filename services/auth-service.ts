import { createHash } from "https://deno.land/std@0.202.0/crypto/mod.ts";
import { pgPool, db, redisClient } from "../config/db.ts";
import { UserRepository, User, CreateUserInput } from "../models/user.ts";
import { sessions } from "../db/schema.ts";
import { eq, and, gt } from "drizzle-orm";

const userRepository = new UserRepository();

export interface LoginResult {
  success: boolean;
  user?: User;
  session?: string;
  error?: string;
}

export interface RegisterResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class AuthService {
  private readonly SESSION_PREFIX = "session:";
  private readonly SESSION_EXPIRY = 86400; // 24 hours in seconds

  // Hash a password using SHA-256
  // In production, use a proper password hashing library like bcrypt
  private hashPassword(password: string): string {
    const hash = createHash("sha256");
    hash.update(password);
    return hash.toString();
  }

  // Generate a random session ID
  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  // Create a session for a user
  private async createSession(userId: number): Promise<string> {
    const sessionId = this.generateSessionId();
    const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
    
    // Store session in Redis
    await redisClient.set(sessionKey, userId.toString(), { ex: this.SESSION_EXPIRY });
    
    // Also store in PostgreSQL for persistence
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + this.SESSION_EXPIRY);
    
    await db.insert(sessions).values({
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt
    });
    
    return sessionId;
  }

  // Register a new user
  async register(username: string, email: string, password: string): Promise<RegisterResult> {
    try {
      // Check if user already exists
      const existingUser = await userRepository.findByUsername(username);
      if (existingUser) {
        return { success: false, error: "Username already exists" };
      }
      
      const existingEmail = await userRepository.findByEmail(email);
      if (existingEmail) {
        return { success: false, error: "Email already exists" };
      }
      
      // Hash the password
      const passwordHash = this.hashPassword(password);
      
      // Create the user
      const input: CreateUserInput = {
        username,
        email,
        password_hash: passwordHash
      };
      
      const user = await userRepository.create(input);
      
      return {
        success: true,
        user
      };
    } catch (error) {
      console.error("Register error:", error);
      return {
        success: false,
        error: "Failed to register user"
      };
    }
  }

  // Login a user
  async login(username: string, password: string): Promise<LoginResult> {
    try {
      // Find the user
      const user = await userRepository.findByUsername(username);
      if (!user) {
        return { success: false, error: "Invalid username or password" };
      }
      
      // Check password
      const passwordHash = this.hashPassword(password);
      if (user.password_hash !== passwordHash) {
        return { success: false, error: "Invalid username or password" };
      }
      
      // Create a session
      const sessionId = await this.createSession(user.id);
      
      return {
        success: true,
        user,
        session: sessionId
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error: "Failed to login"
      };
    }
  }

  // Validate a session and return the user
  async getSession(sessionId: string): Promise<User | null> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      
      // Check Redis first
      const userId = await redisClient.get(sessionKey);
      if (!userId) {
        // Not in Redis, check PostgreSQL
        const now = new Date();
        const results = await db.select({ user_id: sessions.user_id })
          .from(sessions)
          .where(
            and(
              eq(sessions.id, sessionId),
              gt(sessions.expires_at, now)
            )
          );
        
        if (results.length === 0) {
          return null;
        }
        
        // Found in PostgreSQL, rehydrate Redis
        const dbUserId = results[0].user_id;
        await redisClient.set(sessionKey, dbUserId.toString(), { ex: this.SESSION_EXPIRY });
        
        return await userRepository.findById(dbUserId);
      }
      
      // Found in Redis, extend expiry
      await redisClient.expire(sessionKey, this.SESSION_EXPIRY);
      
      return await userRepository.findById(parseInt(userId));
    } catch (error) {
      console.error("Session validation error:", error);
      return null;
    }
  }

  // Logout a user
  async logout(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = `${this.SESSION_PREFIX}${sessionId}`;
      
      // Remove from Redis
      await redisClient.del(sessionKey);
      
      // Remove from PostgreSQL
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      
      return true;
    } catch (error) {
      console.error("Logout error:", error);
      return false;
    }
  }
} 