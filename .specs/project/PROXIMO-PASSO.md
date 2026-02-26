# Proximo passo do SaaS matriz (deploy AWS)

**Foco:** produto e operacao do SaaS matriz em ambiente real (dev AWS), com rastreabilidade.

**Ultima atualizacao:** 2026-02-26

---

## Eixo memoria/contexto/aprendizado

- **Status:** fechado no produto.
- Short + medium + long + promocao medium->long implementados e auditados.
- Nenhum passo pendente neste eixo.

---

## Proximo passo unico (ativo)

Executar bootstrap de deploy do SaaS matriz em AWS dev (`dev.automaniaai.com`) com persistencia Postgres e operacao multi-tenant.

Isso inclui:
1. Rodar gate tecnico completo (`preprod:validate`) e gate de readiness AWS (`deploy:aws:readiness`).
2. Subir backend unificado (`/owner`, `/crm`, `/api`) em host AWS com Nginx reverse proxy.
3. Ligar banco RDS Postgres (`ORCHESTRATION_STORE_BACKEND=postgres`).
4. Ligar Evolution server-side e registrar configuracao por tenant no modulo 06.
5. Validar fluxo ponta-a-ponta em tenant real de dev.

---

## Resumo (leigo)

A memoria da IA ja esta pronta. O proximo passo agora e colocar esse SaaS matriz no servidor AWS de desenvolvimento, com banco de dados real e dominio `dev.automaniaai.com`, para virar base operacional de onboarding dos proximos clientes (um tenant por cliente).

---

*Feature ativa: `milestone-5-aws-production-bootstrap-slice`.*
