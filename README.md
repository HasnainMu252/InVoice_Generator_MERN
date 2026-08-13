# CGS Finance System — MERN

Finance, invoicing, order and profit management for **Corporate Gifting Solution**.

Migrated from TanStack Start + Supabase to a standard **MERN** stack with a clean
backend/frontend split.

---

## Stack

| Layer      | Technology                                              |
| ---------- | ------------------------------------------------------- |
| Database   | MongoDB + Mongoose 8                                    |
| Backend    | Node.js + Express 4, JWT auth, bcrypt, helmet            |
| Frontend   | React 19 + Vite 7 + React Router 7                       |
| Styling    | Tailwind CSS v4 + shadcn/ui (Radix)                      |
| Data layer | TanStack Query 5 + axios                                 |
| PDF        | jsPDF + jspdf-autotable                                  |
| Charts     | Recharts                                                 |

---

## Folder structure

```
cgs-finance-system/
├── package.json              # root scripts (runs both apps together)
│
├── backend/
│   ├── .env                  # ← edit this
│   └── src/
│       ├── server.js         # entrypoint
│       ├── app.js            # express app, middleware, route mounting
│       ├── config/db.js      # mongoose connection
│       ├── models/           # User, Settings, Invoice, Order
│       ├── routes/           # auth, invoices, orders, settings
│       ├── middleware/       # requireAuth, error handler
│       └── utils/
│           ├── calc.js       # all money logic (unit-tested)
│           └── seed.js       # demo data + admin account
│
└── frontend/
    ├── .env
    └── src/
        ├── main.tsx / App.tsx        # router
        ├── assets/CGSLOGO.png        # ← the CGS logo lives here
        ├── components/               # AppShell, InvoiceForm, OrderForm, Logo, ui/
        ├── context/AuthContext.tsx   # JWT session
        ├── pages/                    # one file per screen
        └── lib/
            ├── api.ts                # axios instance + interceptors
            ├── data.ts               # React Query hooks
            ├── pdf.ts                # invoice + report PDF generation
            ├── derive.ts             # flattens order expenses for reports
            └── format.ts             # PKR currency, dates, amount-in-words
```

---

## Setup

### 1. Prerequisites

- **Node.js 20+**
- **MongoDB** — either local (`mongod`) or a free MongoDB Atlas cluster

### 2. Install

```bash
npm run install:all
```

### 3. Configure

`backend/.env` ships ready for a local MongoDB. Change `MONGO_URI` if you're using Atlas:

```env
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/cgs_finance
```

`JWT_SECRET` is pre-generated. **Generate a fresh one before deploying to production.**

`frontend/.env` can stay empty in development — Vite proxies `/api` to the backend.

### 4. Seed the database

```bash
npm run seed
```

Creates the admin account and loads 8 demo orders + 6 demo invoices.

> ⚠️ `seed` **wipes** the orders, invoices and settings collections. Don't run it against live data.
> The admin user is never overwritten if it already exists.

### 5. Run

```bash
npm run dev
```

- Frontend → http://localhost:5173
- API → http://localhost:5000

### Login

| Username | Password        |
| -------- | --------------- |
| `CGS123` | `Cgs@Global1ok` |

**Change this password immediately** via `POST /api/auth/change-password`.

---

## API

All routes except `/api/auth/login` and `/api/health` require `Authorization: Bearer <token>`.

| Method   | Endpoint                    | Purpose                                |
| -------- | --------------------------- | -------------------------------------- |
| `POST`   | `/api/auth/login`           | Sign in, returns JWT                   |
| `GET`    | `/api/auth/me`              | Current user                           |
| `POST`   | `/api/auth/change-password` | Change password                        |
| `GET`    | `/api/invoices`             | List all                               |
| `GET`    | `/api/invoices/next-number` | Next `CGS-INV-XXXX`                    |
| `GET`    | `/api/invoices/:id`         | One invoice with items                 |
| `POST`   | `/api/invoices`             | Create                                 |
| `PUT`    | `/api/invoices/:id`         | Update                                 |
| `PATCH`  | `/api/invoices/:id/status`  | Change status (used by the list page)  |
| `DELETE` | `/api/invoices/:id`         | Delete                                 |
| `GET`    | `/api/orders`               | List all (with `expense_total`, `profit`) |
| `GET`    | `/api/orders/next-code`     | Next `CGS-ORD-XXXX`                    |
| `GET`    | `/api/orders/:id`           | One order with expense breakdown       |
| `POST`   | `/api/orders`               | Create                                 |
| `PUT`    | `/api/orders/:id`           | Update (replaces expense breakdown)    |
| `DELETE` | `/api/orders/:id`           | Delete                                 |
| `GET`    | `/api/settings`             | Company/bank/invoice defaults          |
| `PUT`    | `/api/settings`             | Update settings                        |

---

## Business rules

Money is calculated **server-side**. Values the client sends for `subtotal`, `tax_amount`,
`grand_total`, `expense_total` and `profit` are ignored and recalculated.

**Invoice**

```
item total   = qty × unit price
subtotal     = Σ item totals
before tax   = subtotal + delivery charges + other charges
tax          = before tax × rate ÷ 100      (0 when "Invoice With Tax" is off)
grand total  = before tax + tax
```

**Order**

```
Total Expense Amount = Σ expense breakdown rows
Total Profit Amount  = Total Order Amount − Total Expense Amount
```

Tax is **not** deducted from profit — it's tracked as a separate informational field.

---

## Data model

`invoice_items` and order `expenses` are **embedded subdocuments**, not separate
collections. A document write in MongoDB is atomic, so saving an order with its
expenses can never half-succeed.

```
users        { username, password (bcrypt), full_name, role }
settings     { company_*, bank_*, invoice_prefix, default_tax_rate, default_notes }
invoices     { invoice_number, dates, status, from_*, to_*, totals, invoice_items[] }
orders       { order_code, date, contact, total_amount, tax, month, expenses[] }
             → virtuals: expense_total, profit
```

There is **no expenses collection** — every expense is entered inside the Order Form.

---

## Changes from the original app

- Logo is a bundled PNG at `frontend/src/assets/CGSLOGO.png` (no more CORS-blocked hot-link)
- Invoice header shows the logo only — website URL removed
- Invoice **status is hidden inside the invoice** (screen + PDF); it's changed from the
  status dropdown in the All Invoices table
- Order Form has **Total Expense Amount** and **Total Profit Amount**, both auto-calculated
- Standalone Expenses page and its sidebar item are **removed**
- Profit formula unified — Dashboard, Orders and Reports previously disagreed

---

## Deployment

**Backend** — any Node host (Railway, Render, Fly.io, DigitalOcean, VPS):

```bash
npm start --prefix backend
```

Set `MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` and `NODE_ENV=production`.

**Frontend** — `npm run build` produces a static `frontend/dist/` that deploys to
Vercel, Netlify, Cloudflare Pages, or any static host. Set `VITE_API_URL` to your
deployed API origin.

Unlike the previous TanStack Start version, the frontend is now a plain SPA — **it will
run on shared/cPanel hosting.** The backend still needs a Node process.

### Production checklist

- [ ] Fresh `JWT_SECRET`
- [ ] Admin password changed from the default
- [ ] `CLIENT_ORIGIN` set to the real frontend domain
- [ ] MongoDB Atlas IP allowlist configured
- [ ] `.env` files never committed
# InVoice_Generator_MERN
