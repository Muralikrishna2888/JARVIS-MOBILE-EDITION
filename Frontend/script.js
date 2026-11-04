// ===== 1. MEMORY & STORAGE SETUP =====
let MEMORY = [];
try {
  const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(storedMemory)) {
    MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string');
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

// ===== 3. GEMINI SETUP =====
let API_KEY = localStorage.getItem('jarvis_key');
if (!API_KEY) {
  API_KEY = prompt('Enter your Gemini API Key:');
  if (API_KEY) localStorage.setItem('jarvis_key', API_KEY);
}
const GEMINI_MODEL = 'gemini-3.5-flash-lite';

async function requestGeminiInteraction(inputMessage) {
  if (!API_KEY) throw new Error('Gemini API key is missing.');

  // Reflex Check: మీడియా డైరెక్ట్ రూటింగ్
  const lower = inputMessage.toLowerCase().trim();
  if (lower.startsWith('play') || lower.startsWith('watch') || lower.startsWith('show me')) {
    routeMediaIntent(inputMessage);
    return 'Opening media player, Sir.';
  }

  // Device Tools Check
  const toolResult = await handleTools(inputMessage);
  if (toolResult) return toolResult;

  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  MEMORY.push({ role: 'user', text: inputMessage });
  
  const jarvisSystemPrompt = `
You are JARVIS, an ultra-intelligent, highly advanced, and loyal AI personal assistant built for your boss, Eshwar.
Guidelines for your responses:
1. Address the user respectfully as 'Sir' or 'Eshwar'.
2. Tone: Crisp, intelligent, confident, witty, and polite.
3. Brevity: Keep conversational answers concise and directly to the point.
4. Language: Respond fluently in Telugu, English, or Telugish matching Sir's language.
5. Capabilities: You manage phone functions, remember preferences, and handle tasks with extreme precision.
`;

  let attempts = 3;
  let response = null;

  while (attempts > 0) {
    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
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

  const reply = response?.text?.trim() || 'No response, Sir.';
  MEMORY.push({ role: 'model', text: reply });
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  return reply;
}

// Global reference for execution
let triggerJarvisSend = null;

// ===== 4. UI CONTROLS & FULL SCREEN VIEWS =====
document.addEventListener('DOMContentLoaded', () => {
  initJarvisApp();
  initParticleSphere();
});

function initJarvisApp() {
  const sendButton = document.getElementById('send') || document.querySelector('.send-btn, button[type="submit"]');
  const inputField = document.getElementById('msg') || document.querySelector('input[type="text"]');
  const chatContainer = document.getElementById('chat');
  const typeTrigger = document.getElementById('type-trigger');
  const inputDrawer = document.getElementById('input-drawer');
  const historyToggle = document.getElementById('history-toggle');
  const settingsBtn = document.getElementById('settings-btn');
  const bottomTabs = document.querySelectorAll('.bottom-tabs .tab-item');
  const coreStage = document.getElementById('core-stage');
  const greetingBox = document.querySelector('.greeting-box') || document.querySelector('.greeting');

  const executeSend = async (text) => {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();
    
    saveToHistory(cleanText);

    if (coreStage) coreStage.classList.add('chat-active');
    if (greetingBox) greetingBox.style.display = 'none';

    if (chatContainer) {
      const userBubble = document.createElement('div');
      userBubble.style.cssText = 'text-align: right; margin: 10px 0; width: 100%;';
      userBubble.innerHTML = `
        <div style="font-size: 11px; color: #888; margin-bottom: 2px;">${localStorage.getItem('userName') || 'Eshwar'}</div>
        <div style="background: #27272a; padding: 10px 16px; border-radius: 16px; display: inline-block; color: #fff; font-size: 15px; max-width: 80%; text-align: left;">
          ${cleanText}
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
      const reply = await requestGeminiInteraction(cleanText);
      
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

  // 2. Settings View (Full Screen)
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
        <!-- 👉 మిస్ అయిన 'Set as phone assistant' ఆప్షన్ -->
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

      // 👉 Phone Assistant Settings ఓపెన్ చేయడానికి లిజనర్
      document.getElementById('set-phone-assistant')?.addEventListener('click', () => {
        window.location.href = 'intent:#Intent;action=android.settings.VOICE_INPUT_SETTINGS;end';
      });

      document.getElementById('set-api-key')?.addEventListener('click', () => {
        const key = prompt("Enter new API Key:", localStorage.getItem('jarvis_key') || '');
        if (key) { localStorage.setItem('jarvis_key', key); API_KEY = key; alert("API Key saved!"); }
      });
    });
  }


  bottomTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      bottomTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (index === 0) {
        const overlay = document.getElementById('full-screen-overlay');
        if (overlay) overlay.remove();
          // --- Bottom Sheet & Action Menu Integration ---
  const plusBtn = document.getElementById('plus-menu-btn');
  const closeBtn = document.getElementById('close-btn');
  const actionSheet = document.getElementById('action-sheet-menu');
  const backdrop = document.getElementById('action-sheet-backdrop');

  function openActionMenu() {
    if (actionSheet && backdrop) {
      actionSheet.classList.add('active');
      backdrop.classList.add('active');
    }
  }

  function closeActionMenu() {
    if (actionSheet && backdrop) {
      actionSheet.classList.remove('active');
      backdrop.classList.remove('active');
    }
  }

  if (plusBtn) plusBtn.addEventListener('click', openActionMenu);
  if (backdrop) backdrop.addEventListener('click', closeActionMenu);

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeActionMenu();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    });
  }

  document.getElementById('act-take-photo')?.addEventListener('click', () => {
    closeActionMenu();
    document.getElementById('camera-input')?.click();
  });

  document.getElementById('act-photo-library')?.addEventListener('click', () => {
    closeActionMenu();
    document.getElementById('gallery-input')?.click();
  });

  document.getElementById('act-file')?.addEventListener('click', () => {
    closeActionMenu();
    document.getElementById('file-input')?.click();
  });

  document.getElementById('act-live-camera')?.addEventListener('click', () => {
    closeActionMenu();
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          speakNaturally("Live camera feed initiated, Sir.");
        })
        .catch(err => {
          console.warn("Camera access denied:", err);
        });
    }
  });

      }
    });
  });
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

  // 👉 వాయిస్ ఇన్పుట్ సరిగ్గా హ్యాండిల్ చేయడం
  coreMic.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    
    const cleanText = transcript.trim();
    if (!cleanText) return;

    // మెసేజ్ పంపించడం (Reflex & Gemini రెండూ ఇందులో హ్యాండిల్ అవుతాయి)
    if (typeof triggerJarvisSend === 'function') {
      triggerJarvisSend(cleanText);
    }
  };

  coreMic.onerror = () => { isCoreListening = false; };
  coreMic.onend = () => { isCoreListening = false; };
}

// టెక్స్ట్ క్లీనింగ్ & స్పీచ్
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[*#_`~>\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function speakNaturally(textToSpeak) {
  if (!('speechSynthesis' in window)) return;
  const cleanText = cleanTextForSpeech(textToSpeak);
  if (!cleanText) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const naturalVoice = voices.find(v => 
    (v.name.includes('Google') || v.name.includes('Natural')) && 
    (v.lang.startsWith('en') || v.lang.startsWith('te'))
  ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

  if (naturalVoice) utterance.voice = naturalVoice;
  window.speechSynthesis.speak(utterance);
}
// ===== ORBIT ACTION CONTROLS & BOTTOM SHEET LOGIC =====
const menuContainer = document.getElementById('actionMenuContainer');
const micBtn = document.getElementById('mic-main-btn');
const closeBtn = document.getElementById('close-btn');
const plusBtn = document.getElementById('plus-menu-btn');

const actionSheet = document.getElementById('action-sheet-menu');
const backdrop = document.getElementById('action-sheet-backdrop');

// 1. స్పియర్ (గోళం) మీద టచ్ చేసినప్పుడు ఆర్బిట్ కంట్రోలర్ కనిపించేలా చేయడం
const sphereCanvas = document.getElementById('particle-sphere');
if (sphereCanvas && menuContainer) {
  sphereCanvas.addEventListener('click', () => {
    menuContainer.classList.add('show');
  });
}

// 2. క్లోజ్ బటన్ (✕) నొక్కితే మొత్తం మెనూ దాగిపోవడం
if (closeBtn && menuContainer) {
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuContainer.classList.remove('show');
    if (typeof isCoreListening !== 'undefined' && isCoreListening) {
      // వాయిస్ రికగ్నిషన్ ఆన్‌లో ఉంటే ఆపేయడం
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      isCoreListening = false;
    }
  });
}

// 3. ప్లస్ (+) బటన్ నొక్కినప్పుడు 'Take photo, Library, File' మెనూ ఓపెన్ చేయడం
if (plusBtn && actionSheet && backdrop) {
  plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    actionSheet.classList.add('active');
    backdrop.classList.add('active');
  });
}

// 4. బ్యాక్‌డ్రాప్ క్లిక్ చేస్తే బాటమ్ షీట్ క్లోజ్ అవ్వడం
if (backdrop && actionSheet) {
  backdrop.addEventListener('click', () => {
    actionSheet.classList.remove('active');
    backdrop.classList.remove('active');
  });
}

// 5. బాటమ్ షీట్ లోని ఐటెమ్స్ (Camera, Gallery, File) క్లిక్ యాక్షన్స్
document.getElementById('act-take-photo')?.addEventListener('click', () => {
  document.getElementById('camera-input')?.click();
  backdrop.click();
});

document.getElementById('act-photo-library')?.addEventListener('click', () => {
  document.getElementById('gallery-input')?.click();
  backdrop.click();
});

document.getElementById('act-file')?.addEventListener('click', () => {
  document.getElementById('file-input')?.click();
  backdrop.click();
});
