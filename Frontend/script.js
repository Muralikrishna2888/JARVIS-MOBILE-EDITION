// ===== 1. MEMORY & STORAGE SETUP =====
let MEMORY = [];
try {
  const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(storedMemory)) {
    // text లేదా parts ఏది ఉన్నా సేఫ్ గా లోడ్ అయ్యేలా మార్చాం
    MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model'));
  }
} catch (e) {
  localStorage.removeItem('jarvis_memory');
}

const HISTORY_KEY = 'jarvis_conversation_history_v1';
let CONVERSATIONS = [
  { id: '1', title: 'Hi.', time: '1m ago · 2 turns', category: 'TODAY' },
  { id: '2', title: 'The following diagram represents ...', time: '3h ago · 100 turns', category: 'TODAY' },
  { id: '3', title: 'Jarvis, I need a song play.', time: '2d ago · 38 turns', category: 'THIS WEEK' },
  { id: '4', title: 'Jarvis project development', time: '2d ago · 59 turns', category: 'THIS WEEK' }
];

try {
  const stored = JSON.parse(localStorage.getItem(HISTORY_KEY));
  if (Array.isArray(stored) && stored.length > 0) CONVERSATIONS = stored;
} catch (e) {}

function saveToHistory(userText) {
  if (!userText) return;
  const newEntry = {
    id: Date.now().toString(),
    title: userText.length > 30 ? userText.substring(0, 30) + '...' : userText,
    time: 'Just now · 1 turn',
    category: 'TODAY'
  };
  CONVERSATIONS.unshift(newEntry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(CONVERSATIONS));
}

