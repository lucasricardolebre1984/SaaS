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
const LEGACY_DEFAULT_API_BASE = 'http://127.0.0.1:4300';
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
  continuousListening: false,
  continuousRecognition: null,
  continuousRestartTimer: null,
  continuousSpeechAudio: null,
  continuousSpeechOutputActive: false,
  speaking: false,
  pendingAttachments: [],
  mediaRecorder: null,
  mediaStream: null,
  config: null,
  settingsUnlocked: false,
  moduleData: {
    customers: [],
    customerDetail: null,
    reminders: [],
    charges: [],
    appointments: [],
    confirmations: []
  }
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
const moduleWorkspaceEl = document.getElementById('moduleWorkspace');
const modulePlaceholderWorkspaceEl = document.getElementById('modulePlaceholderWorkspace');
const settingsWorkspaceEl = document.getElementById('settingsWorkspace');
const placeholderTitleEl = document.getElementById('placeholderTitle');
const placeholderTextEl = document.getElementById('placeholderText');

const moduleClientesViewEl = document.getElementById('moduleClientesView');
const moduleAgendaViewEl = document.getElementById('moduleAgendaView');
const moduleBillingViewEl = document.getElementById('moduleBillingView');
const moduleCrmViewEl = document.getElementById('moduleCrmView');
const crmEmbeddedFrameEl = document.getElementById('crmEmbeddedFrame');

const customerCreateForm = document.getElementById('customerCreateForm');
const customerNameInput = document.getElementById('customerName');
const customerPhoneInput = document.getElementById('customerPhone');
const customerEmailInput = document.getElementById('customerEmail');
const customerOriginSelect = document.getElementById('customerOrigin');
const customerLeadIdInput = document.getElementById('customerLeadId');
const customersStatusEl = document.getElementById('customersStatus');
const customersRefreshBtn = document.getElementById('customersRefreshBtn');
const customersRowsEl = document.getElementById('customersRows');
const customerDetailIdInput = document.getElementById('customerDetailId');
const customerDetailBtn = document.getElementById('customerDetailBtn');
const customerDetailOutputEl = document.getElementById('customerDetailOutput');
const customerIdOptionsEl = document.getElementById('customerIdOptions');

const appointmentCreateForm = document.getElementById('appointmentCreateForm');
const appointmentTitleInput = document.getElementById('appointmentTitle');
const appointmentDescriptionInput = document.getElementById('appointmentDescription');
const appointmentStartInput = document.getElementById('appointmentStart');
const appointmentEndInput = document.getElementById('appointmentEnd');
const appointmentTimezoneInput = document.getElementById('appointmentTimezone');
const appointmentStatusInput = document.getElementById('appointmentStatus');
const appointmentUpdateForm = document.getElementById('appointmentUpdateForm');
const appointmentUpdateIdInput = document.getElementById('appointmentUpdateId');
const appointmentUpdateTitleInput = document.getElementById('appointmentUpdateTitle');
const appointmentUpdateStatusInput = document.getElementById('appointmentUpdateStatus');
const appointmentUpdateStartInput = document.getElementById('appointmentUpdateStart');
const appointmentUpdateEndInput = document.getElementById('appointmentUpdateEnd');
const appointmentsRowsEl = document.getElementById('appointmentsRows');
const appointmentIdOptionsEl = document.getElementById('appointmentIdOptions');
const reminderCreateForm = document.getElementById('reminderCreateForm');
const reminderAppointmentIdInput = document.getElementById('reminderAppointmentId');
const reminderScheduleInput = document.getElementById('reminderSchedule');
const reminderChannelInput = document.getElementById('reminderChannel');
const reminderMessageInput = document.getElementById('reminderMessage');
const reminderRecipientInput = document.getElementById('reminderRecipient');
const remindersRefreshBtn = document.getElementById('remindersRefreshBtn');
const remindersRowsEl = document.getElementById('remindersRows');
const agendaStatusEl = document.getElementById('agendaStatus');

const chargeCreateForm = document.getElementById('chargeCreateForm');
const chargeCustomerIdInput = document.getElementById('chargeCustomerId');
const chargeAmountInput = document.getElementById('chargeAmount');
const chargeCurrencyInput = document.getElementById('chargeCurrency');
const chargeDueDateInput = document.getElementById('chargeDueDate');
const chargeStatusInput = document.getElementById('chargeStatus');
const chargeUpdateForm = document.getElementById('chargeUpdateForm');
const chargeUpdateIdInput = document.getElementById('chargeUpdateId');
const chargeUpdateAmountInput = document.getElementById('chargeUpdateAmount');
const chargeUpdateDueDateInput = document.getElementById('chargeUpdateDueDate');
const chargeUpdateStatusInput = document.getElementById('chargeUpdateStatus');
const collectionRequestForm = document.getElementById('collectionRequestForm');
const collectionChargeIdInput = document.getElementById('collectionChargeId');
const collectionPhoneInput = document.getElementById('collectionPhone');
const collectionMessageInput = document.getElementById('collectionMessage');
const paymentCreateForm = document.getElementById('paymentCreateForm');
const paymentChargeIdInput = document.getElementById('paymentChargeId');
const paymentAmountInput = document.getElementById('paymentAmount');
const paymentCurrencyInput = document.getElementById('paymentCurrency');
const paymentStatusInput = document.getElementById('paymentStatus');
const chargesRefreshBtn = document.getElementById('chargesRefreshBtn');
const chargesRowsEl = document.getElementById('chargesRows');
const chargeIdOptionsEl = document.getElementById('chargeIdOptions');
const billingStatusEl = document.getElementById('billingStatus');

const healthStatusEl = document.getElementById('healthStatus');
const assistantProviderStatusEl = document.getElementById('assistantProviderStatus');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const pendingAttachmentsEl = document.getElementById('pendingAttachments');
const confirmationsStatusEl = document.getElementById('confirmationsStatus');
const confirmationsRowsEl = document.getElementById('confirmationsRows');
const confirmationsStatusFilterEl = document.getElementById('confirmationsStatusFilter');
const confirmationsLimitEl = document.getElementById('confirmationsLimit');
const confirmationsRefreshBtn = document.getElementById('confirmationsRefreshBtn');

const continuousBtn = document.getElementById('continuousBtn');
const continuousStateEl = document.getElementById('continuousState');
const continuousBackBtn = document.getElementById('continuousBackBtn');
const avatarEl = document.getElementById('avatar');
const simulateVoiceBtn = document.getElementById('simulateVoiceBtn');
const lastRunEl = document.getElementById('lastRun');
const avatarIdleVideoEl = document.querySelector('.avatar__video--idle');
const avatarSpeakingVideoEl = document.querySelector('.avatar__video--speaking');

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

const AVATAR_VIDEO_WEBM = './avatar/assets/avatar-fullscreen.webm';
const AVATAR_VIDEO_MP4 = './avatar/assets/avatar-fullscreen.mp4';
const OPENAI_TTS_DEFAULT_MODEL = 'gpt-4o-mini-tts';
const OPENAI_TTS_DEFAULT_VOICE = 'shimmer';
const OPENAI_TTS_DEFAULT_SPEED = 1.12;
const MAX_INLINE_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_EXCERPT_CHARS = 12000;

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

function chooseAvatarVideoSource() {
  // Prefer MP4 for maximum browser compatibility in the current local stack.
  return AVATAR_VIDEO_MP4;
}

function safePlayVideo(videoEl) {
  if (!videoEl) return;
  const playResult = videoEl.play();
  if (playResult && typeof playResult.catch === 'function') {
    playResult.catch(() => {});
  }
}

function ensureAvatarPlayback() {
  safePlayVideo(avatarIdleVideoEl);
  safePlayVideo(avatarSpeakingVideoEl);
}

