const VALID_LAYOUTS = ['fabio2', 'studio', 'zazi'];
const VALID_PALETTES = ['darkgreen', 'ocean', 'forest', 'sunset'];
const LEGACY_DEFAULT_API_BASE = 'http://127.0.0.1:4300';
const API_BASE_STORAGE_KEY = 'crm_console_api_base_v1';

const TENANT_THEME_PRESETS = {
  tenant_automania: { layout: 'zazi', palette: 'darkgreen' },
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
const CRM_STAGE_KEYS = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'nurturing'];
const DEFAULT_TENANT_PIPELINE_STAGES = [
  { stage: 'new', label: 'New', active: true, order: 10 },
  { stage: 'contacted', label: 'Contacted', active: true, order: 20 },
  { stage: 'qualified', label: 'Qualified', active: true, order: 30 },
  { stage: 'proposal', label: 'Proposal', active: true, order: 40 },
  { stage: 'negotiation', label: 'Negotiation', active: true, order: 50 },
  { stage: 'won', label: 'Won', active: true, order: 60 },
  { stage: 'lost', label: 'Lost', active: true, order: 70 },
  { stage: 'nurturing', label: 'Nurturing', active: true, order: 80 }
];

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
const viewInboxBtn = document.getElementById('viewInboxBtn');
const viewPipelineBtn = document.getElementById('viewPipelineBtn');
const viewLeadsBtn = document.getElementById('viewLeadsBtn');
const inboxViewCardEl = document.getElementById('inboxViewCard');
const pipelineViewCardEl = document.getElementById('pipelineViewCard');
const leadsViewCardEl = document.getElementById('leadsViewCard');
const pipelineBoardEl = document.getElementById('pipelineBoard');
const leadSearchInput = document.getElementById('leadSearchInput');
const savedViewSelect = document.getElementById('savedViewSelect');
const saveViewBtn = document.getElementById('saveViewBtn');
const deleteViewBtn = document.getElementById('deleteViewBtn');
const leadStageFilter = document.getElementById('leadStageFilter');
const leadChannelFilter = document.getElementById('leadChannelFilter');
const leadGroupBy = document.getElementById('leadGroupBy');
const leadClearFiltersBtn = document.getElementById('leadClearFiltersBtn');
const detailLeadNameEl = document.getElementById('detailLeadName');
const detailLeadStageEl = document.getElementById('detailLeadStage');
const detailLeadPhoneEl = document.getElementById('detailLeadPhone');
const detailLeadChannelEl = document.getElementById('detailLeadChannel');
const detailLeadIdEl = document.getElementById('detailLeadId');
const detailActivityListEl = document.getElementById('detailActivityList');
const detailTaskForm = document.getElementById('detailTaskForm');
const detailTaskTitleInput = document.getElementById('detailTaskTitle');
const detailTaskDueInput = document.getElementById('detailTaskDue');
const detailTaskListEl = document.getElementById('detailTaskList');
const stageBarsEl = document.getElementById('stageBars');
const channelBarsEl = document.getElementById('channelBars');

const kpis = {
  new: document.getElementById('kpi-new'),
  qualified: document.getElementById('kpi-qualified'),
  proposal: document.getElementById('kpi-proposal'),
  won: document.getElementById('kpi-won'),
  lost: document.getElementById('kpi-lost')
};

let embeddedMode = false;
let leadsCache = [];
let dealsCache = [];
let conversationsCache = [];
let savedViewsCache = [];
let selectedConversationId = null;
let selectedThreadMessages = [];
let selectedDealActivities = [];
let selectedDealTasks = [];
let latestAiDraftReply = '';
let latestAiQualifySuggestion = null;
let inboxPollingTimer = null;
let inboxPollingInFlight = false;
const INBOX_POLL_INTERVAL_MS = 5000;
let currentMainView = 'inbox';
let activeSavedViewId = '';
const filters = {
  search: '',
  stage: 'all',
  channel: 'all',
  groupBy: 'stage'
};
const DEAL_STAGE_VALUES = new Set(CRM_STAGE_KEYS);
let tenantCrmRuntime = {
  pipeline: {
    stages: DEFAULT_TENANT_PIPELINE_STAGES.map((item) => ({ ...item })),
    default_stage: 'new'
  }
};

function normalizeLayout(layout) {
  return VALID_LAYOUTS.includes(layout) ? layout : 'fabio2';
}

