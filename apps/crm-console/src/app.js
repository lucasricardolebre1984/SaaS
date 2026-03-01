const VALID_LAYOUTS = ['fabio2', 'studio'];
const VALID_PALETTES = ['ocean', 'forest', 'sunset'];
const LEGACY_DEFAULT_API_BASE = 'http://127.0.0.1:4300';
const API_BASE_STORAGE_KEY = 'crm_console_api_base_v1';

const TENANT_THEME_PRESETS = {
  tenant_automania: { layout: 'fabio2', palette: 'ocean' },
  tenant_clinica: { layout: 'studio', palette: 'forest' },
  tenant_comercial: { layout: 'studio', palette: 'sunset' }
};

const STAGE_TRIGGERS = {
  'new->contacted': 'first_contact_attempt',
  'new->lost': 'explicit_close_lost',
  'contacted->qualified': 'qualification_passed',
  'contacted->nurturing': 'not_now_followup_needed',
  'contacted->lost': 'explicit_close_lost',
  'qualified->proposal': 'proposal_sent',
  'qualified->lost': 'explicit_close_lost',
  'proposal->negotiation': 'objection_or_counteroffer',
  'proposal->won': 'proposal_accepted',
  'proposal->lost': 'proposal_rejected',
  'negotiation->won': 'deal_closed',
  'negotiation->lost': 'deal_failed',
  'negotiation->nurturing': 'defer_decision',
  'nurturing->contacted': 'reengaged',
  'nurturing->lost': 'nurture_expired',
  'lost->nurturing': 'reopen_requested'
};

const rootEl = document.documentElement;
const bodyEl = document.body;

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const apiBaseInput = document.getElementById('apiBase');
const tenantIdInput = document.getElementById('tenantId');
const reloadBtn = document.getElementById('reloadBtn');
const layoutSelect = document.getElementById('layoutSelect');
const paletteSelect = document.getElementById('paletteSelect');
const applyTenantThemeBtn = document.getElementById('applyTenantThemeBtn');

const leadRows = document.getElementById('leadRows');
const leadCount = document.getElementById('leadCount');
const leadForm = document.getElementById('leadForm');
const formStatus = document.getElementById('formStatus');

const conversationListEl = document.getElementById('conversationList');
const conversationCountEl = document.getElementById('conversationCount');
const threadContactEl = document.getElementById('threadContact');
const threadMetaEl = document.getElementById('threadMeta');
const threadMessagesEl = document.getElementById('threadMessages');
const threadSendForm = document.getElementById('threadSendForm');
const threadMessageInput = document.getElementById('threadMessageInput');
const threadStageSelect = document.getElementById('threadStageSelect');
const threadAiSuggestBtn = document.getElementById('threadAiSuggestBtn');
const threadQualifyBtn = document.getElementById('threadQualifyBtn');
const threadAiExecuteBtn = document.getElementById('threadAiExecuteBtn');
const threadUpdateStageBtn = document.getElementById('threadUpdateStageBtn');

const kpis = {
  new: document.getElementById('kpi-new'),
  qualified: document.getElementById('kpi-qualified'),
  proposal: document.getElementById('kpi-proposal'),
  won: document.getElementById('kpi-won'),
  lost: document.getElementById('kpi-lost')
};

let embeddedMode = false;
let leadsCache = [];
let conversationsCache = [];
let selectedConversationId = null;
let selectedThreadMessages = [];
let latestAiDraftReply = '';
let latestAiQualifySuggestion = null;
let inboxPollingTimer = null;
let inboxPollingInFlight = false;
const INBOX_POLL_INTERVAL_MS = 5000;

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
    localStorage.setItem('crm_console_layout', safeLayout);
    localStorage.setItem('crm_console_palette', safePalette);
  }

  if (safeLayout === 'studio') {
    bodyEl.classList.remove('menu-open');
  }
}