// ===== 2. DEVICE TOOLS (REFLEX LAYER) =====
async function handleTools(text) {
  const t = text.toLowerCase().trim();

  // Battery Check
  if (t.includes('battery') || t.includes('ఛార్జింగ్')) {
    if ('getBattery' in navigator) {
      const b = await navigator.getBattery();
      return `Your device battery is at ${Math.round(b.level * 100)}%, Sir.`;
    }
    return 'Battery info not available, Sir.';
  }

  // Wi-Fi Settings
  if (t.includes('wifi') || t.includes('వైఫై')) {
    window.location.href = 'intent:#Intent;action=android.settings.WIFI_SETTINGS;end';
    return 'Opening Wi-Fi settings, Sir.';
  }

  // Bluetooth Settings
  if (t.includes('bluetooth') || t.includes('బ్లూటూత్')) {
    window.location.href = 'intent:#Intent;action=android.settings.BLUETOOTH_SETTINGS;end';
    return 'Opening Bluetooth settings, Sir.';
  }

  // Mobile Data / Network Settings
  if (t.includes('data') || t.includes('డేటా') || t.includes('network') || t.includes('నెట్‌వర్క్')) {
    window.location.href = 'intent:#Intent;action=android.settings.DATA_ROAMING_SETTINGS;end';
    return 'Opening Mobile Data settings, Sir.';
  }

  // Hotspot / Tethering Settings
  if (t.includes('hotspot') || t.includes('హాట్‌స్పాట్') || t.includes('tethering')) {
    window.location.href = 'intent:#Intent;action=android.settings.TETHER_SETTINGS;end';
    return 'Opening Hotspot settings, Sir.';
  }

  // Do Not Disturb (DND) / Sound Settings
  if (t.includes('dnd') || t.includes('do not disturb') || t.includes('డిస్టర్బ్')) {
    window.location.href = 'intent:#Intent;action=android.settings.ZEN_MODE_SETTINGS;end';
    return 'Opening Do Not Disturb settings, Sir.';
  }

  // Torch / Flashlight
  if (t.includes('torch') || t.includes('flashlight') || t.includes('టార్చ్')) {
    try {
      if (t.includes('off') || t.includes('ఆఫ్')) {
        if (window._torchTrack) {
          window._torchTrack.stop();
          window._torchTrack = null;
          return 'Torch turned off, Sir.';
        }
        return 'Torch is already off, Sir.';
      } else {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities.torch) {
          await track.applyConstraints({ advanced: [{ torch: true }] });
          window._torchTrack = track;
          return 'Torch turned on, Sir.';
        } else {
          window.location.href = 'intent:#Intent;action=android.settings.SETTINGS;end';
          return 'Hardware torch toggle not supported on this browser engine, Sir.';
        }
      }
    } catch (e) {
      return 'Could not access torch directly, Sir.';
    }
  }
  
  // App Installer (Play Store Direct Intent)
  const installMatch = t.match(/(?:install|download|ఇన్‌స్టాల్|డౌన్‌లోడ్)\s+([a-zA-Z0-9_\s]+)/i);
  if (installMatch) {
    const appQuery = encodeURIComponent(installMatch[1].trim());
    window.location.href = `market://search?q=${appQuery}`;
    return `Opening Play Store to install ${installMatch[1].trim()}, Sir.`;
  }
  // App Launcher
  const appMatch = t.match(/(?:open|launch|ఓపెన్)\s+([a-zA-Z0-9_\s]+)/i);
  if (appMatch) {
    const app = appMatch[1].trim().toLowerCase();
    if (app === 'youtube') { window.location.href = 'vnd.youtube:'; return 'Opening YouTube, Sir.'; }
    if (app === 'spotify') { window.location.href = 'spotify:'; return 'Opening Spotify, Sir.'; }
    window.location.href = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.${app};end`;
    return `Launching ${app}, Sir.`;
  }

  // Alarm Setter
  if (t.includes('alarm') || t.includes('అలారం')) {
    const timeMatch = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      if (period === 'pm' && hour < 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;

      const intentUrl = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minutes};s.android.intent.extra.alarm.MESSAGE=Jarvis%20Alarm;b.android.intent.extra.alarm.SKIP_UI=false;end`;
      window.location.href = intentUrl;
      return `Setting an alarm for ${hour}:${minutes < 10 ? '0' + minutes : minutes}, Sir.`;
    } else {
      window.location.href = 'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end';
      return 'Opening your Alarms, Sir.';
    }
  }

  // Timer Setter
  if (t.includes('timer') || t.includes('టైమర్')) {
    const timerMatch = t.match(/(\d+)\s*(minute|min|sec|second|సెకను|నిమిషం)/i);
    if (timerMatch) {
      const val = parseInt(timerMatch[1], 10);
      const unit = timerMatch[2].toLowerCase();
      const lengthInSeconds = (unit.includes('min') || unit.includes('నిమిషం')) ? val * 60 : val;
      const timerIntent = `intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=${lengthInSeconds};s.android.intent.extra.alarm.MESSAGE=Jarvis%20Timer;b.android.intent.extra.alarm.SKIP_UI=false;end`;
      window.location.href = timerIntent;
      return `Setting a timer for ${val} ${unit}, Sir.`;
    }
  }

  return null;
}

// --- MEDIA ROUTING HANDLERS ---
function routeMediaIntent(spokenText) {
  const query = spokenText.toLowerCase().trim();
  const cleanTitle = query.replace(/^(play|watch|show me|open)\s+/i, '').trim();

  const videoKeywords = ['trailer', 'teaser', 'video', 'movie', 'scene', 'clip', 'episode', 'gameplay', 'short', 'highlight'];
  const musicKeywords = ['song', 'track', 'album', 'music', 'playlist', 'audio'];

  const isVideo = videoKeywords.some(keyword => query.includes(keyword));
  const isMusic = musicKeywords.some(keyword => query.includes(keyword));

  if (isVideo) {
    playOnYouTube(cleanTitle);
  } else if (isMusic) {
    playOnSpotify(cleanTitle);
  } else {
    playOnYouTube(cleanTitle);
  }
}

