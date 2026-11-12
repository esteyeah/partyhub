'use client';

import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';

/**
 * Anonymiseur de démo CS2 : remplace un pseudo par un autre de même longueur directement
 * dans le fichier .dem (y compris dans les données compactées au bit près), pour qu'il
 * n'apparaisse plus dans le fil des kills ni ailleurs pendant le replay.
 * Tout se passe dans le navigateur : le fichier n'est envoyé nulle part.
 */

const enc = new TextEncoder();

function findAll(data: Uint8Array, pat: Uint8Array, from = 0): number[] {
  const out: number[] = [];
  const first = pat[0];
  outer: for (let i = data.indexOf(first, from); i !== -1 && i <= data.length - pat.length; i = data.indexOf(first, i + 1)) {
    for (let k = 1; k < pat.length; k++) if (data[i + k] !== pat[k]) continue outer;
    out.push(i);
  }
  return out;
}

const toBig = (b: Uint8Array) => b.reduceRight((acc, v) => (acc << 8n) | BigInt(v), 0n);
function fromBig(v: bigint, len: number) {
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function rename(data: Uint8Array, oldName: Uint8Array, newName: Uint8Array) {
  const n = oldName.length;
  let aligned = 0;
  let shifted = 0;
  for (const i of findAll(data, oldName)) {
    data.set(newName, i);
    aligned++;
  }
  const ob = toBig(oldName);
  const nb = toBig(newName);
  const full = (1n << BigInt(8 * n)) - 1n;
  for (let shift = 1n; shift < 8n; shift++) {
    const inner = fromBig(ob << shift, n + 1).slice(1, n);
    for (const j of findAll(data, inner)) {
      const start = j - 1;
      if (start < 0 || start + n + 1 > data.length) continue;
      let w = toBig(data.subarray(start, start + n + 1));
      if (((w >> shift) & full) !== ob) continue;
      w = (w & ~(full << shift)) | (nb << shift);
      data.set(fromBig(w, n + 1), start);
      shifted++;
    }
  }
  return { aligned, shifted };
}

export default function AnonymiserPage() {
  const [file, setFile] = useState<File | null>(null);
  const [oldName, setOldName] = useState('');
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);

  const oldLen = enc.encode(oldName).length;
  const newLen = enc.encode(newName).length;

  async function run() {
    if (!file) return;
    setError(null);
    setStatus('Lecture du fichier…');
    setBusy(true);
    setUrl(null);
    try {
      await new Promise((r) => setTimeout(r, 50));
      const data = new Uint8Array(await file.arrayBuffer());
      setStatus('Remplacement du pseudo…');
      await new Promise((r) => setTimeout(r, 50));
      const res = rename(data, enc.encode(oldName), enc.encode(newName));
      if (!res.aligned && !res.shifted) {
        setError(`« ${oldName} » n’a pas été trouvé dans cette démo (attention aux majuscules).`);
        setStatus(null);
        return;
      }
      setUrl(URL.createObjectURL(new Blob([data], { type: 'application/octet-stream' })));
      setStatus(`✅ ${res.aligned + res.shifted} remplacements effectués.`);
    } catch (e) {
      setError(`Erreur : ${(e as Error).message}`);
      setStatus(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-6">
      <header className="mb-8">
        <Logo />
      </header>
      <div className="panel space-y-5 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-black">Anonymiser une démo CS2</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Remplace un pseudo dans le fichier <code>.dem</code> : il n’apparaît plus dans le fil des kills ni nulle part pendant le replay. Tout se passe dans ton
            navigateur, le fichier n’est envoyé nulle part.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="dem">
            Démo (.dem)
          </label>
          <input id="dem" type="file" accept=".dem" className="input" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="old">
              Pseudo à cacher
            </label>
            <input id="old" className="input" value={oldName} onChange={(e) => setOldName(e.target.value)} placeholder="esteyeah8" />
          </div>
          <div>
            <label className="label" htmlFor="new">
              Nouveau pseudo ({oldLen || '?'} caractères)
            </label>
            <input id="new" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Joueur_X1" />
            {oldName && newName && oldLen !== newLen && <p className="mt-1 text-xs text-rose-300">Il faut exactement {oldLen} caractères (actuellement {newLen}).</p>}
          </div>
        </div>
        <Button className="w-full" disabled={!file || !oldName || oldLen !== newLen || busy} onClick={run}>
          {busy ? 'Traitement…' : 'Anonymiser la démo'}
        </Button>
        {status && <p className="text-sm font-semibold text-emerald-300">{status}</p>}
        {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
        {url && file && (
          <a href={url} download={file.name.replace(/\.dem$/i, '') + '_anonyme.dem'} className="block rounded-2xl bg-emerald-500 py-3 text-center font-bold text-white hover:bg-emerald-400">
            ⬇️ Télécharger la démo anonymisée
          </a>
        )}
        <p className="text-xs text-zinc-500">
          Le nouveau pseudo doit avoir la même longueur que l’ancien (ex : « esteyeah8 » → « Joueur_X1 »). Place ensuite le fichier dans
          <code> game\csgo</code> et lance-le avec <code>playdemo</code>.
        </p>
      </div>
    </main>
  );
}
