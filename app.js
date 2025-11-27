const app = document.getElementById('app');
let currentUser = null;
let currentChatUser = null;
let messageCheckInterval = null;

// ==================== DATA LAYER ====================

// Initialize localStorage structure
function initStorage() {
  if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify([]));
  }
  if (!localStorage.getItem('messages')) {
    localStorage.setItem('messages', JSON.stringify([]));
  }
  if (!localStorage.getItem('onlineUsers')) {
    localStorage.setItem('onlineUsers', JSON.stringify([]));
  }
  if (!localStorage.getItem('typingUsers')) {
    localStorage.setItem('typingUsers', JSON.stringify([]));
  }
}

// User Management
function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '[]');
}

function saveUser(user) {
  const users = getUsers();
  const existingIndex = users.findIndex(u => u.email === user.email);
  
  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...user };
  } else {
    user.id = Date.now().toString();
    user.joinedAt = new Date().toISOString();
    users.push(user);
  }
  
  localStorage.setItem('users', JSON.stringify(users));
  return user;
}

function getUserByEmail(email) {
  const users = getUsers();
  return users.find(u => u.email === email);
}

// Online Status Management
function getOnlineUsers() {
  return JSON.parse(localStorage.getItem('onlineUsers') || '[]');
}

function setUserOnline(userId) {
  const onlineUsers = getOnlineUsers();
  if (!onlineUsers.find(u => u.userId === userId)) {
    onlineUsers.push({ userId, timestamp: Date.now() });
    localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
    triggerStorageUpdate('online_status');
  }
}

function setUserOffline(userId) {
  let onlineUsers = getOnlineUsers();
  onlineUsers = onlineUsers.filter(u => u.userId !== userId);
  localStorage.setItem('onlineUsers', JSON.stringify(onlineUsers));
  triggerStorageUpdate('online_status');
}

function isUserOnline(userId) {
  const onlineUsers = getOnlineUsers();
  return onlineUsers.some(u => u.userId === userId);
}

// Typing Status Management
function getTypingUsers() {
  return JSON.parse(localStorage.getItem('typingUsers') || '[]');
}

function setUserTyping(userId, targetUserId, isTyping) {
  let typingUsers = getTypingUsers();
  const key = `${userId}_${targetUserId}`;
  
  if (isTyping) {
    const existing = typingUsers.find(t => t.key === key);
    if (!existing) {
      typingUsers.push({ key, userId, targetUserId, timestamp: Date.now() });
    } else {
      existing.timestamp = Date.now();
    }
  } else {
    typingUsers = typingUsers.filter(t => t.key !== key);
  }
  
  localStorage.setItem('typingUsers', JSON.stringify(typingUsers));
  triggerStorageUpdate('typing_status');
}

function isUserTypingToMe(userId, myUserId) {
  const typingUsers = getTypingUsers();
  const typing = typingUsers.find(t => t.userId === userId && t.targetUserId === myUserId);
  
  // Consider typing status stale after 3 seconds
  if (typing && Date.now() - typing.timestamp < 3000) {
    return true;
  }
  return false;
}

// Message Management
function getMessages() {
  return JSON.parse(localStorage.getItem('messages') || '[]');
}

function sendMessage(fromUserId, toUserId, text) {
  const messages = getMessages();
  const message = {
    id: Date.now().toString() + Math.random(),
    fromUserId,
    toUserId,
    text,
    timestamp: Date.now(),
    read: false,
    type: 'text'
  };
  
  messages.push(message);
  localStorage.setItem('messages', JSON.stringify(messages));
  triggerStorageUpdate('new_message');
  return message;
}

function sendImageMessage(fromUserId, toUserId, imageData) {
  const messages = getMessages();
  const message = {
    id: Date.now().toString() + Math.random(),
    fromUserId,
    toUserId,
    text: imageData,
    timestamp: Date.now(),
    read: false,
    type: 'image'
  };
  
  messages.push(message);
  localStorage.setItem('messages', JSON.stringify(messages));
  triggerStorageUpdate('new_message');
  return message;
}

