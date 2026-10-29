// ===== 1. MEMORY & CONVERSATION STORAGE SETUP =====
let MEMORY = [];
try {
  const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(storedMemory)) {
    MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && !(m.role === 'model' && /^(?:Your strong password:|ఇదిగో strong password:)/i.test(m.text)));
    if (MEMORY.length !== storedMemory.length) localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  } else {
    localStorage.removeItem('jarvis_memory');
  }
} catch (e) {
  localStorage.removeItem('jarvis_memory');
}

const chat = document.getElementById('chat');
const conversationStage = document.getElementById('conversation-stage');
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');
const thinkingStatus = document.getElementById('thinking-status');
const thinkingLabel = document.getElementById('thinking-label');

const HISTORY_KEY = 'jarvis_conversation_history_v1';
const ACTIVE_CONVERSATION_KEY = 'jarvis_active_conversation_v1';
let CONVERSATIONS = [];

try {
  const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  if (Array.isArray(stored)) {
    CONVERSATIONS = stored.filter(c => c && typeof c.id === 'string' && Array.isArray(c.messages)).map(c => ({
      ...c,
      messages: c.messages.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string')
    }));
  }
} catch (e) {
  localStorage.removeItem(HISTORY_KEY);
}

function makeConversationId() {
  return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function conversationTitle(messages) {
  const first = (messages || []).find(m => m && m.role === 'user' && typeof m.text === 'string');
  return first ? (first.text.replace(/\s+/g, ' ').trim().slice(0, 42) || 'New chat') : 'New chat';
}

let ACTIVE_CONVERSATION_ID = localStorage.getItem(ACTIVE_CONVERSATION_KEY) || '';
let initialConversation = CONVERSATIONS.find(c => c.id === ACTIVE_CONVERSATION_ID);
if (!initialConversation) {
  initialConversation = {
    id: makeConversationId(),
    title: conversationTitle(MEMORY),
    updatedAt: Date.now(),
    messages: MEMORY.slice(-120)
  };
  CONVERSATIONS.unshift(initialConversation);
  ACTIVE_CONVERSATION_ID = initialConversation.id;
} else {
  MEMORY = initialConversation.messages.length ? initialConversation.messages.slice(-120) : MEMORY.slice(-120);
  initialConversation.messages = MEMORY.slice(-120);
  initialConversation.title = conversationTitle(MEMORY) || initialConversation.title || 'New chat';
}
localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
localStorage.setItem(ACTIVE_CONVERSATION_KEY, ACTIVE_CONVERSATION_ID);

function currentConversation() {
  return CONVERSATIONS.find(c => c.id === ACTIVE_CONVERSATION_ID);
}

function saveMemory() {
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  const current = currentConversation();
  if (current) {
    current.messages = MEMORY.slice(-120);
    current.updatedAt = Date.now();
    current.title = conversationTitle(current.messages) || current.title || 'New chat';
    CONVERSATIONS.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    CONVERSATIONS = CONVERSATIONS.slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(CONVERSATIONS));
    localStorage.setItem(ACTIVE_CONVERSATION_KEY, ACTIVE_CONVERSATION_ID);
    renderHistoryList();
  }
}

function renderHistoryList() {
  if (!historyList) return;
  const visible = CONVERSATIONS.filter(c => c.messages && c.messages.length).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (historyCount) historyCount.textContent = visible.length ? String(visible.length) : '';
  historyList.replaceChildren();
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'Your conversations will appear here';
    historyList.appendChild(empty);
    return;
  }

  visible.forEach(item => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'history-item';
    button.dataset.conversationId = item.id;
    button.setAttribute('aria-current', String(item.id === ACTIVE_CONVERSATION_ID));

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5zM5 5.5v15M9 7h6M9 10h7');
    icon.appendChild(path);

    const label = document.createElement('span');
    label.className = 'history-item-label';
    label.textContent = item.title || conversationTitle(item.messages);

    button.append(icon, label);
    button.addEventListener('click', () => switchConversation(item.id));
    historyList.appendChild(button);
  });
}

function setThinking(active, message) {
  const on = Boolean(active);
  if (on && thinkingLabel) thinkingLabel.textContent = message || 'J.A.R.V.I.S is thinking';
  document.body.classList.toggle('is-thinking', on);
  if (thinkingStatus) thinkingStatus.hidden = !on;
}

function scrollConversationToBottom() {
  if (!chat) return;
  const scroll = () => { chat.scrollTop = chat.scrollHeight; };
  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(scroll);
  else setTimeout(scroll, 16);
}

function closeSidebarOnMobile() {
  if (window.matchMedia('(max-width: 780px)').matches) {
    document.body.classList.remove('sidebar-open');
  }
}