function restoreVisualMode() {
  const persistedLayout = localStorage.getItem('crm_console_layout');
  const persistedPalette = localStorage.getItem('crm_console_palette');
  applyVisualMode({
    layout: persistedLayout ?? rootEl.dataset.layout,
    palette: persistedPalette ?? rootEl.dataset.palette,
    persist: false
  });
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

function loadApiBasePreference() {
  try {
    const stored = localStorage.getItem(API_BASE_STORAGE_KEY);
    const normalized = normalizeApiBase(stored);
    if (isUnifiedUiRuntime() && normalized === LEGACY_DEFAULT_API_BASE) {
      return deriveDefaultApiBase();
    }
    return normalized;
  } catch {
    return deriveDefaultApiBase();
  }
}

function persistApiBasePreference(value) {
  try {
    localStorage.setItem(API_BASE_STORAGE_KEY, normalizeApiBase(value));
  } catch {
    // no-op
  }
}

function apiBase() {
  return normalizeApiBase(apiBaseInput.value);
}

function tenantId() {
  return tenantIdInput.value.trim();
}

function applyBootstrapFromQuery() {
  const params = new URLSearchParams(window.location.search || '');
  const tenant = params.get('tenant');
  const api = params.get('api');
  const layout = params.get('layout');
  const palette = params.get('palette');
  const embedded = params.get('embedded');

  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return false;
    }
  })();
  embeddedMode = embedded === '1' || embedded === 'true' || inIframe;
  if (embeddedMode) {
    rootEl.dataset.embedded = '1';
    bodyEl.classList.add('embedded-mode');
  } else {
    delete rootEl.dataset.embedded;
    bodyEl.classList.remove('embedded-mode');
  }

  if (tenant && tenant.trim().length > 0) {
    tenantIdInput.value = tenant.trim();
  }
  if (api && api.trim().length > 0) {
    apiBaseInput.value = normalizeApiBase(api);
    persistApiBasePreference(apiBaseInput.value);
  }
  if (layout || palette) {
    applyVisualMode({
      layout: layout ?? layoutSelect.value,
      palette: palette ?? paletteSelect.value,
      persist: true
    });
  }
}

function safeText(value) {
  return String(value ?? '').replace(/[<>&"]/g, (ch) => (
    ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : '&quot;'
  ));
}

function normalizeBrandText(value) {
  const raw = String(value ?? '');
  if (!raw) return raw;
  return raw.replace(/fc\s*s(o|ó)lu(c|ç)(o|õ)es/gi, 'SaaS');
}

function formatTime(value) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getLeadById(leadId) {
  if (!leadId) return null;
  return leadsCache.find((item) => item.lead_id === leadId) ?? null;
}

function getLeadByPhone(phone) {
  if (!phone) return null;
  return leadsCache.find((item) => item.phone_e164 === phone) ?? null;
}

function selectedConversation() {
  return conversationsCache.find((item) => item.conversation_id === selectedConversationId) ?? null;
}

function applyThreadMeta(conversation) {
  if (!conversation) {
    threadContactEl.textContent = 'Selecione uma conversa';
    threadMetaEl.textContent = 'Abra uma conversa para ler e responder mensagens.';
    return;
  }
  const linkedLead = getLeadById(conversation.lead_id) ?? getLeadByPhone(conversation.contact_e164);
  const stage = linkedLead?.stage ?? conversation.lead_stage ?? 'sem_stage';
  threadContactEl.textContent = conversation.display_name || conversation.contact_e164;
  threadMetaEl.textContent = `${conversation.contact_e164} | stage: ${stage}`;
}

