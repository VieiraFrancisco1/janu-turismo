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

A Home filtra viagens passadas pelas datas reais, permite escolher a cidade de embarque e mostra os próximos passeios em carrossel. A página da viagem calcula o total, mostra condições de Pix/cartão e abre o WhatsApp com a mensagem pronta.

O painel `#/gestao` permite editar viagens, vagas e reservas, além de listar passageiros agrupados por embarque, copiar a lista, baixar CSV e abrir uma cobrança de saldo pelo WhatsApp.

Dados provisórios ou ainda não validados devem permanecer marcados como **[CONFIRMAR]**.

### Cadastro com nome e senha

O cadastro solicita apenas nome de acesso e senha. O nome deve ser único; diferenças de maiúsculas e espaços extras são normalizadas. O login aceita esse nome e mantém o acesso por e-mail para contas antigas e por Google.

`account-name.js` deriva um identificador interno estável do nome. A senha continua sendo administrada exclusivamente pelo Firebase Authentication; ela não é armazenada em documentos do Firestore. O campo interno `profiles.email` corresponde ao identificador do token para manter a compatibilidade com as regras existentes, e as telas exibem o nome de acesso.

Contas criadas sem endereço de e-mail não oferecem recuperação automática por e-mail. O botão de recuperação informa essa limitação. A configuração pública em `firebase-config.js` corresponde ao aplicativo do site oficial; nenhuma chave administrativa está incluída.

### Galeria de fotos das viagens

`photo-gallery.js` usa as fotos cadastradas no catálogo de cada destino. Com mais de uma imagem, o carrossel alterna a cada cinco segundos e oferece controles, pausa e navegação por gesto. “Explorar fotos” abre a galeria em tela cheia, com miniaturas e navegação pelo teclado. Uma viagem com apenas uma imagem mantém a foto estática e permite ampliá-la. A preferência por movimento reduzido desativa a troca automática.
