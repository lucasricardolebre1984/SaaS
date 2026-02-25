# Secrets and Configuration Hardening Plan - Milestone 3

Date: 2026-02-25  
Status: Planning baseline published

## Objective
Definir política de segredos e configuração por ambiente para eliminar práticas inseguras antes de produção.

## Environment Policy

### local
- Permitido:
  - `.env.local` fora de versionamento
  - placeholders em docs
- Proibido:
  - commitar chave real em qualquer arquivo
- Controle mínimo:
  - revisão manual antes de commit

### hml
- Obrigatório:
  - segredos provisionados por cofre gerenciado
  - injeção por variável de ambiente no runtime
- Proibido:
  - segredos em `localStorage`, código-fonte ou pipeline logs
- Controle mínimo:
  - rotação mensal
  - acesso por princípio de menor privilégio

### prod
- Obrigatório:
  - cofre gerenciado + IAM dedicado
  - trilha de auditoria de leitura/rotação
  - segregação de permissões por serviço
- Proibido:
  - qualquer segredo estático em repositório
  - compartilhamento de credenciais entre serviços
- Controle mínimo:
  - rotação quinzenal ou sob incidente
  - revogação imediata em suspeita de vazamento

## Secret Inventory (baseline)
1. `OPENAI_API_KEY`
2. `EVOLUTION_API_KEY`
3. `GOOGLE_CLIENT_SECRET`
4. `GOOGLE_REFRESH_TOKEN`
5. `BILLING_PROVIDER_API_KEY`
6. `ORCHESTRATION_PG_DSN`

## Rotation and Revocation
1. Rotação programada por ambiente (hml/prod).
2. Rotação imediata após incidente.
3. Atualização sincronizada com janela de manutenção.
4. Verificação pós-rotação com smoke crítico.

## Audit Criteria
1. Nenhum segredo real em:
   - `README`, docs, scripts, arquivos versionados
2. Logs sem exposição de token/chave.
3. Acesso a segredos com owner e trilha temporal.
4. Evidência de rotação registrada em runbook de operação.

## Implementation Guidance
1. Priorizar extração de segredos do módulo `06 Configuracoes` para backend vault em ambientes hml/prod.
2. Manter no front somente referências não sensíveis.
3. Enforce validação de config obrigatória no boot do runtime por ambiente.
