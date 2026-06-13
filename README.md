# ChatRoom

A full-stack real-time chat application built with React, Express, TypeScript, MongoDB, and native WebSockets.

ChatRoom lets authenticated users create or join rooms, exchange persistent messages, share images and videos, reply to messages, and see live presence and typing updates. Redis can optionally be enabled for multi-instance WebSocket fanout, shared presence, history caching, and distributed rate limiting.

## Features

- Account signup, login, logout, session validation, and password reset
- JWT authentication through bearer tokens or HTTP-only cookies
- Protected client routes and authenticated REST/WebSocket requests
- Create rooms with shareable 10-character room IDs
- Join rooms and quickly rejoin the last visited room
- Real-time text messaging with typing indicators and online user counts
- Persistent MongoDB message history
- Redis-backed room history cache with MongoDB fallback
- Image uploads up to 5 MB and video uploads up to 100 MB through Cloudinary
- Image preview, zoom, and download support
- Inline video playback
- Message replies with clickable reply previews
- Emoji picker and light/dark chat themes
- Automatic WebSocket reconnection after connection loss or tab focus
- Zod request validation and REST API rate limiting
- Redis pub/sub and shared presence for multi-instance deployments
- Graceful fallback to local WebSocket presence and in-memory rate limiting when Redis is unavailable

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Client | React 18, Vite, Tailwind CSS, React Router, Axios |
| Server | Node.js, Express, TypeScript, `ws` |
| Data | MongoDB, Mongoose, Redis |
| Auth and validation | JWT, bcryptjs, Zod |
| Media | Cloudinary, Multer |
| Real-time | Native WebSockets with optional Redis pub/sub |

## Project Structure

```text
chatroom-app/
|-- client/
|   |-- public/
|   |   |-- _redirects
|   |   `-- chatroom-logo.png
|   |-- src/
|   |   |-- api/
|   |   |   `-- axios.js
|   |   |-- context/
|   |   |   `-- AuthContext.jsx
|   |   |-- hooks/
|   |   |   `-- useWebSocket.js
|   |   |-- pages/
|   |   |   |-- ChatPage.jsx
|   |   |   |-- LobbyPage.jsx
|   |   |   |-- LoginPage.jsx
|   |   |   `-- SignupPage.jsx
|   |   |-- App.jsx
|   |   |-- index.css
|   |   `-- main.jsx
|   |-- .env.example
|   |-- index.html
|   |-- package-lock.json
|   |-- package.json
|   |-- postcss.config.js
|   |-- tailwind.config.js
|   `-- vite.config.js
|-- server/
|   |-- config/
|   |   |-- cloudinary.ts
|   |   |-- db.ts
|   |   |-- rateLimiter.ts
|   |   |-- redis.ts
|   |   `-- redisRateLimitStore.ts
|   |-- controllers/
|   |   |-- authController.ts
|   |   `-- roomController.ts
|   |-- middleware/
|   |   |-- auth.ts
|   |   `-- validate.ts
|   |-- models/
|   |   |-- Message.ts
|   |   |-- Room.ts
|   |   `-- User.ts
|   |-- routes/
|   |   |-- authRoutes.ts
|   |   |-- roomRoutes.ts
|   |   `-- uploadRoutes.ts
|   |-- schemas/
|   |   |-- authSchemas.ts
|   |   `-- roomSchemas.ts
|   |-- utils/
|   |   |-- cloudinary.ts
|   |   `-- jwt.ts
|   |-- websocket/
|   |   `-- handler.ts
|   |-- .env.example
|   |-- index.ts
|   |-- package-lock.json
|   |-- package.json
|   `-- tsconfig.json
|-- package.json
`-- README.md
```

Generated directories such as `node_modules`, `client/dist`, `server/dist`, and
`server/logs` are not shown. Local `.env` files are also omitted because they
contain environment-specific secrets.

## Prerequisites

- Node.js and npm
- MongoDB, running locally or available through a hosted connection string
- A Cloudinary account for image and video uploads
- Redis, optional but recommended for multi-instance deployments and shared rate limits

## Getting Started

### 1. Install dependencies

From the project root:

```bash
npm run install:all
```

### 2. Configure the server

Copy `server/.env.example` to `server/.env`, then update the values:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatroom
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
NODE_ENV=development

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CLIENT_URL=http://localhost:5173

# Optional Redis configuration
REDIS_URL=redis://localhost:6379
INSTANCE_ID=chatroom-server-1
REDIS_CHAT_CHANNEL=chatroom:events
REDIS_PRESENCE_PREFIX=chatroom:presence
REDIS_HISTORY_PREFIX=chatroom:history
REDIS_HISTORY_LIMIT=500
REDIS_HISTORY_TTL_SECONDS=3600
REDIS_RATE_LIMIT_PREFIX=chatroom:rate-limit
```

