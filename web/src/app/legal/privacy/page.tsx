"use client";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ArrowLeft,ShieldCheck } from "lucide-react";
import Link from "next/link";

const PRIVACY_I18N = {
  ru: {
    back: "Все документы",
    nav_resident: "🏠 Жильцам",
    nav_osi: "🏢 Председателям ОСИ",
    nav_master: "🛠 Мастерам",
    nav_privacy: "🛡 Конфиденциальность",
    tag: "Политика конфиденциальности",
    title: "Политика обработки персональных данных Fixly",
    edition: "Редакция 3.0 от 2026 года · Закон Республики Казахстан № 94-V",
    sections: [
      {
        title: "1. Общие положения",
        text: "Настоящая Политика конфиденциальности определяет порядок сбора, хранения, обработки и защиты персональных данных пользователей веб-сервиса и мобильного приложения Fixly в соответствии с Законом Республики Казахстан от 21 мая 2013 года № 94-V «О персональных данных и их защите».",
      },
      {
        title: "2. Состав собираемых данных",
        text: "При регистрации и использовании сервиса Пользователь предоставляет следующие данные:",
        items: [
          "Номер мобильного телефона (для авторизации и получения кодов доступа);",
          "Фамилия, имя, отчество (для идентификации в домовой книге и заявках);",
          "Номер квартиры и адрес дома (для привязки к объекту кондоминиума);",
          "Тексты заявок, сообщений, объявлений и прикрепленные фотографии.",
        ],
      },
      {
        title: "3. Цели обработки данных",
        items: [
          "Обеспечение функционирования сервиса электронного управления домом (ОСИ/НСУ/УК);",
          "Идентификация жителей при проведении онлайн-голосований и собраний;",
          "Организация оперативной связи между жильцами, председателем и мастерами;",
          "Информирование о важных объявлениях и аварийных ситуациях.",
        ],
      },
      {
        title: "4. Хранение и безопасность данных",
        text: "Все базы данных и сервера платформы Fixly размещены на территории Республики Казахстан. Мы применяем современные методы шифрования для предотвращения несанкционированного доступа. Данные пользователей не передаются третьим лицам в рекламных целях.",
      },
      {
        title: "5. Согласие пользователя",
        text: "Авторизуясь в сервисе (путем ввода одноразового кода OTP), Пользователь подтверждает свое полное и безоговорочное согласие на сбор и обработку своих персональных данных на условиях настоящей Политики.",
      },
      {
        title: "6. Контакты службы поддержки",
        support: true,
      },
    ],
  },
  kk: {
    back: "Барлық құжаттар",
    nav_resident: "🏠 Тұрғындарға",
    nav_osi: "🏢 Төрағаларға",
    nav_master: "🛠 Шеберлерге",
    nav_privacy: "🛡 Құпиялылық",
    tag: "Құпиялылық саясаты",
    title: "Fixly дербес деректерді өңдеу саясаты",
    edition: "2026 жылғы 3.0 редакциясы · Қазақстан Республикасының № 94-V Заңы",
    sections: [
      {
        title: "1. Жалпы ережелер",
        text: "Осы Құпиялылық саясаты 2013 жылғы 21 мамырдағы № 94-V «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасының Заңына сәйкес Fixly веб-сервисі мен мобильді қосымшасы пайдаланушыларының дербес деректерін жинау, сақтау, өңдеу және қорғау тәртібін белгілейді.",
      },
      {
        title: "2. Жинақталатын деректер құрамы",
        text: "Сервисті тіркеу және пайдалану кезінде Пайдаланушы келесі деректерді ұсынады:",
        items: [
          "Ұялы телефон нөмірі (авторизация және кіру кодтарын алу үшін);",
          "Тегі, аты, әкесінің аты (үй тізілімінде және өтінімдерде сәйкестендіру үшін);",
          "Пәтер нөмірі және үй мекенжайы (кондоминиум нысанына байланыстыру үшін);",
          "Өтінімдер мәтіні, хабарламалар, хабарландырулар және тіркелген фотосуреттер.",
        ],
      },
      {
        title: "3. Деректерді өңдеу мақсаттары",
        items: [
          "Үйді электрондық басқару сервисінің (МТБ/НСУ/УК) жұмысын қамтамасыз ету;",
          "Онлайн-дауыс берулер мен жиналыстарды өткізу кезінде тұрғындарды сәйкестендіру;",
          "Тұрғындар, төраға және шеберлер арасында жедел байланысты ұйымдастыру;",
          "Маңызды хабарландырулар мен апаттық жағдайлар туралы хабардар ету.",
        ],
      },
      {
        title: "4. Деректерді сақтау және қауіпсіздік",
        text: "Fixly платформасының барлық деректер базасы мен серверлері Қазақстан Республикасының аумағында орналасқан. Біз рұқсатсыз кіруді болдырмау үшін заманауи шифрлау әдістерін қолданамыз. Пайдаланушылардың деректері жарнамалық мақсатта үшінші тұлғаларға берілмейді.",
      },
      {
        title: "5. Пайдаланушының келісімі",
        text: "Сервиске кіру (бір реттік OTP кодын енгізу) арқылы Пайдаланушы осы Саясат шарттары бойынша өзінің дербес деректерін жинауға және өңдеуге толық әрі сөзсіз келісімін растайды.",
      },
      {
        title: "6. Қолдау қызметінің байланыстары",
        support: true,
      },
    ],
  },
  en: {
    back: "All Documents",
    nav_resident: "🏠 Residents",
    nav_osi: "🏢 Chairmen",
    nav_master: "🛠 Masters",
    nav_privacy: "🛡 Privacy",
    tag: "Privacy Policy",
    title: "Fixly Personal Data Processing & Privacy Policy",
    edition: "Edition 3.0 of 2026 · Republic of Kazakhstan Law № 94-V",
    sections: [
      {
        title: "1. General Provisions",
        text: "This Privacy Policy establishes the procedure for collecting, storing, processing, and protecting personal data of users of the Fixly web service and mobile app pursuant to the Law of the Republic of Kazakhstan dated May 21, 2013 No. 94-V 'On Personal Data and its Protection'.",
      },
      {
        title: "2. Scope of Collected Data",
        text: "Upon registration and usage of the service, the User provides the following information:",
        items: [
          "Mobile phone number (for OTP authentication and account notifications);",
          "Full name (for identification in the building registry and service orders);",
          "Apartment number and building address (to link to condominium object);",
          "Request texts, chat messages, announcements, and uploaded photos.",
        ],
      },
      {
        title: "3. Purposes of Data Processing",
        items: [
          "Enabling the operation of the digital condominium management platform (HOA/OSI);",
          "Authenticating residents during online legally binding votes and meetings;",
          "Facilitating direct communication between residents, chairmen, and masters;",
          "Dispatching critical building notices and emergency announcements.",
        ],
      },
      {
        title: "4. Storage and Data Security",
        text: "All databases and servers of Fixly are located strictly within the Republic of Kazakhstan. We utilize industry-standard cryptographic encryption to prevent unauthorized access. User data is NEVER sold or transferred to advertisers.",
      },
      {
        title: "5. User Consent",
        text: "Authenticating on the service (via OTP entry) constitutes the User's full and unconditional consent to the collection and processing of personal data in accordance with this Policy.",
      },
      {
        title: "6. Support Contacts",
        support: true,
      },
    ],
  },
};

