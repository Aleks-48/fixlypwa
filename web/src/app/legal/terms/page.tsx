"use client";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ArrowLeft,CheckCircle2,FileText } from "lucide-react";
import Link from "next/link";

const TERMS_I18N = {
  ru: {
    back: "Все документы",
    nav_resident: "🏠 Жильцам",
    nav_osi: "🏢 Председателям ОСИ",
    nav_master: "🛠 Мастерам",
    nav_privacy: "🛡 Конфиденциальность",
    tag: "Пользовательское соглашение",
    title: "Публичная оферта для Жильцов и Арендаторов",
    edition: "Редакция 3.0 от 2026 года · Республика Казахстан",
    summary_title: "💡 Краткая и понятная суть для Жильца:",
    summary_items: [
      { bold: "Бесплатные функции дома", text: ": Подача заявок в ОСИ, участие в опросах, просмотр квитанций и объявлений — полностью бесплатно." },
      { bold: "Заказ мастеров", text: ": Fixly — информационный сервис. Договор на выполнение ремонта заключается напрямую между вами и выбранным Мастером." },
      { bold: "Ответственность", text: ": За качество работы и затопления отвечает исполнитель (Мастер); за заводской брак материалов отвечает магазин/производитель." },
      { bold: "Арендаторам", text: ": Проведение крупных ремонтных работ согласуется с собственником жилья." },
    ],
    sections: [
      {
        title: "1. Предмет оферты",
        text: "Платформа Fixly предоставляет информационно-технологический комплекс сервисов для управления домом, подачи заявок, проведения юридически значимых онлайн-голосований и взаимодействия с проверенными специалистами в соответствии с Законом РК «О жилищных отношениях» и Законом РК «Об информатизации».",
      },
      {
        title: "2. Права и обязанности Жильцов",
        items: [
          "Жилец имеет право бесплатно пользоваться личным кабинетом своего дома;",
          "Жилец обязуется указывать достоверные данные о номере квартиры и объекте кондоминиума;",
          "При заказе платных услуг мастера оплата и фиксация приемки осуществляется через приложение;",
          "Запрещается использовать сервис для распространения нецензурной лексики, спама или ложных аварийных вызовов.",
        ],
      },
      {
        title: "3. Условия для Арендаторов квартир",
        text: "Арендатор жилого помещения имеет доступ к подаче текущих эксплуатационных заявок. Выполнение перепланировок или капитальных вмешательств в инженерные сети допускается исключительно при наличии письменного согласия собственника квартиры.",
      },
      {
        title: "4. Разграничение ответственности",
        text: "Fixly не является строительной организацией или работодателем мастеров. Мастера несут персональную гражданско-правовую и материальную ответственность за результат выполняемых работ в соответствии с ГК РК.",
      },
      {
        title: "5. Акцепт оферты",
        text: "Ввод проверочного кода при входе или регистрации на сайте и в мобильном приложении Fixly является полным и безоговорочным акцептом (принятием) условий настоящей Публичной оферты.",
      },
    ],
  },
  kk: {
    back: "Барлық құжаттар",
    nav_resident: "🏠 Тұрғындарға",
    nav_osi: "🏢 Төрағаларға",
    nav_master: "🛠 Шеберлерге",
    nav_privacy: "🛡 Құпиялылық",
    tag: "Пайдаланушы келісімі",
    title: "Тұрғындар мен Жалға алушыларға арналған Қоғамдық Оферта",
    edition: "2026 жылғы 3.0 редакциясы · Қазақстан Республикасы",
    summary_title: "💡 Тұрғынға арналған қысқаша және түсінікті мәні:",
    summary_items: [
      { bold: "Үйдің тегін функциялары", text: ": МТБ-ға өтінімдер беру, дауыс беруге қатысу, түбіртектер мен хабарландыруларды көру — толығымен ТЕГІН." },
      { bold: "Шеберлерге тапсырыс беру", text: ": Fixly — ақпараттық сервис. Жөндеу жұмыстарын орындау шарты тікелей сіз бен таңдалған Шебер арасында жасалады." },
      { bold: "Жауапкершілік", text: ": Жұмыс сапасы мен су басу салдарына орындаушы (Шебер) жауап береді; материалдардың зауыттық ақауына дүкен/өндіруші жауапты." },
      { bold: "Жалға алушыларға", text: ": Күрделі жөндеу жұмыстарын жүргізу пәтер иесінің келісімімен жүзеге асырылады." },
    ],
    sections: [
      {
        title: "1. Офертаның мәні",
        text: "Fixly платформасы ҚР «Тұрғын үй қатынастары туралы» және ҚР «Ақпараттандыру туралы» Заңдарына сәйкес үйді басқару, өтінімдер беру, заңды күші бар онлайн-дауыс берулер өткізу және тексерілген мамандармен өзара әрекеттесу бойынша ақпараттық-технологиялық сервистер кешенін ұсынады.",
      },
      {
        title: "2. Тұрғындардың құқықтары мен міндеттері",
        items: [
          "Тұрғын өз үйінің жеке кабинетін тегін пайдалануға құқылы;",
          "Тұрғын пәтер нөмірі мен кондоминиум нысаны туралы шынайы мәліметтерді көрсетуге міндетті;",
          "Шебердің ақылы қызметтеріне тапсырыс беру кезінде төлем және қабылдау қосымша арқылы тіркеледі;",
          "Сервисті балағат сөздер, спам немесе жалған апаттық шақыртулар тарату үшін пайдалануға тыйым салынады.",
        ],
      },
      {
        title: "3. Пәтерді жалға алушылар үшін шарттар",
        text: "Тұрғын үй-жайды жалға алушы ағымдағы пайдалану өтінімдерін беруге құқылы. Қайта жоспарлау немесе инженерлік желілерге күрделі араласу тек пәтер иесінің жазбаша келісімі болған жағдайда ғана рұқсат етіледі.",
      },
      {
        title: "4. Жауапкершіліктің аражігін ажырату",
        text: "Fixly құрылыс ұйымы немесе шеберлердің жұмыс берушісі болып табылмайды. Шеберлер ҚР АК сәйкес орындалатын жұмыстардың нәтижесі үшін жеке азаматтық-құқықтық және материалдық жауапкершілік көтереді.",
      },
      {
        title: "5. Офертаны қабылдау (акцепт)",
        text: "Fixly сайты мен мобильді қосымшасына кіру немесе тіркелу кезінде тексеру кодын енгізу осы Қоғамдық офертаның шарттарын толық және сөзсіз қабылдау (акцепт) болып табылады.",
      },
    ],
  },
  en: {
    back: "All Documents",
    nav_resident: "🏠 Residents",
    nav_osi: "🏢 Chairmen",
    nav_master: "🛠 Masters",
    nav_privacy: "🛡 Privacy",
    tag: "User Agreement",
    title: "Public Offer for Residents & Tenants",
    edition: "Edition 3.0 of 2026 · Republic of Kazakhstan",
    summary_title: "💡 Key Terms for Residents in Brief:",
    summary_items: [
      { bold: "Free Building Services", text: ": Submitting HOA maintenance requests, voting in surveys, viewing bills and news is 100% FREE." },
      { bold: "Hiring Masters", text: ": Fixly is a digital information platform. The service contract is concluded directly between you and the hired Master." },
      { bold: "Liability", text: ": Work quality and water leak damages are the sole responsibility of the Master; manufacturer defects are covered by the store." },
      { bold: "For Tenants", text: ": Major renovation work requires explicit written consent from the apartment owner." },
    ],
    sections: [
      {
        title: "1. Subject of the Offer",
        text: "The Fixly platform provides an IT complex for condominium management, request dispatch, legally binding online voting, and communication with verified contractors in accordance with the RK Law 'On Housing Relations' and the RK Law 'On Informatization'.",
      },
      {
        title: "2. Rights and Responsibilities of Residents",
        items: [
          "Residents have the right to free access to their building's portal and features;",
          "Residents must provide accurate information regarding apartment numbers and personal identity;",
          "Paid contractor jobs and completion confirmations are tracked via the application;",
          "Using the platform for spam, harassment, or fraudulent emergency dispatches is strictly prohibited.",
        ],
      },
      {
        title: "3. Terms for Tenants",
        text: "Tenants have access to operational maintenance requests. Any structural redevelopments or utility modifications require explicit written permission from the property owner.",
      },
      {
        title: "4. Limitation of Liability",
        text: "Fixly is neither a general construction company nor an employer of the masters. Independent specialists bear direct civil and material liability under the Civil Code of the Republic of Kazakhstan.",
      },
      {
        title: "5. Acceptance of the Offer",
        text: "Entering an authentication code upon login or registration on the Fixly website or mobile application constitutes full and irrevocable acceptance of this Public Offer.",
      },
    ],
  },
};

export default function TermsPage() {
  const { language } = useTranslation();
  const t = TERMS_I18N[language] || TERMS_I18N.ru;

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
            className="rounded-xl bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold shadow-sm"
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
          <FileText size={18} />
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