`MONGO_URI` and a strong `JWT_SECRET` should be configured for every deployment. Cloudinary variables are required only for media uploads. When `REDIS_URL` is omitted or Redis is unavailable, chat continues on the current server instance and rate limiting falls back to memory.

### 3. Configure the client

Copy `client/.env.example` to `client/.env`:

```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

Use `https://` and `wss://` URLs in production.

### 4. Start the application

Run the server and client in separate terminals from the project root:

```bash
npm run dev:server
```

```bash
npm run dev:client
```

The client is available at `http://localhost:5173`, and the API/WebSocket server runs at `http://localhost:5000`.

Check server health with:

```bash
curl http://localhost:5000/health
```

## Available Scripts

### Project root

| Command | Description |
| --- | --- |
| `npm run install:all` | Install server and client dependencies |
| `npm run dev:server` | Start the TypeScript server in development mode |
| `npm run dev:client` | Start the Vite development server |
| `npm start` | Start the compiled server |

### Server

| Command | Description |
| --- | --- |
| `npm run dev` | Run `index.ts` with `ts-node` |
| `npm run build` | Compile TypeScript into `server/dist` |
| `npm start` | Run `server/dist/index.js` |
| `npm run watch` | Recompile TypeScript when files change |

### Client

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production client |
| `npm run preview` | Preview the production build |

## REST API

All room and upload routes require authentication.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Check server health |
| `POST` | `/api/auth/signup` | Create an account |
| `POST` | `/api/auth/login` | Log in |
| `POST` | `/api/auth/forgot-password` | Generate a 15-minute reset token |
| `POST` | `/api/auth/reset-password` | Reset a password with a valid token |
| `GET` | `/api/auth/me` | Get the authenticated user |
| `POST` | `/api/auth/logout` | Clear the auth cookie |
| `POST` | `/api/rooms/create` | Create a room |
| `POST` | `/api/rooms/join` | Join a room by ID |
| `GET` | `/api/rooms/:roomId` | Get room details |
| `GET` | `/api/rooms/:roomId/messages` | Get paginated room messages |
| `POST` | `/api/upload` | Upload an image or video using multipart field `media` |

The current password-reset flow returns the reset token in the API response and logs it on the server. Replace this development flow with an email provider before using it in production.

## WebSocket Events

Messages use the following envelope:

```json
{
  "type": "event-name",
  "payload": {}
}
```

### Client to server

| Event | Payload | Description |
| --- | --- | --- |
| `join` | `{ roomId, token }` | Authenticate, join a room, and receive history |
| `chat` | `{ roomId, message, imageUrl, videoUrl, replyToMessageId, replyToSnapshot }` | Send text or media, optionally as a reply |
| `typing` | `{ isTyping }` | Broadcast typing state |
| `leave` | `{ roomId }` | Leave the current room |

### Server to client

| Event | Description |
| --- | --- |
| `session` | Confirms the WebSocket session and authenticated user |
| `history` | Sends cached history or up to the latest 100 MongoDB messages |
| `join` | Announces a user joining and updates the user count |
| `leave` | Announces a user leaving and updates the user count |
| `chat` | Broadcasts a saved text, image, video, or reply message |
| `typing` | Broadcasts a user's typing state |
| `error` | Reports an invalid request or server error |

Every chat message is saved to MongoDB before it is broadcast. With Redis enabled, events are also published across server instances and recent history is cached using the configured limit and TTL.

## Rate Limiting

- Global REST limit: 100 requests per IP every 5 minutes
- Authentication limit: 5 unsuccessful requests per IP every 5 minutes
- `/health` and `/api/auth/logout` bypass the global limiter
- Limit events are written to `server/logs/rate-limit.log` when the server runs from the `server` directory
- Redis stores shared counters when configured; otherwise each process uses an in-memory store

## Production Notes

- Build the server with `cd server && npm run build`, then start it with `npm start`.
- Build the client with `cd client && npm run build`.
- Set `NODE_ENV=production` so auth cookies use secure cross-site settings.
- Configure `CLIENT_URL` to exactly match the deployed frontend origin.
- Use a strong `JWT_SECRET`, hosted MongoDB, Cloudinary credentials, and `wss://` for WebSockets.
- Configure Redis when running more than one server instance.
- Replace the development password-reset token response with secure email delivery.