function normalizePalette(palette) {
  return VALID_PALETTES.includes(palette) ? palette : 'darkgreen';
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

function loadSavedViews() {
  return savedViewsCache.filter((item) => item && typeof item === 'object' && item.view_id && item.name && item.filters);
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
  renderSavedViewOptions();
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

function dealTimestampMs(deal) {
  const updated = new Date(deal?.updated_at ?? 0).getTime();
  const created = new Date(deal?.created_at ?? 0).getTime();
  if (Number.isFinite(updated) && Number.isFinite(created)) {
    return Math.max(updated, created);
  }
  if (Number.isFinite(updated)) return updated;
  if (Number.isFinite(created)) return created;
  return 0;
}

function normalizeDealStageForPayload(stage) {
  const raw = String(stage || '').trim().toLowerCase();
  if (DEAL_STAGE_VALUES.has(raw)) return raw;
  if (raw === 'negotiation') return 'proposal';
  return 'new';
}

function normalizeCrmStage(value, fallback = 'new') {
  const raw = String(value ?? '').trim().toLowerCase();
  return CRM_STAGE_KEYS.includes(raw) ? raw : fallback;
}

function normalizeTenantPipelineStages(items) {
  const source = Array.isArray(items) ? items : DEFAULT_TENANT_PIPELINE_STAGES;
  const dedup = new Map();
  for (let index = 0; index < source.length; index += 1) {
    const item = source[index];
    if (!item || typeof item !== 'object') continue;
    const stage = normalizeCrmStage(item.stage, '');
    if (!stage) continue;
    dedup.set(stage, {
      stage,
      label: String(item.label ?? '').trim() || (stage.charAt(0).toUpperCase() + stage.slice(1)),
      active: item.active !== false,
      order: Number.isFinite(Number(item.order)) ? Math.floor(Number(item.order)) : (index + 1) * 10
    });
  }
  if (dedup.size === 0) {
    return DEFAULT_TENANT_PIPELINE_STAGES.map((item) => ({ ...item }));
  }
  return [...dedup.values()].sort((left, right) => {
    if (left.order !== right.order) return left.order - right.order;
    return left.stage.localeCompare(right.stage);
  });
}

function activeTenantPipelineStages() {
  const stages = normalizeTenantPipelineStages(tenantCrmRuntime?.pipeline?.stages);
  const active = stages.filter((item) => item.active !== false);
  return active.length > 0 ? active : stages;
}

function refreshStageDrivenInputs() {
  const activeStages = activeTenantPipelineStages();
  const defaultStage = normalizeCrmStage(
    tenantCrmRuntime?.pipeline?.default_stage,
    activeStages[0]?.stage ?? 'new'
  );
  const stageOptions = activeStages
    .map((item) => `<option value="${safeText(item.stage)}">${safeText(item.stage)}</option>`)
    .join('');
  if (threadStageSelect) {
    threadStageSelect.innerHTML = stageOptions;
    threadStageSelect.value = activeStages.some((item) => item.stage === defaultStage)
      ? defaultStage
      : (activeStages[0]?.stage ?? 'new');
  }
  const leadStageOptions = activeStages
    .map((item) => `<option value="${safeText(item.stage)}">${safeText(item.stage)}</option>`)
    .join('');
  const createLeadStageSelect = document.getElementById('stage');
  if (createLeadStageSelect) {
    createLeadStageSelect.innerHTML = leadStageOptions;
    createLeadStageSelect.value = activeStages.some((item) => item.stage === defaultStage)
      ? defaultStage
      : (activeStages[0]?.stage ?? 'new');
  }

  const filterOptions = ['<option value="all">Todos</option>']
    .concat(activeStages.map((item) => `<option value="${safeText(item.stage)}">${safeText(item.stage)}</option>`))
    .join('');
  if (leadStageFilter) {
    leadStageFilter.innerHTML = filterOptions;
    const normalizedFilter = String(filters.stage || 'all').toLowerCase();
    leadStageFilter.value = activeStages.some((item) => item.stage === normalizedFilter) ? normalizedFilter : 'all';
    filters.stage = leadStageFilter.value;
  }
}

async function loadTenantRuntimeConfig() {
  const tid = tenantId();
  if (!tid) return;
  try {
    const response = await fetch(`${apiBase()}/v1/owner-concierge/runtime-config?tenant_id=${encodeURIComponent(tid)}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.details || body.error || `HTTP ${response.status}`);
    }
    const stages = normalizeTenantPipelineStages(body?.crm?.pipeline?.stages);
    const defaultStage = normalizeCrmStage(body?.crm?.pipeline?.default_stage, stages[0]?.stage ?? 'new');
    tenantCrmRuntime = {
      pipeline: {
        stages,
        default_stage: stages.some((item) => item.stage === defaultStage)
          ? defaultStage
          : stages[0]?.stage ?? 'new'
      }
    };
  } catch {
    tenantCrmRuntime = {
      pipeline: {
        stages: DEFAULT_TENANT_PIPELINE_STAGES.map((item) => ({ ...item })),
        default_stage: 'new'
      }
    };
  }
  refreshStageDrivenInputs();
}

function getDealByLeadId(leadId) {
  if (!leadId) return null;
  const matches = dealsCache.filter((item) => item.lead_id === leadId);
  if (!matches.length) return null;
  matches.sort((left, right) => dealTimestampMs(right) - dealTimestampMs(left));
  return matches[0];
}

function getEffectiveLeadStage(lead) {
  const deal = getDealByLeadId(lead?.lead_id);
  return String(deal?.stage || lead?.stage || 'new').toLowerCase();
}

function mapLeadForUi(lead) {
  const deal = getDealByLeadId(lead.lead_id);
  return {
    ...lead,
    stage: deal?.stage ?? lead.stage,
    deal_id: deal?.deal_id ?? null,
    deal_title: deal?.title ?? null
  };
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
  const stage = linkedLead ? getEffectiveLeadStage(linkedLead) : (conversation.lead_stage ?? 'sem_stage');
  threadContactEl.textContent = conversation.display_name || conversation.contact_e164;
  threadMetaEl.textContent = `${conversation.contact_e164} | stage: ${stage}`;
}

function getLinkedLeadForConversation(conversation) {
  if (!conversation) return null;
  return getLeadById(conversation.lead_id) ?? getLeadByPhone(conversation.contact_e164);
}

function getLinkedDealForConversation(conversation) {
  const linkedLead = getLinkedLeadForConversation(conversation);
  if (!linkedLead?.lead_id) return null;
  return getDealByLeadId(linkedLead.lead_id);
}

async function createDealForLead(lead) {
  const response = await fetch(`${apiBase()}/v1/crm/deals`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      request: {
        request_id: crypto.randomUUID(),
        tenant_id: tenantId(),
        source_module: 'mod-02-whatsapp-crm',
        deal: {
          lead_id: lead.lead_id,
          external_key: `lead-${lead.lead_id}`,
          title: lead.display_name || lead.phone_e164 || `Lead ${lead.lead_id}`,
          stage: normalizeDealStageForPayload(lead.stage),
          metadata: {
            origin: 'crm-console-auto-link'
          }
        }
      }
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.details || body.error || `HTTP ${response.status}`);
  }
  return body.response?.deal ?? null;
}

async function ensureDealForLead(lead) {
  if (!lead?.lead_id) return null;
  const cached = getDealByLeadId(lead.lead_id);
  if (cached) return cached;
  const created = await createDealForLead(lead);
  if (!created?.deal_id) return null;
  dealsCache = [created, ...dealsCache.filter((item) => item.deal_id !== created.deal_id)];
  return created;
}

async function loadSelectedDealDetails() {
  const conversation = selectedConversation();
  const linkedDeal = getLinkedDealForConversation(conversation);
  if (!linkedDeal?.deal_id) {
    selectedDealActivities = [];
    selectedDealTasks = [];
    return;
  }

  const dealIdQuery = encodeURIComponent(linkedDeal.deal_id);
  const tenantQuery = encodeURIComponent(tenantId());

  try {
    const [activitiesRes, tasksRes] = await Promise.all([
      fetch(`${apiBase()}/v1/crm/activities?tenant_id=${tenantQuery}&deal_id=${dealIdQuery}&limit=200`),
      fetch(`${apiBase()}/v1/crm/tasks?tenant_id=${tenantQuery}&deal_id=${dealIdQuery}&limit=200`)
    ]);

    const [activitiesBody, tasksBody] = await Promise.all([
      activitiesRes.json().catch(() => ({})),
      tasksRes.json().catch(() => ({}))
    ]);

    if (!activitiesRes.ok) {
      throw new Error(activitiesBody.details || activitiesBody.error || `HTTP ${activitiesRes.status}`);
    }
    if (!tasksRes.ok) {
      throw new Error(tasksBody.details || tasksBody.error || `HTTP ${tasksRes.status}`);
    }

    selectedDealActivities = Array.isArray(activitiesBody.items) ? activitiesBody.items : [];
    selectedDealTasks = Array.isArray(tasksBody.items) ? tasksBody.items : [];
  } catch (error) {
    selectedDealActivities = [];
    selectedDealTasks = [];
    formStatus.textContent = `Falha ao carregar painel de deal: ${error.message}`;
  }
}

function renderDetailPanel() {
  const conversation = selectedConversation();
  const linkedLead = getLinkedLeadForConversation(conversation);
  const linkedDeal = getLinkedDealForConversation(conversation);
  const fallbackName = conversation?.display_name || conversation?.contact_e164 || '--';
  const leadStage = linkedDeal?.stage || getEffectiveLeadStage(linkedLead) || conversation?.lead_stage || '--';
  const leadPhone = linkedLead?.phone_e164 || conversation?.contact_e164 || '--';
  const leadChannel = linkedLead?.source_channel || 'whatsapp';
  const leadId = linkedDeal?.deal_id || linkedLead?.lead_id || '--';

  detailLeadNameEl.textContent = fallbackName;
  detailLeadStageEl.textContent = leadStage;
  detailLeadPhoneEl.textContent = leadPhone;
  detailLeadChannelEl.textContent = leadChannel;
  detailLeadIdEl.textContent = leadId;
  renderDetailTasks(linkedDeal);

  if (selectedDealActivities.length) {
    const activities = [...selectedDealActivities]
      .sort((a, b) => new Date(b.occurred_at || b.created_at || 0).getTime() - new Date(a.occurred_at || a.created_at || 0).getTime())
      .slice(0, 8)
      .map((activity) => {
        const kind = String(activity.kind || 'note').toLowerCase();
        const isInbound = kind === 'message' && activity.metadata?.direction !== 'outbound';
        const badgeClass = isInbound ? 'is-inbound' : 'is-outbound';
        const bodyText = normalizeBrandText(String(activity.body ?? activity.title ?? '').trim()) || '(sem conteudo)';
        const titleText = String(activity.title || kind).trim();
        return `
          <li>
            <article class="detail-activity-card">
              <div class="detail-activity-card__top">
                <span class="detail-activity-badge ${badgeClass}">${safeText(kind)}</span>
                <span class="detail-activity-badge">${safeText(titleText)}</span>
                <span class="detail-activity-time">${safeText(formatTime(activity.occurred_at || activity.created_at))}</span>
              </div>
              <div class="detail-activity-text">${safeText(bodyText)}</div>
            </article>
          </li>
        `;
      })
      .join('');
    detailActivityListEl.innerHTML = activities;
    return;
  }

  if (selectedThreadMessages.length) {
    const fallbackMessages = [...selectedThreadMessages]
      .sort((a, b) => new Date(b.created_at || b.occurred_at || 0).getTime() - new Date(a.created_at || a.occurred_at || 0).getTime())
      .slice(0, 6)
      .map((message) => {
        const outbound = message.direction === 'outbound';
        const direction = outbound ? 'Saida' : 'Entrada';
        const text = normalizeBrandText(String(message.text ?? '').trim()) || '(sem texto)';
        const delivery = String(message.delivery_state || 'unknown');
        return `
          <li>
            <article class="detail-activity-card">
              <div class="detail-activity-card__top">
                <span class="detail-activity-badge ${outbound ? 'is-outbound' : 'is-inbound'}">${safeText(direction)}</span>
                <span class="detail-activity-badge">${safeText(delivery)}</span>
                <span class="detail-activity-time">${safeText(formatTime(message.created_at || message.occurred_at))}</span>
              </div>
              <div class="detail-activity-text">${safeText(text)}</div>
            </article>
          </li>
        `;
      })
      .join('');
    detailActivityListEl.innerHTML = fallbackMessages;
    return;
  }

  detailActivityListEl.innerHTML = '<li class="empty">Sem atividades.</li>';
}

function renderDetailTasks(deal) {
  if (!deal?.deal_id) {
    detailTaskListEl.innerHTML = '<li class="empty">Sem deal vinculado para tarefas.</li>';
    return;
  }
  if (!selectedDealTasks.length) {
    detailTaskListEl.innerHTML = '<li class="empty">Sem tarefas.</li>';
    return;
  }

  detailTaskListEl.innerHTML = [...selectedDealTasks]
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'done' ? 1 : -1;
      const aDue = new Date(a.due_at || a.created_at || 0).getTime();
      const bDue = new Date(b.due_at || b.created_at || 0).getTime();
      return aDue - bDue;
    })
    .map((task) => {
      const done = task.status === 'done';
      return `
        <li class="detail-task-item ${done ? 'is-done' : ''}">
          <div class="detail-task-item__top">
            <span class="detail-task-item__title">${safeText(task.title || '(sem titulo)')}</span>
            <span class="detail-task-item__meta">${safeText(task.status || (done ? 'done' : 'pending'))}</span>
          </div>
          <div class="detail-task-item__meta">Prioridade: ${safeText(task.priority || 'medium')}</div>
          <div class="detail-task-item__meta">Criada: ${safeText(formatTime(task.created_at))}</div>
          <div class="detail-task-item__meta">Prazo: ${safeText(formatTime(task.due_at))}</div>
        </li>
      `;
    })
    .join('');
}

async function addDetailTask(event) {
  event.preventDefault();
  const conversation = selectedConversation();
  const linkedLead = getLinkedLeadForConversation(conversation);
  if (!linkedLead) {
    formStatus.textContent = 'Selecione uma conversa com lead para criar tarefa.';
    return;
  }

  let linkedDeal;
  try {
    linkedDeal = await ensureDealForLead(linkedLead);
  } catch (error) {
    formStatus.textContent = `Falha ao vincular deal para tarefa: ${error.message}`;
    return;
  }
  if (!linkedDeal?.deal_id) {
    formStatus.textContent = 'Nao foi possivel localizar/criar deal para esta conversa.';
    return;
  }

  const title = String(detailTaskTitleInput.value || '').trim();
  if (!title) return;
  const dueAt = String(detailTaskDueInput.value || '').trim();

  try {
    const response = await fetch(`${apiBase()}/v1/crm/tasks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          source_module: 'mod-02-whatsapp-crm',
          task: {
            deal_id: linkedDeal.deal_id,
            title,
            due_at: dueAt ? new Date(dueAt).toISOString() : null,
            status: 'pending',
            priority: 'medium',
            metadata: {
              origin: 'crm-console-detail-panel'
            }
          }
        }
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.details || body.error || `HTTP ${response.status}`);
    }

    detailTaskTitleInput.value = '';
    detailTaskDueInput.value = '';
    await loadSelectedDealDetails();
    renderDetailPanel();
    formStatus.textContent = `Tarefa criada para ${linkedLead.display_name || linkedLead.phone_e164}.`;
  } catch (error) {
    formStatus.textContent = `Falha ao criar tarefa: ${error.message}`;
  }
}

