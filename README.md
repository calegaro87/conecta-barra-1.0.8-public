# Conecta Barra — versão 1.0.8

Aplicativo Android (Expo / React Native) + API (Node, tRPC, MySQL/TiDB, WebSocket) para moradores de
**Barra do Piraí-RJ**: solicitações por bairro, comunicados da Prefeitura, sugestões, notificações push,
tempo real, biometria e canais oficiais.

> **Aviso honesto:** esta versão foi corrigida lendo e ajustando o código, mas **não foi possível rodar o
> servidor nem o app aqui** (sem dependências instaladas, sem Render, sem aparelho Android). Os fluxos
> abaixo só estão confirmados depois que você fizer os testes da seção 6 com o APK novo.

## 1. O que mudou na 1.0.8

| Problema | Causa encontrada | Correção |
|---|---|---|
| **Login Google falhava** | O app trocava o código do Google **duas vezes** (uma automática, outra no servidor, sem PKCE e com código já usado) e dependia de SHA-1, esquema URI personalizado e cliente "Android" no Google Cloud. | O login agora é feito **pelo servidor** (cliente "Aplicativo da Web"): `/api/auth/google/start` → Google → `/api/auth/google/callback` → o app recebe um **tíquete de uso único** (`conectabarra://google-auth`). Não depende de SHA-1 nem de PKCE. |
| **Cadastro Google não concluía** | `auth.me` devolvia o `id` da ficha no lugar do `id` do usuário (e até o hash da senha); a ficha podia não ser criada em tentativas simultâneas; e a atualização do perfil apagava o e-mail. | `me` corrigido (sem hash, `id` certo, `profileComplete`), criação da ficha à prova de corrida, e-mail preservado, tela de retorno que leva a **Conta → Editar** para completar endereço/telefone. |
| **Admin `educalegaro` / `@educalegaro` não entrava** | O app exigia senha de **8+ caracteres** mesmo no login (barrando senhas menores) e o servidor respondia "usuário ou senha inválidos" **também quando `ADMIN_PASSWORD` não existia**; espaço/aspas colados no Render também quebravam a comparação. | Sem mínimo no login; `educalegaro` e `@educalegaro` sempre aceitos; senha/usuário do Render limpos de espaços/aspas; comparação em tempo constante; mensagem **clara** quando `ADMIN_PASSWORD` não está configurada. |
| **Push instável** | Dependia do Expo Push Service + chave FCM no EAS; e o `google-services.json` é do projeto Firebase **`conecta-barra-6799b`**, enquanto a documentação antiga citava **`conecta-barra-c2648`** (se a chave de serviço for de outro projeto: `MismatchSenderId`/`InvalidCredentials`). | **Push direto pelo FCM (gratuito)**, sem Expo no meio (veja seção 4). Expo continua como reserva. |
| **Render Free hiberna** | Sem acessos por ~15 min o serviço dorme; o primeiro acesso demora 30–60 s. | `keepalive.yml` (GitHub Actions, ping a cada 5 min) + o app "acorda" o servidor ao abrir. Sem pagar nada. |

Novo endpoint de diagnóstico **sem segredos**: `https://conecta-barra-api.onrender.com/api/health/config`
(mostra se banco, senha admin, Google e push estão configurados e qual redirect URI cadastrar).

## 2. Configuração (faça nesta ordem)

### 2.1 Render → Environment

| Variável | Valor |
|---|---|
| `DATABASE_URL`, `DATABASE_SSL=true` | conexão do TiDB/MySQL (já existentes) |
| `JWT_SECRET`, `DATA_ENCRYPTION_KEY` | já existentes — **não troque** a `DATA_ENCRYPTION_KEY` |
| `ADMIN_USERNAME` | `educalegaro` (digitar `@educalegaro` no app também funciona) |
| **`ADMIN_PASSWORD`** | a senha da gestão, **sem aspas** e sem espaços nas pontas. Sem ela o admin não entra |
| **`GOOGLE_WEB_CLIENT_SECRET`** | segredo do cliente "Aplicativo da Web" (passo 2.2) |
| **`FIREBASE_SERVICE_ACCOUNT_JSON`** | JSON da conta de serviço do Firebase (passo 2.3) |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | e-mails de confirmação (já existentes) |

