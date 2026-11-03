"use client";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
ArrowRight,
BellRing,
Building2,
Calculator,
CheckCircle2,
FileSpreadsheet,
FileText,
Home,
MessageCircle,
Play,
ShieldCheck,
Sparkles,
Users,
Vote,
Wrench,
} from "lucide-react";
import Link from "next/link";
import React from "react";

const LANDING_TEXT = {
  ru: {
    subtitle: "Платформа ОСИ",
    pricing: "Тарифы",
    video_guide: "Видеоинструкции",
    video_banner_title: "Обучающие видеоинструкции по работе с Fixly",
    video_banner_desc: "Посмотрите наглядные видео: как быстро войти без пароля, подать заявку мастеру с фото и формировать годовые отчеты ОСИ.",
    video_banner_btn: "Смотреть видеоуроки",
    login: "Войти в кабинет",
    badge: "Цифровая экосистема для домов Казахстана 🇰🇿",
    hero_title_1: "Управление домом",
    hero_title_2: "без беготни и бумаг",
    hero_desc:
      "Единая система для председателей ОСИ, жильцов и мастеров. Юридически значимые голосования, заявки с фото, автоматические отчеты и прозрачный учет — в одном месте.",
    btn_try: "Попробовать сейчас",
    btn_calc: "Рассчитать тариф",
    trust_law: "По закону РК о жилищных отношениях",
    trust_storage: "Хранение данных в Казахстане",
    trust_social: "Рассылки в WhatsApp и Telegram",
    roles_title: "Для кого создана платформа",
    roles_subtitle: "Выберите свою роль для быстрого доступа к необходимым инструментам",
    role_ch_title: "Председателям ОСИ / НСУ / УК",
    role_ch_sub: "Управляйте домом, голосованиями, финансами и отчетами по форме № 163 Минпрома РК в единой системе.",
    role_ch_f1: "Автоматические годовые отчеты в PDF",
    role_ch_f2: "Импорт квартир из списков и Excel",
    role_ch_f3: "Быстрые рассылки в чаты жителей",
    role_ch_btn: "Кабинет Председателя",
    role_res_title: "Жильцам домов",
    role_res_sub: "Всё о вашем доме прямо в смартфоне",
    role_res_f1: "Подача заявок на ремонт с фото",
    role_res_f2: "Голосования и опросы онлайн",
    role_res_f3: "Прозрачные квитанции и начисления",
    role_res_btn: "Кабинет Жильца",
    role_m_title: "Мастерам и службам",
    role_m_sub: "Заказы от жителей города без посредников",
    role_m_f1: "Лента заказов: сантехника, электрика",
    role_m_f2: "Карта мастеров и профиль с отзывами",
    role_m_f3: "Прямая связь с клиентами",
    role_m_btn: "Кабинет Мастера",
    features_title: "Всё для порядка в вашем доме",
    features_subtitle: "Простые и надежные функции, решающие повседневные задачи",
    feat_1_title: "Голосования и кворум",
    feat_1_desc: "Легитимный подсчет голосов собственников без сбора подписей по квартирам.",
    feat_2_title: "Объявления с рассылкой",
    feat_2_desc: "Публикуйте важные новости дома с быстрой отправкой в WhatsApp и Telegram.",
    feat_3_title: "Автоотчёты в 1 клик",
    feat_3_desc: "Годовые и финансовые отчеты формируются автоматически в печатный формат PDF.",
    feat_4_title: "Массовый импорт",
    feat_4_desc: "Загружайте весь дом с квартирами и жителями за пару секунд из списка.",
    feat_5_title: "Реестр собственников",
    feat_5_desc: "Актуальная база жильцов, площадей и комнат без риска потери данных.",
    feat_6_title: "Заявки и мастера",
    feat_6_desc: "Контроль выполнения заявок по сантехнике, электрике и благоустройству.",
    cta_title: "Прозрачные тарифы без скрытых платежей",
    cta_desc:
      "Оплата только за реальное количество квартир в вашем доме. От 120 ₸ за квартиру в месяц (от 50 ₸ по реферальной программе).",
    cta_btn_calc: "Посмотреть тарифы и калькулятор →",
    cta_btn_tg: "Связаться в Telegram",
    footer_title: "Fixly — Цифровая платформа ОСИ",
    footer_desc: "Серверы и персональные данные хранятся на территории Республики Казахстан.",
    footer_support: "Поддержка",
  },
  kk: {
    subtitle: "МТБ платформасы",
    pricing: "Тарифтер",
    video_guide: "Бейненұсқаулық",
    video_banner_title: "Fixly жүйесі бойынша бейненұсқаулықтар",
    video_banner_desc: "Көрнекі бейнелер: жүйеге жылдам кіру, шеберлерге фотомен өтінім беру және МТБ жылдық есептері.",
    video_banner_btn: "Бейнелерді көру",
    login: "Кабинетке кіру",
    badge: "Қазақстан үйлеріне арналған цифрлық экожүйе 🇰🇿",
    hero_title_1: "Үйді басқару —",
    hero_title_2: "артық жүгіріссіз және қағазсыз",
    hero_desc:
      "МТБ төрағаларына, тұрғындарға және шеберлерге арналған бірыңғай жүйе. Заңды онлайн дауыс беру, фотосы бар өтінімдер, автоматты есептер мен ашық есеп жүргізу — бір жерде.",
    btn_try: "Қазір көру",
    btn_calc: "Тарифті есептеу",
    trust_law: "ҚР Тұрғын үй қатынастары туралы заңына сай",
    trust_storage: "Деректер Қазақстан аумағында сақталады",
    trust_social: "WhatsApp және Telegram-ға тарату",
    roles_title: "Платформа кімдерге арналған",
    roles_subtitle: "Қажетті құралдарға жылдам кіру үшін өз рөліңізді таңдаңыз",
    role_ch_title: "МТБ / НСУ / УК төрағаларына",
    role_ch_sub: "Күнделікті қоңыраулар мен күйбең тірліктен аптасына 15 сағат үнемдеңіз",
    role_ch_f1: "PDF форматындағы автоматты жылдық есептер",
    role_ch_f2: "Пәтерлерді тізімнен және Excel-ден жүктеу",
    role_ch_f3: "Тұрғындар чатына жылдам хабарлама жіберу",
    role_ch_btn: "Төраға кабинеті",
    role_res_title: "Үй тұрғындарына",
    role_res_sub: "Үйіңіз туралы барлық ақпарат смартфоныңызда",
    role_res_f1: "Жөндеуге фотомен өтінім беру",
    role_res_f2: "Онлайн дауыс беру және сауалнамалар",
    role_res_f3: "Ашық түбіртектер мен төлемдер",
    role_res_btn: "Тұрғын кабинеті",
    role_m_title: "Шеберлер мен қызметтерге",
    role_m_sub: "Қала тұрғындарынан делдалсыз тапсырыстар",
    role_m_f1: "Тапсырыстар тізімі: сантехника, электрика",
    role_m_f2: "Шеберлер картасы және пікірлері бар профиль",
    role_m_f3: "Тапсырыс берушілермен тікелей байланыс",
    role_m_btn: "Шебер кабинеті",
    features_title: "Үйіңіздегі тәртіпке қажеттінің бәрі",
    features_subtitle: "Күнделікті міндеттерді шешетін қарапайым және сенімді функциялар",
    feat_1_title: "Дауыс беру және кворум",
    feat_1_desc: "Пәтерлерді аралап қол жинамай-ақ, заңды түрде дауыстарды санау.",
    feat_2_title: "Хабарландыруларды тарату",
    feat_2_desc: "Маңызды жаңалықтарды WhatsApp және Telegram-ға жылдам жіберіңіз.",
    feat_3_title: "1 батырмамен автоесептер",
    feat_3_desc: "Жылдық және қаржылық есептер басып шығаруға дайын PDF түрінде жасалады.",
    feat_4_title: "Жаппай импорт",
    feat_4_desc: "Барлық үйді пәтерлерімен бірнеше секундта тізім арқылы жүктеңіз.",
    feat_5_title: "Меншік иелерінің тізілімі",
    feat_5_desc: "Тұрғындар, аудандар және бөлмелер туралы нақты дерекқор.",
    feat_6_title: "Өтінімдер мен шеберлер",
    feat_6_desc: "Сантехника, электрика және абаттандыру бойынша өтінімдерді қадағалау.",
    cta_title: "Жасырын төлемсіз ашық тарифтер",
    cta_desc:
      "Тек үйіңіздегі нақты пәтерлер саны үшін ғана төлем. Пәтеріне айына 120 ₸-ден бастап (жолдама бағдарламасы бойынша 50 ₸-ден).",
    cta_btn_calc: "Тарифтер мен калькуляторды көру →",
    cta_btn_tg: "Telegram арқылы хабарласу",
    footer_title: "Fixly — МТБ цифрлық платформасы",
    footer_desc: "Серверлер мен дербес деректер Қазақстан Республикасының аумағында сақталады.",
    footer_support: "Қолдау қызметі",
  },
  en: {
    subtitle: "HOA Platform",
    pricing: "Pricing",
    video_guide: "Video Guides",
    video_banner_title: "Step-by-Step Fixly Video Tutorials",
    video_banner_desc: "Watch how to log in with OTP, submit photo requests to masters, and generate HOA annual reports.",
    video_banner_btn: "Watch Tutorials",
    login: "Log in",
    badge: "Digital Ecosystem for Kazakhstan Residential Buildings 🇰🇿",
    hero_title_1: "Home Management",
    hero_title_2: "Without Hassle and Paperwork",
    hero_desc:
      "Unified system for HOA chairmen, residents, and masters. Legally compliant voting, photo requests, automated reporting, and transparent accounting — all in one place.",
    btn_try: "Try Now",
    btn_calc: "Calculate Pricing",
    trust_law: "In compliance with RK Housing Relations Law",
    trust_storage: "Data stored in Kazakhstan",
    trust_social: "Broadcasts to WhatsApp and Telegram",
    roles_title: "Who Is This Platform For?",
    roles_subtitle: "Select your role for quick access to dedicated tools",
    role_ch_title: "HOA / Condominium Chairmen",
    role_ch_sub: "Save up to 15 hours per week on routine and calls",
    role_ch_f1: "Automated annual reports in PDF",
    role_ch_f2: "Import apartments from lists & Excel",
    role_ch_f3: "Quick broadcasts to resident chat groups",
    role_ch_btn: "Chairman Portal",
    role_res_title: "Building Residents",
    role_res_sub: "Everything about your building right on your smartphone",
    role_res_f1: "Submit repair requests with photos",
    role_res_f2: "Online voting and polls",
    role_res_f3: "Transparent receipts and charges",
    role_res_btn: "Resident Portal",
    role_m_title: "Masters & Services",
    role_m_sub: "Direct jobs from city residents without middlemen",
    role_m_f1: "Job feed: plumbing, electrical & more",
    role_m_f2: "Master map and verified reviews",
    role_m_f3: "Direct communication with clients",
    role_m_btn: "Master Portal",
    features_title: "Everything for Order in Your Home",
    features_subtitle: "Simple and robust tools solving everyday challenges",
    feat_1_title: "Voting & Quorum",
    feat_1_desc: "Legally compliant vote counting without door-to-door signature collection.",
    feat_2_title: "Announcements & Broadcasts",
    feat_2_desc: "Publish building news with one-click sharing to WhatsApp and Telegram.",
    feat_3_title: "1-Click Auto Reports",
    feat_3_desc: "Annual and financial reports are automatically generated into printable PDF.",
    feat_4_title: "Bulk Import",
    feat_4_desc: "Upload the whole building with apartments and residents in seconds.",
    feat_5_title: "Owner Registry",
    feat_5_desc: "Up-to-date database of residents, areas, and rooms with zero data loss.",
    feat_6_title: "Requests & Masters",
    feat_6_desc: "Track maintenance jobs for plumbing, electrical, and yard care.",
    cta_title: "Transparent Pricing with No Hidden Fees",
    cta_desc:
      "Pay only for the verified number of apartments in your building. From 120 ₸ per apartment/month (from 50 ₸ with referral discount).",
    cta_btn_calc: "View Pricing & Calculator →",
    cta_btn_tg: "Contact via Telegram",
    footer_title: "Fixly — HOA Digital Platform",
    footer_desc: "Servers and personal data are strictly hosted within the Republic of Kazakhstan.",
    footer_support: "Support",
  },
};

