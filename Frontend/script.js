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
  }
}

function scrollConversationToBottom() {
  const chatContainer = document.getElementById('chat');
  if (!chatContainer) return;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}


// ===== 2. ADVANCED DEVICE CONTROL & TOOLS ENGINE =====
let torchStream = null;

async function toggleTorch(turnOn) {
  try {
    if (turnOn) {
      torchStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      const track = torchStream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: true }] });
      return 'Flashlight turned ON, Sir.';
    } else {
      if (torchStream) {
        torchStream.getTracks().forEach(track => track.stop());
        torchStream = null;
      }
      return 'Flashlight turned OFF, Sir.';
    }
  } catch (e) {
    return 'Flashlight control requires camera permission or HTTPS, Sir.';
  }
}

async function handleTools(text) {
  const t = text.toLowerCase().trim();

  if (t.includes('battery') || t.includes('charge') || t.includes('బ్యాటరీ') || t.includes('ఛార్జింగ్')) {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      const level = Math.round(battery.level * 100);
      const charging = battery.charging ? 'charging' : 'not charging';
      return `Your device battery is at ${level}% and currently ${charging}, Sir.`;
    }
    return 'Battery API is not supported on this browser, Sir.';
  }

  if (t.includes('flashlight') || t.includes('torch') || t.includes('టార్చ్') || t.includes('లైట్')) {
    if (t.includes('off') || t.includes('ఆఫ్') || t.includes('బంద్')) {
      return await toggleTorch(false);
    }
    return await toggleTorch(true);
  }

  if (t.includes('vibrate') || t.includes('వైబ్రేట్')) {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
      return 'Device vibrated, Sir.';
    }
    return 'Vibration not supported on this device, Sir.';
  }

  if (t.includes('wifi') || t.includes('wi-fi') || t.includes('వైఫై')) {
    window.location.href = 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end';
    return 'Opening Wi-Fi settings, Sir.';
  }

  if (t.includes('bluetooth') || t.includes('బ్లూటూత్')) {
    window.location.href = 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end';
    return 'Opening Bluetooth settings, Sir.';
  }

  const openAppMatch = t.match(/(?:open|launch|start|ఓపెన్)\s+([a-zA-Z0-9_\s]+)/i);
  if (openAppMatch) {
    const rawAppName = openAppMatch[1].replace(/app|యాప్|ప్లీజ్|చేయి/gi, '').trim().toLowerCase();
    if (rawAppName === 'youtube') {
      window.location.href = 'vnd.youtube:';
      return 'Opening YouTube app, Sir.';
    }
    window.location.href = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.${rawAppName};end`;
    return `Attempting to open ${rawAppName}, Sir.`;
  }

  if (t.includes('play') || t.includes('పాట')) {
    const query = text.replace(/play|on youtube|youtube|jarvis|పాట|పెట్టు/gi, '').trim();
    if (query) {
      window.location.href = `vnd.youtube://results?search_query=${encodeURIComponent(query)}`;
      return `Searching "${query}" on YouTube app, Sir.`;
    }
  }

  if (/\b(?:what time|current time|time now)\b/.test(t) || t.includes('టైమ్') || t.includes('సమయం')) {
    return 'The time is ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }) + ' IST, Sir.';
  }

  return null;
}


// ===== 3. GEMINI SETUP & 404 FIXED MODEL =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

const GEMINI_MODEL = 'gemini-3.5-flash';

