# RedKS Backend

Har Dukaan, Ghar Tak.

Phase 1 is the backend foundation for a hyperlocal commerce and delivery platform in India. It uses a modular NestJS monolith with Prisma/PostgreSQL as the system of record and Redis prepared for OTP/session-style state.

## Architecture

- `src/modules/*` contains bounded NestJS modules. The current app is a modular monolith, but the module boundaries are intentionally service-oriented so domains can move to microservices later.
- `prisma/schema.prisma` is the canonical data model for users, roles, cities, zones, shops, commissions, products, orders, delivery, payments, reviews, notifications, and Request Any Item.
- `src/common` contains shared auth/RBAC decorators and guards.
- `src/prisma` and `src/redis` provide global infrastructure services.
- Swagger runs at `/api/docs`; API routes are prefixed with `/api/v1`.
- Health check runs outside the API prefix at `GET /health`.
- Global exception handling and request logging are enabled for operational visibility.

## Requirements

- Node.js 22+
- Docker Desktop
- npm

## Setup

```bash
npm install
copy .env.example .env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run start:dev
```

API docs:

```text
http://localhost:3000/api/docs
```

## Environment

```text
DATABASE_URL=postgresql://redks:redks_password@localhost:5432/redks?schema=public
REDIS_URL=redis://localhost:6379
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=change-me-refresh-in-production
JWT_REFRESH_EXPIRES_IN=30d
OTP_TTL_SECONDS=300
OTP_DEV_CODE=123456
OTP_MAX_ATTEMPTS=5
ADMIN_PHONE=9999999999
ADMIN_EMAIL=admin@redks.in
```

## Seed Data

The seed script creates:

- Cities: Bengaluru, Delhi, Mumbai
- Zones for each city
- Categories: Grocery, Medicines, Fruits & Vegetables, Bakery, Stationery
- Admin/Super Admin user from `ADMIN_PHONE` and `ADMIN_EMAIL`

## Current Phase 1 Endpoints

- `POST /api/v1/auth/otp/request`
- `POST /api/v1/auth/otp/verify`
- `GET/PATCH /api/v1/users/me`
- `GET /api/v1/cities`
- `GET /api/v1/zones`
- `GET/POST /api/v1/addresses`
- `GET/POST /api/v1/shops`
- `PATCH /api/v1/shops/:id/status`
- `GET/POST /api/v1/products`
- `GET/POST /api/v1/orders`
- `GET/POST /api/v1/item-requests`
- Admin skeleton routes under `/api/v1/admin`
- `GET /health`

## Security Notes

- OTPs are stored in Redis as hashes using the phone number and server secret.
- OTP records expire through `OTP_TTL_SECONDS`.
- Verification attempts are limited with `OTP_MAX_ATTEMPTS` for the same OTP lifetime.
- Development can expose `devOtp`; production generates a random 6-digit OTP and should send it through an SMS provider.
- JWT access-token expiry is controlled by `JWT_EXPIRES_IN`.
- Refresh tokens are issued as a placeholder response. A later phase should persist hashed refresh tokens with rotation, device metadata, and revoke-at timestamps.
- Keep `JWT_SECRET` and `JWT_REFRESH_SECRET` different in production.

## Notes

- OTP delivery is a placeholder. Development returns `devOtp`; production should integrate an SMS provider.
- Online payments are modeled but provider integration is intentionally deferred.
- Shop and rider approvals are modeled and exposed through admin skeleton routes.
- Shop/category-specific commission overrides are represented by `ShopCategoryCommission`.
- Rider availability is indexed by city/zone/status for assignment flow readiness.
- Request Any Item now supports a quote workflow table through `ItemRequestQuote` and `QuoteStatus`.
