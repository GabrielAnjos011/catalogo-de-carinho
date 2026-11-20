# GaragemMelqueHW

PWA pessoal para catalogar Hot Wheels e outros carrinhos. Funciona offline, tira foto pelo celular, tenta ler o texto da embalagem no próprio navegador, avisa sobre modelos já cadastrados e permite pesquisar antes de comprar. Também exporta e importa backup em JSON.

## Decisão de arquitetura

| Camada | Escolha | Por quê |
|---|---|---|
| Interface | React + Vite + PWA | Instala na tela inicial e funciona offline. |
| Dados no aparelho | IndexedDB separado por conta | Depois do primeiro acesso aprovado, a coleção abre mesmo sem internet e não se mistura com a de outra conta no mesmo aparelho. |
| Acesso e sincronização | Firebase Authentication + Cloud Firestore no plano Spark | Entrada apenas com conta aprovada, sem backend próprio e sem pausa automática por inatividade documentada para o Firestore. |
| Fotos | Frente e verso em JPEG comprimido dentro do documento Firestore | Firebase Storage exige plano Blaze com cobrança habilitada; as duas fotos pequenas cabem no limite de 1 MiB por documento. |
| Biblioteca de lançamentos | Dados da Hot Wheels Wiki incluídos no PWA | Busca gratuita e disponível offline, com fonte e versão exibidas no app. |
| Leitura da embalagem | Tesseract.js no navegador; Firebase AI Logic opcional | OCR local sem custo. A análise com Gemini exige configuração do App Check e internet; sugestões precisam ser conferidas. |
| Hospedagem | GitHub Pages ou Vercel | Frontend estático gratuito para uso pessoal. |

**Limites reais:** o Firestore Spark oferece atualmente 1 GiB de dados, 50 mil leituras/dia e 20 mil gravações/dia. Em caso de limite atingido, a sincronização para até a quota voltar; o catálogo local continua disponível. Fotos comprimidas ocupam espaço nesse 1 GiB. O plano gratuito e suas condições podem mudar no futuro, por isso exporte backups periodicamente. Nenhum serviço online pode garantir disponibilidade eterna ou gratuidade futura. O app nunca troca automaticamente para um plano pago.

## Rodar localmente

```bash
npm install
npm run dev
```

Durante o desenvolvimento (`npm run dev`), o app ainda pode funcionar em modo local sem Firebase. A versão publicada exige Firebase configurado para mostrar a coleção. Limpar os dados do site pode apagar a cópia local; faça backup em **Configurações**.

### Testar no celular pela rede Wi-Fi

No Windows, descubra o IPv4 do adaptador Wi-Fi com `ipconfig`. Com computador e celular na mesma rede, rode:

```bash
npm run dev -- --host SEU_IP_LOCAL
```

Por exemplo, se o IPv4 for `192.168.15.25`, abra `http://192.168.15.25:5173/` no celular. Use a porta que o Vite mostrar no terminal caso a 5173 esteja ocupada. Se o Windows pedir acesso de rede para o Node.js, permita apenas em **redes privadas**. Não configure encaminhamento de porta no roteador.

Esse endereço HTTP serve para testar a interface. No celular ele não é `localhost`; portanto, o navegador não o trata como contexto seguro para instalar o PWA e usar service worker. Para testar instalação, use uma publicação HTTPS, como GitHub Pages ou Vercel. Sem Firebase configurado, os dados salvos no celular e no computador são coleções locais separadas.

## Configurar acesso por aprovação e sincronização gratuita

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/) e mantenha o plano **Spark**. Não habilite faturamento.
2. Adicione um aplicativo Web ao projeto e copie `apiKey`, `authDomain`, `projectId` e `appId`.
3. Em **Authentication → Sign-in method**, habilite **E-mail/senha**. Em **Settings → Authorized domains**, adicione o domínio do seu GitHub Pages ou Vercel. Para desenvolvimento, adicione `localhost` se necessário.
4. Crie o **Cloud Firestore**. Em **Rules**, cole [firestore.rules](firestore.rules). **Nunca publique com regras de teste abertas.** Essas regras só liberam os dados de contas aprovadas.
5. No Firestore, crie uma isenção de índice de campo único para `photo` no grupo de coleções `cars`, equivalente a [firestore.indexes.json](firestore.indexes.json). É recomendável para reduzir uso de armazenamento.
6. Copie `.env.example` para `.env.local` e preencha os quatro campos `VITE_FIREBASE_*`. Para rodar localmente, deixe `VITE_BASE_PATH=/`.
7. Em **Authentication → Users**, use **Adicionar usuário** para criar sua conta com e-mail e senha. Se a conta já existe, mantenha-a. Copie o **UID** mostrado nessa lista.
8. Em **Cloud Firestore → Data**, crie a coleção `approvedUsers`. Crie um documento cujo **ID é exatamente o UID** copiado. Adicione o campo `active` do tipo **boolean** com valor `true`. Repita para cada pessoa aprovada.
9. Abra o app e entre com a conta aprovada. O app não oferece criação de contas. A primeira entrada nesse aparelho transfere os registros locais antigos para a primeira conta aprovada e sincroniza a coleção. As contas seguintes usam cópias locais separadas.

