# UnderTone

Uma mesa de som para as abas do navegador. O UnderTone é uma extensão para Firefox e Chrome que lista os vídeos do YouTube abertos e permite controlar cada aba pelo popup: pausar, retomar, silenciar e ajustar o volume. Também há um volume master que vale para todas as abas.

![O popup do UnderTone aberto sobre uma aba do YouTube, com três canais tocando](store-assets/store-1.png)

Útil quando você deixa uma playlist de fundo numa aba, uma aula em outra e um vídeo de referência numa terceira: em vez de procurar cada aba para mexer no volume, tudo fica num só lugar, como os canais de uma mesa de som.

## Funcionalidades

- **Um canal por aba:** cada aba de vídeo do YouTube (`/watch` e `/shorts`) aparece como um canal numerado, com miniatura, título e domínio.
- **Volume por canal:** um fader de 0 a 100% e um botão de mudo independente em cada aba.
- **Master:** um volume geral e um mudo geral, aplicados por cima do volume de cada canal.
- **Pausar tudo / Retomar:** pausa todas as abas que estão tocando. Depois, "Retomar" dá play somente nas abas que esse comando pausou.
- **Fone e teclas de mídia:** o play/pause do fone bluetooth, do teclado ou dos controles de mídia do sistema vira "Pausar tudo" / "Retomar", em vez de pausar só uma aba.
- **Indicador de atividade:** mostra quais abas estão tocando no momento.
- **Tema claro e escuro:** segue a preferência do sistema.

| Tocando | Pausado |
| --- | --- |
| ![Popup no tema escuro com três canais tocando](store-assets/popup/popup-dark.png) | ![Popup no tema escuro com todos os canais pausados](store-assets/popup/popup-paused-dark.png) |
| ![Popup no tema claro com três canais tocando](store-assets/popup/popup-light.png) | ![Popup no tema claro com todos os canais pausados](store-assets/popup/popup-paused-light.png) |

## Como usar

1. Abra um ou mais vídeos do YouTube em abas diferentes.
2. Clique no ícone do UnderTone na barra de ferramentas. Cada vídeo aparece como um canal, na ordem em que foi detectado (`01`, `02`, …). O cabeçalho mostra quantos estão tocando, por exemplo `02/03 TOCANDO`.
3. Em cada canal:
   - **▶ / ❚❚** dá play ou pausa só naquela aba;
   - o **fader** ajusta o volume da aba, de 0 a 100%;
   - o **alto-falante** à direita silencia a aba. O leitor passa a mostrar `OFF`, mas o fader guarda o volume para quando o som voltar.
4. Na faixa **MASTER**, o fader e o mudo valem para todas as abas ao mesmo tempo.
5. **Pausar tudo** pausa o que estiver tocando. O botão vira **Retomar**, que dá play de novo apenas nas abas que foram pausadas por ele. Uma aba que você já tinha pausado antes continua parada.

Não é preciso deixar o popup aberto: os ajustes continuam valendo nas abas depois que ele fecha.

### Fone e teclas de mídia

Normalmente, o toque no fone (ou a tecla play/pause do teclado) chega a uma só aba: a última que tocou som. Com o UnderTone, esse comando vale para todas:

- se **alguma** aba estiver tocando, o toque funciona como **Pausar tudo**;
- se **nenhuma** estiver tocando, funciona como **Retomar**, com a mesma regra do botão.

Funciona sem o popup aberto. Abas que já estavam abertas antes de instalar ou atualizar a extensão precisam ser recarregadas.

### Como o volume é calculado

O volume que chega ao vídeo é o do canal multiplicado pelo master:

```
volume do vídeo = (canal / 100) × (master / 100)
```

Com o master em 50%, um canal em 80% toca a 40% e um canal em 100% toca a 50%. Assim, o master abaixa tudo na mesma proporção, sem desfazer o equilíbrio entre os canais. O mudo (do canal ou do master) silencia sem alterar nenhum desses números.

Até o popup ver uma aba pela primeira vez, o UnderTone não interfere no volume do player do YouTube. A partir daí, o canal começa no volume que o player tinha naquele momento.

| Volume por canal | Pausar tudo e retomar |
| --- | --- |
| ![Faders de volume independentes por aba](store-assets/store-2.png) | ![Popup com todos os canais pausados e o botão Retomar](store-assets/store-3.png) |

## Privacidade e permissões

