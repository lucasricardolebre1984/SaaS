# Runbook - {{saas_name}}

Generated at: {{generated_at}}

## Start Day
```powershell
cd <repo-root>
.\tools\start-day.ps1 -Agent codex -SkipInstall
```

## End Day
```powershell
cd <repo-root>
.\tools\end-day.ps1 -ShowPending
```

## Theme Customization
- Default tenant id: `{{tenant_id}}`
- Default layout: `{{layout_default}}`
- Default palette: `{{palette_default}}`

Edit:
- `config/theme.json`
- `apps/owner-console/theme-preset.json`
- `apps/crm-console/theme-preset.json`

## Module Standard (Fixed)
1. Chat IA
2. CRM WhatsApp
3. Clientes
4. Agenda
5. Faturamento/Cobranca
