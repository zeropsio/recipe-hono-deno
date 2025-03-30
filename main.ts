import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { compress } from 'hono/compress'
import { prettyJSON } from 'hono/pretty-json'
import { initDb, initRedis } from './config/db.ts'
import { errorHandler, notFoundHandler } from './middleware/error.ts'

// Import routes
import authRoutes from './routes/auth.ts'
import taskRoutes from './routes/tasks.ts'
import healthRoutes from './routes/health.ts'

// Initialize database and Redis connections
await Promise.all([initDb(), initRedis()])

// Create the main application
const app = new Hono()

// Apply global middleware
app.use('*', logger())
app.use('*', compress())
app.use('*', prettyJSON())
app.use('*', secureHeaders())
app.use('*', cors())
app.use('*', errorHandler)

// Welcome route
app.get('/', (c) => {
  return c.json({
    message: 'Welcome to Hono API with PostgreSQL and Redis',
    documentation: '/docs',
    health: '/health'
  })
})

// Mount routes
app.route('/auth', authRoutes)
app.route('/tasks', taskRoutes)
app.route('/health', healthRoutes)

// Handle 404 for any unmatched routes
app.notFound(notFoundHandler)

// Start the server
console.log(`🚀 Server is running on http://localhost:8000`)
Deno.serve({ port: 8000 }, app.fetch) 
