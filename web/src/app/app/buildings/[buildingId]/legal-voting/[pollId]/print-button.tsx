"use client";

import { Printer } from "lucide-react";

export function PrintProtocolButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer print:hidden"
    >
      <Printer className="w-4 h-4" />
      Печать / Сохранить в PDF
    </button>
  );
}