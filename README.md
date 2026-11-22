# hola

A video meeting app: instant rooms you join with a code, peer-to-peer video (WebRTC), live chat, screen sharing, and meeting history for registered users.

## Features

- Start an instant meeting or join with a room code or link
- Join as a guest (no account needed) with a display name
- Video and audio, camera/mic toggles, screen sharing
- In-call chat with unread count
- Copy room code or link
- Register / login, and a history of meetings you have joined

## Tech stack

| Part | Stack |
| --- | --- |
| Frontend | React 19, Vite, React Router, socket.io-client |
| Backend | Node.js, Express, Socket.IO, Mongoose |
| Database | MongoDB (users and meeting history) |
| Video | WebRTC; Socket.IO is used for signalling and chat |

## Project structure

```
hola/
├── backend/
│   └── src/
│       ├── app.js                      # Express + Socket.IO server entry
│       ├── controllers/
│       │   ├── socketManager.js        # rooms, signalling, chat
│       │   └── user.controller.js      # login, register, history
│       ├── models/                     # User, Meeting
│       └── routes/users.routes.js
└── frontend/
    ├── public/people/                  # landing page avatars
    └── src/
        ├── pages/                      # Landing, Auth, Home, History, VideoMeet
        ├── api.js                      # REST helpers and token storage
        └── config.js                   # backend URL
```

## Getting started

Requires Node.js 18+ and a MongoDB database (for login and history only).

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/
PORT=8000
```

Then run:

```bash
npm run dev     # with auto-reload
# or
npm start
```

You should see `LISTEN ON PORT 8000`. The server starts even if MongoDB is unreachable; video calls and chat still work, but login, register and history will not.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend expects the backend at `http://localhost:8000`; to change that, set `VITE_SERVER_URL` (for example in `frontend/.env`).

### Trying a call

Open the app in two browser tabs, join the same room code, and allow camera/mic access. Camera and mic require `localhost` or HTTPS.

## API

Base path: `/api/v1/users`

| Method | Route | Body / query | Description |
| --- | --- | --- | --- |
| POST | `/register` | `name`, `username`, `password` | Create an account |
| POST | `/login` | `username`, `password` | Returns `{ token }` |
| POST | `/add_to_activity` | `token`, `meeting_code` | Record a joined meeting |
| GET | `/get_all_activity` | `?token=` | List the user's meetings, newest first |

### Socket.IO events

| Event | Direction | Purpose |
| --- | --- | --- |
| `join_call` (room) | client → server | Join a room |
| `user_joined` (id, clients) | server → client | Someone joined |
| `signal` (toId, message) | both | WebRTC offer/answer/ICE relay |
| `chat_message` (text, sender) | both | Chat; history replayed to newcomers |
| `user_left` (id) | server → client | Someone left |

## Deployment

Vercel cannot run the backend: Socket.IO needs a long-running server, and Vercel serverless functions do not keep WebSocket connections open. Deploy the two halves separately.

### Backend (Render, Railway or Fly.io)

- Root directory: `backend`, build command `npm install`, start command `npm start`
- Environment variables:

| Variable | Example | Notes |
| --- | --- | --- |
| `MONGO_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/hola` | Required for login/history. In Atlas, allow the host's IPs under Network Access. |
| `PORT` | `8000` | Usually set automatically by the host |
| `FRONTEND_URL` | `https://your-app.vercel.app` | Allowed CORS origin(s), comma separated. Unset allows any origin. |

### Frontend (Vercel)

- Root directory: `frontend`, framework preset Vite (build `npm run build`, output `dist`)
- Environment variable:

| Variable | Example | Notes |
| --- | --- | --- |
| `VITE_SERVER_URL` | `https://your-backend.onrender.com` | Your deployed backend URL, no trailing slash. Set it before building: Vite bakes it in at build time. |

`frontend/vercel.json` rewrites all routes to `index.html` so links like `/meet/abc123` work on refresh. Camera and mic need HTTPS, which Vercel provides.

Order: deploy the backend, copy its URL into `VITE_SERVER_URL`, deploy the frontend, then set `FRONTEND_URL` on the backend to the Vercel URL.

Copy `backend/.env.example` and `frontend/.env.example` for local setup.

## Scripts

Frontend: `npm run dev`, `npm run build`, `npm run lint`, `npm run preview`.
Backend: `npm run dev`, `npm start`.

## Known limitations

- Only a public STUN server is configured. Calls between people on restrictive networks may fail until you add a TURN server (`RTC_CONFIG` in `frontend/src/pages/VideoMeet.jsx`).
- Login tokens are random strings with no expiry.
- Chat history lives in server memory and is cleared when a room empties.
- CORS is open to all origins; restrict it before deploying.
- Never commit `backend/.env`; it is git-ignored.