function registerAvatarVideoFallback(videoEl) {
  if (!videoEl) return;
  videoEl.addEventListener('error', () => {
    const currentSrc = String(videoEl.currentSrc || videoEl.src || '');
    if (currentSrc.includes('avatar-fullscreen.mp4')) {
      return;
    }
    videoEl.src = AVATAR_VIDEO_MP4;
    videoEl.load();
    safePlayVideo(videoEl);
  });
}

function applyAvatarVideoSource() {
  const source = chooseAvatarVideoSource();
  if (avatarIdleVideoEl) {
    avatarIdleVideoEl.src = source;
    avatarIdleVideoEl.load();
  }
  if (avatarSpeakingVideoEl) {
    avatarSpeakingVideoEl.src = source;
    avatarSpeakingVideoEl.load();
  }
  ensureAvatarPlayback();
}

function isUnifiedUiRuntime() {
  const pathname = window.location.pathname || '/';
  return pathname.startsWith('/owner') || pathname.startsWith('/crm');
}

function deriveDefaultApiBase() {
  if (isUnifiedUiRuntime()) {
    return `${window.location.origin}/api`;
  }
  return LEGACY_DEFAULT_API_BASE;
}

function normalizeApiBase(value) {
  const raw = String(value ?? '').trim();
  if (raw.length === 0) {
    return deriveDefaultApiBase();
  }
  return raw.replace(/\/+$/, '');
}