function renderLeads(items) {
  if (!items.length) {
    leadRows.innerHTML = '<tr><td colspan="5" class="empty">Sem leads para este tenant.</td></tr>';
    leadCount.textContent = '0 items';
    Object.values(kpis).forEach((el) => { el.textContent = '0'; });
    return;
  }

  const conversationByPhone = new Map(conversationsCache.map((item) => [item.contact_e164, item]));
  leadRows.innerHTML = items
    .map((lead) => {
      const hasConversation = conversationByPhone.has(lead.phone_e164);
      return `
      <tr>
        <td>${safeText(lead.display_name)}</td>
        <td>${safeText(lead.phone_e164)}</td>
        <td>${safeText(lead.source_channel)}</td>
        <td>${safeText(lead.stage)}</td>
        <td>
          ${hasConversation
            ? `<button class="link-btn" type="button" data-open-phone="${safeText(lead.phone_e164)}">Abrir chat</button>`
            : '<span class="empty">Sem conversa</span>'}
        </td>
      </tr>
    `;
    })
    .join('');

  leadCount.textContent = `${items.length} items`;

  const counts = { new: 0, qualified: 0, proposal: 0, won: 0, lost: 0 };
  items.forEach((lead) => {
    if (counts[lead.stage] != null) counts[lead.stage] += 1;
  });
  Object.entries(counts).forEach(([stage, value]) => {
    kpis[stage].textContent = String(value);
  });

  leadRows.querySelectorAll('[data-open-phone]').forEach((button) => {
    button.addEventListener('click', () => {
      const phone = button.getAttribute('data-open-phone') || '';
      const conversation = conversationsCache.find((item) => item.contact_e164 === phone);
      if (conversation) {
        openConversation(conversation.conversation_id, { markRead: true });
      }
    });
  });
}

function renderConversations(items) {
  conversationsCache = items;
  conversationCountEl.textContent = `${items.length} conversas`;

  if (!items.length) {
    conversationListEl.innerHTML = '<p class="empty">Sem conversas para este tenant.</p>';
    if (selectedConversationId) {
      selectedConversationId = null;
      selectedThreadMessages = [];
      latestAiDraftReply = '';
      latestAiQualifySuggestion = null;
      renderThreadMessages();
      applyThreadMeta(null);
    }
    return;
  }

  if (!selectedConversationId || !items.some((item) => item.conversation_id === selectedConversationId)) {
    selectedConversationId = items[0].conversation_id;
  }

  conversationListEl.innerHTML = items
    .map((conversation) => {
      const isActive = conversation.conversation_id === selectedConversationId;
      const title = conversation.display_name || conversation.contact_e164;
      const unread = Number(conversation.unread_count ?? 0);
      const preview = normalizeBrandText(conversation.last_message_preview || 'Sem mensagens');
      return `
      <button class="conversation-item ${isActive ? 'is-active' : ''}" type="button" data-conversation-id="${safeText(conversation.conversation_id)}">
        <div class="conversation-item__top">
          <span class="conversation-item__name">${safeText(title)}</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        </div>
        <p class="conversation-item__preview">${safeText(preview)}</p>
        <div class="conversation-item__meta">
          <span>${safeText(conversation.lead_stage || 'sem stage')}</span>
          <span>${safeText(formatTime(conversation.last_message_at))}</span>
        </div>
      </button>
    `;
    })
    .join('');

  conversationListEl.querySelectorAll('[data-conversation-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const conversationId = button.getAttribute('data-conversation-id') || '';
      openConversation(conversationId, { markRead: true });
    });
  });
}

function renderThreadMessages() {
  if (!selectedConversationId) {
    threadMessagesEl.innerHTML = '<p class="empty">Sem conversa selecionada.</p>';
    return;
  }

  if (!selectedThreadMessages.length) {
    threadMessagesEl.innerHTML = '<p class="empty">Sem mensagens nesta conversa.</p>';
    return;
  }

  const messageTimelineMs = (message) => {
    const occurred = new Date(message?.occurred_at ?? 0).getTime();
    const created = new Date(message?.created_at ?? 0).getTime();
    if (Number.isFinite(occurred) && Number.isFinite(created)) {
      return Math.max(occurred, created);
    }
    if (Number.isFinite(created)) return created;
    if (Number.isFinite(occurred)) return occurred;
    return 0;
  };

  const sortedMessages = [...selectedThreadMessages].sort((left, right) => {
    const leftDate = messageTimelineMs(left);
    const rightDate = messageTimelineMs(right);
    if (leftDate !== rightDate) return leftDate - rightDate;
    return String(left?.message_row_id ?? '').localeCompare(String(right?.message_row_id ?? ''));
  });

  threadMessagesEl.innerHTML = sortedMessages
    .map((message) => {
      const isOutbound = message.direction === 'outbound';
      const cssClass = isOutbound ? 'is-outbound' : 'is-inbound';
      const directionLabel = isOutbound ? 'saida' : 'entrada';
      const text = normalizeBrandText(String(message.text ?? '').trim())
        || (message.message_type && message.message_type !== 'text'
          ? `(mensagem ${message.message_type})`
          : '(sem texto)');
      return `
      <article class="thread-message ${cssClass}">
        <div>${safeText(text)}</div>
        <div class="thread-message__meta">${safeText(directionLabel)} | ${safeText(message.delivery_state || 'unknown')} | ${safeText(formatTime(message.created_at || message.occurred_at))}</div>
      </article>
    `;
    })
    .join('');

  threadMessagesEl.scrollTop = threadMessagesEl.scrollHeight;
}

