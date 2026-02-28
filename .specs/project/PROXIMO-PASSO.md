# Proximo passo do SaaS matriz (deploy AWS)

**Foco:** produto e operacao do SaaS matriz em ambiente real (dev AWS), com rastreabilidade.

**Ultima atualizacao:** 2026-02-27

---

## Eixo memoria/contexto/aprendizado

- **Status:** fechado no produto.
- Short + medium + long + promocao medium->long implementados e auditados.
- Nenhum passo pendente neste eixo.

---

## Proximo passo unico (ativo)

Fechar UAT operacional Evolution no AWS dev (`dev.automaniaai.com.br`):

1. ~~Validar `audio/transcribe` e `audio/speech` no modulo 01~~ — OK (confirmado).
2. **Validar `Gerar QR Code` no modulo 02** com Evolution ativa no servidor (`/srv/SaaS` + `/srv/evolution`): no Ubuntu, `cd /srv/SaaS`, conferir `EVOLUTION_*` no `.env`, rodar `tools/evolution-aws-check.sh` ou equivalentes; garantir instancia `fabio` e leitura de estado `ready|connected|pending_qr`.
3. Registrar evidencias finais de UAT em `STATE.md`, `STATUS-ATUAL.md`, `worklog.csv`, `costlog.csv`.

Repo e ambientes já documentados em AGENTS.md (GitHub SaaS, Ubuntu /srv/SaaS e /srv/evolution).

---

## Resumo (leigo)

O SaaS matriz esta no AWS dev com hotfix aplicado; audio OpenAI considerado OK. Foco atual: UAT do QR Evolution no servidor (acesso SSH, `/srv/SaaS` e `/srv/evolution`) e registrar evidencias para encerrar o slice.

---

*Feature ativa: `milestone-5-runtime-stability-hotfix-slice`.*
