# Evolution API + Fabio SaaS — configurar e abrir

## Env que voce achou no Docker (Evolution)

- **SERVER_URL** = `http://localhost:8080` → URL da Evolution.
- **AUTHENTICATION_API_KEY** = `429683C4C977415CAAFCCE10F7D57E11` → API key para o header `apikey`.

Use esses valores no backend do **fabio** para o endpoint do QR funcionar.

---

## Configurar o backend do fabio

Defina estas variaveis antes de subir o servidor (PowerShell ou `.env` na raiz, se o processo ler):

```powershell
$env:EVOLUTION_HTTP_BASE_URL="http://localhost:8080"
$env:EVOLUTION_API_KEY="429683C4C977415CAAFCCE10F7D57E11"
$env:EVOLUTION_INSTANCE_ID="fabio"
```

Ou crie um arquivo **`.env`** na raiz do repo (ex.: `c:\projetos\fabio\.env`):

```env
EVOLUTION_HTTP_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=429683C4C977415CAAFCCE10F7D57E11
EVOLUTION_INSTANCE_ID=fabio
```

O `serve:saas` carrega esse `.env` automaticamente. Se a sua Evolution expoe outra porta no host (ex.: 8081), use por exemplo `http://localhost:8081` em `EVOLUTION_HTTP_BASE_URL`.

Se preferir nao usar `.env`, exporte no terminal antes de rodar:

```powershell
cd c:\projetos\fabio
$env:EVOLUTION_HTTP_BASE_URL="http://localhost:8080"
$env:EVOLUTION_API_KEY="429683C4C977415CAAFCCE10F7D57E11"
$env:EVOLUTION_INSTANCE_ID="fabio"
npm run serve:saas
```

---

## Nao consigo abrir — checklist

### 1) Abrir a Evolution API (http://localhost:8080)

- No **Docker Desktop**, confira se o container da Evolution esta **Running**.
- Veja o **mapeamento de portas**: deve ter algo como `8080:8080` (host:container). Se for `8081:8080`, use `http://localhost:8081`.
- No navegador ou no PowerShell teste:
  ```powershell
  curl http://localhost:8080
  ```
  Ou abra no browser: `http://localhost:8080`. Se a Evolution tiver rota `/` ou `/health`, deve responder (pode ser HTML ou JSON).
- Se nao abrir: firewall, outro processo na porta 8080, ou o container nao expoe 8080 no host. No Docker Desktop, na aba do container, confira **Ports**.

### 2) Abrir o SaaS (CRM com QR)

- Suba o fabio:
  ```powershell
  cd c:\projetos\fabio
  npm run serve:saas
  ```
- Abra no navegador: **http://127.0.0.1:4001/crm/**  
  (ou **http://localhost:4001/crm/**)
- No CRM, no painel **Conectar WhatsApp**, clique em **Gerar QR Code**.  
  Se as env estiverem certas e a Evolution no ar, o QR aparece ali.

### 3) Se o backend nao achar a Evolution (502 / evolution_unreachable)

- O **Node** roda na sua maquina; a Evolution roda no Docker. Para o Node, a URL e **localhost**.
- Confirme que, no mesmo PC, no browser ou `curl`, `http://localhost:8080` responde.
- Se o fabio rodar **dentro** de outro container Docker, aí sim troque para `http://host.docker.internal:8080` em vez de `http://localhost:8080`.

---

## Resumo dos valores (do seu env Docker)

| No Docker (Evolution)   | No fabio (env)                |
|-------------------------|-------------------------------|
| SERVER_URL              | EVOLUTION_HTTP_BASE_URL       |
| `http://localhost:8080` | `http://localhost:8080`       |
| AUTHENTICATION_API_KEY  | EVOLUTION_API_KEY             |
| `429683C4C977415CAAFCCE10F7D57E11` | (mesmo valor)        |
| —                       | EVOLUTION_INSTANCE_ID=`fabio` |

Instancia `fabio` = so para este projeto; nao conflita com outra instancia (ex.: fabio2) na mesma Evolution.

---

## Evolution de outro projeto / fora do Docker

- **Evolution no Docker e de outro projeto:** O fabio **nao inclui** container da Evolution. Ele so **consome** a API (HTTP): voce informa Base URL, API Key e Instance ID no menu 06 Configuracoes (ou no `.env`). Pode ser a Evolution do fabio2, de outro repo, ou uma Evolution rodando em Node na sua maquina.
- **Evolution funcional fora do Docker:** A Evolution API pode rodar direto com Node.js:
  1. Clone: `git clone https://github.com/EvolutionAPI/evolution-api`
  2. Entre na pasta, instale deps, configure `.env` (porta, Redis se precisar, etc.) e rode com `npm run start` (veja o README do repo). A documentacao oficial prioriza Docker; rodar sem Docker exige seguir o projeto Evolution (TypeScript, build, variaveis de ambiente).
  3. Depois use no fabio a URL onde a Evolution esta escutando (ex.: `http://localhost:8080`).
- **Resumo:** Para o fabio, tanto faz se a Evolution esta no Docker (de outro projeto) ou rodando em Node: basta a URL estar acessivel e o fabio usar essa URL + API Key + Instance ID.
