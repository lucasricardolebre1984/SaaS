# Proximo passo do SaaS matriz (deploy AWS)

**Foco:** produto e operacao do SaaS matriz em ambiente real (dev AWS), com rastreabilidade.

**Ultima atualizacao:** 2026-02-28

---

## Eixo memoria/contexto/aprendizado

- **Status:** fechado no produto.
- Short + medium + long + promocao medium->long implementados e auditados.
- Nenhum passo pendente neste eixo.

---

## Proximo passo unico (ativo)

Fechar UAT operacional Evolution no AWS dev (`dev.automaniaai.com.br`):

1. ~~Validar `audio/transcribe` e `audio/speech` no modulo 01~~ — OK (confirmado).
2. ~~Validar Evolution no modulo 02~~ — OK (2026-02-28): `evolution-aws-check.sh` no Ubuntu; Evolution 200 OK; instancia `tenant_automania` state `open`; health publico 200.
3. ~~Registrar evidencias finais de UAT~~ — OK: `STATE.md`, `STATUS-ATUAL.md`, `worklog.csv`, `costlog.csv` atualizados.

**Proximo passo natural:** Encerrar slice `milestone-5-runtime-stability-hotfix-slice` (exit checklist) ou validar manualmente no browser: abrir `https://dev.automaniaai.com.br/crm/`, Gerar QR Code e fluxo completo; depois fechar fase em STATE/ROADMAP.

Repo e ambientes documentados em AGENTS.md (GitHub SaaS, Ubuntu /srv/SaaS e /srv/evolution).

---

## Resumo (leigo)

O SaaS matriz esta no AWS dev com hotfix aplicado; audio OpenAI e Evolution (instancia conectada, state open) validados. UAT Evolution registrada (2026-02-28). Proximo: encerrar slice (exit checklist) ou validar no browser CRM + QR e fechar fase.

---

*Feature ativa: `milestone-5-runtime-stability-hotfix-slice`.*
