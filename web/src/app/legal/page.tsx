"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, FileText, Building2, Wrench, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const LEGAL_INDEX_I18N = {
  ru: {
    back: "Главная",
    badge: "Правовой центр Fixly",
    title: "Официальные документы и оферты",
    subtitle: "Прозрачные правила, регламенты и защита персональных данных для всех участников платформы в соответствии с законодательством Республики Казахстан.",
    open_doc: "Открыть документ",
    gov_badge: "Республика Казахстан · Закон № 94-V",
    categories: [
      {
        category: "Для Жителей и Арендаторов",
        iconKey: "resident",
        color: "text-blue-500 bg-blue-500/10",
        items: [
          {
            title: "Публичная оферта для Жильцов",
            desc: "Условия бесплатного использования дома, подачи заявок, вызова мастеров и правила оплаты.",
            href: "/legal/terms",
            badge: "Основной документ",
          },
          {
            title: "Политика конфиденциальности",
            desc: "Порядок защиты и обработки персональных данных согласно Закону РК «О персональных данных».",
            href: "/legal/privacy",
            badge: "Закон РК",
          },
        ],
      },
      {
        category: "Для Председателей ОСИ / НСУ / УК",
        iconKey: "osi",
        color: "text-primary bg-primary/10",
        items: [
          {
            title: "Публичная Оферта для Председателей ОСИ",
            desc: "Тарифы (от 120 ₸/кв), регламент обслуживания дома, права и обязанности органа управления.",
            href: "/legal/oferta-osi",
            badge: "ОСИ / НСУ / УК",
          },
          {
            title: "Меморандум о намерениях (Пилот 50 ₸)",
            desc: "Специальные льготные условия для первых домов: 50 ₸ на первые 3 месяца и оцифровка от 2 500 ₸.",
            href: "/legal/memorandum-pilot",
            badge: "Пилот 50 ₸",
          },
        ],
      },
      {
        category: "Для Мастеров и Сервисных служб",
        iconKey: "master",
        color: "text-amber-500 bg-amber-500/10",
        items: [
          {
            title: "Публичная оферта для Мастеров",
            desc: "Статус независимого исполнителя, комиссия платформы 3%, запрет прямых расчетов в обход сервиса.",
            href: "/legal/terms-master",
            badge: "Мастерам 3%",
          },
          {
            title: "Технологический регламент выполнения работ",
            desc: "Обязательные стандарты для сантехников, электриков, отделочников и фотопротокол ДО/ПОСЛЕ.",
            href: "/legal/master-rules",
            badge: "Стандарты качества",
          },
        ],
      },
    ],
    info_title: "100% юридическая чистота по законам РК",
    info_p1: "Все взаимоотношения на платформе регулируются Гражданским кодексом РК, Законом РК «О жилищных отношениях» и Законом РК «О персональных данных и их защите».",
    info_p2: "Серверы и базы данных размещены на территории Республики Казахстан.",
  },
  kk: {
    back: "Басты бет",
    badge: "Fixly құқықтық орталығы",
    title: "Ресми құжаттар мен оферталар",
    subtitle: "Қазақстан Республикасының заңнамасына сәйкес платформаның барлық қатысушылары үшін ашық ережелер, регламенттер және дербес деректерді қорғау.",
    open_doc: "Құжатты ашу",
    gov_badge: "Қазақстан Республикасы · № 94-V Заңы",
    categories: [
      {
        category: "Тұрғындар мен жалға алушыларға",
        iconKey: "resident",
        color: "text-blue-500 bg-blue-500/10",
        items: [
          {
            title: "Тұрғындарға арналған Қоғамдық Оферта",
            desc: "Үй функцияларын тегін пайдалану, өтінімдер беру, шеберлерді шақыру және төлем ережелері.",
            href: "/legal/terms",
            badge: "Негізгі құжат",
          },
          {
            title: "Құпиялылық саясаты",
            desc: "ҚР «Дербес деректер және оларды қорғау туралы» Заңына сәйкес деректерді өңдеу және қорғау тәртібі.",
            href: "/legal/privacy",
            badge: "ҚР Заңы",
          },
        ],
      },
      {
        category: "МТБ / НСУ / УК Төрағалары мен Басқарушыларына",
        iconKey: "osi",
        color: "text-primary bg-primary/10",
        items: [
          {
            title: "МТБ Төрағаларына арналған Қоғамдық Оферта",
            desc: "Тарифтер (пәтеріне 120 ₸-ден), үйге қызмет көрсету регламенті, басқару органының құқықтары мен міндеттері.",
            href: "/legal/oferta-osi",
            badge: "МТБ / НСУ",
          },
          {
            title: "Ниеттер туралы меморандум (Пилот 50 ₸)",
            desc: "Алғашқы үйлерге арналған жеңілдікті шарттар: алғашқы 3 айға 50 ₸ және 2 500 ₸-ден бастап оцифровка.",
            href: "/legal/memorandum-pilot",
            badge: "Пилот 50 ₸",
          },
        ],
      },
      {
        category: "Шеберлер мен сервистік қызметтерге",
        iconKey: "master",
        color: "text-amber-500 bg-amber-500/10",
        items: [
          {
            title: "Шеберлерге арналған Қоғамдық Оферта",
            desc: "Тәуелсіз мердігер мәртебесі, платформаның 3% комиссиясы, қызметті айналып өтіп есеп айырысуға тыйым салу.",
            href: "/legal/terms-master",
            badge: "Шеберлерге 3%",
          },
          {
            title: "Жұмыстарды орындаудың техникалық регламенті",
            desc: "Сантехниктер, электриктер, әрлеушілер үшін міндетті сапа стандарттары және ДЕЙІН/КЕЙІН фотоесебі.",
            href: "/legal/master-rules",
            badge: "Сапа стандарттары",
          },
        ],
      },
    ],
    info_title: "ҚР заңдары бойынша 100% заңды тазалық",
    info_p1: "Платформадағы барлық қатынастар ҚР Азаматтық кодексімен, ҚР «Тұрғын үй қатынастары туралы» Заңымен және ҚР «Дербес деректер және оларды қорғау туралы» Заңымен реттеледі.",
    info_p2: "Барлық серверлер мен деректер базасы Қазақстан Республикасының аумағында орналасқан.",
  },
  en: {
    back: "Home",
    badge: "Fixly Legal Center",
    title: "Official Documents & Public Offers",
    subtitle: "Transparent terms, technical regulations, and personal data protection for all platform participants in full compliance with the Republic of Kazakhstan legislation.",
    open_doc: "Open Document",
    gov_badge: "Republic of Kazakhstan · Law № 94-V",
    categories: [
      {
        category: "For Residents & Tenants",
        iconKey: "resident",
        color: "text-blue-500 bg-blue-500/10",
        items: [
          {
            title: "Public Offer for Residents",
            desc: "Free building features, maintenance request filing, master hiring rules, and payment terms.",
            href: "/legal/terms",
            badge: "Core Document",
          },
          {
            title: "Privacy & Data Protection Policy",
            desc: "Personal data processing and protection standards pursuant to RK Law 'On Personal Data and its Protection'.",
            href: "/legal/privacy",
            badge: "RK Law",
          },
        ],
      },
      {
        category: "For HOA / OSI / PT Chairmen",
        iconKey: "osi",
        color: "text-primary bg-primary/10",
        items: [
          {
            title: "Public Offer for HOA Chairmen",
            desc: "Subscription tariffs (from 120 ₸/apt), building management workflow, rights and responsibilities of governing bodies.",
            href: "/legal/oferta-osi",
            badge: "HOA / OSI",
          },
          {
            title: "Memorandum of Understanding (Pilot 50 ₸)",
            desc: "Special promotional terms for pilot buildings: 50 ₸ for the first 3 months and registry digitization from 2,500 ₸.",
            href: "/legal/memorandum-pilot",
            badge: "Pilot 50 ₸",
          },
        ],
      },
      {
        category: "For Masters & Service Contractors",
        iconKey: "master",
        color: "text-amber-500 bg-amber-500/10",
        items: [
          {
            title: "Public Offer for Masters",
            desc: "Independent contractor status, 3% platform commission, prohibition of direct cash settlement bypassing the app.",
            href: "/legal/terms-master",
            badge: "Masters 3%",
          },
          {
            title: "Technological Work Regulations",
            desc: "Mandatory safety & quality standards for plumbers, electricians, and finish workers with BEFORE/AFTER photo protocol.",
            href: "/legal/master-rules",
            badge: "Quality Standards",
          },
        ],
      },
    ],
    info_title: "100% Legal Compliance under Kazakhstan Law",
    info_p1: "All platform relations are governed by the RK Civil Code, the RK Law 'On Housing Relations', and the RK Law 'On Personal Data and Its Protection'.",
    info_p2: "Servers and databases are strictly located within the territory of the Republic of Kazakhstan.",
  },
};