function createDefaultConfig() {
  return {
    runtime: {
      api_base_url: deriveDefaultApiBase(),
      tenant_id: 'tenant_automania',
      session_id: crypto.randomUUID(),
      layout: 'fabio2',
      palette: 'ocean'
    },
    openai: {
      api_key: '',
      model: 'gpt-5.1',
      vision_enabled: true,
      voice_enabled: true,
      image_generation_enabled: true,
      image_read_enabled: true
    },
    personas: {
      owner_concierge_prompt: '',
      whatsapp_agent_prompt: ''
    },
    execution: {
      confirmations_enabled: false
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
  const configuredApiBase = normalizeApiBase(raw?.runtime?.api_base_url ?? defaults.runtime.api_base_url);
  const migratedApiBase = (
    isUnifiedUiRuntime() &&
    configuredApiBase === LEGACY_DEFAULT_API_BASE
  )
    ? deriveDefaultApiBase()
    : configuredApiBase;

  return {
    runtime: {
      ...defaults.runtime,
      ...(raw?.runtime ?? {}),
      api_base_url: migratedApiBase,
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
    execution: {
      ...defaults.execution,
      ...(raw?.execution ?? {})
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

function setAssistantProviderStatus(provider, options = {}) {
  if (!assistantProviderStatusEl) return;

  const normalized = String(provider ?? 'none').trim().toLowerCase() || 'none';
  assistantProviderStatusEl.classList.remove(
    'is-provider-openai',
    'is-provider-local',
    'is-provider-none',
    'is-provider-error'
  );

  let text = `provider: ${normalized}`;
  let title = '';

  if (normalized === 'openai') {
    assistantProviderStatusEl.classList.add('is-provider-openai');
    text = options.configuredOnly ? 'provider: openai*' : 'provider: openai';
  } else if (normalized === 'local') {
    assistantProviderStatusEl.classList.add('is-provider-local');
    text = options.configuredOnly ? 'provider: local*' : 'provider: local';
  } else if (normalized === 'error') {
    assistantProviderStatusEl.classList.add('is-provider-error');
    text = 'provider: error';
  } else if (normalized === 'none') {
    assistantProviderStatusEl.classList.add('is-provider-none');
    text = 'provider: none';
  } else {
    assistantProviderStatusEl.classList.add('is-provider-none');
  }

  if (typeof options.model === 'string' && options.model.trim().length > 0 && normalized === 'openai') {
    text = `${text} (${options.model.trim()})`;
  }
  if (typeof options.fallbackReason === 'string' && options.fallbackReason.trim().length > 0) {
    title = options.fallbackReason.trim();
  }
  if (typeof options.errorDetails === 'string' && options.errorDetails.trim().length > 0) {
    title = options.errorDetails.trim();
  }

  assistantProviderStatusEl.textContent = text;
  assistantProviderStatusEl.title = title;
}

function getNavModules() {
  return [...MODULES_CORE, SETTINGS_MODULE];
}

function moduleMeta(moduleId) {
  return getNavModules().find((item) => item.id === moduleId) ?? SETTINGS_MODULE;
}

const MODULE_WORKSPACE_IDS = new Set([
  'mod-02-whatsapp-crm',
  'mod-03-clientes',
  'mod-04-agenda',
  'mod-05-faturamento-cobranca'
]);

const MODULE_VIEW_BY_ID = {
  'mod-02-whatsapp-crm': moduleCrmViewEl,
  'mod-03-clientes': moduleClientesViewEl,
  'mod-04-agenda': moduleAgendaViewEl,
  'mod-05-faturamento-cobranca': moduleBillingViewEl
};

function crmEmbeddedUrl() {
  const params = new URLSearchParams({
    tenant: tenantId(),
    api: apiBase(),
    layout: state.config.runtime.layout,
    palette: state.config.runtime.palette,
    embedded: '1'
  });
  return `/crm/?${params.toString()}`;
}

function syncCrmEmbeddedFrame(forceReload = false) {
  if (!crmEmbeddedFrameEl) return;
  const nextUrl = crmEmbeddedUrl();
  const currentUrl = crmEmbeddedFrameEl.dataset.currentSrc || crmEmbeddedFrameEl.getAttribute('src') || '';
  if (!forceReload && currentUrl === nextUrl) {
    return;
  }
  crmEmbeddedFrameEl.src = nextUrl;
  crmEmbeddedFrameEl.dataset.currentSrc = nextUrl;
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

function setModuleStatus(element, text, isError = false) {
  if (!element) return;
  element.textContent = text;
  element.classList.toggle('status-error', Boolean(isError));
}

function toIsoFromLocal(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString('pt-BR');
}

function toCurrency(amount, currency = 'BRL') {
  const normalized = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  if (currency === 'BRL') {
    return normalized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return `${currency} ${normalized.toFixed(2)}`;
}

function updateDatalist(element, values) {
  if (!element) return;
  const uniq = [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))];
  element.innerHTML = uniq.map((value) => `<option value="${value}"></option>`).join('');
}

function mergeAppointmentInSession(appointment) {
  if (!appointment?.appointment_id) return;
  const index = state.moduleData.appointments.findIndex(
    (item) => item.appointment_id === appointment.appointment_id
  );
  if (index >= 0) {
    state.moduleData.appointments[index] = appointment;
  } else {
    state.moduleData.appointments.unshift(appointment);
  }
  state.moduleData.appointments = state.moduleData.appointments.slice(0, 20);
}

function mergeChargeInSession(charge) {
  if (!charge?.charge_id) return;
  const index = state.moduleData.charges.findIndex((item) => item.charge_id === charge.charge_id);
  if (index >= 0) {
    state.moduleData.charges[index] = charge;
  } else {
    state.moduleData.charges.unshift(charge);
  }
  state.moduleData.charges = state.moduleData.charges.slice(0, 30);
}

function renderCustomersTable() {
  if (!customersRowsEl) return;
  if (state.moduleData.customers.length === 0) {
    customersRowsEl.innerHTML = '<tr><td colspan="5">Sem clientes para este tenant.</td></tr>';
    updateDatalist(customerIdOptionsEl, []);
    return;
  }

  customersRowsEl.innerHTML = state.moduleData.customers
    .map(
      (item) => `
      <tr>
        <td>${item.display_name ?? '-'}</td>
        <td>${item.primary_phone ?? '-'}</td>
        <td>${item.primary_email ?? '-'}</td>
        <td>${item.status ?? '-'}</td>
        <td><code>${item.customer_id}</code></td>
      </tr>
    `
    )
    .join('');

  updateDatalist(
    customerIdOptionsEl,
    state.moduleData.customers.map((item) => item.customer_id)
  );
}

function renderAppointmentsTable() {
  if (!appointmentsRowsEl) return;
  if (state.moduleData.appointments.length === 0) {
    appointmentsRowsEl.innerHTML = '<tr><td colspan="5">Sem appointments nesta sessao.</td></tr>';
    updateDatalist(appointmentIdOptionsEl, []);
    return;
  }

  appointmentsRowsEl.innerHTML = state.moduleData.appointments
    .map(
      (item) => `
      <tr>
        <td>${item.title ?? '-'}</td>
        <td>${formatDateTime(item.start_at)}</td>
        <td>${item.status ?? '-'}</td>
        <td>${item.timezone ?? '-'}</td>
        <td><code>${item.appointment_id}</code></td>
      </tr>
    `
    )
    .join('');

  updateDatalist(
    appointmentIdOptionsEl,
    state.moduleData.appointments.map((item) => item.appointment_id)
  );
}

function renderRemindersTable() {
  if (!remindersRowsEl) return;
  if (state.moduleData.reminders.length === 0) {
    remindersRowsEl.innerHTML = '<tr><td colspan="6">Sem reminders para este tenant.</td></tr>';
    return;
  }

  remindersRowsEl.innerHTML = state.moduleData.reminders
    .map(
      (item) => `
      <tr>
        <td><code>${item.reminder_id}</code></td>
        <td><code>${item.appointment_id}</code></td>
        <td>${item.channel ?? '-'}</td>
        <td>${item.status ?? '-'}</td>
        <td>${formatDateTime(item.schedule_at)}</td>
        <td>${item.recipient?.phone_e164 ?? '-'}</td>
      </tr>
    `
    )
    .join('');
}

function renderChargesTable() {
  if (!chargesRowsEl) return;
  if (state.moduleData.charges.length === 0) {
    chargesRowsEl.innerHTML = '<tr><td colspan="6">Sem cobrancas para este tenant.</td></tr>';
    updateDatalist(chargeIdOptionsEl, []);
    return;
  }

  chargesRowsEl.innerHTML = state.moduleData.charges
    .map(
      (item) => `
      <tr>
        <td><code>${item.charge_id}</code></td>
        <td><code>${item.customer_id}</code></td>
        <td>${toCurrency(item.amount, item.currency)}</td>
        <td>${item.status ?? '-'}</td>
        <td>${item.due_date ?? '-'}</td>
        <td>${item.currency ?? '-'}</td>
      </tr>
    `
    )
    .join('');

  updateDatalist(
    chargeIdOptionsEl,
    state.moduleData.charges.map((item) => item.charge_id)
  );
}

function confirmationFilterValue() {
  const value = confirmationsStatusFilterEl?.value ?? 'pending';
  if (value === 'pending' || value === 'approved' || value === 'rejected' || value === 'all') {
    return value;
  }
  return 'pending';
}

function confirmationLimitValue() {
  const raw = Number(confirmationsLimitEl?.value ?? 20);
  if (!Number.isFinite(raw) || raw <= 0) {
    return 20;
  }
  return Math.min(Math.floor(raw), 200);
}

function renderConfirmationsTable() {
  if (!confirmationsRowsEl) return;
  if (!Array.isArray(state.moduleData.confirmations) || state.moduleData.confirmations.length === 0) {
    confirmationsRowsEl.innerHTML = '<tr><td colspan="5">Sem confirmacoes para o filtro atual.</td></tr>';
    return;
  }

  confirmationsRowsEl.innerHTML = state.moduleData.confirmations
    .map((item) => {
      const status = item.status ?? '-';
      const created = formatDateTime(item.created_at);
      const taskLabel = `${item.task_type ?? '-'} -> ${item.target_module ?? '-'}`;
      const reason = item.reason_code ?? '-';
      const actionButtons = status === 'pending'
        ? `
          <div class="table-actions">
            <button type="button" class="btn btn--ghost btn--tiny" data-confirm-action="approve" data-confirmation-id="${item.confirmation_id}">
              Aprovar
            </button>
            <button type="button" class="btn btn--ghost btn--tiny" data-confirm-action="reject" data-confirmation-id="${item.confirmation_id}">
              Rejeitar
            </button>
          </div>
        `
        : '<span class="muted">resolvido</span>';

      return `
        <tr>
          <td>${created}</td>
          <td><code>${taskLabel}</code></td>
          <td>${status}</td>
          <td>${reason}</td>
          <td>${actionButtons}</td>
        </tr>
      `;
    })
    .join('');
}

function renderModuleWorkspace(moduleId) {
  Object.values(MODULE_VIEW_BY_ID).forEach((view) => view?.classList.add('hidden'));
  const activeView = MODULE_VIEW_BY_ID[moduleId];
  activeView?.classList.remove('hidden');
}

async function fetchJsonOrThrow(path, options = {}) {
  const response = await fetch(`${apiBase()}${path}`, options);
  let body = null;
  try {
    body = await response.json();
  } catch {
    // no-op
  }

  if (!response.ok) {
    const details = Array.isArray(body?.details)
      ? body.details.map((item) => item.message ?? item.instancePath ?? JSON.stringify(item)).join('; ')
      : body?.details
        ? String(body.details)
        : '';
    const messageBase = body?.error ?? `HTTP ${response.status}`;
    const message = details.length > 0 ? `${messageBase}: ${details}` : messageBase;
    throw new Error(message);
  }

  return body;
}

function buildRuntimeConfigSyncPayload() {
  return {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      config: {
        openai: {
          api_key: state.config.openai.api_key,
          model: state.config.openai.model,
          vision_enabled: Boolean(state.config.openai.vision_enabled),
          voice_enabled: Boolean(state.config.openai.voice_enabled),
          image_generation_enabled: Boolean(state.config.openai.image_generation_enabled),
          image_read_enabled: Boolean(state.config.openai.image_read_enabled)
        },
        personas: {
          owner_concierge_prompt: state.config.personas.owner_concierge_prompt,
          whatsapp_agent_prompt: state.config.personas.whatsapp_agent_prompt
        },
        execution: {
          confirmations_enabled: Boolean(state.config.execution.confirmations_enabled)
        }
      }
    }
  };
}

async function pushRuntimeConfigToBackend() {
  const payload = buildRuntimeConfigSyncPayload();
  const body = await fetchJsonOrThrow('/v1/owner-concierge/runtime-config', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const response = body?.response ?? null;
  const runtime = response?.runtime ?? {};
  return {
    ownerResponseMode: runtime.owner_response_mode ?? 'auto',
    openAiConfigured: runtime.openai_configured === true,
    model: runtime.model ?? state.config.openai.model
  };
}

async function pullRuntimeConfigFromBackend() {
  const body = await fetchJsonOrThrow(
    `/v1/owner-concierge/runtime-config?tenant_id=${encodeURIComponent(tenantId())}`
  );

  if (body?.personas) {
    state.config.personas.owner_concierge_prompt = body.personas.owner_concierge_prompt ?? '';
    state.config.personas.whatsapp_agent_prompt = body.personas.whatsapp_agent_prompt ?? '';
  }
  if (body?.openai?.api_key_configured !== true) {
    state.config.openai.api_key = '';
  }
  if (body?.runtime?.model) {
    state.config.openai.model = String(body.runtime.model);
  }
  if (body?.execution && typeof body.execution.confirmations_enabled === 'boolean') {
    state.config.execution.confirmations_enabled = body.execution.confirmations_enabled;
  }

  if (body?.runtime?.openai_configured === true) {
    setAssistantProviderStatus('openai', {
      configuredOnly: true,
      model: body?.runtime?.model
    });
  } else {
    setAssistantProviderStatus('local', { configuredOnly: true });
  }

  populateConfigForm();
  persistConfig();
}

async function refreshCustomers() {
  try {
    const body = await fetchJsonOrThrow(`/v1/customers?tenant_id=${encodeURIComponent(tenantId())}`);
    state.moduleData.customers = Array.isArray(body.items) ? body.items : [];
    renderCustomersTable();
    trackModuleSpend('mod-03-clientes', 0.001, 1);
    setModuleStatus(customersStatusEl, `Clientes carregados: ${state.moduleData.customers.length}`);
  } catch (error) {
    setModuleStatus(customersStatusEl, `Erro ao carregar clientes: ${error.message}`, true);
  }
}

async function createCustomer(event) {
  event.preventDefault();

  const origin = customerOriginSelect.value;
  const sourceModule = origin === 'lead_conversion' ? 'mod-02-whatsapp-crm' : 'mod-01-owner-concierge';
  const leadId = customerLeadIdInput.value.trim();

  if (origin === 'lead_conversion' && leadId.length === 0) {
    setModuleStatus(customersStatusEl, 'Lead ID obrigatorio para origem lead_conversion.', true);
    return;
  }

  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: sourceModule,
      origin,
      correlation_id: crypto.randomUUID(),
      customer: {
        external_key: `owner-ui-customer-${Date.now()}`,
        display_name: customerNameInput.value.trim(),
        primary_phone: customerPhoneInput.value.trim() || undefined,
        primary_email: customerEmailInput.value.trim() || undefined,
        status: 'active'
      }
    }
  };

  if (!payload.request.customer.display_name) {
    setModuleStatus(customersStatusEl, 'Nome do cliente e obrigatorio.', true);
    return;
  }

  if (origin === 'lead_conversion') {
    payload.request.lead = {
      lead_id: leadId,
      stage: 'qualified'
    };
  }

  try {
    const body = await fetchJsonOrThrow('/v1/customers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const customerId = body?.response?.customer?.customer_id;
    if (customerId) {
      customerDetailIdInput.value = customerId;
      chargeCustomerIdInput.value = customerId;
    }
    await refreshCustomers();
    trackModuleSpend('mod-03-clientes', 0.004, 1);
    setModuleStatus(customersStatusEl, `Cliente ${body?.response?.status ?? 'ok'}: ${customerId ?? '-'}`);
    customerCreateForm.reset();
    customerOriginSelect.value = 'manual_owner';
  } catch (error) {
    setModuleStatus(customersStatusEl, `Erro ao criar cliente: ${error.message}`, true);
  }
}

async function loadCustomerDetail() {
  const customerId = customerDetailIdInput.value.trim();
  if (!customerId) {
    setModuleStatus(customersStatusEl, 'Informe customer_id para consultar detalhe.', true);
    return;
  }

  try {
    const body = await fetchJsonOrThrow(
      `/v1/customers/${encodeURIComponent(customerId)}?tenant_id=${encodeURIComponent(tenantId())}`
    );
    state.moduleData.customerDetail = body.customer ?? null;
    customerDetailOutputEl.textContent = JSON.stringify(state.moduleData.customerDetail, null, 2);
    trackModuleSpend('mod-03-clientes', 0.001, 1);
    setModuleStatus(customersStatusEl, `Detalhe carregado para ${customerId}.`);
  } catch (error) {
    setModuleStatus(customersStatusEl, `Erro no detalhe do cliente: ${error.message}`, true);
  }
}

async function createAppointment(event) {
  event.preventDefault();

  const startIso = toIsoFromLocal(appointmentStartInput.value);
  if (!startIso) {
    setModuleStatus(agendaStatusEl, 'Data/hora inicial invalida.', true);
    return;
  }

  const endIso = toIsoFromLocal(appointmentEndInput.value);
  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: 'mod-01-owner-concierge',
      correlation_id: crypto.randomUUID(),
      appointment: {
        external_key: `owner-ui-appointment-${Date.now()}`,
        title: appointmentTitleInput.value.trim(),
        description: appointmentDescriptionInput.value.trim(),
        start_at: startIso,
        end_at: endIso ?? undefined,
        timezone: appointmentTimezoneInput.value.trim() || 'America/Sao_Paulo',
        status: appointmentStatusInput.value
      }
    }
  };

  if (!payload.request.appointment.title) {
    setModuleStatus(agendaStatusEl, 'Titulo do appointment e obrigatorio.', true);
    return;
  }

  try {
    const body = await fetchJsonOrThrow('/v1/agenda/appointments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const appointment = body?.response?.appointment;
    mergeAppointmentInSession(appointment);
    renderAppointmentsTable();
    if (appointment?.appointment_id) {
      appointmentUpdateIdInput.value = appointment.appointment_id;
      reminderAppointmentIdInput.value = appointment.appointment_id;
    }
    trackModuleSpend('mod-04-agenda', 0.004, 1);
    setModuleStatus(agendaStatusEl, `Appointment ${body?.response?.status ?? 'ok'}: ${appointment?.appointment_id ?? '-'}`);
    appointmentCreateForm.reset();
    appointmentTimezoneInput.value = 'America/Sao_Paulo';
    appointmentStatusInput.value = 'scheduled';
  } catch (error) {
    setModuleStatus(agendaStatusEl, `Erro ao criar appointment: ${error.message}`, true);
  }
}

async function updateAppointment(event) {
  event.preventDefault();
  const appointmentId = appointmentUpdateIdInput.value.trim();
  if (!appointmentId) {
    setModuleStatus(agendaStatusEl, 'Informe appointment_id para atualizar.', true);
    return;
  }

  const changes = {};
  const title = appointmentUpdateTitleInput.value.trim();
  if (title) changes.title = title;
  if (appointmentUpdateStatusInput.value) changes.status = appointmentUpdateStatusInput.value;
  const startIso = toIsoFromLocal(appointmentUpdateStartInput.value);
  if (startIso) changes.start_at = startIso;
  const endIso = toIsoFromLocal(appointmentUpdateEndInput.value);
  if (endIso) changes.end_at = endIso;

  if (Object.keys(changes).length === 0) {
    setModuleStatus(agendaStatusEl, 'Informe ao menos um campo para atualizar.', true);
    return;
  }

  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: 'mod-01-owner-concierge',
      correlation_id: crypto.randomUUID(),
      changes
    }
  };

  try {
    const body = await fetchJsonOrThrow(`/v1/agenda/appointments/${encodeURIComponent(appointmentId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    mergeAppointmentInSession(body?.response?.appointment);
    renderAppointmentsTable();
    trackModuleSpend('mod-04-agenda', 0.003, 1);
    setModuleStatus(agendaStatusEl, `Appointment atualizado: ${appointmentId}`);
  } catch (error) {
    setModuleStatus(agendaStatusEl, `Erro ao atualizar appointment: ${error.message}`, true);
  }
}

async function createReminder(event) {
  event.preventDefault();
  const appointmentId = reminderAppointmentIdInput.value.trim();
  if (!appointmentId) {
    setModuleStatus(agendaStatusEl, 'Informe appointment_id para reminder.', true);
    return;
  }

  const scheduleIso = toIsoFromLocal(reminderScheduleInput.value);
  if (!scheduleIso) {
    setModuleStatus(agendaStatusEl, 'Data/hora do reminder invalida.', true);
    return;
  }

  const channel = reminderChannelInput.value;
  const recipientPhone = reminderRecipientInput.value.trim();
  if (channel === 'whatsapp' && !/^\+[1-9][0-9]{7,14}$/.test(recipientPhone)) {
    setModuleStatus(agendaStatusEl, 'Telefone E164 obrigatorio para canal whatsapp.', true);
    return;
  }

  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: 'mod-04-agenda',
      correlation_id: crypto.randomUUID(),
      reminder: {
        external_key: `owner-ui-reminder-${Date.now()}`,
        appointment_id: appointmentId,
        schedule_at: scheduleIso,
        channel,
        message: reminderMessageInput.value.trim(),
        recipient: channel === 'whatsapp' ? { phone_e164: recipientPhone } : {}
      }
    }
  };

  if (!payload.request.reminder.message) {
    setModuleStatus(agendaStatusEl, 'Mensagem do reminder e obrigatoria.', true);
    return;
  }

  try {
    const body = await fetchJsonOrThrow('/v1/agenda/reminders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    await refreshReminders();
    trackModuleSpend('mod-04-agenda', 0.003, 1);
    setModuleStatus(
      agendaStatusEl,
      `Reminder ${body?.response?.status ?? 'ok'}: ${body?.response?.reminder?.reminder_id ?? '-'}`
    );
    reminderCreateForm.reset();
    reminderChannelInput.value = 'whatsapp';
  } catch (error) {
    setModuleStatus(agendaStatusEl, `Erro ao criar reminder: ${error.message}`, true);
  }
}

async function refreshReminders() {
  try {
    const body = await fetchJsonOrThrow(`/v1/agenda/reminders?tenant_id=${encodeURIComponent(tenantId())}`);
    state.moduleData.reminders = Array.isArray(body.items) ? body.items : [];
    renderRemindersTable();
    trackModuleSpend('mod-04-agenda', 0.001, 1);
    setModuleStatus(agendaStatusEl, `Reminders carregados: ${state.moduleData.reminders.length}`);
  } catch (error) {
    setModuleStatus(agendaStatusEl, `Erro ao listar reminders: ${error.message}`, true);
  }
}

async function refreshCharges() {
  try {
    const body = await fetchJsonOrThrow(`/v1/billing/charges?tenant_id=${encodeURIComponent(tenantId())}`);
    state.moduleData.charges = Array.isArray(body.items) ? body.items : [];
    renderChargesTable();
    trackModuleSpend('mod-05-faturamento-cobranca', 0.001, 1);
    setModuleStatus(billingStatusEl, `Cobrancas carregadas: ${state.moduleData.charges.length}`);
  } catch (error) {
    setModuleStatus(billingStatusEl, `Erro ao listar cobrancas: ${error.message}`, true);
  }
}

async function createCharge(event) {
  event.preventDefault();
  const customerId = chargeCustomerIdInput.value.trim();
  if (!customerId) {
    setModuleStatus(billingStatusEl, 'customer_id e obrigatorio para criar cobranca.', true);
    return;
  }

  const amount = Number(chargeAmountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    setModuleStatus(billingStatusEl, 'Valor da cobranca deve ser maior que zero.', true);
    return;
  }

  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: 'mod-05-faturamento-cobranca',
      correlation_id: crypto.randomUUID(),
      charge: {
        external_key: `owner-ui-charge-${Date.now()}`,
        customer_id: customerId,
        amount,
        currency: (chargeCurrencyInput.value || 'BRL').toUpperCase(),
        due_date: chargeDueDateInput.value || undefined,
        status: chargeStatusInput.value
      }
    }
  };

  try {
    const body = await fetchJsonOrThrow('/v1/billing/charges', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const charge = body?.response?.charge;
    mergeChargeInSession(charge);
    renderChargesTable();
    if (charge?.charge_id) {
      chargeUpdateIdInput.value = charge.charge_id;
      collectionChargeIdInput.value = charge.charge_id;
      paymentChargeIdInput.value = charge.charge_id;
    }
    trackModuleSpend('mod-05-faturamento-cobranca', 0.004, 1);
    setModuleStatus(billingStatusEl, `Cobranca ${body?.response?.status ?? 'ok'}: ${charge?.charge_id ?? '-'}`);
    chargeCreateForm.reset();
    chargeCurrencyInput.value = 'BRL';
    chargeStatusInput.value = 'open';
  } catch (error) {
    setModuleStatus(billingStatusEl, `Erro ao criar cobranca: ${error.message}`, true);
  }
}

async function updateCharge(event) {
  event.preventDefault();
  const chargeId = chargeUpdateIdInput.value.trim();
  if (!chargeId) {
    setModuleStatus(billingStatusEl, 'Informe charge_id para atualizar.', true);
    return;
  }

  const changes = {};
  const amount = Number(chargeUpdateAmountInput.value);
  if (Number.isFinite(amount) && amount > 0) {
    changes.amount = amount;
  }
  if (chargeUpdateDueDateInput.value) {
    changes.due_date = chargeUpdateDueDateInput.value;
  }
  if (chargeUpdateStatusInput.value) {
    changes.status = chargeUpdateStatusInput.value;
  }

  if (Object.keys(changes).length === 0) {
    setModuleStatus(billingStatusEl, 'Informe ao menos um campo para update da cobranca.', true);
    return;
  }

  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: 'mod-05-faturamento-cobranca',
      correlation_id: crypto.randomUUID(),
      changes
    }
  };

  try {
    const body = await fetchJsonOrThrow(`/v1/billing/charges/${encodeURIComponent(chargeId)}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    mergeChargeInSession(body?.response?.charge);
    renderChargesTable();
    trackModuleSpend('mod-05-faturamento-cobranca', 0.003, 1);
    setModuleStatus(billingStatusEl, `Cobranca atualizada: ${chargeId}`);
  } catch (error) {
    setModuleStatus(billingStatusEl, `Erro ao atualizar cobranca: ${error.message}`, true);
  }
}

async function requestChargeCollection(event) {
  event.preventDefault();
  const chargeId = collectionChargeIdInput.value.trim();
  if (!chargeId) {
    setModuleStatus(billingStatusEl, 'Informe charge_id para solicitar cobranca.', true);
    return;
  }
  const phone = collectionPhoneInput.value.trim();
  if (!/^\+[1-9][0-9]{7,14}$/.test(phone)) {
    setModuleStatus(billingStatusEl, 'Telefone E164 invalido para cobranca.', true);
    return;
  }

  const message = collectionMessageInput.value.trim();
  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      correlation_id: crypto.randomUUID(),
      collection: {
        recipient: { phone_e164: phone },
        message
      }
    }
  };

  try {
    const body = await fetchJsonOrThrow(
      `/v1/billing/charges/${encodeURIComponent(chargeId)}/collection-request`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    mergeChargeInSession(body?.response?.charge);
    renderChargesTable();
    trackModuleSpend('mod-05-faturamento-cobranca', 0.003, 1);
    setModuleStatus(billingStatusEl, `Collection solicitada para ${chargeId}.`);
  } catch (error) {
    setModuleStatus(billingStatusEl, `Erro ao solicitar collection: ${error.message}`, true);
  }
}

async function createPayment(event) {
  event.preventDefault();
  const chargeId = paymentChargeIdInput.value.trim();
  if (!chargeId) {
    setModuleStatus(billingStatusEl, 'Informe charge_id para registrar pagamento.', true);
    return;
  }

  const amount = Number(paymentAmountInput.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    setModuleStatus(billingStatusEl, 'Valor de pagamento invalido.', true);
    return;
  }

  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: 'mod-05-faturamento-cobranca',
      correlation_id: crypto.randomUUID(),
      payment: {
        external_key: `owner-ui-payment-${Date.now()}`,
        charge_id: chargeId,
        amount,
        currency: (paymentCurrencyInput.value || 'BRL').toUpperCase(),
        paid_at: new Date().toISOString(),
        status: paymentStatusInput.value
      }
    }
  };

  try {
    const body = await fetchJsonOrThrow('/v1/billing/payments', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    mergeChargeInSession(body?.response?.charge);
    renderChargesTable();
    trackModuleSpend('mod-05-faturamento-cobranca', 0.004, 1);
    setModuleStatus(
      billingStatusEl,
      `Pagamento ${body?.response?.status ?? 'ok'} em ${chargeId} (${paymentStatusInput.value}).`
    );
  } catch (error) {
    setModuleStatus(billingStatusEl, `Erro ao registrar pagamento: ${error.message}`, true);
  }
}

async function loadModuleWorkspace(moduleId) {
  renderModuleWorkspace(moduleId);

  if (moduleId === 'mod-02-whatsapp-crm') {
    syncCrmEmbeddedFrame();
    return;
  }

  if (moduleId === 'mod-03-clientes') {
    renderCustomersTable();
    if (state.moduleData.customers.length === 0) {
      await refreshCustomers();
    }
    return;
  }

  if (moduleId === 'mod-04-agenda') {
    renderAppointmentsTable();
    renderRemindersTable();
    if (state.moduleData.reminders.length === 0) {
      await refreshReminders();
    }
    return;
  }

  if (moduleId === 'mod-05-faturamento-cobranca') {
    renderChargesTable();
    if (state.moduleData.charges.length === 0) {
      await refreshCharges();
    }
  }
}

function setSpeaking(value) {
  state.speaking = value;
  avatarEl.dataset.state = value ? 'speaking' : 'idle';
}

function startSpeakingPulse(ms = 1400) {
  setSpeaking(true);
  window.setTimeout(() => setSpeaking(false), ms);
}

function getSpeechRecognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function setContinuousListening(value) {
  state.continuousListening = Boolean(value);
  if (state.continuous) {
    continuousStateEl.textContent = state.continuousListening ? 'continuous+voz' : 'continuous';
  }
}

function clearContinuousRestartTimer() {
  if (state.continuousRestartTimer) {
    window.clearTimeout(state.continuousRestartTimer);
    state.continuousRestartTimer = null;
  }
}

function stopContinuousVoiceRecognition() {
  clearContinuousRestartTimer();
  setContinuousListening(false);
  if (!state.continuousRecognition) return;

  const recognition = state.continuousRecognition;
  state.continuousRecognition = null;
  recognition.onstart = null;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  try {
    recognition.stop();
  } catch {
    // ignore stop errors from already-closed sessions
  }
}

function stopContinuousSpeechOutput(resetSpeaking = true) {
  if (state.continuousSpeechAudio?.audioEl) {
    try {
      state.continuousSpeechAudio.audioEl.pause();
      state.continuousSpeechAudio.audioEl.src = '';
    } catch {
      // ignore cleanup errors
    }
  }
  if (state.continuousSpeechAudio?.objectUrl) {
    URL.revokeObjectURL(state.continuousSpeechAudio.objectUrl);
  }
  state.continuousSpeechAudio = null;
  state.continuousSpeechOutputActive = false;
  if (resetSpeaking) {
    setSpeaking(false);
  }
}

async function synthesizeAssistantSpeech(text) {
  const response = await fetch(`${apiBase()}/v1/owner-concierge/audio/speech`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: crypto.randomUUID(),
        tenant_id: tenantId(),
        session_id: sessionId(),
        text,
        model: OPENAI_TTS_DEFAULT_MODEL,
        voice: OPENAI_TTS_DEFAULT_VOICE,
        speed: OPENAI_TTS_DEFAULT_SPEED,
        response_format: 'mp3'
      }
    })
  });

  if (!response.ok) {
    let details = '';
    try {
      const body = await response.json();
      details = body?.details ? ` (${body.details})` : '';
      throw new Error(`${body?.error ?? response.status}${details}`);
    } catch (jsonError) {
      if (jsonError instanceof Error) {
        throw jsonError;
      }
      throw new Error(`speech_http_${response.status}`);
    }
  }

  const speechBlob = await response.blob();
  if (!speechBlob || speechBlob.size === 0) {
    throw new Error('speech_audio_empty');
  }
  return speechBlob;
}