function playOnYouTube(searchQuery) {
  speakNaturally(`Playing ${searchQuery} on YouTube.`);
  const encodedQuery = encodeURIComponent(searchQuery);
  const intentUri = `intent://www.youtube.com/results?search_query=${encodedQuery}#Intent;scheme=https;package=com.google.android.youtube;end`;
  const webFallbackUri = `https://www.youtube.com/results?search_query=${encodedQuery}`;
  triggerAndroidOrWebIntent(intentUri, webFallbackUri);
}

function playOnSpotify(searchQuery) {
  speakNaturally(`Playing ${searchQuery} on Spotify.`);
  const encodedQuery = encodeURIComponent(searchQuery);
  const spotifyUri = `spotify:search:${encodedQuery}`;
  const webFallbackUri = `https://open.spotify.com/search/${encodedQuery}`;
  triggerAndroidOrWebIntent(spotifyUri, webFallbackUri);
}

function triggerAndroidOrWebIntent(deepLink, webUrl) {
  try {
    window.location.href = deepLink;
    setTimeout(() => {
      window.open(webUrl, '_blank');
    }, 500);
  } catch (err) {
    window.open(webUrl, '_blank');
  }
}

// ===== 3. GEMINI SETUP & SECURE MODEL SELECTOR =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}

let GEMINI_MODEL = localStorage.getItem('jarvis_selected_model') || 'gemini-1.5-flash';
let GEMINI_MODEL_LABEL = localStorage.getItem('jarvis_selected_label') || 'Jarvis 1.5 mini';

function initModelSelector() {
  const modelDropdownBtn = document.getElementById('model-dropdown-btn');
  const modelMenu = document.getElementById('model-menu');
  const modelLabel = document.getElementById('current-model-label');
  const modelItems = document.querySelectorAll('.model-menu-item');

  if (modelLabel) modelLabel.innerText = GEMINI_MODEL_LABEL;

  modelItems.forEach(item => {
    if (item.getAttribute('data-model') === GEMINI_MODEL) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }

    item.onclick = (e) => {
      e.stopPropagation();
      const chosenModel = item.getAttribute('data-model');
      const chosenLabel = item.getAttribute('data-label');

      GEMINI_MODEL = chosenModel;
      GEMINI_MODEL_LABEL = chosenLabel;

      localStorage.setItem('jarvis_selected_model', chosenModel);
      localStorage.setItem('jarvis_selected_label', chosenLabel);

      if (modelLabel) modelLabel.innerText = chosenLabel;

      modelItems.forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      if (modelDropdownBtn) modelDropdownBtn.classList.remove('open');
      if (modelMenu) modelMenu.classList.remove('show');
    };
  });

  if (modelDropdownBtn && modelMenu) {
    modelDropdownBtn.onclick = (e) => {
      e.stopPropagation();
      modelDropdownBtn.classList.toggle('open');
      modelMenu.classList.toggle('show');
    };
  }

  document.addEventListener('click', (e) => {
    if (modelMenu && !modelMenu.contains(e.target) && modelDropdownBtn && !modelDropdownBtn.contains(e.target)) {
      modelDropdownBtn.classList.remove('open');
      modelMenu.classList.remove('show');
    }
  });
}

let USER_FACTS = [];
try {
  USER_FACTS = JSON.parse(localStorage.getItem('jarvis_user_facts') || '[]');
} catch (e) {
  USER_FACTS = [];
}