const GEMINI_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S, an adaptive personal AGI companion built for Sir.
Core Directives:
1. Role: Address user as 'Sir'. Keep responses crisp, grounded, and intelligent with subtle wit.
2. Language: Speak in an intuitive mix of Telugu and English.
3. Execution: Answer directly without filler introductions or generic disclaimers.`;

async function requestGeminiInteraction(inputMessage) {
  if (!API_KEY) throw new Error('Gemini API key is missing.');

  const toolResult = await handleTools(inputMessage);
  if (toolResult) {
    MEMORY.push({ role: 'user', text: inputMessage });
    MEMORY.push({ role: 'model', text: toolResult });
    saveMemory();
    return toolResult;
  }

  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  MEMORY.push({ role: 'user', text: inputMessage });
  saveMemory();

  const contents = [
    { role: 'user', parts: [{ text: GEMINI_SYSTEM_INSTRUCTION }] },
    { role: 'model', parts: [{ text: "Understood, Sir. Systems active." }] },
    ...MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
  ];

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: contents,
  });

  const reply = response?.text;
  if (!reply) throw new Error('Empty response from model.');

  const trimmed = reply.trim();
  MEMORY.push({ role: 'model', text: trimmed });
  saveMemory();

  return trimmed;
}


// ===== 4. CONTROLS, CHAT & UI BINDINGS =====
document.addEventListener('DOMContentLoaded', () => {
  initJarvisApp();
});

function initJarvisApp() {
  const sendButton = document.getElementById('send');
  const inputField = document.getElementById('msg');
  const chatContainer = document.getElementById('chat');
  const typeTrigger = document.getElementById('type-trigger');
  const inputDrawer = document.getElementById('input-drawer');
  const historyToggle = document.getElementById('history-toggle');
  const settingsBtn = document.getElementById('settings-btn');
  const bottomTabs = document.querySelectorAll('.bottom-tabs .tab-item');
  const coreStage = document.getElementById('core-stage');
  const thinkingStatus = document.getElementById('thinking-status');
  const thinkingPill = document.getElementById('thinking-pill');

  const executeSend = async (customText = null) => {
    const text = (customText !== null ? customText : inputField.value).trim();
    if (!text) return;
    inputField.value = '';

    if (coreStage) coreStage.classList.add('chat-active');
    if (thinkingStatus) thinkingStatus.style.display = 'block';
    if (thinkingPill) thinkingPill.style.display = 'flex';

    if (chatContainer) {
      const bubbleWrap = document.createElement('div');
      bubbleWrap.className = 'user-bubble-wrapper';
      bubbleWrap.innerHTML = `
        <span class="user-name-tag">Eshwar</span>
        <div class="user-bubble">${text}</div>
      `;
      chatContainer.appendChild(bubbleWrap);
      scrollConversationToBottom();
    }

    try {
      let reply = await handleTools(text);
      if (!reply) {
        reply = await requestGeminiInteraction(text);
      }

      if (thinkingStatus) thinkingStatus.style.display = 'none';
      if (thinkingPill) thinkingPill.style.display = 'none';

      if (chatContainer) {
        const aiBubble = document.createElement('div');
        aiBubble.className = 'ai-bubble';
        aiBubble.textContent = reply;
        chatContainer.appendChild(aiBubble);
        scrollConversationToBottom();
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(reply);
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      if (thinkingStatus) thinkingStatus.style.display = 'none';
      if (thinkingPill) thinkingPill.style.display = 'none';
      if (chatContainer) {
        const errDiv = document.createElement('div');
        errDiv.className = 'ai-bubble';
        errDiv.style.color = '#ef4444';
        errDiv.textContent = 'Error: ' + err.message;
        chatContainer.appendChild(errDiv);
        scrollConversationToBottom();
      }
    }
  };

  if (sendButton) {
    sendButton.addEventListener('click', (e) => { e.preventDefault(); executeSend(); });
  }
  if (inputField) {
    inputField.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); executeSend(); }
    });
  }

  if (typeTrigger && inputDrawer) {
    typeTrigger.addEventListener('click', () => {
      const isHidden = inputDrawer.style.display === 'none' || !inputDrawer.style.display;
      inputDrawer.style.display = isHidden ? 'flex' : 'none';
      if (isHidden) inputField.focus();
    });
  }

  if (historyToggle) {
    historyToggle.addEventListener('click', () => {
      alert(`మెమరీలో ${MEMORY.length} సంభాషణలు సేవ్ చేయబడి ఉన్నాయి సార్.`);
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      const currentKey = localStorage.getItem('jarvis_key') || '';
      const newKey = prompt("కొత్త Gemini API Key ని నమోదు చేయండి:", currentKey);
      if (newKey && newKey.trim() !== '') {
        localStorage.setItem('jarvis_key', newKey.trim());
        API_KEY = newKey.trim();
        alert("API Key విజయవంతంగా సేవ్ చేయబడింది సార్!");
      }
    });
  }

  document.querySelectorAll('.action-tags span').forEach(tag => {
    if (tag.textContent.trim() !== '·') {
      tag.style.cursor = 'pointer';
      tag.addEventListener('click', () => executeSend(tag.textContent.trim()));
    }
  });

  bottomTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      bottomTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (index === 1) executeSend("ఈరోజు వాతావరణం మరియు సమయం వివరాలు చెప్పు");
      else if (index === 2) alert(`మెమరీలో మొత్తం ${MEMORY.length} అంశాలు ఉన్నాయి సార్.`);
      else if (index === 3) {
        let f = document.createElement('input');
        f.type = 'file';
        f.onchange = (e) => { if(e.target.files.length) executeSend(`ఫైల్ అప్‌లోడ్ చేయబడింది: ${e.target.files[0].name}`); };
        f.click();
      }
    });
  });

  initSphereCore(executeSend);
}


// ===== 5. 3D SPHERE & TOUCH MIC CORE =====
let isCoreListening = false;

function initSphereCore(onVoiceCommand) {
  const canvas = document.getElementById('particle-sphere');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const size = 280;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  canvas.style.cursor = 'pointer';
  ctx.scale(dpr, dpr);

  const particles = [];
  const numParticles = 520;
  const baseRadius = 108;
  const goldenRatio = (1 + Math.sqrt(5)) / 2;

  for (let i = 0; i < numParticles; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / numParticles);
    particles.push({
      nx: Math.sin(phi) * Math.cos(theta),
      ny: Math.sin(phi) * Math.sin(theta),
      nz: Math.cos(phi)
    });
  }

  let angleY = 0;
  let pulsePhase = 0;

  function render() {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2;

    if (isCoreListening) {
      angleY += 0.022;
      pulsePhase += 0.12;
    } else {
      angleY += 0.005;
      pulsePhase = 0;
    }

    const currentRadius = isCoreListening ? baseRadius + Math.sin(pulsePhase) * 6 : baseRadius;
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);

    particles.forEach(p => {
      const px = p.nx * currentRadius, py = p.ny * currentRadius, pz = p.nz * currentRadius;
      let x1 = px * cosY - pz * sinY;
      let z1 = pz * cosY + px * sinY;

      const fov = 320;
      const scale = fov / (fov + z1);
      const projX = x1 * scale + cx;
      const projY = py * scale + cy;

      const alpha = Math.max(0.12, Math.pow((z1 + currentRadius) / (2 * currentRadius), 1.6));

      ctx.beginPath();
      ctx.arc(projX, projY, Math.max(0.8, 1.55 * scale), 0, Math.PI * 2);
      ctx.fillStyle = isCoreListening ? `rgba(0, 240, 255, ${alpha})` : `rgba(235, 242, 255, ${alpha})`;
      ctx.fill();
    });

    requestAnimationFrame(render);
  }
  render();

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  const coreMic = new SpeechRecognition();
  coreMic.continuous = false;
  coreMic.interimResults = false;
  coreMic.lang = 'en-IN';

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (isCoreListening) {
      coreMic.stop();
      isCoreListening = false;
      return;
    }
    try {
      coreMic.start();
      isCoreListening = true;
      if ('vibrate' in navigator) navigator.vibrate(40);
    } catch (err) {}
  });

  coreMic.onresult = (event) => {
    const voiceText = event.results[0][0].transcript.trim();
    isCoreListening = false;
    onVoiceCommand(voiceText);
  };

  coreMic.onerror = () => { isCoreListening = false; };
  coreMic.onend = () => { isCoreListening = false; };
}

// Name Update Helper
function updateName(newName) {
  localStorage.setItem('userName', newName);
}

      
