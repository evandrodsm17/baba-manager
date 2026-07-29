# BABA MANAGER

Sistema web para organizar futebol amador: equipes, jogadores, partidas, ligas, estatísticas, disciplina e check-in com geolocalização.

Construído com React, TypeScript, Vite, Firebase Authentication e Cloud Firestore.

## Funcionalidades

- autenticação com conta Google;
- acessos acumuláveis de Master, Gerenciador e Jogador na mesma conta Google;
- troca de contexto entre organizações e times pelo menu do perfil;
- organizações isoladas por `organizationId`;
- equipes com nome, sigla, cor, escudo por URL e elenco listado no card;
- jogadores com foto, apelido, e-mail, posições, número da camisa e equipe opcional;
- classificação opcional de jogadores como mensalistas ou convidados;
- módulo financeiro com mensalidades, cobranças avulsas, recebimentos, despesas e saldo realizado;
- locais com coordenadas e raio autorizado para check-in;
- partidas agendadas, ao vivo e finalizadas;
- partidas entre equipes fixas ou com times temporários sorteados entre os jogadores selecionados;
- circuitos de babas sorteados, com histórico público e rankings individuais sem classificação de times temporários;
- convocação editável em partidas sorteadas, com substituição de ausentes e preservação da ordem dos check-ins;
- regra financeira opcional por partida, com liberação excepcional justificada pelo gerenciador;
- relação de convocados e respostas visível aos jogadores participantes;
- súmula editável com gols, assistências, cartões e gol contra;
- placar calculado automaticamente pelos eventos de gol;
- finalização com bloqueio da súmula e reabertura controlada pelo gerenciador;
- declaração de gols e assistências pelo jogador, com aprovação do gerenciador;
- painel do jogador priorizando convites pendentes e próximas partidas confirmadas;
- área **Meu desempenho** com histórico, gols, assistências, cartões e destaques;
- até três destaques positivos ou negativos por partida, sempre com justificativa;
- ligas com imagem por URL, classificação, artilharia e controle disciplinar;
- página pública opcional por liga, acessível sem login e pronta para compartilhamento;
- página inicial pública com apresentação do produto e catálogo das ligas publicadas;
- check-in pelo GPS do celular, com janela configurável por partida;
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
6. Crie uma liga e escolha o formato **Equipes fixas** ou **Babas sorteados**. Se desejar, informe a URL de uma imagem de capa. Uma liga existente pode ser atualizada com **Editar liga**.
7. Agende uma partida entre equipes fixas ou escolha **Times sorteados**, informe o limite por equipe e selecione ao menos dois goleiros entre os participantes. Jogadores sem equipe também podem ser selecionados.
8. Mantenha **Solicitar confirmação antecipada** ativado e informe o prazo para os jogadores responderem.
9. Escolha, se desejar, uma **Regra financeira da partida**. Ela é aplicada somente aos mensalistas.
10. Abra a partida para acompanhar confirmados, fila de espera, respostas “Talvez”, ausências e jogadores que ainda não responderam.
11. Use **Editar convocados** para retirar um ausente ou incluir um substituto. O atalho **Convidar substituto** já abre a lista sem o jogador que respondeu “Não vou”.
12. Use **Copiar lembrete** para enviar a convocação no grupo do baba. O link direciona o jogador autenticado para a área **Presença**.
13. Abra a partida e adicione os gols como eventos da súmula; autor e assistência são opcionais.
14. Use **Gol contra** quando necessário, informando como beneficiada a equipe que recebe o ponto.
15. Edite ou remova eventos enquanto a partida estiver aberta e confira o placar calculado.
16. Clique em **Finalizar partida** para bloquear a súmula. Para corrigir algo depois, use **Reabrir partida**.
17. Em **Destaques**, escolha opcionalmente de um a três jogadores, marque o destaque como positivo ou negativo e informe a justificativa.
18. Em **Ligas**, use **Publicar liga** para gerar a página externa e copie o link exibido.

Para permitir o login de um jogador, preencha no cadastro dele o mesmo e-mail que será utilizado no Google. A equipe é opcional: deixe o campo vazio quando o atleta participar somente de jogos com times sorteados.