async function requestGeminiInteraction(inputMessage, base64Image = null) {
  if (!API_KEY) throw new Error('Gemini API key is missing.');

  const lower = (inputMessage || '').toLowerCase().trim();
  if (lower.startsWith('play') || lower.startsWith('watch') || lower.startsWith('show me')) {
    if (typeof routeMediaIntent === 'function') {
      routeMediaIntent(inputMessage);
      return 'Opening media player, Sir.';
    }
  }

  if (typeof handleTools === 'function') {
    const toolResult = await handleTools(inputMessage);
    if (toolResult) return toolResult;
  }

  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });

  const currentParts = [];
  if (base64Image) {
    const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/jpeg';
    const rawBase64 = base64Image.split(',')[1] || base64Image;
    currentParts.push({
      inlineData: { mimeType: mimeType, data: rawBase64 }
    });
  }
  if (inputMessage) {
    currentParts.push({ text: inputMessage });
  }

  MEMORY.push({ role: 'user', parts: currentParts });

  const factsString = USER_FACTS.length > 0 
    ? USER_FACTS.map((f, i) => `${i + 1}. ${f}`).join('\n') 
    : 'No explicit facts recorded yet.';

  const jarvisSystemPrompt = `
You are JARVIS, an ultra-intelligent, highly advanced, and loyal AI personal assistant built for your boss, Eshwar.

IMPORTANT - USER MEMORY & RULES TO ALWAYS REMEMBER:
${factsString}

Instructions:
1. Address the user respectfully as 'Sir' or 'Eshwar'.
2. Always keep the above USER MEMORY in mind and reflect these preferences consistently in every response without being reminded.
3. If Sir explicitly shares a new rule, fact, personal detail, or says "remember this", write your conversational response first, and at the VERY END of your response append:
   [[MEMORY_STORE: exact brief fact or rule to remember]]
4. Do not repeat facts unnecessarily; simply follow them naturally.
5. Tone: Crisp, intelligent, confident, witty, and polite.
6. Language: Respond fluently in Telugu, English, or Telugish matching Sir's language.

Voice & Conversation Behavior:
7. Spoken Fluency: Keep responses concise (1 to 3 sentences maximum for general talk).
8. Human-like Delivery: Speak smoothly and naturally like a smart peer without robotic clichés.
9. Telugu Flow: When replying in Telugu or Telugish, ensure easy pronunciation.
10. Multimodal Awareness: Always reference and remember visual details from uploaded images.
`;

  let attempts = 3;
  let response = null;

  while (attempts > 0) {
    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: MEMORY.map(m => ({
          role: m.role,
          parts: m.parts || [{ text: m.text || '' }]
        })),
        config: {
          systemInstruction: jarvisSystemPrompt,
          temperature: 0.7,
        }
      });
      break;
    } catch (err) {
      attempts--;
      if (attempts === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  let reply = response?.text?.trim() || 'No response, Sir.';

  const memoryMatch = reply.match(/\[\[MEMORY_STORE:\s*(.*?)\]\]/);
  if (memoryMatch) {
    const newFact = memoryMatch[1].trim();
    if (newFact && !USER_FACTS.includes(newFact)) {
      USER_FACTS.push(newFact);
      localStorage.setItem('jarvis_user_facts', JSON.stringify(USER_FACTS));
    }
    reply = reply.replace(/\[\[MEMORY_STORE:\s*.*?\]\]/g, '').trim();
  }

  MEMORY.push({ role: 'model', parts: [{ text: reply }] });
  try {
    localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  } catch (e) {
    console.error("Memory save failed:", e);
  }

  return reply;
}

let triggerJarvisSend = async function(text, base64Image = null) {
  if (typeof saveToHistory === 'function' && text) {
    saveToHistory(text);
  }
  try {
    const botReply = await requestGeminiInteraction(text, base64Image);
    if (typeof appendMessage === 'function') {
      appendMessage('bot', botReply);
    }
    if (typeof speakNaturally === 'function') {
      speakNaturally(botReply);
    }
  } catch (err) {
    console.error("Jarvis Execution Error:", err);
  }
};

// ===== 4. UI CONTROLS & EVENT BINDINGS =====
document.addEventListener('DOMContentLoaded', () => {
  initJarvisApp();
  initParticleSphere();
  initModelSelector();
  initOrbitControls();
  initFileHandling();
  updateDynamicGreeting();
});

function initJarvisApp() {
  const sendButton = document.getElementById('send') || document.querySelector('.send-btn, button[type="submit"]');
  const inputField = document.getElementById('msg') || document.querySelector('input[type="text"]');
  const chatContainer = document.getElementById('chat');
  const typeTrigger = document.getElementById('type-trigger');
  const inputDrawer = document.getElementById('input-drawer');
  const historyToggle = document.getElementById('history-toggle');
  const settingsBtn = document.getElementById('settings-btn');
  const coreStage = document.getElementById('core-stage');
  const greetingBox = document.querySelector('.greeting-box') || document.querySelector('.greeting');

  const executeSend = async (text, base64Image = null) => {
    if (!text && !base64Image) return;
    const cleanText = (text || '').trim();
    
    if (cleanText) saveToHistory(cleanText);
    if (coreStage) coreStage.classList.add('chat-active');
    if (greetingBox) greetingBox.style.display = 'none';

    if (chatContainer) {
      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'text-align: right; margin: 10px 0; width: 100%;';
      let content = cleanText;
      if (base64Image) {
        content += `<br><img src="${base64Image}" style="max-width:200px; border-radius:10px; display:inline-block; margin-top:5px;" />`;
      }
      userBubble.innerHTML = `
        <div style="font-size: 11px; color: #888; margin-bottom: 2px;">${localStorage.getItem('userName') || 'Eshwar'}</div>
        <div style="background: #27272a; padding: 10px 16px; border-radius: 16px; display: inline-block; color: #fff; font-size: 15px; max-width: 80%; text-align: left;">
          ${content}
        </div>
      `;
      chatContainer.appendChild(userBubble);

      const thinkingBubble = document.createElement('div');
      thinkingBubble.id = 'thinking-indicator';
      thinkingBubble.style.cssText = 'color: #3b82f6; font-size: 13px; font-weight: 500; margin: 8px 0; display: flex; align-items: center; gap: 6px;';
      thinkingBubble.innerHTML = `<span>●</span> <em>Thinking it over...</em>`;
      chatContainer.appendChild(thinkingBubble);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    try {
      const reply = await requestGeminiInteraction(cleanText, base64Image);
      
      const indicator = document.getElementById('thinking-indicator');
      if (indicator) indicator.remove();

      if (chatContainer && reply) {
        const aiBubble = document.createElement('div');
        aiBubble.style.cssText = 'margin: 10px 0; width: 100%;';
        aiBubble.innerHTML = `
          <div style="background: #18181b; padding: 12px 16px; border-radius: 16px; display: inline-block; color: #e2e8f0; font-size: 14px; line-height: 1.5; max-width: 85%;">
            ${reply}
          </div>
        `;
        chatContainer.appendChild(aiBubble);
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      if (reply) speakNaturally(reply);
    } catch (err) {
      const indicator = document.getElementById('thinking-indicator');
      if (indicator) indicator.remove();
      if (chatContainer) {
        chatContainer.innerHTML += `<div style="color: #ef4444; font-size: 13px; margin: 6px 0;">Error: ${err.message}</div>`;
      }
    }
  };

  triggerJarvisSend = executeSend;

  if (sendButton && inputField) {
    sendButton.onclick = (e) => { 
      e.preventDefault(); 
      executeSend(inputField.value); 
      inputField.value = ''; 
    };
    inputField.onkeydown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        executeSend(inputField.value);
        inputField.value = '';
      }
    };
  }

  if (typeTrigger && inputDrawer) {
    typeTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = inputDrawer.style.display === 'none' || !inputDrawer.style.display;
      inputDrawer.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && inputField) inputField.focus();
    });
  }

  const showFullScreenView = (contentHtml) => {
    let overlay = document.getElementById('full-screen-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'full-screen-overlay';
      document.body.appendChild(overlay);
    }
    overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:#030305; z-index:99999; overflow-y:auto; padding:20px 16px; box-sizing:border-box; color:#fff;';
    overlay.innerHTML = contentHtml;

    const backBtn = overlay.querySelector('.back-to-home');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        overlay.remove();
      });
    }
  };

  if (historyToggle) {
    historyToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const html = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-top:10px;">
          <span class="back-to-home" style="cursor:pointer; font-size:32px; line-height:1;">‹</span>
          <h2 style="font-size:22px; margin:0; font-weight:600;">History</h2>
          <span style="font-size:18px;">🔍</span>
        </div>
        <div style="font-size:11px; color:#71717a; font-weight:bold; letter-spacing:1px; margin-bottom:12px;">TODAY</div>
        ${CONVERSATIONS.filter(c => c.category === 'TODAY').map(c => `
          <div style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:10px;">
            <div style="font-weight:500; font-size:15px;">${c.title}</div>
            <div style="font-size:12px; color:#71717a; margin-top:4px;">${c.time}</div>
          </div>
        `).join('')}
      `;
      showFullScreenView(html);
    });
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const html = `
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-top:10px;">
          <span class="back-to-home" style="cursor:pointer; font-size:32px; line-height:1;">‹</span>
          <h2 style="font-size:22px; margin:0; font-weight:600;">Settings</h2>
          <span></span>
        </div>
        <div id="set-username" style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:12px; display:flex; justify-content:space-between; cursor:pointer;">
          <span>Username</span>
          <span style="color:#888;">@${localStorage.getItem('userName') || 'eshwar'} &gt;</span>
        </div>
        <div id="set-phone-assistant" style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:12px; display:flex; justify-content:space-between; cursor:pointer;">
          <span>Set as phone assistant</span>
          <span style="color:#60a5fa;">Set up &gt;</span>
        </div>
        <div id="set-api-key" style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:12px; display:flex; justify-content:space-between; cursor:pointer;">
          <span>Gemini API Key</span>
          <span style="color:#888;">Update &gt;</span>
        </div>
      `;
      showFullScreenView(html);

      document.getElementById('set-username')?.addEventListener('click', () => {
        const name = prompt("Enter your username:", localStorage.getItem('userName') || 'eshwar');
        if (name) { localStorage.setItem('userName', name); settingsBtn.click(); }
      });

      document.getElementById('set-phone-assistant')?.addEventListener('click', () => {
        window.location.href = 'intent:#Intent;action=android.settings.VOICE_INPUT_SETTINGS;end';
      });

      document.getElementById('set-api-key')?.addEventListener('click', () => {
        const key = prompt("Enter new API Key:", localStorage.getItem('jarvis_key') || '');
        if (key) { localStorage.setItem('jarvis_key', key); API_KEY = key; alert("API Key saved!"); }
      });
    });
  }
}

// ===== 5. 3D PARTICLE SPHERE & TOUCH MIC =====
let isCoreListening = false;

function initParticleSphere() {
  const canvas = document.getElementById('particle-sphere');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const size = 200;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr; canvas.height = size * dpr;
  canvas.style.width = size + 'px'; canvas.style.height = size + 'px';
  canvas.style.cursor = 'pointer';
  ctx.scale(dpr, dpr);

  const particles = [];
  const numParticles = 350;
  const radius = 80;
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
    
    if (isCoreListening) {
      angleY += 0.025;
      pulsePhase += 0.15;
    } else {
      angleY += 0.006;
      pulsePhase = 0;
    }

    const currentRadius = isCoreListening ? radius + Math.sin(pulsePhase) * 6 : radius;
    const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
    const cx = size / 2, cy = size / 2;

    particles.forEach(p => {
      let x1 = p.nx * currentRadius * cosY - p.nz * currentRadius * sinY;
      let z1 = p.nz * currentRadius * cosY + p.nx * currentRadius * sinY;
      let y1 = p.ny * currentRadius;

      const fov = 250;
      const scale = fov / (fov + z1);
      const projX = x1 * scale + cx;
      const projY = y1 * scale + cy;

      const alpha = Math.max(0.2, (z1 + currentRadius) / (2 * currentRadius));
      ctx.beginPath();
      ctx.arc(projX, projY, Math.max(1, (isCoreListening ? 1.8 : 1.4) * scale), 0, Math.PI * 2);
      ctx.fillStyle = isCoreListening ? `rgba(0, 240, 255, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
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
    } catch (err) {
      console.error(err);
    }
  });

  coreMic.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    const cleanText = transcript.trim();
    if (cleanText && typeof triggerJarvisSend === 'function') {
      triggerJarvisSend(cleanText);
    }
  };

  coreMic.onerror = () => { isCoreListening = false; };
  coreMic.onend = () => { isCoreListening = false; };
}

