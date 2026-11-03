"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import type { RequestCategory } from "@prisma/client";
import { MapPin, ShieldCheck, Star, Wrench } from "lucide-react";

interface ListingItem {
  id: string;
  category: RequestCategory;
  title: string;
  description: string;
  photoUrls: string[];
  buildingLabel: string;
  publishedAt: Date;
}
interface MyOfferItem {
  id: string;
  listingId: string;
  message: string;
  price: number | string | null;
  status: string;
  createdAt: Date;
  listing: ListingItem | null;
}
interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  category: RequestCategory;
  photoUrls: string[];
}
interface Profile {
  fullName: string;
  rating: number;
  reviewsCount: number;
  portfolio: PortfolioItem[];
}
const categories: Record<RequestCategory, string> = {
  PLUMBING: "Сантехника",
  ELECTRICITY: "Электрика",
  ELEVATOR: "Лифт",
  CLEANING: "Уборка",
  OTHER: "Другое",
};
const labels = {
  ru: {
    orders: "Заказы города",
    portfolio: "Моё портфолио",
    offers: "Мои отклики",
    approved: "Анкета одобрена",
    edit: "Редактировать профиль",
    none: "Пока нет заказов",
    add: "Добавить работу",
    respond: "Откликнуться",
    sent: "Отклик отправлен",
    save: "Сохранить",
    loading: "Загрузка…",
    noReviews: "Пока нет отзывов",
    noPortfolio: "Добавьте первую выполненную работу",
    noOffers: "Вы ещё не отправляли отклики",
  },
  kk: {
    orders: "Қала тапсырыстары",
    portfolio: "Менің портфолиом",
    offers: "Менің ұсыныстарым",
    approved: "Өтінім мақұлданды",
    edit: "Профильді өңдеу",
    none: "Тапсырыстар әзірге жоқ",
    add: "Жұмыс қосу",
    respond: "Ұсыныс беру",
    sent: "Ұсыныс жіберілді",
    save: "Сақтау",
    loading: "Жүктелуде…",
    noReviews: "Пікірлер әзірге жоқ",
    noPortfolio: "Бірінші жұмысты қосыңыз",
    noOffers: "Ұсыныстар әзірге жоқ",
  },
  en: {
    orders: "City orders",
    portfolio: "My portfolio",
    offers: "My offers",
    approved: "Profile approved",
    edit: "Edit profile",
    none: "No orders yet",
    add: "Add completed work",
    respond: "Send offer",
    sent: "Offer sent",
    save: "Save",
    loading: "Loading…",
    noReviews: "No reviews yet",
    noPortfolio: "Add your first completed work",
    noOffers: "No offers yet",
  },
};
async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : (body?.error?.message ?? "Не удалось выполнить запрос"),
    );
  return body?.data ?? body;
}
const json = (body: unknown, method = "POST"): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