function switchMainView(nextView) {
  const validViews = new Set(['inbox', 'pipeline', 'leads']);
  currentMainView = validViews.has(nextView) ? nextView : 'inbox';

  inboxViewCardEl.classList.toggle('hidden', currentMainView !== 'inbox');
  pipelineViewCardEl.classList.toggle('hidden', currentMainView !== 'pipeline');
  leadsViewCardEl.classList.toggle('hidden', currentMainView !== 'leads');

  viewInboxBtn.classList.toggle('is-active', currentMainView === 'inbox');
  viewPipelineBtn.classList.toggle('is-active', currentMainView === 'pipeline');
  viewLeadsBtn.classList.toggle('is-active', currentMainView === 'leads');
}

function applyFiltersToInputs() {
  leadSearchInput.value = filters.search;
  leadStageFilter.value = filters.stage;
  leadChannelFilter.value = filters.channel;
  leadGroupBy.value = filters.groupBy;
}

function renderSavedViewOptions() {
  const views = loadSavedViews();
  const options = ['<option value="">Padrao</option>']
    .concat(views.map((view) => `<option value="${safeText(view.view_id)}">${safeText(view.name)}</option>`))
    .join('');
  savedViewSelect.innerHTML = options;
  savedViewSelect.value = views.some((view) => view.view_id === activeSavedViewId) ? activeSavedViewId : '';
}

