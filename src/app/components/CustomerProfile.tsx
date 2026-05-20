import {formatDate} from "@/lib/util/date";

export interface Signal {
  id: string;
  type: string;
  value: string;
  createdAt: string;
}

const SIGNAL_COLOURS: Record<string, string> = {
  email: "bg-violet-100 text-violet-800",
  phone: "bg-amber-100 text-amber-800",
  device_id: "bg-gray-100 text-gray-700",
  shopify_customer_id: "bg-green-100 text-green-800",
  mindbody_client_id: "bg-blue-100 text-blue-800",
};

interface Props {
  id: string;
  createdAt: string;
  signals: Signal[];
}

export function CustomerProfile({ id, createdAt, signals }: Props) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Customer</h2>
          <p className="mt-1 font-mono text-sm text-zinc-600">{id}</p>
        </div>
        <p className="text-xs text-zinc-400">First seen {formatDate(createdAt)}</p>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">Identity signals</h3>
        <div className="flex flex-wrap gap-2">
          {signals.map((s) => (
            <span
              key={s.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${SIGNAL_COLOURS[s.type] ?? "bg-zinc-100 text-zinc-700"}`}
            >
              <span className="opacity-60">{s.type}</span>
              <span>{s.value}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}