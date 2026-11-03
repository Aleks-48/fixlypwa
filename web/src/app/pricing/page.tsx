"use client";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ArrowLeft,Calculator,Check,Crown,Database,Star,Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const PRICING_I18N = {
  ru: {
    back: "Назад",
    city_tag: "ОСИ · Кокшетау",
    title: "Тарифы для председателей",
    subtitle: "Прозрачная цена — оплата за каждую квартиру вашего дома. Без скрытых платежей.",
    calc_title: "Калькулятор стоимости",
    label_apts: "Количество квартир",
    label_months: "Срок (для Стандарт — макс. 3 мес.)",
    month_suffix: "мес.",
    ref_checkbox: "Есть реферальная ссылка",
    ref_discount_badge: "(Стандарт: 50 ₸/кв)",
    apt_unit: "кв.",
    per_apt: "за квартиру",
    ref_price_label: "По реф. ссылке: 50 ₸",
    ref_banner_title: "🎁 Реферальная программа",
    ref_banner_desc: "При подключении по реферальной ссылке — цена 50 ₸/кв вместо 120 ₸/кв на весь оплаченный период (максимум 3 месяца).",
    service_title: "Внесение данных за вас",
    service_badge: "Разовая услуга",
    service_desc: "Не хочется заполнять вручную? Наша команда занесёт все квартиры, собственников и площади в систему за вас. Вы предоставляете список — мы делаем всё остальное.",
    service_f1: "Ввод ФИО, № квартиры и площади (м²) каждой квартиры",
    service_f2: "Ввод площади дома + прилегающей территории",
    service_f3: "Проверка и очистка дублей",
    service_f4: "Сдача результата в течение 1 рабочего дня",
    service_price_from: "от 2 500",
    service_price_sub: "Зависит от числа квартир в доме",
    service_btn: "Заказать услугу",
    cta_title: "Готовы подключить дом?",
    cta_sub: "Зарегистрируйтесь и управляйте своим домом уже сегодня.",
    cta_login: "Войти в кабинет",
    cta_support: "Написать в поддержку",
    legal_memorandum: "Меморандум о намерениях (Пилот 50 ₸) →",
    legal_oferta: "Публичная оферта для Председателей ОСИ →",
    footer: "Данные хранятся на территории Казахстана.",
    plans: {
      standard: {
        name: "Стандарт",
        note: "После 3 месяцев — по договору",
        badge: null,
        features: [
          "Объявления и уведомления",
          "Заявки со статусом и перепиской",
          "Голосования (юридически значимые)",
          "Начисления и квитанции",
          "До 3 месяцев по фиксированной цене",
        ],
      },
      vip: {
        name: "VIP",
        note: "По договору",
        badge: "Популярный",
        features: [
          "Всё из тарифа Стандарт",
          "Приоритетная поддержка",
          "AI-ассистент председателя",
          "Расширенная аналитика",
          "Отчёты по официальным формам",
        ],
      },
      max: {
        name: "Максимальный",
        note: "По договору",
        badge: "Всё включено",
        features: [
          "Всё из тарифа VIP",
          "Персональный менеджер",
          "Быстрый экспорт реестров",
          "Бренд-кастомизация приложения",
          "SLA: приоритетный ответ",
        ],
      },
    },
  },
  kk: {
    back: "Артқа",
    city_tag: "МТБ · Көкшетау",
    title: "Төрағаларға арналған тарифтер",
    subtitle: "Ашық баға — үйіңіздің әр пәтері үшін төлем. Жасырын төлемдерсіз.",
    calc_title: "Құнын есептеу калькуляторы",
    label_apts: "Пәтерлер саны",
    label_months: "Мерзімі (Стандарт үшін — макс. 3 ай)",
    month_suffix: "ай",
    ref_checkbox: "Жолдама сілтемесі бар",
    ref_discount_badge: "(Стандарт: 50 ₸/пәт)",
    apt_unit: "пәт.",
    per_apt: "пәтеріне",
    ref_price_label: "Жолдама бойынша: 50 ₸",
    ref_banner_title: "🎁 Жолдама бағдарламасы",
    ref_banner_desc: "Жолдама сілтемесі арқылы қосылғанда — төленген барлық кезеңге (ең көбі 3 ай) 120 ₸ орнына 50 ₸/пәт.",
    service_title: "Деректерді сіз үшін енгізу",
    service_badge: "Бір реттік қызмет",
    service_desc: "Қолмен толтырғыңыз келмей ме? Біздің команда барлық пәтерлерді, меншік иелерін және аудандарды жүйеге енгізіп береді. Тізімді ұсынсаңыз болғаны.",
    service_f1: "Әр пәтердің Т.А.Ә., пәтер № және ауданын (м²) енгізу",
    service_f2: "Үйдің және іргелес аумақтың ауданын енгізу",
    service_f3: "Қайталануларды тексеру және тазарту",
    service_f4: "Нәтижені 1 жұмыс күні ішінде тапсыру",
    service_price_from: "2 500-ден",
    service_price_sub: "Үйдегі пәтерлер санына байланысты",
    service_btn: "Қызметке тапсырыс беру",
    cta_title: "Үйді қосуға дайынсыз ба?",
    cta_sub: "Тіркеліп, үйіңізді бүгіннен бастап басқарыңыз.",
    cta_login: "Кабинетке кіру",
    cta_support: "Қолдау қызметіне жазу",
    legal_memorandum: "Ниеттер туралы меморандум (Пилот 50 ₸) →",
    legal_oferta: "МТБ Төрағаларына арналған Қоғамдық Оферта →",
    footer: "Деректер Қазақстан аумағында сақталады.",
    plans: {
      standard: {
        name: "Стандарт",
        note: "3 айдан кейін — шарт бойынша",
        badge: null,
        features: [
          "Хабарландырулар мен ескертулер",
          "Өтінімдер мен чат",
          "Дауыс беру (заңды күші бар)",
          "Есептеулер мен түбіртектер",
          "Бекітілген бағамен 3 айға дейін",
        ],
      },
      vip: {
        name: "VIP",
        note: "Шарт бойынша",
        badge: "Танымал",
        features: [
          "Стандарт тарифінің барлық мүмкіндігі",
          "Басымдықты қолдау",
          "Төрағаның AI-көмекшісі",
          "Кеңейтілген аналитика",
          "Ресми форма бойынша автоесептер",
        ],
      },
      max: {
        name: "Максималды",
        note: "Шарт бойынша",
        badge: "Барлығы қосылған",
        features: [
          "VIP тарифінің барлық мүмкіндігі",
          "Жеке менеджер",
          "Тізілімдерді жылдам экспорттау",
          "Қосымшаны брендке сай баптау",
          "SLA: жедел жауап беру",
        ],
      },
    },
  },
  en: {
    back: "Back",
    city_tag: "HOA · Kokshetau",
    title: "Pricing for Chairmen",
    subtitle: "Transparent pricing — pay for verified apartments in your building. No hidden fees.",
    calc_title: "Cost Calculator",
    label_apts: "Number of apartments",
    label_months: "Duration (Standard — max 3 months)",
    month_suffix: "mo.",
    ref_checkbox: "I have a referral link",
    ref_discount_badge: "(Standard: 50 ₸/apt)",
    apt_unit: "apt.",
    per_apt: "per apartment",
    ref_price_label: "With referral: 50 ₸",
    ref_banner_title: "🎁 Referral Program",
    ref_banner_desc: "When joining with a referral link — price is 50 ₸/apt instead of 120 ₸/apt for the paid period (max 3 months).",
    service_title: "Data Digitization Service",
    service_badge: "One-time Service",
    service_desc: "Don't want to type data manually? Our team will digitize and enter all apartments, owners, and square meters into the system for you.",
    service_f1: "Entering full names, apartment numbers, and areas (m²)",
    service_f2: "Entering building and adjacent territory areas",
    service_f3: "Deduplication and data validation",
    service_f4: "Delivery within 1 business day",
    service_price_from: "from 2,500",
    service_price_sub: "Depends on apartment count in building",
    service_btn: "Order Service",
    cta_title: "Ready to Connect Your Building?",
    cta_sub: "Register and start managing your building today.",
    cta_login: "Log In to Portal",
    cta_support: "Contact Support",
    legal_memorandum: "Memorandum of Understanding (Pilot 50 ₸) →",
    legal_oferta: "Public Offer for HOA Chairmen →",
    footer: "Servers and data are hosted strictly within Kazakhstan.",
    plans: {
      standard: {
        name: "Standard",
        note: "After 3 months — per contract",
        badge: null,
        features: [
          "Announcements and notifications",
          "Requests with statuses & chat",
          "Legally binding online voting",
          "Charges and receipts",
          "Fixed price for up to 3 months",
        ],
      },
      vip: {
        name: "VIP",
        note: "Per contract",
        badge: "Popular",
        features: [
          "Everything in Standard plan",
          "Priority support line",
          "Chairman AI assistant",
          "Extended analytics dashboard",
          "Official annual PDF reports",
        ],
      },
      max: {
        name: "Maximum",
        note: "Per contract",
        badge: "All-Inclusive",
        features: [
          "Everything in VIP plan",
          "Dedicated account manager",
          "Fast registry exports",
          "Custom branding for building app",
          "SLA: priority response time",
        ],
      },
    },
  },
};

