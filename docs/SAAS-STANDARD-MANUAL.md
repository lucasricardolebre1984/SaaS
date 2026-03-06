# Manual SaaS Standard

Data: 2026-02-25  
Escopo: Operação do modelo padrão para clonar novos SaaS sem quebrar a base.

## 1. O que já é padrão
- Menu fixo de módulos `01..06`.
- `mod-01` orquestra os demais módulos.
- `mod-02` executa fluxos WhatsApp/CRM.
- `mod-03/04/05` mantêm dados de clientes, agenda e cobrança.
- `mod-06` centraliza configurações (API, integrações, métricas e personas).

## 2. Persona 1 e Persona 2
- Persona 1: concierge do proprietário (orquestradora do SaaS).
- Persona 2: agente de atendimento WhatsApp.
- Campos de prompt no Owner Console:
  - `Persona 1 (Concierge do Proprietario)`
  - `Persona 2 (Agente WhatsApp)`
- Persistência local: `localStorage`.
- Propagação runtime: payload `persona_overrides` em `send_message`.

## 3. Modo sem persona (neutro)
- Se os prompts de persona ficarem vazios:
  - o SaaS continua funcional;
  - `mod-01` opera em baseline neutro;
  - memória/contexto continuam sendo salvos normalmente.

## 4. Formato recomendado de prompt
Exemplo Persona 1:
`Papel: Concierge do proprietario. Objetivo: orquestrar modulos 2-5. Regras: validar dados criticos antes de agenda/cobranca. Tom: executivo e direto.`

Exemplo Persona 2:
`Papel: Agente WhatsApp. Objetivo: atender leads/clientes e executar follow-up. Regras: linguagem clara e humana, registrar resultado, devolver eventos ao modulo 1. Tom: cordial.`

## 5. Criar novo SaaS (starter)
1. Executar gerador:
```powershell
npm run generate:saas-starter -- --saas-name "Nome do SaaS" --tenant-id "tenant_nome" --layout-default studio --palette-default ocean
```
2. Abrir saída em `.tmp/generated-saas/<slug>`.
3. Ajustar branding, domínios e integrações específicas.
4. Manter contratos e módulos core sem hardcode de empresa.

## 6. Ajustar layout/paleta por cliente
- Layouts disponíveis: `fabio2`, `studio`.
- Paletas disponíveis: `ocean`, `forest`, `sunset`.
- Ajuste rápido em `mod-06` ou por preset em `apps/owner-console/src/app.js` (`TENANT_THEME_PRESETS`).

## 7. Checklist de validação antes de usar o template
1. `npx nx run app-platform-api:test`
2. `npx nx run contract-tests:contract-checks`
3. `npx nx run app-owner-console:build`
4. `npm run smoke:postgres`

## 8. Regras institucionais
- Não copiar implementação direta de `fabio2`.
- Toda evolução cross-módulo deve ser contract-first.
- Registrar sempre em:
  - `.specs/project/STATE.md`
  - `.specs/project/worklog.csv`
  - `.specs/project/costlog.csv`
