# Banana Quest

College full-stack game: register, login, solve Banana API puzzles, use progressive hints, and climb a MySQL-backed scoreboard.

## Stack

- **Frontend:** React + Vite (`client/`)
- **Backend:** Node.js + Express (`server/`)
- **Database:** local MySQL 8 (`server/sql/schema.sql`)

## Features

1. Register
2. Login (JWT Bearer tokens, bcrypt password hashes)
3. Play — server fetches https://marcconrad.com/uob/banana/api.php (avoids browser CORS), shows PNG, answer input, hints
4. Scoreboard — top 50 by total points

## Scoring

- Correct answer: **10 points** base
- Each hint used subtracts **2 points** from that round (minimum **1** if still correct)
- Wrong answers award **0**; solution is revealed after a wrong submit
- Totals persist on `users.score` (plus `score_events` history)

## Hints (progressive, never the full answer)

1. Number of digits  
2. First digit  
3. Even / odd  

Max 3 hints per round.

## Auth

- `POST /api/auth/register` / `POST /api/auth/login` return a JWT
- Protected routes expect `Authorization: Bearer <token>`
- Tokens expire in 7 days (`JWT_SECRET` in env)

## Setup

### 1. Local MySQL

Install and start MySQL on your machine, then create the database (adjust user/password as needed):

```bash
mysql -u root -p -e "
CREATE DATABASE IF NOT EXISTS banana_game CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Put your MySQL credentials in `server/.env` (copy from `.env.example` and set `MYSQL_USER` / `MYSQL_PASSWORD`).

### 2. Server

```bash
cd server
cp .env.example .env   # set MYSQL_* and JWT_SECRET
npm install
npm run db:init
npm run dev            # http://localhost:3001
```

### 3. Client

```bash
cd client
npm install
npm run dev            # http://localhost:5173  (proxies /api → :3001)
```

## Environment variables (`server/.env`)

| Variable | Meaning | Default / example |
|---|---|---|
| `PORT` | API port | `3001` |
| `JWT_SECRET` | JWT signing secret | long random string |
| `MYSQL_HOST` | MySQL host | `127.0.0.1` |
| `MYSQL_PORT` | MySQL port | `3306` |
| `MYSQL_USER` | DB user | your local MySQL user |
| `MYSQL_PASSWORD` | DB password | your local MySQL password |
| `MYSQL_DATABASE` | DB name | `banana_game` |
| `BANANA_API_URL` | External puzzle API | `https://marcconrad.com/uob/banana/api.php` |
| `CLIENT_ORIGIN` | CORS origin | `http://localhost:5173` |

## API overview

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | no | Create account |
| POST | `/api/auth/login` | no | Get JWT |
| GET | `/api/auth/me` | yes | Current user |
| POST | `/api/game/start` | yes | Proxy Banana API, open round |
| POST | `/api/game/hint` | yes | Next hint for round |
| POST | `/api/game/answer` | yes | Submit answer, update score |
| GET | `/api/scoreboard` | no | Ranked scores |
| GET | `/api/health` | no | API + MySQL check |

## Project layout

```
banana-game/
  client/                 React + Vite UI
  server/
    sql/schema.sql        MySQL schema
    src/index.js          Express entry
    src/routes/           auth, game, scoreboard
    src/db/               mysql2 pool + init
  README.md
```

## Notes

- Solution values stay on the server until a wrong answer (or you never send them on start/hint).
- Prefer HTTPS Banana API URL (HTTP redirects to HTTPS).
- Do not commit `server/.env` — keep real passwords local only.
