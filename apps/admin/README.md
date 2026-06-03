# RedKS Admin Panel

Admin web app for RedKS: Har Dukaan, Ghar Tak.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Shadcn-style UI primitives
- Axios
- Zustand auth store

## Setup

```powershell
cd D:\RedKS\apps\admin
npm install
copy .env.example .env.local
npm run dev
```

Default backend:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

Production build:

```powershell
npm run build
npm run start
```

## Pages

- `/login`
- `/dashboard`
- `/shops`
- `/orders`
- `/users`
- `/riders`
- `/categories`
- `/locations`
- `/products`
- `/item-requests`

## Notes

- Login uses `POST /auth/request-otp` and `POST /auth/verify-otp`.
- The Axios client injects the JWT access token from the persisted auth store.
- Protected routes redirect to `/login` when no token is available.
- The backend must be running at `http://localhost:3000/api/v1`.
- `NEXT_PUBLIC_API_BASE_URL` is validated at startup; builds fail if it is missing.
- List pages use backend pagination metadata where supported.
- Admin lint is isolated with `eslint.config.mjs` so it does not inherit the backend ESLint project config.

## Validation

```powershell
npm run build
npm run lint
```

## Vercel Deployment

1. Import the GitHub repository in Vercel.
2. Set the root directory to `apps/admin`.
3. Add environment variable:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-render-backend.onrender.com/api/v1
```

4. Use the default Vercel Next.js build settings:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```
