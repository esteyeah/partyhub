import type { Peer, PeerOptions } from 'peerjs';

/**
 * Configuration PeerJS. Par défaut : service public et gratuit de PeerJS (0.peerjs.com)
 * pour la mise en relation ; les données passent ensuite directement entre navigateurs.
 * Variables facultatives pour utiliser ton propre serveur PeerJS :
 *   NEXT_PUBLIC_PEER_HOST, NEXT_PUBLIC_PEER_PORT, NEXT_PUBLIC_PEER_PATH, NEXT_PUBLIC_PEER_SECURE
 */
function peerOptions(): PeerOptions {
  const opts: PeerOptions = { debug: 1 };
  const host = process.env.NEXT_PUBLIC_PEER_HOST;
  if (host) {
    opts.host = host;
    opts.port = Number(process.env.NEXT_PUBLIC_PEER_PORT || 443);
    opts.path = process.env.NEXT_PUBLIC_PEER_PATH || '/';
    opts.secure = process.env.NEXT_PUBLIC_PEER_SECURE !== 'false';
  }
  return opts;
}

export type PeerErrorType = 'unavailable-id' | 'peer-unavailable' | 'network' | 'server-error' | string;

/** Ouvre un Peer (avec un id imposé ou aléatoire) et attend qu'il soit enregistré. */
export async function openPeer(id?: string): Promise<Peer> {
  const { Peer } = await import('peerjs');
  return new Promise((resolve, reject) => {
    const peer = id ? new Peer(id, peerOptions()) : new Peer(peerOptions());
    const timer = setTimeout(() => {
      peer.destroy();
      reject(Object.assign(new Error('timeout'), { type: 'network' }));
    }, 12000);
    const onError = (err: unknown) => {
      clearTimeout(timer);
      peer.off('open', onOpen);
      peer.destroy();
      reject(err);
    };
    const onOpen = () => {
      clearTimeout(timer);
      peer.off('error', onError); // les erreurs suivantes sont gérées par l'appelant
      resolve(peer);
    };
    peer.once('open', onOpen);
    peer.once('error', onError);
  });
}

export function peerErrorMessage(type: PeerErrorType | undefined): string {
  switch (type) {
    case 'peer-unavailable':
      return 'Aucun salon ouvert avec ce code (ou l’hôte a quitté la partie).';
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return 'Impossible de joindre le service de connexion. Vérifie ta connexion Internet.';
    case 'browser-incompatible':
      return 'Ton navigateur ne supporte pas WebRTC.';
    default:
      return 'Connexion impossible, réessaie.';
  }
}
