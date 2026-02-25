const MODULES_CORE = [
  { id: 'mod-01-owner-concierge', label: '01 Chat IA', title: '01 Chat IA' },
  { id: 'mod-02-whatsapp-crm', label: '02 CRM WhatsApp', title: '02 CRM WhatsApp' },
  { id: 'mod-03-clientes', label: '03 Clientes', title: '03 Clientes' },
  { id: 'mod-04-agenda', label: '04 Agenda', title: '04 Agenda' },
  { id: 'mod-05-faturamento-cobranca', label: '05 Cobranca', title: '05 Cobranca' }
];

const SETTINGS_MODULE = {
  id: 'mod-06-configuracoes',
  label: '06 Configuracoes',
  title: '06 Configuracoes'
};

const MODULE_COST_LABELS = {
  'mod-01-owner-concierge': 'Modulo 01 - Owner Concierge',
  'mod-02-whatsapp-crm': 'Modulo 02 - CRM WhatsApp',
  'mod-03-clientes': 'Modulo 03 - Clientes',
  'mod-04-agenda': 'Modulo 04 - Agenda',
  'mod-05-faturamento-cobranca': 'Modulo 05 - Faturamento/Cobranca'
};

const VALID_LAYOUTS = ['fabio2', 'studio'];
const VALID_PALETTES = ['ocean', 'forest', 'sunset'];
const CONFIG_STORAGE_KEY = 'owner_console_config_v1';
const SETTINGS_ADMIN_PASSWORD = '191530';
const SETTINGS_UNLOCK_SESSION_KEY = 'owner_console_settings_admin_unlock_v1';

const TENANT_THEME_PRESETS = {
  tenant_automania: { layout: 'fabio2', palette: 'ocean' },
  tenant_clinica: { layout: 'studio', palette: 'forest' },
  tenant_comercial: { layout: 'studio', palette: 'sunset' }
};

const state = {
  activeModuleId: 'mod-01-owner-concierge',
  continuous: false,
  speaking: false,
  pendingAttachments: [],
  mediaRecorder: null,
  mediaStream: null,
  config: null,
  settingsUnlocked: false
};

const rootEl = document.documentElement;
const bodyEl = document.body;

const moduleNavEl = document.getElementById('moduleNav');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const topModuleTitleEl = document.getElementById('topModuleTitle');
const topTenantLabelEl = document.getElementById('topTenantLabel');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const settingsLockStatusEl = document.getElementById('settingsLockStatus');

const chatWorkspaceEl = document.getElementById('chatWorkspace');
const modulePlaceholderWorkspaceEl = document.getElementById('modulePlaceholderWorkspace');
const settingsWorkspaceEl = document.getElementById('settingsWorkspace');
const placeholderTitleEl = document.getElementById('placeholderTitle');
const placeholderTextEl = document.getElementById('placeholderText');

const healthStatusEl = document.getElementById('healthStatus');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const pendingAttachmentsEl = document.getElementById('pendingAttachments');

const continuousBtn = document.getElementById('continuousBtn');
const continuousStateEl = document.getElementById('continuousState');
const avatarEl = document.getElementById('avatar');
const simulateVoiceBtn = document.getElementById('simulateVoiceBtn');
const lastRunEl = document.getElementById('lastRun');

const audioRecordBtn = document.getElementById('audioRecordBtn');
const photoPickBtn = document.getElementById('photoPickBtn');
const filePickBtn = document.getElementById('filePickBtn');
const photoInput = document.getElementById('photoInput');
const fileInput = document.getElementById('fileInput');

const healthBtn = document.getElementById('healthBtn');

const cfgApiBaseInput = document.getElementById('cfgApiBase');
const cfgTenantIdInput = document.getElementById('cfgTenantId');
const cfgSessionIdInput = document.getElementById('cfgSessionId');
const cfgRegenerateSessionBtn = document.getElementById('cfgRegenerateSessionBtn');
const cfgLayoutSelect = document.getElementById('cfgLayout');
const cfgPaletteSelect = document.getElementById('cfgPalette');
const cfgFxUsdBrlInput = document.getElementById('cfgFxUsdBrl');

