// ===== 1. MEMORY & STORAGE SETUP =====
let MEMORY = [];
try {
  const storedMemory = JSON.parse(localStorage.getItem('jarvis_memory') || '[]');
  if (Array.isArray(storedMemory)) {
    MEMORY = storedMemory.filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string');
  }
  function saveToHistory(userText) {
  if (!userText) return;
  const newEntry = {
    id: Date.now().toString(),
    title: userText.length > 30 ? userText.substring(0, 30) + '...' : userText,
    time: 'Just now · 1 turn',
    category: 'TODAY'
  };
  
  // Kotha chat ni list lo top ki add chesthundhi
  CONVERSATIONS.unshift(newEntry);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(CONVERSATIONS));
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

// ===== 2. DEVICE TOOLS =====
async function handleTools(text) {
  const t = text.toLowerCase().trim();
  
// --- DEVICE TOOLS / REFLEX LAYER ---
const DeviceTools = {
  // మిగతా ٹూల్స్ (Alarm, Timer, etc.) ఇక్కడ ఉంటాయి...

  // 1. Media Player Tool
  playMedia: function(spokenText) {
    routeMediaIntent(spokenText);
  }
};

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

  // Torch / Flashlight (Browser Camera Stream dwara control)
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
  // Spotify Direct Song Launcher (API కోటా తగ్గించడానికి)
  const musicMatch = t.match(/(?:play|ప్లే)\s+(.+?)(?:\s+(?:in|on|లో)\s+spotify)?$/i);
  if (musicMatch && (t.includes('spotify') || t.includes('song') || t.includes('పాట') || t.includes('play'))) {
    const query = encodeURIComponent(musicMatch[1].replace(/in spotify|on spotify/i, '').trim());
    window.location.href = `spotify:search:${query}`;
    return `Playing ${musicMatch[1]} on Spotify, Sir.`;
  }
  // ===== 1. ALARM SETTER TOOL =====
  if (t.includes('alarm') || t.includes('అలారం')) {
    // 6:30, 07:00 లేదా 6 am / pm సమయాలను గుర్తించే లాజిక్
    const timeMatch = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;

      // AM / PM ప్రకారం 24-గంటల ఫార్మాట్‌కి మార్చడం
      if (period === 'pm' && hour < 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;

      // Android Clock Intent ఫైర్ చేయడం
      const intentUrl = `intent:#Intent;action=android.intent.action.SET_ALARM;i.android.intent.extra.alarm.HOUR=${hour};i.android.intent.extra.alarm.MINUTES=${minutes};s.android.intent.extra.alarm.MESSAGE=Jarvis%20Alarm;b.android.intent.extra.alarm.SKIP_UI=false;end`;
      
      window.location.href = intentUrl;
      return `Setting an alarm for ${hour}:${minutes < 10 ? '0' + minutes : minutes}, Sir.`;
    } else {
      // సమయం చెప్పకపోతే క్లాక్ యాప్‌ను నేరుగా ఓపెన్ చేస్తుంది
      window.location.href = 'intent:#Intent;action=android.intent.action.SHOW_ALARMS;end';
      return 'Opening your Alarms, Sir.';
    }
  }

  // ===== 2. TIMER SETTER TOOL =====
  if (t.includes('timer') || t.includes('టైమర్')) {
    // 5 minutes, 10 seconds వంటి సమయాలను గుర్తించడం
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
// --- MEDIA ROUTING HANDLERS ---
function routeMediaIntent(spokenText) {
  const query = spokenText.toLowerCase().trim();

  // Strip common trigger prefixes
  const cleanTitle = query
    .replace(/^(play|watch|show me|open)\s+/i, '')
    .trim();

  const videoKeywords = [
    'trailer', 'teaser', 'video', 'movie', 'scene', 
    'clip', 'episode', 'gameplay', 'short', 'highlight'
  ];

  const musicKeywords = [
    'song', 'track', 'album', 'music', 'playlist', 'audio'
  ];

  const isVideo = videoKeywords.some(keyword => query.includes(keyword));
  const isMusic = musicKeywords.some(keyword => query.includes(keyword));

  if (isVideo) {
    playOnYouTube(cleanTitle);
  } else if (isMusic) {
    playOnSpotify(cleanTitle);
  } else {
    // Default: Song అని చెప్పకపోతే YouTube కే వెళ్తుంది
    playOnYouTube(cleanTitle);
  }
}

function playOnYouTube(searchQuery) {
  if (typeof speakNaturally === 'function') {
    speakNaturally(`Playing ${searchQuery} on YouTube.`);
  }
  const encodedQuery = encodeURIComponent(searchQuery);
  const intentUri = `intent://www.youtube.com/results?search_query=${encodedQuery}#Intent;scheme=https;package=com.google.android.youtube;end`;
  const webFallbackUri = `https://www.youtube.com/results?search_query=${encodedQuery}`;
  triggerAndroidOrWebIntent(intentUri, webFallbackUri);
}

function playOnSpotify(searchQuery) {
  if (typeof speakNaturally === 'function') {
    speakNaturally(`Playing ${searchQuery} on Spotify.`);
  }
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

  return null;
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
  // మీడియా టూల్ చెక్ (Gemini API కి వెళ్లకుండా నేరుగా ప్లే అవుతుంది)
  const lower = inputMessage.toLowerCase().trim();
  if (lower.startsWith('play') || lower.startsWith('watch') || lower.startsWith('show me')) {
    routeMediaIntent(inputMessage);
    return;
  }

  const toolResult = await handleTools(inputMessage);
  if (toolResult) return toolResult;

  const { GoogleGenAI } = await import('https://esm.run/@google/genai');
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  MEMORY.push({ role: 'user', text: inputMessage });
  
  // ఆటోమేటిక్ గా 3 సార్లు ట్రై చేయడానికి లూప్
  let attempts = 3;
  let response = null;
  // జార్విస్ బ్రెయిన్ & పర్సనాలిటీ
  const jarvisSystemPrompt = `
You are JARVIS, an ultra-intelligent, highly advanced, and loyal AI personal assistant built for your boss, Eshwar.
Guidelines for your responses:
1. Address the user respectfully as 'Sir' or 'Boss Eshwar'.
2. Tone: Crisp, intelligent, confident, witty, and polite (just like Tony Stark's JARVIS).
3. Brevity: Keep conversational answers concise and directly to the point. Deliver direct answers without unnecessary fluff.
4. Language: You can understand and respond fluently in Telugu, English, or mixed (Telugish) based on how Sir speaks to you.
5. Capabilities: You manage phone functions, remember preferences, and handle tasks with extreme precision.
`;

  response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
    config: {
      systemInstruction: jarvisSystemPrompt,
      temperature: 0.7,
    }
  });

  while (attempts > 0) {
    try {
      response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: MEMORY.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
      });
      break; // సక్సెస్ అయితే లూప్ నుంచి బయటకు వస్తుంది
    } catch (err) {
      attempts--;
      if (attempts === 0) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 సెకండ్లు ఆగి మళ్లీ ట్రై చేస్తుంది
    }
  }

  const reply = response?.text?.trim() || 'No response, Sir.';
  MEMORY.push({ role: 'model', text: reply });
  localStorage.setItem('jarvis_memory', JSON.stringify(MEMORY));
  return reply;
}


