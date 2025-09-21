(function () {
  const usernameForm = document.getElementById('username-form');
  const usernameInput = document.getElementById('username-input');
  const usernameError = document.getElementById('username-error');
  const modal = document.getElementById('username-modal');
  const messages = document.getElementById('messages');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const sendButton = messageForm.querySelector('button');
  const status = document.getElementById('status');
  const userList = document.getElementById('user-list');
  const toast = document.getElementById('toast');

  const requiredConfigKeys = [
    'apiKey',
    'authDomain',
    'databaseURL',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  let firebaseApp;
  let database;
  let messagesRef;
  let presenceRef;
  let currentUser = null;
  let currentUserRef = null;
  let joined = false;

  function showToast(message, duration = 4000) {
    if (!toast) {
      return;
    }

    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      toast.textContent = '';
    }, duration);
  }

  function appendMessage(content, type = 'message') {
    const container = document.createElement('div');
    container.className = `message message-${type}`;
    container.innerHTML = content;
    messages.appendChild(container);
    messages.scrollTop = messages.scrollHeight;
  }

  function formatTimestamp(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  }

  function handleFatalError(message) {
    usernameError.textContent = message;
    usernameInput.disabled = true;
    messageInput.disabled = true;
    sendButton.disabled = true;
    showToast(message, 8000);
  }

  function validateConfig(config) {
    if (!config) {
      throw new Error(
        'Firebase configuration not found. Copy config.example.js to config.js and provide your Firebase project keys.'
      );
    }

    const missing = requiredConfigKeys.filter((key) => !config[key]);
    if (missing.length) {
      throw new Error(
        `The following Firebase config keys are missing: ${missing.join(', ')}.`
      );
    }
    return config;
  }

  function sanitizeUsername(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function enforceJoinState(isJoined) {
    joined = isJoined;
    messageInput.disabled = !isJoined;
    sendButton.disabled = !isJoined;
    if (isJoined) {
      modal.classList.add('hidden');
      messageInput.focus();
    }
  }

  function subscribeToMessages() {
    messagesRef.limitToLast(100).on(
      'child_added',
      (snapshot) => {
        const payload = snapshot.val();
        if (!payload) {
          return;
        }

        if (payload.type === 'status') {
          appendMessage(
            `<em>${payload.text}</em> <span class="timestamp">${formatTimestamp(
              payload.createdAt
            )}</span>`,
            'status'
          );
          return;
        }

        appendMessage(
          `<strong>${payload.username}:</strong> ${payload.text} <span class="timestamp">${formatTimestamp(
            payload.createdAt
          )}</span>`
        );
      },
      (error) => {
        console.error(error);
        handleFatalError('Не удалось получить историю сообщений. Проверьте настройки Firebase.');
      }
    );
  }

  function subscribeToPresence() {
    presenceRef.on(
      'value',
      (snapshot) => {
        const users = [];
        snapshot.forEach((child) => {
          const data = child.val();
          if (data && data.username) {
            users.push(data.username);
          }
        });
        users.sort((a, b) => a.localeCompare(b));
        userList.innerHTML = '';
        users.forEach((user) => {
          const li = document.createElement('li');
          li.textContent = user;
          userList.appendChild(li);
        });
      },
      (error) => {
        console.error(error);
        handleFatalError('Не удалось получить список пользователей. Проверьте правила доступа Firebase.');
      }
    );

    presenceRef.on('child_added', (snapshot) => {
      const data = snapshot.val();
      if (!joined || !data || !data.username || data.username === currentUser) {
        return;
      }
      status.textContent = `${data.username} joined the chat`;
      setTimeout(() => {
        status.textContent = '';
      }, 4000);
    });

    presenceRef.on('child_removed', (snapshot) => {
      const data = snapshot.val();
      if (!data || !data.username) {
        return;
      }
      appendMessage(`<em>${data.username} left the chat.</em>`, 'status');
      if (joined) {
        status.textContent = `${data.username} left the chat`;
        setTimeout(() => {
          status.textContent = '';
        }, 4000);
      }
    });
  }

  async function joinChat(username) {
    const normalized = sanitizeUsername(username);
    if (!normalized) {
      usernameError.textContent = 'Введите имя пользователя.';
      return;
    }
    if (normalized.length < 3) {
      usernameError.textContent = 'Имя должно содержать минимум 3 символа.';
      return;
    }

    usernameError.textContent = '';
    usernameInput.disabled = true;

    try {
      const snapshot = await presenceRef
        .orderByChild('usernameLower')
        .equalTo(normalized.toLowerCase())
        .once('value');

      if (snapshot.exists()) {
        usernameError.textContent = 'Такое имя уже занято. Попробуйте другое.';
        usernameInput.disabled = false;
        usernameInput.focus();
        return;
      }

      currentUser = normalized;
      currentUserRef = presenceRef.push({
        username: normalized,
        usernameLower: normalized.toLowerCase(),
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      });
      currentUserRef.onDisconnect().remove();

      await messagesRef.push({
        type: 'status',
        text: `${normalized} joined the chat`,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      });

      enforceJoinState(true);
      showToast(`Вы вошли как ${normalized}`);
    } catch (error) {
      console.error(error);
      usernameError.textContent = 'Не удалось подключиться. Попробуйте снова.';
      usernameInput.disabled = false;
      usernameInput.focus();
    }
  }

  function sendMessage(event) {
    event.preventDefault();
    if (!joined) {
      appendMessage('<span class="error">Присоединитесь к чату, чтобы писать сообщения.</span>', 'error');
      return;
    }

    const text = messageInput.value.trim();
    if (!text) {
      return;
    }

    messagesRef
      .push({
        type: 'message',
        username: currentUser,
        text,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      })
      .then(() => {
        messageInput.value = '';
      })
      .catch((error) => {
        console.error(error);
        appendMessage('<span class="error">Не удалось отправить сообщение.</span>', 'error');
      });
  }

  function initFirebase() {
    try {
      const config = validateConfig(window.firebaseConfig);
      firebaseApp = firebase.initializeApp(config);
      database = firebaseApp.database();
      messagesRef = database.ref('messages');
      presenceRef = database.ref('presence');
    } catch (error) {
      console.error(error);
      handleFatalError(error.message);
      return false;
    }
    return true;
  }

  function init() {
    if (!initFirebase()) {
      return;
    }

    subscribeToMessages();
    subscribeToPresence();

    usernameForm.addEventListener('submit', (event) => {
      event.preventDefault();
      joinChat(usernameInput.value);
    });

    messageForm.addEventListener('submit', sendMessage);

    window.addEventListener('beforeunload', () => {
      if (currentUserRef) {
        currentUserRef.remove();
      }
    });
  }

  init();
})();
