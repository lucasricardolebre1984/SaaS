# Evolution API + WhatsApp no SaaS (Docker, QR no proprio app)

## Objetivo

Usar a **mesma** Evolution API que ja roda no Docker Desktop (por ex. a do fabio2) no projeto **fabio**, sem conflito: cada projeto usa uma **instancia** diferente na mesma Evolution. Gerar e exibir o QR code no proprio SaaS (CRM Console).

## Evitar conflito com fabio2

- **Um container Evolution** pode ter varias **instancias** (cada uma = um numero/conta WhatsApp).
- **fabio2** pode usar a instancia `fabio2` ou `default`.
- **fabio** deve usar outra instancia, por ex. `fabio` ou `fabio-prod`.
- Basta configurar no fabio: `EVOLUTION_INSTANCE_ID=fabio` (e a mesma Evolution URL e API key do Docker).

## Variaveis no backend (platform-api)

Defina no ambiente (ou `.env` na raiz do repo, se o servidor ler):

```env
EVOLUTION_HTTP_BASE_URL=http://localhost:8080
EVOLUTION_API_KEY=sua-api-key-da-evolution
EVOLUTION_INSTANCE_ID=fabio
```

- **EVOLUTION_HTTP_BASE_URL:** URL base da Evolution API (no Docker costuma ser `http://localhost:8080` ou a porta que voce expos).
- **EVOLUTION_API_KEY:** API key configurada no container Evolution (veja no Docker ou no painel da Evolution).
- **EVOLUTION_INSTANCE_ID:** Nome da instancia que o **fabio** vai usar (ex: `fabio`). Nao use o mesmo nome do fabio2.

## Como pegar a API e a URL da Evolution no Docker Desktop

1. Abra o **Docker Desktop** e localize o container da **Evolution API** (o que o fabio2 usa).
2. Veja a **porta** mapeada (ex: 8080:8080) e use `http://localhost:8080` (ou `http://host.docker.internal:8080` se o fabio rodar dentro do Docker).
3. A **API key** costuma estar em:
   - Variavel de ambiente do container (EVOLUTION_API_KEY ou AUTHENTICATION_API_KEY), ou
   - Configuracao no painel web da Evolution, ou
   - No docker-compose / script que sobe o container.

Se nao souber criar uma instancia nova: a Evolution cria a instancia na primeira vez que voce chama **connect** (ou **create**). No fabio, ao clicar em "Gerar QR Code" no CRM, o backend chama `GET /instance/connect/{EVOLUTION_INSTANCE_ID}`. Se a instancia `fabio` nao existir, a Evolution pode retornar 404 — nesse caso crie a instancia antes (veja abaixo).

## Criar a instancia na Evolution (se precisar)

Se ao gerar QR der 404 (instance not found), crie a instancia na Evolution:

```bash
curl -X POST "http://localhost:8080/instance/create" \
  -H "apikey: SUA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"fabio","qrcode":true}'
```

Depois, no SaaS (CRM Console), clique de novo em **Gerar QR Code**.

## Onde ver o QR no SaaS

1. Suba o backend e o front: `npm run serve:saas`.
2. Abra o CRM: `http://127.0.0.1:4001/crm/`.
3. No painel **Conectar WhatsApp**, clique em **Gerar QR Code**.
4. Escaneie o QR com o WhatsApp (Dispositivo vinculado) ou use o codigo de vinculacao, se aparecer.

### Versao da Evolution e QR via API

A imagem **atendai/evolution-api:v2.1.1** tem bug no `GET /instance/connect`: retorna apenas `{"count":0}` (issue [#2385](https://github.com/EvolutionAPI/evolution-api/issues/2385)). **Recomendado:** usar **evoapicloud/evolution-api:v2.3.5** no `docker-compose` da Evolution; essa versao retorna `code`, `base64` (QR em data:image/png;base64) e `count:1`, e o CRM exibe o QR ao clicar em Gerar QR Code.

## Nome exibido no celular (dispositivo vinculado)

No WhatsApp, ao escanear o QR, o dispositivo vinculado mostra um nome (ex.: "Google Chrome"). Para aparecer **Evolution API** ou o nome do seu produto (ex.: "Automania CRM"), configure no **.env do container/servidor da Evolution** (nao no SaaS):

| Variavel | Descricao | Exemplo |
|----------|-----------|---------|
| `CONFIG_SESSION_PHONE_CLIENT` | Nome exibido na conexao no celular | `Evolution API` ou `Automania CRM` |
| `CONFIG_SESSION_PHONE_NAME`     | "Nome do navegador" exibido (Chrome, Firefox, Edge, Opera, Safari) | `Evolution API` ou `Chrome` |

Exemplo no `.env` da Evolution (em `/srv/evolution` no servidor):

```env
CONFIG_SESSION_PHONE_CLIENT=Evolution API
CONFIG_SESSION_PHONE_NAME=Evolution API
```

Depois reinicie o container Evolution (`docker compose restart` em `/srv/evolution`). **Novas** vinculacoes passam a mostrar esse nome; sessoes ja vinculadas mantem o nome antigo ate reconectar.

## Endpoints usados

- **GET /v1/whatsapp/evolution/qr** — retorna `code` (QR), `pairingCode` e `instanceId`. O front exibe o QR e o codigo no proprio CRM.