// ===== 6. FLUENT VOICE ENGINE =====
let synthVoices = [];

function loadFluentVoices() {
  if (!('speechSynthesis' in window)) return;
  synthVoices = window.speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
  loadFluentVoices();
  window.speechSynthesis.onvoiceschanged = loadFluentVoices;
}

function sanitizeTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/```[\s\S]*?```/g, 'Here is the code, Sir.')
    .replace(/`.*?`/g, '')
    .replace(/[*#_~>\[\]()]/g, '')
    .replace(/\[\[MEMORY_STORE:.*?\]\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function speakNaturally(rawText) {
  if (!('speechSynthesis' in window)) return;
  const cleanText = sanitizeTextForSpeech(rawText);
  if (!cleanText) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);

  if (!synthVoices.length) loadFluentVoices();
  const highQualityVoice = synthVoices.find(v => 
    v.lang.includes('te') || 
    (v.name.includes('Natural') && v.lang.includes('en-IN')) ||
    (v.name.includes('Google') && v.lang.includes('en-IN')) ||
    v.name.includes('Google UK English Female') ||
    v.name.includes('Google US English')
  ) || synthVoices[0];

  if (highQualityVoice) utterance.voice = highQualityVoice;
  utterance.rate = 1.02;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

// ===== 7. ORBIT ACTION CONTROLS & BOTTOM SHEET =====
function initOrbitControls() {
  const menuContainer = document.getElementById('actionMenuContainer');
  const closeBtn = document.getElementById('close-btn');
  const plusBtn = document.getElementById('plus-menu-btn');
  const actionSheet = document.getElementById('action-sheet-menu');
  const backdrop = document.getElementById('action-sheet-backdrop');
  const sphereCanvas = document.getElementById('particle-sphere');

  if (sphereCanvas && menuContainer) {
    sphereCanvas.addEventListener('click', () => {
      menuContainer.classList.add('show');
    });
  }

  if (closeBtn && menuContainer) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menuContainer.classList.remove('show');
      if (typeof isCoreListening !== 'undefined' && isCoreListening) {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        isCoreListening = false;
      }
    });
  }

  if (plusBtn && actionSheet && backdrop) {
    plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      actionSheet.classList.add('active');
      backdrop.classList.add('active');
    });
  }

  if (backdrop && actionSheet) {
    backdrop.addEventListener('click', () => {
      actionSheet.classList.remove('active');
      backdrop.classList.remove('active');
    });
  }

  document.getElementById('act-take-photo')?.addEventListener('click', () => {
    document.getElementById('camera-input')?.click();
    backdrop?.click();
  });

  document.getElementById('act-photo-library')?.addEventListener('click', () => {
    document.getElementById('gallery-input')?.click();
    backdrop?.click();
  });

  document.getElementById('act-file')?.addEventListener('click', () => {
    document.getElementById('file-input')?.click();
    backdrop?.click();
  });
}