const cfgOpenAiApiKeyInput = document.getElementById('cfgOpenAiApiKey');
const cfgOpenAiModelInput = document.getElementById('cfgOpenAiModel');
const cfgOpenAiVisionInput = document.getElementById('cfgOpenAiVision');
const cfgOpenAiVoiceInput = document.getElementById('cfgOpenAiVoice');
const cfgOpenAiImageGenInput = document.getElementById('cfgOpenAiImageGen');
const cfgOpenAiImageReadInput = document.getElementById('cfgOpenAiImageRead');
const cfgPersona1PromptInput = document.getElementById('cfgPersona1Prompt');
const cfgPersona2PromptInput = document.getElementById('cfgPersona2Prompt');

const cfgGoogleClientIdInput = document.getElementById('cfgGoogleClientId');
const cfgGoogleClientSecretInput = document.getElementById('cfgGoogleClientSecret');
const cfgGoogleRefreshTokenInput = document.getElementById('cfgGoogleRefreshToken');
const cfgEvolutionBaseUrlInput = document.getElementById('cfgEvolutionBaseUrl');
const cfgEvolutionApiKeyInput = document.getElementById('cfgEvolutionApiKey');
const cfgBillingProviderInput = document.getElementById('cfgBillingProvider');
const cfgBillingApiKeyInput = document.getElementById('cfgBillingApiKey');

const applyTenantThemeBtn = document.getElementById('applyTenantThemeBtn');
const lockSettingsBtn = document.getElementById('lockSettingsBtn');
const saveConfigBtn = document.getElementById('saveConfigBtn');
const resetMetricsBtn = document.getElementById('resetMetricsBtn');
const metricsRowsEl = document.getElementById('metricsRows');
const configStatusEl = document.getElementById('configStatus');

function createDefaultMetrics() {
  return {
    fx_usd_brl: 5.0,
    modules: {
      'mod-01-owner-concierge': { calls: 0, estimated_usd: 0, estimated_brl: 0 },
      'mod-02-whatsapp-crm': { calls: 0, estimated_usd: 0, estimated_brl: 0 },
      'mod-03-clientes': { calls: 0, estimated_usd: 0, estimated_brl: 0 },
      'mod-04-agenda': { calls: 0, estimated_usd: 0, estimated_brl: 0 },
      'mod-05-faturamento-cobranca': { calls: 0, estimated_usd: 0, estimated_brl: 0 }
    }
  };
}

function createDefaultConfig() {
  return {
    runtime: {
      api_base_url: 'http://127.0.0.1:4300',
      tenant_id: 'tenant_automania',
      session_id: crypto.randomUUID(),
      layout: 'fabio2',
      palette: 'ocean'
    },
    openai: {
      api_key: '',
      model: 'gpt-5.1-mini',
      vision_enabled: true,
      voice_enabled: true,
      image_generation_enabled: true,
      image_read_enabled: true
    },
    personas: {
      owner_concierge_prompt: '',
      whatsapp_agent_prompt: ''
    },
    integrations: {
      agenda_google: {
        client_id: '',
        client_secret: '',
        refresh_token: ''
      },
      crm_evolution: {
        base_url: '',
        api_key: ''
      },
      billing: {
        provider: '',
        api_key: ''
      }
    },
    metrics: createDefaultMetrics()
  };
}

function normalizeLayout(layout) {
  return VALID_LAYOUTS.includes(layout) ? layout : 'fabio2';
}