function getConversation(user1Id, user2Id) {
  const messages = getMessages();
  return messages.filter(m => 
    (m.fromUserId === user1Id && m.toUserId === user2Id) ||
    (m.fromUserId === user2Id && m.toUserId === user1Id)
  ).sort((a, b) => a.timestamp - b.timestamp);
}

function getLastMessage(user1Id, user2Id) {
  const conversation = getConversation(user1Id, user2Id);
  return conversation[conversation.length - 1];
}

function markMessagesAsRead(currentUserId, otherUserId) {
  const messages = getMessages();
  let updated = false;
  
  messages.forEach(m => {
    if (m.toUserId === currentUserId && m.fromUserId === otherUserId && !m.read) {
      m.read = true;
      updated = true;
    }
  });
  
  if (updated) {
    localStorage.setItem('messages', JSON.stringify(messages));
  }
}

function getUnreadCount(currentUserId, otherUserId) {
  const messages = getMessages();
  return messages.filter(m => 
    m.toUserId === currentUserId && 
    m.fromUserId === otherUserId && 
    !m.read
  ).length;
}

// Session Management
function setCurrentSession(user) {
  sessionStorage.setItem('currentUser', JSON.stringify(user));
  currentUser = user;
  setUserOnline(user.id);
}

function getCurrentSession() {
  const session = sessionStorage.getItem('currentUser');
  return session ? JSON.parse(session) : null;
}

function clearSession() {
  if (currentUser) {
    setUserOffline(currentUser.id);
  }
  sessionStorage.removeItem('currentUser');
  currentUser = null;
}

// Storage Event Trigger (for cross-tab communication)
function triggerStorageUpdate(type) {
  localStorage.setItem('lastUpdate', JSON.stringify({
    type,
    timestamp: Date.now()
  }));
}

// ==================== UI LAYER ====================

function navigate(page, data = {}) {
  if (page === 'inbox' && data.userId) {
    currentChatUser = data.userId;
  }
  window.location.hash = page;
  render();
}

function render() {
  const page = window.location.hash.replace('#', '') || 'login';
  
  // Check if user is logged in (except for login page)
  if (page !== 'login' && !getCurrentSession()) {
    window.location.hash = 'login';
    app.innerHTML = loginPage();
    return;
  }
  
  if (page === 'login') {
    if (getCurrentSession()) {
      window.location.hash = 'chats';
      app.innerHTML = chatListPage();
    } else {
      app.innerHTML = loginPage();
    }
  }
  if (page === 'chats') app.innerHTML = chatListPage();
  if (page === 'inbox') app.innerHTML = inboxPage();
  if (page === 'profile') app.innerHTML = profilePage();
}

// Login Page
function loginPage() {
  return `
    <div class='w-full max-w-md mx-auto bg-white rounded-3xl shadow-2xl p-8 md:p-10'>
      <div class='text-center mb-8'>
        <div class='inline-block bg-gradient-to-br from-purple-500 to-blue-500 p-4 rounded-2xl mb-4'>
          <span class='text-4xl'>💬</span>
        </div>
        <h1 class='text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent'>Talkie</h1>
        <p class='text-gray-500 mt-2'>Connect with friends in real-time</p>
      </div>

      <div id='errorMsg' class='hidden bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl mb-4 text-sm'></div>

      <div class='space-y-4'>
        <input id='nameInput' class='w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition' placeholder='Full Name' />
        <input id='emailInput' class='w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition' placeholder='Email' />

        <button class='w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-4 rounded-xl hover:from-purple-600 hover:to-blue-600 font-semibold shadow-lg transform hover:scale-[1.02] transition'
                onclick="handleLogin()">Login / Register</button>
      </div>

      <div class='mt-6 text-sm text-gray-600 bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl border border-purple-100'>
        <p class='font-bold mb-2 text-purple-700'>💡 How to test:</p>
        <p class='mb-1'>1. Open multiple browser tabs</p>
        <p class='mb-1'>2. Login with different emails in each tab</p>
        <p>3. Start chatting in real-time!</p>
      </div>
    </div>`;
}