O UnderTone não coleta nem envia dados. Ele não tem servidor, e o popup não faz requisições de rede além de carregar as miniaturas dos vídeos do `i.ytimg.com`, o mesmo endereço que o YouTube usa. As fontes vêm empacotadas na extensão.

| Permissão | Para quê |
| --- | --- |
| `*://*.youtube.com/*` | Ler o título e o endereço das abas do YouTube e injetar o script que controla o `<video>`. Nenhum outro site é acessado. |
| `storage` | Guardar o volume master e a lista de abas pausadas pelo "Pausar tudo". |

## Requisitos

- Node.js 20 ou mais recente
- Firefox ou um navegador baseado em Chromium

## Como rodar

O código da extensão fica em [`tabmixer/`](tabmixer/).

```bash
cd tabmixer
npm install
```

Desenvolvimento com recarga automática (o comando abre um navegador com a extensão já carregada):

```bash
npm run dev           # Chrome
npm run dev:firefox   # Firefox
```

Build de produção:

```bash
npm run build           # gera .output/chrome-mv3/
npm run build:firefox   # gera .output/firefox-mv2/
npm run zip             # gera o .zip para a Chrome Web Store
npm run zip:firefox     # gera o .zip para o addons.mozilla.org
```

Para carregar o build manualmente:

- **Firefox:** abra `about:debugging#/runtime/this-firefox`, clique em "Carregar extensão temporária" e escolha `tabmixer/.output/firefox-mv2/manifest.json`.
- **Chrome:** abra `chrome://extensions`, ative o "Modo do desenvolvedor", clique em "Carregar sem compactação" e escolha a pasta `tabmixer/.output/chrome-mv3/`.

Depois de um novo build, o navegador continua usando a versão carregada até você recarregar a extensão (botão "Recarregar" em `about:debugging` ou o ícone ↻ em `chrome://extensions`).

Verificação de tipos:

```bash
npm run compile
```

## Como funciona

```
┌──────────── popup (App.tsx) ────────────┐
│ a cada 1 s: tabs.query(abas do YouTube) │
│            → GET_STATE para cada aba    │
│ comandos:  SET_VOLUME / SET_MUTED /     │
│            SET_PAUSED                   │
└───────┬───────────────────────┬─────────┘
        │ tabs.sendMessage      │ storage.local (master)
        ▼                       ▼
┌──── youtube.content.ts (uma por aba) ───┐
│ guarda volume/mudo do canal             │
│ aplica (canal × master) ao <video>      │
└─────────────────────────────────────────┘
```

A cada segundo, o popup consulta as abas do YouTube e pergunta o estado de cada uma ao content script dela. Uma aba só vira canal se responder, ou seja, se tiver um player. Os comandos (volume, mudo, play/pause) vão para a aba como mensagens, e o contrato dessas mensagens fica em [`utils/mixer.ts`](tabmixer/utils/mixer.ts).

O content script ([`youtube.content.ts`](tabmixer/entrypoints/youtube.content.ts)) guarda o volume e o mudo do canal e aplica o volume efetivo pela API do próprio player do YouTube (`setVolume`, `mute`, `unMute`), e não direto no `<video>`. O player guarda um volume próprio e o reaplica ao `<video>` em vários momentos (troca de faixa de áudio, religação da mídia); escrito só no `<video>`, o ajuste do UnderTone durava até a próxima reaplicação. O volume é aplicado sem gravar em `yt-player-volume`, então o ajuste de uma aba não muda o volume padrão do YouTube. A API só existe no contexto da página: no Firefox o content script a alcança por Xray, e no Chrome um script no mundo da página ([`player-main.content.ts`](tabmixer/entrypoints/player-main.content.ts)) atende os pedidos ([`utils/player.ts`](tabmixer/utils/player.ts)). O master não passa por mensagem: o popup grava em `storage.local`, e cada content script escuta `storage.onChanged` e recalcula o volume. Como o YouTube troca de vídeo sem recarregar a página, o content script também reaplica o volume a cada vídeo novo (`loadedmetadata`).

### Teclas de mídia

