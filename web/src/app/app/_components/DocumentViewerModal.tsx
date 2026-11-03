"use client";

import { Button } from "@/components/ui/button";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import type { Document } from "@prisma/client";
import { Download,FileText,Loader2,Lock,Maximize2,Minimize2,RotateCcw,ShieldCheck,ZoomIn,ZoomOut } from "lucide-react";
import { useEffect,useState } from "react";

interface DocumentViewerModalProps {
  doc: Document | null;
  isOpen: boolean;
  onClose: () => void;
  isChairman?: boolean;
}

export function DocumentViewerModal({
  doc,
  isOpen,
  onClose,
  isChairman = false,
}: DocumentViewerModalProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!doc || !isOpen) {
      setBlobUrl(null);
      setIsFullScreen(false);
      setZoomLevel(100);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setLoadError(false);

    fetch(doc.fileUrl, {
      headers: {
        "ngrok-skip-browser-warning": "69420",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Не удалось загрузить файл");
        return res.blob();
      })
      .then((blob) => {
        if (!isCancelled) {
          const url = URL.createObjectURL(blob);
          setBlobUrl(url);
          setLoading(false);

          fetch("/api/documents/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ documentId: doc.id }),
          }).catch(() => {});
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setLoadError(true);
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [doc, isOpen]);

  if (!isMounted || !doc) return null;

  const lowerUrl = doc.fileUrl.toLowerCase();
  const isPdf = lowerUrl.endsWith(".pdf") || doc.fileType?.includes("pdf");
  const isImage = /\.(jpg|jpeg|png|webp)$/i.test(lowerUrl) || doc.fileType?.includes("image");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`flex flex-col p-0 overflow-hidden rounded-2xl select-none transition-all duration-300 ${
          isFullScreen
            ? "w-screen h-screen max-w-none max-h-none rounded-none border-0 m-0"
            : "w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[75vw] xl:max-w-[1200px] h-[90vh] sm:h-[88vh]"
        }`}
      >
        <DialogHeader className="p-3 sm:p-4 border-b flex flex-row items-center justify-between gap-2 bg-card">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-sm sm:text-base font-bold truncate">{doc.title}</DialogTitle>
              {doc.category === "PROTOCOL" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck size={12} /> Протокол
                </span>
              )}
            </div>
            {doc.description && (
              <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Кнопка Полноэкранного режима */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setIsFullScreen((v) => !v)}
              title={isFullScreen ? "Свернуть" : "На весь экран"}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>

            {/* Скачивание видно ТОЛЬКО Председателю */}
            {isChairman && (
              <Button variant="outline" size="sm" asChild className="rounded-xl gap-1.5 h-8 text-xs">
                <a href={doc.fileUrl} download target="_blank" rel="noreferrer">
                  <Download size={14} />
                  <span className="hidden sm:inline">Скачать</span>
                </a>
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Панель масштабирования (только для картинок/фото, у PDF есть своя нативная панель) */}
        {isImage && blobUrl && !loading && !loadError && (
          <div className="flex items-center justify-center gap-2 py-1.5 px-3 bg-muted/60 border-b text-xs">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setZoomLevel((z) => Math.max(50, z - 25))}
              disabled={zoomLevel <= 50}
              title="Уменьшить"
            >
              <ZoomOut size={13} />
            </Button>
            <span className="w-12 text-center font-mono font-medium text-[11px]">{zoomLevel}%</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-md"
              onClick={() => setZoomLevel((z) => Math.min(250, z + 25))}
              disabled={zoomLevel >= 250}
              title="Увеличить"
            >
              <ZoomIn size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md ml-1"
              onClick={() => setZoomLevel(100)}
              title="Сбросить"
            >
              <RotateCcw size={13} />
            </Button>
          </div>
        )}

        {/* Экран встроенного просмотра */}
        <div
          className="flex-1 bg-muted/40 relative overflow-auto flex items-center justify-center p-2 touch-pan-x touch-pan-y"
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs">Загрузка документа...</span>
            </div>
          ) : loadError ? (
            <div className="text-center p-6 bg-background rounded-2xl border max-w-sm">
              <FileText className="mx-auto h-10 w-10 text-destructive mb-2" />
              <p className="font-semibold text-sm mb-1">Не удалось открыть документ</p>
              <p className="text-xs text-muted-foreground">
                Проверьте соединение с сервером или попробуйте открыть позже.
              </p>
            </div>
          ) : isPdf && blobUrl ? (
            <div className="w-full h-full flex items-center justify-center p-0">
              <iframe
                src={`${blobUrl}#toolbar=1&navpanes=0&scrollbar=1&view=FitH`}
                className="w-full h-full border-0 bg-white shadow-inner"
                title={doc.title}
              />
            </div>
          ) : isImage && blobUrl ? (
            <div className="overflow-auto w-full h-full flex items-start justify-center p-2">
              <img
                src={blobUrl}
                alt={doc.title}
                onDragStart={(e) => e.preventDefault()}
                style={{
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: "top center",
                  imageRendering: "-webkit-optimize-contrast",
                }}
                className="max-w-full rounded-md shadow-md transition-transform duration-150"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-background rounded-2xl border max-w-sm">
              <FileText className="mx-auto h-12 w-12 text-amber-500 mb-3" />
              <p className="font-semibold text-sm mb-1">Формат требует конвертации</p>
              <p className="text-xs text-muted-foreground">
                Файлы Word (.doc/.docx) не могут безопасно отображаться на мобильных без скачивания.
                Загрузите документ в формате <b>PDF</b> или <b>Фото</b>.
              </p>
            </div>
          )}
        </div>

        <div className="p-2.5 bg-secondary/60 border-t flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <Lock size={12} className="text-amber-500" />
          <span>Режим «Только чтение». Загрузка документа жителям недоступна.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}