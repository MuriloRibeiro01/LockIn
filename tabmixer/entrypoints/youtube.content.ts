// entrypoints/youtube.content.ts
// Roda dentro das abas do YouTube e obedece comandos vindos do popup.
// Guarda o volume/mudo do canal e aplica o volume efetivo: (canal / 100) × (master / 100).
// O volume vai pela API do player do YouTube (utils/player.ts); escrito só no <video>,
// ele seria desfeito na próxima vez que o player reaplicasse o próprio volume.

import { MASTER_KEY, type ChannelState, type MasterState, type Message } from "@/utils/mixer";
import { callPlayer } from "@/utils/player";

export default defineContentScript({
  matches: ["*://*.youtube.com/*"],
  main() {
    // O YouTube é uma SPA e pode trocar o <video> ao navegar,
    // então buscamos o elemento a cada comando.
    const getVideo = () => document.querySelector<HTMLVideoElement>("video");

    let master: MasterState = { volume: 100, muted: false };
    // null até o canal ser controlado pelo UnderTone: antes disso o volume do player é respeitado.
    let channel: { volume: number; muted: boolean } | null = null;

    const apply = () => {
      const v = getVideo();
      if (!v || !channel) return;
      const volume = Math.round((channel.volume * master.volume) / 100);
      const muted = channel.muted || master.muted;
      // Sem a API (player ainda carregando), vale o <video>; o loadedmetadata reaplica depois.
      if (!callPlayer({ set: { volume, muted } })) {
        v.volume = volume / 100;
        v.muted = muted;
      }
    };

    // O canal começa no volume do player, e não no do <video>, que inclui a normalização
    // de loudness do YouTube.
    const ensureChannel = (v: HTMLVideoElement) => {
      channel ??= callPlayer({}) ?? { volume: Math.round(v.volume * 100), muted: v.muted };
      return channel;
    };

    void browser.storage.local.get(MASTER_KEY).then((res) => {
      if (res[MASTER_KEY]) master = res[MASTER_KEY] as MasterState;
    });
    browser.storage.onChanged.addListener((changes, area) => {
      const change = changes[MASTER_KEY];
      if (area !== "local" || !change) return;
      master = change.newValue as MasterState;
      const v = getVideo();
      if (v) ensureChannel(v);
      apply();
    });

    // Navegação na SPA (e o próximo Short) carrega um vídeo novo, e o player pode restaurar
    // o volume salvo do YouTube (syncVolume); reaplicamos o do canal.
    document.addEventListener("loadedmetadata", apply, true);

    browser.runtime.onMessage.addListener((msg: Message, _sender, sendResponse) => {
      const v = getVideo();
      if (!v) {
        sendResponse(null);
        return;
      }

      const ch = ensureChannel(v);
      switch (msg.type) {
        case "SET_VOLUME":
          ch.volume = Math.min(100, Math.max(0, Math.round(msg.value)));
          apply();
          break;
        case "SET_MUTED":
          ch.muted = msg.value;
          apply();
          break;
        case "SET_PAUSED":
          if (msg.value) v.pause();
          else void v.play();
          break;
      }

      const state: ChannelState = { volume: ch.volume, muted: ch.muted, paused: v.paused };
      sendResponse(state);
    });
  },
});
