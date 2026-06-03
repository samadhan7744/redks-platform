# RedKS Customer App

Flutter customer app for RedKS: Har Dukaan, Ghar Tak.

## Stack

- Flutter + Dart
- Clean Architecture-style folders under `lib/src`
- Riverpod state management
- Dio API client with JWT injection
- SharedPreferences for JWT and local cart storage
- Android-first responsive Material UI

## Backend URL

Default Android emulator URL:

```text
http://10.0.2.2:3000/api/v1
```

Override at build/run time:

```powershell
flutter run --dart-define=REDKS_API_BASE_URL=http://10.0.2.2:3000/api/v1
flutter build apk --debug --dart-define=REDKS_API_BASE_URL=http://10.0.2.2:3000/api/v1
```

For a physical Android device, use your machine LAN IP instead of `10.0.2.2`.

## Setup

```powershell
cd D:\RedKS\apps\customer
flutter pub get
flutter run
```

## Screens

- Splash
- OTP Login
- Home
- Location/City selection
- Categories
- Nearby shops
- Shop details
- Product listing
- Product search
- Product detail
- Cart
- Checkout
- My Orders
- Order Detail
- Order Tracking placeholder
- Profile
- Addresses
- Request Any Item

## Connected APIs

- `POST /auth/request-otp`
- `POST /auth/verify-otp`
- `GET /auth/me`
- `GET /cities`
- `GET /cities/:id/zones`
- `GET /categories`
- `GET /shops`
- `GET /products`
- `GET /addresses`
- `POST /addresses`
- `POST /orders`
- `GET /orders/my-orders`
- `GET /orders/:id`
- `PATCH /orders/:id/cancel`
- `POST /item-requests`
- `GET /item-requests/my-requests`
- `PATCH /item-requests/quotes/:quoteId/accept`

## Validation

```powershell
flutter pub get
flutter analyze
flutter test
flutter build apk --debug
```
