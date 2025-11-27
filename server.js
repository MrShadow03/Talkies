const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Data file path
const DATA_FILE = path.join(__dirname, 'data.json');

// Initialize data structure
const initData = {
  users: [],
  messages: [],
  onlineUsers: [],
  typingUsers: []
};

// Initialize data file
async function initDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(initData, null, 2));
  }
}

// Read data
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return initData;
  }
}

// Write data
async function writeData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// Clean stale online users (offline for more than 10 seconds)
function cleanStaleUsers(data) {
  const now = Date.now();
  data.onlineUsers = data.onlineUsers.filter(u => now - u.timestamp < 10000);
  return data;
}

// Clean stale typing indicators (more than 3 seconds old)
function cleanStaleTyping(data) {
  const now = Date.now();
  data.typingUsers = data.typingUsers.filter(t => now - t.timestamp < 3000);
  return data;
}

// API Routes

// Get all data
app.get('/api/data', async (req, res) => {
  try {
    let data = await readData();
    data = cleanStaleUsers(data);
    data = cleanStaleTyping(data);
    await writeData(data);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save user
app.post('/api/users', async (req, res) => {
  try {
    const data = await readData();
    const user = req.body;
    
    const existingIndex = data.users.findIndex(u => u.email === user.email);
    if (existingIndex >= 0) {
      data.users[existingIndex] = { ...data.users[existingIndex], ...user };
    } else {
      user.id = Date.now().toString();
      user.joinedAt = new Date().toISOString();
      data.users.push(user);
    }
    
    await writeData(data);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get users
app.get('/api/users', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
app.post('/api/messages', async (req, res) => {
  try {
    const data = await readData();
    const message = {
      ...req.body,
      id: Date.now().toString() + Math.random(),
      timestamp: Date.now(),
      read: false
    };
    
    data.messages.push(message);
    await writeData(data);
    res.json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages
app.get('/api/messages', async (req, res) => {
  try {
    const data = await readData();
    res.json(data.messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update online status
app.post('/api/online', async (req, res) => {
  try {
    const data = await readData();
    const { userId, online } = req.body;
    
    if (online) {
      const existing = data.onlineUsers.find(u => u.userId === userId);
      if (!existing) {
        data.onlineUsers.push({ userId, timestamp: Date.now() });
      } else {
        existing.timestamp = Date.now();
      }
    } else {
      data.onlineUsers = data.onlineUsers.filter(u => u.userId !== userId);
    }
    
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get online users
app.get('/api/online', async (req, res) => {
  try {
    let data = await readData();
    data = cleanStaleUsers(data);
    await writeData(data);
    res.json(data.onlineUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update typing status
app.post('/api/typing', async (req, res) => {
  try {
    const data = await readData();
    const { userId, targetUserId, isTyping } = req.body;
    const key = `${userId}_${targetUserId}`;
    
    if (isTyping) {
      const existing = data.typingUsers.find(t => t.key === key);
      if (!existing) {
        data.typingUsers.push({ key, userId, targetUserId, timestamp: Date.now() });
      } else {
        existing.timestamp = Date.now();
      }
    } else {
      data.typingUsers = data.typingUsers.filter(t => t.key !== key);
    }
    
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get typing users
app.get('/api/typing', async (req, res) => {
  try {
    let data = await readData();
    data = cleanStaleTyping(data);
    await writeData(data);
    res.json(data.typingUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
app.post('/api/messages/read', async (req, res) => {
  try {
    const data = await readData();
    const { currentUserId, otherUserId } = req.body;
    
    data.messages.forEach(m => {
      if (m.toUserId === currentUserId && m.fromUserId === otherUserId && !m.read) {
        m.read = true;
      }
    });
    
    await writeData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Heartbeat endpoint for keeping connection alive
app.post('/api/heartbeat/:userId', async (req, res) => {
  try {
    const data = await readData();
    const userId = req.params.userId;
    
    const user = data.onlineUsers.find(u => u.userId === userId);
    if (user) {
      user.timestamp = Date.now();
      await writeData(data);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
initDataFile().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Talkie server running on http://localhost:${PORT}`);
    console.log(`📱 Open http://localhost:${PORT} in multiple browsers to test!`);
  });
});
