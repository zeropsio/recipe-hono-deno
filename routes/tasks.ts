import { Hono } from "hono";
import { zValidator } from "hono/zod-validator";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { TaskRepository } from "../models/task.ts";
import { authenticate } from "../middleware/auth.ts";
import { User } from "../models/user.ts";

const taskRepository = new TaskRepository();
const tasks = new Hono();

// Apply authentication to all routes
tasks.use("*", authenticate);

// Create task validation schema
const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  due_date: z.string().optional().transform(str => str ? new Date(str) : undefined)
});

// Update task validation schema
const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  due_date: z.string().optional().nullable().transform(str => {
    if (str === null) return null;
    return str ? new Date(str) : undefined;
  })
});

// Get all tasks for current user
tasks.get("/", async (c) => {
  const user = c.get("user") as User;
  
  const taskList = await taskRepository.findByUserId(user.id);
  
  return c.json({ tasks: taskList });
});

// Get a specific task
tasks.get("/:id", async (c) => {
  const user = c.get("user") as User;
  const taskId = parseInt(c.req.param("id"));
  
  if (isNaN(taskId)) {
    return c.json({ error: "Invalid task ID" }, 400);
  }
  
  const task = await taskRepository.findById(taskId);
  
  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }
  
  // Check task ownership
  if (task.user_id !== user.id) {
    return c.json({ error: "Access denied" }, 403);
  }
  
  return c.json({ task });
});

// Create a new task
tasks.post(
  "/", 
  zValidator("json", createTaskSchema),
  async (c) => {
    const user = c.get("user") as User;
    const data = c.req.valid("json");
    
    const task = await taskRepository.create({ 
      user_id: user.id,
      ...data
    });
    
    return c.json({ 
      message: "Task created successfully",
      task 
    }, 201);
  }
);

// Update a task
tasks.put(
  "/:id",
  zValidator("json", updateTaskSchema),
  async (c) => {
    const user = c.get("user") as User;
    const taskId = parseInt(c.req.param("id"));
    const data = c.req.valid("json");
    
    if (isNaN(taskId)) {
      return c.json({ error: "Invalid task ID" }, 400);
    }
    
    // Verify task exists and belongs to user
    const existingTask = await taskRepository.findById(taskId);
    
    if (!existingTask) {
      return c.json({ error: "Task not found" }, 404);
    }
    
    if (existingTask.user_id !== user.id) {
      return c.json({ error: "Access denied" }, 403);
    }
    
    const updatedTask = await taskRepository.update(taskId, data);
    
    return c.json({ 
      message: "Task updated successfully",
      task: updatedTask 
    });
  }
);

// Delete a task
tasks.delete("/:id", async (c) => {
  const user = c.get("user") as User;
  const taskId = parseInt(c.req.param("id"));
  
  if (isNaN(taskId)) {
    return c.json({ error: "Invalid task ID" }, 400);
  }
  
  // Verify task exists and belongs to user
  const existingTask = await taskRepository.findById(taskId);
  
  if (!existingTask) {
    return c.json({ error: "Task not found" }, 404);
  }
  
  if (existingTask.user_id !== user.id) {
    return c.json({ error: "Access denied" }, 403);
  }
  
  await taskRepository.delete(taskId);
  
  return c.json({ message: "Task deleted successfully" });
});

export default tasks; 