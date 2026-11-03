"use client";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ArrowLeft,CheckCircle2,Sparkles } from "lucide-react";
import Link from "next/link";

const PILOT_I18N = {
  ru: {
    back: "Все документы",
    tag: "Пилотная программа цифровизации",
    title: "Меморандум о намерениях (Пилотный запуск 50 ₸)",
    edition: "Специальные льготные условия для первых домов · Республика Казахстан",
    banner_title: "Условия участия в пилотном проекте",
    banner_desc: "В рамках программы ускоренного внедрения цифровых сервисов для ОСИ и ПТ первые подключившиеся дома получают максимальный пакет возможностей по специальной промо-цене.",
    s1_title: "1. Стоимость и льготный период",
    s1_items: [
      "Первые 3 месяца: льготный тариф 50 ₸ за квартиру в месяц (включая все функции тарифа «Максимальный»).",
      "С 4-го месяца: переход на стандартный тариф 120 ₸ за квартиру в месяц (или продолжение по реферальной программе).",
    ],
    s2_title: "2. Что входит в пилотный пакет",
    s2_items: [
      "Юридически значимые онлайн-голосования собственников (с фиксацией кворума и протоколами);",
      "Автоматическая выгрузка ежемесячных и годовых отчетов председателя по официальной форме № 163 Минпрома РК;",
      "Личные кабинеты жителей с квитанциями, голосованиями и чатом заявок;",
      "Лента проверенных мастеров города;",
      "Услуга первичного занесения реестра квартир и собственников от 2 500 ₸ за дом.",
    ],
    s3_title: "3. Обязательства сторон",
    s3_items: [
      "Сервис Fixly обязуется обеспечить бесперебойную работу серверов и сохранность данных в РК;",
      "ОСИ обязуется протестировать функции сервиса и предоставить обратную связь команде разработки.",
    ],
    cta_btn: "Подключить дом по пилотной программе",
  },
  kk: {
    back: "Барлық құжаттар",
    tag: "Цифрландырудың пилоттық бағдарламасы",
    title: "Ниеттер туралы меморандум (Пилоттық іске қосу 50 ₸)",
    edition: "Алғашқы үйлерге арналған арнайы жеңілдікті шарттар · Қазақстан Республикасы",
    banner_title: "Пилоттық жобаға қатысу шарттары",
    banner_desc: "МТБ және ЖС үшін цифрлық сервистерді жедел енгізу бағдарламасы аясында алғашқы қосылған үйлер арнайы промо-бағамен барлық мүмкіндіктер пакетін алады.",
    s1_title: "1. Құны және жеңілдік кезеңі",
    s1_items: [
      "Алғашқы 3 ай: пәтеріне айына 50 ₸ жеңілдікті тарифі («Максималды» тарифінің барлық функциялары қоса беріледі).",
      "4-айдан бастап: пәтеріне айына 120 ₸ стандартты тарифіне көшу (немесе жолдама бағдарламасы бойынша жалғастыру).",
    ],
    s2_title: "2. Пилоттық пакетке не кіреді",
    s2_items: [
      "Меншік иелерінің заңды күші бар онлайн-дауыс берулері (кворум мен хаттамаларды бекіту);",
      "ҚР Өнеркәсіп министрлігінің ресми № 163 формасы бойынша төрағаның айлық және жылдық есептерін автоматты түрде шығару;",
      "Түбіртектері, дауыс берулері және чаты бар тұрғындардың жеке кабинеттері;",
      "Қаланың тексерілген шеберлерінің өрісі;",
      "Пәтерлер мен меншік иелерінің тізімін жүйеге бастапқы енгізу қызметі — әр үйге 2 500 ₸-ден бастап.",
    ],
    s3_title: "3. Тараптардың міндеттемелері",
    s3_items: [
      "Fixly сервисі серверлердің үздіксіз жұмысын және ҚР аумағында деректердің қауіпсіздігін қамтамасыз етуге міндеттенеді;",
      "МТБ сервис мүмкіндіктерін сынақтан өткізіп, әзірлеушілер тобына кері байланыс беруге міндеттенеді.",
    ],
    cta_btn: "Үйді пилоттық бағдарламамен қосу",
  },
  en: {
    back: "All Documents",
    tag: "Digitization Pilot Program",
    title: "Memorandum of Understanding (Pilot Launch 50 ₸)",
    edition: "Special promotional terms for pioneering buildings · Republic of Kazakhstan",
    banner_title: "Terms of Pilot Participation",
    banner_desc: "Under the accelerated HOA digital transformation initiative, pioneering buildings receive the full feature suite at a discounted promotional rate.",
    s1_title: "1. Pricing & Grace Period",
    s1_items: [
      "First 3 months: promotional rate 50 ₸ per apartment/month (including all 'Maximum' tier features).",
      "From month 4: standard rate 120 ₸ per apartment/month (or continuation via referral program).",
    ],
    s2_title: "2. Features Included in Pilot Package",
    s2_items: [
      "Legally binding online homeowner voting (quorum computation and official meeting minutes);",
      "Automated monthly and annual report generation under RK Ministry Form № 163;",
      "Resident portals with utility charges, polls, and maintenance ticketing;",
      "Verified local master and emergency contractor feed;",
      "Building and apartment registry onboarding from 2,500 ₸ per building.",
    ],
    s3_title: "3. Mutual Obligations",
    s3_items: [
      "Fixly guarantees high server availability and strict data residency within Kazakhstan;",
      "The HOA agrees to test features and provide constructive product feedback to the development team.",
    ],
    cta_btn: "Connect Building to Pilot Program",
  },
};

export default function MemorandumPilotPage() {
  const { language } = useTranslation();
  const t = PILOT_I18N[language] || PILOT_I18N.ru;

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
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold text-sm mb-2">
          <Sparkles size={18} />
          <span>{t.tag}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          {t.title}
        </h1>
        <p className="text-xs text-muted-foreground mb-8">
          {t.edition}
        </p>

        <section className="space-y-6 text-sm">
          <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4">
            <h2 className="text-base font-bold text-indigo-600 dark:text-indigo-400 mb-1">
              {t.banner_title}
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t.banner_desc}
            </p>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">{t.s1_title}</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {t.s1_items.map((it, idx) => (
                <li key={idx}>{it}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">{t.s2_title}</h2>
            <ul className="space-y-2 text-muted-foreground">
              {t.s2_items.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">{t.s3_title}</h2>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              {t.s3_items.map((it, idx) => (
                <li key={idx}>{it}</li>
              ))}
            </ul>
          </div>

          <div className="pt-4 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-2xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              {t.cta_btn}
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