async function playContinuousAssistantSpeech(text) {
  const normalized = String(text ?? '').trim();
  if (!state.continuous || normalized.length === 0 || state.config.openai.voice_enabled !== true) {
    return;
  }

  stopContinuousVoiceRecognition();
  stopContinuousSpeechOutput(false);
  state.continuousSpeechOutputActive = true;
  setSpeaking(true);

  try {
    const speechBlob = await synthesizeAssistantSpeech(normalized);
    const objectUrl = URL.createObjectURL(speechBlob);
    const audioEl = new Audio(objectUrl);
    audioEl.preload = 'auto';
    state.continuousSpeechAudio = { audioEl, objectUrl };

    await new Promise((resolve, reject) => {
      audioEl.onended = () => resolve();
      audioEl.onpause = () => {
        if (!state.continuous || audioEl.src.length === 0) {
          resolve();
        }
      };
      audioEl.onerror = () => reject(new Error('speech_playback_error'));
      const playPromise = audioEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch((error) => reject(error));
      }
    });
  } catch (error) {
    appendMessage(`Falha na voz continua: ${error.message}`, 'assistant');
  } finally {
    stopContinuousSpeechOutput();
    if (state.continuous) {
      startContinuousVoiceRecognition();
    }
  }
}

function startContinuousVoiceRecognition() {
  const RecognitionCtor = getSpeechRecognitionCtor();
  if (!RecognitionCtor) {
    appendMessage('Modo continuo por voz indisponivel neste navegador.', 'assistant');
    setContinuousListening(false);
    return false;
  }

  stopContinuousVoiceRecognition();

  const recognition = new RecognitionCtor();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    setContinuousListening(true);
  };

  recognition.onresult = (event) => {
    if (state.continuousSpeechOutputActive) return;
    let finalText = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = String(event.results[i]?.[0]?.transcript ?? '').trim();
      if (!transcript) continue;
      if (event.results[i].isFinal) {
        finalText += ` ${transcript}`;
      }
    }
    const normalized = finalText.trim();
    if (normalized.length > 0) {
      sendInteraction(normalized, []);
    }
  };

  recognition.onerror = (event) => {
    const errorCode = String(event?.error ?? 'unknown');
    setContinuousListening(false);

    if (state.continuousSpeechOutputActive) {
      return;
    }

    if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
      appendMessage('Microfone bloqueado para modo continuo. Libere permissao do navegador.', 'assistant');
      state.continuous = false;
      stopContinuousVoiceRecognition();
      stopContinuousSpeechOutput();
      applyContinuousUiState();
      continuousStateEl.textContent = 'one-shot';
      continuousBtn.textContent = 'Ativar Continuo';
      return;
    }

    if (state.continuous) {
      clearContinuousRestartTimer();
      state.continuousRestartTimer = window.setTimeout(() => {
        if (state.continuous) {
          startContinuousVoiceRecognition();
        }
      }, 600);
    }
  };

  recognition.onend = () => {
    setContinuousListening(false);
    if (!state.continuous || state.continuousSpeechOutputActive) return;
    clearContinuousRestartTimer();
    state.continuousRestartTimer = window.setTimeout(() => {
      if (state.continuous) {
        startContinuousVoiceRecognition();
      }
    }, 380);
  };

  state.continuousRecognition = recognition;
  try {
    recognition.start();
    return true;
  } catch (error) {
    appendMessage(`Falha ao iniciar modo continuo por voz: ${error.message}`, 'assistant');
    setContinuousListening(false);
    return false;
  }
}

