const state = {
  continuous: false,
  speaking: false
};

const VALID_LAYOUTS = ['fabio2', 'studio'];
const VALID_PALETTES = ['ocean', 'forest', 'sunset'];

// Editar este mapa para definir tema padrao por cliente/tenant.
const TENANT_THEME_PRESETS = {
  tenant_automania: { layout: 'fabio2', palette: 'ocean' },
  tenant_clinica: { layout: 'studio', palette: 'forest' },
  tenant_comercial: { layout: 'studio', palette: 'sunset' }
};

const rootEl = document.documentElement;
const bodyEl = document.body;
const mobileMenuBtn = document.getElementById('mobileMenuBtn');

const apiBaseInput = document.getElementById('apiBase');
const tenantIdInput = document.getElementById('tenantId');
const sessionIdInput = document.getElementById('sessionId');
const healthStatusEl = document.getElementById('healthStatus');
const continuousBtn = document.getElementById('continuousBtn');
const continuousStateEl = document.getElementById('continuousState');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const avatarEl = document.getElementById('avatar');
const simulateVoiceBtn = document.getElementById('simulateVoiceBtn');
const lastRunEl = document.getElementById('lastRun');
const layoutSelect = document.getElementById('layoutSelect');
const paletteSelect = document.getElementById('paletteSelect');
const applyTenantThemeBtn = document.getElementById('applyTenantThemeBtn');

sessionIdInput.value = crypto.randomUUID();

function normalizeLayout(layout) {
  return VALID_LAYOUTS.includes(layout) ? layout : 'fabio2';
}

function normalizePalette(palette) {
  return VALID_PALETTES.includes(palette) ? palette : 'ocean';
}

function applyVisualMode({ layout, palette, persist = true }) {
  const safeLayout = normalizeLayout(layout);
  const safePalette = normalizePalette(palette);
  rootEl.dataset.layout = safeLayout;
  rootEl.dataset.palette = safePalette;
  layoutSelect.value = safeLayout;
  paletteSelect.value = safePalette;

  if (persist) {
    localStorage.setItem('owner_console_layout', safeLayout);
    localStorage.setItem('owner_console_palette', safePalette);
  }

  if (safeLayout === 'studio') {
    bodyEl.classList.remove('menu-open');
  }
}

function restoreVisualMode() {
  const persistedLayout = localStorage.getItem('owner_console_layout');
  const persistedPalette = localStorage.getItem('owner_console_palette');
  applyVisualMode({
    layout: persistedLayout ?? rootEl.dataset.layout,
    palette: persistedPalette ?? rootEl.dataset.palette,
    persist: false
  });
}

function applyTenantTheme() {
  const tenant = tenantId().toLowerCase();
  const preset = TENANT_THEME_PRESETS[tenant];

  if (!preset) {
    appendMessage(`Sem preset visual para tenant "${tenant}". Mantendo layout atual.`, 'assistant');
    return;
  }

  applyVisualMode({
    layout: preset.layout,
    palette: preset.palette,
    persist: true
  });

  appendMessage(
    `Tema aplicado para ${tenant}: layout=${preset.layout}, palette=${preset.palette}.`,
    'assistant'
  );
}

function apiBase() {
  return apiBaseInput.value.replace(/\/+$/, '');
}

function tenantId() {
  return tenantIdInput.value.trim();
}

function sessionId() {
  return sessionIdInput.value.trim();
}

function appendMessage(text, role = 'assistant') {
  const el = document.createElement('article');
  el.className = role === 'owner' ? 'msg msg--owner' : 'msg msg--assistant';
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setSpeaking(value) {
  state.speaking = value;
  avatarEl.dataset.state = value ? 'speaking' : 'idle';
}

function startSpeakingPulse(ms = 1300) {
  setSpeaking(true);
  window.setTimeout(() => setSpeaking(false), ms);
}

async function callHealth() {
  healthStatusEl.textContent = 'checking...';
  try {
    const response = await fetch(`${apiBase()}/health`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    healthStatusEl.textContent = body.status === 'ok' ? 'online' : 'degraded';
  } catch {
    healthStatusEl.textContent = 'offline';
  }
}

async function toggleContinuousMode() {
  const next = !state.continuous;
  try {
    const response = await fetch(`${apiBase()}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          session_id: sessionId(),
          operation: 'toggle_continuous_mode',
          channel: 'ui-avatar',
          payload: { enabled: next }
        }
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.continuous = next;
    continuousStateEl.textContent = state.continuous ? 'continuous' : 'one-shot';
    continuousBtn.textContent = state.continuous ? 'Pausar Continuo' : 'Ativar Continuo';
    appendMessage(state.continuous ? 'Modo continuo ativado.' : 'Modo continuo pausado.');
  } catch (error) {
    appendMessage(`Falha ao alternar modo continuo: ${error.message}`);
  }
}

async function sendInteraction(message) {
  appendMessage(message, 'owner');
  lastRunEl.textContent = `Ultima acao: ${new Date().toLocaleTimeString('pt-BR')}`;
  startSpeakingPulse(1500);

  try {
    const response = await fetch(`${apiBase()}/v1/owner-concierge/interaction`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          session_id: sessionId(),
          operation: 'send_message',
          channel: 'ui-chat',
          payload: { text: message }
        }
      })
    });

    const body = await response.json();
    if (!response.ok) {
      appendMessage(`Erro runtime: ${body.error ?? response.status}`);
      return;
    }

    const status = body.response?.status ?? 'unknown';
    const output = body.response?.assistant_output?.text ?? 'Comando recebido.';
    const tasks = Array.isArray(body.response?.downstream_tasks)
      ? ` | tasks: ${body.response.downstream_tasks.length}`
      : '';
    appendMessage(`[${status}] ${output}${tasks}`);
  } catch (error) {
    appendMessage(`Falha de conexao: ${error.message}`);
  }
}

mobileMenuBtn.addEventListener('click', () => {
  if (rootEl.dataset.layout === 'studio') return;
  bodyEl.classList.toggle('menu-open');
});

document.getElementById('healthBtn').addEventListener('click', callHealth);
continuousBtn.addEventListener('click', toggleContinuousMode);
simulateVoiceBtn.addEventListener('click', () => startSpeakingPulse(2000));

layoutSelect.addEventListener('change', (event) => {
  applyVisualMode({ layout: event.target.value, palette: paletteSelect.value, persist: true });
});

paletteSelect.addEventListener('change', (event) => {
  applyVisualMode({ layout: layoutSelect.value, palette: event.target.value, persist: true });
});

applyTenantThemeBtn.addEventListener('click', applyTenantTheme);

tenantIdInput.addEventListener('blur', () => {
  const tenant = tenantId().toLowerCase();
  if (TENANT_THEME_PRESETS[tenant]) {
    applyVisualMode({
      layout: TENANT_THEME_PRESETS[tenant].layout,
      palette: TENANT_THEME_PRESETS[tenant].palette,
      persist: true
    });
  }
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;
  messageInput.value = '';
  sendInteraction(message);
});

restoreVisualMode();
callHealth();
