'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import type { ListStore } from './useListStore';

export function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? 'border-fuchsia-400/30 bg-fuchsia-500/10' : 'border-white/8 bg-ink-850/80'}`}>
      <div className="font-mono text-2xl font-black">{value}</div>
      <div className="text-xs text-zinc-400">{label}</div>
    </div>
  );
}

/** Export / import + bannière « envoyer le contenu local sur GitHub » */
export function Toolbar<T>({ s, filename }: { s: ListStore<T>; filename: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={() => s.exportJson(filename)}>
          ⬇️ Exporter
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold hover:bg-white/12">
          ⬆️ Importer
          <input
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) s.importJson(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      {s.mode === 'github' && s.localList.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm">
          <span>{s.localList.length} élément(s) enregistré(s) dans ce navigateur.</span>
          <Button size="sm" onClick={s.pushLocal} disabled={s.saving}>
            Les envoyer sur GitHub
          </Button>
        </div>
      )}
    </div>
  );
}

export function Feedback({ error, flash }: { error: string | null; flash: string | null }) {
  return (
    <>
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}
      <AnimatePresence>
        {flash && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm font-semibold text-emerald-300">
            {flash}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}

export function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 gap-1">
      <button onClick={onEdit} className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-white/10 hover:text-white" aria-label="Modifier">
        ✏️
      </button>
      <button onClick={onDelete} className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-rose-500/15 hover:text-rose-300" aria-label="Supprimer">
        🗑️
      </button>
    </div>
  );
}
