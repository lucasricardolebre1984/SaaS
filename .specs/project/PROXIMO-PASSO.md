# Proximo passo do SaaS matriz

**Foco:** estabilidade operacional com rastreabilidade 100% (botao -> endpoint -> evidencia).

**Ultima atualizacao:** 2026-03-02

---

## Eixo memoria/contexto/aprendizado

- **Status:** fechado no produto.
- Short + medium + long + promocao medium->long implementados e auditados.
- Nenhum passo pendente neste eixo.

---

## Proximo passo unico (ativo)

**Executar T5 (APIs backend CRM enterprise MVP) do `crm-krayin-reference-modernization-slice` a partir da base estabilizada.**

Pre-condicoes (ja cumpridas):
1. Slice de estabilidade M5B encerrado com `GO`.
2. Gate permanente de regressao de botoes/endpoints ativo no `preprod:validate`.
3. AWS dev com runtime estavel e evidencias auditaveis.

Passos concluidos em 2026-03-02:
1. `crm-krayin-reference-modernization-slice` promovido para prioridade ativa.
2. `spec/design/tasks` aprovados formalmente.
3. T2 concluido com matriz auditavel:
   - `.specs/features/crm-krayin-reference-modernization-slice/gap-matrix.md`
4. T3 concluido com contratos CRM core + exemplos validos:
   - `libs/mod-02-whatsapp-crm/contracts/{account,contact,deal,activity,task,view}-*.schema.json`
   - `libs/mod-02-whatsapp-crm/contracts/crm-core-contract-examples.json`
   - gate verde: `npx nx run contract-tests:contract-checks`
5. T4 concluido com migracoes CRM core + smoke CRUD Postgres:
   - tabelas adicionadas em `apps/platform-api/sql/orchestration-postgres.sql`
   - smoke validado: `powershell -ExecutionPolicy Bypass -File tools/smoke-postgres-orchestration.ps1`
   - resultado: `Postgres smoke passed` com `crm_deals=1`, `crm_activities=1`, `crm_tasks=1`

Passo ativo agora:
1. Executar T5 (endpoints backend para `deals/contacts/activities/tasks/views`).
2. Integrar APIs com eventos auditaveis (`correlation_id`, `trace_id`, `tenant_id`).
3. Validar testes de API para fluxo `deal -> activity -> stage update`.

---

## Resumo (leigo)

O ciclo de estabilidade foi fechado. Agora o trabalho passa para evolucao de CRM enterprise (referencia Krayin-like), mantendo a base tecnica atual e executando por fatias com gate de aprovacao.

---

*Feature ativa: `crm-krayin-reference-modernization-slice` (fase: Implement + Validate, iniciando T3 contract-first).*
