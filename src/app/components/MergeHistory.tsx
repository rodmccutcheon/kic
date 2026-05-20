export interface MergeRecord {
  id: string;
  absorbedId: string;
  signals: string;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function MergeHistory({ merges }: { merges: MergeRecord[] }) {
  if (merges.length === 0) return null;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-600">
        Merge history · {merges.length} merge{merges.length !== 1 ? "s" : ""}
      </h2>
      <div className="space-y-2">
        {merges.map((m) => {
          let parsedSignals: { type: string; value: string }[] = [];
          try { parsedSignals = JSON.parse(m.signals); } catch { /* leave empty */ }
          return (
            <div key={m.id} className="rounded-lg bg-white border border-amber-100 px-4 py-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Absorbed <span className="font-mono text-zinc-700">{m.absorbedId}</span></span>
                <span className="text-zinc-400">{formatDate(m.createdAt)}</span>
              </div>
              <div className="text-zinc-400">
                Triggered by:{" "}
                {parsedSignals.map((s, i) => (
                  <span key={i} className="font-mono text-zinc-600">
                    {s.type}:{s.value}{i < parsedSignals.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}