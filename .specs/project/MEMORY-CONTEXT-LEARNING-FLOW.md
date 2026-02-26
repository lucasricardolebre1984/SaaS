# Fluxo de Memoria, Contexto e Aprendizado — Spec Institucional

**Documento:** MEMORY-CONTEXT-LEARNING-FLOW  
**Ultima atualizacao:** 2026-02-26  
**Objetivo:** Fluxo completo short/medium/long, contexto por turno e aprendizado continuo por tenant (padrao Zep/EverMemOS-style + RAG + auditoria).

---

## 1. Premissas (CONTEXT.md)

- No-Context-Loss: tenant/session/channel; restore/resume deterministico; zero vazamento entre tenants.
- Aprendizado infinito: IA evolui com o uso do proprietario; captura e recuperacao por tenant.
- Rastreabilidade: correlation_id, trace_id, tenant_id, created_at/emitted_at.

---

## 2. Camadas de memoria

| Camada | Conteudo | Escopo |
|--------|----------|--------|
| Short | Sessao ativa (N turnos) | tenant + session |
| Medium | Episodios operacionais | tenant |
| Long | Conhecimento promovido | tenant |

Promocao: Short -> Medium (episodio), Medium -> Long (conhecimento), com eventos auditaveis.

---

## 3. Fluxo por turno (Persona 1)

1. Receber mensagem (tenant_id, session_id, channel).
2. **Recall:** short para (tenant, session) + retrieval (medium/long) + operational_context (listagens ao vivo).
3. Montar contexto de inferencia.
4. Gerar resposta.
5. Persistir turno em short; opcional disparar promocao short->medium.

---

## 4. Estado atual vs alvo (2026-02-26)

| Componente | Atual | Alvo |
|------------|-------|------|
| Short persistido | Parcial (session_id, operational_context) | M4D-008: persistir turno; recall antes de gerar. |
| Retrieval | Implementado | Integrar no recall unificado (M4D-010). |
| Promocao short->medium | Nao | M4D-009: episodios e evento. |

Ref: slice milestone-4-dual-concierge-memory-orchestrator-slice (M4D-008..012). CONTEXT.md, STATUS-ATUAL.md.
