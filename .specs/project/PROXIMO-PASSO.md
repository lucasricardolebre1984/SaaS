# Proximo passo do SaaS para fechar memoria e contexto

**Foco:** O **produto** SaaS (o que o dono do tenant usa). Nao e sobre o que o agente deve codar e sim o que falta no produto para memoria e contexto ficarem fechados.

**Ultima atualizacao:** 2026-02-26

---

## Hoje no produto

- **Memoria de sessao (short):** o sistema guarda e usa os turnos da conversa atual. **Fechado.**
- **Episodios (medium):** o sistema cria marcos da sessao e usa esses marcos no contexto da resposta. **Fechado.**
- **Conhecimento longo (RAG):** o sistema busca conhecimento e usa na resposta; e **agora tambem promove** episodios para a memoria longa (source episode_promotion, evento memory.promoted.from_episode). **Fechado.**

---

## O que faltava no SaaS para fechar memoria e contexto (concluido)

**Passo unico no produto (implementado):**

O sistema **promove** conteudo (episodios) para a **memoria longa (RAG)** por tenant: a cada marco de episodio (ex.: a cada N turnos), uma entrada e criada no owner memory com texto do marco e embedding; evento `memory.promoted.from_episode` registra a promocao. O conhecimento do tenant passa a crescer com o uso: conversa -> episodios -> promocao -> conhecimento longo -> RAG usa nas proximas conversas.

---

## Aprendizado se encaixa aqui?

Sim. **Aprendizado continuo** = o sistema passar a gravar conhecimento longo a partir do uso (episodios/resumos). Fechando a promocao medium -> long, o SaaS fecha memoria, contexto **e aprendizado** nessa arquitetura. Na pratica atual, e o desenho certo para um "SaaS inteligente" nesse eixo: short + medium + long com promocao auditada por tenant.

---

## Resumo (leigo)

- **Fechado:** o que foi dito na sessao (short), os marcos da sessao (medium) e a **promocao** de episodios para conhecimento longo (long/RAG). O sistema agora "aprende" com o uso: grava marcos na memoria longa e o RAG usa nas proximas conversas. Memoria, contexto e aprendizado estao fechados nessa arquitetura.

---

## Alinhamento com pesquisa e pratica (web)

Esse desenho (memoria em camadas + promocao + RAG) esta alinhado a pesquisa e boas praticas atuais:

- **Memoria em camadas:** Arquiteturas recomendadas para agentes IA usam varios niveis (working/sessao, episodica, semantica/arquivo). Ex.: modelo em 4 camadas (working memory, episodic, semantic/relational, archival) e variantes em 2 camadas (short session + long vector). Fonte: Google Cloud / GuidedMind / Agents Arcade (tiered agentic memory, short and long memory architecture).
- **Episodico vs semantico:** Pesquisa recente (arXiv 2024–2025) diferencia memoria episodica (o que aconteceu, com contexto) de memoria semantica (conhecimento duravel). Sistemas como REMem, HippoRAG 2 e “Generative Semantic Workspace” combinam RAG com memoria episodica e promocao/estruturacao para raciocinio de longo prazo.
- **Isolamento:** Boas praticas exigem isolamento por usuario/tenant e por sessao (evitar vazamento entre usuarios). Nosso modelo (tenant + session + canal) segue isso.
- **Promocao auditada:** Gravar conhecimento longo de forma seletiva e auditavel (eventos, correlation_id) e o padrao para sistemas de memoria “learning from use”.

*(Referencias: arXiv 2511.07587, 2602.13530; HippoRAG; Medium/Google Cloud “Tiered Agentic Memory”; GuidedMind “Short and Long Memory”; Agents Arcade “Memory in AI Agents”.)*

---

*Slice implementado: milestone-4-long-memory-promotion-slice. Proximo passo do produto: nenhum pendente neste eixo (memoria/contexto/aprendizado fechados).*
