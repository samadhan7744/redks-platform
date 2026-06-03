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

PowerShell:

```powershell
npm install
copy .env.example .env
docker compose up -d
npx prisma generate
npx prisma migrate dev --name phase-3-core-apis
npm run prisma:seed
npm run start:dev
```

Before running migrations, make sure `.env` exists and contains:

```text
DATABASE_URL=postgresql://redks:redks_password@localhost:5432/redks?schema=public
```

The Docker Compose PostgreSQL service uses the same credentials:

```text
POSTGRES_USER=redks
POSTGRES_PASSWORD=redks_password
POSTGRES_DB=redks
published port=5432
```

If migrations fail because Postgres is still starting, wait until the container is healthy:

```powershell
docker inspect redks-postgres --format "{{json .State.Health.Status}}"
```

Then rerun:

```powershell
npx prisma migrate dev --name phase-3-core-apis
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
- Demo customer: `9000000001`
- Demo shop owner: `9000000002`
- Demo rider with approved rider profile: `9000000003`
- Approved demo shop in Bengaluru/Indiranagar with grocery and bakery products
- Demo customer address and one Request Any Item record

## API Endpoints

- `POST /api/v1/auth/request-otp`
- `POST /api/v1/auth/verify-otp`
- `POST /api/v1/auth/refresh-token`
- `GET /api/v1/auth/me`
- `GET/PATCH /api/v1/users/me`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `GET /api/v1/cities`
- `GET /api/v1/cities/:id/zones`
- `POST/PATCH/DELETE /api/v1/cities`
- `GET /api/v1/zones`
- `POST/PATCH/DELETE /api/v1/zones`
- `GET/POST /api/v1/addresses`
- `GET /api/v1/categories`
- `GET /api/v1/categories/:id`
- `POST/PATCH/DELETE /api/v1/categories`
- `GET /api/v1/shops`
- `GET /api/v1/shops/:id`
- `POST /api/v1/shops/register`
- `GET/PATCH /api/v1/shops/my-shop`
- `PATCH /api/v1/shops/my-shop/status`
- `PATCH /api/v1/shops/:id/status`
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `POST /api/v1/products`
- `GET /api/v1/products/my-products`
- `PATCH/DELETE /api/v1/products/:id`
- `PATCH /api/v1/products/:id/stock`
- `POST /api/v1/orders`
- `GET /api/v1/orders/my-orders`
- `GET /api/v1/orders/:id`
- `PATCH /api/v1/orders/:id/cancel`
- `GET /api/v1/shop/orders`
- `PATCH /api/v1/shop/orders/:id/accept`
- `PATCH /api/v1/shop/orders/:id/reject`
- `PATCH /api/v1/shop/orders/:id/ready`
- `GET /api/v1/rider/orders/available`
- `PATCH /api/v1/rider/orders/:id/accept`
- `PATCH /api/v1/rider/orders/:id/pickup`
- `PATCH /api/v1/rider/orders/:id/deliver`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/:id`
- `POST /api/v1/item-requests`
- `GET /api/v1/item-requests/my-requests`
- `GET /api/v1/item-requests/:id`
- `GET /api/v1/shop/item-requests/nearby`
- `POST /api/v1/shop/item-requests/:id/quotes`
- `PATCH /api/v1/shop/item-requests/quotes/:quoteId`
- `PATCH /api/v1/item-requests/quotes/:quoteId/accept`
- Admin skeleton routes under `/api/v1/admin`
- `GET /api/v1/admin/shops`
- `PATCH /api/v1/admin/shops/:id/approve`
- `PATCH /api/v1/admin/shops/:id/reject`
- `PATCH /api/v1/admin/shops/:id/suspend`
- `GET /api/v1/admin/riders`
- `GET /api/v1/admin/products`
- `GET /api/v1/admin/item-requests`
- `GET /api/v1/admin/dashboard/summary`
- `PATCH /api/v1/delivery/rider/availability`
- `GET /health`

## Security Notes

- OTPs are stored in Redis as hashes using the phone number and server secret.
- OTP records expire through `OTP_TTL_SECONDS`.
- Verification attempts are limited with `OTP_MAX_ATTEMPTS` for the same OTP lifetime.
- Development can expose `devOtp`; production generates a random 6-digit OTP and should send it through an SMS provider.
- JWT access-token expiry is controlled by `JWT_EXPIRES_IN`.
- Refresh tokens are issued as a placeholder response. A later phase should persist hashed refresh tokens with rotation, device metadata, and revoke-at timestamps.
- Keep `JWT_SECRET` and `JWT_REFRESH_SECRET` different in production.
- List endpoints use a common response shape with `success`, `message`, `data`, and paginated `meta` where applicable.
- Order creation uses a Prisma transaction and reserves stock immediately when the order is created. If the customer cancels or the shop rejects before fulfillment, stock is restored.

