# GaragemMelqueHW

PWA pessoal para catalogar Hot Wheels e outros carrinhos. Funciona offline, tira foto pelo celular, tenta ler o texto da embalagem no próprio navegador, avisa sobre modelos já cadastrados e permite pesquisar antes de comprar. Também exporta e importa backup em JSON.

## Decisão de arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| Interface | React + Vite + PWA | Instala na tela inicial e funciona offline. |
| Dados no aparelho | IndexedDB | Abre imediatamente, mesmo sem internet. |
| Sincronização opcional | Firebase Authentication + Cloud Firestore no plano Spark | Sem cartão, sem backend próprio e sem pausa automática por inatividade documentada para o Firestore. |
| Fotos | JPEG comprimido dentro do documento Firestore | Firebase Storage exige plano Blaze com cobrança habilitada; fotos pequenas cabem no limite de 1 MiB por documento. |
| Leitura da embalagem | Tesseract.js no navegador | Sem API paga. Sugestões precisam ser conferidas. |
| Hospedagem | GitHub Pages ou Vercel | Frontend estático gratuito para uso pessoal. |

**Limites reais:** o Firestore Spark oferece atualmente 1 GiB de dados, 50 mil leituras/dia e 20 mil gravações/dia. Em caso de limite atingido, a sincronização para até a quota voltar; o catálogo local continua disponível. Fotos comprimidas ocupam espaço nesse 1 GiB. O plano gratuito e suas condições podem mudar no futuro, por isso exporte backups periodicamente. Nenhum serviço online pode garantir disponibilidade eterna ou gratuidade futura. O app nunca troca automaticamente para um plano pago.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem Firebase, o app já funciona em modo local. Os dados ficam neste navegador/aparelho; limpar os dados do site pode apagá-los. Faça backup em **Configurações**.

### Testar no celular pela rede Wi-Fi

No Windows, descubra o IPv4 do adaptador Wi-Fi com `ipconfig`. Com computador e celular na mesma rede, rode:

```bash
npm run dev -- --host SEU_IP_LOCAL
```

Por exemplo, se o IPv4 for `192.168.15.25`, abra `http://192.168.15.25:5173/` no celular. Use a porta que o Vite mostrar no terminal caso a 5173 esteja ocupada. Se o Windows pedir acesso de rede para o Node.js, permita apenas em **redes privadas**. Não configure encaminhamento de porta no roteador.

Esse endereço HTTP serve para testar a interface. No celular ele não é `localhost`; portanto, o navegador não o trata como contexto seguro para instalar o PWA e usar service worker. Para testar instalação, use uma publicação HTTPS, como GitHub Pages ou Vercel. Sem Firebase configurado, os dados salvos no celular e no computador são coleções locais separadas.

## Ativar sincronização gratuita

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/) e mantenha o plano **Spark**. Não habilite faturamento.
2. Adicione um aplicativo Web ao projeto e copie `apiKey`, `authDomain`, `projectId` e `appId`.
3. Em **Authentication → Sign-in method**, habilite **E-mail/senha**. Em **Settings → Authorized domains**, adicione o domínio do seu GitHub Pages ou Vercel. Para desenvolvimento, adicione `localhost` se necessário.
4. Crie o **Cloud Firestore**. Em **Rules**, cole [firestore.rules](firestore.rules). **Nunca publique com regras de teste abertas.**
5. No Firestore, crie uma isenção de índice de campo único para `photo` no grupo de coleções `cars`, equivalente a [firestore.indexes.json](firestore.indexes.json). É recomendável para reduzir uso de armazenamento.
6. Copie `.env.example` para `.env.local` e preencha os quatro campos `VITE_FIREBASE_*`. Para rodar localmente, deixe `VITE_BASE_PATH=/`.
7. Reinicie `npm run dev`, abra **Configurações** e crie sua conta. A primeira sincronização combina os registros locais com os da nuvem. Use a mesma conta em outro aparelho.

As variáveis `VITE_` aparecem no código público por definição. A proteção dos dados depende das regras do Firestore e da autenticação, nunca de manter essas chaves escondidas.

### Publicar no GitHub Pages

1. Envie o repositório para o GitHub como **repositório público**, com a branch principal chamada `main` ou `master`. O GitHub Pages no plano GitHub Free exige repositório público; o código será público, mas os dados da coleção ficam protegidos pelo Firebase Authentication e pelas regras do Firestore.
2. Em **Settings → Pages**, selecione **GitHub Actions** como origem.
3. Em **Settings → Secrets and variables → Actions → Variables**, crie as quatro variáveis `VITE_FIREBASE_*` se quiser sincronização. O workflow já define `VITE_BASE_PATH` conforme o nome do repositório.
4. Envie um commit para `main` ou `master`. O workflow publica `dist` automaticamente.
5. Acrescente `SEU_USUARIO.github.io` aos domínios autorizados no Firebase Authentication.

