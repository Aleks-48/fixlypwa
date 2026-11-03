"use client";

import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { SearchResultGroup } from "@/lib/search/service";
import { ArrowRight,ClipboardList,FileText,Loader2,Newspaper,Search,Wrench,X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect,useRef,useState } from "react";

const ICON_BY_TYPE = {
  document: FileText,
  request: ClipboardList,
  master: Wrench,
  announcement: Newspaper,
  nav: ArrowRight,
};

export function GlobalSearch() {
  const { t } = useTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query)}`)
        .then((res) => res.json())
        .then((data) => {
          setResults(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => {
          setResults([]);
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs xl:max-w-sm">
      <div className="relative flex items-center">
        <Search className="absolute left-3 size-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={t("placeholder_search")}
          className="w-full h-9 pl-9 pr-8 rounded-xl border border-border bg-secondary/60 text-xs font-medium outline-none transition-all focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 size-3.5 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            onClick={() => setQuery("")}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        ) : null}
      </div>

      {open && (query.length >= 2 || results.length > 0) && (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-2xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-md max-h-96 overflow-y-auto animate-in fade-in-50 duration-150">
          {loading ? (
            <div className="p-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-primary" /> {t("status_searching")}
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              {t("label_nothing_found")} &quot;{query}&quot;
            </div>
          ) : (
            <div className="space-y-3 p-1">
              {results.map((group) => (
                <div key={group.category} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {group.category}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = ICON_BY_TYPE[item.type] || ArrowRight;

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.href)}
                          className="w-full flex items-start gap-2.5 p-2 rounded-xl hover:bg-accent text-left transition-colors group"
                        >
                          <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Icon size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="m-0 text-xs font-semibold leading-snug truncate group-hover:text-primary transition-colors">
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="m-0 text-[11px] text-muted-foreground truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