async function loadConversations() {
  try {
    const response = await fetch(`${apiBase()}/v1/crm/conversations?tenant_id=${encodeURIComponent(tenantId())}&limit=200`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
    renderConversations(body.items ?? []);
    return body.items ?? [];
  } catch (error) {
    conversationListEl.innerHTML = `<p class="empty">Erro ao carregar conversas: ${safeText(error.message)}</p>`;
    return [];
  }
}

async function openConversation(conversationId, options = { markRead: false }) {
  selectedConversationId = conversationId;
  latestAiDraftReply = '';
  latestAiQualifySuggestion = null;
  renderConversations(conversationsCache);
  const conversation = selectedConversation();
  applyThreadMeta(conversation);
  if (!conversation) {
    selectedThreadMessages = [];
    renderThreadMessages();
    return;
  }

  try {
    const response = await fetch(`${apiBase()}/v1/crm/conversations/${encodeURIComponent(conversationId)}/messages?tenant_id=${encodeURIComponent(tenantId())}&limit=300`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
    selectedThreadMessages = body.items ?? [];
    renderThreadMessages();
    if (options.markRead && Number(conversation.unread_count ?? 0) > 0) {
      await fetch(`${apiBase()}/v1/crm/conversations/${encodeURIComponent(conversationId)}/read?tenant_id=${encodeURIComponent(tenantId())}`, {
        method: 'POST'
      });
      await loadConversations();
      renderLeads(leadsCache);
      applyThreadMeta(selectedConversation());
    }
  } catch (error) {
    threadMessagesEl.innerHTML = `<p class="empty">Erro ao abrir thread: ${safeText(error.message)}</p>`;
  }
}

async function loadLeads() {
  formStatus.textContent = 'Carregando leads...';
  try {
    const response = await fetch(`${apiBase()}/v1/crm/leads?tenant_id=${encodeURIComponent(tenantId())}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
    leadsCache = body.items ?? [];
    renderLeads(leadsCache);
    formStatus.textContent = 'Leads atualizados.';
  } catch (error) {
    leadsCache = [];
    renderLeads([]);
    formStatus.textContent = `Erro ao carregar: ${error.message}`;
  }
}

async function loadAllData() {
  await loadConversations();
  await loadLeads();
  if (selectedConversationId) {
    await openConversation(selectedConversationId, { markRead: false });
  } else {
    applyThreadMeta(null);
    selectedThreadMessages = [];
    renderThreadMessages();
  }
}

function stopInboxPolling() {
  if (inboxPollingTimer != null) {
    clearInterval(inboxPollingTimer);
    inboxPollingTimer = null;
  }
}

function startInboxPolling() {
  stopInboxPolling();
  inboxPollingTimer = setInterval(async () => {
    if (document.hidden || inboxPollingInFlight) return;
    inboxPollingInFlight = true;
    try {
      await loadConversations();
      if (selectedConversationId) {
        await openConversation(selectedConversationId, { markRead: false });
      }
    } catch {
      // Silent retry on next interval.
    } finally {
      inboxPollingInFlight = false;
    }
  }, INBOX_POLL_INTERVAL_MS);
}

async function createLead(event) {
  event.preventDefault();
  const displayName = document.getElementById('displayName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const sourceChannel = document.getElementById('sourceChannel').value;
  const stage = document.getElementById('stage').value;

  formStatus.textContent = 'Criando lead...';

  try {
    const response = await fetch(`${apiBase()}/v1/crm/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          source_module: 'mod-02-whatsapp-crm',
          lead: {
            lead_id: crypto.randomUUID(),
            external_key: `ui-${crypto.randomUUID()}`,
            display_name: displayName,
            phone_e164: phone,
            source_channel: sourceChannel,
            stage
          }
        }
      })
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }

    formStatus.textContent = `Lead ${body.response.status}. Atualizando lista...`;
    await loadAllData();
    leadForm.reset();
    document.getElementById('phone').value = '+5511999999999';
  } catch (error) {
    formStatus.textContent = `Falha ao criar lead: ${error.message}`;
  }
}