export default function HomePage() {
  const { language } = useTranslation();
  const [_mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const t = LANDING_TEXT[language] || LANDING_TEXT.ru;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20" suppressHydrationWarning>
      {/* Верхняя панель навигации */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-lg shadow-sm">
                F
              </span>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg leading-tight tracking-tight">Fixly</span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {t.subtitle}
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/instructions"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Play size={13} className="text-primary fill-primary/20" />
              <span>{t.video_guide}</span>
            </Link>
            <Link
              href="/pricing"
              className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.pricing}
            </Link>
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild size="sm" className="rounded-xl px-4 font-semibold shadow-sm">
              <Link href="/login">{t.login}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Главный Hero-блок */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="mx-auto max-w-5xl px-5 text-center">
          {/* Бейдж */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary mb-6 shadow-sm">
            <Sparkles size={14} />
            <span>{t.badge}</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-balance">
            {t.hero_title_1} <br />
            <span className="text-primary bg-clip-text">{t.hero_title_2}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg leading-relaxed text-balance">
            {t.hero_desc}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="w-full sm:w-auto h-12 rounded-2xl px-8 text-base font-bold shadow-md">
              <Link href="/login">
                {t.btn_try}
                <ArrowRight size={18} className="ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto h-12 rounded-2xl px-6 text-base font-semibold">
              <Link href="/pricing">
                <Calculator size={18} className="mr-2 text-primary" />
                {t.btn_calc}
              </Link>
            </Button>
          </div>

          {/* Гарантии и бейджи */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-primary" />
              <span>{t.trust_law}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-primary" />
              <span>{t.trust_storage}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle size={16} className="text-primary" />
              <span>{t.trust_social}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Выбор роли (Вход в один клик) */}
      <section className="py-12 bg-muted/40 border-y border-border/60">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold sm:text-3xl">{t.roles_title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t.roles_subtitle}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Председатель */}
            <div className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 group-hover:scale-105 transition-transform">
                  <Building2 size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{t.role_ch_title}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{t.role_ch_sub}</p>
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                    <span>{t.role_ch_f1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                    <span>{t.role_ch_f2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-primary mt-0.5 shrink-0" />
                    <span>{t.role_ch_f3}</span>
                  </li>
                </ul>
              </div>

              <Button asChild className="mt-6 w-full rounded-xl" variant="default">
                <Link href="/login">{t.role_ch_btn}</Link>
              </Button>
            </div>

            {/* Житель */}
            <div className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-4 group-hover:scale-105 transition-transform">
                  <Home size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{t.role_res_title}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{t.role_res_sub}</p>
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <span>{t.role_res_f1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <span>{t.role_res_f2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-blue-500 mt-0.5 shrink-0" />
                    <span>{t.role_res_f3}</span>
                  </li>
                </ul>
              </div>

              <Button asChild className="mt-6 w-full rounded-xl" variant="outline">
                <Link href="/login?role=resident">{t.role_res_btn}</Link>
              </Button>
            </div>

            {/* Мастер */}
            <div className="group flex flex-col justify-between rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
              <div>
                <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-4 group-hover:scale-105 transition-transform">
                  <Wrench size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground">{t.role_m_title}</h3>
                <p className="text-xs text-muted-foreground mt-1 mb-4">{t.role_m_sub}</p>
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <span>{t.role_m_f1}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <span>{t.role_m_f2}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <span>{t.role_m_f3}</span>
                  </li>
                </ul>
              </div>

              <Button asChild className="mt-6 w-full rounded-xl" variant="outline">
                <Link href="/login?role=master">{t.role_m_btn}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Баннер видеоинструкций */}
      <section className="py-10 bg-card border-y border-border/60">
        <div className="mx-auto max-w-5xl px-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
                <Play size={24} className="ml-0.5 fill-current" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary mb-1">
                  <span>HD 1080p</span> · <span>4 видеоурока</span>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-foreground">{t.video_banner_title}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">{t.video_banner_desc}</p>
              </div>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto shrink-0 rounded-2xl px-6 font-bold shadow-md">
              <Link href="/instructions">
                <Play size={16} className="mr-2 fill-current" />
                {t.video_banner_btn}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Ключевые преимущества */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold sm:text-3xl">{t.features_title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{t.features_subtitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <Vote size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">{t.feat_1_title}</h3>
              <p className="text-xs text-muted-foreground">{t.feat_1_desc}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <BellRing size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">{t.feat_2_title}</h3>
              <p className="text-xs text-muted-foreground">{t.feat_2_desc}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <FileText size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">{t.feat_3_title}</h3>
              <p className="text-xs text-muted-foreground">{t.feat_3_desc}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">{t.feat_4_title}</h3>
              <p className="text-xs text-muted-foreground">{t.feat_4_desc}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <Users size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">{t.feat_5_title}</h3>
              <p className="text-xs text-muted-foreground">{t.feat_5_desc}</p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
                <Wrench size={20} />
              </div>
              <h3 className="font-bold text-sm mb-1">{t.feat_6_title}</h3>
              <p className="text-xs text-muted-foreground">{t.feat_6_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA секция тарифов */}
      <section className="py-12 bg-primary/5 border-t border-border/60">
        <div className="mx-auto max-w-4xl px-5 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t.cta_title}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-xl mx-auto">{t.cta_desc}</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-2xl px-6 font-bold">
              <Link href="/pricing">{t.cta_btn_calc}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-2xl px-6">
              <a href="https://t.me/fixlyosibot" target="_blank" rel="noreferrer">
                <MessageCircle size={18} className="mr-2 text-primary" />
                {t.cta_btn_tg}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Подвал */}
      <footer className="border-t border-border/60 py-8 text-xs text-muted-foreground">
        <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-center justify-between gap-4 px-5 text-center sm:text-left">
          <div>
            <p className="font-semibold text-foreground">{t.footer_title}</p>
            <p className="mt-1">{t.footer_desc}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/instructions" className="hover:text-foreground font-medium text-primary">
              {t.video_guide}
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground">
              Оферта
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground">
              Конфиденциальность
            </Link>
            <Link href="/pricing" className="hover:text-foreground">
              {t.pricing}
            </Link>
            <a href="https://t.me/fixlyosibot" target="_blank" rel="noreferrer" className="hover:text-foreground">
              {t.footer_support}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