## Notes

- OTP delivery is a placeholder. Development returns `devOtp`; production should integrate an SMS provider.
- Online payments are modeled but provider integration is intentionally deferred.
- Shop and rider approvals are modeled and exposed through admin skeleton routes.
- Shop/category-specific commission overrides are represented by `ShopCategoryCommission`.
- Rider availability is indexed by city/zone/status for assignment flow readiness.
- Request Any Item now supports a quote workflow table through `ItemRequestQuote` and `QuoteStatus`.
- Accepted Request Any Item quotes currently return an explicit TODO for conversion into a custom order. That conversion needs a custom item/order pricing workflow in the next phase.

## Full Local MVP Runbook

Use this section to run the complete RedKS MVP locally across backend, admin, customer, and partner apps.

### 1. Start Infrastructure

Docker Desktop must be running before these commands.

```powershell
cd D:\RedKS
docker compose up -d
docker inspect redks-postgres --format "{{json .State.Health.Status}}"
docker inspect redks-redis --format "{{json .State.Health.Status}}"
```

Expected health status for both services is `healthy`.

### 2. Prepare Backend Database

```powershell
cd D:\RedKS
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate dev --name phase-3-core-apis
npm run prisma:seed
npm run start:dev
```

Backend URLs:

- API: `http://localhost:3000/api/v1`
- Swagger: `http://localhost:3000/api/docs`
- Health: `http://localhost:3000/health`

### 3. Run Admin Panel

```powershell
cd D:\RedKS\apps\admin
npm install
npm run dev
```

Admin URL: `http://localhost:3001` if port 3000 is already used by the backend. If Next picks another port, use the URL printed in the terminal.

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1` in `D:\RedKS\apps\admin\.env.local` when needed.

### 4. Build Mobile Apps

Customer:

```powershell
cd D:\RedKS\apps\customer
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Customer APK:

```text
D:\RedKS\apps\customer\build\app\outputs\flutter-apk\app-debug.apk
```

Partner:

```powershell
cd D:\RedKS\apps\partner
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Partner APK:

```text
D:\RedKS\apps\partner\build\app\outputs\flutter-apk\app-debug.apk
```

Android emulator backend URL defaults to:

```text
http://10.0.2.2:3000/api/v1
```

Override if needed:

```powershell
flutter run --dart-define=REDKS_API_BASE_URL=http://10.0.2.2:3000/api/v1
```

### Demo Login Guide

Development OTP is controlled by `OTP_DEV_CODE` and defaults to:

```text
123456
```

Demo phones:

- Admin: `9999999999`
- Customer: `9000000001`
- Shop owner: `9000000002`
- Rider: `9000000003`

### MVP Test Flow

1. Admin logs in with `9999999999`, verifies dashboard data, cities, zones, categories, demo shop, products, rider, and item requests.
2. Shop owner logs into Partner App with `9000000002`, chooses Shop Mode, verifies `RedKS Demo Kirana`, adds or edits products, updates stock, accepts an incoming order, and marks it ready.
3. Customer logs into Customer App with `9000000001`, selects Bengaluru and Indiranagar, browses the demo shop/products, adds products to cart, places a COD order, views the order, and cancels while status allows it.
4. Rider logs into Partner App with `9000000003`, chooses Rider Mode, goes online, accepts ready orders in the same zone, marks pickup, and marks delivered.
5. Customer creates a Request Any Item. Shop owner sees it under nearby requests and sends a quote. Customer accepts the quote. Custom order conversion remains a documented TODO.

### Validation Commands

Run these before a local MVP handoff:

```powershell
cd D:\RedKS
npm run build
npm test

cd D:\RedKS\apps\admin
npm run build
npm run lint

cd D:\RedKS\apps\customer
flutter analyze
flutter test
flutter build apk --debug