function applyTenantTheme() {
  const tenant = tenantId().toLowerCase();
  const preset = TENANT_THEME_PRESETS[tenant];

  if (!preset) {
    formStatus.textContent = `Sem preset visual para tenant "${tenant}".`;
    return;
  }

  applyVisualMode({ layout: preset.layout, palette: preset.palette, persist: true });
  formStatus.textContent = `Tema aplicado: layout=${preset.layout}, palette=${preset.palette}.`;
}

async function sendThreadMessage(event) {
  event.preventDefault();
  const conversation = selectedConversation();
  if (!conversation) {
    formStatus.textContent = 'Selecione uma conversa antes de enviar mensagem.';
    return;
  }
  const text = threadMessageInput.value.trim();
  if (!text) return;

  formStatus.textContent = 'Enviando mensagem...';
  try {
    const response = await fetch(`${apiBase()}/v1/crm/conversations/${encodeURIComponent(conversation.conversation_id)}/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          text
        }
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.details || body.error || `HTTP ${response.status}`);
    }

    threadMessageInput.value = '';
    formStatus.textContent = 'Mensagem enviada para WhatsApp.';
    await openConversation(conversation.conversation_id, { markRead: false });
    await loadConversations();
    renderLeads(leadsCache);
  } catch (error) {
    formStatus.textContent = `Falha no envio: ${error.message}`;
  }
}

async function postConversationAi(conversationId, suffix, requestPayload = {}) {
  const response = await fetch(
    `${apiBase()}/v1/crm/conversations/${encodeURIComponent(conversationId)}/ai/${suffix}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          ...requestPayload
        }
      })
    }
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.details || body.error || `HTTP ${response.status}`);
  }
  return body.response ?? body;
}

async function handleAiSuggestReply() {
  const conversation = selectedConversation();
  if (!conversation) {
    formStatus.textContent = 'Selecione uma conversa para sugerir resposta por IA.';
    return;
  }

  try {
    formStatus.textContent = 'Gerando sugestao de resposta por IA...';
    const response = await postConversationAi(conversation.conversation_id, 'suggest-reply', {
      tone: 'consultivo'
    });
    const draft = String(response.draft_reply || '').trim();
    if (!draft) {
      throw new Error('IA retornou rascunho vazio');
    }
    latestAiDraftReply = draft;
    threadMessageInput.value = draft;
    formStatus.textContent = `Rascunho IA pronto (confianca ${Number(response.confidence ?? 0).toFixed(2)}).`;
  } catch (error) {
    formStatus.textContent = `Falha ao sugerir resposta IA: ${error.message}`;
  }
}

async function updateLeadStage(leadId, currentStage, nextStage) {
  const key = `${currentStage}->${nextStage}`;
  const trigger = STAGE_TRIGGERS[key];
  if (!trigger) {
    throw new Error(`Transicao nao suportada: ${key}`);
  }

  const payload = {
    request: {
      request_id: crypto.randomUUID(),
      tenant_id: tenantId(),
      source_module: 'mod-02-whatsapp-crm',
      changes: {
        to_stage: nextStage,
        trigger
      }
    }
  };
  if (key === 'lost->nurturing') {
    payload.request.changes.reason_code = 'reopen_manual';
  }

  const response = await fetch(`${apiBase()}/v1/crm/leads/${encodeURIComponent(leadId)}/stage`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || body.details?.code || `HTTP ${response.status}`);
  }
  return body;
}