Depois de salvar, o Render reinicia. Abra `/api/health/config` e confira os `true`.

### 2.2 Google Cloud (login Google) — ~3 minutos
1. https://console.cloud.google.com → projeto número **470980545863** → *APIs e serviços → Credenciais*.
2. Abra o cliente **"Aplicativo da Web"** (ID `470980545863-kf726hfm…`).
3. Em **URIs de redirecionamento autorizados** adicione exatamente:
   `https://conecta-barra-api.onrender.com/api/auth/google/callback`
   (o valor exato também aparece em `/api/health/config` → `googleRedirectUriToRegister`).
4. Copie o **Segredo do cliente** para `GOOGLE_WEB_CLIENT_SECRET` no Render.
5. Tela de consentimento OAuth: se estiver em "Teste", adicione os e-mails testadores ou publique o app.

Erros que o app mostra: *redirect_uri_mismatch* = passo 3 diferente do cadastrado; *invalid_client* = segredo errado.

### 2.3 Firebase (push gratuito)
1. https://console.firebase.google.com → projeto **`conecta-barra-6799b`** (o `project_id` do `google-services.json`).
   Se você prefere usar outro projeto, **baixe o `google-services.json` desse projeto** e substitua o da raiz.
2. ⚙ *Configurações do projeto → Contas de serviço → Gerar nova chave privada* (baixa um `.json`).
3. Cole o **conteúdo inteiro** do arquivo em `FIREBASE_SERVICE_ACCOUNT_JSON` no Render
   (ou o JSON em base64: `base64 -w0 chave.json`). Depois apague o arquivo do seu computador.
4. No Google Cloud do mesmo projeto, confirme que a **Firebase Cloud Messaging API** está *ativada*.
   FCM é gratuito no plano Spark; não é preciso cartão.

### 2.4 Keep-alive gratuito
- Suba o código para um repositório GitHub (público é grátis). O workflow `.github/workflows/keepalive.yml`
  chama `/api/health` a cada 5 min. Se a URL mudar, crie a variável de repositório `API_URL`.
- O GitHub desativa agendamentos após 60 dias sem atividade no repositório (reative em *Actions*).
- Alternativa sem GitHub: https://cron-job.org (grátis, a cada 1 min) apontando para `/api/health`.
- Limite do Render Free: 750 h/mês por conta — um único serviço ligado 24 h cabe (744 h).

### 2.5 Banco de dados
Nenhuma migração nova nesta versão. Se o banco for novo: `npm run db:push`. Registros **antigos**
ainda não cifrados: faça backup e rode `npm run db:encrypt` (com `DATABASE_URL` e `DATA_ENCRYPTION_KEY` no ambiente).

## 3. Rodar a API localmente
```bash
npm install
cp .env.example .env        # preencha
npm run dev:server          # http://localhost:3000/api/health/config
```
Build de produção (é o que o Render executa): `npm ci --include=dev && npm run build:server && npm run start:server`.

## 4. Como o push funciona agora
- O app pergunta ao servidor (`notifications.pushConfig`) se há FCM configurado.
  **Sim** → registra o token **nativo do Firebase** e o servidor envia direto à API HTTP v1 do FCM (prioridade alta, canal `conecta-alerts`).
  **Não** → usa o token do Expo (como antes). Um aparelho nunca recebe duplicado: cada instalação mantém um único token.