cd D:\RedKS\apps\partner
flutter analyze
flutter test
flutter build apk --debug
```

## Free Cloud Deployment Guide

This section prepares RedKS for a simple free-tier deployment:

- Code: GitHub
- Backend: Render Web Service using the root `Dockerfile`
- Database: Supabase PostgreSQL
- Redis: Render Redis or Upstash Redis
- Admin Panel: Vercel
- Mobile apps: Flutter APKs built with the cloud API URL

### GitHub Push Checklist

Before the first push:

```powershell
cd D:\RedKS
git status --short
npm run build
npm test
cd D:\RedKS\apps\admin
npm run build
cd D:\RedKS\apps\customer
flutter analyze
cd D:\RedKS\apps\partner
flutter analyze
```

Confirm these are not committed:

- `.env`
- `.env.local`
- `apps/admin/.env.local`
- `node_modules`
- `dist`
- `.next`
- Flutter `build` and `.dart_tool` folders
- APK files unless you intentionally attach them to a release

Recommended first push:

```powershell
cd D:\RedKS
git init
git add .
git commit -m "Prepare RedKS MVP for cloud deployment"
git branch -M main
git remote add origin https://github.com/<your-org-or-user>/redks.git
git push -u origin main
```

### Supabase PostgreSQL

1. Create a free Supabase project.
2. Go to Project Settings > Database.
3. Copy the pooled connection string for Prisma/serverless-friendly usage when available.
4. Use a URL shaped like:

```text
postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&schema=public
```

For direct connections, Supabase may show port `5432` instead of `6543`. Use the connection string Supabase gives you for your project.

Run migrations from your local machine against Supabase:

```powershell
cd D:\RedKS
$env:DATABASE_URL="your-supabase-database-url"
npx prisma migrate deploy
npm run prisma:seed
```

Do not commit the Supabase URL. Store it only in Render environment variables or your local shell.

### Redis

Use either Render Redis or Upstash.

Render Redis URL usually looks like:

```text
redis://default:<password>@<host>:<port>
```

Upstash Redis URL usually looks like:

```text
rediss://default:<password>@<host>:<port>
```

Set this as `REDIS_URL` on Render.

### Render Backend Deployment

Create a Render Web Service:

- Source: GitHub repo
- Environment: Docker
- Root directory: repository root
- Dockerfile path: `Dockerfile`
- Health check path: `/health`

Render environment variables:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=<supabase-postgres-url>
REDIS_URL=<render-redis-or-upstash-url>
CORS_ORIGINS=https://your-admin.vercel.app
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=<different-long-random-secret>
JWT_REFRESH_EXPIRES_IN=30d
OTP_TTL_SECONDS=300
OTP_MAX_ATTEMPTS=5
ADMIN_PHONE=9999999999
ADMIN_EMAIL=admin@redks.in
```

For temporary demo deployments only, you may set:

```text
OTP_DEV_CODE=123456
```

For production, omit `OTP_DEV_CODE` and integrate an SMS provider before real users.

After the first deploy, run migrations from your local machine with the Supabase `DATABASE_URL`, or use a one-off Render shell job if available:

```powershell
npx prisma migrate deploy
npm run prisma:seed
```

Backend URLs after deployment:

```text
https://your-redks-backend.onrender.com/health
https://your-redks-backend.onrender.com/api/v1
https://your-redks-backend.onrender.com/api/docs
```

### Vercel Admin Deployment

1. Import the GitHub repo in Vercel.
2. Set project root directory to:

```text
apps/admin
```

3. Add environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-redks-backend.onrender.com/api/v1
```

4. Use default Next.js settings:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

5. Add the deployed Vercel URL to backend `CORS_ORIGINS` on Render.

If you use preview deployments, include each preview origin in `CORS_ORIGINS`, separated by commas.

### Flutter Cloud API Builds

Customer APK with cloud backend:

```powershell
cd D:\RedKS\apps\customer
flutter pub get
flutter build apk --release --dart-define=REDKS_API_BASE_URL=https://your-redks-backend.onrender.com/api/v1
```

Partner APK with cloud backend:

```powershell
cd D:\RedKS\apps\partner
flutter pub get
flutter build apk --release --dart-define=REDKS_API_BASE_URL=https://your-redks-backend.onrender.com/api/v1
```

Debug APKs for testing:

```powershell
cd D:\RedKS\apps\customer
flutter build apk --debug --dart-define=REDKS_API_BASE_URL=https://your-redks-backend.onrender.com/api/v1

cd D:\RedKS\apps\partner
flutter build apk --debug --dart-define=REDKS_API_BASE_URL=https://your-redks-backend.onrender.com/api/v1
```

### Production Notes

- Use strong, unique JWT secrets in Render.
- Keep Supabase and Redis credentials out of GitHub.
- Restrict `CORS_ORIGINS` to real admin domains.
- Free Render services may sleep; the first request after inactivity can be slow.
- Supabase free tier may pause after inactivity depending on plan status.
- Replace development OTP with SMS delivery before public launch.
- Configure a custom domain only after the MVP flow is stable.
