# Janu Turismo — versão 11

Nesta versão, a página inicial ganhou uma área dinâmica de **Eventos especiais**. A agência pode marcar uma viagem como especial no painel e definir até quando o destaque ficará ativo. O destaque usa o mesmo tamanho de card das demais viagens e desaparece automaticamente após a data definida. O bloco “Pedir ajuda no WhatsApp” foi removido da tela inicial. O acesso à conta continua usando abas separadas: **Entrar** e **Criar conta**.

Projeto Firebase Hosting + Authentication (e-mail/senha) + Cloud Firestore. O endereço público é um site adicional dentro do projeto `janu-turismo-e747f`, por exemplo `janu-turismo-ce.web.app`. Isso mantém contas e reservas anteriores no mesmo banco.

## Atualizar uma instalação existente

Baixe o ZIP completo da v10 e execute `aplicar-janu-v10.ps1` na pasta Downloads. O script copia somente `app.js` e `styles.css` para a instalação v9, preserva a configuração e as regras do Firebase, monta o site e publica no projeto existente `janu-turismo` da Vercel.

## Contas e reservas

- Para reservar, o cliente cria conta ou entra com e-mail e senha. O nome aparece no perfil. A aba Reservas consulta apenas as reservas associadas à conta.
- O botão de reservar fica inativo até a Janu configurar e liberar a capacidade real daquela viagem. Não há reserva fictícia.
- Ao concluir, as vagas diminuem numa transação do Firestore. O cliente vê o comprovante e pode enviar os dados pelo WhatsApp. Escolher Pix/cartão **não processa pagamentos**; a Janu confirma e combina a cobrança.
- Em `#/gestao`, a dona cadastra ou edita viagens, adiciona até quatro fotos, define preços/modalidades, locais, inclusões, pagamento, horários e avisos; também configura vagas, confirma/cancela e adiciona reservas feitas pelo WhatsApp.
- A reserva manual desconta vagas na mesma transação. Se a Janu preencher o e-mail de uma conta já cadastrada no site, a reserva aparece também em **Minhas reservas** desse cliente; caso contrário, fica no painel da agência sem vínculo de login. Para contas antigas, peça ao cliente que entre uma vez para registrar o perfil antes da reserva manual.

## Viagens

Os três passeios antigos permanecem e podem ser editados. Os campos opcionais são exibidos apenas quando informados. Os preços são opções com rótulo e quantidade de vagas (individual, casal, criança, quarto, cidade de embarque etc.). **Confira datas, preço, descrição e condições com a agência antes de liberar reservas reais**: os anúncios enviados servem de referência e alguns são de passeios passados.

As fotos escolhidas no painel são reduzidas pelo navegador e guardadas no documento da viagem no Firestore. Há limite de quatro fotos pequenas por passeio. Esta solução funciona no plano Spark, sem Firebase Storage; caso o catálogo cresça muito, migre as fotos para um serviço próprio de arquivos.

## Firebase

Ative Authentication → E-mail/senha, crie o banco Firestore `(default)` em modo Production e use as regras geradas pelo script com o UID da conta da agência. As regras preservam a leitura das reservas do próprio cliente e dão acesso à gestão apenas à conta da agência. **Não use regras de teste abertas**. O plano Spark possui limites de uso, sem garantia de capacidade ilimitada.

O login foi implementado no código, mas precisa ser confirmado no seu projeto real após a publicação: crie uma conta de teste, ative uma viagem com poucas vagas e faça uma reserva de teste, conferindo no painel da Janu e em Minhas reservas. Cancele o teste depois para devolver as vagas.