// ACCEPT-006: only persisted orders, offers, reviews and portfolio. No simulated results.
export function MasterFeedView({
  masterId,
  city,
  listings,
  myOffers,
  initialFullName = "Мастер",
}: {
  masterId: string;
  city: string;
  listings: ListingItem[];
  myOffers: MyOfferItem[];
  initialFullName?: string;
}) {
  const { language } = useTranslation();
  const L = labels[language] ?? labels.ru;
  const router = useRouter();
  const [tab, setTab] = useState<"orders" | "portfolio" | "offers">("orders");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<ListingItem | null>(null);
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialFullName);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<RequestCategory>("PLUMBING");
  const [photos, setPhotos] = useState<File[]>([]);
  const loadProfile = useCallback(async () => {
    const data = await request<{ master: Profile }>("/api/master/me/details");
    setProfile(data.master);
    setName(data.master.fullName);
  }, []);
  useEffect(() => {
    void loadProfile().catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"));
  }, [loadProfile, masterId]);
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }
  async function sendOffer(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    await perform(async () => {
      await request(
        "/api/master/listings/" + selected.id + "/offers",
        json({ message, price: price ? Number(price) : undefined }),
      );
      setSelected(null);
      setMessage("");
      setPrice("");
      setTab("offers");
      router.refresh();
    });
  }
  async function savePortfolio(e: React.FormEvent) {
    e.preventDefault();
    await perform(async () => {
      let photoUrls: string[] = [];
      if (photos.length) {
        const form = new FormData();
        photos.forEach((file) => form.append("files", file));
        photoUrls = (
          await request<{ urls: string[] }>("/api/uploads", { method: "POST", body: form })
        ).urls;
      }
      await request("/api/master/me/details", json({ title, description, category, photoUrls }));
      await loadProfile();
      setAdding(false);
      setTitle("");
      setDescription("");
      setPhotos([]);
    });
  }
  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-5 rounded-3xl border border-border bg-card p-7 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Wrench size={30} />
          </div>
          <div>
            <h1 className="m-0 text-xl font-bold">
              {profile?.fullName ?? initialFullName} · {city}
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <ShieldCheck size={16} />
              {L.approved}
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm">
              <Star size={15} />
              {profile
                ? profile.reviewsCount
                  ? profile.rating.toFixed(2) + " (" + profile.reviewsCount + ")"
                  : L.noReviews
                : L.loading}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => setEditing(true)}>
          {L.edit}
        </Button>
      </section>
      {error && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-destructive">
          {error}
        </p>
      )}
      <nav className="flex flex-wrap gap-2">
        {(["orders", "portfolio", "offers"] as const).map((key) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            onClick={() => setTab(key)}
          >
            {L[key]} (
            {key === "orders"
              ? listings.length
              : key === "portfolio"
                ? (profile?.portfolio.length ?? 0)
                : myOffers.length}
            )
          </Button>
        ))}
      </nav>
      {tab === "orders" && (
        <div className="grid gap-4 md:grid-cols-2">
          {!listings.length && <p>{L.none}</p>}
          {listings.map((item) => (
            <Card key={item.id} className="rounded-2xl">
              <CardContent className="space-y-4 p-5">
                <p className="text-xs font-semibold text-primary">{categories[item.category]}</p>
                <h2 className="text-lg font-bold">{item.title}</h2>
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <p className="flex items-center gap-1 text-sm">
                  <MapPin size={15} />
                  {item.buildingLabel}
                </p>
                <div className="flex gap-2">
                  {item.photoUrls.slice(0, 3).map((url) => (
                    <Image
                      key={url}
                      src={url}
                      alt="Фото заявки"
                      unoptimized
                      width={100}
                      height={80}
                      className="rounded-lg object-cover"
                    />
                  ))}
                </div>
                <Button
                  disabled={myOffers.some((offer) => offer.listingId === item.id)}
                  onClick={() => setSelected(item)}
                >
                  {myOffers.some((offer) => offer.listingId === item.id) ? L.sent : L.respond}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {tab === "offers" && (
        <div className="grid gap-4">
          {!myOffers.length && <p>{L.noOffers}</p>}
          {myOffers.map((offer) => (
            <Card key={offer.id}>
              <CardContent className="space-y-2 p-5">
                <h2 className="font-bold">{offer.listing?.title ?? "Заявка"}</h2>
                <p>{offer.message}</p>
                <p>
                  {offer.price !== null
                    ? Number(offer.price).toLocaleString("ru-RU") + " ₸"
                    : "По договорённости"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(
                    {
                    OFFERED: "Ожидает ответа",
                      ACCEPTED: "Принят",
                    DECLINED: "Отклонён",
                      WITHDRAWN: "Отозван",
                    } as Record<string, string>
                  )[offer.status] ?? offer.status}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {tab === "portfolio" && (
        <section className="space-y-4">
          <Button onClick={() => setAdding(true)}>{L.add}</Button>
          {!profile?.portfolio.length && <p>{L.noPortfolio}</p>}
          <div className="grid gap-4 md:grid-cols-2">
            {profile?.portfolio.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-3 p-5">
                  <h2 className="font-bold">{item.title}</h2>
                  <p>{item.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {item.photoUrls.map((url) => (
                      <Image
                        key={url}
                        src={url}
                        alt={item.title}
                        unoptimized
                        width={240}
                        height={180}
                        className="rounded-xl object-cover"
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.respond}</DialogTitle>
          </DialogHeader>
          <form onSubmit={sendOffer} className="grid gap-3">
            <p>{selected?.title}</p>
            <Textarea
              aria-label="Сообщение председателю"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={2000}
              placeholder="Сообщение председателю"
            />
            <Input
              aria-label="Цена"
              type="number"
              min="0.01"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Стоимость, ₸ (необязательно)"
            />
            {error && <p role="alert">{error}</p>}
            <Button disabled={busy || !message.trim()}>{L.respond}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.edit}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              void perform(async () => {
                await request("/api/profile", json({ fullName: name }, "PATCH"));
                await loadProfile();
                setEditing(false);
                router.refresh();
              });
            }}
          >
            <Input
              aria-label="ФИО"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={200}
            />
            {error && <p role="alert">{error}</p>}
            <Button disabled={busy}>{L.save}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L.add}</DialogTitle>
          </DialogHeader>
          <form onSubmit={savePortfolio} className="grid gap-3">
            <Input
              aria-label="Название работы"
              placeholder="Название работы"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
            <Textarea
              aria-label="Описание работы"
              placeholder="Описание работы"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
            <select
              aria-label="Категория"
              className="rounded-lg border bg-background p-2"
              value={category}
              onChange={(e) => setCategory(e.target.value as RequestCategory)}
            >
              {Object.entries(categories).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Input
              aria-label="Фотографии работ"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []).slice(0, 5))}
            />
            {error && <p role="alert">{error}</p>}
            <Button disabled={busy}>{L.save}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