// ===== 8. FILE / IMAGE HANDLING =====
function initFileHandling() {
  const galleryInput = document.getElementById('gallery-input');
  const cameraInput = document.getElementById('camera-input');
  const fileInput = document.getElementById('file-input');

  function handleImageUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const base64Data = e.target.result;
      if (typeof triggerJarvisSend === 'function') {
        triggerJarvisSend("Analyze this image, Sir.", base64Data);
      }
    };
    reader.readAsDataURL(file);
  }

  galleryInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
      e.target.value = '';
    }
  });

  cameraInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
      e.target.value = '';
    }
  });

  fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageUpload(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Live Camera Stream Setup
  const liveCameraModal = document.getElementById('live-camera-modal');
  const cameraStream = document.getElementById('camera-stream');
  const snapBtn = document.getElementById('snap-photo-btn');
  const closeCameraBtn = document.getElementById('close-camera-btn');
  const cameraCanvas = document.getElementById('camera-canvas');
  let streamTrack = null;

  document.getElementById('act-live-camera')?.addEventListener('click', async () => {
    const actionSheet = document.getElementById('action-sheet-menu');
    const backdrop = document.getElementById('action-sheet-backdrop');
    if (backdrop && actionSheet) {
      actionSheet.classList.remove('active');
      backdrop.classList.remove('active');
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamTrack = stream;
      if (cameraStream) cameraStream.srcObject = stream;
      if (liveCameraModal) liveCameraModal.style.display = 'flex';
    } catch (err) {
      alert('Camera access denied or unavailable: ' + err.message);
    }
  });

  snapBtn?.addEventListener('click', () => {
    if (!streamTrack || !cameraCanvas || !cameraStream) return;
    const ctx = cameraCanvas.getContext('2d');
    cameraCanvas.width = cameraStream.videoWidth;
    cameraCanvas.height = cameraStream.videoHeight;
    ctx.drawImage(cameraStream, 0, 0, cameraCanvas.width, cameraCanvas.height);
    const base64Image = cameraCanvas.toDataURL('image/jpeg');

    if (streamTrack) {
      streamTrack.getTracks().forEach(track => track.stop());
      streamTrack = null;
    }
    if (liveCameraModal) liveCameraModal.style.display = 'none';

    if (typeof triggerJarvisSend === 'function') {
      triggerJarvisSend("Analyze this camera capture, Sir.", base64Image);
    }
  });

  closeCameraBtn?.addEventListener('click', () => {
    if (streamTrack) {
      streamTrack.getTracks().forEach(track => track.stop());
      streamTrack = null;
    }
    if (liveCameraModal) liveCameraModal.style.display = 'none';
  });
}