O endereço será `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`.

### Publicar na Vercel

Importe o repositório como projeto Vite. Build: `npm run build`. Output: `dist`. Configure as quatro variáveis `VITE_FIREBASE_*` no projeto e `VITE_BASE_PATH=/`. Acrescente o domínio Vercel aos domínios autorizados no Firebase Authentication.

## Instalar no celular

Abra o endereço HTTPS no celular. No Android/Chrome, use **Instalar app** ou **Adicionar à tela inicial**. No iPhone/Safari, use **Compartilhar → Adicionar à Tela de Início**. O primeiro acesso precisa de internet para carregar a aplicação. A leitura OCR também pode precisar baixar arquivos de idioma na primeira vez; o cadastro manual segue disponível offline.

## Como o app evita repetidos

- A aba **Conferir** foi feita para a consulta rápida na loja: mostra quantas unidades relacionadas você já possui, além de ano, cor e estado para comparar a variação.
- A pesquisa ignora maiúsculas e acentos e entende `Porche` como `Porsche`.
- O formulário alerta quando o mesmo nome de modelo já existe, mostrando ano e cor para conferir variações.
- A quantidade guarda exemplares repetidos sem exigir vários cadastros.
- **Identificar pela foto** lê a foto da embalagem; **Fotografar nome de perto** usa uma segunda imagem só para reconhecimento, sem guardá-la. Enquadre o nome impresso ou o código Mattel de cinco caracteres com boa luz.
- A leitura apresenta apenas sugestões legíveis de modelo e código. O ano só é sugerido se a própria imagem o identificar explicitamente como ano da edição; datas soltas e copyright são ignoradas. Você confirma cada campo antes de aplicá-lo.
- Quando o código lido já está na sua garagem e aponta para um único modelo, o app oferece preencher com os dados desse cadastro. A cor permanece para você conferir, pois pode haver variação.
- A foto abre inteira ao tocar na prévia do cadastro ou na imagem dos detalhes. Ao escolher uma foto nova, a leitura de texto usa o arquivo original; a cópia compactada é usada para armazenar e sincronizar.
- No celular, os campos usam tamanho de texto adequado para evitar o zoom automático ao focar no iPhone; o formulário mantém as ações acessíveis e respeita as áreas seguras da tela.

## Código de barras e identificação

Ler o UPC/EAN da embalagem é tecnicamente possível, mas não é suficiente para preencher o modelo de todo Hot Wheels: [carrinhos básicos do mesmo sortimento podem compartilhar o UPC](https://help.hobbydb.com/support/solutions/articles/36000262106-upc-codes). O número impresso perto do código de barras identifica o produto ou sortimento; ele não contém o nome do carrinho em seus dígitos. Por isso, preencher o modelo automaticamente apenas com o UPC poderia cadastrar o veículo errado.

O campo **Código do modelo (SKU)** guarda o código alfanumérico impresso na embalagem, que costuma ser mais útil para diferenciar versões. A [hobbyDB recomenda o número de produto Mattel no cartão](https://help.hobbydb.com/support/solutions/articles/36000580147-model-cars) para identificar lançamentos. O app tenta ler esse código pela foto e o compara com a sua coleção local. Sem uma base de produtos completa e gratuita, não há como garantir o preenchimento de um modelo novo apenas pelo código.

## Referências de produto

- [Hot Wheels Showcase](https://mattelsupport.com/en-us/faqs/hot-wheels-showcase/): identificação por foto e coleção; a versão gratuita tem limites de uso.
- [iCollect Toy Cars](https://www.icollecteverything.com/toy-cars/): busca, código de barras, filtros, fotos e backup; coleções grandes exigem compra no app.

A diferença aqui é priorizar a consulta rápida antes da compra, cadastro sem depender de um banco mundial de miniaturas, acesso offline, backup aberto e operação pessoal sem assinatura.

## Observações técnicas

- Cada registro sincronizado inclui uma foto JPEG comprimida. O código limita seu tamanho para ficar abaixo do máximo por documento do Firestore.
- A sincronização usa a data de última edição; se o mesmo carrinho for editado simultaneamente em dois aparelhos, a edição mais recente vence.
- Exclusões são salvas como marcadores para impedir que um registro apagado volte na próxima sincronização.
- O OCR lê texto e pode confundir caracteres ou variações do modelo. Compare cada sugestão com a foto antes de aplicá-la e revise o formulário antes de salvar.
