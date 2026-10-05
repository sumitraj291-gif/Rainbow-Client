# 🚀 Rainbow Production ERP - Render Deployment Guide (रणनीति व निर्देश)

Yeh guide aapko batayegi ki **Frontend aur Backend** ko Render par kaise deploy karna hai taaki dono aapas me perfectly sync aur connected rahein.

---

## 🛠️ 1. Frontend & Backend Connection Architecture

Dono systems ko tightly integrate kar diya gaya hai:
1. **Single Source of Truth (`src/services/api.js`)**:
   - `API_BASE_URL` automatically resolve hota hai.
   - Agar `VITE_API_URL` set hai (e.g. `https://your-backend.onrender.com/api`), toh wo use hota hai.
   - Agar unset hai ya single-service mode hai, toh current domain `/api` automatically pick karta hai.
   - Sabhi requests me `Authorization: Bearer <token>` automatically attach hota hai.
2. **Unified Fetch Helper (`authFetch`)**:
   - Sabhi modules (`Dispatch`, `Maintenance`, `MaterialReceipt`, `RawMaterials`, `RollInspection`, `PdfExportModal`) isi helper se connected hain.
3. **CORS & SPA Fallback (`backend/src/server.js`)**:
   - Backend me cross-origin (CORS) allowed hai (GET, POST, PUT, DELETE, OPTIONS).
   - Agar backend ke paas `frontend/dist` compiled files hain, toh Express unhe direct serve karta hai. Client-side routing (`React Router`) ke sabhi URLs (`/customers`, `/sales-orders`, etc.) bina 404 ke chalte hain.

---

## ☁️ 2. Database Setup (Cloud MySQL)

Render ke paas free native MySQL nahi hota, isliye aap inme se kisi bhi **Free Cloud MySQL** service ka use kar sakte hain:
1. **Aiven.io** (Recommended - Free MySQL database)
2. **TiDB Cloud Serverless** (Free MySQL-compatible, highly performant)
3. **Clever Cloud** (Free MySQL addon)
4. **Railway.app** (Free MySQL instance)

### Database Setup Steps:
1. Free MySQL database create karein.
2. Aapko ek connection string milegi:
   ```
   mysql://username:password@hostname:port/database_name?ssl={"rejectUnauthorized":false}
   ```
3. Database tool (DBeaver, MySQL Workbench, ya HeidiSQL) se connect karke `database/database.sql` aur `database/pvc_carpet_*.sql` run karein.
4. Default Admin account (`admin@rainbowcarpet.com` / `Rainbow@123`) backend start hote hi automatically create ho jayega!

---

## 🌟 3. Option 1: Unified Web Service on Render (RECOMMENDED - Free Tier)

Is option me **1 hi free service** ke andar Frontend aur Backend dono run hote hain (0 extra cost).

### Step-by-Step Instructions:
1. Apne code ko GitHub par push karein:
   ```bash
   git add .
   git commit -m "feat: complete frontend-backend sync and render config"
   git push origin main
   ```
2. [dashboard.render.com](https://dashboard.render.com/) par login karein.
3. **New +** button par click karein aur **Web Service** select karein.
4. Apni GitHub repository select karein.
5. Form me ye details bharein:
   - **Name**: `rainbow-erp`
   - **Region**: `Singapore` (India ke sabse paas)
   - **Branch**: `main`
   - **Root Directory**: *(Khali chhod dein / Blank)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
   - **Instance Type**: `Free`
6. **Environment Variables** section me ye keys add karein:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `DATABASE_URL` = `mysql://user:pass@host:port/dbname` *(Aapke cloud database ka URL)*
   - `DB_SSL` = `true`
   - `JWT_SECRET` = *(Koi bhi strong 32-character random string)*
7. **Create Web Service** par click karein.
8. Render build aur deploy shuru kar dega. Deploy hone ke baad aapko jo URL milega (e.g. `https://rainbow-erp.onrender.com`), use direct browser me open karein!
   - Poora React App smoothly open hoga.
   - Sabhi APIs (`/api/*`), PDF Exports (`/api/pdf/*`), aur Excel Exports (`/api/excel/*`) seamlessly kaam karenge.

---

## ⚡ 4. Option 2: Separate Services (Backend + Frontend Static Site)

Agar aap Backend ko alag aur Frontend ko alag host karna chahte hain (jaise Frontend Vercel/Render Static Site par aur Backend Render Web Service par):

### Backend (Render Web Service):
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment Variables**: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `PORT=10000`
- Maan lijiye iska URL milta hai: `https://rainbow-api.onrender.com`

### Frontend (Render Static Site / Vercel):
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Publish Directory**: `dist`
- **Environment Variable**:
  - `VITE_API_URL` = `https://rainbow-api.onrender.com/api`

---

## 🔒 5. Default Login Credentials
Backend server boot hote hi auto-seed kar deta hai:
- **Email**: `admin@rainbowcarpet.com`
- **Password**: `Rainbow@123`
- **Role**: `SUPER_ADMIN`
