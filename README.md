# Hono Backend with PostgreSQL, Redis and Drizzle ORM

A robust, production-ready backend API built with [Hono](https://hono.dev), PostgreSQL, Redis, and Drizzle ORM on Deno.

## Features

- 🚀 **Ultrafast & Lightweight**: Built on Hono, an ultrafast web framework
- 🔐 **Authentication**: Complete JWT-based auth system with session management
- 📊 **PostgreSQL Integration**: Efficient database operations with connection pooling
- 🧠 **Drizzle ORM**: Type-safe database access with Drizzle ORM
- ⚡ **Redis Caching**: Fast response times with Redis caching layer
- 🔄 **CRUD Operations**: Complete API for task management
- ✅ **Validation**: Request validation using Zod schemas
- 🔒 **Security**: Secure headers, CORS, and other security best practices
- 📝 **TypeScript**: Fully typed codebase for better developer experience
- 🦕 **Deno Runtime**: Modern JavaScript runtime with built-in TypeScript support

## Getting Started

1. Clone this repository
2. Install dependencies:

```bash
deno cache main.ts
```

3. Generate database schema SQL (optional):

```bash
deno task generate
```

4. Initialize the database:

```bash
deno run --allow-net --allow-env --allow-read --allow-write scripts/init-db.ts
```

5. Start the server:

```bash
deno task start
```

Or for development with hot reload:

```bash
deno task dev
```

The server will be running at http://localhost:8000

## API Documentation

### Authentication

- **POST /auth/register** - Register a new user
- **POST /auth/login** - Login a user
- **GET /auth/me** - Get current user info
- **POST /auth/logout** - Logout a user

### Tasks

- **GET /tasks** - Get all tasks for current user
- **GET /tasks/:id** - Get a specific task
- **POST /tasks** - Create a new task
- **PUT /tasks/:id** - Update a task
- **DELETE /tasks/:id** - Delete a task

### Health Check

- **GET /health** - Check health of all services

## Project Structure

```
├── config/            # Configuration files
│   └── db.ts          # Database connections
├── db/                # Database definitions
│   └── schema.ts      # Drizzle ORM schema
├── middleware/        # Middleware functions
│   ├── auth.ts        # Authentication middleware
│   └── error.ts       # Error handling middleware
├── migrations/        # Database migrations
│   └── schema.sql     # Generated schema SQL
├── models/            # Data models
│   ├── user.ts        # User model and repository
│   └── task.ts        # Task model and repository
├── routes/            # API routes
│   ├── auth.ts        # Authentication routes
│   ├── tasks.ts       # Task management routes
│   └── health.ts      # Health check routes
├── scripts/           # Utility scripts
│   ├── init-db.ts     # Database initialization
│   └── generate-schema.ts # Schema SQL generation
├── services/          # Business logic
│   └── auth-service.ts # Authentication service
├── deno.json         # Deno configuration
├── main.ts            # Application entry point
└── README.md          # Project documentation
```

## Drizzle ORM Integration

The application uses Drizzle ORM for database access:

1. Type-safe schema definition in `db/schema.ts`
2. Strongly-typed query building
3. Automatic SQL query generation
4. Efficient data mapping with TypeScript interfaces

## Redis Caching Strategy

The application uses Redis for:

1. Session management with automatic fallback to PostgreSQL
2. Task caching with automatic invalidation on updates
3. User-specific task list caching

## Security Features

- CORS protection
- Secure HTTP headers
- Request validation
- Session-based authentication
- Password hashing

## Performance Optimizations

- Connection pooling for PostgreSQL
- Drizzle ORM for efficient querying
- Redis caching layer
- Response compression
- Query optimization

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
