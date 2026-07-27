# BABA MANAGER

Sistema web para organizar futebol amador: equipes, jogadores, partidas, ligas, estatísticas, disciplina e check-in com geolocalização.

Construído com React, TypeScript, Vite, Firebase Authentication e Cloud Firestore.

## Funcionalidades

- autenticação com conta Google;
- acessos acumuláveis de Master, Gerenciador e Jogador na mesma conta Google;
- troca de contexto entre organizações e times pelo menu do perfil;
- organizações isoladas por `organizationId`;
- equipes com nome, sigla, cor e escudo por URL;
- jogadores com foto, apelido, e-mail, posições e número da camisa;
- locais com coordenadas e raio autorizado para check-in;
- partidas agendadas, ao vivo e finalizadas;
- súmula com gols, assistências e cartões;
- declaração de gols e assistências pelo jogador, com aprovação do gerenciador;
- ligas com classificação, artilharia e controle disciplinar;
- check-in pelo GPS do celular;
- criação de gerenciadores pelo usuário Master;
- miniaturas de locais com Google Maps;
- registro de atividades administrativas;
- modo demonstração quando o Firebase ainda não está configurado.

## Tecnologias

- React 19
- TypeScript
- Vite
- Firebase Authentication
- Cloud Firestore
- Firebase Admin SDK
- Vercel

## Pré-requisitos

Antes de começar, tenha instalado:

- [Node.js 22 ou superior](https://nodejs.org/);
- npm;
- uma conta Google;
- uma conta no [Firebase](https://console.firebase.google.com/);
- Git, caso queira clonar e versionar o projeto.

## 1. Clonar e executar o projeto

```bash
git clone https://github.com/evandrodsm17/baba-manager.git
cd baba-manager
npm install
npm run dev
```

A aplicação ficará disponível em:

```text
http://localhost:5173
```

Sem as variáveis do Firebase, o sistema abre no modo demonstração. Esse modo permite testar os painéis Master, Gerenciador e Jogador sem gravar dados reais.

---

## Configuração do Firebase

### Visão geral

A configuração será feita nesta ordem:

1. criar o projeto Firebase;
2. cadastrar a aplicação Web;
3. habilitar o login Google;
4. criar o banco Cloud Firestore;
5. configurar as variáveis locais;
6. publicar as regras e os índices;
7. criar o primeiro usuário Master;
8. testar os três níveis de acesso.

### 2. Criar o projeto Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Clique em **Criar um projeto**.
3. Escolha um nome, por exemplo:

```text
baba-manager
```

4. O Google Analytics é opcional para os primeiros testes.
5. Aguarde a criação do projeto e abra o painel.

### 3. Cadastrar uma aplicação Web

1. No Firebase, abra **Configurações do projeto**.
2. Na seção **Seus aplicativos**, clique no ícone Web `</>`.
3. Informe um apelido, por exemplo:

```text
BABA MANAGER Web
```

4. Não é necessário habilitar o Firebase Hosting, pois a aplicação será publicada na Vercel.
5. Clique em **Registrar app**.
6. O Firebase exibirá um objeto semelhante a este:

```ts
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

Guarde esses valores. Eles serão utilizados no arquivo `.env.local`.

Documentação oficial: [Adicionar o Firebase a um projeto JavaScript](https://firebase.google.com/docs/web/setup).

### 4. Habilitar autenticação com Google

1. No menu do Firebase, abra **Authentication**.
2. Clique em **Começar**.
3. Abra a aba **Sign-in method** ou **Método de login**.
4. Selecione **Google**.
5. Ative o provedor.
6. Escolha um e-mail de suporte.
7. Clique em **Salvar**.

Depois, abra:

```text
Authentication > Settings > Authorized domains
```

Para desenvolvimento local, confirme que existe o domínio:

```text
localhost
```

Projetos Firebase recentes podem não incluir `localhost` automaticamente. Informe somente o domínio, sem `http://` e sem a porta `5173`.

Quando o sistema for publicado, adicione também o domínio da Vercel, por exemplo:

```text
baba-manager.vercel.app
```

Documentação oficial: [Autenticação Google para aplicações Web](https://firebase.google.com/docs/auth/web/google-signin).

### 5. Criar o Cloud Firestore

1. No menu do Firebase, abra **Firestore Database**.
2. Clique em **Criar banco de dados**.
3. Selecione o banco `(default)`.
4. Escolha **Modo de produção**.
5. Escolha uma localização próxima da maioria dos usuários.

A localização do banco não poderá ser alterada depois da criação. Para reduzir latência, prefira uma região próxima dos jogadores e dos serviços que acessarão o banco.

Documentação oficial: [Localizações do Cloud Firestore](https://firebase.google.com/docs/firestore/locations).

Não é necessário criar coleções manualmente. Elas serão criadas conforme os dados forem cadastrados pela aplicação.

### 6. Configurar as variáveis locais

Na raiz do projeto, copie o arquivo de exemplo.

No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

No Linux ou macOS:

```bash
cp .env.example .env.local
```

Edite `.env.local` com os valores do aplicativo Web criado no Firebase:

```env
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-project-id
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=seu-messaging-sender-id
VITE_FIREBASE_APP_ID=seu-app-id
VITE_GOOGLE_MAPS_API_KEY=sua-chave-opcional
```

O nome de cada variável corresponde diretamente ao objeto `firebaseConfig`:

| Firebase | Variável do projeto |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |

Todas as seis variáveis devem estar preenchidas. Caso alguma esteja vazia, o BABA MANAGER continuará no modo demonstração.

`VITE_GOOGLE_MAPS_API_KEY` é opcional para o restante do sistema, mas necessária para renderizar as miniaturas interativas do Google Maps. Sem ela, o app mantém uma prévia simples e disponibiliza o link para abrir as coordenadas no Google Maps.

#### Configurar o Google Maps

1. No Google Cloud Console, selecione um projeto com faturamento configurado.
2. Habilite a **Maps Embed API**.
3. Crie uma chave de API.
4. Restrinja a chave por **HTTP referrers** aos domínios usados pelo app, incluindo `http://localhost:5173/*` e o domínio da Vercel.
5. Restrinja a chave à **Maps Embed API**.
6. Salve a chave como `VITE_GOOGLE_MAPS_API_KEY`.

A chave utilizada no navegador é visível para o usuário. A segurança deve ser feita pelas restrições de domínio e de API no Google Cloud. Consulte a [documentação oficial da Maps Embed API](https://developers.google.com/maps/documentation/embed/get-started).

Depois de criar ou alterar `.env.local`, reinicie o servidor:

```bash
npm run dev
```

> O objeto de configuração Web do Firebase identifica o projeto, mas não concede acesso administrativo. Mesmo assim, mantenha os arquivos `.env*` fora do Git. Nunca coloque uma chave de Service Account em variáveis `VITE_*`.

### 7. Instalar e autenticar o Firebase CLI

Instale a ferramenta:

```bash
npm install -g firebase-tools
```

Faça login:

```bash
firebase login
```

Na pasta do projeto, vincule o Firebase CLI ao projeto criado:

```bash
firebase use --add
```

Selecione o projeto correto e use o alias:

```text
default
```

Para confirmar:

```bash
firebase use
```

Referência oficial: [Firebase CLI](https://firebase.google.com/docs/cli).

### 8. Publicar regras e índices do Firestore

O repositório já contém:

- `firebase.json`;
- `firestore.rules`;
- `firestore.indexes.json`.

Publique esses arquivos com:

```bash
firebase deploy --only firestore
```

O comando publica as regras de segurança e os índices configurados no projeto.

As regras implementam o seguinte isolamento:

| Perfil | Permissões principais |
|---|---|
| Master | Acessa todas as organizações, gerenciadores e auditorias |
| Gerenciador | Gerencia somente os dados da própria organização |
| Jogador | Consulta sua organização, cria o próprio check-in e envia suas estatísticas para aprovação |

Uma identidade Google pode acumular vários acessos. A permissão efetiva é validada pelo convite de gerenciador ou pelo cadastro de jogador correspondente; selecionar outro contexto no menu não cria privilégios por conta própria.

Não substitua as regras por `allow read, write: if true`, mesmo durante testes com dados reais.

Documentação oficial: [Cloud Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started).

### 9. Criar o primeiro usuário Master

O usuário Master precisa ser criado em um ambiente administrativo. O projeto inclui o script:

```text
scripts/bootstrap-master.mjs
```

#### 9.1 Criar o usuário no Firebase Authentication

1. Inicie o projeto:

```bash
npm run dev
```

2. Clique em **Continuar com Google** usando a conta que será Master.
3. Nesse primeiro acesso, o sistema pode informar que ainda não encontrou um perfil autorizado. Isso é esperado.
4. No Firebase Console, abra:

```text
Authentication > Users
```

5. Confirme que a conta Google aparece na lista.

#### 9.2 Gerar uma Service Account

1. Abra **Configurações do projeto**.
2. Acesse **Contas de serviço** ou **Service accounts**.
3. Clique em **Gerar nova chave privada**.
4. Baixe o arquivo JSON.
5. Guarde-o fora da pasta do projeto.

> A chave de Service Account concede acesso administrativo ao Firebase. Nunca envie esse arquivo ao GitHub, Vercel, Slack ou e-mail.

#### 9.3 Executar o bootstrap

No PowerShell:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho-seguro\service-account.json"
$env:FIREBASE_PROJECT_ID="seu-project-id"
npm run bootstrap:master -- --email seu-email@gmail.com
```

No Linux ou macOS:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/caminho-seguro/service-account.json"
export FIREBASE_PROJECT_ID="seu-project-id"
npm run bootstrap:master -- --email seu-email@gmail.com
```

Resultado esperado:

```text
Master configurado com sucesso: seu-email@gmail.com
```

O script:

- encontra o usuário pelo e-mail;
- adiciona a custom claim `master`;
- cria ou atualiza `users/{uid}`;
- define `role: "master"`, `platformRole: "master"` e `active: true`.

Saia da aplicação e entre novamente com Google para renovar a sessão.

Documentação oficial: [Configurar o Firebase Admin SDK](https://firebase.google.com/docs/admin/setup).

### 10. Testar os níveis de acesso

#### Teste do Master

1. Entre com a conta configurada como Master.
2. Abra **Gerenciadores**.
3. Clique em **Novo gerenciador**.
4. Informe exatamente o e-mail Google do gerenciador.
5. Defina o nome da organização.

O convite ficará pendente até o primeiro acesso do gerenciador. O mesmo e-mail pode receber convites para mais de uma organização.

#### Teste do Gerenciador

1. Entre com a conta Google convidada ou abra o menu do perfil se essa conta também for Master/Jogador.
2. Selecione o acesso **Gerenciador** e a organização desejada.
3. Crie uma equipe.
4. Cadastre um local.
5. Cadastre jogadores.
6. Crie uma liga.
7. Agende uma partida.

Para permitir o login de um jogador, preencha no cadastro dele o mesmo e-mail que será utilizado no Google.

#### Teste do Jogador

1. Entre com o e-mail Google cadastrado no jogador ou abra o menu do perfil.
2. Selecione o acesso **Jogador** e o vínculo desejado.
3. Acesse a agenda.
4. Abra **Check-in**.
5. Autorize o acesso à localização do navegador.
6. Em uma partida finalizada da sua equipe, envie seus gols e assistências.
7. Volte ao acesso **Gerenciador** para aprovar ou recusar a declaração.

A geolocalização funciona em `localhost` durante o desenvolvimento e em páginas HTTPS, como as publicadas pela Vercel.

## Estrutura de dados

O sistema cria e utiliza as seguintes coleções:

| Coleção | Conteúdo |
|---|---|
| `users` | Usuários autenticados e seus perfis |
| `organizations` | Organizações administradas pelos gerenciadores |
| `managerInvites` | Convites e status dos gerenciadores |
| `teams` | Equipes |
| `players` | Jogadores |
| `venues` | Campos e quadras |
| `leagues` | Ligas e regras disciplinares |
| `matches` | Partidas, placares e súmulas |
| `checkins` | Presenças validadas |
| `statSubmissions` | Gols e assistências declarados pelos jogadores e seu status de aprovação |
| `auditLogs` | Atividades administrativas |

## Publicação na Vercel

Depois que o Firebase estiver funcionando localmente:

1. Acesse a [Vercel](https://vercel.com/).
2. Importe o repositório `evandrodsm17/baba-manager`.
3. Confirme o framework **Vite**.
4. Use:

```text
Build command: npm run build
Output directory: dist
```

5. Cadastre todas as variáveis `VITE_FIREBASE_*` e, se usar mapas interativos, `VITE_GOOGLE_MAPS_API_KEY` em:

```text
Project Settings > Environment Variables
```

6. Faça o deploy.
7. Copie o domínio final da Vercel.
8. Adicione esse domínio em:

```text
Firebase Authentication > Settings > Authorized domains
```

O arquivo `vercel.json` já possui o rewrite necessário para as rotas da aplicação.

## Comandos úteis

```bash
# Desenvolvimento
npm run dev

# Verificação de código
npm run lint

# Build de produção
npm run build

# Visualizar o build local
npm run preview

# Publicar regras e índices
firebase deploy --only firestore

# Criar ou atualizar o usuário Master
npm run bootstrap:master -- --email seu-email@gmail.com
```

## Solução de problemas

### A aplicação continua no modo demonstração

- confirme se as seis variáveis `VITE_FIREBASE_*` estão preenchidas;
- confirme se o arquivo se chama `.env.local`;
- reinicie `npm run dev`;
- verifique se não existem espaços antes ou depois dos valores.

### Erro `auth/unauthorized-domain`

Adicione o domínio em:

```text
Firebase Authentication > Settings > Authorized domains
```

Use apenas o domínio, sem protocolo e sem porta.

### Erro `Missing or insufficient permissions`

- confirme que `firebase deploy --only firestore` foi executado;
- confirme que o usuário possui um documento em `users/{uid}`;
- confira `role`, `organizationId` e `active`;
- saia e entre novamente após alterar o perfil.

### O acesso esperado não aparece no seletor

- confira se o convite foi criado antes do primeiro acesso;
- confirme que o e-mail do convite é igual ao e-mail Google;
- verifique os documentos da coleção `managerInvites`;
- para acesso de Jogador, confirme que o cadastro possui exatamente o mesmo e-mail Google;
- recarregue a aplicação para que os vínculos sejam descobertos novamente.

### O jogador não foi vinculado

- cadastre o e-mail Google no perfil do jogador;
- confirme que o jogador pertence a uma equipe;
- saia e entre novamente.

### O navegador não libera a localização

- permita o acesso à localização;
- teste usando `localhost` ou HTTPS;
- no celular, confira se a localização do sistema está ligada;
- confira se o navegador possui permissão de localização.

### O Firestore solicita um índice

Execute novamente:

```bash
firebase deploy --only firestore
```

Os índices versionados estão em `firestore.indexes.json`.

## Segurança

- não faça commit de `.env`, `.env.local` ou Service Accounts;
- não coloque credenciais administrativas em variáveis `VITE_*`;
- não use regras públicas no Firestore;
- teste o seletor de acessos quando a mesma conta for Master, Gerenciador ou Jogador em mais de uma organização;
- revise os registros em `auditLogs`;
- mantenha `firestore.rules` versionado junto com o projeto.

## Status do projeto

O BABA MANAGER está em fase de MVP. Os fluxos principais estão implementados e prontos para testes com Firebase real.
