
# Focusage

Focusage is a full-stack productivity app designed to help students stay focused, manage deadlines, track study sessions, and stay accountable with friends.
It combines task management, a Pomodoro timer, an immersive focus environment, productivity analytics, and social accountability in one place.

## Features

- **Guest Mode** — Manage tasks without creating an account. Guest tasks are saved locally in the browser.
- **Task Management** — Create, organize, prioritize, filter, and sort tasks by deadlines and completion status.
- **Pomodoro Timer** — 25-minute focus sessions and 5-minute breaks with start, pause, and reset controls.
- **Focus Mode** — A distraction-free environment with ambient themes, soundscapes, and an audio mixer.
- **Progress Dashboard** — Track daily and weekly focus time, streaks, and recent sessions.
- **Friends & Accountability** — Send and accept friend requests, view friends' activity status, and compete on a leaderboard.
- **Task Sharing** — Share selected tasks with accepted friends while maintaining control over what you share.
- **Authentication** — Secure registration and login using password hashing and JWT-based authentication.


## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

### Backend
- Node.js
- Express
- TypeScript
- REST API

### Database & Authentication
- MongoDB Atlas
- Mongoose
- JSON Web Tokens (JWT)
- bcrypt

## Architecture

Focusage follows a layered backend architecture:
`Request → Route → Middleware → Controller → Service → Model → Database`

- **Routes** define API endpoints.
- **Middleware** handles authentication and request-level processing.
- **Controllers** validate requests and manage responses.
- **Services** contain business logic.
- **Models** define MongoDB schemas and interact with the database.

The frontend communicates with the backend through a centralized API client.


## Security

- Passwords are hashed using bcrypt.
- JWTs are used for authentication.
- Protected API routes require authentication.
- User-specific data is scoped to the authenticated user.
- Friend-related data is restricted to accepted friendships.
- Task sharing is controlled by user permissions.


## Future Improvements

- Recover active focus sessions after page refresh.
- Add rate limiting and stronger authentication protections.
- Improve timezone-aware productivity stats.

## Author
[GitHub](https://github.com/ayushiii24) 
