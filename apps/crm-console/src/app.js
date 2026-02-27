const VALID_LAYOUTS = ['fabio2', 'studio'];
const VALID_PALETTES = ['ocean', 'forest', 'sunset'];
const LEGACY_DEFAULT_API_BASE = 'http://127.0.0.1:4300';
const API_BASE_STORAGE_KEY = 'crm_console_api_base_v1';

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
const reloadBtn = document.getElementById('reloadBtn');
const layoutSelect = document.getElementById('layoutSelect');
const paletteSelect = document.getElementById('paletteSelect');
const applyTenantThemeBtn = document.getElementById('applyTenantThemeBtn');

const leadRows = document.getElementById('leadRows');
const leadCount = document.getElementById('leadCount');
const leadForm = document.getElementById('leadForm');
const formStatus = document.getElementById('formStatus');

const kpis = {
  new: document.getElementById('kpi-new'),
  qualified: document.getElementById('kpi-qualified'),
  proposal: document.getElementById('kpi-proposal'),
  won: document.getElementById('kpi-won'),
  lost: document.getElementById('kpi-lost')
};
let embeddedMode = false;

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

  embeddedMode = embedded === '1' || embedded === 'true';
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

function renderLeads(items) {
  if (!items.length) {
    leadRows.innerHTML = '<tr><td colspan="4" class="empty">Sem leads para este tenant.</td></tr>';
    leadCount.textContent = '0 items';
    Object.values(kpis).forEach((el) => { el.textContent = '0'; });
    return;
  }

  leadRows.innerHTML = items
    .map((lead) => `
      <tr>
        <td>${safeText(lead.display_name)}</td>
        <td>${safeText(lead.phone_e164)}</td>
        <td>${safeText(lead.source_channel)}</td>
        <td>${safeText(lead.stage)}</td>
      </tr>
    `)
    .join('');

  leadCount.textContent = `${items.length} items`;

  const counts = { new: 0, qualified: 0, proposal: 0, won: 0, lost: 0 };
  items.forEach((lead) => {
    if (counts[lead.stage] != null) counts[lead.stage] += 1;
  });
  Object.entries(counts).forEach(([stage, value]) => {
    kpis[stage].textContent = String(value);
  });
}

async function loadLeads() {
  formStatus.textContent = 'Carregando leads...';
  try {
    const response = await fetch(`${apiBase()}/v1/crm/leads?tenant_id=${encodeURIComponent(tenantId())}`);
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error ?? `HTTP ${response.status}`);
    }
    renderLeads(body.items ?? []);
    formStatus.textContent = 'Leads atualizados.';
  } catch (error) {
    renderLeads([]);
    formStatus.textContent = `Erro ao carregar: ${error.message}`;
  }
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
    await loadLeads();
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

reloadBtn.addEventListener('click', loadLeads);
leadForm.addEventListener('submit', createLead);
apiBaseInput.addEventListener('change', () => {
  apiBaseInput.value = normalizeApiBase(apiBaseInput.value);
  persistApiBasePreference(apiBaseInput.value);
});
apiBaseInput.addEventListener('blur', () => {
  apiBaseInput.value = normalizeApiBase(apiBaseInput.value);
  persistApiBasePreference(apiBaseInput.value);
});

async function loadWhatsAppQr() {
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
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.textContent = data.message || data.error || `Erro ${res.status}`;
      if (data.error === 'evolution_not_configured') {
        pairingEl.textContent = 'Configure no backend: EVOLUTION_HTTP_BASE_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_ID (ex: fabio para nao conflitar com fabio2).';
      }
      return;
    }
    const code = String(data.code ?? data.base64 ?? '').trim();
    const pairingCode = String(data.pairingCode ?? '').trim();
    const connectionState = String(data.connectionState ?? '').trim().toLowerCase();
    const backendStatus = String(data.status ?? '').trim().toLowerCase();
    const backendMessage = String(data.message ?? '').trim();

    const codeLooksLikeImageBase64 = code.startsWith('data:') || code.length > 100;
    if (codeLooksLikeImageBase64) {
      const src = code.startsWith('data:') ? code : `data:image/png;base64,${code}`;
      const img = document.createElement('img');
      img.src = src;
      img.alt = 'QR Code WhatsApp';
      img.className = 'whatsapp-qr-img';
      imageWrap.appendChild(img);
    }

    if (pairingCode) {
      pairingEl.textContent = `Codigo de vinculacao: ${pairingCode}`;
    } else if (code && !codeLooksLikeImageBase64) {
      pairingEl.textContent = `Codigo recebido: ${code}`;
    }

    if (backendMessage.length > 0) {
      statusEl.textContent = backendMessage;
    } else if (backendStatus === 'connected' || connectionState === 'open') {
      statusEl.textContent = 'Instancia ja conectada no WhatsApp. Se quiser novo QR, desconecte a instancia primeiro.';
    } else if (codeLooksLikeImageBase64 || pairingCode.length > 0) {
      statusEl.textContent = 'Escaneie o QR com WhatsApp (Dispositivo vinculado) ou use o codigo de vinculacao.';
    } else {
      statusEl.textContent = 'QR ainda nao disponivel. Clique novamente em alguns segundos.';
    }
  } catch (e) {
    statusEl.textContent = `Erro: ${e.message || 'rede'}`;
  } finally {
    btn.disabled = false;
  }
}

const whatsappQrBtn = document.getElementById('whatsappQrBtn');
if (whatsappQrBtn) {
  whatsappQrBtn.addEventListener('click', loadWhatsAppQr);
}

restoreVisualMode();
apiBaseInput.value = loadApiBasePreference();
applyBootstrapFromQuery();
loadLeads();
