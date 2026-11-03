"use client";

import Link from "next/link";
import { ArrowLeft, Wrench, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const MASTER_TERMS_I18N = {
  ru: {
    back: "Все документы",
    nav_resident: "🏠 Жильцам",
    nav_osi: "🏢 Председателям ОСИ",
    nav_master: "🛠 Мастерам",
    nav_privacy: "🛡 Конфиденциальность",
    tag: "Мастерам и специалистам",
    title: "Публичная оферта для Мастеров платформы Fixly",
    edition: "Редакция 3.0 от 2026 года · Республика Казахстан",
    summary_title: "💡 Краткая и понятная суть для Мастера:",
    summary_items: [
      { bold: "Статус", text: ": Вы работаете на себя (ИП, самозанятый или физлицо). Fixly — ваш цифровой инструмент для поиска заказов, а не работодатель." },
      { bold: "Комиссия 3%", text: ": Платформа удерживает 3% сервисного сбора за предоставление заказов." },
      { bold: "Запрет увода клиентов", text: ": Запрещено предлагать жильцам оплату напрямую в обход приложения ради ухода от комиссии (за нарушение — блокировка)." },
      { bold: "Ответственность за качество", text: ": За качество работы, затопления или короткие замыкания отвечает мастер; за заводской брак материалов жильца отвечает жилец/продавец." },
    ],
    sections: [
      {
        title: "1. Предмет оферты",
        text: "Fixly предоставляет Мастеру право доступа к витрине заявок жителей на сантехнические, электромонтажные, отделочные и аварийно-восстановительные работы через мобильное приложение и веб-интерфейс.",
      },
      {
        title: "2. Вознаграждение и комиссия платформы",
        text: "Размер комиссии платформы составляет 3% (три процента) от согласованной стоимости выполненного заказа. Списание комиссии осуществляется автоматически при закрытии заявки.",
      },
      {
        title: "3. Правила взаимодействия с Заказчиками",
        items: [
          "Мастер обязуется выходить на связь в согласованное время;",
          "Окончательная цена работ фиксируется в чате заявки ДО начала выполнения;",
          "Строго запрещены попытки склонения заказчика к отмене заявки в приложении для расчета наличными в обход сервиса;",
          "При нарушении правила сервис оставляет за собой право бессрочной блокировки профиля.",
        ],
      },
      {
        title: "4. Гарантийные обязательства",
        text: "Мастер предоставляет базовую гарантию на выполненные монтажные и ремонтные работы сроком не менее 30 календарных дней со дня сдачи результата заказчику.",
      },
      {
        title: "5. Акцепт оферты",
        text: "Отправка анкеты мастера на верификацию или первый отклик на заказ в приложении является полным и безоговорочным акцептом условий настоящей Оферты.",
      },
    ],
  },
  kk: {
    back: "Барлық құжаттар",
    nav_resident: "🏠 Тұрғындарға",
    nav_osi: "🏢 Төрағаларға",
    nav_master: "🛠 Шеберлерге",
    nav_privacy: "🛡 Құпиялылық",
    tag: "Шеберлер мен мамандарға",
    title: "Fixly платформасының шеберлеріне арналған Қоғамдық Оферта",
    edition: "2026 жылғы 3.0 редакциясы · Қазақстан Республикасы",
    summary_title: "💡 Шеберге арналған негізгі мәні:",
    summary_items: [
      { bold: "Мәртебесі", text: ": Сіз өзіңіз үшін жұмыс істейсіз (ЖК, өзін-өзі жұмыспен қамтыған). Fixly — сіздің жұмыс берушіңіз емес, тапсырыстар табу құралыңыз." },
      { bold: "3% комиссия", text: ": Платформа ұсынылған тапсырыстар үшін 3% сервистік алым ұстайды." },
      { bold: "Клиенттерді алып кетуге тыйым", text: ": Комиссиядан жалтару мақсатында қосымшаны айналып өтіп қолма-қол төлеуді ұсынуға қатаң тыйым салынады (бұғаттау қарастырылған)." },
      { bold: "Сапа үшін жауапкершілік", text: ": Жұмыс сапасы, су басу немесе тұйықталу салдарына шебер жауапты; материалдардың зауыттық ақауына сатушы жауапты." },
    ],
    sections: [
      {
        title: "1. Офертаның мәні",
        text: "Fixly Шеберге мобильді қосымша мен веб-интерфейс арқылы тұрғындардың сантехникалық, электрлік, әрлеу және апаттық жөндеу өтінімдеріне қол жеткізу құқығын береді.",
      },
      {
        title: "2. Сыйақы және платформа комиссиясы",
        text: "Платформа комиссиясының мөлшері орындалған тапсырыстың келісілген құнының 3% (үш пайызын) құрайды. Комиссия тапсырыс жабылған кезде автоматты түрде алынады.",
      },
      {
        title: "3. Тапсырыс берушілермен өзара әрекеттесу ережелері",
        items: [
          "Шебер келісілген уақытта байланысқа шығуға міндетті;",
          "Жұмыстың соңғы бағасы басталғанға ДЕЙІН өтінім чатында бекітіледі;",
          "Тапсырыс берушіні қосымшадағы өтінімнен бас тартып, қолма-қол есеп айырысуға көндіруге қатаң тыйым салынады;",
          "Ереже бұзылған жағдайда сервис профильді мерзімсіз бұғаттау құқығын өзіне қалдырады.",
        ],
      },
      {
        title: "4. Кепілдік міндеттемелері",
        text: "Шебер орындалған жұмыстарға тапсырыс берушіге тапсырылған күннен бастап кемінде 30 күнтізбелік күн мерзіміне базалық кепілдік береді.",
      },
      {
        title: "5. Офертаны қабылдау (акцепт)",
        text: "Шебер сауалнамасын тексеруге жіберу немесе қосымшада тапсырысқа алғашқы жауап беру осы Оферта шарттарын толық қабылдау болып табылады.",
      },
    ],
  },
  en: {
    back: "All Documents",
    nav_resident: "🏠 Residents",
    nav_osi: "🏢 Chairmen",
    nav_master: "🛠 Masters",
    nav_privacy: "🛡 Privacy",
    tag: "For Masters & Specialists",
    title: "Public Offer for Fixly Platform Masters",
    edition: "Edition 3.0 of 2026 · Republic of Kazakhstan",
    summary_title: "💡 Key Terms for Masters in Brief:",
    summary_items: [
      { bold: "Status", text: ": You operate independently (sole proprietorship, self-employed). Fixly is your digital job board, not an employer." },
      { bold: "3% Commission", text: ": The platform charges a 3% service fee for completed jobs." },
      { bold: "No Direct Settlement Bypass", text: ": Direct offline cash arrangements intended to evade platform fees result in immediate account ban." },
      { bold: "Workmanship Liability", text: ": Quality, water damage, or electrical hazards are the master's direct liability; material factory defects are covered by the supplier." },
    ],
    sections: [
      {
        title: "1. Subject of the Offer",
        text: "Fixly grants the Master access to residential maintenance listings (plumbing, electrical, finishing, and emergency repair) via the mobile app and web portal.",
      },
      {
        title: "2. Platform Fees",
        text: "The platform commission is 3% (three percent) of the agreed completed job value. The fee is charged automatically upon order completion.",
      },
      {
        title: "3. Client Interaction Rules",
        items: [
          "Master must arrive at the agreed time slot;",
          "Final repair prices must be agreed upon in the app chat BEFORE commencing work;",
          "Soliciting clients to cancel app orders for offline cash payments is strictly prohibited;",
          "Violating this rule will result in a permanent ban of the specialist profile.",
        ],
      },
      {
        title: "4. Warranty Obligations",
        text: "The Master provides a workmanship warranty of at least 30 calendar days from the date of final job handover.",
      },
      {
        title: "5. Acceptance of the Offer",
        text: "Submitting a master registration questionnaire or responding to an open repair job constitutes full and irrevocable acceptance of this Offer.",
      },
    ],
  },
};

export default function MasterTermsPage() {
  const { language } = useTranslation();
  const t = MASTER_TERMS_I18N[language] || MASTER_TERMS_I18N.ru;

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
            className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.nav_osi}
          </Link>
          <Link
            href="/legal/terms-master"
            className="rounded-xl bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold shadow-sm"
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

        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm mb-2">
          <Wrench size={18} />
          <span>{t.tag}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          {t.title}
        </h1>
        <p className="text-xs text-muted-foreground mb-8">
          {t.edition}
        </p>

        {/* Краткая выжимка для удобства */}
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 mb-8">
          <h2 className="text-base font-bold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
            {t.summary_title}
          </h2>
          <ul className="space-y-2 text-xs text-foreground/90">
            {t.summary_items.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 size={15} className="text-amber-600 shrink-0 mt-0.5" />
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
              {sec.items && (
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {sec.items.map((it, itIdx) => (
                    <li key={itIdx}>{it}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
