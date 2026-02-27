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

Fechar UAT operacional OpenAI + Evolution no AWS dev (`dev.automaniaai.com.br`) apos hotfix de runtime:

1. Validar `audio/transcribe` e `audio/speech` no modulo 01 com chave OpenAI tenant valida.
2. Validar `Gerar QR Code` no modulo 02 com Evolution instance ativa e leitura de estado (`ready|connected|pending_qr`).
3. Registrar evidencias finais de UAT em `STATE.md`, `STATUS-ATUAL.md`, `worklog.csv`, `costlog.csv`.

---

## Resumo (leigo)

O SaaS matriz ja esta no AWS dev com hotfix aplicado. Agora o foco e fechar UAT real de voz OpenAI e QR Evolution para encerrar o slice com evidencias operacionais.

---

*Feature ativa: `milestone-5-runtime-stability-hotfix-slice`.*