async function handleQualifyLead() {
  const conversation = selectedConversation();
  if (!conversation) {
    formStatus.textContent = 'Selecione uma conversa para qualificar por IA.';
    return;
  }

  try {
    formStatus.textContent = 'Analisando qualificacao por IA...';
    const response = await postConversationAi(conversation.conversation_id, 'qualify');
    latestAiQualifySuggestion = response;

    const suggestedStage = String(response.suggested_stage || '').trim();
    if (suggestedStage) {
      threadStageSelect.value = suggestedStage;
    }
    formStatus.textContent = `IA sugeriu stage ${response.suggested_stage} (confianca ${Number(response.confidence ?? 0).toFixed(2)}).`;
  } catch (error) {
    formStatus.textContent = `Falha ao qualificar por IA: ${error.message}`;
  }
}

async function executeAiAction(conversationId, action, payload) {
  return postConversationAi(conversationId, 'execute', {
    action,
    client_request_id: crypto.randomUUID(),
    payload
  });
}

async function handleAiExecute() {
  const conversation = selectedConversation();
  if (!conversation) {
    formStatus.textContent = 'Selecione uma conversa para executar IA.';
    return;
  }

  const replyText = threadMessageInput.value.trim() || latestAiDraftReply;
  const qualifySuggestion = latestAiQualifySuggestion;

  try {
    if (replyText) {
      formStatus.textContent = 'Executando envio IA no WhatsApp...';
      await executeAiAction(conversation.conversation_id, 'send_reply', {
        reply_text: replyText
      });
      threadMessageInput.value = '';
      latestAiDraftReply = '';
      await openConversation(conversation.conversation_id, { markRead: false });
      await loadConversations();
      renderLeads(leadsCache);
      formStatus.textContent = 'Resposta IA executada e enviada no WhatsApp.';
      return;
    }

    if (qualifySuggestion?.suggested_stage && qualifySuggestion?.required_trigger) {
      formStatus.textContent = 'Executando update de stage por IA...';
      await executeAiAction(conversation.conversation_id, 'update_stage', {
        to_stage: qualifySuggestion.suggested_stage,
        trigger: qualifySuggestion.required_trigger,
        reason_code: 'ia_qualificacao_assistida'
      });
      await loadAllData();
      if (selectedConversationId) {
        await openConversation(selectedConversationId, { markRead: false });
      }
      formStatus.textContent = `Stage atualizado por IA para ${qualifySuggestion.suggested_stage}.`;
      return;
    }

    formStatus.textContent = 'Sem acao IA pronta: gere sugestao de resposta ou qualificacao antes de executar.';
  } catch (error) {
    formStatus.textContent = `Falha ao executar IA: ${error.message}`;
  }
}

async function handleUpdateStage() {
  const conversation = selectedConversation();
  if (!conversation) {
    formStatus.textContent = 'Selecione uma conversa para atualizar stage.';
    return;
  }
  const linkedLead = getLeadById(conversation.lead_id) ?? getLeadByPhone(conversation.contact_e164);
  if (!linkedLead) {
    formStatus.textContent = 'Conversa sem lead vinculado ainda.';
    return;
  }

  const nextStage = String(threadStageSelect.value || '').trim();
  if (!nextStage) return;

  try {
    formStatus.textContent = `Atualizando stage para ${nextStage}...`;
    await updateLeadStage(linkedLead.lead_id, linkedLead.stage, nextStage);
    await loadAllData();
    if (selectedConversationId) {
      await openConversation(selectedConversationId, { markRead: false });
    }
    formStatus.textContent = `Stage atualizado para ${nextStage}.`;
  } catch (error) {
    formStatus.textContent = `Falha ao atualizar stage: ${error.message}`;
  }
}

mobileMenuBtn.addEventListener('click', () => {
  if (rootEl.dataset.layout === 'studio') return;
  bodyEl.classList.toggle('menu-open');
});

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

reloadBtn.addEventListener('click', loadAllData);
leadForm.addEventListener('submit', createLead);
threadSendForm.addEventListener('submit', sendThreadMessage);
threadAiSuggestBtn.addEventListener('click', handleAiSuggestReply);
threadQualifyBtn.addEventListener('click', handleQualifyLead);
threadAiExecuteBtn.addEventListener('click', handleAiExecute);
threadUpdateStageBtn.addEventListener('click', handleUpdateStage);