function resetFiltersToDefault() {
  filters.search = '';
  filters.stage = 'all';
  filters.channel = 'all';
  filters.groupBy = 'stage';
  activeSavedViewId = '';
}

function applySavedViewById(viewId) {
  const views = loadSavedViews();
  const selected = views.find((view) => view.view_id === viewId);
  if (!selected) {
    resetFiltersToDefault();
    applyFiltersToInputs();
    refreshLeadViews();
    renderSavedViewOptions();
    return;
  }
  filters.search = String(selected.filters.search ?? '');
  filters.stage = String(selected.filters.stage ?? 'all');
  filters.channel = String(selected.filters.channel ?? 'all');
  filters.groupBy = String(selected.filters.groupBy ?? 'stage');
  activeSavedViewId = selected.view_id;
  applyFiltersToInputs();
  refreshLeadViews();
  renderSavedViewOptions();
}

function resolveSavedViewModule() {
  if (currentMainView === 'inbox') return 'crm.inbox';
  if (currentMainView === 'leads') return 'crm.deals';
  return 'crm.pipeline';
}

async function loadSavedViewsFromApi() {
  try {
    const moduleName = resolveSavedViewModule();
    const response = await fetch(`${apiBase()}/v1/crm/views?tenant_id=${encodeURIComponent(tenantId())}&module=${encodeURIComponent(moduleName)}&limit=200`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.details || body.error || `HTTP ${response.status}`);
    }
    savedViewsCache = Array.isArray(body.items) ? body.items : [];
  } catch (error) {
    savedViewsCache = [];
    formStatus.textContent = `Falha ao carregar views salvas: ${error.message}`;
  }
}

