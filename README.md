# Lara Finance Backend

Node.js + Express 5 + TypeScript + Prisma 7 + PostgreSQL backend for the Lara Finance Expo app.

## Features

- JWT register/login
- Weekly or monthly finance profile
- Expense category budgets
- Automatic planned-savings calculation
- Savings / Emergency / Luxe allocation
- Manual expenses
- Receipt upload with replaceable OCR stub
- Actual weekly/monthly/yearly reports from transaction dates
- Near-budget and over-budget alert records
- Expo push-token registration endpoint
- Zod validation and centralized errors

## Setup

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

API: `http://localhost:4000`

Seed login:

- Email: `lara@example.com`
- Password: `Password123!`

## Main endpoints

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`

### Finance
- `GET /api/finance/profile`
- `PUT /api/finance/profile`
- `GET /api/finance/expenses?filter=monthly&page=1&pageSize=20`
- `POST /api/finance/expenses`
- `PATCH /api/finance/expenses/:id`
- `DELETE /api/finance/expenses/:id`
- `GET /api/finance/reports/summary?filter=weekly|monthly|yearly&date=2026-07-18`

### Receipts
- `POST /api/receipts/upload` (`multipart/form-data`, field: `receipt`)
- `GET /api/receipts/:id`

### Push
- `POST /api/push/tokens`

All finance routes require:

```http
Authorization: Bearer <accessToken>
```

## Important mobile URL note

For iOS Simulator, `http://localhost:4000/api` usually works.

For Android Emulator use:

```txt
http://10.0.2.2:4000/api
```

For a physical phone, use your Mac's LAN IP:

```txt
http://192.168.x.x:4000/api
```

## Budget request example

```json
{
  "income": 4000,
  "currency": "USD",
  "period": "monthly",
  "categories": [
    { "name": "Food", "limit": 200, "sortOrder": 1 },
    { "name": "Utilities", "limit": 200, "sortOrder": 2 },
    { "name": "Groceries", "limit": 200, "sortOrder": 3 }
  ],
  "funds": [
    { "type": "savings", "name": "Savings", "percentage": 50 },
    { "type": "emergency", "name": "Emergency Fund", "percentage": 35 },
    { "type": "luxe", "name": "Luxe Fund", "percentage": 15 }
  ]
}
```

## Expense request example

```json
{
  "title": "Whole Foods",
  "amount": 85,
  "categoryId": "<category-id>",
  "expenseDate": "2026-07-18T03:30:00.000Z",
  "source": "manual",
  "paymentMethod": "Card"
}
```

The expense response includes any newly triggered budget alerts. The mobile app can immediately display a local notification. For true remote push delivery while the app is closed, add an Expo Push API sender or notification worker.