function applyContinuousUiState() {
  bodyEl.classList.toggle('continuous-active', state.continuous === true);
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

  syncCrmEmbeddedFrame();
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
    moduleWorkspaceEl.classList.add('hidden');
    settingsWorkspaceEl.classList.add('hidden');
    modulePlaceholderWorkspaceEl.classList.add('hidden');
    refreshInteractionConfirmations();
    return;
  }

  if (moduleId === 'mod-06-configuracoes') {
    if (state.continuous) {
      state.continuous = false;
      stopContinuousVoiceRecognition();
      stopContinuousSpeechOutput();
      applyContinuousUiState();
      continuousStateEl.textContent = 'one-shot';
      continuousBtn.textContent = 'Ativar Continuo';
    }
    chatWorkspaceEl.classList.add('hidden');
    moduleWorkspaceEl.classList.add('hidden');
    settingsWorkspaceEl.classList.remove('hidden');
    modulePlaceholderWorkspaceEl.classList.add('hidden');
    renderMetricsTable();
    return;
  }

  if (MODULE_WORKSPACE_IDS.has(moduleId)) {
    if (state.continuous) {
      state.continuous = false;
      stopContinuousVoiceRecognition();
      stopContinuousSpeechOutput();
      applyContinuousUiState();
      continuousStateEl.textContent = 'one-shot';
      continuousBtn.textContent = 'Ativar Continuo';
    }
    chatWorkspaceEl.classList.add('hidden');
    moduleWorkspaceEl.classList.remove('hidden');
    settingsWorkspaceEl.classList.add('hidden');
    modulePlaceholderWorkspaceEl.classList.add('hidden');
    loadModuleWorkspace(moduleId);
    return;
  }

  const meta = moduleMeta(moduleId);
  placeholderTitleEl.textContent = `${meta.label} - Em evolucao`;
  placeholderTextEl.textContent = 'Fluxo principal ja mapeado em contratos. UI detalhada deste modulo entra no proximo ciclo.';
  chatWorkspaceEl.classList.add('hidden');
  moduleWorkspaceEl.classList.add('hidden');
  settingsWorkspaceEl.classList.add('hidden');
  modulePlaceholderWorkspaceEl.classList.remove('hidden');
}

