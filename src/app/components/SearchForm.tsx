"use client";

import { useState } from "react";

interface Props {
  onSearch: (q: string) => void;
  loading: boolean;
}

export function SearchForm({ onSearch, loading }: Props) {
  const [query, setQuery] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (query.trim()) onSearch(query.trim());
      }}
      className="flex gap-3"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by email, phone, device ID, or platform ID…"
        className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Searching…" : "Search"}
      </button>
    </form>
  );
}