function handleLogin() {
  const name = document.getElementById('nameInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const errorMsg = document.getElementById('errorMsg');
  
  if (!name || !email) {
    errorMsg.textContent = 'Please fill in all fields';
    errorMsg.classList.remove('hidden');
    return;
  }
  
  if (!email.includes('@')) {
    errorMsg.textContent = 'Please enter a valid email';
    errorMsg.classList.remove('hidden');
    return;
  }
  
  let user = getUserByEmail(email);
  if (!user) {
    user = saveUser({ name, email });
  } else {
    user.name = name; // Update name if changed
    saveUser(user);
  }
  
  setCurrentSession(user);
  navigate('chats');
}

// Chat List Page
function chatListPage() {
  const currentUser = getCurrentSession();
  const allUsers = getUsers().filter(u => u.id !== currentUser.id);
  const onlineUsers = getOnlineUsers();
  
  return `
    <div class='w-full max-w-5xl mx-auto h-[90vh] md:h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col'>
      <!-- Header -->
      <div class='bg-gradient-to-r from-purple-500 to-blue-500 p-4 md:p-6'>
        <div class='flex justify-between items-center'>
          <div>
            <h1 class='text-2xl md:text-3xl font-bold text-white'>Chats</h1>
            <p class='text-sm text-purple-100'>Logged in as ${currentUser.name}</p>
          </div>
          <div class='flex gap-2 md:gap-3'>
            <button onclick="navigate('profile')" 
                    class='w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition'>
              👤
            </button>
            <button onclick="handleLogout()" 
                    class='w-10 h-10 md:w-12 md:h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition'>
              🚪
            </button>
          </div>
        </div>
      </div>

      <!-- Chat List -->
      <div class='flex-1 overflow-y-auto p-4 md:p-6'>
        ${allUsers.length === 0 ? `
          <div class='bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 p-6 rounded-2xl text-center'>
            <div class='text-5xl mb-4'>👋</div>
            <p class='text-gray-700 font-medium'>No other users yet</p>
            <p class='text-gray-600 text-sm mt-2'>Open another tab and create a new account to start chatting!</p>
          </div>
        ` : `
          <div class='grid gap-3 md:gap-4'>
            ${allUsers.map(user => {
              const online = isUserOnline(user.id);
              const lastMsg = getLastMessage(currentUser.id, user.id);
              const unreadCount = getUnreadCount(currentUser.id, user.id);
              
              return `
              <div class='flex items-center gap-3 md:gap-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl shadow-sm hover:shadow-md border border-gray-100 cursor-pointer transform hover:scale-[1.02] transition'
                   onclick="openChat('${user.id}')">

                <div class='relative flex-shrink-0'>
                  <div class='w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg'>
                    ${user.name.charAt(0).toUpperCase()}
                  </div>
                  <span class='absolute bottom-0 right-0 w-4 h-4 ${online ? "bg-green-500" : "bg-gray-400"} rounded-full border-2 border-white shadow'></span>
                </div>

                <div class='flex-1 min-w-0'>
                  <div class='flex justify-between items-start mb-1'>
                    <p class='font-bold text-gray-800 text-base md:text-lg truncate'>${user.name}</p>
                    ${unreadCount > 0 ? `<span class='bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold rounded-full px-2.5 py-1 ml-2 flex-shrink-0'>${unreadCount}</span>` : ''}
                  </div>
                  <p class='text-sm ${online ? "text-green-600 font-medium" : "text-gray-500"}'>${online ? "🟢 Online" : "⚫ Offline"}</p>
                  ${lastMsg ? `<p class='text-xs text-gray-500 truncate mt-1'>${lastMsg.fromUserId === currentUser.id ? '✓ You: ' : ''}${lastMsg.type === 'image' ? '📷 Image' : lastMsg.text}</p>` : ''}
                </div>

              </div>`;
            }).join('')}
          </div>
        `}
      </div>
    </div>`;
}

function openChat(userId) {
  currentChatUser = userId;
  navigate('inbox');
}

function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    clearSession();
    navigate('login');
  }
}

