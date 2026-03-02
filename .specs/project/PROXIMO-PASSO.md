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

**Executar T4 (migracoes de dados CRM core) do `crm-krayin-reference-modernization-slice` a partir da base estabilizada.**

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

Passo ativo agora:
1. Executar T4 (migracoes/tabelas CRM core com indices por tenant e timeline).
2. Garantir smoke Postgres de CRUD basico para deal/activity/task.
3. Atualizar backlog rastreavel (STATE/STATUS/worklog/costlog) com evidencias do T4.

---

## Resumo (leigo)

O ciclo de estabilidade foi fechado. Agora o trabalho passa para evolucao de CRM enterprise (referencia Krayin-like), mantendo a base tecnica atual e executando por fatias com gate de aprovacao.

---

*Feature ativa: `crm-krayin-reference-modernization-slice` (fase: Implement + Validate, iniciando T3 contract-first).*
