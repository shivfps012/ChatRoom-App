# 💬 ChatRoom — MERN + Native WebSocket

A real-time chat application built with the MERN stack and native WebSockets (no Socket.IO).

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
└── server/                   # Node.js + Express + WebSocket backend
    ├── config/
    │   ├── db.js              # MongoDB connection
    │   └── cloudinary.js      # Cloudinary config
    ├── controllers/
    │   ├── authController.js  # signup, login, getMe, logout
    │   └── roomController.js  # create, join, get room, messages
    ├── middleware/
    │   └── auth.js            # JWT protect middleware
    ├── models/
    │   ├── User.js            # username, email, hashed password
    │   ├── Room.js            # roomId, createdBy, participants
    │   └── Message.js         # roomId, senderId, text, imageUrl
    ├── routes/
    │   ├── authRoutes.js
    │   ├── roomRoutes.js
    │   └── uploadRoutes.js    # Cloudinary image upload
    ├── utils/
    │   └── jwt.js             # generateToken, verifyToken
    ├── websocket/
    │   └── handler.js         # All WebSocket logic
    ├── .env.example
    ├── index.js               # Server entry point
    └── package.json
```

## 🚀 Quick Start

### 1. Server Setup
```bash
cd server
cp .env.example .env
# Fill in: MONGO_URI, JWT_SECRET, Cloudinary keys, CLIENT_URL
npm install
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
| `chat` | `{ roomId, message, imageUrl }` | Send a message |
| `typing` | `{ isTyping }` | Typing indicator |
| `leave` | `{ roomId }` | Leave room |

### Server → Client
| Event | Description |
|-------|-------------|
| `session` | Auth confirmed, sessionId + userId |
| `history` | Last 50 messages from MongoDB |
| `join` | User joined broadcast |
| `leave` | User left broadcast |
| `chat` | New message broadcast |
| `typing` | Typing indicator broadcast |
| `error` | Error message |

## 🛠 Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS, React Router v6
- **Backend:** Node.js, Express, ws (native WebSocket)
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcryptjs
- **Image Upload:** Cloudinary
- **Real-time:** Native WebSocket (ws library)