Se o app já está publicado, aprove **seu próprio UID antes de publicar as regras novas**. Sem o documento de aprovação, até a conta antiga deixa de acessar a coleção na nuvem.

Para revogar o acesso, altere `approvedUsers/{UID}.active` para `false` e, se desejar, desative a conta em **Authentication → Users**. A revogação bloqueia novas operações online pelas regras do Firestore. Um aparelho que já abriu a coleção pode manter uma cópia local disponível offline até se reconectar.

**Importante:** retirar o botão de cadastro impede a criação pelo app, mas o Firebase Authentication com e-mail/senha ainda expõe uma API pública de cadastro. Uma conta criada diretamente por essa API não passa pela aprovação e não consegue acessar os dados. Para impedir até a criação do registro no Authentication, o Firebase exige recursos de bloqueio do Identity Platform, fora desta arquitetura gratuita.

As variáveis `VITE_` aparecem no código público por definição. A proteção dos dados depende das regras do Firestore e da autenticação, nunca de manter essas chaves escondidas.

### Ativar análise opcional por IA

O botão **Analisar com IA gratuita** usa o SDK Web do **Firebase AI Logic** com o Gemini Developer API. Mantém o app estático, sem backend próprio. A chave padrão de configuração do Firebase e a chave de *site* do reCAPTCHA Enterprise são públicas. **Não crie uma chave da Gemini API para colocar em `VITE_`, em GitHub Variables ou em Secrets usados no build**: qualquer segredo incluído no build Vite fica acessível no navegador. O SDK Firebase AI Logic usa a integração gerenciada pelo Firebase.

1. No Firebase Console, com o projeto ainda no plano **Spark** e sem faturamento, abra **AI Logic → Começar** e selecione **Gemini Developer API**. Conclua a configuração guiada e confirme que o modelo `gemini-3.5-flash-lite` está disponível para o projeto. Não escolha a API Vertex/Agent Platform, que requer faturamento.
2. Em **App Check**, registre o aplicativo Web com **reCAPTCHA Enterprise**. Configure os domínios do site publicado e copie a **site key** pública para `VITE_FIREBASE_APPCHECK_SITE_KEY` no `.env.local`. Para GitHub Pages, crie também uma variável de Actions com o mesmo nome; o workflow já a usa. Na Vercel, adicione a variável ao projeto.
3. Para testar no computador via `localhost`, acrescente `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true` **somente** ao `.env.local`, reinicie `npm run dev` e abra o console do navegador. Copie o token de depuração exibido e cadastre-o em **App Check → Apps → Gerenciar tokens de depuração**. Esse token é privado: nunca o envie ao GitHub. Cada navegador/aparelho de teste usa seu próprio token. Não acrescente `localhost` aos domínios permitidos do reCAPTCHA para contornar o App Check.
4. No celular pela rede local, cada navegador gera seu próprio token de depuração. É preciso lê-lo com a depuração remota do navegador e cadastrá-lo no App Check. Para um teste mais simples da IA e da experiência PWA completa, use a URL HTTPS publicada, com o domínio cadastrado na chave reCAPTCHA. Não coloque um token de depuração fixo nas variáveis de publicação.

Após isso, fotografe frente e verso e toque em **Analisar com IA gratuita**. As fotos são enviadas ao Google para análise; o app só sugere os campos e pede que você confirme a versão da biblioteca. A leitura local e a digitação do código continuam disponíveis. O limite gratuito pode resultar em erro de quota e a precisão varia com a foto; o app não promete 99% de acerto. A análise opcional não é ativada sem a site key.

### Publicar no GitHub Pages

1. Envie o repositório para o GitHub como **repositório público**, com a branch principal chamada `main` ou `master`. O GitHub Pages no plano GitHub Free exige repositório público; o código será público, mas os dados da coleção ficam protegidos pelo Firebase Authentication e pelas regras do Firestore.
2. Em **Settings → Pages**, selecione **GitHub Actions** como origem.
3. Em **Settings → Secrets and variables → Actions → Variables**, crie as quatro variáveis `VITE_FIREBASE_*`. Elas são obrigatórias na versão publicada, pois o app exige login. O workflow já define `VITE_BASE_PATH` conforme o nome do repositório.
4. Envie um commit para `main` ou `master`. O workflow publica `dist` automaticamente.
5. Acrescente `SEU_USUARIO.github.io` aos domínios autorizados no Firebase Authentication.

O endereço será `https://SEU_USUARIO.github.io/NOME_DO_REPOSITORIO/`. Antes de publicar esta versão, aprove seu UID em `approvedUsers` e publique as regras atualizadas de [firestore.rules](firestore.rules); caso contrário, o login não terá acesso à coleção.

### Publicar na Vercel

