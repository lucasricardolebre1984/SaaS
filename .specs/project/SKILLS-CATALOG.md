# Catalogo de Skills — Rastreabilidade e Localizacao

**Documento:** SKILLS-CATALOG  
**Ultima atualizacao:** 2026-02-26  
**Objetivo:** Listar todos os skills utilizaveis pelo agente, com caminhos e triggers, para auditoria e prova de uso.

---

## Regra de prova (obrigatoria)

O agente deve **citar explicitamente o skill que esta usando** antes de aplica-lo (ex.: "Usando skill: project-context-loader para carregar CONTEXT.md"). Isso garante rastreabilidade e evita uso implicito.

---

## 1. Project skills (MVP — somente estes para o fluxo SaaS)

| Skill | Caminho no repo | Destino apos instalacao |
|-------|-----------------|--------------------------|
| project-context-loader | `skills/(project)/project-context-loader/SKILL.md` | Codex: `%USERPROFILE%\.codex\skills\`; Cursor: `%USERPROFILE%\.cursor\skills\` |
| saas-standard-architect | `skills/(project)/saas-standard-architect/SKILL.md` | Idem |
| contract-first-migrator | `skills/(project)/contract-first-migrator/SKILL.md` | Idem (apenas quando legacy fabio2 envolvido) |
| metrics-discipline | `skills/(project)/metrics-discipline/SKILL.md` | Idem (checkpoints de fase/task) |

**Instalacao:** Codex: `npm run skills:install` | Cursor: `npm run skills:install:cursor`

Referencia: `.specs/features/agent-skills-cli-mvp/TRIGGERS.md`, RUNBOOK.md.

---

## 2. Skills globais (Cursor / Codex) — localizacao

- **Cursor:** `%USERPROFILE%\.cursor\skills\<nome-da-pasta>\SKILL.md`
- **Codex:** `%USERPROFILE%\.codex\skills\<nome-da-pasta>\SKILL.md`

Categorias: Nx/workspace (link-workspace-packages, nx-generate, nx-run-tasks, nx-workspace, run-nx-generator, nx-plugins); CI/deploy (monitor-ci, nx-ci-monitor, gh-fix-ci, gh-address-comments, vercel-deploy, netlify-deploy, cloudflare-deploy, render-deploy); Docs/processo (docs-writer, skill-creator, subagent-creator, cursor-skill-creator, create-rule, create-skill, update-cursor-settings, technical-design-doc-creator); Qualidade (accessibility, best-practices, coding-guidelines, security-*); Performance/web (core-web-vitals, perf-*, web-quality-audit, seo); Design (figma, figma-implement-design); Testes (playwright-skill); Atlassian (confluence-assistant, jira-assistant); AWS/Sentry (aws-advisor, sentry); Analise (component-*, domain-*, decomposition-planning-roadmap). Total: 37+ entradas. Para localizar: procurar pasta com SKILL.md em .cursor/skills ou .codex/skills.

---

## 3. Referencias

- AGENTS.md (Project Skills MVP). STATUS-ATUAL.md (secao Skills). TRIGGERS.md, RUNBOOK.md em agent-skills-cli-mvp.
