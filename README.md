# Talkie - Real-Time Chat Application

A modern, real-time chat application that works across browsers using a lightweight Node.js backend with JSON file storage.

## 🚀 Features

- ✅ Real-time messaging across different browsers
- ✅ Typing indicators
- ✅ Image sharing
- ✅ Online/offline status
- ✅ Unread message counters
- ✅ Mobile & Desktop responsive
- ✅ No database required (JSON file storage)

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

## 🎯 Running the App

### Option 1: With Server (Cross-Browser Support)

1. Start the server:
```bash
npm start
```

2. Open the app in multiple browsers:
   - Chrome: `http://localhost:3000`
   - Firefox: `http://localhost:3000`
   - Edge: `http://localhost:3000`
   - Safari: `http://localhost:3000`

3. Login with different emails in each browser and start chatting!

### Option 2: Without Server (Same Browser Only)

1. Simply open `index.html` in your browser
2. Open multiple tabs to test (uses localStorage)

## 🏗️ Project Structure

```
Talkies/
├── index.html          # Main HTML (uses localStorage version)
├── app.js             # Client-side app (localStorage version)
├── app-server.js      # Client-side app (server version)
├── server.js          # Node.js Express server
├── style.css          # Custom styles
├── package.json       # Dependencies
└── data.json          # Auto-generated data storage
```

## 🔄 Switching Between Modes

### To use Server Mode (cross-browser):
Update `index.html` to use `app-server.js`:
```html
<script src="app-server.js"></script>
```

### To use LocalStorage Mode (same browser):
Update `index.html` to use `app.js`:
```html
<script src="app.js"></script>
```

## 🛠️ Technologies Used

- **Frontend**: Vanilla JavaScript, Tailwind CSS
- **Backend**: Node.js, Express
- **Storage**: JSON file (no database needed)
- **Real-time**: Polling (1s intervals)

## 📱 How to Test

1. Start the server with `npm start`
2. Open Chrome and login as "Alice" (alice@test.com)
3. Open Firefox and login as "Bob" (bob@test.com)
4. Start chatting in real-time!
5. Send text messages and images
6. See typing indicators
7. Check online/offline status

## 🌐 API Endpoints

- `GET /api/users` - Get all users
- `POST /api/users` - Create/update user
- `GET /api/messages` - Get all messages
- `POST /api/messages` - Send message
- `GET /api/online` - Get online users
- `POST /api/online` - Update online status
- `GET /api/typing` - Get typing users
- `POST /api/typing` - Update typing status
- `POST /api/messages/read` - Mark messages as read
- `POST /api/heartbeat/:userId` - Keep user online

## 📝 Notes

- The `data.json` file stores all app data
- Server cleans stale data automatically
- Images stored as Base64 (5MB limit)
- Heartbeat keeps users online (5s intervals)
- Works on local network too!

## 🎨 Customization

You can customize the app by:
- Changing colors in Tailwind classes
- Modifying polling intervals in `app-server.js`
- Adjusting timeouts for typing/online indicators
- Adding more features to the server API

Enjoy chatting! 💬✨
