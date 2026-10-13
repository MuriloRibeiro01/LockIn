// entrypoints/player-main.content.ts
// Chrome: atende, no mundo da página, os pedidos de volume do youtube.content.ts.
// A API do player do YouTube só existe aqui; ver utils/player.ts.

import {
  findPlayer,
  runPlayerRequest,
  PLAYER_REQUEST_EVENT,
  PLAYER_RESPONSE_EVENT,
  type PlayerRequest,
} from "@/utils/player";

export default defineContentScript({
  matches: ["*://*.youtube.com/*"],
  include: ["chrome"],
  world: "MAIN",
  runAt: "document_start",
  main() {
    window.addEventListener(PLAYER_REQUEST_EVENT, (e) => {
      const detail = (e as CustomEvent<unknown>).detail;
      if (typeof detail !== "string") return;
      const req: PlayerRequest = JSON.parse(detail);
      const result = runPlayerRequest(findPlayer(document), req);
      window.dispatchEvent(new CustomEvent(PLAYER_RESPONSE_EVENT, { detail: JSON.stringify(result) }));
    });
  },
});
