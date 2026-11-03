"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card,CardContent } from "@/components/ui/card";
import { Dialog,DialogContent,DialogHeader,DialogTitle } from "@/components/ui/dialog";
import type { MasterWithPortfolio } from "@/lib/masters/service";
import type { RequestCategory } from "@prisma/client";
import { Briefcase,CheckCircle2,Image as ImageIcon,List,Map as MapIcon,MapPin,Phone,Star,Wrench } from "lucide-react";
import { useState } from "react";

const CATEGORY_LABELS: Record<RequestCategory, string> = {
  PLUMBING: "Сантехника",
  ELECTRICITY: "Электрика",
  ELEVATOR: "Лифт",
  CLEANING: "Уборка",
  OTHER: "Другое",
};

export function MasterCatalogView({ initialMasters }: { initialMasters: MasterWithPortfolio[] }) {
  const [masters, _setMasters] = useState<MasterWithPortfolio[]>(initialMasters);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedMaster, setSelectedMaster] = useState<MasterWithPortfolio | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  const filteredMasters = selectedCategory === "ALL"
    ? masters
    : masters.filter((m) => m.categories.includes(selectedCategory as RequestCategory));

  return (
    <div className="grid gap-6">
      {/* Шапка управления: Категории + Переключение Сетка/Карта */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Фильтр по категориям */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "ALL" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("ALL")}
            className="rounded-full text-xs"
          >
            Все мастера ({masters.length})
          </Button>
          {Object.entries(CATEGORY_LABELS).map(([cat, label]) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="rounded-full text-xs"
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Переключатель вида */}
        <div className="flex items-center gap-1 rounded-full border border-border p-1 bg-background">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="rounded-full text-xs gap-1.5 h-8"
          >
            <List size={14} />
            Список
          </Button>
          <Button
            variant={viewMode === "map" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("map")}
            className="rounded-full text-xs gap-1.5 h-8"
          >
            <MapIcon size={14} />
            На карте
          </Button>
        </div>
      </div>

      {/* Отображение: Карта мастеров */}
      {viewMode === "map" && (
        <Card className="rounded-2xl shadow-sm overflow-hidden border">
          <CardContent className="p-0 relative">
            <div className="h-[480px] w-full bg-muted/30 relative flex flex-col justify-between p-4 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:[background-size:16px_16px]">
              
              {/* Верхний баннер карты */}
              <div className="z-10 flex items-center justify-between gap-2 bg-background/90 backdrop-blur p-3 rounded-xl border shadow-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary animate-bounce" />
                  <span className="text-xs font-semibold">Карта мастеров города (Кокшетау)</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {filteredMasters.length} на карте
                </Badge>
              </div>

              {/* Сетка гео-пинов мастеров */}
              <div className="relative flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-2 overflow-y-auto max-h-[380px]">
                {filteredMasters.map((master, _idx) => (
                  <div
                    key={master.id}
                    onClick={() => setSelectedMaster(master)}
                    className="cursor-pointer bg-card hover:bg-accent border border-border/80 p-3 rounded-2xl shadow-sm transition-all hover:scale-[1.02] flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="size-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {master.fullName[0]}
                        </div>
                        <div>
                          <p className="m-0 font-bold text-xs line-clamp-1">{master.fullName}</p>
                          <p className="m-0 text-[10px] text-muted-foreground">{master.city}</p>
                        </div>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-600 border-none text-[10px] px-1.5 py-0.5 gap-1 shrink-0">
                        <Star size={10} className="fill-amber-500 text-amber-500" />
                        4.9
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t text-[11px] text-primary font-medium">
                      <span>{CATEGORY_LABELS[master.categories[0] ?? "OTHER"] || "Мастер"}</span>
                      <span>Подробнее ↗</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Нижний подвал карты */}
              <div className="z-10 bg-background/90 backdrop-blur p-2.5 rounded-xl border text-[11px] text-muted-foreground text-center">
                Выберите мастера на карте для просмотра фото работ и вызова
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Список мастеров */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredMasters.map((master) => (
          <Card key={master.id} className="rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                    {master.fullName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div>
                    <h3 className="m-0 font-bold text-base flex items-center gap-1.5">
                      {master.fullName}
                      <CheckCircle2 size={16} className="text-primary" />
                    </h3>
                    <p className="m-0 text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {master.city}
                    </p>
                  </div>
                </div>
              </div>

              {/* Категории */}
              <div className="mt-4 flex flex-wrap gap-1">
                {master.categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-[11px] font-normal">
                    {CATEGORY_LABELS[cat] || cat}
                  </Badge>
                ))}
              </div>

              {/* Описание / О себе */}
              {master.bio && (
                <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
                  {master.bio}
                </p>
              )}

              {/* Превью работ */}
              {master.portfolio.length > 0 && (
                <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-2.5">
                  <p className="m-0 text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
                    <ImageIcon size={13} /> Портфолио ({master.portfolio.length} работ)
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {master.portfolio.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        className="relative size-14 shrink-0 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center text-[10px] text-muted-foreground font-medium"
                      >
                        {item.photoUrls[0] ? (
                          <img src={item.photoUrls[0]} alt={item.title} className="size-full object-cover" />
                        ) : (
                          <Briefcase size={18} />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-4 pt-0 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs"
                onClick={() => setSelectedMaster(master)}
              >
                Портфолио и контакты
              </Button>
            </div>
          </Card>
        ))}

        {filteredMasters.length === 0 && (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <Wrench className="mx-auto size-8 mb-2 opacity-40" />
            <p className="m-0 text-sm">В выбранной категории мастера пока не найдены</p>
          </div>
        )}
      </div>

      {/* Модальное окно мастера */}
      <Dialog open={Boolean(selectedMaster)} onOpenChange={(open) => !open && setSelectedMaster(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          {selectedMaster && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  {selectedMaster.fullName}
                  <CheckCircle2 size={18} className="text-primary" />
                </DialogTitle>
                <p className="m-0 text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin size={13} /> {selectedMaster.city} · Проверенный специалист
                </p>
              </DialogHeader>

              <div className="grid gap-4 py-2">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Специализации
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedMaster.categories.map((cat) => (
                      <Badge key={cat} variant="secondary">
                        {CATEGORY_LABELS[cat] || cat}
                      </Badge>
                    ))}
                  </div>
                </div>

                {selectedMaster.bio && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      О себе
                    </h4>
                    <p className="m-0 text-sm">{selectedMaster.bio}</p>
                  </div>
                )}

                {/* Галерея портфолио */}
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <ImageIcon size={14} /> Выполненные работы ({selectedMaster.portfolio.length})
                  </h4>
                  {selectedMaster.portfolio.length > 0 ? (
                    <div className="grid gap-3 max-h-60 overflow-y-auto pr-1">
                      {selectedMaster.portfolio.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border p-3 text-xs">
                          <div className="flex items-center justify-between font-semibold">
                            <span>{item.title}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {CATEGORY_LABELS[item.category] || item.category}
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="mt-1 text-muted-foreground m-0">{item.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground m-0">Портфолио пока пустое</p>
                  )}
                </div>

                {/* Телефон / Связь */}
                {selectedMaster.phone && (
                  <div className="mt-2 rounded-xl bg-primary/10 p-3 flex items-center justify-between">
                    <div>
                      <p className="m-0 text-[11px] font-semibold text-primary uppercase">Телефон для связи</p>
                      <p className="m-0 font-bold text-base">{selectedMaster.phone}</p>
                    </div>
                    <a
                      href={`tel:${selectedMaster.phone}`}
                      className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                    >
                      <Phone size={18} />
                    </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

