const app = document.getElementById('app');

// Random profile picture generator
function randomPic(size = 80) {
  return `https://picsum.photos/${size}?random=${Math.random()}`;
}

function navigate(page) {
  window.location.hash = page;
  render();
}

function render() {
  const page = window.location.hash.replace('#', '') || 'login';

  if (page === 'login') app.innerHTML = loginPage();
  if (page === 'chats') app.innerHTML = chatListPage();
  if (page === 'inbox') app.innerHTML = inboxPage();
  if (page === 'profile') app.innerHTML = profilePage();
}

// Login Page
function loginPage() {
  return `
    <div class='space-y-6'>
      <h1 class='text-4xl font-bold'>Talkie</h1>

      <input class='w-full p-3 border rounded-xl' placeholder='Email'>

      <button class='w-full bg-purple-500 text-white py-3 rounded-xl'
              onclick="navigate('chats')">Connect</button>

      <div class='flex items-center gap-3'>
        <div class='h-px bg-gray-400 flex-1'></div>Or
        <div class='h-px bg-gray-400 flex-1'></div>
      </div>

      <button class='w-full border py-3 rounded-xl bg-white'>Sign in with Instagram</button>
      <button class='w-full border py-3 rounded-xl bg-white'>Sign in with Facebook</button>
    </div>`;
}

// Chat List Page
function chatListPage() {
  const users = [
    "Emon Hossain",
    "Anika Islam",
    "Tahsin Ahmed",
    "Ayesha Akter",
    "Suraiya Islam Shanta"
  ];

  return `
    <div class='space-y-6'>
      <div class='flex justify-between items-center'>
        <h1 class='text-3xl font-bold'>Chats</h1>
        <button onclick="navigate('profile')" class='text-purple-700 text-xl'>👤</button>
      </div>

      <input class='w-full p-3 border rounded-xl' placeholder='Search by chats'>

      <div class='space-y-4'>
        ${users.map(name => `
          <div class='flex items-center gap-3 p-3 bg-white rounded-xl shadow cursor-pointer'
               onclick="navigate('inbox')">

            <img src="${randomPic(60)}" class='w-12 h-12 rounded-full object-cover' />

            <div>
              <p class='font-bold'>${name}</p>
              <p class='text-sm text-gray-600'>Yeah, ikr</p>
            </div>

          </div>
        `).join('')}
      </div>
    </div>`;
}

// Inbox Page
function inboxPage() {
  return `
    <div class='space-y-5'>
      <button onclick="navigate('chats')" class='text-purple-700 text-xl'>⬅</button>

      <div id='chatBody'
           class='bg-white p-4 rounded-xl space-y-4 shadow'
           style='height:70vh;overflow-y:auto;'>

        <p class='bg-gray-100 p-3 rounded-xl w-fit'>
          Hey! It's morning here in Tokyo 🙂
        </p>

        <p class='bg-purple-300 p-3 rounded-xl text-white ml-auto w-fit'>
          Send me some pictures
        </p>
      </div>

      <div class='flex items-center gap-2'>
        <input id='msgInput' class='flex-1 p-3 border rounded-xl' placeholder='Message'>
        <button onclick='sendMessage()'
                class='w-12 h-12 bg-purple-500 text-white rounded-full text-2xl'>＋</button>
      </div>
    </div>`;
}

// Send message inside inbox
function sendMessage() {
  const input = document.getElementById('msgInput');
  const text = input.value.trim();
  if (!text) return;

  const chatBody = document.getElementById('chatBody');
  const bubble = document.createElement('p');

  bubble.className = 'bg-purple-300 p-3 rounded-xl text-white ml-auto w-fit';
  bubble.textContent = text;

  chatBody.appendChild(bubble);
  chatBody.scrollTop = chatBody.scrollHeight;
  input.value = '';
}

// Profile Page
function profilePage() {
  return `
    <div class='space-y-8'>
      <div class='flex items-center justify-between'>
        <h1 class='text-3xl font-bold'>My Profile</h1>
        <button onclick="navigate('chats')" class='text-purple-700 text-xl'>⬅</button>
      </div>

      <div class='flex justify-center'>
        <img src="${randomPic(200)}" class='w-40 h-40 rounded-2xl object-cover' />
      </div>

      <h2 class='text-center text-2xl font-bold'>ANIKA ISLAM</h2>
      <p class='text-center text-gray-700'>H97DPSZB</p>

      <div class='p-6 bg-purple-400 rounded-2xl text-white space-y-4'>
        <p>👤 @anikaa.islam10</p>
        <p>✉ anika12511035.cse@gmail.com</p>
        <p>👥 People</p>
      </div>
    </div>`;
}

window.addEventListener('hashchange', render);
render();
