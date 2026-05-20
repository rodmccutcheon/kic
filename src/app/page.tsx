"use client";

import { useState } from "react";
import { SearchForm } from "./components/SearchForm";
import { CustomerProfile } from "./components/CustomerProfile";
import type { Signal } from "./components/CustomerProfile";
import { MergeHistory } from "./components/MergeHistory";
import type { MergeRecord } from "./components/MergeHistory";
import { ActivityTimeline } from "./components/ActivityTimeline";
import type { Event } from "./components/ActivityTimeline";

interface Customer {
  id: string;
  createdAt: string;
  signals: Signal[];
  events: Event[];
  merges: MergeRecord[];
}

export default function Home() {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(q: string) {
    setLoading(true);
    setError(null);
    setCustomer(null);

    try {
      const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
      if (res.status === 404) {
        setError("No customer found matching that signal.");
      } else if (!res.ok) {
        setError("Something went wrong. Please try again.");
      } else {
        setCustomer(await res.json());
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      <header className="bg-white border-b border-zinc-200 px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Internal tool</p>
        <h1 className="text-xl font-semibold text-zinc-900">KIC Customer Lookup</h1>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <SearchForm onSearch={handleSearch} loading={loading} />

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {customer && (
          <div className="space-y-6">
            <CustomerProfile id={customer.id} createdAt={customer.createdAt} signals={customer.signals} />
            <MergeHistory merges={customer.merges} />
            <ActivityTimeline key={customer.id} events={customer.events} />
          </div>
        )}
      </main>
    </div>
  );
}