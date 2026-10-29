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
  if (!chat) return;
  chat.scrollTop = chat.scrollHeight;
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

  // 1. BATTERY STATUS CHECK
  if (t.includes('battery') || t.includes('charge') || t.includes('బ్యాటరీ') || t.includes('ఛార్జింగ్')) {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      const level = Math.round(battery.level * 100);
      const charging = battery.charging ? 'charging' : 'not charging';
      return `Your device battery is at ${level}% and currently ${charging}, Sir.`;
    }
    return 'Battery API is not supported on this browser, Sir.';
  }

  // 2. FLASHLIGHT / TORCH CONTROL
  if (t.includes('flashlight') || t.includes('torch') || t.includes('టార్చ్') || t.includes('లైట్')) {
    if (t.includes('off') || t.includes('ఆఫ్') || t.includes('బంద్')) {
      return await toggleTorch(false);
    }
    return await toggleTorch(true);
  }

  // 3. VIBRATION TEST
  if (t.includes('vibrate') || t.includes('వైబ్రేట్')) {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
      return 'Device vibrated, Sir.';
    }
    return 'Vibration not supported on this device, Sir.';
  }

  // 4. SYSTEM PANELS (Wi-Fi, Bluetooth, Settings, Alarm)
  if (t.includes('wifi') || t.includes('wi-fi') || t.includes('వైఫై')) {
    window.location.href = 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end';
    return 'Opening Wi-Fi settings, Sir.';
  }

  if (t.includes('bluetooth') || t.includes('బ్లూటూత్')) {
    window.location.href = 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end';
    return 'Opening Bluetooth settings, Sir.';
  }

  if (t.includes('alarm') || t.includes('అలారం')) {
    window.location.href = 'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end';
    return 'Opening Alarms, Sir.';
  }

  // 5. UNIVERSAL NATIVE APP LAUNCHER
  const openAppMatch = t.match(/(?:open|launch|start|ఓపెన్)\s+([a-zA-Z0-9_\s]+)/i);
  if (openAppMatch) {
    const rawAppName = openAppMatch[1].replace(/app|యాప్|ప్లీజ్|చేయి/gi, '').trim().toLowerCase();

    const appIntents = {
      'youtube': 'vnd.youtube:',
      'spotify': 'spotify:',
      'whatsapp': 'whatsapp://',
      'instagram': 'instagram://app',
      'telegram': 'tg://',
      'chrome': 'googlechrome://',
      'maps': 'geo:0,0',
      'camera': 'intent:#Intent;action=android.media.action.IMAGE_CAPTURE;end',
      'gallery': 'intent:#Intent;action=android.intent.action.VIEW;type=image/*;end',
      'calculator': 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CALCULATOR;end',
      'settings': 'intent:#Intent;action=android.settings.SETTINGS;end',
      'clock': 'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end',
      'contacts': 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.APP_CONTACTS;end'
    };

    if (appIntents[rawAppName]) {
      window.location.href = appIntents[rawAppName];
      return `Launching ${rawAppName} app, Sir.`;
    } else {
      window.location.href = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.${rawAppName};end`;
      return `Attempting to open ${rawAppName}, Sir.`;
    }
  }

  // 6. YOUTUBE SEARCH & PLAY DIRECT IN APP
  if (t.includes('play') || t.includes('పాట')) {
    const query = text.replace(/play|on youtube|youtube|jarvis|పాట|పెట్టు/gi, '').trim();
    if (query) {
      window.location.href = `vnd.youtube://results?search_query=${encodeURIComponent(query)}`;
      return `Searching "${query}" on YouTube app, Sir.`;
    }
  }

  // 7. PHONE CALL & DIALER
  if (t.includes('call') || t.includes('కాల్')) {
    const numMatch = t.match(/\d{10,}/);
    if (numMatch) {
      window.location.href = `tel:${numMatch[0]}`;
      return `Calling ${numMatch[0]}, Sir.`;
    }
    window.location.href = 'tel:';
    return 'Opening phone dialer, Sir.';
  }

  // 8. TIME & WEATHER
  if (/\b(?:what time|current time|time now)\b/.test(t) || t.includes('టైమ్') || t.includes('సమయం')) {
    return 'The time is ' + new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }) + ' IST, Sir.';
  }

  if (t.includes('weather') || t.includes('వాతావరణం')) {
    if (!navigator.geolocation) return 'Location permission required for weather, Sir.';
    return await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(async position => {
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&current_weather=true`;
          const data = await fetchToolJson(url);
          const temperature = Number(data?.current_weather?.temperature);
          resolve(`The current temperature is ${temperature}°C, Sir.`);
        } catch (e) {
          resolve('Weather service unavailable, Sir.');
        }
      }, () => resolve('Location permission denied, Sir.'), { timeout: 10000 });
    });
  }

  return null;
}



// ===== 3. GEMINI SETUP & 404 FIXED MODEL =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

// Fixed model name to resolve 404 error
const GEMINI_MODEL = 'gemini-2.5-flash';

const GEMINI_SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S, an adaptive personal AGI companion built for Sir.
Core Directives:
1. Role: Address user as 'Sir'. Keep responses crisp, grounded, and intelligent with subtle wit.
2. Language: Speak in an intuitive mix of Telugu and English.
3. Execution: Answer directly without filler introductions or generic disclaimers.`;

async function requestGeminiInteraction(inputMessage) {
  if (!API_KEY) throw new Error('Gemini API key is missing. Reload and enter the key.');

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

// ===== 4. CONTROLS, CHAT & "HEY JARVIS" WAKE WORD =====
function bindJarvisControls() {
  const sendButton = document.getElementById('send');
  const inputField = document.getElementById('msg');
  const chatContainer = document.getElementById('chat');
  const wakeButton = document.getElementById('wake-btn');
  const typeTrigger = document.getElementById('type-trigger');
  const inputDrawer = document.getElementById('input-drawer');

  // Drawer Toggle
  if (typeTrigger && inputDrawer) {
    typeTrigger.addEventListener('click', () => {
      const isHidden = inputDrawer.style.display === 'none' || !inputDrawer.style.display;
      inputDrawer.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && inputField) inputField.focus();
    });
  }

  if (!sendButton || !inputField) {
    setTimeout(bindJarvisControls, 200);
    return;
  }

  if (sendButton.dataset.jarvisBound === 'true') return;
  sendButton.dataset.jarvisBound = 'true';

  const executeSend = async (e) => {
    if (e) e.preventDefault();
    const text = inputField.value.trim();
    if (!text) return;
    inputField.value = '';

    if (chatContainer) {
      chatContainer.textContent = 'YOU: ' + text;
    }

    try {
      const reply = await requestGeminiInteraction(text);
      if (chatContainer) {
        chatContainer.textContent = 'J.A.R.V.I.S: ' + reply;
      }

      if ('speechSynthesis' in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    } catch (err) {
      console.error(err);
      if (chatContainer) chatContainer.textContent = 'Error: ' + err.message;
    }
  };

  sendButton.addEventListener('pointerdown', executeSend);
  sendButton.addEventListener('click', executeSend);

  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSend();
    }
  });

  // Wake Word Engine ("Hey Jarvis" / "Jarvis")
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition && wakeButton) {
    let isListening = false;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase();
      if (transcript.includes('jarvis') || transcript.includes('hey jarvis')) {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance("Yes Sir?"));
        }
        const userCommand = prompt("J.A.R.V.I.S is listening, Sir. Enter directive:");
        if (userCommand) {
          inputField.value = userCommand;
          executeSend();
        }
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch (err) {}
      }
    };

    wakeButton.addEventListener('click', () => {
      isListening = !isListening;
      if (isListening) {
        try {
          recognition.start();
          wakeButton.style.color = '#00ffff';
        } catch (err) {}
      } else {
        recognition.stop();
        wakeButton.style.color = '';
      }
    });
  }
}

