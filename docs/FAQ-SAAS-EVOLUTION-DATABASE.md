# FAQ — Modelo SaaS, banco de dados e Evolution

## Vendi 4 SaaS. Qual a melhor saida? Como crio as instancias? De onde saem?

**Melhor saida:** usar **um unico deploy** do fabio e **4 tenants** (multi-tenant). Cada cliente = um `tenant_id`. Nao precisa subir 4 servidores nem rodar o gerador 4 vezes.

**De onde saem as instancias:** da **mesma aplicacao** que ja esta no ar. Voce nao “cria” 4 apps; voce cria 4 **tenants** dentro da mesma app. Os dados de cada tenant ficam em `.runtime-data/` (ou no Postgres), separados por `tenant_id`.

**Como criar as 4 instancias (passo a passo):**

1. **Um unico fabio em producao**  
   Deixe um unico deploy rodando (ex.: `https://app.seudominio.com` ou `http://127.0.0.1:4001` em dev).

2. **Defina os 4 tenant_id**  
   Ex.: `tenant_cliente1`, `tenant_cliente2`, `tenant_cliente3`, `tenant_cliente4`.

3. **Para cada cliente (criar a “instancia” dele):**  
   - Abra o Owner: `https://app.seudominio.com/owner/` (ou o CRM, conforme o fluxo).  
   - No campo **Tenant** (06 Configuracoes ou no topo), coloque o `tenant_id` daquele cliente (ex.: `tenant_cliente1`).  
   - Vá em **06 Configuracoes** e preencha o que for desse cliente: OpenAI API Key, Evolution (Base URL, API Key, Instance ID), personas, etc.  
   - Clique em **Salvar Config**. O backend grava a config naquele tenant (em `.runtime-data/tenant-runtime-config/` ou no Postgres).  
   - Entregue ao cliente o link com o tenant dele (o CRM aceita `?tenant=` na URL):  
     - CRM do cliente 1: `https://app.seudominio.com/crm/?tenant=tenant_cliente1`  
     - Owner: `https://app.seudominio.com/owner/` (no 06 Configuracoes ele escolhe o tenant no campo Tenant).

4. **Onde ficam os dados**  
   - Backend **file**: tudo em `.runtime-data/` na raiz do projeto (orchestration, customers, agenda, billing, crm, tenant-runtime-config, etc.). Cada registro tem `tenant_id`; os arquivos podem ser compartilhados entre tenants.  
   - Backend **postgres**: todas as tabelas tem tenant; um unico banco serve os 4 clientes.

**Resumo:** A melhor saida e **1 deploy, 4 tenants**. Criar uma “instancia” = definir um `tenant_id` novo e salvar a config desse tenant no 06 Configuracoes. As instancias “saem” do mesmo fabio; so mudam o tenant_id e a config por tenant.

**Quando usar o gerador (4 codigos separados)?**  
So se precisar de **4 deploys totalmente separados** (4 dominios diferentes, 4 codigos/brandings distintos). Aí roda `npm run generate:saas-starter` 4 vezes e faz 4 deploys. Custo e operacao maiores; use se o negocio exigir isolamento total por cliente.

---

## Esse SaaS e meu modelo padrao. Tem comando para criar outros SaaS?

Sim. O fabio e o **modelo institucional** para clonar novos SaaS. Comando:

```powershell
npm run generate:saas-starter -- --saas-name "Meu SaaS" --tenant-id "tenant_meu_saas" --layout-default studio --palette-default ocean
```

- Saida: **`.tmp/generated-saas/<slug>/`**
- Depois: abra a pasta, ajuste branding/dominios/integracoes, mantenha contratos e modulos core.
- Manual: `docs/SAAS-STANDARD-MANUAL.md` (secao 5).

---

## O banco de dados do fabio esta onde? Usa Redis? Postgres?

- **Nao usa Redis.**
- **Padrao (backend `file`):**  
  Dados ficam em **arquivos** na pasta **`.runtime-data/`** na raiz do projeto (ex.: `c:\projetos\fabio\.runtime-data\`):
  - `orchestration/` — comandos, eventos, fila de tarefas, confirmacoes
  - `customers/` — clientes
  - `agenda/` — agendamentos e lembretes
  - `billing/` — cobrancas e pagamentos
  - `crm/` — leads
  - `crm-automation/` — campanhas e follow-ups
  - `owner-memory/` — memoria longa do owner
  - `owner-memory-maintenance/` — agendamentos de re-embed
  - `tenant-runtime-config/` — config por tenant (OpenAI, personas, Evolution, etc.)
  - `owner-short-memory/`, `owner-episodes/` — contexto de sessao

- **Opcional (backend `postgres`):**  
  Pode usar **PostgreSQL** para tudo isso. Variaveis:
  - `ORCHESTRATION_STORE_BACKEND=postgres`
  - `ORCHESTRATION_PG_DSN=postgres://user:pass@host:port/dbname`  
  O smoke do projeto sobe um Postgres em Docker na porta **55432** (projeto `fabio-postgres-smoke`). Em producao voce aponta para seu proprio Postgres.
  - Runbook: `apps/platform-api/RUNBOOK-backend-switch.md`

Resumo: **por padrao e arquivo (`.runtime-data/`); opcionalmente Postgres. Nenhum Redis.**

---

## A Evolution no Docker e de outro projeto. Qual a melhor saida para minha Evolution estar funcional fora do Docker?

- O **fabio nao traz** a Evolution; ele so **chama** a API da Evolution (HTTP). Entao a Evolution pode ser:
  - do outro projeto (Docker), ou
  - rodando **fora do Docker** (Node.js no seu PC ou servidor).

Para **Evolution funcional fora do Docker**:

1. **Usar a mesma Evolution do outro projeto (Docker)**  
   So configurar no fabio a URL onde essa Evolution ja esta (ex.: `http://localhost:8080`), com API Key e Instance ID `fabio` (para nao conflitar com fabio2). Nao precisa “criar” outra Evolution; pode compartilhar o mesmo servidor Evolution, com instancias diferentes.

2. **Rodar a Evolution em Node (sem Docker)**  
   - Clone o repo: https://github.com/EvolutionAPI/evolution-api  
   - Siga o README: `npm install`, configurar `.env` (porta, Redis/DB se a Evolution exigir), build e `npm run start`.  
   - Depois, no fabio, use a URL onde a Evolution esta (ex.: `http://localhost:8080`).

Detalhes e checklist de conexao: `docs/EVOLUTION-WHATSAPP-DOCKER.md` (inclui secao “Evolution de outro projeto / fora do Docker”).
