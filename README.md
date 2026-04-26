# Production-Ready NestJS Backend Blueprint

This project is a scalable NestJS monolith designed with Clean Architecture boundaries, feature modules, and infrastructure modules that are ready for MongoDB, Redis, AWS S3, JWT auth, Swagger, and Dockerized local development.

## Architecture Principles

- Feature-first modules: `auth`, `user`, `admin`, and `upload` own their controllers, services, repositories, DTOs, and schemas.
- Clean separation of concerns:
  - `controller`: transport and Swagger concerns
  - `service`: application use cases
  - `repository`: MongoDB persistence logic
  - `dto`: validation and request/response contracts
  - `schema`: Mongoose document structure and indexes
- Shared cross-cutting concerns live in `src/common`.
- Infrastructure adapters for Mongo, Redis, S3, and configuration are isolated for future extraction.

## Folder Structure

```text
src/
├── app.controller.ts
├── app.module.ts
├── main.ts
├── common/
│   ├── common.module.ts
│   ├── constants/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── interfaces/
│   ├── middleware/
│   └── utils/
├── config/
│   ├── config.module.ts
│   ├── configuration.ts
│   ├── env.validation.ts
│   └── schemas/
├── database/
│   ├── base/
│   ├── helpers/
│   ├── plugins/
│   └── database.module.ts
├── modules/
│   ├── admin/
│   │   ├── controllers/
│   │   ├── dto/
│   │   └── services/
│   ├── auth/
│   │   ├── controllers/
│   │   ├── decorators/
│   │   ├── docs/
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── interfaces/
│   │   ├── repositories/
│   │   ├── services/
│   │   └── strategies/
│   ├── upload/
│   │   ├── controllers/
│   │   ├── dto/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── services/
│   └── user/
│       ├── controllers/
│       ├── dto/
│       ├── repositories/
│       ├── schemas/
│       └── services/
├── redis/
├── s3/
└── types/
```

## Core Decisions

### 1. Why this modular monolith works

Each feature module owns its business logic and persistence abstractions, while shared concerns stay in `common` and infrastructure stays in dedicated modules. This keeps the current monolith simple to run while giving us boundaries we can later extract into services without large rewrites.

### 2. MongoDB design

- `BaseSchema` standardizes `createdAt`, `updatedAt`, and `isDeleted`.
- `softDeletePlugin` automatically excludes deleted documents from standard queries.
- `User -> Role` uses a Mongo reference to demonstrate normalized role storage.
- Repository methods hide Mongoose query details from services.
- Pagination is centralized in `database/helpers/pagination.helper.ts`.
- Aggregation example is implemented in `UserRepository.aggregateUsersByRole()`.

Indexing guidance:

- Unique index on `users.email`.
- Compound indexes on common filters like `role + createdAt`.
- Keep high-cardinality fields indexed only when used by frequent filters.
- Avoid over-indexing write-heavy collections.
- Disable `autoIndex` in production and manage indexes through deployment workflows.

### 3. Auth design

- Separate user login and admin login endpoints.
- JWT access token and refresh token pair.
- Refresh token rotation with Redis blacklist support for old token IDs.
- Hashed refresh token persisted on the user document.
- `@Roles()` decorator and `RolesGuard` enforce RBAC.
- `JwtStrategy` checks blacklist state before allowing access.

### 4. Redis usage

- Shared `RedisService` wraps `ioredis`.
- Profile caching example with 5-minute TTL in `UserService`.
- Token blacklist storage for logout and token rotation.
- Request rate limiting uses Redis atomic increment with expiry.

### 5. Upload design

- S3 upload uses memory-backed Multer for direct object upload.
- Metadata is stored in MongoDB for auditability and management.
- Signed URL generation is centralized in `S3Service`.
- Upload and delete flows are isolated in `UploadModule`.

### 6. Swagger setup

- Swagger is configured in `main.ts`.
- Bearer auth is enabled globally for protected routes.
- Tags are separated by `Auth`, `Admin`, `User`, `Upload`, and `Health`.
- DTOs use decorators for request schema documentation.

## Security Defaults

- `helmet` enabled globally
- strict DTO validation with `ValidationPipe`
- Joi-based environment validation
- request ID middleware for traceability
- centralized exception filter
- consistent response envelope via interceptor
- Redis-backed request rate limiting
- basic HTML sanitization for user-controlled strings
- CORS configured through environment variables

## Production Runtime

1. Copy `.env.example` to `.env`.
2. Start infrastructure with `docker compose up -d`.
3. Install dependencies with `yarn install`.
4. Run the API with `yarn start:dev`.
5. Open Swagger at `http://localhost:3000/docs`.

`main.ts` is configured for:

- global validation
- Swagger bootstrapping
- `helmet`
- CORS
- graceful shutdown hooks
- buffered logger bootstrapping

## Scaling Strategy

### Evolving to microservices

The feature modules already act as bounded contexts. To extract later:

- move `auth`, `user`, `upload`, or `admin` into separate Nest apps
- keep DTOs/events as explicit contracts
- move repositories behind service-specific data ownership
- replace in-process service calls with async integration or HTTP/gRPC contracts

### Message queues

The next clean step is adding an event bus abstraction:

- publish domain events like `user.created`, `file.uploaded`, `auth.logged_out`
- consume them for notifications, analytics, audit logs, and search indexing
- start with Redis streams, RabbitMQ, or Kafka depending on throughput needs

### Horizontal scaling

- run multiple stateless NestJS instances behind a load balancer
- keep auth/session invalidation state in Redis instead of memory
- offload file storage to S3 and database state to MongoDB
- use structured logs and request IDs for cross-instance tracing

### MongoDB replica set

For production:

- deploy MongoDB as a replica set for high availability
- read from secondaries only for safe read workloads
- tune write concern based on consistency requirements
- separate backups, monitoring, and index reviews into operational runbooks

### Kafka later

Kafka fits well once event volume grows:

- create a shared event contract package
- emit events from application services after successful transactions
- add outbox pattern support for guaranteed delivery
- consume events in analytics, billing, search, or notification workers

## Suggested Next Steps

- add unit tests around auth rotation and guards
- add a seed script for default roles and bootstrap admin user
- add request-scoped structured logging with a logger like Pino
- split internal application services from external controllers further if domain complexity grows