Importe o repositório como projeto Vite. Build: `npm run build`. Output: `dist`. Configure as quatro variáveis `VITE_FIREBASE_*` no projeto e `VITE_BASE_PATH=/`. Acrescente o domínio Vercel aos domínios autorizados no Firebase Authentication.

## Instalar no celular

Abra o endereço HTTPS no celular. No Android/Chrome, use **Instalar app** ou **Adicionar à tela inicial**. No iPhone/Safari, use **Compartilhar → Adicionar à Tela de Início**. O primeiro acesso precisa de internet para carregar a aplicação. Os arquivos do OCR vêm do mesmo endereço do PWA e são guardados após o primeiro uso; para ler fotos sem rede, faça uma leitura inicial enquanto estiver conectado.

## Explorar e cadastrar rápido

- **Explorar** reúne a busca na sua coleção e uma biblioteca de **4.284 lançamentos Mainline de 2017 a 2026**. Pesquise por parte do nome, como `Porche 911`, ou pelo código de cinco caracteres da embalagem. O filtro de ano inclui todas essas edições.
- **Adicionar** abre o cadastro inteligente. Digite o código Mattel de cinco caracteres para escolher o lançamento sem fotografar, ou fotografe frente e verso e toque em **Identificar pelas fotos**. O app lê a faixa do nome e o topo do verso, mostra as possíveis versões e pede que você confirme a correta. As fotos acompanham o cadastro rápido. Se não encontrar, continue no formulário manual.
- Um cartão cinza significa que aquela versão ainda não foi vinculada à sua coleção. Ao cadastrá-la, sua foto aparece no cartão e o estado muda para **Tenho**. Variações de cor ou embalagem podem ser registradas separadamente.
- Ao escolher um lançamento, o cadastro rápido já traz nome, série, ano da lista e código. Compare o código com a embalagem; depois informe foto, cor, quantidade e estado. Local e observações são opcionais.
- Caso não encontre o carrinho, use **Cadastrar sem escolher da biblioteca**. Esse caminho também aceita miniaturas de outras marcas e anos.
- Os dados da biblioteca vêm das listas anuais da [Hot Wheels Wiki](https://hotwheels.fandom.com/wiki/List_of_Hot_Wheels), adaptados sob CC BY-SA. Cada lançamento traz um link para sua lista de origem. Nenhuma foto de terceiros foi incorporada. A biblioteca ainda não abrange todas as linhas ou anos; os anteriores a 2017 têm formatos diferentes e exigem uma importação própria para evitar dados incorretos.

Para atualizar a biblioteca a partir das listas públicas, execute `npm run catalog:refresh` e revise os dados gerados em `src/catalog-data.json` antes de publicar. O script depende da estrutura atual dessas páginas, que pode mudar.

## Personalizar sua garagem

Em **Ajustes → Identidade da sua garagem**, escolha a cor e escreva o complemento do nome. O prefixo **Garagem** permanece fixo e a prévia mostra o resultado antes de salvar. A preferência fica neste aparelho, entra no backup e sincroniza com sua conta quando o Firebase está configurado. O nome sob o ícone instalado permanece **Garagem**, pois o manifesto PWA é compartilhado por todos os usuários.

## Como o app evita repetidos

- A aba **Explorar** foi feita para a consulta rápida na loja: mostra primeiro os registros relacionados que você já possui e depois os lançamentos da biblioteca.
- A pesquisa ignora maiúsculas e acentos e entende `Porche` como `Porsche`.
- O formulário alerta quando o mesmo nome de modelo já existe, mostrando ano e cor para conferir variações.
- A quantidade guarda exemplares repetidos sem exigir vários cadastros.
- No cadastro novo, fotografe a frente inteira e o verso inteiro em boa luz. O nome costuma estar na faixa inferior da frente e no topo do verso; o código Mattel de cinco caracteres costuma ficar perto do gancho no verso. Você também pode usar **Fotografar código ou nome de perto** a qualquer momento. Essa foto extra é usada só para identificação; a leitura combina seus resultados com os da frente e do verso. A frente e o verso escolhidos ficam guardados no registro e podem ser ampliados.
- O código pode ser digitado sem fotos. O UPC/EAN de barras não identifica sozinho um carrinho e não é usado para escolher a versão. O app apresenta candidatos para confirmação; não promete precisão de 99% em qualquer embalagem ou iluminação.
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

A diferença aqui é priorizar a consulta rápida antes da compra, combinar uma biblioteca local com a coleção pessoal, oferecer cadastro guiado, acesso offline, backup aberto e operação pessoal sem assinatura.

## Observações técnicas

- Cada registro pode sincronizar duas fotos JPEG comprimidas, da frente e do verso. O código limita o tamanho de cada foto para ficar abaixo do máximo por documento do Firestore.
- A sincronização usa a data de última edição; se o mesmo carrinho for editado simultaneamente em dois aparelhos, a edição mais recente vence.
- Exclusões são salvas como marcadores para impedir que um registro apagado volte na próxima sincronização.
- O OCR lê texto e pode confundir caracteres ou variações do modelo. Compare cada sugestão com a foto antes de aplicá-la e revise o formulário antes de salvar.
