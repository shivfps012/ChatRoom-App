# 💬 ChatRoom — MERN + Native WebSocket + TypeScript

A real-time chat application built with the MERN stack, TypeScript, and native WebSockets (no Socket.IO).

## 📁 Project Structure

```
chatroom-app/
├── client/                   # React frontend (Vite + Tailwind)
│   ├── src/
│   │   ├── api/axios.js       # Axios instance with JWT interceptor
│   │   ├── context/           # AuthContext (global auth state)
│   │   ├── hooks/             # useWebSocket custom hook
│   │   ├── pages/             # Login, Signup, Lobby, Chat
│   │   ├── App.jsx            # Router + route guards
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.js
│
└── server/                   # Node.js + Express + WebSocket backend (TypeScript)
    ├── config/
    │   ├── db.ts              # MongoDB connection
    │   └── cloudinary.ts      # Cloudinary config
    ├── controllers/
    │   ├── authController.ts  # signup, login, getMe, logout
    │   └── roomController.ts  # create, join, get room, messages
    ├── middleware/
    │   └── auth.ts            # JWT protect middleware + AuthRequest interface
    ├── models/
    │   ├── User.ts            # IUser interface, username, email, hashed password
    │   ├── Room.ts            # IRoom interface, roomId, createdBy, participants
    │   └── Message.ts         # IMessage interface, roomId, senderId, text, imageUrl
    ├── routes/
    │   ├── authRoutes.ts
    │   ├── roomRoutes.ts
    │   └── uploadRoutes.ts    # Cloudinary image upload
    ├── utils/
    │   └── jwt.ts             # generateToken, verifyToken with TokenPayload interface
    ├── websocket/
    │   └── handler.ts         # All WebSocket logic with Client interface
    ├── dist/                  # Compiled JavaScript output
    ├── .env.example
    ├── index.ts               # Server entry point (TypeScript)
    ├── tsconfig.json          # TypeScript configuration
    └── package.json
```

## 🚀 Quick Start

### 1. Server Setup (TypeScript)
```bash
cd server
cp .env.example .env
# Fill in: MONGO_URI, JWT_SECRET, Cloudinary keys, CLIENT_URL
npm install

# Build TypeScript
npm run build

# Run compiled server
npm start

# Or run in development mode with auto-compilation
npm run dev
```

### 2. Client Setup
```bash
cd client
cp .env.example .env
# Fill in: VITE_API_URL, VITE_WS_URL
npm install
npm run dev
```

## 🔑 Environment Variables

### server/.env
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatroom
JWT_SECRET=your_super_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
REDIS_CHAT_CHANNEL=chatroom:events
REDIS_PRESENCE_PREFIX=chatroom:presence
REDIS_HISTORY_PREFIX=chatroom:history
REDIS_HISTORY_LIMIT=500
REDIS_HISTORY_TTL_SECONDS=3600
REDIS_RATE_LIMIT_PREFIX=chatroom:rate-limit
```

### client/.env
```
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

## 🔌 WebSocket Event Reference

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `join` | `{ roomId, token }` | Join room + receive history |
| `chat` | `{ roomId, message, imageUrl, videoUrl, replyToMessageId }` | Send a text, image, or video message, optionally as a reply |
| `typing` | `{ isTyping }` | Typing indicator |
| `leave` | `{ roomId }` | Leave room |

### Server → Client
| Event | Description |
|-------|-------------|
| `session` | Auth confirmed, sessionId + userId |
| `history` | Last 50 messages from MongoDB |
| `join` | User joined broadcast |
| `leave` | User left broadcast |
| `chat` | New message broadcast, including `replyTo` snapshot when present |
| `typing` | Typing indicator broadcast |
| `error` | Error message |

## 🛠 Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6
- **Backend:** Node.js, Express, TypeScript, ws (native WebSocket)
- **Database:** MongoDB + Mongoose (with TypeScript interfaces)
- **Auth:** JWT + bcryptjs
- **Image Upload:** Cloudinary
- **Real-time:** Native WebSocket (ws library)
- **Language:** TypeScript with strict mode, ES2020 target

## 📦 Available Scripts

### Server
```bash
npm run build    # Compile TypeScript to JavaScript (outputs to dist/)
npm start        # Run compiled server (node dist/index.js)
npm run dev      # Run in development mode with auto-compilation
npm run watch    # Watch TypeScript files and recompile on changes
```

### Client
```bash
npm run dev      # Start Vite dev server (hot reload)
npm run build    # Build for production
npm run preview  # Preview production build locally
```

## 🔐 TypeScript Features

### Type Safety Across Stack
- **Models:** Mongoose schemas with TypeScript interfaces (`IUser`, `IMessage`, `IRoom`)
- **Middleware:** Express middleware with custom `AuthRequest` interface
- **Controllers:** Full Express `Request`/`Response` type safety
- **WebSocket:** Custom `Client` and `ChatMessage` interfaces
- **Utils:** JWT utilities with `TokenPayload` interface

### Strict Compilation
- `strict: true` in `tsconfig.json`
- `noImplicitAny: true` 
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- ES2020 target with ES modules
