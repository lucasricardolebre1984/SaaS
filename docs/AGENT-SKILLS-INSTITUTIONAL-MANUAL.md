# Manual Institucional - Agent Skills

Date: 2026-03-06
Status: Draft

## 1. Objetivo
Padronizar o uso de agent skills para que qualquer projeto novo ou existente rode com o mesmo nivel de contexto, rastreabilidade e disciplina operacional.

## 2. O que este sistema e
Ele e um runtime institucional de trabalho do agente.

Ele serve para:
- carregar contexto correto;
- escolher skills corretas por tarefa;
- reduzir respostas por achismo;
- manter consistencia entre agentes;
- gerar evidencia de uso.

Ele nao serve para:
- ligar 37+ skills ao mesmo tempo;
- substituir design de produto;
- substituir engenharia de software;
- compensar falta de `AGENTS.md`, specs ou runbooks.

## 3. Regra de ouro
Ter muitas skills instaladas nao significa ter um sistema institucional maduro.

O sistema maduro exige:
- manifesto unico;
- perfil por projeto;
- triggers claros;
- prioridade e conflito resolvidos;
- prova de uso;
- smoke de ativacao.

## 4. Melhor caminho para codar?
Sim, se o objetivo for escalar qualidade em muitos projetos e agentes.

Para projeto serio, este e o melhor caminho porque:
- reduz dependencia de prompt manual;
- reduz perda de contexto entre sessoes;
- melhora repetibilidade;
- melhora auditoria;
- prepara portfolio de repositorios.

Mas ele deve coexistir com:
- arquitetura correta;
- testes;
- design system;
- revisao tecnica.

## 5. Como usar em projeto novo

### 5.1 Estrutura minima
Todo projeto novo deve ter:
- `AGENTS.md`
- `.specs/project/CONTEXT.md`
- `.specs/project/PROJECT.md`
- `.specs/project/ROADMAP.md`
- `.specs/project/STATE.md`
- `tools/skills.json`
- pasta de project skills

### 5.2 Passos
1. Criar `AGENTS.md` com ordem de carga e comandos diarios.
2. Definir o perfil do projeto:
   - `minimal`
   - `product`
   - `platform`
   - `portfolio`
3. Declarar project skills obrigatorias.
4. Instalar skills no agente alvo.
5. Rodar auditoria.
6. Validar smoke de ativacao.

### 5.3 Recomendacao por tipo de projeto
- projeto pequeno: `minimal`
- produto SaaS: `product`
- monorepo Nx + deploy + multiplos modulos: `platform`
- operacao com muitos repositorios: `portfolio`

## 6. Como carregar projeto existente

### 6.1 Primeiro passo
Nao tente instalar skills antes de organizar o contexto.

O projeto existente precisa primeiro de:
- `AGENTS.md`
- docs centrais de contexto/estado
- definicao de comandos oficiais

### 6.2 Ordem correta
1. inventariar docs, scripts e gates atuais;
2. criar `AGENTS.md`;
3. definir 4 a 8 skills obrigatorias reais;
4. instalar no agente;
5. auditar;
6. adicionar hard-fail so depois do ambiente estabilizar.

## 7. Como usar em escala gigante

### 7.1 Modelo de portfolio
Padronize tudo por camadas:
- camada 1: skills institucionais do portfolio
- camada 2: skills obrigatorias por projeto
- camada 3: skills opcionais por dominio

### 7.2 O que centralizar
- manifesto base de skills
- nomenclatura canonica
- templates de `AGENTS.md`
- smoke institucional
- comandos `init/resume/end day`

### 7.3 O que nao centralizar demais
- prompts especificos de produto
- regras de dominio local
- excecoes de deploy/seguranca sem justificativa

## 8. Codex e Cursor
Nao trate Codex e Cursor como a mesma coisa por default.

A operacao correta exige:
- install separado por agente;
- audit separado por agente;
- mesma fonte institucional no repo;
- paridade verificada por report.

## 9. O erro estrutural mais comum
Catalogar muitas skills e achar que o sistema esta pronto.

Sem router institucional, isso vira:
- confusao;
- inconsistencias;
- falso senso de automacao;
- quebra de caminho entre agentes.

## 10. Manual de operacao diaria

### 10.1 Iniciar
```powershell
npm run init:day
```

### 10.2 Retomar
```powershell
npm run resume:day
```

### 10.3 Encerrar
```powershell
npm run end:day
```

### 10.4 Validacao minima
O bootstrap deve provar:
- agente alvo;
- skills obrigatorias presentes;
- contexto carregado;
- feature ativa conhecida;
- evidence report gerado.

## 11. Como isso conversa com produto premium
Agent skills fortes melhoram engenharia.

Para o SaaS parecer produto caro, voce ainda precisa de outro trilho institucional:
- benchmark de CRMs premium;
- design system forte;
- tipografia e espacamento de produto enterprise;
- motion e estados consistentes;
- UX auditavel em desktop/mobile;
- nao aceitar layout com cara de gerador generico.

## 12. Recomendacao final
O caminho certo e operar em dois eixos:

1. eixo de engenharia institucional
- agent skills
- contexto
- gates
- auditoria

2. eixo de produto premium
- benchmark visual
- design system
- shell unificado
- componentes premium

Sem o eixo 1, a engenharia deriva.
Sem o eixo 2, o produto parece barato.