async function saveCurrentView() {
  const name = window.prompt('Nome da view:');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();

  try {
    const response = await fetch(`${apiBase()}/v1/crm/views`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        request: {
          request_id: crypto.randomUUID(),
          tenant_id: tenantId(),
          source_module: 'mod-02-whatsapp-crm',
          view: {
            name: trimmed,
            module: resolveSavedViewModule(),
            scope: 'private',
            filters: {
              search: filters.search,
              stage: filters.stage,
              channel: filters.channel,
              groupBy: filters.groupBy
            },
            sort: {
              field: 'updated_at',
              direction: 'desc'
            }
          }
        }
      })
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.details || body.error || `HTTP ${response.status}`);
    }
    await loadSavedViewsFromApi();
    activeSavedViewId = body.response?.view?.view_id ?? '';
    renderSavedViewOptions();
    formStatus.textContent = `View "${trimmed}" salva.`;
  } catch (error) {
    formStatus.textContent = `Falha ao salvar view: ${error.message}`;
  }
}

function deleteActiveView() {
  if (!activeSavedViewId) {
    formStatus.textContent = 'Selecione uma view salva para excluir.';
    return;
  }
  formStatus.textContent = 'Exclusao de view ainda nao esta disponivel nesta fase (endpoint PATCH/DELETE pendente).';
}

function getFilteredLeads(sourceLeads = []) {
  return sourceLeads.filter((lead) => {
    const stagePass = filters.stage === 'all' || String(lead.stage || '').toLowerCase() === filters.stage;
    const channelPass = filters.channel === 'all' || String(lead.source_channel || '').toLowerCase() === filters.channel;
    const rawSearch = filters.search.trim().toLowerCase();
    if (!stagePass || !channelPass) return false;
    if (!rawSearch) return true;
    const haystack = [
      String(lead.display_name || ''),
      String(lead.phone_e164 || ''),
      String(lead.lead_id || ''),
      String(lead.stage || ''),
      String(lead.source_channel || '')
    ].join(' ').toLowerCase();
    return haystack.includes(rawSearch);
  });
}