function apiBase() {
  return normalizeApiBase(state.config.runtime.api_base_url);
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
  state.config.runtime.api_base_url = normalizeApiBase(cfgApiBaseInput.value);
  state.config.runtime.tenant_id = cfgTenantIdInput.value.trim();
  state.config.runtime.session_id = cfgSessionIdInput.value.trim() || crypto.randomUUID();
  state.config.runtime.layout = normalizeLayout(cfgLayoutSelect.value);
  state.config.runtime.palette = normalizePalette(cfgPaletteSelect.value);

  state.config.metrics.fx_usd_brl = safeNumber(cfgFxUsdBrlInput.value, 5.0);

  state.config.openai.api_key = cfgOpenAiApiKeyInput.value.trim();
  state.config.openai.model = cfgOpenAiModelInput.value.trim() || 'gpt-5.1';
  state.config.openai.vision_enabled = cfgOpenAiVisionInput.checked;
  state.config.openai.voice_enabled = cfgOpenAiVoiceInput.checked;
  state.config.openai.image_generation_enabled = cfgOpenAiImageGenInput.checked;
  state.config.openai.image_read_enabled = cfgOpenAiImageReadInput.checked;
  state.config.personas.owner_concierge_prompt = cfgPersona1PromptInput.value.trim();
  state.config.personas.whatsapp_agent_prompt = cfgPersona2PromptInput.value.trim();
  state.config.execution.confirmations_enabled = false;

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

function fileExtension(fileName) {
  const raw = String(fileName ?? '');
  const idx = raw.lastIndexOf('.');
  return idx >= 0 ? raw.slice(idx + 1).toLowerCase() : '';
}

function isTextAttachment(file) {
  const mime = String(file?.type ?? '').toLowerCase();
  if (mime.startsWith('text/')) return true;
  if (mime.includes('json') || mime.includes('xml') || mime.includes('yaml')) return true;
  const ext = fileExtension(file?.name);
  return [
    'txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml',
    'js', 'ts', 'py', 'html', 'css', 'sql', 'log'
  ].includes(ext);
}

async function fileToBase64(file) {
  const buffer = await file.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function buildAttachmentPayload(file, forcedType = null) {
  const type = forcedType ?? (String(file.type).startsWith('image/') ? 'image' : 'file');
  const mimeType = file.type || (type === 'image' ? 'image/*' : 'application/octet-stream');
  const payload = {
    type,
    uri: buildAttachmentRef(file.name),
    mime_type: mimeType,
    filename: file.name,
    size: file.size
  };

  if (file.size <= MAX_INLINE_ATTACHMENT_BYTES) {
    payload.data_base64 = await fileToBase64(file);
  }

  if (isTextAttachment(file)) {
    const rawText = await file.text();
    payload.text_excerpt = rawText.slice(0, MAX_TEXT_EXCERPT_CHARS);
  }

  return payload;
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

function normalizeAssistantOutputText(rawText) {
  const raw = String(rawText ?? '').trim();
  if (!raw) return 'Comando recebido.';
  const cleaned = raw
    .replace(/^\[[^\]]+\]\s*/u, '')
    .replace(/\s*\|\s*tasks?:\s*\d+\b/giu, '')
    .replace(/\s*\|\s*provider=.*$/giu, '')
    .trim();
  return cleaned || 'Comando recebido.';
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

async function refreshInteractionConfirmations() {
  try {
    const status = confirmationFilterValue();
    const limit = confirmationLimitValue();
    const path = `/v1/owner-concierge/interaction-confirmations?tenant_id=${encodeURIComponent(tenantId())}&status=${encodeURIComponent(status)}&limit=${limit}`;
    const body = await fetchJsonOrThrow(path);
    state.moduleData.confirmations = Array.isArray(body.items) ? body.items : [];
    renderConfirmationsTable();
    setModuleStatus(
      confirmationsStatusEl,
      `Fila carregada (${status}): ${state.moduleData.confirmations.length} item(ns).`
    );
    chatWorkspaceEl.classList.toggle('has-confirmations', state.moduleData.confirmations.length > 0);
    trackModuleSpend('mod-01-owner-concierge', 0.0006, 1);
  } catch (error) {
    setModuleStatus(confirmationsStatusEl, `Erro ao carregar fila: ${error.message}`, true);
    chatWorkspaceEl.classList.toggle('has-confirmations', false);
  }
}

async function resolveInteractionConfirmation(confirmationId, decision) {
  if (!confirmationId || (decision !== 'approve' && decision !== 'reject')) {
    return;
  }

  try {
    const body = await fetchJsonOrThrow('/v1/owner-concierge/interaction-confirmations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          session_id: sessionId(),
          confirmation_id: confirmationId,
          decision
        }
      })
    });

    const finalStatus = body?.response?.confirmation?.status ?? 'unknown';
    const taskInfo = body?.response?.downstream_task
      ? ` | task: ${body.response.downstream_task.task_type}`
      : '';
    appendMessage(`[confirmacao ${decision}] ${confirmationId} -> ${finalStatus}${taskInfo}`);
    setModuleStatus(confirmationsStatusEl, `Confirmacao ${decision} executada: ${confirmationId}.`);
    trackModuleSpend('mod-01-owner-concierge', 0.0012, 1);
    await refreshInteractionConfirmations();
  } catch (error) {
    appendMessage(`Falha ao resolver confirmacao ${confirmationId}: ${error.message}`);
    setModuleStatus(confirmationsStatusEl, `Erro ao resolver confirmacao: ${error.message}`, true);
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
    applyContinuousUiState();
    if (state.continuous) {
      ensureAvatarPlayback();
      const started = startContinuousVoiceRecognition();
      continuousStateEl.textContent = started ? 'continuous+voz' : 'continuous';
    } else {
      stopContinuousVoiceRecognition();
      stopContinuousSpeechOutput();
      continuousStateEl.textContent = 'one-shot';
    }
    continuousBtn.textContent = state.continuous ? 'Pausar Continuo' : 'Ativar Continuo';
    updateConfigStatus(state.continuous ? 'Modo continuo ativado.' : 'Modo continuo pausado.');
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
      filename: item.filename,
      ...(typeof item.data_base64 === 'string' && item.data_base64.length > 0
        ? { data_base64: item.data_base64 }
        : {}),
      ...(typeof item.text_excerpt === 'string' && item.text_excerpt.length > 0
        ? { text_excerpt: item.text_excerpt }
        : {})
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
      const details = body?.details ? ` (${body.details})` : '';
      appendMessage(`Erro runtime: ${body.error ?? response.status}${details}`);
      setAssistantProviderStatus('error', {
        errorDetails: `${body?.error ?? response.status}${details}`
      });
      return;
    }

    const assistantOutput = body.response?.assistant_output ?? {};
    const output = normalizeAssistantOutputText(assistantOutput.text);
    const provider = String(assistantOutput.provider ?? 'none');
    const model = typeof assistantOutput.model === 'string'
      ? assistantOutput.model
      : null;
    const fallbackReason = typeof assistantOutput.fallback_reason === 'string'
      ? assistantOutput.fallback_reason
      : null;
    appendMessage(output);
    setAssistantProviderStatus(provider, {
      model,
      fallbackReason
    });

    if (state.continuous && provider === 'openai' && state.config.openai.voice_enabled === true) {
      void playContinuousAssistantSpeech(output);
    }

    const confirmation = body.response?.confirmation;
    if (confirmation?.status === 'pending') {
      appendMessage(
        `[confirmacao pendente] ${confirmation.task_type} (${confirmation.confirmation_id})`
      );
      await refreshInteractionConfirmations();
    }

    trackModuleSpend('mod-01-owner-concierge', estimateMessageCostUSD(attachments), 1);
  } catch (error) {
    appendMessage(`Falha de conexao com API (${apiBase()}): ${error.message}`);
    setAssistantProviderStatus('error', { errorDetails: error.message });
  }
}

