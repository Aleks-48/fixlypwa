"use client";

import { LanguageToggle } from "@/app/app/_components/LanguageToggle";
import { ThemeToggle } from "@/app/app/_components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import {
ArrowLeft,
Clock,
ExternalLink,
FileText,
HelpCircle,
Info,
Layers,
Play,
Printer,
Sparkles
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const INSTRUCTIONS_I18N = {
  ru: {
    back: "На главную",
    badge: "Центр обучения и документации Fixly",
    title: "Руководства и инструкции",
    subtitle: "Выберите удобный формат: смотрите обучающие видеоролики или читайте иллюстрированные пошаговые инструкции со скриншотами.",
    mode_video: "🎥 Видеоинструкции",
    mode_docs: "📖 Документация со скриншотами",
    tab_all: "Все разделы",
    tab_resident: "Жильцам",
    tab_osi: "Председателям (ОСИ)",
    tab_master: "Мастерам",
    watch_btn: "Смотреть видео",
    print_btn: "Печать / PDF",
    step_label: "Шаг",
    tip_label: "Полезный совет:",
    bot_help_title: "Остались вопросы или нужна помощь?",
    bot_help_desc: "Telegram-бот @fixlyosibot и служба заботы Fixly готовы помочь с регистрацией, импортом квартир и голосованиями.",
    bot_btn: "Открыть Telegram-бота",

    docs: [
      {
        id: "auth",
        category: "resident",
        tag: "Быстрый вход",
        title: "1. Вход в систему и привязка Telegram (без пароля)",
        desc: "Авторизация в Fixly происходит по одноразовому 6-значному коду в Telegram. Никаких сложных паролей запоминать не нужно.",
        time: "1 мин",
        steps: [
          {
            num: 1,
            title: "Введите номер телефона",
            desc: "На странице входа укажите ваш казахстанский номер в формате +7 (7XX) XXX-XX-XX.",
            uiMockup: {
              screenTitle: "Вход в Fixly",
              badge: "Шаг 1 из 3",
              fields: [
                { label: "Телефон или email", value: "+7 (771) 373-08-82", active: true },
              ],
              buttonText: "Получить код",
              note: "Код поступит в официальный бот @fixlyosibot",
            },
          },
          {
            num: 2,
            title: "Подтвердите номер в Telegram-боте",
            desc: "Перейдите в Telegram-бота @fixlyosibot и нажмите один раз кнопку «📱 Поделиться номером для входа».",
            uiMockup: {
              screenTitle: "Telegram: @fixlyosibot",
              badge: "Шаг 2 из 3",
              fields: [
                { label: "Бот", value: "👋 Добро пожаловать в Fixly!", active: false },
                { label: "Действие", value: "Нажмите кнопку внизу экрана ⬇️", active: true },
              ],
              buttonText: "📱 Поделиться номером для входа",
              note: "Номер привязывается один раз и навсегда",
            },
          },
          {
            num: 3,
            title: "Введите 6-значный код",
            desc: "Бот пришлет проверочный код. Введите его на сайте или в мобильном приложении — вход выполнен!",
            uiMockup: {
              screenTitle: "Подтверждение входа",
              badge: "Шаг 3 из 3",
              fields: [
                { label: "Код из Telegram", value: "4  8  2  9  1  5", active: true },
              ],
              buttonText: "Войти в кабинет",
              note: "Сессия действует 30 дней",
            },
          },
        ],
        tip: "Если вы входите с телефона, код подставится автоматически. Приложение доступно на смартфонах и в браузере.",
      },
      {
        id: "master_request",
        category: "resident",
        tag: "Для жителей",
        title: "2. Вызов мастера на дом и подача заявки с фото",
        desc: "Заказывайте проверенных сантехников, электриков и мастеров города с фиксацией сметы и 30-дневной гарантией.",
        time: "2 мин",
        steps: [
          {
            num: 1,
            title: "Выберите категорию услуги",
            desc: "Откройте вкладку «Мастера» и выберите нужный профиль: Сантехника, Электрика, Отделка, Замки или Бытовой ремонт.",
            uiMockup: {
              screenTitle: "Каталог услуг Fixly",
              badge: "Шаг 1 из 3",
              fields: [
                { label: "Категории", value: "🚰 Сантехника  ⚡️ Электрика  🔑 Замки", active: true },
                { label: "Город", value: "Кокшетау / Астана / Алматы", active: false },
              ],
              buttonText: "Выбрать специалиста",
              note: "Более 150 проверенных мастеров с рейтингом",
            },
          },
          {
            num: 2,
            title: "Опишите поломку и прикрепите фото",
            desc: "Сделайте фото дефекта (например, протечки трубы или розетки) прямо с камеры телефона. Это поможет мастеру заранее взять нужные запчасти.",
            uiMockup: {
              screenTitle: "Новая заявка мастеру",
              badge: "Шаг 2 из 3",
              fields: [
                { label: "Описание", value: "Капает кран на кухне под раковиной", active: false },
                { label: "Фотография", value: "📷 photo_defect_01.jpg прикреплено", active: true },
              ],
              buttonText: "Опубликовать заявку",
              note: "Мастера видят фото и сразу называют точную цену",
            },
          },
          {
            num: 3,
            title: "Согласуйте время и примите работу",
            desc: "Общайтесь в чате приложения. После завершения ремонта мастер загрузит фото «ПОСЛЕ», а вы подтвердите выполнение с гарантией 30 дней.",
            uiMockup: {
              screenTitle: "Заказ выполнен",
              badge: "Шаг 3 из 3",
              fields: [
                { label: "Статус", value: "✅ Работы приняты жильцом", active: false },
                { label: "Гарантия", value: "🛡 30 дней официальной гарантии", active: true },
              ],
              buttonText: "Оставить отзыв мастеру",
              note: "Комиссия платформы всего 3%",
            },
          },
        ],
        tip: "Никогда не рассчитывайтесь в обход приложения — только оформленные через Fixly заявки защищены 30-дневной гарантией.",
      },
      {
        id: "voting",
        category: "resident",
        tag: "Кондоминиум",
        title: "3. Онлайн-голосования собственников (ОСС) по Закону РК",
        desc: "Легитимный сбор голосов без хождения по квартирам. Система автоматически считает кворум и учитывает площадь каждого собственника.",
        time: "2 мин",
        steps: [
          {
            num: 1,
            title: "Откройте активное голосование",
            desc: "При запуске опроса вам придет уведомление в Telegram и пуш в приложении. Нажмите на карточку собрания.",
            uiMockup: {
              screenTitle: "Голосование дома № 48",
              badge: "Шаг 1 из 3",
              fields: [
                { label: "Повестка дня", value: "1. Утверждение сметы на ремонт кровли", active: true },
                { label: "Срок", value: "До 25 августа 2026 г.", active: false },
              ],
              buttonText: "Перейти к бюллетеню",
              note: "Кворум: требуется участие >50% площадей",
            },
          },
          {
            num: 2,
            title: "Ознакомьтесь со сметой и документами",
            desc: "К каждому вопросу прикреплены сметы расходов, коммерческие предложения и проекты договоров в PDF.",
            uiMockup: {
              screenTitle: "Материалы собрания",
              badge: "Шаг 2 из 3",
              fields: [
                { label: "Документ", value: "📄 Smeta_remont_krovli_2026.pdf (1.2 MB)", active: true },
                { label: "Сумма", value: "850 000 ₸ из накопительного счета", active: false },
              ],
              buttonText: "Изучить расчеты",
              note: "Полная финансовая прозрачность",
            },
          },
          {
            num: 3,
            title: "Отдайте голос в 1 клик",
            desc: "Нажмите «За», «Против» или «Воздержался». Ваш голос с весом площади квартиры мгновенно фиксируется в реестре.",
            uiMockup: {
              screenTitle: "Ваш бюллетень",
              badge: "Шаг 3 из 3",
              fields: [
                { label: "Ваш выбор", value: "🟢 ЗА  |  🔴 ПРОТИВ  |  ⚪️ ВОЗДЕРЖАЛСЯ", active: true },
                { label: "Вес голоса", value: "кв. 14 — 64.5 кв.м (1.82% кворума)", active: false },
              ],
              buttonText: "Подтвердить голос",
              note: "Протокол формируется автоматически",
            },
          },
        ],
        tip: "По Закону РК «О жилищных отношениях» электронные протоколы с расчетом кворума имеют полную юридическую силу для банков и жилищных инспекций.",
      },
      {
        id: "chairman_guide",
        category: "osi",
        tag: "ОСИ / НСУ / УК",
        title: "4. Кабинет председателя: реестр, оцифровка (2 500 ₸) и отчеты №163",
        desc: "Полная автоматизация управления домом: быстрый импорт квартир, ведение лицевых счетов и годовой PDF-отчет по форме Минпрома РК.",
        time: "4 мин",
        steps: [
          {
            num: 1,
            title: "Добавление дома и импорт жителей",
            desc: "Загрузите список квартир в Excel/CSV или закажите экспресс-оцифровку реестра у специалистов Fixly всего за 2 500 ₸.",
            uiMockup: {
              screenTitle: "Реестр собственников",
              badge: "Шаг 1 из 3",
              fields: [
                { label: "Объект", value: "г. Кокшетау, ул. Абая, дом 48", active: false },
                { label: "Квартир", value: "72 квартиры / 4 860 кв.м", active: true },
              ],
              buttonText: "⚡️ Заказать оцифровку (2 500 ₸)",
              note: "Срок занесения — 1 рабочий день",
            },
          },
          {
            num: 2,
            title: "Учет взносов и расходов дома",
            desc: "Фиксируйте текущие и накопительные поступления, расходы на сантехнику, уборку и вывоз мусора. Жители видят прозрачные начисления.",
            uiMockup: {
              screenTitle: "Финансы и сметы",
              badge: "Шаг 2 из 3",
              fields: [
                { label: "Тариф ОСИ", value: "120 ₸ / кв.м (50 ₸ первые 3 мес.)", active: true },
                { label: "Сбор за месяц", value: "583 200 ₸ (собираемость 94%)", active: false },
              ],
              buttonText: "Сформировать квитанции",
              note: "Автоматическая рассылка в WhatsApp",
            },
          },
          {
            num: 3,
            title: "Годовой PDF-отчет по форме № 163 Минпрома РК",
            desc: "В конце года нажмите кнопку «Сформировать годовой отчет» — система сгенерирует готовый печатный документ по государственному стандарту.",
            uiMockup: {
              screenTitle: "Генератор отчетов",
              badge: "Шаг 3 из 3",
              fields: [
                { label: "Форма", value: "№ 163 МИИР РК (Годовой отчет ОСИ)", active: true },
                { label: "Формат", value: "Печатный PDF с таблицами доходов/расходов", active: false },
              ],
              buttonText: "📥 Скачать годовой отчет (PDF)",
              note: "Готов к сдаче на общем собрании",
            },
          },
        ],
        tip: "По пилотной программе Fixly первые 3 месяца тариф составляет всего 50 ₸ за квартиру в месяц. Сформировать счет на оплату можно в разделе «Тарифы».",
      },
    ],

    videos: [
      {
        id: "auth_v",
        tag: "YouTube Видео",
        title: "Официальная видеоинструкция: Обзор экосистемы Fixly",
        duration: "3:15 мин",
        desc: "Полный разбор работы платформы: подача заявок, отчетность ОСИ и онлайн-собрания.",
        link: "https://youtu.be/6VHxtXRnv3E",
      },
      {
        id: "shorts_v",
        tag: "YouTube Shorts",
        title: "Как подать заявку в ОСИ за 15 секунд (Shorts)",
        duration: "0:45 мин",
        desc: "Быстрый гайд по подаче заявки мастеру и контролю статуса ремонта со смартфона.",
        link: "https://youtube.com/shorts/r9n6Fv4aP00",
      },
      {
        id: "voting_v",
        tag: "Голосование",
        title: "Онлайн-собрания и подсчет кворума по Закону РК",
        duration: "2:15 мин",
        desc: "Как собственники голосуют за ремонт дома со смартфона и как система рассчитывает кворум.",
        link: "https://youtu.be/6VHxtXRnv3E",
      },
      {
        id: "osi_v",
        tag: "ОСИ / НСУ / УК",
        title: "Кабинет председателя: отчеты №163 и оцифровка",
        duration: "4:10 мин",
        desc: "Инструкция по загрузке квартир, заказу оцифровки и выгрузке годового отчета по форме Минпрома РК.",
        link: "https://youtu.be/6VHxtXRnv3E",
      },
    ],
  },

  kk: {
    back: "Басты бетке",
    badge: "Fixly оқу-жаттығу және құжаттама орталығы",
    title: "Нұсқаулықтар мен басшылық",
    subtitle: "Ыңғайлы форматты таңдаңыз: бейнероликтерді көріңіз немесе скриншоттары бар суретті қадамдық нұсқаулықты оқыңыз.",
    mode_video: "🎥 Бейненұсқаулықтар",
    mode_docs: "📖 Скриншоттары бар құжаттама",
    tab_all: "Барлық бөлімдер",
    tab_resident: "Тұрғындарға",
    tab_osi: "Төрағаларға (МТБ)",
    tab_master: "Шеберлерге",
    watch_btn: "Бейнені көру",
    print_btn: "Басып шығару / PDF",
    step_label: "Қадам",
    tip_label: "Пайдалы кеңес:",
    bot_help_title: "Сұрақтарыңыз қалды ма немесе көмек керек пе?",
    bot_help_desc: "Telegram-бот @fixlyosibot және қолдау қызметі тіркелуге, үйді енгізуге және дауыс беруге көмектесуге дайын.",
    bot_btn: "Telegram-ботты ашу",

    docs: [
      {
        id: "auth",
        category: "resident",
        tag: "Жылдам кіру",
        title: "1. Жүйеге кіру және Telegram-ды байланыстыру (құпиясөзсіз)",
        desc: "Fixly жүйесіне кіру Telegram-ға келетін бірреттік 6 таңбалы код арқылы жүзеге асады. Құпиясөз есте сақтаудың қажеті жоқ.",
        time: "1 мин",
        steps: [
          {
            num: 1,
            title: "Телефон нөміріңізді енгізіңіз",
            desc: "Кіру бетінде +7 (7XX) XXX-XX-XX форматындағы қазақстандық нөміріңізді жазыңыз.",
            uiMockup: {
              screenTitle: "Fixly-ге кіру",
              badge: "1 / 3 қадам",
              fields: [
                { label: "Телефон немесе email", value: "+7 (771) 373-08-82", active: true },
              ],
              buttonText: "Кодты алу",
              note: "Код ресми @fixlyosibot ботына жіберіледі",
            },
          },
          {
            num: 2,
            title: "Telegram-ботта нөмірді растаңыз",
            desc: "@fixlyosibot ботына өтіп, төмендегі «📱 Кіру үшін нөмірмен бөлісу» түймесін бір рет басыңыз.",
            uiMockup: {
              screenTitle: "Telegram: @fixlyosibot",
              badge: "2 / 3 қадам",
              fields: [
                { label: "Бот", value: "👋 Fixly жүйесіне қош келдіңіз!", active: false },
                { label: "Әрекет", value: "Төмендегі батырманы басыңыз ⬇️", active: true },
              ],
              buttonText: "📱 Кіру үшін нөмірмен бөлісу",
              note: "Нөмір бір рет қана байланыстырылады",
            },
          },
          {
            num: 3,
            title: "6 таңбалы кодты енгізіңіз",
            desc: "Бот тексеру кодын жібереді. Оны сайтқа немесе мобильді қосымшаға енгізіңіз — кіру сәтті аяқталды!",
            uiMockup: {
              screenTitle: "Кіруді растау",
              badge: "3 / 3 қадам",
              fields: [
                { label: "Telegram-нан келген код", value: "4  8  2  9  1  5", active: true },
              ],
              buttonText: "Кабинетке кіру",
              note: "Сессия 30 күн бойы жарамды",
            },
          },
        ],
        tip: "Смартфоннан кіргенде код автоматты түрде қойылуы мүмкін. Қосымша телефонда да, браузерде де жұмыс істейді.",
      },
      {
        id: "master_request",
        category: "resident",
        tag: "Тұрғындарға",
        title: "2. Шеберді үйге шақыру және фотомен өтінім беру",
        desc: "Сантехниктерді, электриктерді және құрылыс шеберлерін 30 күндік кепілдікпен тапсырыс беріп шақырыңыз.",
        time: "2 мин",
        steps: [
          {
            num: 1,
            title: "Қызмет санатын таңдаңыз",
            desc: "«Шеберлер» қойындысын ашып, қажетті бағытты таңдаңыз: Сантехника, Электрика, Әрлеу, Құлыптар.",
            uiMockup: {
              screenTitle: "Қызметтер каталогы",
              badge: "1 / 3 қадам",
              fields: [
                { label: "Санаттар", value: "🚰 Сантехника  ⚡️ Электрика  🔑 Құлыптар", active: true },
                { label: "Қала", value: "Көкшетау / Астана / Алматы", active: false },
              ],
              buttonText: "Маманды таңдау",
              note: "Рейтингі бар 150-ден астам тексерілген шебер",
            },
          },
          {
            num: 2,
            title: "Ақауды сипаттап, фото тіркеңіз",
            desc: "Ақау болған орынды телефон камерасына түсіріп тіркеңіз. Бұл шеберге қажетті бөлшектерді бірге ала келуге көмектеседі.",
            uiMockup: {
              screenTitle: "Жаңа өтінім",
              badge: "2 / 3 қадам",
              fields: [
                { label: "Сипаттама", value: "Ас үйде раковинаның астынан су тамшылап тұр", active: false },
                { label: "Фотосурет", value: "📷 photo_defect_01.jpg қосылды", active: true },
              ],
              buttonText: "Өтінімді жариялау",
              note: "Шеберлер фотоны көріп, нақты бағасын айтады",
            },
          },
          {
            num: 3,
            title: "Уақытты келісіп, жұмысты қабылдаңыз",
            desc: "Қосымшадағы чатта сөйлесіңіз. Жөндеу аяқталған соң шебер «КЕЙІН» фотосын жүктейді, ал сіз 30 күндік кепілдікпен қабылдайсыз.",
            uiMockup: {
              screenTitle: "Тапсырыс орындалды",
              badge: "3 / 3 қадам",
              fields: [
                { label: "Мәртебе", value: "✅ Тұрғын жұмысты қабылдады", active: false },
                { label: "Кепілдік", value: "🛡 30 күндік ресми кепілдік", active: true },
              ],
              buttonText: "Шеберге пікір қалдыру",
              note: "Платформа комиссиясы небәрі 3%",
            },
          },
        ],
        tip: "Тапсырыстарды қосымшадан тыс өткізбеңіз — тек Fixly арқылы ресімделген жұмыстарға 30 күндік кепілдік беріледі.",
      },
      {
        id: "voting",
        category: "resident",
        tag: "Кондоминиум",
        title: "3. ҚР Заңы бойынша онлайн дауыс беру",
        desc: "Пәтерлерді араламай-ақ, заңды түрде дауыстарды жинау. Жүйе кворумды және пәтер аудандарын автоматты есептейді.",
        time: "2 мин",
        steps: [
          {
            num: 1,
            title: "Белсенді сауалнаманы ашыңыз",
            desc: "Дауыс беру басталғанда Telegram-ға және қосымшаға хабарлама келеді. Үй жиналысының карточкасын басыңыз.",
            uiMockup: {
              screenTitle: "№ 48 үйдің жиналысы",
              badge: "1 / 3 қадам",
              fields: [
                { label: "Күн тәртібі", value: "1. Шатырды жөндеу сметасын бекіту", active: true },
                { label: "Мерзімі", value: "2026 жылғы 25 тамызға дейін", active: false },
              ],
              buttonText: "Бюллетеньге өту",
              note: "Кворум: аудандардың >50% қатысуы қажет",
            },
          },
          {
            num: 2,
            title: "Сметамен және құжаттармен танысыңыз",
            desc: "Әрбір сұраққа шығындар сметасы және PDF форматындағы келісімшарт жобалары тіркелген.",
            uiMockup: {
              screenTitle: "Жиналыс құжаттары",
              badge: "2 / 3 қадам",
              fields: [
                { label: "Құжат", value: "📄 Smeta_shatyr_2026.pdf (1.2 MB)", active: true },
                { label: "Сомасы", value: "Жинақтау шотынан 850 000 ₸", active: false },
              ],
              buttonText: "Есептерді қарау",
              note: "Толық қаржылық ашықтық",
            },
          },
          {
            num: 3,
            title: "1 батырмамен дауыс беріңіз",
            desc: "«Қолдаймын», «Қарсымын» немесе «Қалыс қалдым» деп таңдаңыз. Пәтеріңіздің ауданы бірден есептеледі.",
            uiMockup: {
              screenTitle: "Сіздің таңдауыңыз",
              badge: "3 / 3 қадам",
              fields: [
                { label: "Таңдау", value: "🟢 ҚОЛДАЙМЫН  |  🔴 ҚАРСЫМЫН", active: true },
                { label: "Дауыс салмағы", value: "14-пәтер — 64.5 ш.м (1.82% кворум)", active: false },
              ],
              buttonText: "Дауысты растау",
              note: "Хаттама автоматты түрде жасалады",
            },
          },
        ],
        tip: "ҚР «Тұрғын үй қатынастары туралы» Заңы бойынша электрондық хаттамалар банктер мен Тұрғын үй инспекциясы үшін толық заңды күшке ие.",
      },
      {
        id: "chairman_guide",
        category: "osi",
        tag: "МТБ / НСУ / УК",
        title: "4. Төраға кабинеті: оцифровка (2 500 ₸) және № 163 есептер",
        desc: "Үйді басқаруды толық автоматтандыру: пәтерлерді импорттау, дербес шоттар және ҚР Министрлігінің формасы бойынша жылдық PDF есеп.",
        time: "4 мин",
        steps: [
          {
            num: 1,
            title: "Үйді қосу және пәтерлерді енгізу",
            desc: "Пәтерлер тізімін Excel-ден жүктеңіз немесе бар-жоғы 2 500 ₸-ге Fixly мамандарына оцифровка жасауға тапсырыс беріңіз.",
            uiMockup: {
              screenTitle: "Меншік иелерінің тізілімі",
              badge: "1 / 3 қадам",
              fields: [
                { label: "Нысан", value: "Көкшетау қ., Абай к-сі, 48-үй", active: false },
                { label: "Пәтерлер", value: "72 пәтер / 4 860 ш.м", active: true },
              ],
              buttonText: "⚡️ Оцифровкаға тапсырыс беру (2 500 ₸)",
              note: "Орындалу мерзімі — 1 жұмыс күні",
            },
          },
          {
            num: 2,
            title: "Жарналар мен шығыстарды жүргізу",
            desc: "Ағымдағы және жинақтау түсімдерін, сантехника мен аула шығындарын белгілеңіз. Тұрғындар ашық есептерді көреді.",
            uiMockup: {
              screenTitle: "Қаржы және сметалар",
              badge: "2 / 3 қадам",
              fields: [
                { label: "МТБ тарифі", value: "120 ₸ / ш.м (алғашқы 3 ай 50 ₸)", active: true },
                { label: "Айлық түсім", value: "583 200 ₸ (жинау деңгейі 94%)", active: false },
              ],
              buttonText: "Түбіртектерді жасау",
              note: "WhatsApp-қа автоматты жіберу",
            },
          },
          {
            num: 3,
            title: "ҚР Өнеркәсіп министрлігінің № 163 форма бойынша жылдық PDF есебі",
            desc: "Жыл соңында «Жылдық есепті қалыптастыру» түймесін басыңыз — жүйе мемлекеттік стандартқа сай басып шығаруға дайын құжатты жасайды.",
            uiMockup: {
              screenTitle: "Есептер генераторы",
              badge: "3 / 3 қадам",
              fields: [
                { label: "Форма", value: "ҚР МИИР № 163 (МТБ жылдық есебі)", active: true },
                { label: "Формат", value: "Кіріс/шығыс кестелері бар дайын PDF", active: false },
              ],
              buttonText: "📥 Жылдық есепті жүктеу (PDF)",
              note: "Жалпы жиналыста тапсыруға дайын",
            },
          },
        ],
        tip: "Fixly пилоттық бағдарламасы бойынша алғашқы 3 айға тариф бір пәтерге небәрі 50 ₸ құрайды. Төлем шотын «Тарифтер» бөлімінде алуға болады.",
      },
    ],

    videos: [
      {
        id: "auth_v",
        tag: "Авторизация",
        title: "Telegram OTP арқылы Fixly-ге кіру",
        duration: "1:45 мин",
        desc: "Телефон нөмірімен кіру және @fixlyosibot ботынан тексеру кодын алу процесі.",
        link: "https://t.me/fixlyosibot?start=video",
      },
      {
        id: "master_v",
        tag: "Шеберлер",
        title: "Шеберді шақыру және фотомен өтінім беру",
        duration: "2:30 мин",
        desc: "Сантехник немесе электрикті қалай шақыру және кепілдік алу жолдары.",
        link: "https://t.me/fixlyosibot?start=video",
      },
      {
        id: "voting_v",
        tag: "Дауыс беру",
        title: "Онлайн жиналыстар және кворумды есептеу",
        duration: "2:15 мин",
        desc: "Тұрғындар үйді жөндеуге қалай дауыс береді және кворум қалай саналады.",
        link: "https://youtu.be/1l0IeDFhXS0",
      },
      {
        id: "osi_v",
        tag: "МТБ / НСУ / УК",
        title: "Төраға кабинеті: есептер және оцифровка",
        duration: "4:10 мин",
        desc: "Пәтерлерді енгізу, 2 500 ₸ оцифровка және № 163 жылдық есепті жүктеу.",
        link: "https://t.me/fixlyosibot?start=osi",
      },
    ],
  },

  en: {
    back: "Back to Home",
    badge: "Fixly Learning & Documentation Center",
    title: "Guides & Documentation",
    subtitle: "Choose your preferred learning style: watch HD video tutorials or read step-by-step documentation with screenshots.",
    mode_video: "🎥 Video Tutorials",
    mode_docs: "📖 Documentation & Screenshots",
    tab_all: "All Sections",
    tab_resident: "Residents",
    tab_osi: "Chairmen (HOA)",
    tab_master: "Masters",
    watch_btn: "Watch Video",
    print_btn: "Print / PDF",
    step_label: "Step",
    tip_label: "Helpful Tip:",
    bot_help_title: "Need personalized assistance?",
    bot_help_desc: "Our Telegram bot @fixlyosibot and support team are available to help you with registration and building onboarding.",
    bot_btn: "Open Telegram Bot",

    docs: [
      {
        id: "auth",
        category: "resident",
        tag: "Quick Start",
        title: "1. Passwordless Login via Telegram OTP",
        desc: "Fixly uses 6-digit one-time codes delivered via Telegram. No complicated passwords to remember.",
        time: "1 min",
        steps: [
          {
            num: 1,
            title: "Enter your phone number",
            desc: "On the login screen, enter your Kazakhstan mobile number in +7 (7XX) XXX-XX-XX format.",
            uiMockup: {
              screenTitle: "Fixly Login",
              badge: "Step 1 of 3",
              fields: [
                { label: "Phone or email", value: "+7 (771) 373-08-82", active: true },
              ],
              buttonText: "Request Code",
              note: "Code will be delivered to @fixlyosibot",
            },
          },
          {
            num: 2,
            title: "Confirm phone in Telegram bot",
            desc: "Open @fixlyosibot on Telegram and tap '📱 Share Phone for Login'.",
            uiMockup: {
              screenTitle: "Telegram: @fixlyosibot",
              badge: "Step 2 of 3",
              fields: [
                { label: "Bot", value: "👋 Welcome to Fixly Platform!", active: false },
                { label: "Action", value: "Tap the button at the bottom ⬇️", active: true },
              ],
              buttonText: "📱 Share Phone for Login",
              note: "One-time number verification",
            },
          },
          {
            num: 3,
            title: "Enter 6-digit code",
            desc: "Enter the code received from the bot. Your session is now active!",
            uiMockup: {
              screenTitle: "Verify Code",
              badge: "Step 3 of 3",
              fields: [
                { label: "Code from Telegram", value: "4  8  2  9  1  5", active: true },
              ],
              buttonText: "Sign In",
              note: "Session remains active for 30 days",
            },
          },
        ],
        tip: "The application is fully responsive on desktop browsers, iOS, and Android devices.",
      },
      {
        id: "master_request",
        category: "resident",
        tag: "For Residents",
        title: "2. Booking a Master & Photo Defect Requests",
        desc: "Hire verified local plumbers, electricians, and handymen with upfront estimates and 30-day warranty.",
        time: "2 min",
        steps: [
          {
            num: 1,
            title: "Choose service category",
            desc: "Open the 'Masters' catalog: Plumbing, Electrical, Locksmith, Finishing.",
            uiMockup: {
              screenTitle: "Service Catalog",
              badge: "Step 1 of 3",
              fields: [
                { label: "Categories", value: "🚰 Plumbing  ⚡️ Electrical  🔑 Locks", active: true },
                { label: "City", value: "Kokshetau / Astana / Almaty", active: false },
              ],
              buttonText: "Choose Specialist",
              note: "150+ verified masters with ratings",
            },
          },
          {
            num: 2,
            title: "Describe problem and attach photos",
            desc: "Take a photo of the defect directly with your phone camera.",
            uiMockup: {
              screenTitle: "New Request",
              badge: "Step 2 of 3",
              fields: [
                { label: "Description", value: "Leaking kitchen faucet under the sink", active: false },
                { label: "Photo", value: "📷 photo_defect_01.jpg attached", active: true },
              ],
              buttonText: "Publish Request",
              note: "Masters see the photo and quote accurate prices",
            },
          },
          {
            num: 3,
            title: "Confirm completion & warranty",
            desc: "After work is finished, the specialist uploads an 'AFTER' photo and your 30-day warranty starts.",
            uiMockup: {
              screenTitle: "Job Completed",
              badge: "Step 3 of 3",
              fields: [
                { label: "Status", value: "✅ Approved by Resident", active: false },
                { label: "Warranty", value: "🛡 30 Days Workmanship Warranty", active: true },
              ],
              buttonText: "Leave Master Review",
              note: "Platform fee is only 3%",
            },
          },
        ],
        tip: "Only requests completed within Fixly are covered by the 30-day workmanship warranty.",
      },
      {
        id: "voting",
        category: "resident",
        tag: "Condominium",
        title: "3. Digital Online Voting (General Meetings)",
        desc: "Legally compliant voting for homeowners with automated quorum calculation weighted by apartment area.",
        time: "2 min",
        steps: [
          {
            num: 1,
            title: "Open active poll",
            desc: "You will receive a Telegram and push notification when a new vote opens.",
            uiMockup: {
              screenTitle: "Building #48 Voting",
              badge: "Step 1 of 3",
              fields: [
                { label: "Agenda", value: "1. Roof repair budget approval", active: true },
                { label: "Deadline", value: "Until August 25, 2026", active: false },
              ],
              buttonText: "Open Ballot",
              note: "Quorum required: >50% of total area",
            },
          },
          {
            num: 2,
            title: "Review estimates and proposals",
            desc: "Each item has attached PDF budget sheets and contractor proposals.",
            uiMockup: {
              screenTitle: "Meeting Materials",
              badge: "Step 2 of 3",
              fields: [
                { label: "Document", value: "📄 Smeta_roof_2026.pdf (1.2 MB)", active: true },
                { label: "Amount", value: "850,000 ₸ from savings account", active: false },
              ],
              buttonText: "Review Calculations",
              note: "Full financial transparency",
            },
          },
          {
            num: 3,
            title: "Cast your vote in 1 click",
            desc: "Select 'In Favor', 'Against', or 'Abstain'. Your square meters are tallied automatically.",
            uiMockup: {
              screenTitle: "Your Ballot",
              badge: "Step 3 of 3",
              fields: [
                { label: "Choice", value: "🟢 IN FAVOR  |  🔴 AGAINST", active: true },
                { label: "Weight", value: "Apt 14 — 64.5 sq.m (1.82% quorum)", active: false },
              ],
              buttonText: "Confirm Vote",
              note: "Protocol is generated automatically",
            },
          },
        ],
        tip: "Under RK Law 'On Housing Relations', electronic meeting protocols hold full legal validity for banks and municipal housing inspectors.",
      },
      {
        id: "chairman_guide",
        category: "osi",
        tag: "HOA / OSI / PM",
        title: "4. Chairman Portal: Digitization (2,500 ₸) & Form №163 Reports",
        desc: "Complete building management: apartment registry imports, account billing, and state-mandated annual reports.",
        time: "4 min",
        steps: [
          {
            num: 1,
            title: "Import building & residents",
            desc: "Upload Excel sheets or order our 2,500 ₸ express registry digitization service.",
            uiMockup: {
              screenTitle: "Owner Registry",
              badge: "Step 1 of 3",
              fields: [
                { label: "Building", value: "48 Abay Ave, Kokshetau", active: false },
                { label: "Apartments", value: "72 apartments / 4,860 sq.m", active: true },
              ],
              buttonText: "⚡️ Order Digitization (2,500 ₸)",
              note: "Turnaround: 1 business day",
            },
          },
          {
            num: 2,
            title: "Track fees & maintenance expenses",
            desc: "Record monthly utility contributions and maintenance costs with full transparency.",
            uiMockup: {
              screenTitle: "Finances & Budgets",
              badge: "Step 2 of 3",
              fields: [
                { label: "HOA Rate", value: "120 ₸/sq.m (50 ₸ for first 3 mo)", active: true },
                { label: "Monthly Total", value: "583,200 ₸ (94% collection rate)", active: false },
              ],
              buttonText: "Generate Invoices",
              note: "Automated WhatsApp delivery",
            },
          },
          {
            num: 3,
            title: "Export Annual PDF Report (RK Form № 163)",
            desc: "Click 'Generate Annual Report' to download the official Ministry-standard PDF file.",
            uiMockup: {
              screenTitle: "Report Generator",
              badge: "Step 3 of 3",
              fields: [
                { label: "Form", value: "MIIR RK Form № 163 (Annual HOA Report)", active: true },
                { label: "Format", value: "Printable PDF with income & expense balance", active: false },
              ],
              buttonText: "📥 Download Annual Report (PDF)",
              note: "Ready for general meeting presentation",
            },
          },
        ],
        tip: "Under our promotional pilot, the first 3 months rate is only 50 ₸ per apartment/month.",
      },
    ],

    videos: [
      {
        id: "auth_v",
        tag: "Authentication",
        title: "How to Login via Telegram OTP",
        duration: "1:45 min",
        desc: "Step-by-step mobile login using verified Telegram OTP codes.",
        link: "https://t.me/fixlyosibot?start=video",
      },
      {
        id: "master_v",
        tag: "Masters",
        title: "How to Hire a Master with Photos",
        duration: "2:30 min",
        desc: "Booking plumbers and electricians with photo proof and warranty.",
        link: "https://t.me/fixlyosibot?start=video",
      },
      {
        id: "voting_v",
        tag: "Voting",
        title: "Digital Voting & Quorum Calculation",
        duration: "2:15 min",
        desc: "How residents vote on repairs and how quorum is automatically tallied.",
        link: "https://youtu.be/1l0IeDFhXS0",
      },
      {
        id: "osi_v",
        tag: "HOA / OSI / PM",
        title: "Chairman Guide: Reports & Digitization",
        duration: "4:10 min",
        desc: "Apartment registry onboarding, 2,500 ₸ data entry, and Form №163 PDF export.",
        link: "https://t.me/fixlyosibot?start=osi",
      },
    ],
  },
};