// ===== 5. INTERACTIVE VOICE CORE (TOUCH TO SPEAK) =====
let isCoreListening = false;

function initSphereAnimation() {
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

  const numParticles = 520;
  const particles = [];
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
  let angleX = 0.25;
  let pulsePhase = 0;

  function render() {
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2;
    const cy = size / 2;

    // మైక్ ఆన్ లో ఉన్నప్పుడు కోర్ వేగంగా తిరుగుతూ పల్స్ అవుతుంది
    if (isCoreListening) {
      angleY += 0.022;
      pulsePhase += 0.12;
    } else {
      angleY += 0.005;
      pulsePhase = 0;
    }

    const currentRadius = isCoreListening 
      ? baseRadius + Math.sin(pulsePhase) * 6 
      : baseRadius;

    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);

    particles.forEach(p => {
      const px = p.nx * currentRadius;
      const py = p.ny * currentRadius;
      const pz = p.nz * currentRadius;

      let x1 = px * cosY - pz * sinY;
      let z1 = pz * cosY + px * sinY;

      let y1 = py * cosX - z1 * sinX;
      let z2 = z1 * cosX + py * sinX;

      const fov = 320;
      const scale = fov / (fov + z2);
      const projX = x1 * scale + cx;
      const projY = y1 * scale + cy;

      const normalizedZ = (z2 + currentRadius) / (2 * currentRadius);
      const alpha = Math.max(0.12, Math.pow(normalizedZ, 1.6));
      const dotSize = Math.max(0.8, (isCoreListening ? 1.8 : 1.55) * scale);

      ctx.beginPath();
      ctx.arc(projX, projY, dotSize, 0, Math.PI * 2);
      
      // మైక్ ఆన్ అయితే Cyan Blue రంగు, లేకపోతే White రంగు
      if (isCoreListening) {
        ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(235, 242, 255, ${alpha})`;
      }
      ctx.fill();
    });

    requestAnimationFrame(render);
  }
  render();

  // ===== CORE TOUCH MIC LOGIC =====
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    canvas.addEventListener('click', () => alert("మీ బ్రౌజర్‌లో వాయిస్ రికగ్నిషన్ సపోర్ట్ లేదు సార్."));
    return;
  }

  const coreMic = new SpeechRecognition();
  coreMic.continuous = false; // ఒక కమాండ్ వినగానే ఆటోమేటిక్ గా ప్రాసెస్ చేస్తుంది
  coreMic.interimResults = false;
  coreMic.lang = 'en-IN'; // ఇంగ్లీష్ మరియు ఇండియన్ యాక్సెంట్ సపోర్ట్

  const activateCoreMic = (e) => {
    if (e) e.preventDefault();
    
    // జార్విస్ మాట్లాడుతుంటే ఆపేసి మీ మాట వింటుంది
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    if (isCoreListening) {
      coreMic.stop();
      isCoreListening = false;
      return;
    }

    try {
      coreMic.start();
      isCoreListening = true;
      if ('vibrate' in navigator) navigator.vibrate(40); // చిన్న వైబ్రేషన్ ఫీడ్‌బ్యాక్
      
      const subPrompt = document.querySelector('.sub-prompt');
      if (subPrompt) subPrompt.textContent = "Listening, Sir... Speak now";
    } catch (err) {
      console.error(err);
    }
  };

  coreMic.onresult = (event) => {
    const voiceText = event.results[0][0].transcript.trim();
    isCoreListening = false;

    const subPrompt = document.querySelector('.sub-prompt');
    if (subPrompt) subPrompt.textContent = `"${voiceText}"`;

    // మనం మాట్లాడిన టెక్స్ట్‌ని నేరుగా జార్విస్ కి పంపడం
    const inputField = document.getElementById('msg');
    const sendButton = document.getElementById('send');
    if (inputField && sendButton) {
      inputField.value = voiceText;
      sendButton.click();
    }
  };

  coreMic.onerror = () => {
    isCoreListening = false;
    const subPrompt = document.querySelector('.sub-prompt');
    if (subPrompt) subPrompt.textContent = "Tap the core to speak, Sir";
  };

  coreMic.onend = () => {
    isCoreListening = false;
  };

  // కోర్ పై టచ్ చేసినా లేదా క్లిక్ చేసినా మైక్ ఆన్ అవుతుంది
  canvas.addEventListener('pointerdown', activateCoreMic);
}