function stopMediaRecorder() {
  if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
    state.mediaRecorder.stop();
  }
}

function resolveAudioRecorderMimeType() {
  const supported = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus'
  ];

  if (typeof window.MediaRecorder !== 'function' || typeof window.MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  for (const mime of supported) {
    if (window.MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return '';
}

function extensionFromMimeType(mimeType) {
  const normalized = String(mimeType ?? '').toLowerCase();
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('mp4')) return 'm4a';
  if (normalized.includes('wav')) return 'wav';
  return 'webm';
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function transcribeRecordedAudioAndSend(blob, mimeType, fileName) {
  audioRecordBtn.disabled = true;
  audioRecordBtn.textContent = 'Transcrevendo...';
  try {
    const audioBase64 = await blobToBase64(blob);
    const response = await fetch(`${apiBase()}/v1/owner-concierge/audio/transcribe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          session_id: sessionId(),
          audio_base64: audioBase64,
          mime_type: mimeType,
          filename: fileName,
          language: 'pt'
        }
      })
    });

    const body = await response.json();
    if (!response.ok) {
      const details = body?.details ? ` (${body.details})` : '';
      throw new Error(`${body?.error ?? response.status}${details}`);
    }

    const transcript = String(body?.response?.transcription?.text ?? '').trim();
    if (transcript.length === 0) {
      throw new Error('transcription_empty');
    }
    await sendInteraction(transcript, []);
  } catch (error) {
    appendMessage(`Falha ao transcrever audio: ${error.message}`, 'assistant');
  } finally {
    audioRecordBtn.disabled = false;
    audioRecordBtn.textContent = 'Audio';
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
    const preferredMimeType = resolveAudioRecorderMimeType();
    const recorderOptions = preferredMimeType ? { mimeType: preferredMimeType } : undefined;
    const recorder = new MediaRecorder(state.mediaStream, recorderOptions);
    const chunks = [];

    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    });

    recorder.addEventListener('stop', async () => {
      const mimeType = recorder.mimeType || preferredMimeType || 'audio/webm';
      const blob = new Blob(chunks, { type: mimeType });
      if (blob.size > 0) {
        const ext = extensionFromMimeType(mimeType);
        const fileName = `audio-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
        await transcribeRecordedAudioAndSend(blob, mimeType, fileName);
      }

      if (state.mediaStream) {
        state.mediaStream.getTracks().forEach((track) => track.stop());
      }

      state.mediaRecorder = null;
      state.mediaStream = null;
      updateConfigStatus('Audio processado em modo direto.');
    });

    state.mediaRecorder = recorder;
    recorder.start();
    audioRecordBtn.textContent = 'Parar Gravacao';
  } catch (error) {
    appendMessage(`Falha ao iniciar gravacao de audio: ${error.message}`, 'assistant');
  }
}

