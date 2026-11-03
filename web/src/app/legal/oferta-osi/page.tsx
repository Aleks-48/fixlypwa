"use client";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ArrowLeft,Building2,CheckCircle2 } from "lucide-react";
import Link from "next/link";

const OFERTA_OSI_I18N = {
  ru: {
    back: "Все документы",
    nav_resident: "🏠 Жильцам",
    nav_osi: "🏢 Председателям ОСИ",
    nav_master: "🛠 Мастерам",
    nav_privacy: "🛡 Конфиденциальность",
    tag: "Органам управления кондоминиумом",
    title: "Публичная Оферта для Председателей ОСИ / НСУ / УК",
    edition: "Редакция 3.0 от 2026 года · Республика Казахстан",
    summary_title: "💡 Краткая суть для Председателя:",
    summary_items: [
      { bold: "Электронный учет", text: ": Автоматическое формирование годовых и финансовых отчетов по утвержденной форме Минпрома РК." },
      { bold: "Прозрачные тарифы", text: ": Базовая цена от 120 ₸ за квартиру в месяц (по промо-программе — 50 ₸ на первые 3 месяца)." },
      { bold: "Помощь во внесении данных", text: ": Оцифровка домовой книги и поквартирного списка силами специалистов Fixly от 2 500 ₸ за дом." },
      { bold: "Общедомовое имущество", text: ": Проведение работ на общедомовых коммуникациях (стояки, подвал) осуществляется под контролем председателя." },
    ],
    sections: [
      {
        title: "1. Предмет соглашения",
        text: "Платформа Fixly предоставляет органам управления объектами кондоминиума (ОСИ / НСУ / УК) информационно-технологический комплекс для цифровизации процессов управления многоквартирными жилыми домами в соответствии с Законом РК «О жилищных отношениях».",
      },
      {
        title: "2. Тарифная сетка и оплата",
        custom: "tariffs",
      },
      {
        title: "3. Услуга первичного занесения данных",
        text: "Для ускоренного старта Председатель может заказать оцифровку поквартирного списка дома силами сервиса Fixly по фиксированной стоимости от 2 500 ₸ за дом.",
      },
      {
        title: "4. Безопасность и хранение данных",
        text: "Все данные реестров собственников и финансовые показатели хранятся на серверах в Республике Казахстан в строгом соответствии с Законом РК «О персональных данных и их защите».",
      },
      {
        title: "5. Акцепт оферты",
        text: "Регистрация дома на платформе Fixly и выбор тарифного плана является полным принятием настоящей Публичной оферты.",
      },
    ],
    tariffs: [
      { name: "Стандарт", price: "120 ₸", sub: "/кв", note: "50 ₸ первые 3 мес. по реферальной программе" },
      { name: "VIP", price: "140 ₸", sub: "/кв", note: "Приоритетная линия техподдержки" },
      { name: "Максимальный", price: "160 ₸", sub: "/кв", note: "Полная автоматизация и аналитика" },
    ],
  },
  kk: {
    back: "Барлық құжаттар",
    nav_resident: "🏠 Тұрғындарға",
    nav_osi: "🏢 Төрағаларға",
    nav_master: "🛠 Шеберлерге",
    nav_privacy: "🛡 Құпиялылық",
    tag: "Кондоминиумды басқару органдарына",
    title: "МТБ / НСУ / УК Төрағалары мен Басқарушыларына арналған Қоғамдық Оферта",
    edition: "2026 жылғы 3.0 редакциясы · Қазақстан Республикасы",
    summary_title: "💡 Төрағаға арналған негізгі мәні:",
    summary_items: [
      { bold: "Электрондық есепке алу", text: ": ҚР Өнеркәсіп және құрылыс министрлігінің ресми формасына сәйкес жылдық және қаржылық есептерді автоматты түрде жасау." },
      { bold: "Ашық тарифтер", text: ": Пәтеріне айына 120 ₸-ден бастап (промо-бағдарлама бойынша — алғашқы 3 айға 50 ₸)." },
      { bold: "Деректерді енгізуге көмек", text: ": Fixly мамандарының күшімен үй тізілімін сандық форматқа көшіру — әр үйге 2 500 ₸-ден бастап." },
      { bold: "Ортақ мүлік", text: ": Ортақ үй коммуникацияларындағы (тік құбырлар, жертөле) жөндеу жұмыстары төрағаның бақылауымен жүргізіледі." },
    ],
    sections: [
      {
        title: "1. Келісімнің мәні",
        text: "Fixly платформасы ҚР «Тұрғын үй қатынастары туралы» Заңына сәйкес көппәтерлі тұрғын үйлерді басқару процестерін цифрландыру үшін кондоминиум басқару органдарына (МТБ / НСУ / УК) ақпараттық-технологиялық кешенді ұсынады.",
      },
      {
        title: "2. Тарифтік кесте және төлем",
        custom: "tariffs",
      },
      {
        title: "3. Деректерді бастапқы енгізу қызметі",
        text: "Жүйеге жылдам кіру үшін Төраға Fixly мамандарына үй тізімін енгізу қызметіне әр үйге 2 500 ₸ бекітілген бағасымен тапсырыс бере алады.",
      },
      {
        title: "4. Деректер қауіпсіздігі және оларды сақтау",
        text: "Меншік иелерінің тізілімдері мен қаржылық көрсеткіштер ҚР «Дербес деректер және оларды қорғау туралы» Заңына қатаң сәйкестікте Қазақстан Республикасындағы серверлерде сақталады.",
      },
      {
        title: "5. Офертаны қабылдау (акцепт)",
        text: "Fixly платформасында үйді тіркеу және тарифтік жоспарды таңдау осы Қоғамдық офертаны толық қабылдау болып табылады.",
      },
    ],
    tariffs: [
      { name: "Стандарт", price: "120 ₸", sub: "/пәт", note: "Жолдама бойынша алғашқы 3 айға 50 ₸" },
      { name: "VIP", price: "140 ₸", sub: "/пәт", note: "Басымдықты техникалық қолдау желісі" },
      { name: "Максималды", price: "160 ₸", sub: "/пәт", note: "Толық автоматтандыру және аналитика" },
    ],
  },
  en: {
    back: "All Documents",
    nav_resident: "🏠 Residents",
    nav_osi: "🏢 Chairmen",
    nav_master: "🛠 Masters",
    nav_privacy: "🛡 Privacy",
    tag: "Condominium Management Bodies",
    title: "Public Offer for HOA / OSI Chairmen",
    edition: "Edition 3.0 of 2026 · Republic of Kazakhstan",
    summary_title: "💡 Key Terms for Chairmen in Brief:",
    summary_items: [
      { bold: "Automated Records", text: ": Generation of official annual PDF financial statements strictly conforming to RK Ministry standards." },
      { bold: "Transparent Tariffs", text: ": Base price from 120 ₸ per apartment/month (50 ₸ promotional pilot rate for the first 3 months)." },
      { bold: "Data Entry Assistance", text: ": Registry digitization and onboarding services by Fixly specialists from 2,500 ₸ per building." },
      { bold: "Common Property", text: ": Maintenance work on general utilities (risers, basements) is supervised directly by the chairman." },
    ],
    sections: [
      {
        title: "1. Subject of Agreement",
        text: "The Fixly platform provides condominium governing bodies (HOA / OSI / PT) with a digital SaaS ecosystem for multi-apartment building administration in compliance with the RK Law 'On Housing Relations'.",
      },
      {
        title: "2. Tariff Grid & Billing",
        custom: "tariffs",
      },
      {
        title: "3. Primary Data Onboarding Service",
        text: "To speed up setup, the Chairman may order building and apartment registry digitization by the Fixly team from 2,500 ₸ per building.",
      },
      {
        title: "4. Data Storage and Protection",
        text: "All homeowner registries and financial records are strictly hosted on Kazakhstani servers pursuant to RK Law 'On Personal Data and its Protection'.",
      },
      {
        title: "5. Acceptance of the Offer",
        text: "Registering a building on the Fixly portal and choosing a subscription plan constitutes complete acceptance of this Public Offer.",
      },
    ],
    tariffs: [
      { name: "Standard", price: "120 ₸", sub: "/apt", note: "50 ₸ first 3 months via referral program" },
      { name: "VIP", price: "140 ₸", sub: "/apt", note: "Priority support hotline" },
      { name: "Maximum", price: "160 ₸", sub: "/apt", note: "Full automation and deep analytics" },
    ],
  },
};