export default function PricingPage() {
  const { language } = useTranslation();
  const t = PRICING_I18N[language] || PRICING_I18N.ru;

  const [apartments, setApartments] = useState(50);
  const [months, setMonths] = useState(1);
  const [useRef, setUseRef] = useState(false);

  const calcTotal = (price: number, hasRef: boolean) => {
    const effectivePrice = hasRef && useRef ? 50 : price;
    return effectivePrice * apartments * months;
  };

  const fmt = (n: number) =>
    n.toLocaleString("ru-KZ", { maximumFractionDigits: 0 }) + " ₸";

  const plansData = [
    {
      id: "standard",
      name: t.plans.standard.name,
      icon: Star,
      price: 120,
      refPrice: 50,
      hasRef: true,
      color: "text-primary",
      bgColor: "bg-accent",
      borderColor: "border-primary/30",
      badge: t.plans.standard.badge,
      features: t.plans.standard.features,
      note: t.plans.standard.note,
    },
    {
      id: "vip",
      name: t.plans.vip.name,
      icon: Zap,
      price: 140,
      refPrice: null,
      hasRef: false,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-amber-400/40",
      badge: t.plans.vip.badge,
      features: t.plans.vip.features,
      note: t.plans.vip.note,
    },
    {
      id: "max",
      name: t.plans.max.name,
      icon: Crown,
      price: 160,
      refPrice: null,
      hasRef: false,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-950/30",
      borderColor: "border-violet-400/40",
      badge: t.plans.max.badge,
      features: t.plans.max.features,
      note: t.plans.max.note,
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-5 pb-20 pt-10">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            {t.back}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>

        <p className="text-sm font-semibold tracking-wide text-primary mb-2">
          {t.city_tag}
        </p>
        <h1 className="text-3xl font-bold leading-tight text-balance mb-3">
          {t.title}
        </h1>
        <p className="text-muted-foreground">
          {t.subtitle}
        </p>
      </header>

      {/* Calculator */}
      <section
        className="mb-10 rounded-2xl border border-border bg-card p-5 shadow-sm"
        aria-label="Калькулятор стоимости"
      >
        <div className="flex items-center gap-2 mb-4">
          <Calculator size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">
            {t.calc_title}
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Квартиры */}
          <div>
            <label
              htmlFor="apt-count"
              className="block text-sm text-muted-foreground mb-1.5"
            >
              {t.label_apts}
            </label>
            <input
              id="apt-count"
              type="number"
              min={1}
              max={9999}
              value={apartments}
              onChange={(e) =>
                setApartments(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Месяцы */}
          <div>
            <label
              htmlFor="months"
              className="block text-sm text-muted-foreground mb-1.5"
            >
              {t.label_months}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3].map((m) => (
                <button
                  key={m}
                  id={`month-${m}`}
                  onClick={() => setMonths(m)}
                  className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-colors ${
                    months === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input bg-background text-foreground hover:bg-accent"
                  }`}
                >
                  {m} {t.month_suffix}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Реферальный переключатель */}
        <label
          htmlFor="ref-toggle"
          className="flex items-center gap-3 mt-4 cursor-pointer select-none"
        >
          <div className="relative">
            <input
              id="ref-toggle"
              type="checkbox"
              checked={useRef}
              onChange={(e) => setUseRef(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-11 h-6 rounded-full transition-colors ${
                useRef ? "bg-primary" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  useRef ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </div>
          <span className="text-sm font-medium">
            {t.ref_checkbox}{" "}
            <span className="text-primary font-semibold">
              {t.ref_discount_badge}
            </span>
          </span>
        </label>

        {/* Итоги */}
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {plansData.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border px-4 py-3 ${plan.bgColor} ${plan.borderColor}`}
            >
              <p className={`text-xs font-semibold mb-1 ${plan.color}`}>
                {plan.name}
              </p>
              <p className="text-xl font-bold text-foreground">
                {fmt(calcTotal(plan.price, plan.hasRef))}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {plan.hasRef && useRef
                  ? `${50} ₸ × ${apartments} ${t.apt_unit} × ${months} ${t.month_suffix}`
                  : `${plan.price} ₸ × ${apartments} ${t.apt_unit} × ${months} ${t.month_suffix}`}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Plan cards */}
      <section className="grid gap-5" aria-label="Тарифные планы">
        {plansData.map((plan) => {
          const Icon = plan.icon;
          return (
            <article
              key={plan.id}
              id={`plan-${plan.id}`}
              className={`relative rounded-2xl border bg-card p-6 shadow-sm transition-shadow hover:shadow-md ${plan.borderColor}`}
            >
              {/* Badge */}
              {plan.badge && (
                <span
                  className={`absolute -top-3 left-5 rounded-full px-3 py-0.5 text-xs font-bold ${plan.bgColor} ${plan.color} border ${plan.borderColor}`}
                >
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${plan.bgColor}`}
                  >
                    <Icon size={20} className={plan.color} />
                  </span>
                  <div>
                    <h3 className="font-bold text-lg text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{plan.note}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-foreground">
                    {plan.price} ₸
                  </p>
                  <p className="text-xs text-muted-foreground">{t.per_apt}</p>
                  {plan.hasRef && (
                    <p className="text-xs font-semibold text-primary mt-0.5">
                      {t.ref_price_label}
                    </p>
                  )}
                </div>
              </div>

              <ul className="space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      size={15}
                      className={`mt-0.5 shrink-0 ${plan.color}`}
                    />
                    <span className="text-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {plan.hasRef && (
                <div className="mt-4 rounded-xl bg-accent border border-primary/20 px-4 py-2.5 text-sm">
                  <p className="font-semibold text-primary mb-0.5">
                    {t.ref_banner_title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {t.ref_banner_desc}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {/* Data entry service */}
      <section
        id="service-data-entry"
        className="mt-6 rounded-2xl border border-teal-400/30 bg-teal-50 dark:bg-teal-950/20 p-6 shadow-sm"
        aria-label="Услуга внесения данных"
      >
        <div className="flex items-start gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/40">
            <Database size={20} className="text-teal-600 dark:text-teal-400" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-lg text-foreground">{t.service_title}</h3>
              <span className="rounded-full border border-teal-400/40 bg-teal-100 dark:bg-teal-900/40 px-2.5 py-0.5 text-xs font-bold text-teal-600 dark:text-teal-400">
                {t.service_badge}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t.service_desc}
            </p>
            <ul className="space-y-2 mb-5">
              {[
                t.service_f1,
                t.service_f2,
                t.service_f3,
                t.service_f4,
              ].map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check size={15} className="mt-0.5 shrink-0 text-teal-600 dark:text-teal-400" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between flex-wrap gap-3 rounded-xl border border-teal-400/20 bg-white/60 dark:bg-teal-950/30 px-4 py-3">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {t.service_price_from} <span className="text-base font-semibold text-muted-foreground">₸</span>
                </p>
                <p className="text-xs text-muted-foreground">{t.service_price_sub}</p>
              </div>
              <Button
                asChild
                size="sm"
                className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white"
              >
                <a
                  href="https://t.me/fixlyosibot?start=data_entry"
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="pricing-service-data-entry-cta"
                >
                  {t.service_btn}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Юридические ссылки */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
        <Link
          href="/legal/memorandum-pilot"
          className="text-primary font-medium hover:underline"
        >
          {t.legal_memorandum}
        </Link>
        <Link
          href="/legal/oferta-osi"
          className="text-primary font-medium hover:underline"
        >
          {t.legal_oferta}
        </Link>
      </div>

      {/* CTA */}
      <section className="mt-8 text-center">
        <h2 className="text-xl font-bold mb-2">{t.cta_title}</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {t.cta_sub}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="h-12 rounded-2xl text-base font-bold">
            <Link href="/login" data-testid="pricing-cta-app">
              {t.cta_login}
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-2xl text-base"
          >
            <a
              href="https://t.me/fixlyosibot"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="pricing-cta-contact"
            >
              {t.cta_support}
            </a>
          </Button>
        </div>
      </section>

      <footer className="mt-10 text-xs text-muted-foreground text-center">
        <p>{t.footer}</p>
      </footer>
    </main>
  );
}