function updateChannelFilterOptions(sourceLeads = []) {
  const currentValue = String(leadChannelFilter.value || 'all').toLowerCase();
  const channels = [...new Set(sourceLeads.map((lead) => String(lead.source_channel || '').toLowerCase()).filter(Boolean))].sort();
  const options = ['<option value="all">Todos</option>']
    .concat(channels.map((channel) => `<option value="${safeText(channel)}">${safeText(channel)}</option>`))
    .join('');
  leadChannelFilter.innerHTML = options;
  if (channels.includes(currentValue)) {
    leadChannelFilter.value = currentValue;
  } else {
    leadChannelFilter.value = 'all';
    filters.channel = 'all';
  }
}

function getPipelineColumnsForCurrentGroup(leads = []) {
  if (filters.groupBy === 'channel') {
    const dynamic = [...new Set(leads.map((lead) => String(lead.source_channel || '').trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, 'pt-BR'));
    return dynamic.length
      ? dynamic.map((channel) => ({ id: channel, label: channel }))
      : [{ id: 'whatsapp', label: 'whatsapp' }];
  }
  return activeTenantPipelineStages().map((item) => ({ id: item.stage, label: item.label || item.stage }));
}

function getLeadBucketValue(lead) {
  if (filters.groupBy === 'channel') {
    return String(lead.source_channel || 'whatsapp').trim() || 'whatsapp';
  }
  return String(lead.stage || 'new').trim() || 'new';
}

function renderPipeline(leads = []) {
  if (!leads.length) {
    pipelineBoardEl.innerHTML = '<p class="empty">Sem leads para renderizar pipeline.</p>';
    return;
  }

  const columns = getPipelineColumnsForCurrentGroup(leads);
  const grouped = new Map(columns.map((column) => [column.id, []]));
  leads.forEach((lead) => {
    const bucketKey = getLeadBucketValue(lead);
    const bucket = grouped.get(bucketKey) ?? grouped.get(columns[0].id);
    if (bucket) bucket.push(lead);
  });

  pipelineBoardEl.innerHTML = columns.map((column) => {
    const columnLeads = grouped.get(column.id) ?? [];
    const cards = columnLeads.length
      ? columnLeads.map((lead) => {
        const leadId = String(lead.lead_id || '');
        const dealId = String(lead.deal_id || '');
        const currentStage = String(lead.stage || '');
        const draggable = filters.groupBy === 'stage' && leadId.length > 0 ? 'true' : 'false';
        return `
          <article
            class="pipeline-lead"
            data-open-phone="${safeText(lead.phone_e164)}"
            data-lead-id="${safeText(leadId)}"
            data-deal-id="${safeText(dealId)}"
            data-current-stage="${safeText(currentStage)}"
            draggable="${draggable}"
          >
            <div class="pipeline-lead__name">${safeText(lead.display_name || lead.phone_e164)}</div>
            <div class="pipeline-lead__meta">${safeText(lead.phone_e164)}</div>
            <div class="pipeline-lead__meta">${safeText(lead.source_channel || 'whatsapp')}</div>
            <div class="pipeline-lead__stage">${safeText(lead.stage || '--')}</div>
          </article>
        `;
      }).join('')
      : '<p class="empty">Sem leads</p>';

    return `
      <section class="pipeline-column" data-column-key="${safeText(column.id)}">
        <header class="pipeline-column__header">
          <span class="pipeline-column__title">${safeText(column.label)}</span>
          <span class="pipeline-column__count">${columnLeads.length}</span>
        </header>
        <div class="pipeline-column__body">${cards}</div>
      </section>
    `;
  }).join('');

  pipelineBoardEl.querySelectorAll('[data-open-phone]').forEach((node) => {
    node.addEventListener('click', () => {
      const phone = node.getAttribute('data-open-phone') || '';
      const conversation = conversationsCache.find((item) => item.contact_e164 === phone);
      if (conversation) {
        switchMainView('inbox');
        openConversation(conversation.conversation_id, { markRead: true });
      } else {
        formStatus.textContent = `Lead ${phone} sem conversa ativa ainda.`;
      }
    });
  });

  const stageSet = new Set(activeTenantPipelineStages().map((item) => item.stage));
  if (filters.groupBy !== 'stage') return;

  pipelineBoardEl.querySelectorAll('.pipeline-lead[draggable="true"]').forEach((node) => {
    node.addEventListener('dragstart', (event) => {
      const leadId = node.getAttribute('data-lead-id') || '';
      const dealId = node.getAttribute('data-deal-id') || '';
      const fromStage = node.getAttribute('data-current-stage') || '';
      event.dataTransfer?.setData('application/json', JSON.stringify({ leadId, dealId, fromStage }));
      event.dataTransfer?.setData('text/plain', `${leadId}|${dealId}|${fromStage}`);
      node.classList.add('is-dragging');
    });
    node.addEventListener('dragend', () => {
      node.classList.remove('is-dragging');
      pipelineBoardEl.querySelectorAll('.pipeline-column').forEach((columnEl) => {
        columnEl.classList.remove('is-drop-target');
      });
    });
  });

  pipelineBoardEl.querySelectorAll('.pipeline-column').forEach((columnEl) => {
    columnEl.addEventListener('dragover', (event) => {
      event.preventDefault();
      const targetStage = String(columnEl.getAttribute('data-column-key') || '');
      if (stageSet.has(targetStage)) {
        columnEl.classList.add('is-drop-target');
      }
    });
    columnEl.addEventListener('dragleave', () => {
      columnEl.classList.remove('is-drop-target');
    });
    columnEl.addEventListener('drop', async (event) => {
      event.preventDefault();
      columnEl.classList.remove('is-drop-target');
      const targetStage = String(columnEl.getAttribute('data-column-key') || '');
      if (!stageSet.has(targetStage)) return;

      let payload = null;
      try {
        payload = JSON.parse(event.dataTransfer?.getData('application/json') || '{}');
      } catch {
        payload = null;
      }
      const fallback = String(event.dataTransfer?.getData('text/plain') || '');
      const [fallbackLeadId = '', fallbackDealId = '', fallbackFromStage = ''] = fallback.split('|');
      const leadId = String(payload?.leadId || fallbackLeadId || '');
      const dealId = String(payload?.dealId || fallbackDealId || '');
      const fromStage = String(payload?.fromStage || fallbackFromStage || '');
      if (!leadId || !fromStage || fromStage === targetStage) return;

      try {
        formStatus.textContent = `Movendo lead para ${targetStage}...`;
        await updateLeadStage(leadId, fromStage, targetStage);
        await syncDealStageFromLead({ leadId, dealId, targetStage });
        await loadAllData();
        if (selectedConversationId) {
          await openConversation(selectedConversationId, { markRead: false });
        }
        formStatus.textContent = `Lead movido: ${fromStage} -> ${targetStage}.`;
      } catch (error) {
        formStatus.textContent = `Falha no drag-and-drop: ${error.message}`;
      }
    });
  });
}

function renderMetricBars(targetEl, entries = [], total = 0) {
  if (!targetEl) return;
  if (!entries.length || total <= 0) {
    targetEl.innerHTML = '<p class="empty">Sem dados.</p>';
    return;
  }

  targetEl.innerHTML = entries.map(([label, count]) => {
    const pct = Math.max(0, Math.min(100, (Number(count || 0) / total) * 100));
    return `
      <article class="metric-bar">
        <div class="metric-bar__label">
          <span>${safeText(label)}</span>
          <span>${count} (${pct.toFixed(0)}%)</span>
        </div>
        <div class="metric-bar__track">
          <div class="metric-bar__fill" style="width:${pct.toFixed(2)}%"></div>
        </div>
      </article>
    `;
  }).join('');
}

function renderAnalytics(sourceLeads = []) {
  const total = sourceLeads.length;
  if (total === 0) {
    renderMetricBars(stageBarsEl, [], 0);
    renderMetricBars(channelBarsEl, [], 0);
    return;
  }

  const stageMap = new Map();
  const channelMap = new Map();
  sourceLeads.forEach((lead) => {
    const stage = String(lead.stage || 'unknown');
    const channel = String(lead.source_channel || 'unknown');
    stageMap.set(stage, Number(stageMap.get(stage) || 0) + 1);
    channelMap.set(channel, Number(channelMap.get(channel) || 0) + 1);
  });

  const stageEntries = [...stageMap.entries()].sort((a, b) => b[1] - a[1]);
  const channelEntries = [...channelMap.entries()].sort((a, b) => b[1] - a[1]);
  renderMetricBars(stageBarsEl, stageEntries, total);
  renderMetricBars(channelBarsEl, channelEntries, total);
}

function refreshLeadViews() {
  const leadModel = leadsCache.map(mapLeadForUi);
  const filtered = getFilteredLeads(leadModel);
  renderLeads(filtered);
  renderPipeline(filtered);
  renderAnalytics(filtered);
}

function renderLeads(items) {
  const totalLeads = leadsCache.length;
  if (!items.length) {
    leadRows.innerHTML = '<tr><td colspan="5" class="empty">Sem leads para este tenant.</td></tr>';
    leadCount.textContent = totalLeads > 0 ? `0 de ${totalLeads}` : '0 items';
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

  leadCount.textContent = totalLeads === items.length ? `${items.length} items` : `${items.length} de ${totalLeads}`;

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
        switchMainView('inbox');
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
    renderDetailPanel();
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
      const linkedLead = getLeadById(conversation.lead_id) ?? getLeadByPhone(conversation.contact_e164);
      const currentStage = linkedLead ? getEffectiveLeadStage(linkedLead) : (conversation.lead_stage || 'sem stage');
      return `
      <button class="conversation-item ${isActive ? 'is-active' : ''}" type="button" data-conversation-id="${safeText(conversation.conversation_id)}">
        <div class="conversation-item__top">
          <span class="conversation-item__name">${safeText(title)}</span>
          ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
        </div>
        <p class="conversation-item__preview">${safeText(preview)}</p>
        <div class="conversation-item__meta">
          <span>${safeText(currentStage)}</span>
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
  renderDetailPanel();
}

function renderThreadMessages() {
  if (!selectedConversationId) {
    threadMessagesEl.innerHTML = '<p class="empty">Sem conversa selecionada.</p>';
    renderDetailPanel();
    return;
  }

  if (!selectedThreadMessages.length) {
    threadMessagesEl.innerHTML = '<p class="empty">Sem mensagens nesta conversa.</p>';
    renderDetailPanel();
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
  renderDetailPanel();
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
    selectedDealActivities = [];
    selectedDealTasks = [];
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
    await loadSelectedDealDetails();
    const linkedLead = getLinkedLeadForConversation(conversation);
    if (linkedLead) {
      threadStageSelect.value = getEffectiveLeadStage(linkedLead);
    }
    renderThreadMessages();
    if (options.markRead && Number(conversation.unread_count ?? 0) > 0) {
      await fetch(`${apiBase()}/v1/crm/conversations/${encodeURIComponent(conversationId)}/read?tenant_id=${encodeURIComponent(tenantId())}`, {
        method: 'POST'
      });
      await loadConversations();
      refreshLeadViews();
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
    updateChannelFilterOptions(leadsCache);
    refreshLeadViews();
    formStatus.textContent = 'Leads atualizados.';
  } catch (error) {
    leadsCache = [];
    updateChannelFilterOptions([]);
    refreshLeadViews();
    formStatus.textContent = `Erro ao carregar: ${error.message}`;
  }
}

async function loadAllData() {
  await loadTenantRuntimeConfig();
  await loadConversations();
  await loadLeads();
  renderSavedViewOptions();
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
  const applied = applyTenantThemePresetForTenant(tenantId(), { persist: true });
  if (!applied) {
    formStatus.textContent = `Sem preset visual para tenant "${tenantId().toLowerCase()}".`;
    return;
  }
  formStatus.textContent = `Tema aplicado: layout=${applied.layout}, palette=${applied.palette}.`;
}

function applyTenantThemePresetForTenant(tenantValue, { persist = true } = {}) {
  const tenant = String(tenantValue || '').trim().toLowerCase();
  const preset = TENANT_THEME_PRESETS[tenant];
  if (!preset) return null;
  applyVisualMode({ layout: preset.layout, palette: preset.palette, persist });
  return preset;
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
    refreshLeadViews();
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
      refreshLeadViews();
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
viewInboxBtn.addEventListener('click', () => switchMainView('inbox'));
viewPipelineBtn.addEventListener('click', () => switchMainView('pipeline'));
viewLeadsBtn.addEventListener('click', () => switchMainView('leads'));
savedViewSelect.addEventListener('change', () => {
  const viewId = String(savedViewSelect.value || '').trim();
  if (!viewId) {
    resetFiltersToDefault();
    applyFiltersToInputs();
    refreshLeadViews();
    renderSavedViewOptions();
    return;
  }
  applySavedViewById(viewId);
});
saveViewBtn.addEventListener('click', saveCurrentView);
deleteViewBtn.addEventListener('click', deleteActiveView);
leadSearchInput.addEventListener('input', () => {
  filters.search = leadSearchInput.value.trim();
  activeSavedViewId = '';
  renderSavedViewOptions();
  refreshLeadViews();
});
leadStageFilter.addEventListener('change', () => {
  filters.stage = String(leadStageFilter.value || 'all').toLowerCase();
  activeSavedViewId = '';
  renderSavedViewOptions();
  refreshLeadViews();
});
leadChannelFilter.addEventListener('change', () => {
  filters.channel = String(leadChannelFilter.value || 'all').toLowerCase();
  activeSavedViewId = '';
  renderSavedViewOptions();
  refreshLeadViews();
});
leadGroupBy.addEventListener('change', () => {
  filters.groupBy = String(leadGroupBy.value || 'stage').toLowerCase();
  activeSavedViewId = '';
  renderSavedViewOptions();
  refreshLeadViews();
});
leadClearFiltersBtn.addEventListener('click', () => {
  resetFiltersToDefault();
  applyFiltersToInputs();
  refreshLeadViews();
  renderSavedViewOptions();
});
tenantIdInput.addEventListener('blur', () => {
  const tenant = tenantId().toLowerCase();
  if (TENANT_THEME_PRESETS[tenant]) {
    applyVisualMode({
      layout: TENANT_THEME_PRESETS[tenant].layout,
      palette: TENANT_THEME_PRESETS[tenant].palette,
      persist: true
    });
  }
  tasksByLead = loadTasks();
  activeSavedViewId = '';
  renderSavedViewOptions();
  resetFiltersToDefault();
  applyFiltersToInputs();
  loadAllData();
});

reloadBtn.addEventListener('click', loadAllData);
leadForm.addEventListener('submit', createLead);
threadSendForm.addEventListener('submit', sendThreadMessage);
threadAiSuggestBtn.addEventListener('click', handleAiSuggestReply);
threadQualifyBtn.addEventListener('click', handleQualifyLead);
threadAiExecuteBtn.addEventListener('click', handleAiExecute);
threadUpdateStageBtn.addEventListener('click', handleUpdateStage);
detailTaskForm.addEventListener('submit', addDetailTask);
detailTaskListEl.addEventListener('click', handleTaskActionClick);

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
applyTenantThemePresetForTenant(tenantId(), { persist: true });
switchMainView(currentMainView);
loadAllData();
startInboxPolling();
