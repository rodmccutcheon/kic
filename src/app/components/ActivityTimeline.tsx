"use client";

import { useState } from "react";
import {formatDate} from "@/lib/util/date";

export interface Event {
  id: string;
  source: string;
  type: string;
  externalId: string;
  payload: string;
  occurredAt: string;
}

const SOURCE_COLOURS: Record<string, string> = {
  shopify: "bg-green-100 text-green-800",
  mindbody: "bg-blue-100 text-blue-800",
};

export function ActivityTimeline({ events }: { events: Event[] }) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
        Activity timeline · {events.length} event{events.length !== 1 ? "s" : ""}
      </h2>

      {events.length === 0 && (
        <p className="text-sm text-zinc-500">No events recorded yet.</p>
      )}

      {events.map((event) => {
        const isExpanded = expandedEvent === event.id;
        let payload: unknown;
        try { payload = JSON.parse(event.payload); } catch { payload = event.payload; }

        return (
          <div key={event.id} className="rounded-xl border border-zinc-200 bg-white">
            <button
              className="flex w-full items-center gap-4 px-5 py-4 text-left"
              onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
            >
              <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${SOURCE_COLOURS[event.source] ?? "bg-zinc-100 text-zinc-700"}`}>
                {event.source}
              </span>
              <span className="flex-1 text-sm font-medium text-zinc-800">{event.type}</span>
              <span className="text-xs text-zinc-400">{formatDate(event.occurredAt)}</span>
              <span className="text-zinc-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-zinc-100 px-5 py-4">
                <pre className="overflow-x-auto rounded-lg bg-zinc-50 p-4 text-xs text-zinc-700 leading-relaxed">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