// Inbox Page
function inboxPage() {
  if (!currentChatUser) {
    navigate('chats');
    return '';
  }
  
  const currentUser = getCurrentSession();
  const chatUser = getUsers().find(u => u.id === currentChatUser);
  
  if (!chatUser) {
    navigate('chats');
    return '';
  }
  
  const online = isUserOnline(chatUser.id);
  const conversation = getConversation(currentUser.id, chatUser.id);
  
  // Mark messages as read
  markMessagesAsRead(currentUser.id, chatUser.id);
  
  // Start polling for new messages
  startMessagePolling();
  
  return `
    <div class='w-full max-w-5xl mx-auto h-[90vh] md:h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col'>
      <!-- Header -->
      <div class='bg-gradient-to-r from-purple-500 to-blue-500 p-4 md:p-5 flex items-center gap-3 md:gap-4'>
        <button onclick="navigate('chats')" 
                class='w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition flex-shrink-0'>
          ←
        </button>
        
        <div class='relative flex-shrink-0'>
          <div class='w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-lg md:text-xl font-bold'>
            ${chatUser.name.charAt(0).toUpperCase()}
          </div>
          <span data-status-indicator class='absolute bottom-0 right-0 w-3 h-3 md:w-4 md:h-4 ${online ? "bg-green-500" : "bg-gray-400"} rounded-full border-2 border-white shadow'></span>
        </div>
        
        <div class='flex-1 min-w-0'>
          <p class='font-bold text-white text-base md:text-lg truncate'>${chatUser.name}</p>
          <p data-status-text class='text-xs md:text-sm ${online ? "text-green-100" : "text-purple-100"}'>${online ? "🟢 Online now" : "⚫ Offline"}</p>
        </div>
      </div>

      <!-- Chat Body -->
      <div id='chatBody'
           class='flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-gray-50 to-purple-50'>
        <div class='space-y-3 md:space-y-4'>
          ${conversation.length === 0 ? `
            <div class='text-center py-12'>
              <div class='text-5xl mb-4'>💬</div>
              <p class='text-gray-500 font-medium'>No messages yet</p>
              <p class='text-gray-400 text-sm mt-2'>Start the conversation!</p>
            </div>
          ` : conversation.map(msg => {
            const isMine = msg.fromUserId === currentUser.id;
            const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            if (msg.type === 'image') {
              return `
                <div class='flex ${isMine ? "justify-end" : "justify-start"} message-enter'>
                  <div class='${isMine ? "ml-auto" : "mr-auto"} max-w-[80%] md:max-w-[60%]'>
                    <img src="${msg.text}" class='rounded-2xl max-h-64 md:max-h-96 object-cover shadow-lg border-2 ${isMine ? "border-purple-200" : "border-gray-200"}' />
                    <p class='text-xs ${isMine ? "text-right" : ""} text-gray-500 mt-1.5 px-2'>${time}</p>
                  </div>
                </div>
              `;
            }
            
            return `
              <div class='flex ${isMine ? "justify-end" : "justify-start"} message-enter'>
                <div class='${isMine ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white ml-auto" : "bg-white text-gray-800 border border-gray-200"} p-3 md:p-4 rounded-2xl max-w-[80%] md:max-w-[60%] shadow-md'>
                  <p class='break-words text-sm md:text-base'>${msg.text}</p>
                  <p class='text-xs ${isMine ? "text-purple-100" : "text-gray-500"} mt-1'>${time}</p>
                </div>
              </div>
            `;
          }).join('')}
          
          <div id='typingIndicator' class='hidden flex justify-start'>
            <div class='bg-white border border-gray-200 p-4 rounded-2xl shadow-md'>
              <div class='flex gap-1.5'>
                <span class='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style='animation-delay: 0ms'></span>
                <span class='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style='animation-delay: 150ms'></span>
                <span class='w-2 h-2 bg-gray-400 rounded-full animate-bounce' style='animation-delay: 300ms'></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class='p-4 md:p-5 bg-white border-t border-gray-200'>
        <div class='flex items-end gap-2 md:gap-3'>
          <input type='file' id='imageInput' accept='image/*' class='hidden' onchange='handleImageSelect(event)' />
          <button onclick='document.getElementById("imageInput").click()' 
                  class='w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600 rounded-2xl hover:from-gray-200 hover:to-gray-300 flex items-center justify-center text-xl md:text-2xl shadow-sm transition flex-shrink-0'>
            📷
          </button>
          <div class='flex-1 bg-gray-100 rounded-2xl p-1 md:p-1.5'>
            <input id='msgInput' 
                   class='w-full p-2.5 md:p-3 bg-transparent focus:outline-none text-sm md:text-base' 
                   placeholder='Type a message...'
                   oninput='handleTyping()'
                   onkeypress="if(event.key==='Enter') handleSendMessage()" />
          </div>
          <button onclick='handleSendMessage()'
                  class='w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-2xl hover:from-purple-600 hover:to-blue-600 flex items-center justify-center shadow-lg transform hover:scale-105 transition flex-shrink-0 text-xl'>
            ➤
          </button>
        </div>
      </div>
    </div>`;
}

function handleSendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text || !currentChatUser) return;
  
  const currentUser = getCurrentSession();
  sendMessage(currentUser.id, currentChatUser, text);
  
  // Clear typing indicator
  setUserTyping(currentUser.id, currentChatUser, false);
  
  input.value = '';
  updateChatMessages(); // Update only chat messages
  
  // Ensure scroll to bottom after sending
  setTimeout(() => {
    const chatBody = document.getElementById('chatBody');
    if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
  }, 150);
}

let typingTimeout = null;

function handleTyping() {
  if (!currentChatUser) return;
  
  const currentUser = getCurrentSession();
  const input = document.getElementById('msgInput');
  
  if (input.value.trim().length > 0) {
    setUserTyping(currentUser.id, currentChatUser, true);
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Stop typing indicator after 2 seconds of no input
    typingTimeout = setTimeout(() => {
      setUserTyping(currentUser.id, currentChatUser, false);
    }, 2000);
  } else {
    setUserTyping(currentUser.id, currentChatUser, false);
  }
}

function handleImageSelect(event) {
  const file = event.target.files[0];
  if (!file || !currentChatUser) return;
  
  // Check file size (limit to 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('Image size should be less than 5MB');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const currentUser = getCurrentSession();
    sendImageMessage(currentUser.id, currentChatUser, e.target.result);
    updateChatMessages();
    
    // Ensure scroll to bottom after sending image
    setTimeout(() => {
      const chatBody = document.getElementById('chatBody');
      if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
    }, 150);
  };
  
  reader.readAsDataURL(file);
  
  // Reset input
  event.target.value = '';
}

function startMessagePolling() {
  // Clear existing interval
  if (messageCheckInterval) {
    clearInterval(messageCheckInterval);
  }
  
  let lastMessageCount = 0;
  
  // Check for new messages every 1 second
  messageCheckInterval = setInterval(() => {
    const currentPage = window.location.hash.replace('#', '');
    if (currentPage === 'inbox' && currentChatUser) {
      const currentUser = getCurrentSession();
      const conversation = getConversation(currentUser.id, currentChatUser);
      
      // Only update if there are new messages
      if (conversation.length !== lastMessageCount) {
        lastMessageCount = conversation.length;
        updateChatMessages();
      }
      
      // Update online status
      updateOnlineStatus();
      
      // Update typing indicator
      updateTypingIndicator();
    }
  }, 1000);
  
  // Initialize count
  if (currentChatUser) {
    const currentUser = getCurrentSession();
    const conversation = getConversation(currentUser.id, currentChatUser);
    lastMessageCount = conversation.length;
  }
}