function switchConversation(id) {
  if (id === ACTIVE_CONVERSATION_ID) {
    closeSidebarOnMobile();
    return;
  }
  const next = CONVERSATIONS.find(c => c.id === id);
  if (!next) return;
  const current = currentConversation();
  if (current) {
    current.messages = MEMORY.slice(-120);
    current.updatedAt = Date.now();
  }
  ACTIVE_CONVERSATION_ID = id;
  MEMORY = next.messages.slice(-120);
  localStorage.setItem(ACTIVE_CONVERSATION_KEY, id);
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  chat.replaceChildren();
  renderHistoryList();
  scrollConversationToBottom();
  closeSidebarOnMobile();
}

renderHistoryList();

// ===== 2. ADVANCED TOOLS & APP LAUNCHER INTEGRATION =====
async function fetchToolJson(url, options = {}, timeoutMs = 10000) {
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, { ...options, ...(controller ? { signal: controller.signal } : {}) });
    if (!response.ok) throw new Error('Request failed (' + response.status + ').');
    return await response.json();
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function handleTools(text) {
  const t = text.toLowerCase();

  // WhatsApp Intent & Web Fallback
  if (t.includes('whatsapp') || t.includes('వాట్సాప్')) {
    window.location.href = 'whatsapp://';
    setTimeout(() => { window.open('https://wa.me/', '_blank'); }, 1000);
    return 'Opening WhatsApp for you, Sir.';
  }

  // YouTube / Music Search & Playback Automation
  if (t.includes('play') || t.includes('youtube') || t.includes('పాట') || t.includes('ట్యూబ్')) {
    const query = text.replace(/play|youtube|jarvis|పాట|పెట్టు|చూపించు/gi, '').trim();
    const searchUrl = query ? 'https://www.youtube.com/results?search_query=' + encodeURIComponent(query) : 'https://youtube.com';
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
    return query ? 'Playing "' + query + '" on YouTube right away, Sir.' : 'Opening YouTube, Sir.';
  }

  // Google Search / General Web Queries
  if (t.includes('search') || t.includes('google') || t.includes('వెతుకు') || t.includes('తెలుసుకో')) {
    const query = text.replace(/search|google|jarvis|వెతుకు|తెలుసుకో/gi, '').trim();
    if (query) {
      window.open('https://www.google.com/search?q=' + encodeURIComponent(query), '_blank', 'noopener,noreferrer');
      return 'Searching Google for "' + query + '", Sir.';
    }
    window.open('https://google.com', '_blank', 'noopener,noreferrer');
    return 'Opening Google, Sir.';
  }

  // Camera & Image Capture Tool
  if (t.includes('camera') || t.includes('photo') || t.includes('కెమెరా') || t.includes('ఫోటో')) {
    const imgInput = document.getElementById('img-input');
    if (imgInput) imgInput.click();
    return 'Opening camera visual capture module, Sir.';
  }

  // Phone Call Dialer
  if (t.includes('call') || t.includes('కాల్')) {
    window.location.href = 'tel:';
    return 'Launching mobile dialer, Sir.';
  }

  // Local Time & Date
  if (/\b(?:what time(?: is it)?|what is the time|current time|tell me the time|time now)\b/.test(t) || /^\s*time(?:\s+please)?[.!?]*\s*$/.test(t) || t.includes('టైమ్') || t.includes('సమయం')) {
    return 'The current time is ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }) + ' IST, Sir.';
  }

  // Weather Forecasting
  if (t.includes('weather') || t.includes('వాతావరణం')) {
    if (!navigator.geolocation) return 'Location permission is required to analyze weather, Sir.';
    return await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + position.coords.latitude + '&longitude=' + position.coords.longitude + '&current_weather=true';
          const data = await fetchToolJson(url);
          const temperature = Number(data?.current_weather?.temperature);
          if (!Number.isFinite(temperature)) throw new Error('Weather data unavailable.');
          resolve('The current temperature is ' + temperature + '°C, Sir.');
        } catch (e) {
          resolve('Unable to connect to the meteorological service right now, Sir.');
        }
      }, () => resolve('Location access was denied, Sir.'), { timeout: 10000, maximumAge: 300000 });
    });
  }

  // Quick Jokes
  if (/\bjoke\b/.test(t) || t.includes('జోక్')) {
    try {
      const data = await fetchToolJson('https://official-joke-api.appspot.com/random_joke');
      return data.setup + ' ... ' + data.punchline;
    } catch (e) {
      return 'Why do programmers prefer dark mode? Because light attracts bugs, Sir.';
    }
  }

  return null;
}

// ===== 3. GEMINI INTELLIGENCE DIRECTIVES & CLIENT SETUP =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

const GEMINI_MODEL = 'gemini-1.5-flash';

