import { pgPool, db, redisClient } from "../config/db.ts";
import { tasks } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description: string | null;
  status: string;
  priority: number;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateTaskInput {
  user_id: number;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
  due_date?: Date;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: string;
  priority?: number;
  due_date?: Date | null;
}

export class TaskRepository {
  private cacheKeyPrefix = "task:";
  private cacheExpiry = 300; // 5 minutes in seconds

  // Helper to create a cache key
  private getCacheKey(id: number) {
    return `${this.cacheKeyPrefix}${id}`;
  }

  // Helper to create a user's tasks list cache key
  private getUserTasksCacheKey(userId: number) {
    return `user:${userId}:tasks`;
  }

  async findAll(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.created_at));
  }

  async findById(id: number): Promise<Task | null> {
    // Try to get from cache first
    const cacheKey = this.getCacheKey(id);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error("Redis error:", error);
      // Continue to database if cache fails
    }

    // Get from database
    const results = await db.select().from(tasks).where(eq(tasks.id, id));
    const task = results[0] || null;
    
    // Cache the result if found
    if (task) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(task), { ex: this.cacheExpiry });
      } catch (error) {
        console.error("Redis caching error:", error);
      }
    }
    
    return task;
  }

  async findByUserId(userId: number): Promise<Task[]> {
    // Try to get from cache first
    const cacheKey = this.getUserTasksCacheKey(userId);
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error("Redis error:", error);
    }

    // Get from database
    const results = await db.select()
      .from(tasks)
      .where(eq(tasks.user_id, userId))
      .orderBy(desc(tasks.created_at));
    
    // Cache the results
    try {
      await redisClient.set(cacheKey, JSON.stringify(results), { ex: this.cacheExpiry });
    } catch (error) {
      console.error("Redis caching error:", error);
    }
    
    return results;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const result = await db.insert(tasks).values({
      user_id: input.user_id,
      title: input.title,
      description: input.description || null,
      status: input.status || 'pending',
      priority: input.priority || 1,
      due_date: input.due_date || null
    }).returning();
    
    const task = result[0];
    
    // Invalidate user's tasks cache
    try {
      await redisClient.del(this.getUserTasksCacheKey(input.user_id));
    } catch (error) {
      console.error("Redis cache invalidation error:", error);
    }
    
    return task;
  }

  async update(id: number, input: UpdateTaskInput): Promise<Task | null> {
    // First get the current task to check user_id for cache invalidation
    const currentTask = await this.findById(id);
    if (!currentTask) {
      return null;
    }

    // Only include fields that are provided
    const updateValues: Partial<Task> = {};
    
    if (input.title !== undefined) {
      updateValues.title = input.title;
    }
    
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    
    if (input.status !== undefined) {
      updateValues.status = input.status;
    }
    
    if (input.priority !== undefined) {
      updateValues.priority = input.priority;
    }
    
    if (input.due_date !== undefined) {
      updateValues.due_date = input.due_date;
    }
    
    // Always update the updated_at timestamp
    updateValues.updated_at = new Date();
    
    if (Object.keys(updateValues).length === 0) {
      return this.findById(id);
    }

    const result = await db.update(tasks)
      .set(updateValues)
      .where(eq(tasks.id, id))
      .returning();
    
    const task = result[0] || null;
    
    if (task) {
      // Invalidate caches
      try {
        await redisClient.del(this.getCacheKey(id));
        await redisClient.del(this.getUserTasksCacheKey(currentTask.user_id));
      } catch (error) {
        console.error("Redis cache invalidation error:", error);
      }
    }
    
    return task;
  }

  async delete(id: number): Promise<boolean> {
    // First get the current task to check user_id for cache invalidation
    const currentTask = await this.findById(id);
    if (!currentTask) {
      return false;
    }

    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    const success = result.length > 0;
    
    if (success) {
      // Invalidate caches
      try {
        await redisClient.del(this.getCacheKey(id));
        await redisClient.del(this.getUserTasksCacheKey(currentTask.user_id));
      } catch (error) {
        console.error("Redis cache invalidation error:", error);
      }
    }
    
    return success;
  }
} 