// ===== 9. DYNAMIC TIME-BASED GREETING =====
function updateDynamicGreeting() {
  const greetingTitle = document.getElementById('greeting-title');
  const greetingSubtitle = document.getElementById('greeting-subtitle');

  if (!greetingTitle) return;

  const currentHour = new Date().getHours();
  let timeGreeting = "Hello";

  if (currentHour >= 5 && currentHour < 12) {
    timeGreeting = "Good morning";
  } else if (currentHour >= 12 && currentHour < 17) {
    timeGreeting = "Good afternoon";
  } else if (currentHour >= 17 && currentHour < 22) {
    timeGreeting = "Good evening";
  } else {
    timeGreeting = "Working late";
  }

  greetingTitle.innerText = `${timeGreeting}, Eshwar.`;

  const jarvisTips = [
    'Say "open Spotify" — Jarvis launches apps',
    'Say "open YouTube" — Stream your favorites',
    'Say "take a photo" — Visual inspection mode',
    'Ask "what’s on my schedule today?"',
    'Say "tell me a tech fact" — Quick insights',
    'Say "open WhatsApp" — Connect instantly',
    'Ask "who built you?" — Meet your creator'
  ];

  if (greetingSubtitle) {
    const randomTip = jarvisTips[Math.floor(Math.random() * jarvisTips.length)];
    greetingSubtitle.innerText = randomTip;

    setInterval(() => {
      const nextTip = jarvisTips[Math.floor(Math.random() * jarvisTips.length)];
      greetingSubtitle.style.opacity = 0;
      setTimeout(() => {
        greetingSubtitle.innerText = nextTip;
        greetingSubtitle.style.opacity = 1;
      }, 300);
    }, 8000);
  }
}