apiBaseInput.addEventListener('change', () => {
  apiBaseInput.value = normalizeApiBase(apiBaseInput.value);
  persistApiBasePreference(apiBaseInput.value);
});
apiBaseInput.addEventListener('blur', () => {
  apiBaseInput.value = normalizeApiBase(apiBaseInput.value);
  persistApiBasePreference(apiBaseInput.value);
});

async function loadWhatsAppQr() {
  stopQrConnectionPolling();
  const resultEl = document.getElementById('whatsappQrResult');
  const statusEl = document.getElementById('whatsappQrStatus');
  const imageWrap = document.getElementById('whatsappQrImageWrap');
  const pairingEl = document.getElementById('whatsappPairingCode');
  const btn = document.getElementById('whatsappQrBtn');
  if (!resultEl || !statusEl || !imageWrap || !pairingEl || !btn) return;
  resultEl.hidden = false;
  statusEl.textContent = 'Buscando QR na Evolution API...';
  imageWrap.innerHTML = '';
  pairingEl.textContent = '';
  btn.disabled = true;
  try {
    const tid = tenantId();
    const url = tid
      ? `${apiBase()}/v1/whatsapp/evolution/qr?tenant_id=${encodeURIComponent(tid)}`
      : `${apiBase()}/v1/whatsapp/evolution/qr`;

    const hasQrOrConnected = (resOk, payload) => {
      if (!resOk) return false;
      const code = String(payload.code ?? payload.base64 ?? '').trim();
      const pairingCode = String(payload.pairingCode ?? '').trim();
      const backendStatus = String(payload.status ?? '').trim().toLowerCase();
      const connectionState = String(payload.connectionState ?? '').trim().toLowerCase();
      return (
        code.length > 0 ||
        pairingCode.length > 0 ||
        backendStatus === 'connected' ||
        connectionState === 'open'
      );
    };

    let finalResponse = null;
    let finalPayload = {};
    const maxAttempts = 16;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      statusEl.textContent = `Buscando QR na Evolution API... (${attempt}/${maxAttempts})`;
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      finalResponse = res;
      finalPayload = data;

      const ready = hasQrOrConnected(res.ok, data);
      if (!res.ok || ready || attempt === maxAttempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }

    if (finalResponse?.ok && !hasQrOrConnected(finalResponse.ok, finalPayload)) {
      const forceUrl = `${url}${url.includes('?') ? '&' : '?'}force_new=1`;
      statusEl.textContent = 'QR pendente. Recriando instancia para gerar novo QR...';
      const forceRes = await fetch(forceUrl);
      const forcePayload = await forceRes.json().catch(() => ({}));
      if (forceRes.ok) {
        finalResponse = forceRes;
        finalPayload = forcePayload;
      } else if (!finalResponse.ok) {
        finalResponse = forceRes;
        finalPayload = forcePayload;
      }
    }

    if (!finalResponse?.ok) {
      statusEl.textContent = finalPayload.message || finalPayload.error || `Erro ${finalResponse?.status ?? 'rede'}`;
      if (finalPayload.error === 'evolution_not_configured') {
        pairingEl.textContent = 'Configure no backend: EVOLUTION_HTTP_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_ID (ex: fabio para nao conflitar com fabio2).';
      }
      return;
    }

    const code = String(finalPayload.code ?? finalPayload.base64 ?? '').trim();
    const base64FromBackend = String(finalPayload.base64 ?? '').trim();
    const pairingCode = String(finalPayload.pairingCode ?? '').trim();
    const connectionState = String(finalPayload.connectionState ?? '').trim().toLowerCase();
    const backendStatus = String(finalPayload.status ?? '').trim().toLowerCase();
    const backendMessage = String(finalPayload.message ?? '').trim();

    const hasBase64Image = base64FromBackend.startsWith('data:');
    const isDataUrl = code.startsWith('data:');
    const looksLikeBase64Image = hasBase64Image || isDataUrl || (code.length > 100 && /^[A-Za-z0-9+/=]+$/.test(code));
    const isEvolutionQrPayload = code.length > 20 && !looksLikeBase64Image;

    if (hasBase64Image) {
      const img = document.createElement('img');
      img.src = base64FromBackend;
      img.alt = 'QR Code WhatsApp';
      img.className = 'whatsapp-qr-img';
      imageWrap.appendChild(img);
    } else if (looksLikeBase64Image) {
      const src = isDataUrl ? code : `data:image/png;base64,${code}`;
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'QR Code WhatsApp';
      img.className = 'whatsapp-qr-img';
      imageWrap.appendChild(img);
    } else if (isEvolutionQrPayload && typeof window.QRCode !== 'undefined') {
      window.QRCode.toDataURL(code, { margin: 2, width: 280 }, function (err, dataUrl) {
        if (!err && dataUrl) {
          const img = document.createElement('img');
          img.src = dataUrl;
          img.alt = 'QR Code WhatsApp';
          img.className = 'whatsapp-qr-img';
          imageWrap.appendChild(img);
        }
      });
    }

    if (pairingCode) {
      pairingEl.textContent = `Codigo de vinculacao: ${pairingCode}`;
    } else if (code && !looksLikeBase64Image && !isEvolutionQrPayload) {
      pairingEl.textContent = `Codigo recebido: ${code}`;
    }

    if (backendMessage.length > 0) {
      statusEl.textContent = backendMessage;
    } else if (backendStatus === 'connected' || connectionState === 'open' || connectionState === 'connected') {
      statusEl.textContent = 'Instancia ja conectada no WhatsApp. Se quiser novo QR, desconecte a instancia primeiro.';
    } else if (looksLikeBase64Image || isEvolutionQrPayload || pairingCode.length > 0) {
      statusEl.textContent = 'Escaneie o QR com WhatsApp (Dispositivo vinculado) ou use o codigo de vinculacao.';
      startQrConnectionPolling(url, statusEl, imageWrap, pairingEl, btn);
    } else {
      statusEl.textContent = 'QR ainda nao disponivel. Aguarde alguns segundos e clique novamente (ou valide Evolution Base URL/API Key/Instance no menu 06).';
    }
  } catch (e) {
    statusEl.textContent = `Erro: ${e.message || 'rede'}`;
  } finally {
    btn.disabled = false;
  }
}