- Tokens inválidos são apagados sozinhos; o app se registra de novo ao abrir.
- Teste: entre como admin → **Segurança → Enviar push de teste**. O alerta traduz erros do FCM em instruções.
- **Android:** para chegar com o app fechado, em *Configurações → Apps → Conecta Barra → Bateria* escolha
  **Sem restrições** e mantenha as notificações ativadas. Fabricantes como Xiaomi/Samsung/Motorola podem exigir "início automático".

## 5. Gerar o APK

### Opção A — EAS (recomendado, nuvem gratuita)
```bash
npm install -g eas-cli
npm ci
npm run check                      # tsc
eas login
eas build --platform android --profile preview     # gera APK instalável
```
O `eas.json` já aponta a API e o `projectId` `c87bc760-536b-44e8-bf16-06ea027209d0`. Na primeira build o EAS
cria a keystore (guarde o backup: `eas credentials`). Aumente `version`/`versionCode` em `app.config.ts` a cada release.
O perfil `production` gera `.aab` para a Play Store.

### Opção B — compilação local
Exige JDK 17 + Android SDK.
```bash
npm ci
npm run build:apk:local     # android/app/build/outputs/apk/release/app-release.apk
```
Esse caminho assina com a chave de debug (serve para testar). Para distribuir, configure sua keystore em `android/app/build.gradle`.

### Atualizações sem nova build
Só JavaScript/telas: `npm run update:ota -- "mensagem"`. Mudanças em `app.config.ts`, permissões ou módulos nativos exigem nova build.
**Esta versão mudou o esquema de retorno do login (`app.config.ts`): é preciso instalar o APK novo; OTA não basta.**

## 6. Testes obrigatórios no celular (com o APK 1.0.8)
1. `…/api/health/config` → `adminPasswordConfigured`, `googleLoginConfigured`, `pushFcmConfigured`, `database` = `true`.
2. Login com `educalegaro` e depois com `@educalegaro` + senha da gestão → abre o painel.
3. **Continuar com Google** → escolher conta → volta ao app → se for conta nova, abre *Conta* para completar telefone/endereço → conseguir criar uma solicitação.
4. Admin → *Segurança → Enviar push de teste*, com o app aberto e depois **fechado**.
5. Aguarde 20 min sem usar o app e abra de novo (valida o keep-alive).

## 7. Se algo falhar
| Mensagem | O que fazer |
|---|---|
| "acesso administrativo ainda não foi configurado" | falta `ADMIN_PASSWORD` no Render |
| "Usuário ou senha inválidos" (admin) | senha diferente da do Render (refaça a variável sem aspas) |
| Google: "login Google ainda não foi ativado" | falta `GOOGLE_WEB_CLIENT_SECRET` |
| Google: "redirect_uri_mismatch" | URI do passo 2.2 diferente |
| Push: `SENDER_ID_MISMATCH` | a chave de serviço não é do projeto do `google-services.json` |
| Push: `FcmNotConfigured` / `FcmAuthError` | `FIREBASE_SERVICE_ACCOUNT_JSON` ausente ou inválido |
| Push: `PERMISSION_DENIED` | ative a Firebase Cloud Messaging API no projeto |
| Demora no 1º acesso | Render acordando; confirme o keep-alive |

Logs do servidor: Render → serviço → *Logs* (procure `[google]`, `[fcm]`, `[Push]`, `[auth]`).

## 8. Limitações que continuam
- Render Free pode reiniciar a qualquer momento: WebSocket cai e reconecta; push e polling cobrem a lacuna.
- Entrega de push depende do FCM e da bateria do Android; não há garantia de tempo.
- Sem integração com o sistema oficial municipal (estrutura preparada).
- O pacote não contém segredos: `DATABASE_URL`, `ADMIN_PASSWORD`, `DATA_ENCRYPTION_KEY`, `JWT_SECRET`, segredo Google, chave Firebase e tokens ficam só no Render.
- Fotos ficam no banco (limite de 3 MiB por imagem).

## Alternativa: servidor próprio (Docker)
```bash
cp .env.example .env && docker compose up -d --build
docker compose run --rm api npm run db:push
```