export default function OfertaOsiPage() {
  const { language } = useTranslation();
  const t = OFERTA_OSI_I18N[language] || OFERTA_OSI_I18N.ru;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link
            href="/legal"
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

      <main className="mx-auto max-w-3xl px-5 py-10 leading-relaxed">
        {/* Навигация по ролям */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link
            href="/legal/terms"
            className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.nav_resident}
          </Link>
          <Link
            href="/legal/oferta-osi"
            className="rounded-xl bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold shadow-sm"
          >
            {t.nav_osi}
          </Link>
          <Link
            href="/legal/terms-master"
            className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.nav_master}
          </Link>
          <Link
            href="/legal/privacy"
            className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.nav_privacy}
          </Link>
        </div>

        <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
          <Building2 size={18} />
          <span>{t.tag}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          {t.title}
        </h1>
        <p className="text-xs text-muted-foreground mb-8">
          {t.edition}
        </p>

        {/* Краткая выжимка для удобства */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-8">
          <h2 className="text-base font-bold text-primary mb-2 flex items-center gap-2">
            {t.summary_title}
          </h2>
          <ul className="space-y-2 text-xs text-foreground/90">
            {t.summary_items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                <span><b>{item.bold}</b>{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <section className="space-y-6 text-sm">
          {t.sections.map((sec, idx) => (
            <div key={idx}>
              <h2 className="text-lg font-bold text-foreground mb-2">{sec.title}</h2>
              {sec.text && <p className="text-muted-foreground">{sec.text}</p>}
              {sec.custom === "tariffs" && (
                <div className="grid gap-3 sm:grid-cols-3 mt-3">
                  {t.tariffs.map((plan, pIdx) => (
                    <div
                      key={pIdx}
                      className={`rounded-xl border p-3.5 ${
                        pIdx === 1
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <p className="font-bold text-xs text-primary">{plan.name}</p>
                      <p className="text-base font-extrabold text-foreground mt-0.5">
                        {plan.price} <span className="text-xs font-normal text-muted-foreground">{plan.sub}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">{plan.note}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