O navegador entrega o play/pause do fone a uma aba, chamando o handler da [Media Session](https://developer.mozilla.org/docs/Web/API/MediaSession) dela. O YouTube registra os próprios handlers e os registra de novo a cada mudança no player. Por isso o UnderTone roda antes do YouTube (`document_start`), intercepta o `setActionHandler` da página para que play/pause fiquem com ele e avisa o [background](tabmixer/entrypoints/background.ts). O background decide pelo estado de todas as abas, e não pelo "play"/"pause" que o navegador pediu, porque a aba que recebeu a tecla pode estar pausada enquanto outra toca.

A CSP do YouTube impede injetar `<script>` na página, então cada navegador usa um caminho:

- **Firefox** ([`mediakeys.content.ts`](tabmixer/entrypoints/mediakeys.content.ts)): o content script altera o objeto da página por Xray (`wrappedJSObject` + `exportFunction`).
- **Chrome** ([`mediakeys-main.content.ts`](tabmixer/entrypoints/mediakeys-main.content.ts)): o script roda no mundo da página (`world: "MAIN"`), que não passa pela CSP, e repassa a tecla por evento à ponte ([`mediakeys-bridge.content.ts`](tabmixer/entrypoints/mediakeys-bridge.content.ts)), que fala com o background.

### Um código, dois navegadores

O WXT gera os dois pacotes a partir do mesmo código: Manifest V3 para o Chrome e V2 para o Firefox. O que é específico de um navegador fica isolado com `include` nos entrypoints e com o manifest por navegador em [`wxt.config.ts`](tabmixer/wxt.config.ts) (o ID e as declarações do Firefox só entram no build do Firefox).

## Estrutura

```
docs/
  UnderTone-Design-System.pdf     especificação visual do popup
store-assets/                  prints para as lojas e para este README
tabmixer/
  wxt.config.ts                manifest e permissões (por navegador)
  utils/mixer.ts               tipos e mensagens entre popup, content scripts e background
  utils/player.ts              volume e mudo pela API do player do YouTube
  entrypoints/
    background.ts              "Pausar tudo" / "Retomar" pelas teclas de mídia
    youtube.content.ts         controla o <video> em cada aba
    mediakeys.content.ts       Firefox: intercepta play/pause da Media Session
    mediakeys-main.content.ts  Chrome: o mesmo, no mundo da página
    mediakeys-bridge.content.ts  Chrome: leva a tecla do mundo da página ao background
    player-main.content.ts     Chrome: chama a API do player no mundo da página
    popup/
      App.tsx                  estado e integração com o navegador
      components/              Popup, MasterStrip, TrackStrip, Fader, Readout,
                               TransportButton, ActivityMeter, Icon
      styles/                  fonts.css, tokens.css, components.css
```

## Design system

O visual do popup segue o [UnderTone Design System](docs/UnderTone-Design-System.pdf), que define cores (12 tokens em dois temas), tipografia (IBM Plex Sans e Mono), medidas, estados e componentes. `tokens.css` e `components.css` são cópias literais dos apêndices A e B do documento. Ao mudar o visual, atualize o documento primeiro.

![Os popups claro e escuro lado a lado](store-assets/store-4.png)

As fontes são empacotadas na extensão via `@fontsource`, então o popup não faz requisições de rede para carregá-las.

## Solução de problemas

- **Uma aba de vídeo não aparece no popup.** Se a aba já estava aberta antes de a extensão ser instalada (ou recarregada), ela ainda não tem o content script. Recarregue a aba.
- **O popup diz "Nenhuma aba tocando áudio agora".** Só páginas de vídeo (`/watch` e `/shorts`) contam. A página inicial, a busca e os canais do YouTube não aparecem.
- **O toque no fone pausa só uma aba.** A aba que recebeu o toque foi aberta antes de a extensão ser instalada ou atualizada. Recarregue-a.
- **O volume voltou ao valor do canal depois de mexer na barra do YouTube.** Ao carregar um vídeo novo (ou o próximo Short), o UnderTone reaplica o volume do canal. Ajuste o volume pelo popup.

## Stack

[WXT](https://wxt.dev), React 19, TypeScript e CSS com custom properties.

## Limitações atuais

- Só abas de vídeo do YouTube são listadas. Para incluir outros sites, seria preciso pedir permissão para todos os sites (`<all_urls>`) e generalizar o content script.
- O volume de cada canal fica guardado só enquanto a aba está aberta; o volume master é o único salvo em `storage.local`.
- Mudanças feitas direto no player do YouTube não aparecem no fader do canal.
- O recurso das teclas de mídia depende de como o YouTube usa a Media Session hoje. Se isso mudar, o toque volta a pausar só uma aba.
- Ainda não há opção no popup para desligar o recurso das teclas de mídia.
