// Volume e mudo pela API do próprio player do YouTube.
//
// O player guarda o volume dele e o reaplica ao <video> em vários momentos (troca de
// faixa de áudio, religação da mídia, anúncios). Escrever direto em video.volume dura só
// até a próxima reaplicação; pela API, o volume guardado pelo player passa a ser o nosso.
//
// A API (setVolume, mute…) existe só no contexto da página: no Firefox o content script
// a alcança por Xray (wrappedJSObject); no Chrome ela é chamada pelo player-main.content.ts
// (world: "MAIN"), que responde por evento síncrono.

/** Volume (0–100) e mudo do player. */
export type PlayerVolume = { volume: number; muted: boolean };

/** Pedido ao player: só lê o estado, ou aplica `set` e lê o resultado. */
export type PlayerRequest = { set?: PlayerVolume };

export const PLAYER_REQUEST_EVENT = "undertone:player-request";
export const PLAYER_RESPONSE_EVENT = "undertone:player-response";

interface YouTubePlayer {
  getVolume(): number;
  isMuted(): boolean;
  // O segundo argumento `false` não grava em "yt-player-volume": o volume de uma aba
  // não vira o padrão do YouTube nem vaza para as outras abas.
  setVolume(volume: number, store?: boolean): void;
  mute(store?: boolean): void;
  unMute(store?: boolean): void;
}

/** O player (#movie_player ou #shorts-player) do primeiro <video> da página. */
export function findPlayer(doc: Document): Element | null {
  return doc.querySelector("video")?.closest(".html5-video-player") ?? null;
}

/** Roda no contexto da página. Retorna null se o player ainda não expôs a API. */
export function runPlayerRequest(element: unknown, req: PlayerRequest): PlayerVolume | null {
  const player = element as Partial<YouTubePlayer> | null;
  if (typeof player?.setVolume !== "function") return null;
  const p = player as YouTubePlayer;
  if (req.set) {
    p.setVolume(req.set.volume, false);
    if (req.set.muted) p.mute(false);
    else p.unMute(false);
  }
  return { volume: p.getVolume(), muted: p.isMuted() };
}

/** Lado do content script: lê ou aplica o volume do player, no navegador atual. */
export function callPlayer(req: PlayerRequest): PlayerVolume | null {
  if (import.meta.env.FIREFOX) {
    const element = findPlayer(document) as (Element & { wrappedJSObject?: unknown }) | null;
    return runPlayerRequest(element?.wrappedJSObject ?? null, req);
  }
  // Chrome: dispatchEvent é síncrono, então a resposta chega antes de ele retornar.
  // Só strings atravessam com segurança entre o mundo isolado e o da página.
  let result: PlayerVolume | null = null;
  const onResponse = (e: Event) => {
    result = JSON.parse((e as CustomEvent<string>).detail);
  };
  window.addEventListener(PLAYER_RESPONSE_EVENT, onResponse);
  window.dispatchEvent(new CustomEvent(PLAYER_REQUEST_EVENT, { detail: JSON.stringify(req) }));
  window.removeEventListener(PLAYER_RESPONSE_EVENT, onResponse);
  return result;
}