// ===== 4. UI CONTROLS & FULL SCREEN VIEWS =====
document.addEventListener('DOMContentLoaded', () => {
  initJarvisApp();
  initParticleSphere();
});

function initJarvisApp() {
  // Input mariyu Send Button elements ni safe ga select cheyadam
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
    
    // History lo save cheyadam
    if (typeof saveToHistory === 'function') {
      saveToHistory(cleanText);
    }

    // Sphere పైకి వెళ్లి చిన్నదై రొటేట్ అవ్వడానికి
    if (coreStage) coreStage.classList.add('chat-active');
    if (greetingBox) greetingBox.style.display = 'none';

    // 1. User Message Display
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

      // 2. Thinking Indicator Display
      const thinkingBubble = document.createElement('div');
      thinkingBubble.id = 'thinking-indicator';
      thinkingBubble.style.cssText = 'color: #3b82f6; font-size: 13px; font-weight: 500; margin: 8px 0; display: flex; align-items: center; gap: 6px;';
      thinkingBubble.innerHTML = `<span>●</span> <em>Thinking it over...</em>`;
      chatContainer.appendChild(thinkingBubble);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // 3. AI Interaction
    try {
      const reply = await requestGeminiInteraction(cleanText);
      
      const indicator = document.getElementById('thinking-indicator');
      if (indicator) indicator.remove();

      if (chatContainer) {
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

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      }
    } catch (err) {
      const indicator = document.getElementById('thinking-indicator');
      if (indicator) indicator.remove();
      if (chatContainer) {
        chatContainer.innerHTML += `<div style="color: #ef4444; font-size: 13px; margin: 6px 0;">Error: ${err.message}</div>`;
      }
    }
  };

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

  // Type Drawer Toggle
  if (typeTrigger && inputDrawer) {
    typeTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = inputDrawer.style.display === 'none' || !inputDrawer.style.display;
      inputDrawer.style.display = isHidden ? 'flex' : 'none';
      if (isHidden && inputField) inputField.focus();
    });
  }

  // ఫుల్ స్క్రీన్ మోడల్ ఓపెన్ చేయడానికి యూనివర్సల్ హెల్పర్
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

  // 1. History View (Full Screen)
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
        
        <div style="font-size:11px; color:#71717a; font-weight:bold; letter-spacing:1px; margin:24px 0 12px 0;">THIS WEEK</div>
        ${CONVERSATIONS.filter(c => c.category === 'THIS WEEK').map(c => `
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

  // 3. Bottom Tabs -> Full Screen Views (Fixed Loop Header)
  bottomTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      bottomTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (index === 0) {
        const overlay = document.getElementById('full-screen-overlay');
        if (overlay) overlay.remove();
      } 
      else if (index === 1) {
        const html = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; padding-top:10px;">
            <span class="back-to-home" style="cursor:pointer; font-size:32px; line-height:1;">‹</span>
            <h2 style="font-size:22px; margin:0; font-weight:600;">Sat, 31 Oct</h2>
            <button style="background:#2563eb; color:#fff; border:none; padding:8px 18px; border-radius:20px; font-weight:500;">Brief me</button>
          </div>
          <div style="font-size:11px; color:#71717a; margin-bottom:12px; font-weight:bold; letter-spacing:1px;">NO DATE YET</div>
          <div style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:12px;">
            <div style="font-weight:500; font-size:15px; margin-bottom:10px;">building a Jarvis to control the phone</div>
            <div style="font-size:12px; color:#71717a; display:flex; justify-content:space-between;"><span>you owe · open 26d</span><span style="color:#22c55e; font-weight:500;">✓ Done</span></div>
          </div>
          <div style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:12px;">
            <div style="font-weight:500; font-size:15px; margin-bottom:10px;">writing biology workbook procedure</div>
            <div style="font-size:12px; color:#71717a; display:flex; justify-content:space-between;"><span>you owe · open 3d</span><span style="color:#22c55e; font-weight:500;">✓ Done</span></div>
          </div>
        `;
        showFullScreenView(html);
      } 
      else if (index === 2) {
        const html = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; padding-top:10px;">
            <span class="back-to-home" style="cursor:pointer; font-size:32px; line-height:1;">‹</span>
            <h2 style="font-size:22px; margin:0; font-weight:600;">Memory</h2>
            <span></span>
          </div>
          <input placeholder="Search what Jarvis knows..." style="width:100%; box-sizing:border-box; background:#18181b; border:1px solid #27272a; padding:14px; border-radius:14px; color:#fff; margin-bottom:16px; font-size:14px;">
          <div style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:12px;">
            <div style="font-size:11px; color:#888; display:flex; justify-content:space-between; margin-bottom:6px;"><span>You</span><span style="color:#60a5fa; font-weight:bold;">NEW</span></div>
            <div style="font-size:15px; font-weight:500;">Your name is Ishwar.</div>
          </div>
        `;
        showFullScreenView(html);
      } 
      else if (index === 3) {
        const html = `
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; padding-top:10px;">
            <span class="back-to-home" style="cursor:pointer; font-size:32px; line-height:1;">‹</span>
            <h2 style="font-size:22px; margin:0; font-weight:600;">Files</h2>
            <span></span>
          </div>
          <input placeholder="Search your files..." style="width:100%; box-sizing:border-box; background:#18181b; border:1px solid #27272a; padding:14px; border-radius:14px; color:#fff; margin-bottom:16px; font-size:14px;">
          <div style="background:#18181b; padding:16px; border-radius:14px; margin-bottom:12px;">
            <h3 style="font-size:15px; margin:0 0 6px 0;">Eshwar's Photo</h3>
            <p style="font-size:12px; color:#888; margin:0;">![User photo](content://media/external/images/media/123)</p>
          </div>
        `;
        showFullScreenView(html);
      }
    });
  });
}

// ===== 5. 3D PARTICLE SPHERE & TOUCH MIC ANIMATION =====
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
      
      // Mic on ayithe cyan color, lekunte white color lo glow avuthundi
      if (isCoreListening) {
        ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
      } else {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      }
      ctx.fill();
    });
    requestAnimationFrame(render);
  }
  render();

  // Speech Recognition integration for Sphere Touch
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
  const lower = cleanText.toLowerCase();

  // ----------------------------------------------------
  // 👉 సరిగ్గా ఇక్కడ పెట్టాలి (Reflex Check)
  // ----------------------------------------------------
  if (lower.startsWith('play') || lower.startsWith('watch') || lower.startsWith('show me')) {
    routeMediaIntent(cleanText);
    return; // ఇక్కడితో అయిపోతుంది, కింద ఉన్న Gemini API కి వెళ్లదు
  }

  // ----------------------------------------------------
  // దీని కింద మిగతా Gemini API / Chat handling కోడ్ ఉంటుంది
  // ----------------------------------------------------
  sendToGemini(cleanText);
};
    
    // Voice command ni execute cheyadaniki input field lo petti send kottadam
    const inputField = document.getElementById('msg');
    const sendButton = document.getElementById('send');
    if (inputField && sendButton) {
      inputField.value = voiceText;
      sendButton.click();
    }
  };

    coreMic.onerror = () => { isCoreListening = false; };
  coreMic.onend = () => { isCoreListening = false; };
}

// టెక్స్ట్‌లోని మార్క్‌డౌన్ సింబల్స్, ఎమోజీలను తొలగించే ఫంక్షన్
function cleanTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '')
    .replace(/[*#_`~>\[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// సహజమైన గూగుల్ వాయిస్‌తో మాట్లాడే ఫంక్షన్
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

  if (naturalVoice) {
    utterance.voice = naturalVoice;
  }

  window.speechSynthesis.speak(utterance);
}

// వాయిస్‌లు లోడ్ అవ్వడానికి లిజనర్
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}
