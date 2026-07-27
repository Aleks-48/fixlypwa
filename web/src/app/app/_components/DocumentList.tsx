"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  documentCategoryLabels, 
} from "@/lib/documents/service";
import type { Document, DocumentCategory } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DocumentList({
  documents,
  isChairman = false,
}: {
  documents: Document[];
  isChairman?: boolean;
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredDocs = documents.filter((d) =>
    selectedCategory === "ALL" ? true : d.category === selectedCategory,
  );

  async function handleDelete(id: string) {
    if (!confirm("Удалить этот документ из библиотеки?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Ошибка при удалении");
      }
    } catch {
      alert("Не удалось связаться с сервером");
    } finally {
      setDeletingId(null);
    }
  }

  if (documents.length === 0) {
    return <p className="text-sm text-muted-foreground">Документов пока нет.</p>;
  }

  const categoriesInUse = Array.from(new Set(documents.map((d) => d.category)));

  return (
    <div className="grid gap-4">
      {categoriesInUse.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedCategory === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("ALL")}
            className="rounded-full text-xs"
          >
            Все ({documents.length})
          </Button>
          {categoriesInUse.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="rounded-full text-xs"
            >
              {documentCategoryLabels[cat as DocumentCategory]} (
              {documents.filter((d) => d.category === cat).length})
            </Button>
          ))}
        </div>
      )}

      <ul className="m-0 grid list-none gap-3 p-0">
        {filteredDocs.map((doc) => (
          <li key={doc.id} data-testid="document-row">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="flex flex-col gap-2 pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      {documentCategoryLabels[doc.category as DocumentCategory]}
                    </span>
                    <h4 className="m-0 text-base font-semibold">{doc.title}</h4>
                  </div>
                  {!doc.isPublic && isChairman && (
                    <Badge variant="secondary" className="rounded-full text-xs">
                      Приватный
                    </Badge>
                  )}
                </div>

                {doc.description && (
                  <p className="m-0 text-sm text-muted-foreground whitespace-pre-wrap">
                    {doc.description}
                  </p>
                )}

                <div className="mt-1 flex items-center justify-between gap-2">
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                    data-testid="doc-download-link"
                  >
                    Скачать / Просмотреть ↗
                  </a>

                  {isChairman && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="text-xs text-destructive hover:bg-destructive/10"
                      data-testid="doc-delete-btn"
                    >
                      {deletingId === doc.id ? "Удаление..." : "Удалить"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}