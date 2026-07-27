"use client";

import { Printer } from "lucide-react";

export function PrintProtocolButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm print:hidden"
    >
      <Printer className="w-4 h-4" />
      Печать / Сохранить в PDF
    </button>
  );
}