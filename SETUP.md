# Quick Setup — VS Code

## 1. Open

Unzip, then open the `cgs-finance-system` folder in VS Code.

## 2. Recommended extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- MongoDB for VS Code (optional, handy for browsing data)

## 3. Get MongoDB running

**Option A — Local**

Install MongoDB Community Edition, then confirm it's up:

```bash
mongosh
```

Leave `MONGO_URI` in `backend/.env` as-is.

**Option B — MongoDB Atlas (free, no install)**

1. Create a free cluster at https://www.mongodb.com/atlas
2. Database Access → add a user
3. Network Access → allow your IP (or `0.0.0.0/0` while testing)
4. Connect → Drivers → copy the connection string
5. Paste into `backend/.env`, appending the database name:

```env
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/cgs_finance
```

## 4. Install and seed

```bash
npm run install:all
npm run seed
```

Expected output ends with `[seed] done`.

## 5. Run

```bash
npm run dev
```

Open http://localhost:5173 and log in with `CGS123` / `Cgs@Global1ok`.

---

## Troubleshooting

**`MONGO_URI is not set`**
`backend/.env` is missing. Copy `backend/.env.example` to `backend/.env`.

**`ECONNREFUSED 127.0.0.1:27017`**
MongoDB isn't running. Start the service, or switch to Atlas.

**Login says "Invalid username or password"**
The admin account hasn't been created yet — run `npm run seed`.

**Frontend loads but every request fails**
The backend isn't running on port 5000. Check the `api` pane in the `npm run dev` output.

**Port already in use**
Change `PORT` in `backend/.env`, and update the proxy target in `frontend/vite.config.ts` to match.

**Logo doesn't appear in the PDF**
Confirm `frontend/src/assets/CGSLOGO.png` exists. To swap the logo, replace that file —
keep the same filename and it flows through the app, invoices and report exports.