function getCategoryIcon(key: string) {
  switch (key) {
    case "resident":
      return FileText;
    case "osi":
      return Building2;
    case "master":
      return Wrench;
    default:
      return ShieldCheck;
  }
}

export default function LegalIndexPage() {
  const { language } = useTranslation();
  const t = LEGAL_INDEX_I18N[language] || LEGAL_INDEX_I18N.ru;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            {t.back}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary mb-4">
            <ShieldCheck size={14} />
            <span>{t.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4 text-balance">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base leading-relaxed text-balance">
            {t.subtitle}
          </p>
        </div>

        {/* Categories */}
        <div className="grid gap-8 mb-16">
          {t.categories.map((cat, idx) => {
            const Icon = getCategoryIcon(cat.iconKey);
            return (
              <div key={idx} className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className={`flex size-8 items-center justify-center rounded-xl ${cat.color}`}>
                    <Icon size={18} />
                  </span>
                  <h2 className="text-lg font-bold text-foreground">
                    {cat.category}
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {cat.items.map((doc, docIdx) => (
                    <Link
                      key={docIdx}
                      href={doc.href}
                      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <span className="rounded-lg bg-accent px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                            {doc.badge}
                          </span>
                          <ChevronRight
                            size={16}
                            className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                          />
                        </div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-base mb-1.5">
                          {doc.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {doc.desc}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <span>{t.open_doc}</span>
                        <ChevronRight size={13} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legal Disclaimer Box */}
        <div className="rounded-2xl border border-border bg-accent/40 p-6 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-primary mb-2">
            <ShieldCheck size={16} />
            <span>{t.info_title}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t.info_p1} {t.info_p2}
          </p>
        </div>
      </main>
    </div>
  );
}