function normalizePalette(palette) {
  return VALID_PALETTES.includes(palette) ? palette : 'ocean';
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function mergeConfig(raw) {
  const defaults = createDefaultConfig();
  return {
    runtime: {
      ...defaults.runtime,
      ...(raw?.runtime ?? {}),
      layout: normalizeLayout(raw?.runtime?.layout ?? defaults.runtime.layout),
      palette: normalizePalette(raw?.runtime?.palette ?? defaults.runtime.palette),
      session_id: raw?.runtime?.session_id || defaults.runtime.session_id
    },
    openai: {
      ...defaults.openai,
      ...(raw?.openai ?? {})
    },
    personas: {
      ...defaults.personas,
      ...(raw?.personas ?? {})
    },
    integrations: {
      agenda_google: {
        ...defaults.integrations.agenda_google,
        ...(raw?.integrations?.agenda_google ?? {})
      },
      crm_evolution: {
        ...defaults.integrations.crm_evolution,
        ...(raw?.integrations?.crm_evolution ?? {})
      },
      billing: {
        ...defaults.integrations.billing,
        ...(raw?.integrations?.billing ?? {})
      }
    },
    metrics: {
      fx_usd_brl: safeNumber(raw?.metrics?.fx_usd_brl, defaults.metrics.fx_usd_brl),
      modules: {
        ...defaults.metrics.modules,
        ...(raw?.metrics?.modules ?? {})
      }
    }
  };
}

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return createDefaultConfig();
    const parsed = JSON.parse(raw);
    return mergeConfig(parsed);
  } catch {
    return createDefaultConfig();
  }
}

function persistConfig() {
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(state.config));
}