let qrPollingTimer = null;
const QR_POLL_INTERVAL_MS = 3000;
const QR_POLL_MAX_DURATION_MS = 5 * 60 * 1000;

function stopQrConnectionPolling() {
  if (qrPollingTimer != null) {
    clearInterval(qrPollingTimer);
    qrPollingTimer = null;
  }
}

function startQrConnectionPolling(url, statusEl, imageWrap, pairingEl, btn) {
  stopQrConnectionPolling();
  const startedAt = Date.now();
  qrPollingTimer = setInterval(async () => {
    if (Date.now() - startedAt > QR_POLL_MAX_DURATION_MS) {
      stopQrConnectionPolling();
      return;
    }
    try {
      const res = await fetch(url);
      const data = await res.json().catch(() => ({}));
      const connectionState = String(data.connectionState ?? '').trim().toLowerCase();
      const backendStatus = String(data.status ?? '').trim().toLowerCase();
      if (connectionState === 'open' || connectionState === 'connected' || backendStatus === 'connected') {
        stopQrConnectionPolling();
        statusEl.textContent = 'Instancia ja conectada no WhatsApp. Se quiser novo QR, desconecte a instancia primeiro.';
        imageWrap.innerHTML = '<p class="whatsapp-qr-connected">WhatsApp conectado.</p>';
        if (pairingEl) pairingEl.textContent = '';
        if (btn) btn.disabled = false;
      }
    } catch {
      // ignore network errors during poll
    }
  }, QR_POLL_INTERVAL_MS);
}

const whatsappQrBtn = document.getElementById('whatsappQrBtn');
if (whatsappQrBtn) {
  whatsappQrBtn.addEventListener('click', loadWhatsAppQr);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  loadConversations();
  if (selectedConversationId) {
    openConversation(selectedConversationId, { markRead: false });
  }
});

window.addEventListener('beforeunload', () => {
  stopInboxPolling();
  stopQrConnectionPolling();
});

restoreVisualMode();
apiBaseInput.value = loadApiBasePreference();
applyBootstrapFromQuery();
loadAllData();
startInboxPolling();
