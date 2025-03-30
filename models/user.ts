import { pgPool, db } from "../config/db.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password_hash: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  password_hash?: string;
}

export class UserRepository {
  async findAll(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.created_at);
  }

  async findById(id: number): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results[0] || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.username, username));
    return results[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const results = await db.select().from(users).where(eq(users.email, email));
    return results[0] || null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const result = await db.insert(users).values({
      username: input.username,
      email: input.email,
      password_hash: input.password_hash
    }).returning();
    
    return result[0];
  }

  async update(id: number, input: UpdateUserInput): Promise<User | null> {
    // Only include fields that are provided
    const updateValues: Partial<User> = {};
    
    if (input.username !== undefined) {
      updateValues.username = input.username;
    }
    
    if (input.email !== undefined) {
      updateValues.email = input.email;
    }
    
    if (input.password_hash !== undefined) {
      updateValues.password_hash = input.password_hash;
    }
    
    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();
    
    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const result = await db.update(users)
      .set(updateValues)
      .where(eq(users.id, id))
      .returning();
    
    return result[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
} 