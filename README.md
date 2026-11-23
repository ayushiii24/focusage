# Focusage

Focusage is a full-stack study and productivity app built around focused work sessions. Plan your tasks, run Pomodoro-style focus sessions in an immersive focus mode with ambient sounds, track your progress on a dashboard, and stay motivated with friends.

<!-- Add 2-3 screenshots here, for example:
![Home](docs/screenshots/home.png)
![Focus mode](docs/screenshots/focus-mode.png)
-->

## Features

- **Accounts and guest mode**: register and log in with email and password, or try the task list as a guest (guest tasks are stored in your browser)
- **Task management**: priorities, deadlines, filtering and sorting
- **Pomodoro timer**: 25-minute focus sessions and 5-minute breaks with start, pause and reset; completed focus sessions are recorded to your account
- **Focus mode**: a full-screen, distraction-free view with six ambient themes and an ambient sound mixer
- **Dashboard**: daily and weekly focus time, current streak and recent sessions
- **Friends**: send and accept friend requests, see friends' live activity status, a friends leaderboard, and optionally share selected tasks with friends
- **Profile**: view your account details and log out

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB Atlas, Mongoose |
| Auth | JWT, bcrypt |
| API | REST (JSON) |

## How it works

- **Authentication:** passwords are hashed with bcrypt before they are stored. Logging in returns a JWT (valid for 7 days) which the frontend sends in the `Authorization` header. Protected routes verify the token, and every query is scoped to the logged-in user.
- **Focus sessions:** the backend tracks each session (start, pause, resume, complete, abandon) and only records it as completed once the full focus time has elapsed. A database index allows only one active session per user.
- **Friends:** a friendship is only created when the other person accepts. Friends' stats, activity status and shared tasks are only visible to accepted friends.
- **Backend structure:** requests flow through routes, then controllers (validation), then services (business logic), then Mongoose models. Errors are handled in a single error middleware.

## Project structure

```
backend/
  src/
    config/        database connection
    controllers/   request validation and responses
    errors/        custom API error class
    middleware/    auth and error handling
    models/        Mongoose schemas
    routes/        route definitions
    services/      business logic
  tests/
frontend/
  src/
    components/    shared UI (timer, task list, focus mode, navbar)
    context/       timer state shared across pages
    lib/           API client
    pages/         route-level pages
    types/         shared TypeScript types
```

## Getting started

### Prerequisites

- A current LTS version of Node.js and npm
- A MongoDB Atlas cluster (or any MongoDB connection string)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env     # then fill in your own values
npm run dev
```

The API runs on `http://localhost:8000` by default.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The app runs on `http://localhost:5173`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Required | Description |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Long random string used to sign tokens (32+ characters) |
| `PORT` | No | API port (default `8000`) |
| `CLIENT_ORIGIN` | No | Allowed frontend origin(s) for CORS, comma-separated (default `http://localhost:5173`) |

Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | For production builds | Backend URL without a trailing slash. Defaults to `http://localhost:8000` in development only |

Never commit `.env` files. Only the `.env.example` templates are tracked.

## Scripts

| Where | Command | Description |
| --- | --- | --- |
| backend | `npm run dev` | Start the API with auto-reload |
| backend | `npm run build` | Compile TypeScript to `dist/` |
| backend | `npm start` | Run the compiled server |
| backend | `npm test` | Build, then run the backend tests |
| frontend | `npm run dev` | Start the Vite dev server |
| frontend | `npm run build` | Type-check and build for production |
| frontend | `npm run lint` | Run ESLint |
| frontend | `npm run preview` | Preview the production build |

## API overview

All routes except register and login require `Authorization: Bearer <token>`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Tasks | `POST /api/tasks`, `GET /api/tasks`, `GET /api/tasks/:id`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id` |
| Focus sessions | `POST /api/focus-sessions/start`, `/pause`, `/resume`, `/complete`, `/abandon`, `GET /api/focus-sessions` |
| Friends | `GET /api/friends`, `GET /api/friends/search`, `POST /api/friends/request`, `POST /api/friends/respond/:id`, `DELETE /api/friends/:id`, `GET /api/friends/leaderboard`, `GET`/`PATCH /api/friends/sharing`, `GET /api/friends/:friendId/tasks`, `POST /api/friends/activity-status` |

## Deployment notes

- Set `CLIENT_ORIGIN` on the backend to your deployed frontend URL.
- Set `VITE_API_URL` to your deployed backend URL when building the frontend.
- Use a strong, unique `JWT_SECRET`, and set all variables in your host's environment settings rather than in files.

## Known limitations and roadmap

- Refreshing the page during a focus session resets the on-screen timer, and that session may not be recorded
- Some server-side statistics (the weekly leaderboard window and peak focus time) use the server's timezone, so they can be a few hours off for users far from it
- The friends page reloads fully after each action
- Ambient sound starts only after you touch a sound control, and keeps playing after you leave focus mode
- Modal dialogs need better keyboard and focus handling
- No rate limiting on the authentication endpoints
- Test coverage is limited, and end-to-end tests are planned

## Author

Built by **<your name>**. [GitHub](https://github.com/<your-username>) · [LinkedIn](https://www.linkedin.com/in/<your-profile>)