// Full AI Persona and AGI Directive
const GEMINI_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S, an authentic, adaptive, and highly capable personal AGI companion built for Sir.
Core Directives:
1. Role & Demeanor: Act as a sharp, trusted right-hand partner. Balance technical competence with a grounded, supportive personality and subtle wit. Always address the user respectfully as 'Sir'.
2. Language: Naturally communicate in an intuitive blend of English and Telugu (conversational Telugu-English mix).
3. Direct Answers: Start immediately with substantive value. Avoid fluff, unnecessary disclaimers, robotic prefaces, or repeating yourself.
4. Execution Focus: Deliver accurate analysis, problem-solving, code solutions, and device commands with speed and precision.
5. Continuity: Retain full context of ongoing goals, conversation threads, and preferences across the session.`;

async function requestGeminiInteraction(inputMessage) {
  if (!API_KEY) throw new Error('Gemini API key is missing. Reload and enter the key.');

  // Check built-in tool actions first
  const toolResult = await handleTools(inputMessage);
  if (toolResult) {
    MEMORY.push({ role: 'user', text: inputMessage });
    MEMORY.push({ role: 'model', text: toolResult });
    saveMemory();
    return toolResult;
  }

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  MEMORY.push({ role: 'user', text: inputMessage });
  saveMemory();

  // Model context assembly
  const contents = [
    { role: 'user', parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }] },
    { role: 'model', parts: [{ text: "Understood, Sir. J.A.R.V.I.S systems are operational and fully aligned with your instructions." }] },
    ...MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: contents,
  });

  const reply = response?.text;
  if (!reply) throw new Error('Received an empty response from the core network.');

  const trimmedReply = reply.trim();
  MEMORY.push({ role: 'model', text: trimmedReply });
  saveMemory();

  return trimmedReply;
}

window.requestGeminiInteraction = requestGeminiInteraction;

// ===== 4. UI INTERFACE & "HEY JARVIS" WAKE ENGINE =====
document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.getElementById('send') || document.querySelector('.send-button');
  const inputField = document.getElementById('msg');
  const chatContainer = document.getElementById('chat');
  const wakeButton = document.getElementById('wake-btn');
  const wakeStatus = document.getElementById('wake-status');

  // Render previous chat messages
  if (chatContainer && MEMORY.length > 0) {
    chatContainer.replaceChildren();
    MEMORY.forEach(m => {
      const msgDiv = document.createElement('div');
      msgDiv.className = m.role === 'user' ? 'message user-message' : 'message ai-message';
      msgDiv.textContent = (m.role === 'user' ? 'YOU: ' : 'J.A.R.V.I.S: ') + m.text;
      chatContainer.appendChild(msgDiv);
    });
    scrollConversationToBottom();
  }

  if (sendButton && inputField) {
    const handleSend = async () => {
      const text = inputField.value.trim();
      if (!text) return;
      inputField.value = '';

      if (chatContainer) {
        const userDiv = document.createElement('div');
        userDiv.className = 'message user-message';
        userDiv.textContent = 'YOU: ' + text;
        chatContainer.appendChild(userDiv);
        scrollConversationToBottom();
      }
      
      try {
        setThinking(true, 'J.A.R.V.I.S is thinking...');
        const reply = await requestGeminiInteraction(text);
        setThinking(false);

        if (chatContainer) {
          const aiDiv = document.createElement('div');
          aiDiv.className = 'message ai-message';
          aiDiv.textContent = 'J.A.R.V.I.S: ' + reply;
          chatContainer.appendChild(aiDiv);
          scrollConversationToBottom();
        }

        // Voice output response
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(reply);
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      } catch (err) {
        setThinking(false);
        console.error('Error:', err.message);
        alert('Error: ' + err.message);
      }
    };

    sendButton.addEventListener('click', handleSend);
    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSend();
      }
    });
  }

  // Wake Word Engine ("Hey Jarvis" / "Jarvis")
  let recognition = null;
  let isListeningForWakeWord = false;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition && wakeButton) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      console.log('Voice Stream:', transcript);

      if (transcript.includes('jarvis') || transcript.includes('hey jarvis')) {
        if (wakeStatus) wakeStatus.textContent = 'WAKE: LISTENING...';
        if ('speechSynthesis' in window) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Yes Sir?"));
        }
        
        const userCommand = prompt("J.A.R.V.I.S is ready, Sir. State your directive:");
        if (userCommand && inputField) {
          inputField.value = userCommand;
          sendButton.click();
        }
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech Recognition Error:", e.error);
    };

    recognition.onend = () => {
      if (isListeningForWakeWord) {
        try { recognition.start(); } catch (err) {}
      }
    };

    wakeButton.addEventListener('click', () => {
      isListeningForWakeWord = !isListeningForWakeWord;
      if (isListeningForWakeWord) {
        try {
          recognition.start();
          wakeButton.style.color = '#00ffff';
          if (wakeStatus) wakeStatus.textContent = 'WAKE: ON';
        } catch (err) {
          console.error(err);
        }
      } else {
        recognition.stop();
        wakeButton.style.color = '';
        if (wakeStatus) wakeStatus.textContent = 'WAKE: OFF';
      }
    });
  }
});