// Profile Page
function profilePage() {
  const currentUser = getCurrentSession();
  const allUsers = getUsers();
  const onlineCount = getOnlineUsers().length;
  const totalMessages = getMessages().filter(m => 
    m.fromUserId === currentUser.id || m.toUserId === currentUser.id
  ).length;
  
  return `
    <div class='w-full max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden'>
      <!-- Header -->
      <div class='bg-gradient-to-r from-purple-500 to-blue-500 p-6 md:p-8 relative'>
        <button onclick="navigate('chats')" 
                class='absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white backdrop-blur transition'>
          ✕
        </button>
        <h1 class='text-2xl md:text-3xl font-bold text-white mb-2'>My Profile</h1>
        <p class='text-purple-100 text-sm'>Manage your account</p>
      </div>

      <div class='p-6 md:p-8 space-y-6'>
        <!-- Avatar -->
        <div class='flex justify-center'>
          <div class='relative'>
            <div class='w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white text-6xl md:text-7xl font-bold shadow-2xl'>
              ${currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div class='absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-lg'></div>
          </div>
        </div>

        <!-- User Info -->
        <div class='text-center'>
          <h2 class='text-2xl md:text-3xl font-bold text-gray-800 mb-1'>${currentUser.name.toUpperCase()}</h2>
          <p class='text-sm text-gray-500'>ID: ${currentUser.id.slice(0, 8)}...</p>
        </div>

        <!-- Stats -->
        <div class='grid grid-cols-3 gap-3 md:gap-4'>
          <div class='bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 p-4 rounded-2xl text-center'>
            <div class='text-2xl md:text-3xl font-bold text-purple-600'>${allUsers.length}</div>
            <div class='text-xs md:text-sm text-purple-600 mt-1'>Users</div>
          </div>
          <div class='bg-gradient-to-br from-green-50 to-green-100 border border-green-200 p-4 rounded-2xl text-center'>
            <div class='text-2xl md:text-3xl font-bold text-green-600'>${onlineCount}</div>
            <div class='text-xs md:text-sm text-green-600 mt-1'>Online</div>
          </div>
          <div class='bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 p-4 rounded-2xl text-center'>
            <div class='text-2xl md:text-3xl font-bold text-blue-600'>${totalMessages}</div>
            <div class='text-xs md:text-sm text-blue-600 mt-1'>Messages</div>
          </div>
        </div>

        <!-- Details -->
        <div class='bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl text-white p-5 md:p-6 space-y-4 shadow-xl'>
          <div class='flex items-center gap-3'>
            <div class='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur'>✉️</div>
            <div class='flex-1 min-w-0'>
              <p class='text-xs text-purple-100'>Email</p>
              <p class='font-medium truncate'>${currentUser.email}</p>
            </div>
          </div>
          <div class='flex items-center gap-3'>
            <div class='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur'>📅</div>
            <div>
              <p class='text-xs text-purple-100'>Member Since</p>
              <p class='font-medium'>${new Date(currentUser.joinedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>
        </div>

        <!-- Logout Button -->
        <button onclick="handleLogout()" 
                class='w-full bg-gradient-to-r from-red-500 to-pink-500 text-white py-4 rounded-2xl hover:from-red-600 hover:to-pink-600 font-semibold shadow-lg transform hover:scale-[1.02] transition flex items-center justify-center gap-2'>
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>`;
}