export default function InstructionsPage() {
  const { language } = useTranslation();
  const t = INSTRUCTIONS_I18N[language] || INSTRUCTIONS_I18N.ru;
  const [viewMode, setViewMode] = useState<"docs" | "video">("docs");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filteredDocs =
    activeCategory === "all"
      ? t.docs
      : t.docs.filter((d) => d.category === activeCategory);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            {t.back}
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="hidden sm:inline-flex rounded-xl gap-1.5 text-xs font-semibold"
            >
              <Printer size={14} />
              {t.print_btn}
            </Button>
            <LanguageToggle />
            <ThemeToggle />
            <Button asChild size="sm" className="rounded-xl px-4 font-semibold shadow-sm">
              <Link href="/login">Войти</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 print:py-2 print:px-0">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 print:mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary mb-3 shadow-sm print:hidden">
            <Sparkles size={14} />
            <span>{t.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3 text-balance print:text-2xl">
            {t.title}
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed text-balance print:hidden">
            {t.subtitle}
          </p>

          {/* Mode Switcher Toggle: Videos vs Docs */}
          <div className="mt-8 inline-flex items-center rounded-2xl border border-border bg-card p-1.5 shadow-sm print:hidden">
            <button
              onClick={() => setViewMode("docs")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                viewMode === "docs"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={16} />
              {t.mode_docs}
            </button>
            <button
              onClick={() => setViewMode("video")}
              className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
                viewMode === "video"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Play size={16} className={viewMode === "video" ? "fill-current" : ""} />
              {t.mode_video}
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center justify-center gap-2 mb-8 overflow-x-auto pb-2 print:hidden">
          <Button
            variant={activeCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("all")}
            className="rounded-xl px-4 font-semibold text-xs"
          >
            {t.tab_all}
          </Button>
          <Button
            variant={activeCategory === "resident" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("resident")}
            className="rounded-xl px-4 font-semibold text-xs"
          >
            {t.tab_resident}
          </Button>
          <Button
            variant={activeCategory === "osi" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory("osi")}
            className="rounded-xl px-4 font-semibold text-xs"
          >
            {t.tab_osi}
          </Button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            MODE 1: ДОКУМЕНТАЦИЯ СО СКРИНШОТАМИ И ИЛЛЮСТРАЦИЯМИ
           ───────────────────────────────────────────────────────────── */}
        {viewMode === "docs" && (
          <div className="space-y-12">
            {filteredDocs.map((doc, _dIdx) => (
              <section
                key={doc.id}
                className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm print:border-none print:p-0 print:mb-8"
              >
                {/* Заголовок раздела */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-border/60 mb-6">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary mb-2">
                      <Layers size={13} />
                      {doc.tag}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      {doc.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                      {doc.desc}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 print:hidden">
                    <Clock size={14} />
                    <span>~{doc.time} чтения</span>
                  </div>
                </div>

                {/* Пошаговые шаги с макетами скриншотов */}
                <div className="grid gap-6 md:grid-cols-3">
                  {doc.steps.map((st) => (
                    <div
                      key={st.num}
                      className="flex flex-col justify-between rounded-2xl border border-border/80 bg-accent/20 p-4 transition-all hover:border-primary/40 hover:bg-accent/30 print:bg-white print:border-gray-200"
                    >
                      <div>
                        {/* Номер и название шага */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground font-black text-xs shadow-sm">
                            {st.num}
                          </span>
                          <h3 className="font-bold text-sm text-foreground leading-snug">
                            {st.title}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                          {st.desc}
                        </p>

                        {/* Макет скриншота интерфейса (UI Mockup) */}
                        <div className="rounded-xl border border-border bg-background p-3.5 shadow-inner mb-3">
                          <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2.5">
                            <span className="text-[11px] font-bold text-foreground truncate max-w-[140px]">
                              📱 {st.uiMockup.screenTitle}
                            </span>
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                              {st.uiMockup.badge}
                            </span>
                          </div>

                          {/* Поля интерфейса */}
                          <div className="space-y-1.5 mb-3">
                            {st.uiMockup.fields.map((fld, fIdx) => (
                              <div
                                key={fIdx}
                                className={`rounded-lg p-2 text-xs border ${
                                  fld.active
                                    ? "border-primary/40 bg-primary/5 font-semibold text-primary"
                                    : "border-border/60 bg-muted/40 text-muted-foreground"
                                }`}
                              >
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
                                  {fld.label}
                                </div>
                                <div className="text-xs truncate">{fld.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Кнопка действия на скриншоте */}
                          <div className="rounded-lg bg-primary/90 py-1.5 text-center text-xs font-bold text-primary-foreground shadow-sm">
                            {st.uiMockup.buttonText}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-muted-foreground text-center font-medium italic">
                        💡 {st.uiMockup.note}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Совет в конце раздела */}
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-foreground leading-relaxed print:bg-gray-50">
                  <Info size={18} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-primary font-bold">{t.tip_label} </strong>
                    <span className="text-muted-foreground">{doc.tip}</span>
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MODE 2: ОБУЧАЮЩИЕ ВИДЕОРОЛИКИ И ВСТРОЕННЫЙ YOUTUBE ПЛЕЕР
           ───────────────────────────────────────────────────────────── */}
        {viewMode === "video" && (
          <div className="space-y-8">
            {/* 1. Большой главный видеокурс (Горизонтальный 16:9) */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-border/60">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary mb-2">
                    <Play size={13} className="fill-current" />
                    Официальный видеокурс Fixly
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                    Обзор экосистемы Fixly: онлайн-ОСС и отчеты ОСИ
                  </h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Смотрите подробный видеоразбор работы платформы с субтитрами прямо на сайте или на YouTube.
                  </p>
                </div>
              </div>

              <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border shadow-lg bg-black mb-4">
                <iframe
                  className="absolute inset-0 h-full w-full"
                  src="https://www.youtube.com/embed/6VHxtXRnv3E?rel=0&cc_load_policy=1&hl=ru"
                  title="Fixly Видеоинструкция"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <span className="text-xs text-muted-foreground">
                  ⏱ Длительность: 3:15 мин · Качество: 1080p Full HD
                </span>
                <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                  <a href="https://youtu.be/6VHxtXRnv3E" target="_blank" rel="noreferrer">
                    Открыть в приложении YouTube
                    <ExternalLink size={13} className="ml-1.5 opacity-70" />
                  </a>
                </Button>
              </div>
            </div>

            {/* 2. Вертикальный YouTube Shorts гайд (9:16) */}
            <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-sm">
              <div className="grid md:grid-cols-[1fr_320px] gap-6 items-center">
                <div>
                  <span className="rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-500 mb-2 inline-block">
                    ⚡️ YouTube Shorts & Reels
                  </span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight mb-2">
                    Как подать заявку в ОСИ за 15 секунд
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mb-6">
                    Быстрый экспресс-гайд по подаче заявки мастеру, вызову сантехника или электрика и контролю статуса ремонта прямо со смартфона.
                  </p>
                  <Button asChild className="rounded-xl font-bold" size="sm">
                    <a href="https://youtube.com/shorts/r9n6Fv4aP00" target="_blank" rel="noreferrer">
                      Смотреть в YouTube Shorts
                      <ExternalLink size={13} className="ml-1.5 opacity-70" />
                    </a>
                  </Button>
                </div>

                <div className="relative aspect-[9/16] w-full max-w-[280px] mx-auto overflow-hidden rounded-2xl border border-border shadow-lg bg-black">
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src="https://www.youtube.com/embed/r9n6Fv4aP00?rel=0"
                    title="Fixly Shorts"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Подвал и карточка Telegram-бота */}
        <div className="mt-14 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-primary/10 p-8 text-center max-w-2xl mx-auto shadow-sm print:hidden">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
            <HelpCircle size={24} />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">
            {t.bot_help_title}
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mb-6 leading-relaxed">
            {t.bot_help_desc}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="rounded-2xl px-6 font-bold shadow-md">
              <a href="https://t.me/fixlyosibot?start=video" target="_blank" rel="noreferrer">
                {t.bot_btn}
                <ExternalLink size={16} className="ml-2" />
              </a>
            </Button>
            <Button variant="outline" size="lg" onClick={handlePrint} className="rounded-2xl px-5 font-semibold">
              <Printer size={16} className="mr-2" />
              {t.print_btn}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
