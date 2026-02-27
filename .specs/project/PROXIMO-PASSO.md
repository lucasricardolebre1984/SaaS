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

Fechar estabilizacao operacional do deploy AWS dev (`dev.automaniaai.com.br`) apos bootstrap:

1. Atualizar host para `main` mais recente (hotfix mobile + sanitizacao de `openai.api_key`).
2. Limpar eventual chave tenant legado concatenada em `tenant-runtime-config.json` no servidor.
3. Validar `provider: openai` sem erro 401 no modulo 01 (texto + audio).
4. Validar UX mobile (drawer fecha corretamente; avatar continuo sem tela preta).
5. Registrar evidencias finais em `STATE.md`, `STATUS-ATUAL.md`, `worklog.csv`, `costlog.csv`.

---

## Resumo (leigo)

O SaaS matriz ja foi para AWS dev. Agora o foco e estabilizar a operacao real: corrigir de vez o erro de provider OpenAI no ambiente remoto, garantir mobile funcionando direito e fechar rastreabilidade completa da entrega.

---

*Feature ativa: `milestone-5-runtime-stability-hotfix-slice`.*
