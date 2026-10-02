# Janu Turismo — versão 12

Site da Janu Turismo em JavaScript puro, com rotas por hash, Firebase Authentication, Cloud Firestore e build com esbuild. A publicação oficial é feita pelo Firebase Hosting.

## Estrutura

- `app.js`: interface, rotas, viagens, reservas e painel `#/gestao`.
- `data.js`: integração com Firebase Auth e Firestore.
- `catalogo.js`: catálogo-base e compatibilidade dos dados de viagem.
- `assets/`: logo e fotos otimizadas.
- `firestore.rules.template`: modelo das regras de segurança. Não altere a estrutura permitida de `trip_inventory`.

## Build e publicação

Instale as dependências e gere o site:

```powershell
npm install
npm run build
```

Para publicar no Firebase Hosting:

```powershell
npx firebase login
npx firebase deploy --only hosting
```

O build é gerado em `dist/`. A pasta `assets/` é copiada integralmente para o build.

## Firebase Authentication

Ative **E-mail/senha** em Firebase Console → Authentication → Sign-in method.

O site também possui **Entrar com Google**. Para usar esse botão, ative o provedor **Google** no mesmo local do Firebase Console.

Há recuperação de senha por e-mail com `sendPasswordResetEmail`.

## Firestore

O catálogo usa `trip_catalog` e aceita os campos adicionais de viagem. O inventário usa `trip_inventory` somente para capacidade e controle de vagas conforme as regras existentes.

Não use regras abertas de teste e não altere `firestore.rules.template` sem revisar o impacto nas reservas e no painel.

## Viagens e reservas

A Home filtra viagens passadas pelas datas reais, mostra os próximos passeios em carrossel. A página da viagem calcula o total, mostra condições de Pix/cartão e salva a reserva na conta antes de oferecer a continuação pelo WhatsApp.

O painel `#/gestao` permite editar viagens, vagas e reservas, além de listar passageiros agrupados por embarque, copiar a lista, baixar CSV e conversar com o cliente pelo WhatsApp.

Dados provisórios ou ainda não validados devem permanecer marcados como **[CONFIRMAR]**.

### Cadastro com nome e senha

O cadastro solicita apenas nome de acesso e senha. O nome deve ser único; diferenças de maiúsculas e espaços extras são normalizadas. O login aceita esse nome e mantém o acesso por e-mail para contas antigas e por Google.

`account-name.js` deriva um identificador interno estável do nome. A senha continua sendo administrada exclusivamente pelo Firebase Authentication; ela não é armazenada em documentos do Firestore. O campo interno `profiles.email` corresponde ao identificador do token para manter a compatibilidade com as regras existentes, e as telas exibem o nome de acesso.

Contas criadas sem endereço de e-mail não oferecem recuperação automática por e-mail. O botão de recuperação informa essa limitação. A configuração pública em `firebase-config.js` corresponde ao aplicativo do site oficial; nenhuma chave administrativa está incluída.

### Galeria de fotos das viagens

`photo-gallery.js` usa as fotos cadastradas no catálogo de cada destino. Com mais de uma imagem, o carrossel alterna a cada cinco segundos e oferece controles, pausa e navegação por gesto. “Explorar fotos” abre a galeria em tela cheia, com miniaturas e navegação pelo teclado. Uma viagem com apenas uma imagem mantém a foto estática e permite ampliá-la. A preferência por movimento reduzido desativa a troca automática.

### Reservas persistentes

O cliente escolhe opção, quantidade e embarque, preenche seus dados e entra ou cria uma conta sem perder o formulário. O pedido é salvo em `bookings` antes de exibir a confirmação. `Minhas reservas` e o detalhe acompanham alterações de status em tempo real.

Cada reserva guarda destino, data, opção, quantidade, passageiros e valor em centavos. O Firestore valida preço, embarque e quantidade contra o catálogo da agência. Um identificador reutilizado em tentativas de envio impede criar uma segunda reserva quando há falha de conexão. Nenhum dado pessoal é salvo em sessionStorage, apenas esse identificador.

Sem capacidade configurada, o pedido fica pendente da disponibilidade; não inventa vagas nem confirma pagamento. Com capacidade real liberada, a transação separa lugares sem exceder o limite. Viagens pausadas, esgotadas ou encerradas bloqueiam pedidos novos. Em `#/gestao`, a conta já autorizada pode configurar capacidade, confirmar disponibilidade e pagamento recebido ou cancelar. A confirmação de um pedido sem lugares separados exige capacidade real suficiente; o cancelamento devolve os lugares apenas uma vez.

O valor registrado é o do pacote, sem eventual acréscimo de cartão. Pix/cartão são combinados com a Janu; o site não realiza cobrança automática. O link da reserva continua protegido pela conta do responsável e não expõe documentos a terceiros.

### Publicação e verificação das reservas

O GitHub Actions usa Node 22 e o secret existente `FIREBASE_SERVICE_ACCOUNT`. Antes da publicação, testa regras e transações no Firestore Emulator. O script `scripts/firebase-backend.mjs` preserva a conta da agência nas regras ativas, cadastra viagens iniciais ausentes e migra somente os campos de validação de viagens existentes. Não sobrescreve preços, fotos ou capacidade real.

As regras são compiladas e publicadas pela API oficial do Firebase; o CLI publica o Hosting. A credencial existente não precisa consultar ou ativar serviços no Google Cloud. `scripts/verify-reservations-live.mjs` verifica gravação, novo login, repetição segura e isolamento entre contas no Firebase real usando dados temporários. Esses dados e contas são removidos ao fim. Se todas as viagens tiverem capacidade real configurada, o teste real de escrita é dispensado para não ocupar vagas; os testes no emulador continuam obrigatórios.

Para testar localmente (Node 22 e Java 21):

```powershell
npx --yes firebase-tools@14.17.0 emulators:exec --project demo-janu --only firestore --config firebase.emulators.json "npm run test:reservas"
```

As regras publicadas continuam fechadas para leitura pública de reservas e perfis. Nunca publique o antigo arquivo de regras de negação total nem regras abertas. Para publicação manual desta versão no projeto oficial, use `npx firebase deploy --only firestore:rules,hosting --project janu-turismo-e747f`.