No formato **Times sorteados**, os jogadores podem ser escolhidos de qualquer equipe da organização. O vínculo com a equipe original não é alterado: os dois times existem somente naquela partida e podem receber nomes e cores próprios para representar os coletes utilizados. A confirmação “Vou” reserva uma vaga até o limite configurado; quem exceder o limite entra na fila de espera e é promovido automaticamente quando houver desistência. Mensalistas e jogadores sem classificação ficam antes dos convidados. Depois, a primeira formação respeita a ordem dos check-ins validados, novamente mantendo convidados depois dos demais. O sistema reserva um goleiro para cada equipe e somente forma os times depois que dois jogadores da posição confirmarem presença e fizerem check-in.

O gerenciador pode usar **Editar convocados** enquanto a partida estiver agendada. Ao remover alguém, o sistema informa quantas respostas e quantos check-ins serão excluídos; os novos convidados são acrescentados ao fim da ordem do sorteio e os check-ins dos demais permanecem intactos. Ainda é obrigatório manter ao menos dois goleiros na convocação. O gerenciador também pode usar **Personalizar times** para corrigir nomes e cores sem alterar a escalação ou a súmula e **Refazer distribuição** sem alterar a prioridade da fila. Quando a súmula começa, a composição é salva e fica bloqueada. Esse formato é tratado como amistoso e não entra automaticamente na classificação de uma liga.

Para agrupar e publicar esses jogos, crie em **Ligas → Nova liga** uma competição no formato **Babas sorteados**. Ao agendar o baba, selecione o circuito no campo opcional correspondente. Partidas já cadastradas também podem ser incluídas ou transferidas usando **Organizar em liga** nos detalhes da partida. Como os nomes e as cores dos coletes podem mudar a cada rodada, esse formato não cria tabela por equipes: a página pública apresenta o histórico, as súmulas, os destaques, a artilharia, o ranking de assistências, os cartões e a relação de jogadores do circuito.

Se um jogador estiver sem celular ou internet, o gerenciador pode usar **Confirmar check-in** na relação de jogadores da partida. Esse registro manual ignora a exigência de geolocalização, utiliza o horário em que o gerenciador confirmou a presença e fica identificado no sistema para auditoria. Ele continua limitado à janela de check-in da partida, que usa 30 minutos antes e 20 minutos depois como padrão e pode ser alterada em **Configurar check-in**. Se a escalação do sorteio já estiver fechada, o jogador será incluído na fila de espera sem alterar os times.

O gerenciador também pode excluir individualmente partidas, equipes, jogadores, ligas, locais e lançamentos financeiros. Toda exclusão apresenta primeiro as dependências afetadas e exige que a palavra **EXCLUIR** seja digitada. Em **Configurações → Limpar todos os dados**, a confirmação **LIMPAR TUDO** remove de uma só vez os conteúdos da organização, incluindo confirmações, check-ins e estatísticas, mas preserva a organização, os acessos dos gerenciadores e o histórico de auditoria. A limpeza consulta diretamente as publicações da organização e remove também páginas de liga órfãs e suas partidas publicadas. Mesmo quando o painel indicar zero registros internos, use **Verificar resíduos públicos** para reconciliar eventuais publicações antigas.

Em **Jogadores**, o campo **Tipo de participação** permite identificar opcionalmente mensalistas e convidados. Essa classificação também aparece na seleção do sorteio e pode ser usada como filtro na listagem.

### Módulo financeiro

O menu **Financeiro** fica disponível para o gerenciador da organização e não é exibido nas páginas públicas. Para iniciar:

1. Abra **Financeiro** e clique em **Configurar**.
2. Informe o valor padrão da mensalidade e o dia de vencimento.
3. Confirme quais jogadores estão classificados como **Mensalista** no cadastro de jogadores.
4. Selecione a competência e use **Gerar mensalidades**.
5. Registre os recebimentos informando data e forma de pagamento.
6. Use **Nova cobrança** para convidados ou valores avulsos.
7. Cadastre custos em **Nova despesa**, como local, arbitragem ou materiais.

A geração mensal não duplica uma cobrança ativa para o mesmo jogador e competência. O painel apresenta valores previstos, recebidos, atrasados, despesas pagas e saldo realizado. Recebimentos e pagamentos podem ser estornados, e lançamentos incorretos podem ser cancelados sem apagar o histórico.