export default function PrivacyPage() {
  const { language } = useTranslation();
  const t = PRIVACY_I18N[language] || PRIVACY_I18N.ru;

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
            className="rounded-xl border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {t.nav_master}
          </Link>
          <Link
            href="/legal/privacy"
            className="rounded-xl bg-primary text-primary-foreground px-3.5 py-1.5 text-xs font-semibold shadow-sm"
          >
            {t.nav_privacy}
          </Link>
        </div>

        <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-2">
          <ShieldCheck size={18} />
          <span>{t.tag}</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">
          {t.title}
        </h1>
        <p className="text-xs text-muted-foreground mb-8">
          {t.edition}
        </p>

        <section className="space-y-6 text-sm">
          {t.sections.map((sec, idx) => (
            <div key={idx}>
              <h2 className="text-lg font-bold text-foreground mb-2">{sec.title}</h2>
              {sec.text && <p className="text-muted-foreground mb-2">{sec.text}</p>}
              {sec.items && (
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {sec.items.map((it, itIdx) => (
                    <li key={itIdx}>{it}</li>
                  ))}
                </ul>
              )}
              {sec.support && (
                <p className="text-muted-foreground">
                  Telegram:{" "}
                  <a
                    href="https://t.me/fixlyosibot"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-semibold hover:underline"
                  >
                    @fixlyosibot
                  </a>
                </p>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