// Helper function to update only chat messages without re-rendering entire page
function updateChatMessages() {
  if (!currentChatUser) return;
  
  const currentUser = getCurrentSession();
  const chatUser = getUsers().find(u => u.id === currentChatUser);
  if (!chatUser) return;
  
  const conversation = getConversation(currentUser.id, chatUser.id);
  const chatBody = document.getElementById('chatBody');
  if (!chatBody) return;
  
  const wasAtBottom = chatBody.scrollHeight - chatBody.scrollTop <= chatBody.clientHeight + 150;
  
  // Mark messages as read
  markMessagesAsRead(currentUser.id, chatUser.id);
  
  chatBody.innerHTML = conversation.length === 0 ? `
    <p class='text-gray-500 text-center py-8'>No messages yet. Start the conversation!</p>
  ` : conversation.map(msg => {
    const isMine = msg.fromUserId === currentUser.id;
    const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    if (msg.type === 'image') {
      return `
        <div class='${isMine ? "flex justify-end" : ""}'>
          <div class='${isMine ? "ml-auto" : ""} max-w-[80%]'>
            <img src="${msg.text}" class='rounded-xl max-h-64 object-cover shadow' />
            <p class='text-xs ${isMine ? "text-right" : ""} text-gray-500 mt-1'>${time}</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class='${isMine ? "flex justify-end" : ""}'>
        <div class='${isMine ? "bg-purple-400 text-white ml-auto" : "bg-gray-100"} p-3 rounded-xl max-w-[80%]'>
          <p>${msg.text}</p>
          <p class='text-xs ${isMine ? "text-purple-100" : "text-gray-500"} mt-1'>${time}</p>
        </div>
      </div>
    `;
  }).join('');
  
  // Always scroll to bottom to show new messages
  setTimeout(() => {
    chatBody.scrollTop = chatBody.scrollHeight;
  }, 100);
}

// Helper function to update online status indicator
function updateOnlineStatus() {
  if (!currentChatUser) return;
  
  const chatUser = getUsers().find(u => u.id === currentChatUser);
  if (!chatUser) return;
  
  const online = isUserOnline(chatUser.id);
  const statusElements = document.querySelectorAll('[data-status-indicator]');
  
  statusElements.forEach(el => {
    if (online) {
      el.classList.remove('bg-gray-400');
      el.classList.add('bg-green-500');
    } else {
      el.classList.remove('bg-green-500');
      el.classList.add('bg-gray-400');
    }
  });
  
  const statusText = document.querySelector('[data-status-text]');
  if (statusText) {
    statusText.textContent = online ? "🟢 Online now" : "⚫ Offline";
    statusText.className = `${online ? "text-green-600" : "text-gray-600"} text-sm`;
  }
}

// Helper function to update typing indicator
function updateTypingIndicator() {
  if (!currentChatUser) return;
  
  const currentUser = getCurrentSession();
  const isTyping = isUserTypingToMe(currentChatUser, currentUser.id);
  const typingIndicator = document.getElementById('typingIndicator');
  
  if (typingIndicator) {
    if (isTyping) {
      typingIndicator.classList.remove('hidden');
      // Auto scroll to show typing indicator
      const chatBody = document.getElementById('chatBody');
      if (chatBody) {
        setTimeout(() => {
          chatBody.scrollTop = chatBody.scrollHeight;
        }, 100);
      }
    } else {
      typingIndicator.classList.add('hidden');
    }
  }
}

// ==================== EVENT LISTENERS ====================

// Listen for storage events (cross-tab communication)
window.addEventListener('storage', (e) => {
  if (e.key === 'lastUpdate') {
    const currentPage = window.location.hash.replace('#', '');
    const update = JSON.parse(e.newValue);
    
    if (update.type === 'new_message') {
      if (currentPage === 'chats') {
        render();
      } else if (currentPage === 'inbox') {
        updateChatMessages();
        // Ensure scroll happens in inactive tabs too
        setTimeout(() => {
          const chatBody = document.getElementById('chatBody');
          if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
        }, 150);
      }
    }
    
    if (update.type === 'online_status' && (currentPage === 'chats' || currentPage === 'inbox')) {
      render();
    }
    
    if (update.type === 'typing_status' && currentPage === 'inbox') {
      updateTypingIndicator();
    }
  }
});

// Handle page visibility (to update online status)
document.addEventListener('visibilitychange', () => {
  const currentUser = getCurrentSession();
  if (currentUser) {
    if (document.hidden) {
      setUserOffline(currentUser.id);
    } else {
      setUserOnline(currentUser.id);
    }
  }
});

// Handle tab close
window.addEventListener('beforeunload', () => {
  if (currentUser) {
    setUserOffline(currentUser.id);
  }
  if (messageCheckInterval) {
    clearInterval(messageCheckInterval);
  }
});

// Initialize
initStorage();
currentUser = getCurrentSession();
if (currentUser) {
  setUserOnline(currentUser.id);
}

window.addEventListener('hashchange', render);
render();