Em cada partida, a regra financeira pode permanecer desativada, exigir que não exista mensalidade vencida ou exigir que a competência do mês da partida esteja paga. A validação ocorre ao responder **Vou** e no check-in. Convidados e jogadores sem classificação financeira não são bloqueados. O gerenciador pode conceder uma liberação excepcional com justificativa; a ação fica registrada para auditoria, mas o motivo e a situação financeira individual não aparecem para os demais jogadores.

O autor do gol nunca pode ser selecionado também como autor da assistência. Em gols contra, o autor opcional pertence à equipe adversária da equipe beneficiada. O gol contra altera o placar, mas não entra na artilharia do jogador.

### Página pública da liga

A página inicial pública do produto fica disponível em:

```text
/
```

Ela explica como o BABA MANAGER funciona, apresenta seus principais recursos e lista as ligas que foram publicadas. A autenticação é acessada pela navbar em:

```text
/login
```

Depois do login, o usuário é encaminhado para a área de gerenciamento:

```text
/painel
```

Cada liga pode ser publicada ou desativada individualmente pelo gerenciador. Sua imagem por URL é exibida na página inicial, na listagem pública e no cabeçalho da própria liga. A página pública utiliza o endereço:

```text
/liga/ID_DA_LIGA
```

A listagem geral fica disponível em:

```text
/ligas-publicas
```

Nas ligas tradicionais, ela apresenta classificação, jogos agendados e finalizados, placares, eventos da súmula, destaques justificados, artilharia, ranking de assistências, cartões, equipes e elencos. Ligas no formato **Babas sorteados** substituem a classificação por um resumo do circuito e acumulam as estatísticas individuais, mantendo em cada partida os times temporários usados naquele dia. A publicação utiliza uma cópia sanitizada: e-mails, check-ins, coordenadas e dados administrativos não são expostos.

#### Teste do Jogador

1. Entre com o e-mail Google cadastrado no jogador ou abra o menu do perfil.
2. Selecione o acesso **Jogador** e o vínculo desejado.
3. No painel, responda primeiro aos convites pendentes; logo abaixo ficam as próximas partidas já confirmadas.
4. Abra **Presença**.
5. Responda **Vou**, **Talvez** ou **Não vou** antes do prazo informado.
6. Se as vagas estiverem preenchidas, acompanhe sua posição na fila de espera. A promoção acontece automaticamente quando alguém desiste.
7. Abra os detalhes da partida para consultar todos os convocados e identificar quem confirmou, está na fila, respondeu “Talvez”, não irá ou ainda não respondeu.
8. Quando estiver com a vaga confirmada, financeiramente liberado e dentro da janela permitida, faça o check-in e autorize o acesso à localização do navegador se a partida exigir.
9. Consulte **Meu desempenho** para ver partidas, gols, assistências, cartões e destaques recebidos.
10. Em uma partida finalizada em que participou, envie seus gols e assistências.
11. Volte ao acesso **Gerenciador** para aprovar ou recusar a declaração. Como uma aprovação altera a súmula oficial, reabra antes uma partida já finalizada.

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
| `leagues` | Ligas de equipes ou circuitos de babas sorteados, publicação e regras disciplinares |
| `matches` | Partidas, placares e súmulas |
| `matchConfirmations` | Respostas “Vou”, “Talvez” e “Não vou”, incluindo registros feitos pelo gerenciador |
| `checkins` | Presenças validadas |
| `statSubmissions` | Gols e assistências declarados pelos jogadores e seu status de aprovação |
| `financialSettings` | Valor padrão, vencimento e ativação do controle mensal |
| `financialCharges` | Mensalidades, cobranças avulsas e recebimentos |
| `financialStatuses` | Resumo de elegibilidade financeira usado nas confirmações e check-ins |
| `financialWaivers` | Liberações excepcionais por partida, com justificativa restrita à gestão |
| `financialExpenses` | Despesas, pagamentos e custos da organização |
| `publicLeagues` | Cópias sanitizadas das ligas publicadas e suas partidas |
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
- confirme que o jogador pertence à organização; a equipe só é necessária para confrontos entre equipes fixas;
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
