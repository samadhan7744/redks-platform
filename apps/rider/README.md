# RedKS Partner App

Flutter app for RedKS shop owners and riders.

Tagline: Har Dukaan, Ghar Tak.

## Stack

- Flutter and Dart
- Riverpod state management
- Dio API client with JWT token injection
- SharedPreferences for auth token, selected mode, availability, and active delivery placeholder state

## Backend URL

Android emulator default:

```bash
http://10.0.2.2:3000/api/v1
```

Override at build or run time:

```bash
flutter run --dart-define=REDKS_API_BASE_URL=http://10.0.2.2:3000/api/v1
flutter build apk --debug --dart-define=REDKS_API_BASE_URL=http://10.0.2.2:3000/api/v1
```

## Setup

```bash
cd D:\RedKS\apps\partner
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```

Debug APK output:

```bash
build\app\outputs\flutter-apk\app-debug.apk
```

## Implemented Screens

- Splash
- OTP login
- Mode selection
- Profile and logout
- Shop registration
- Shop dashboard
- My shop profile
- Product list
- Add/edit product
- Stock update
- Shop orders and order detail
- Accept/reject/ready order actions
- Nearby item requests
- Send quote
- Rider availability
- Available rider orders
- Active order placeholder
- Rider order detail actions
- Earnings placeholder

## API Endpoints Used

- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `GET /auth/me`
- `GET /cities`
- `GET /cities/:id/zones`
- `GET /categories`
- `POST /shops/register`
- `GET /shops/my-shop`
- `PATCH /shops/my-shop`
- `GET /products/my-products`
- `POST /products`
- `PATCH /products/:id`
- `DELETE /products/:id`
- `PATCH /products/:id/stock`
- `GET /shop/orders`
- `PATCH /shop/orders/:id/accept`
- `PATCH /shop/orders/:id/reject`
- `PATCH /shop/orders/:id/ready`
- `GET /shop/item-requests/nearby`
- `POST /shop/item-requests/:id/quotes`
- `PATCH /shop/item-requests/quotes/:quoteId`
- `PATCH /delivery/rider/availability`
- `GET /rider/orders/available`
- `PATCH /rider/orders/:id/accept`
- `PATCH /rider/orders/:id/pickup`
- `PATCH /rider/orders/:id/deliver`

## Notes

- Shop approval, rider approval, payouts, incentives, and richer delivery tracking remain backend-driven workflows.
- Active rider order state is currently a local placeholder until the backend exposes an assigned active order endpoint.