function loadSettingsUnlockState() {
  try {
    return sessionStorage.getItem(SETTINGS_UNLOCK_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function persistSettingsUnlockState(value) {
  try {
    if (value) {
      sessionStorage.setItem(SETTINGS_UNLOCK_SESSION_KEY, '1');
    } else {
      sessionStorage.removeItem(SETTINGS_UNLOCK_SESSION_KEY);
    }
  } catch {
    // no-op: session storage might be unavailable
  }
}

function renderSettingsLockStatus() {
  if (!settingsLockStatusEl) return;
  settingsLockStatusEl.textContent = state.settingsUnlocked ? 'admin: liberado' : 'admin: bloqueado';
  settingsLockStatusEl.classList.toggle('is-unlocked', state.settingsUnlocked);
  settingsLockStatusEl.classList.toggle('is-locked', !state.settingsUnlocked);
}

function getNavModules() {
  return [...MODULES_CORE, SETTINGS_MODULE];
}

function moduleMeta(moduleId) {
  return getNavModules().find((item) => item.id === moduleId) ?? SETTINGS_MODULE;
}

function renderModuleNav() {
  const items = getNavModules();
  moduleNavEl.innerHTML = items
    .map((item) => {
      const activeClass = item.id === state.activeModuleId ? ' is-active' : '';
      return `<button class="module-nav__item${activeClass}" type="button" data-module-id="${item.id}">${item.label}</button>`;
    })
    .join('');
}

function setTopbarLabels() {
  const meta = moduleMeta(state.activeModuleId);
  topModuleTitleEl.textContent = meta.title;
  topTenantLabelEl.textContent = state.config.runtime.tenant_id;
}

function setSpeaking(value) {
  state.speaking = value;
  avatarEl.dataset.state = value ? 'speaking' : 'idle';
}

function startSpeakingPulse(ms = 1400) {
  setSpeaking(true);
  window.setTimeout(() => setSpeaking(false), ms);
}

function applyVisualMode(layout, palette, persist = true) {
  const safeLayout = normalizeLayout(layout);
  const safePalette = normalizePalette(palette);
  rootEl.dataset.layout = safeLayout;
  rootEl.dataset.palette = safePalette;

  state.config.runtime.layout = safeLayout;
  state.config.runtime.palette = safePalette;

  if (persist) {
    persistConfig();
  }

  if (safeLayout === 'studio') {
    bodyEl.classList.remove('menu-open');
  }
}

function setActiveModule(moduleId) {
  if (moduleId === 'mod-06-configuracoes' && !requestSettingsAccess()) {
    return;
  }

  state.activeModuleId = moduleId;
  renderModuleNav();
  setTopbarLabels();

  if (moduleId === 'mod-01-owner-concierge') {
    chatWorkspaceEl.classList.remove('hidden');
    settingsWorkspaceEl.classList.add('hidden');
    modulePlaceholderWorkspaceEl.classList.add('hidden');
    return;
  }

  if (moduleId === 'mod-06-configuracoes') {
    chatWorkspaceEl.classList.add('hidden');
    settingsWorkspaceEl.classList.remove('hidden');
    modulePlaceholderWorkspaceEl.classList.add('hidden');
    renderMetricsTable();
    return;
  }

  const meta = moduleMeta(moduleId);
  placeholderTitleEl.textContent = `${meta.label} - Em evolucao`;
  placeholderTextEl.textContent = 'Fluxo principal ja mapeado em contratos. UI detalhada deste modulo entra no proximo ciclo.';
  chatWorkspaceEl.classList.add('hidden');
  settingsWorkspaceEl.classList.add('hidden');
  modulePlaceholderWorkspaceEl.classList.remove('hidden');
}

function apiBase() {
  return state.config.runtime.api_base_url.replace(/\/+$/, '');
}

function tenantId() {
  return state.config.runtime.tenant_id.trim();
}

function sessionId() {
  return state.config.runtime.session_id.trim();
}

function updateConfigStatus(text) {
  configStatusEl.textContent = text;
}

function requestSettingsAccess() {
  if (state.settingsUnlocked) return true;

  const typed = window.prompt('Digite a senha admin para abrir Configuracoes:');
  if (typed === null) {
    updateConfigStatus('Acesso admin cancelado.');
    return false;
  }

  if (typed.trim() !== SETTINGS_ADMIN_PASSWORD) {
    updateConfigStatus('Senha admin invalida para Configuracoes.');
    appendMessage('Senha admin invalida para abrir o modulo 06.', 'assistant');
    return false;
  }

  state.settingsUnlocked = true;
  persistSettingsUnlockState(true);
  renderSettingsLockStatus();
  updateConfigStatus('Acesso admin liberado nesta sessao.');
  return true;
}

function lockSettingsAccess() {
  state.settingsUnlocked = false;
  persistSettingsUnlockState(false);
  renderSettingsLockStatus();
  updateConfigStatus('Configuracoes bloqueadas por admin.');

  if (state.activeModuleId === 'mod-06-configuracoes') {
    setActiveModule('mod-01-owner-concierge');
  }
}

function appendMessage(text, role = 'assistant') {
  const el = document.createElement('article');
  el.className = role === 'owner' ? 'msg msg--owner' : 'msg msg--assistant';
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function populateConfigForm() {
  cfgApiBaseInput.value = state.config.runtime.api_base_url;
  cfgTenantIdInput.value = state.config.runtime.tenant_id;
  cfgSessionIdInput.value = state.config.runtime.session_id;
  cfgLayoutSelect.value = state.config.runtime.layout;
  cfgPaletteSelect.value = state.config.runtime.palette;
  cfgFxUsdBrlInput.value = String(state.config.metrics.fx_usd_brl);

  cfgOpenAiApiKeyInput.value = state.config.openai.api_key;
  cfgOpenAiModelInput.value = state.config.openai.model;
  cfgOpenAiVisionInput.checked = Boolean(state.config.openai.vision_enabled);
  cfgOpenAiVoiceInput.checked = Boolean(state.config.openai.voice_enabled);
  cfgOpenAiImageGenInput.checked = Boolean(state.config.openai.image_generation_enabled);
  cfgOpenAiImageReadInput.checked = Boolean(state.config.openai.image_read_enabled);
  cfgPersona1PromptInput.value = state.config.personas.owner_concierge_prompt;
  cfgPersona2PromptInput.value = state.config.personas.whatsapp_agent_prompt;

  cfgGoogleClientIdInput.value = state.config.integrations.agenda_google.client_id;
  cfgGoogleClientSecretInput.value = state.config.integrations.agenda_google.client_secret;
  cfgGoogleRefreshTokenInput.value = state.config.integrations.agenda_google.refresh_token;
  cfgEvolutionBaseUrlInput.value = state.config.integrations.crm_evolution.base_url;
  cfgEvolutionApiKeyInput.value = state.config.integrations.crm_evolution.api_key;
  cfgBillingProviderInput.value = state.config.integrations.billing.provider;
  cfgBillingApiKeyInput.value = state.config.integrations.billing.api_key;
}

function collectConfigForm() {
  state.config.runtime.api_base_url = cfgApiBaseInput.value.trim();
  state.config.runtime.tenant_id = cfgTenantIdInput.value.trim();
  state.config.runtime.session_id = cfgSessionIdInput.value.trim() || crypto.randomUUID();
  state.config.runtime.layout = normalizeLayout(cfgLayoutSelect.value);
  state.config.runtime.palette = normalizePalette(cfgPaletteSelect.value);

  state.config.metrics.fx_usd_brl = safeNumber(cfgFxUsdBrlInput.value, 5.0);

  state.config.openai.api_key = cfgOpenAiApiKeyInput.value.trim();
  state.config.openai.model = cfgOpenAiModelInput.value.trim() || 'gpt-5.1-mini';
  state.config.openai.vision_enabled = cfgOpenAiVisionInput.checked;
  state.config.openai.voice_enabled = cfgOpenAiVoiceInput.checked;
  state.config.openai.image_generation_enabled = cfgOpenAiImageGenInput.checked;
  state.config.openai.image_read_enabled = cfgOpenAiImageReadInput.checked;
  state.config.personas.owner_concierge_prompt = cfgPersona1PromptInput.value.trim();
  state.config.personas.whatsapp_agent_prompt = cfgPersona2PromptInput.value.trim();

  state.config.integrations.agenda_google.client_id = cfgGoogleClientIdInput.value.trim();
  state.config.integrations.agenda_google.client_secret = cfgGoogleClientSecretInput.value.trim();
  state.config.integrations.agenda_google.refresh_token = cfgGoogleRefreshTokenInput.value.trim();
  state.config.integrations.crm_evolution.base_url = cfgEvolutionBaseUrlInput.value.trim();
  state.config.integrations.crm_evolution.api_key = cfgEvolutionApiKeyInput.value.trim();
  state.config.integrations.billing.provider = cfgBillingProviderInput.value.trim();
  state.config.integrations.billing.api_key = cfgBillingApiKeyInput.value.trim();
}

function ensureModuleMetric(moduleId) {
  if (!state.config.metrics.modules[moduleId]) {
    state.config.metrics.modules[moduleId] = { calls: 0, estimated_usd: 0, estimated_brl: 0 };
  }
  return state.config.metrics.modules[moduleId];
}

function trackModuleSpend(moduleId, usdIncrement, callsIncrement = 1) {
  const metric = ensureModuleMetric(moduleId);
  metric.calls = safeNumber(metric.calls, 0) + callsIncrement;
  metric.estimated_usd = safeNumber(metric.estimated_usd, 0) + usdIncrement;
  metric.estimated_brl = metric.estimated_usd * state.config.metrics.fx_usd_brl;
  persistConfig();
  renderMetricsTable();
}

function renderMetricsTable() {
  const rows = Object.keys(MODULE_COST_LABELS).map((moduleId) => {
    const metric = ensureModuleMetric(moduleId);
    return `
      <tr>
        <td>${MODULE_COST_LABELS[moduleId]}</td>
        <td>${safeNumber(metric.calls, 0).toFixed(0)}</td>
        <td>$${safeNumber(metric.estimated_usd, 0).toFixed(4)}</td>
        <td>R$ ${safeNumber(metric.estimated_brl, 0).toFixed(2)}</td>
      </tr>
    `;
  });

  metricsRowsEl.innerHTML = rows.join('');
}

function buildAttachmentRef(fileName) {
  const safeName = encodeURIComponent(fileName || 'attachment');
  return `upload://local/${Date.now()}-${safeName}`;
}

function renderPendingAttachments() {
  if (state.pendingAttachments.length === 0) {
    pendingAttachmentsEl.innerHTML = '';
    return;
  }

  pendingAttachmentsEl.innerHTML = state.pendingAttachments
    .map((item) => `
      <div class="pending-item">
        <span>${item.type}:${item.filename}</span>
        <button type="button" data-remove-attachment="${item.id}" aria-label="Remover anexo">x</button>
      </div>
    `)
    .join('');
}

function addPendingAttachment(item) {
  state.pendingAttachments.push({
    id: crypto.randomUUID(),
    ...item
  });
  renderPendingAttachments();
}

function removePendingAttachment(id) {
  state.pendingAttachments = state.pendingAttachments.filter((item) => item.id !== id);
  renderPendingAttachments();
}

function estimateMessageCostUSD(attachments) {
  let value = 0.01;
  for (const item of attachments) {
    if (item.type === 'audio') value += 0.015;
    if (item.type === 'image') value += 0.008;
    if (item.type === 'file') value += 0.004;
  }
  return Number(value.toFixed(4));
}

function buildPersonaOverridesFromConfig() {
  const ownerPrompt = state.config.personas.owner_concierge_prompt.trim();
  const whatsappPrompt = state.config.personas.whatsapp_agent_prompt.trim();
  const overrides = {};
  if (ownerPrompt.length > 0) {
    overrides.owner_concierge_prompt = ownerPrompt;
  }
  if (whatsappPrompt.length > 0) {
    overrides.whatsapp_agent_prompt = whatsappPrompt;
  }
  return Object.keys(overrides).length > 0 ? overrides : null;
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
    trackModuleSpend('mod-01-owner-concierge', 0.001, 1);
  } catch (error) {
    appendMessage(`Falha ao alternar modo continuo: ${error.message}. Verifique API em ${apiBase()}.`);
  }
}

async function sendInteraction(text, attachments = []) {
  const outgoingText = text.trim().length > 0 ? text.trim() : '[anexo]';

  appendMessage(outgoingText, 'owner');
  if (attachments.length > 0) {
    appendMessage(`Anexos enviados: ${attachments.map((item) => item.filename).join(', ')}`, 'owner');
  }

  lastRunEl.textContent = `Ultima acao: ${new Date().toLocaleTimeString('pt-BR')}`;
  startSpeakingPulse(1500);

  const payload = {
    text: outgoingText
  };
  if (attachments.length > 0) {
    payload.attachments = attachments.map((item) => ({
      type: item.type,
      uri: item.uri,
      mime_type: item.mime_type,
      filename: item.filename
    }));
  }
  const personaOverrides = buildPersonaOverridesFromConfig();
  if (personaOverrides) {
    payload.persona_overrides = personaOverrides;
  }

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
          payload
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

    trackModuleSpend('mod-01-owner-concierge', estimateMessageCostUSD(attachments), 1);
  } catch (error) {
    appendMessage(`Falha de conexao com API (${apiBase()}): ${error.message}`);
  }
}

function stopMediaRecorder() {
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
  }
}

async function toggleAudioRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    appendMessage('Audio indisponivel neste navegador.', 'assistant');
    return;
  }

  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    stopMediaRecorder();
    return;
  }

  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(state.mediaStream);
    const chunks = [];

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener('stop', () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size > 0) {
        const fileName = `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
        addPendingAttachment({
          type: 'audio',
          uri: buildAttachmentRef(fileName),
          mime_type: blob.type || 'audio/webm',
          filename: fileName,
          size: blob.size
        });
      }

      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach((track) => track.stop());
      }

      state.mediaRecorder = null;
      state.mediaStream = null;
      audioRecordBtn.textContent = 'Audio';
      updateConfigStatus('Audio capturado e adicionado na fila de anexos.');
    });

    state.mediaRecorder = recorder;
    recorder.start();
    audioRecordBtn.textContent = 'Parar Gravacao';
  } catch (error) {
    appendMessage(`Falha ao iniciar gravacao de audio: ${error.message}`, 'assistant');
  }
}

function handleFilesSelected(fileList, forcedType = null) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  for (const file of files) {
    const type = forcedType ?? (file.type.startsWith('image/') ? 'image' : 'file');
    addPendingAttachment({
      type,
      uri: buildAttachmentRef(file.name),
      mime_type: file.type || (type === 'image' ? 'image/*' : 'application/octet-stream'),
      filename: file.name,
      size: file.size
    });
  }
}

function applyTenantTheme() {
  const tenant = state.config.runtime.tenant_id.toLowerCase();
  const preset = TENANT_THEME_PRESETS[tenant];

  if (!preset) {
    updateConfigStatus(`Sem preset visual para tenant ${tenant}.`);
    return;
  }

  state.config.runtime.layout = preset.layout;
  state.config.runtime.palette = preset.palette;
  cfgLayoutSelect.value = preset.layout;
  cfgPaletteSelect.value = preset.palette;
  applyVisualMode(preset.layout, preset.palette, false);
  persistConfig();
  updateConfigStatus(`Tema aplicado: layout=${preset.layout}, paleta=${preset.palette}.`);
}

function saveConfig() {
  collectConfigForm();
  applyVisualMode(state.config.runtime.layout, state.config.runtime.palette, false);
  persistConfig();
  setTopbarLabels();
  renderMetricsTable();
  updateConfigStatus('Configuracoes salvas localmente.');
  callHealth();
}

function resetMetrics() {
  state.config.metrics = createDefaultMetrics();
  state.config.metrics.fx_usd_brl = safeNumber(cfgFxUsdBrlInput.value, 5.0);
  persistConfig();
  renderMetricsTable();
  updateConfigStatus('Metricas resetadas.');
}

function bootstrapConfig() {
  state.config = mergeConfig(loadConfig());
  state.settingsUnlocked = loadSettingsUnlockState();
  applyVisualMode(state.config.runtime.layout, state.config.runtime.palette, false);
  populateConfigForm();
  renderMetricsTable();
  renderSettingsLockStatus();
  setTopbarLabels();
}

function setupEvents() {
  mobileMenuBtn.addEventListener('click', () => {
    if (rootEl.dataset.layout === 'studio') return;
    bodyEl.classList.toggle('menu-open');
  });

  moduleNavEl.addEventListener('click', (event) => {
    const target = event.target.closest('[data-module-id]');
    if (!target) return;
    setActiveModule(target.dataset.moduleId);
  });

  openSettingsBtn.addEventListener('click', () => {
    setActiveModule('mod-06-configuracoes');
  });

  healthBtn.addEventListener('click', callHealth);
  continuousBtn.addEventListener('click', toggleContinuousMode);
  simulateVoiceBtn.addEventListener('click', () => startSpeakingPulse(1800));

  saveConfigBtn.addEventListener('click', saveConfig);
  resetMetricsBtn.addEventListener('click', resetMetrics);
  applyTenantThemeBtn.addEventListener('click', applyTenantTheme);
  lockSettingsBtn.addEventListener('click', lockSettingsAccess);

  cfgRegenerateSessionBtn.addEventListener('click', () => {
    cfgSessionIdInput.value = crypto.randomUUID();
    updateConfigStatus('Session renovada. Clique em Salvar Config para aplicar.');
  });

  cfgLayoutSelect.addEventListener('change', () => {
    applyVisualMode(cfgLayoutSelect.value, cfgPaletteSelect.value, false);
  });

  cfgPaletteSelect.addEventListener('change', () => {
    applyVisualMode(cfgLayoutSelect.value, cfgPaletteSelect.value, false);
  });

  audioRecordBtn.addEventListener('click', toggleAudioRecording);

  photoPickBtn.addEventListener('click', () => photoInput.click());
  filePickBtn.addEventListener('click', () => fileInput.click());

  photoInput.addEventListener('change', () => {
    handleFilesSelected(photoInput.files, 'image');
    photoInput.value = '';
  });

  fileInput.addEventListener('change', () => {
    handleFilesSelected(fileInput.files);
    fileInput.value = '';
  });

  pendingAttachmentsEl.addEventListener('click', (event) => {
    const target = event.target.closest('[data-remove-attachment]');
    if (!target) return;
    removePendingAttachment(target.dataset.removeAttachment);
  });

  chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = messageInput.value.trim();
    const attachments = [...state.pendingAttachments];

    if (!text && attachments.length === 0) return;

    messageInput.value = '';
    state.pendingAttachments = [];
    renderPendingAttachments();

    sendInteraction(text, attachments);
  });
}

function bootstrap() {
  bootstrapConfig();
  renderModuleNav();
  setActiveModule('mod-01-owner-concierge');
  setupEvents();
  callHealth();
}

bootstrap();