async function handleFilesSelected(fileList, forcedType = null) {
  const files = Array.from(fileList || []);
  if (files.length === 0) return;

  for (const file of files) {
    try {
      const attachmentPayload = await buildAttachmentPayload(file, forcedType);
      addPendingAttachment(attachmentPayload);
    } catch (error) {
      appendMessage(`Falha ao processar anexo ${file.name}: ${error.message}`, 'assistant');
    }
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
  syncCrmEmbeddedFrame(true);
  persistConfig();
  updateConfigStatus(`Tema aplicado: layout=${preset.layout}, paleta=${preset.palette}.`);
}

async function saveConfig() {
  collectConfigForm();
  applyVisualMode(state.config.runtime.layout, state.config.runtime.palette, false);
  persistConfig();
  setTopbarLabels();
  syncCrmEmbeddedFrame(true);
  renderMetricsTable();
  try {
    const syncResult = await pushRuntimeConfigToBackend();
    updateConfigStatus(
      `Configuracoes salvas e aplicadas no backend (mode=${syncResult.ownerResponseMode}, model=${syncResult.model}).`
    );
  } catch (error) {
    updateConfigStatus(`Configuracoes salvas localmente, mas sync backend falhou: ${error.message}`);
  }
  await callHealth();
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
  setAssistantProviderStatus('none');
  applyContinuousUiState();
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
  if (continuousBackBtn) {
    continuousBackBtn.addEventListener('click', () => {
      if (state.continuous) {
        toggleContinuousMode();
      }
    });
  }
  simulateVoiceBtn.addEventListener('click', () => startSpeakingPulse(1800));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.continuous) {
      toggleContinuousMode();
    }
  });

  saveConfigBtn.addEventListener('click', () => {
    saveConfig();
  });
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
  messageInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    chatForm.requestSubmit();
  });

  photoPickBtn.addEventListener('click', () => photoInput.click());
  filePickBtn.addEventListener('click', () => fileInput.click());

  photoInput.addEventListener('change', () => {
    void handleFilesSelected(photoInput.files, 'image');
    photoInput.value = '';
  });

  fileInput.addEventListener('change', () => {
    void handleFilesSelected(fileInput.files);
    fileInput.value = '';
  });

  pendingAttachmentsEl.addEventListener('click', (event) => {
    const target = event.target.closest('[data-remove-attachment]');
    if (!target) return;
    removePendingAttachment(target.dataset.removeAttachment);
  });

  confirmationsRefreshBtn.addEventListener('click', () => {
    refreshInteractionConfirmations();
  });
  confirmationsStatusFilterEl.addEventListener('change', () => {
    refreshInteractionConfirmations();
  });
  confirmationsLimitEl.addEventListener('change', () => {
    refreshInteractionConfirmations();
  });
  confirmationsRowsEl.addEventListener('click', (event) => {
    const actionBtn = event.target.closest('[data-confirm-action][data-confirmation-id]');
    if (!actionBtn) return;
    resolveInteractionConfirmation(
      actionBtn.dataset.confirmationId,
      actionBtn.dataset.confirmAction
    );
  });

  customerCreateForm.addEventListener('submit', createCustomer);
  customersRefreshBtn.addEventListener('click', refreshCustomers);
  customerDetailBtn.addEventListener('click', loadCustomerDetail);

  appointmentCreateForm.addEventListener('submit', createAppointment);
  appointmentUpdateForm.addEventListener('submit', updateAppointment);
  reminderCreateForm.addEventListener('submit', createReminder);
  remindersRefreshBtn.addEventListener('click', refreshReminders);

  chargeCreateForm.addEventListener('submit', createCharge);
  chargeUpdateForm.addEventListener('submit', updateCharge);
  collectionRequestForm.addEventListener('submit', requestChargeCollection);
  paymentCreateForm.addEventListener('submit', createPayment);
  chargesRefreshBtn.addEventListener('click', refreshCharges);

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

async function bootstrap() {
  registerAvatarVideoFallback(avatarIdleVideoEl);
  registerAvatarVideoFallback(avatarSpeakingVideoEl);
  applyAvatarVideoSource();
  bootstrapConfig();
  syncCrmEmbeddedFrame();
  renderModuleNav();
  setActiveModule('mod-01-owner-concierge');
  setupEvents();
  await callHealth();
  try {
    await pullRuntimeConfigFromBackend();
  } catch {
    // backend runtime config may not be available yet during cold start
  }
  refreshInteractionConfirmations();
}

bootstrap();
