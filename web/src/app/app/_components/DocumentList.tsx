"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import { documentCategoryLabels } from "@/lib/documents/service";
import type { Document,DocumentCategory } from "@prisma/client";
import { Download,Eye,FileText,Lock,Sparkles,Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DocumentAiModal } from "./DocumentAiModal";
import { DocumentViewerModal } from "./DocumentViewerModal";

export function DocumentList({
  documents,
  isChairman = false,
}: {
  documents: (Document & { isRead?: boolean; readCount?: number })[];
  isChairman?: boolean;
}) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDocForView, setSelectedDocForView] = useState<Document | null>(null);
  const [selectedDocForAi, setSelectedDocForAi] = useState<Document | null>(null);

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
    return (
      <Card className="rounded-2xl border-dashed p-8 text-center bg-card/40">
        <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm font-medium">Документов пока нет.</p>
        <p className="text-xs text-muted-foreground mt-1">
          {isChairman
            ? "Воспользуйтесь формой слева для публикации протоколов и документов"
            : "Председатель пока не добавил документы"}
        </p>
      </Card>
    );
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
        {filteredDocs.map((doc) => {
          const isProtocol = doc.category === "PROTOCOL";

          return (
            <li key={doc.id} data-testid="document-row">
              <Card
                className={`rounded-2xl shadow-sm transition-all hover:shadow-md ${
                  isProtocol ? "border-emerald-500/30 bg-emerald-500/[0.02]" : ""
                }`}
              >
                <CardContent className="flex flex-col gap-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={isProtocol ? "default" : "secondary"}
                          className={`rounded-md text-[10px] ${
                            isProtocol ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""
                          }`}
                        >
                          {documentCategoryLabels[doc.category as DocumentCategory]}
                        </Badge>
                        {!doc.isPublic && isChairman && (
                          <Badge variant="outline" className="rounded-md text-[10px] text-amber-500 border-amber-500/30">
                            Приватный
                          </Badge>
                        )}
                        {!isChairman && (doc).isRead && (
                          <Badge variant="outline" className="rounded-md text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                            ✓ Ознакомлен
                          </Badge>
                        )}
                        {!isChairman && !(doc).isRead && (
                          <Badge variant="default" className="rounded-md text-[10px] bg-blue-600 text-white animate-pulse">
                            🔥 Новый
                          </Badge>
                        )}
                        {isChairman && typeof (doc).readCount === "number" && (
                          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-md">
                            <Eye size={12} className="text-primary" />
                            {(doc).readCount} ознакомились
                          </span>
                        )}
                      </div>
                      <h4 className="m-0 text-base font-semibold leading-snug">{doc.title}</h4>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="m-0 text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                      {doc.description}
                    </p>
                  )}

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Читать на сайте */}
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setSelectedDocForView(doc)}
                        className="rounded-xl text-xs gap-1.5 font-medium shadow-sm"
                      >
                        <Eye size={14} />
                        Читать на сайте
                      </Button>

                      {/* AI-Анализ доступен Председателю */}
                      {isChairman && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDocForAi(doc)}
                          className="rounded-xl text-xs gap-1.5 font-medium border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <Sparkles size={13} className="text-emerald-500" />
                          ИИ-Анализ
                        </Button>
                      )}

                      {/* Прямое скачивание доступно ТОЛЬКО председателю */}
                      {isChairman ? (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:underline ml-1"
                          data-testid="doc-download-link"
                        >
                          <Download size={13} />
                          Скачать ↗
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-md select-none">
                          <Lock size={11} className="text-amber-500" />
                          Только чтение
                        </span>
                      )}
                    </div>

                    {isChairman && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={deletingId === doc.id}
                        className="text-xs text-destructive hover:bg-destructive/10 gap-1 rounded-xl"
                        data-testid="doc-delete-btn"
                      >
                        <Trash2 size={13} />
                        {deletingId === doc.id ? "Удаление..." : "Удалить"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <DocumentViewerModal
        doc={selectedDocForView}
        isOpen={!!selectedDocForView}
        onClose={() => setSelectedDocForView(null)}
        isChairman={isChairman}
      />

      <DocumentAiModal
        doc={selectedDocForAi}
        isOpen={!!selectedDocForAi}
        onClose={() => setSelectedDocForAi(null)}
      />
    </div>
  );
}