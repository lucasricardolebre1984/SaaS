# Design - agent-skills-institutional-runtime

Status: Draft
Date: 2026-03-06

## 1) Posicionamento
O sistema de agent skills deve virar uma camada institucional do repositorio, equivalente a um runtime de governanca de desenvolvimento. Ele nao substitui o codigo do produto; ele governa como o agente trabalha sobre o codigo.

## 2) Arquitetura alvo

### 2.1 Manifesto canonico
`tools/skills.json` deixa de ser apenas auditoria e passa a conter:
- `project_skills_required`
- `global_skills_homologated`
- `profiles`
- `trigger_rules`
- `priority_order`
- `conflicts`
- `proof_phrases`
- `agent_targets`

### 2.2 Camadas de skill
1. `institutional-project`
- obrigatorias para o repositorio;
- versionadas no repo;
- disparadas em toda sessao conforme fase/contexto.

2. `institutional-global`
- homologadas para uso em qualquer projeto do portfolio;
- podem morar no home do agente, mas devem aparecer no manifesto.

3. `domain-optional`
- design, AWS, Figma, Jira, Sentry, etc.;
- ativadas por trigger claro, nunca por suposta conveniencia.

### 2.3 Perfis operacionais
Cada projeto deve declarar um perfil institucional:
- `minimal`
- `product`
- `platform`
- `portfolio`

Exemplo:
- projeto novo pequeno: `minimal`
- SaaS Nx enterprise: `platform`
- escritorio com muitos repos: `portfolio`

### 2.4 Router institucional
O router decide skills por:
1. agente ativo;
2. projeto atual;
3. fase atual;
4. intencao da tarefa;
5. restricoes/ conflitos.

O router nunca deve "ligar tudo". O correto e selecionar o menor conjunto suficiente.

## 3) Fluxo operacional

### 3.1 Bootstrap
1. identificar agente alvo;
2. auditar instalacao;
3. carregar contexto do projeto;
4. aplicar perfil do projeto;
5. resolver skills obrigatorias;
6. registrar evidence report.

### 3.2 Execucao
Para cada tarefa:
1. classificar intencao;
2. mapear triggers no manifesto;
3. resolver conflitos e prioridade;
4. anunciar skills em uso;
5. executar.

### 3.3 Verificacao
Smoke institucional cobre:
- contexto;
- Nx;
- docs;
- metrics;
- AWS;
- browser/UI quando aplicavel.

## 4) Instalacao

### 4.1 Repo-local
O ideal institucional e manter no repo:
- project skills obrigatorias;
- manifestos de perfil;
- docs/runbooks.

### 4.2 Agent-home
Os agentes continuam usando seus paths locais:
- `%USERPROFILE%\\.codex\\skills`
- `%USERPROFILE%\\.cursor\\skills`

Mas a paridade deve ser validada automaticamente pelo bootstrap.

## 5) Estrategia para projeto novo
1. copiar template de manifesto;
2. declarar perfil;
3. instalar project skills;
4. homologar skills globais;
5. testar bootstrap e smoke.

## 6) Estrategia para projeto existente
1. inventariar docs/comandos/fases;
2. criar `AGENTS.md`;
3. definir skills obrigatorias;
4. instalar e auditar;
5. validar por smoke;
6. so depois exigir hard-fail.

## 7) Controles para evitar quebra grotesca de caminho
- um manifesto unico por projeto;
- nomes canonicos sem alias ambiguo;
- agent-target explicito;
- hard-fail quando auditar no agente errado;
- repo como fonte das regras;
- smoke automatizado por trigger.

## 8) Relacao com qualidade do produto
Esse runtime institucional melhora a qualidade da codificacao e reduz deriva. Mas ele nao substitui design system, benchmark de produto premium e disciplina de UX. Para o SaaS parecer produto caro, isso exige um segundo eixo:
- benchmark real de CRMs top;
- design system forte;
- shell e componentes premium;
- testes visuais/UAT.
