# RedKS Design System

RedKS should feel premium, fast, trustworthy, and familiar to Indian hyperlocal commerce users. The product language should be operationally clear for admins and merchants, while staying warm and quick for customers.

## Brand

- Name: RedKS
- Tagline: Har Dukaan, Ghar Tak.
- Personality: clean, dependable, local, energetic, service-first.
- Visual references: fast commerce clarity inspired by Blinkit, Zepto, and Swiggy Instamart, without copying their assets or layouts.

## Colors

| Token | Hex | Usage |
| --- | --- | --- |
| Primary Red | `#E53935` | Primary actions, active navigation, brand highlights |
| Accent Yellow | `#FFB300` | Offers, attention chips, lightweight highlights |
| Success Green | `#2E7D32` | Approved, delivered, active, available |
| Background | `#F8F9FA` | App surfaces and admin canvas |
| Dark Text | `#111827` | Primary text, headings |
| Border | `#E5E7EB` | Inputs, cards, tables |
| Muted Text | `#6B7280` | Secondary labels and helper copy |
| Error Red | `#C62828` | Rejections, validation, destructive actions |

## Typography

- Use system fonts for performance: Android Roboto, iOS San Francisco, web system UI.
- Headings: 700-900 weight, tight hierarchy, no negative letter spacing.
- Body: 14-16px on web, Material default body sizes on mobile.
- Avoid oversized type inside dense operational screens. Reserve large type for splash/login hero areas.

## Spacing

- Base spacing unit: 4px.
- Mobile page padding: 16px.
- Admin page padding: 24px desktop, 16px mobile.
- Card internal padding: 16-20px.
- Section gaps: 16-24px.
- Keep repeated list rows compact enough for scanning.

## Buttons

- Primary buttons use red fill, white text, 8-12px radius, 48px mobile height.
- Secondary buttons use white/transparent fill with a red or neutral border.
- Destructive actions use red text or red fill only when the consequence is explicit.
- Loading buttons keep their size stable and show a small spinner.

## Cards

- Cards are white on `#F8F9FA`, 12-16px radius on mobile and 8-12px on admin.
- Use subtle borders and low shadows. Avoid nested card-on-card layouts.
- Product cards should show price, stock/action, and a simple product visual placeholder when no image is available.
- Shop cards should surface trust: status, location, delivery mode, and quick entry.

## Status Badges

- Approved, Active, Available, Delivered: green.
- Pending, Placed, Ready, Sent: yellow/amber.
- Assigned, Processing, Pickup: blue.
- Rejected, Suspended, Cancelled, Failed: red.
- Deleted, Unknown: neutral slate.
- Badge text should be uppercase source values converted into readable labels.

## Icon Style

- Use Material icons in Flutter and Lucide icons in admin.
- Icons should be functional first: navigation, search, cart, order, store, delivery, approval.
- Use filled/selected icons only for active navigation state.
- Avoid decorative icon clutter in data-heavy screens.

## Loading State

- Use centered spinner plus short label for page loads.
- Use skeleton-like cards where practical for dashboards and tables.
- Keep navigation and major layout stable while content loads.

## Error State

- Show a clear, human message and retry action.
- Do not expose raw stack traces or backend internals.
- For network failures, suggest checking connection/server availability.

## Empty State

- Empty states should explain what is missing and what to do next.
- Use a compact icon, title, helper line, and optional CTA.
- Examples: "No shops nearby yet", "Add your first product", "No orders ready for pickup".

## Mobile UX Rules

- Android-first touch targets should be at least 48px high.
- Primary action stays near the bottom on checkout and order actions.
- Keep forms chunked into steps for shop onboarding.
- Show city/zone context prominently before shop/product browsing.
- Do not block core flows with decorative onboarding screens.
- Persist login and cart state; make failures recoverable.

