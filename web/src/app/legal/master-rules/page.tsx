"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck, CheckCircle2, Droplets, Zap, Paintbrush, Key } from "lucide-react";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const MASTER_RULES_I18N = {
  ru: {
    back: "К оферте мастера",
    tag: "Стандарты качества Fixly",
    title: "Технологический регламент и правила выполнения работ",
    edition: "Обязательные стандарты по специальностям · СНиП РК и Закон РК «О защите прав потребителей»",
    rules_title: "💡 4 Главных правила для каждого мастера:",
    rules: [
      { bold: "Фотофиксация ДО начала", text: ": Всегда делайте фото/видео состояния объекта до начала демонтажа и ремонта." },
      { bold: "Проверка материалов", text: ": Если купленные жильцом трубы/краны/провода бракованные или не подходят, письменно предупредите жильца." },
      { bold: "Безопасность", text: ": Обязательно перекрывайте вводные краны (ХВС/ГВС) и отключайте автоматы в щитке перед началом работ." },
      { bold: "Разграничение", text: ": За брак в монтаже и затопление отвечает мастер; за заводской брак материалов жильца отвечает жилец/продавец." },
    ],
    sections: [
      {
        iconKey: "plumbing",
        title: "1. Сантехнические работы (СНиП РК 4.01-02-2001)",
        items: [
          "Обязательное перекрытие вводных запорных кранов в квартиру ДО начала демонтажа;",
          "Запрещена замена общедомовых стояков без предварительного согласования с председателем ОСИ;",
          "Опрессовка и контрольная проверка под рабочим давлением в течение 15 минут в присутствии заказчика;",
          "Качественная пайка полипропилена: соблюдение температуры 260°C и времени остывания.",
        ],
      },
      {
        iconKey: "electric",
        title: "2. Электромонтажные работы (ПУЭ РК)",
        items: [
          "Полное снятие напряжения с рабочей группы на вводном щитке и проверка индикатором;",
          "Категорический запрет прямых скруток меди с алюминием;",
          "Соединение проводов только через сертифицированные клеммники (WAGO), гильзы или пайку;",
          "Подбор сечения кабеля: освещение — от 1.5 мм², розетки — от 2.5 мм² ВВГнг-LS.",
        ],
      },
      {
        iconKey: "finishing",
        title: "3. Отделочные работы и плитка",
        items: [
          "Обязательное грунтование оснований перед нанесением штукатурки или плиточного клея;",
          "Акклиматизация напольных покрытий (ламинат, кварцвинил) в помещении не менее 48 часов;",
          "Соблюдение температурных швов и деформационных зазоров 8-10 мм у стен.",
        ],
      },
      {
        iconKey: "locks",
        title: "4. Замки, двери и мебель",
        items: [
          "Вскрытие замков проводится исключительно в присутствии собственника жилья с подтверждающими документами;",
          "Сборка мебели по технической карте производителя с проверкой уровней диагоналей.",
        ],
      },
    ],
  },
  kk: {
    back: "Шебер офертасына",
    tag: "Fixly сапа стандарттары",
    title: "Техникалық регламент және жұмыстарды орындау ережелері",
    edition: "Мамандықтар бойынша міндетті стандарттар · ҚР ҚНжЕ және ҚР «Тұтынушылардың құқықтарын қорғау туралы» Заңы",
    rules_title: "💡 Әр шеберге арналған 4 басты алтын ереже:",
    rules: [
      { bold: "Бастамас БҰРЫН фотоесеп", text: ": Бөлшектеу мен жөндеуді бастамас бұрын әрқашан нысанның бастапқы күйін фото/бейнеге түсіріңіз." },
      { bold: "Материалдарды тексеру", text: ": Егер тұрғын сатып алған құбырлар/шүмектер/сымдар ақаулы болса, тұрғынға алдын ала ескертіңіз." },
      { bold: "Қауіпсіздік", text: ": Жұмысты бастамас бұрын міндетті түрде кіреберіс шүмектерді (суық/ыстық су) жауып, электр қалқанындағы автоматтарды сөндіріңіз." },
      { bold: "Жауапкершілікті бөлу", text: ": Орнатудағы ақау мен су басуға шебер жауапты; материалдардың зауыттық ақауына сатушы жауапты." },
    ],
    sections: [
      {
        iconKey: "plumbing",
        title: "1. Сантехникалық жұмыстар (ҚР ҚНжЕ 4.01-02-2001)",
        items: [
          "Бөлшектеуді бастамас БҰРЫН пәтердің кіреберіс бекіткіш шүмектерін міндетті түрде жабу;",
          "МТБ төрағасымен алдын ала келіспей ортақ үй тік құбырларын ауыстыруға тыйым салынады;",
          "Тапсырыс берушінің қатысуымен 15 минут бойы жұмыс қысымы астында гидравликалық сынақ өткізу;",
          "Полипропиленді сапалы дәнекерлеу: 260°C температура мен салқындау уақытын сақтау.",
        ],
      },
      {
        iconKey: "electric",
        title: "2. Электр монтаждау жұмыстары (ҚР ЭҚОЕ)",
        items: [
          "Кіреберіс қалқандағы жұмыс тобынан кернеуді толық ажырату және индикатормен тексеру;",
          "Мыс пен алюминий сымдарын тікелей бұрап жалғауға қатаң тыйым салынады;",
          "Сымдарды тек сертификатталған клеммалар (WAGO), гильзалар немесе дәнекерлеу арқылы қосу;",
          "Кабель қимасын дұрыс таңдау: жарықтандыру — 1.5 мм²-ден, розеткалар — 2.5 мм² ВВГнг-LS-тен.",
        ],
      },
      {
        iconKey: "finishing",
        title: "3. Әрлеу жұмыстары мен плитка",
        items: [
          "Сылақ немесе плитка желімін жағар алдында негіздерді міндетті түрде терең праймермен өңдеу;",
          "Еден жабындарын (ламинат, кварцвинил) бөлмеде кемінде 48 сағат бейімдеу;",
          "Қабырғалардың жанында 8-10 мм деформациялық саңылауларды сақтау.",
        ],
      },
      {
        iconKey: "locks",
        title: "4. Құлыптар, есіктер және жиһаз",
        items: [
          "Құлыптарды ашу тек растайтын құжаттары бар үй иесінің қатысуымен жүргізіледі;",
          "Жиһазды өндірушінің техникалық картасы бойынша диагональдар деңгейін тексере отырып құрастыру.",
        ],
      },
    ],
  },
  en: {
    back: "To Master Offer",
    tag: "Fixly Quality Standards",
    title: "Technological Regulations & Execution Rules",
    edition: "Mandatory professional standards · RK SNiP & RK Law 'On Consumer Rights Protection'",
    rules_title: "💡 4 Golden Rules for Every Master:",
    rules: [
      { bold: "Photo Protocol BEFORE Start", text: ": Always take photos/videos of the object condition before starting demolition or repairs." },
      { bold: "Material Inspection", text: ": If homeowner-supplied pipes/faucets/cables are defective or incompatible, notify the client in writing." },
      { bold: "Safety First", text: ": Always shut off main water shutoff valves and switch off circuit breakers before commencing works." },
      { bold: "Clear Liability", text: ": The master is strictly liable for installation flaws and water leaks; factory defects are covered by the store." },
    ],
    sections: [
      {
        iconKey: "plumbing",
        title: "1. Plumbing Works (RK SNiP 4.01-02-2001)",
        items: [
          "Mandatory shut-off of entry ball valves inside the apartment BEFORE demolition starts;",
          "Replacing building-wide common risers without prior HOA chairman written approval is strictly prohibited;",
          "Hydraulic pressure testing under operating pressure for 15 minutes in the presence of the client;",
          "Correct polypropylene pipe welding: adhering to 260°C temperature and proper cooling time.",
        ],
      },
      {
        iconKey: "electric",
        title: "2. Electrical Installation (RK PUE)",
        items: [
          "Full de-energization of the breaker circuit and voltage verification with a certified tester;",
          "Strict ban on direct copper-to-aluminum twisting;",
          "Conductor connections only via certified terminal blocks (WAGO), crimp sleeves, or soldering;",
          "Wire gauge compliance: lighting from 1.5 mm², sockets from 2.5 mm² VVGng-LS.",
        ],
      },
      {
        iconKey: "finishing",
        title: "3. Finishing Works & Tiling",
        items: [
          "Mandatory deep-penetration priming of substrates before plaster or tile adhesive application;",
          "Flooring material acclimatization (laminate, SPC) inside the room for at least 48 hours;",
          "Preservation of 8-10 mm expansion perimeter gaps along walls.",
        ],
      },
      {
        iconKey: "locks",
        title: "4. Locks, Doors & Furniture",
        items: [
          "Emergency lock opening is conducted solely in the presence of the verified property owner with ID documents;",
          "Furniture assembly according to manufacturer schematics with diagonal level alignment.",
        ],
      },
    ],
  },
};

function getSectionIcon(key: string) {
  switch (key) {
    case "plumbing":
      return Droplets;
    case "electric":
      return Zap;
    case "finishing":
      return Paintbrush;
    case "locks":
      return Key;
    default:
      return ShieldCheck;
  }
}

export default function MasterRulesPage() {
  const { language } = useTranslation();
  const t = MASTER_RULES_I18N[language] || MASTER_RULES_I18N.ru;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3.5">
          <Link
            href="/legal/terms-master"
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

        {/* 4 золотых правила */}
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 mb-8">
          <h2 className="text-base font-bold text-primary mb-3">
            {t.rules_title}
          </h2>
          <div className="space-y-2.5 text-xs text-foreground/90">
            {t.rules.map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {idx + 1}
                </span>
                <span><b>{rule.bold}</b>{rule.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Регламенты по отраслям */}
        <div className="space-y-6">
          {t.sections.map((sec, idx) => {
            const Icon = getSectionIcon(sec.iconKey);
            return (
              <div key={idx} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon size={18} />
                  </span>
                  <h2 className="text-base font-bold text-foreground">
                    {sec.title}
                  </h2>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {sec.items.map((it, itIdx) => (
                    <li key={itIdx} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" />
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
