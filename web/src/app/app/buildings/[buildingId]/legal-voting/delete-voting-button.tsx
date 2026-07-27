"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteLegalVotingAction } from "./actions"; // Локальный импорт

interface DeleteVotingButtonProps {
  pollId: string;
  buildingId: string;
}

export function DeleteVotingButton({ pollId, buildingId }: DeleteVotingButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm("Вы действительно хотите удалить это голосование? Это действие нельзя отменить.")) {
      startTransition(async () => {
        await deleteLegalVotingAction(pollId, buildingId);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Удалить голосование"
      className="p-2 bg-zinc-800/80 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded-lg border border-zinc-700/60 hover:border-red-500/40 transition-all disabled:opacity-50 cursor-pointer shrink-0"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  );
}