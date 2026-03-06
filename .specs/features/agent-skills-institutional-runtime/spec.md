# Spec - agent-skills-institutional-runtime

Status: Draft
Date: 2026-03-06

## Objective
Evoluir o MVP atual de agent skills para um runtime institucional, auditavel e multiagente, capaz de operar de forma consistente em projetos novos e existentes sem depender de memoria ad-hoc do operador.

## Problem
O repositorio atual comprova instalacao e auditoria de skills, mas ainda nao governa o uso institucional completo:
- o repo versiona apenas 4 project skills;
- o catalogo de 37+ skills existe como inventario/cobertura, nao como runtime deterministico;
- Codex e Cursor podem divergir em paths e comportamento;
- nao existe motor institucional de roteamento por contexto/tarefa;
- nao existe smoke automatizado de ativacao real por skill.

## Scope
- Transformar `tools/skills.json` em manifesto operacional canonico.
- Definir runtime institucional de ativacao de skills por contexto e tarefa.
- Garantir paridade de instalacao e auditoria entre Codex e Cursor.
- Criar manual de uso para:
  - projeto novo;
  - projeto existente;
  - operacao em portfolio grande de projetos.
- Definir evidencias e gates para impedir regressao do sistema de skills.

## Out of Scope
- Marketplace publico de skills.
- Execucao automatica irrestrita de todas as 37+ skills em qualquer sessao.
- Misturar esta iniciativa com redesign visual do SaaS ou refatoracoes de CRM UI.

## Functional Requirements
1. O sistema deve manter uma fonte unica de verdade para skills, aliases, triggers, prioridades e conflitos.
2. O bootstrap diario deve validar o agente alvo (`codex`, `cursor`, etc.) e falhar quando a base institucional requerida nao estiver presente.
3. A ativacao deve ser deterministica por contexto, nao por adivinhacao difusa.
4. Skills criticas devem ter `proof_phrase`/anuncio obrigatorio para rastreabilidade.
5. O sistema deve separar:
   - skills institucionais obrigatorias do projeto;
   - skills globais homologadas;
   - skills opcionais por dominio.
6. Deve existir manual operacional reutilizavel para qualquer novo projeto e para carga de projeto existente.

## Non-Functional Requirements
- Auditabilidade completa via reports e logs de bootstrap.
- Baixa ambiguidade entre agentes diferentes.
- Estrutura portavel para portfolio grande de repositorios.
- Reversibilidade: um projeto pode operar com perfil minimo ou perfil expandido.

## Acceptance Criteria
1. Existe `spec/design/tasks` aprovaveis para o runtime institucional.
2. Existe manual operacional claro para novos e antigos projetos.
3. Existe proposta objetiva para:
   - manifesto v2;
   - instalador unificado;
   - router de triggers;
   - smoke de ativacao.
4. Fica explicitado que "ter 37+ skills instaladas" nao e o mesmo que "usar automaticamente 37+ skills".
