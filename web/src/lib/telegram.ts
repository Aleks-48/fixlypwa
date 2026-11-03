import { prisma } from "./db/prisma";
import { env } from "./env";
import { maskPhone,normalizeKzPhone } from "./phone";

const TELEGRAM_API = "https://api.telegram.org";

export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://legless-bennie-sheepish.ngrok-free.dev"
).replace(/\/+$/, "");

// Хранилище языков пользователей Telegram в памяти (с fallback на RU)
const userLanguages = new Map<string, "ru" | "kk" | "en">();

export function getUserLang(chatId: string): "ru" | "kk" | "en" {
  return userLanguages.get(chatId) || "ru";
}

export function setUserLang(chatId: string, lang: "ru" | "kk" | "en") {
  userLanguages.set(chatId, lang);
}

// ─── API Telegram ─────────────────────────────────────────────────────────────

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: Record<string, unknown>,
  parseMode?: string
): Promise<void> {
  if (env.TELEGRAM_PROVIDER === "console") {
    console.info(`[TELEGRAM:console] chat ${chatId} → ${text}`);
    return;
  }
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_PROVIDER=bot: TELEGRAM_BOT_TOKEN обязателен");
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text,
  };

  if (parseMode) {
    payload.parse_mode = parseMode;
  }

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const res = await fetch(`${TELEGRAM_API}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });

  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; description?: string }
    | null;
  if (!res.ok || !json?.ok) {
    throw new Error(`Telegram: не удалось отправить сообщение (${json?.description ?? res.status})`);
  }
}

// ─── Словари бота на 3 языка ──────────────────────────────────────────────────

const BOT_I18N = {
  ru: {
    welcome: "👋 Добро пожаловать в *Fixly* — единую цифровую платформу для управления домами (*ОСИ / НСУ / УК*), жильцов и мастеров в Республике Казахстан 🇰🇿\n\nВыберите нужный раздел в меню ниже:",
    menu_share_phone: "📱 Поделиться номером для входа",
    menu_osi: "🏢 Председателям ОСИ / НСУ",
    menu_masters: "🛠 Мастерам (3%)",
    menu_data_entry: "📋 Оцифровка дома (2 500 ₸)",
    menu_resident: "🏠 Жильцам",
    menu_video: "🎥 Видеоинструкции",
    menu_ikomek: "🚨 iKomek 109 / Аварийные службы",
    menu_legal: "📜 Оферты и документы",
    menu_faq: "❓ Частые вопросы",
    menu_lang: "🌐 Тіл / Язык (Language)",
    menu_support: "💬 Написать в поддержку",

    phone_linked_success: "✅ *Отлично! Ваш номер успешно привязан.*\n\nТеперь вернитесь на сайт или в приложение Fixly — код авторизации придет сюда в чат.",
    phone_linked_error: "Не удалось распознать номер. Пожалуйста, отправьте контакт через кнопку.",

    lang_selected: "✅ Язык интерфейса бота переключен на: *Русский* 🇷🇺",

    video_text: "🎥 *Обучающие видеоинструкции Fixly:*\n\nНажмите на нужную кнопку ниже, чтобы открыть видеоролик:",
    video_btn_auth: "▶️ Как войти и авторизоваться",
    video_btn_master: "▶️ Как подать заявку мастеру",
    video_btn_voting: "▶️ Онлайн-голосования и кворум",
    video_btn_osi: "▶️ Инструкция председателя (ОСИ / НСУ)",

    data_entry_text:
      "📋 *Услуга первичного занесения данных Fixly:*\n\n" +
      "Не хочется заполнять поквартирный список вручную?\n" +
      "Наша команда оцифрует и внесет все квартиры, собственников и площади в систему за вас.\n\n" +
      "💰 *Стоимость:* от 2 500 ₸ за дом\n" +
      "⚡️ *Срок:* 1 рабочий день\n\n" +
      "Чтобы заказать, отправьте адрес дома, количество квартир и контактный телефон в ответ на это сообщение, или нажмите кнопку ниже:",

    osi_text:
      "🏢 *Председателям и управляющим (ОСИ / НСУ / УК):*\n\n" +
      "Fixly автоматизирует управление домом и экономит до 15 часов в неделю:\n\n" +
      "• *Тариф «Стандарт»*: 120 ₸/кв/мес (*50 ₸* первые 3 месяца по пилотной программе)\n" +
      "• *Тариф «VIP»*: 140 ₸/кв/мес (приоритетная поддержка)\n" +
      "• *Тариф «Максимальный»*: 160 ₸/кв/мес (полная автоматизация)\n\n" +
      "📊 *Ключевые функции:*\n" +
      "— Автоматические годовые и месячные отчеты в PDF по форме № 163 Минпрома РК\n" +
      "— Юридически легитимные онлайн-голосования с расчетом кворума\n" +
      "— Прием заявок жителей с фото и перепиской\n" +
      "— Оцифровка реестра квартир за 2 500 ₸",

    master_text:
      "🛠 *Мастерам и сервисным специалистам:*\n\n" +
      "Fixly — ваш инструмент для получения прямых заказов от жителей города (Сантехника, Электрика, Отделка, Замки).\n\n" +
      "• *Комиссия платформы*: всего 3% от выполненного заказа\n" +
      "• *Вы работаете на себя*: статус независимого исполнителя (ИП / самозанятый)\n" +
      "• *Техрегламент*: обязательная фотофиксация ДО/ПОСЛЕ и 30 дней гарантии\n" +
      "• *Запрет прямых расчетов*: увод клиентов в обход приложения запрещен",

    resident_text:
      "🏠 *Жителям и арендаторам квартир:*\n\n" +
      "Все функции вашего дома в одном приложении — *100% бесплатно*:\n\n" +
      "— Подача заявок на ремонт с фотографиями\n" +
      "— Участие в собраниях и онлайн-голосованиях дома\n" +
      "— Просмотр прозрачных квитанций и отчетов ОСИ\n" +
      "— Заказ проверенных мастеров города с рейтингом",

    ikomek_text:
      "🚨 *Оперативные и аварийные службы ЖКХ (г. Кокшетау и РК):*\n\n" +
      "• 📞 *Единый контакт-центр:* 109 (iKomek)\n" +
      "• 🚒 *Служба спасения / ЧС:* 112\n" +
      "• 💧 *Горводоканал:* +7 (7162) 72-20-40\n" +
      "• ⚡️ *Горэлектросети:* +7 (7162) 72-10-10\n" +
      "• ♨️ *Теплотранзит / Отопление:* +7 (7162) 72-30-30\n" +
      "• 👮 *Полиция:* 102 | 🚑 *Скорая помощь:* 103",

    legal_text:
      "📜 *Правовой центр и Публичные Оферты Fixly:*\n\n" +
      "Платформа действует в строгом соответствии с Законами РК «О жилищных отношениях» и «О персональных данных» (№ 94-V). Все серверы расположены в Республике Казахстан.\n\n" +
      "Ознакомьтесь с официальными документами по ссылкам ниже:",

    faq_text:
      "❓ *Частые вопросы (FAQ):*\n\n" +
      "*1. Кто отвечает за качество ремонта?*\n" +
      "Исполнитель (Мастер) несет прямую гражданско-правовую ответственность за монтаж и качество работ, предоставляя гарантию 30 дней.\n\n" +
      "*2. Упразднены ли КСК?*\n" +
      "Да, согласно реформе ЖКХ РК старые КСК упразднены. Законными формами являются исключительно ОСИ, НСУ (до 16 квартир) и Управляющие компании.\n\n" +
      "*3. Как заказать оцифровку дома?*\n" +
      "Нажмите кнопку «Оцифровка дома (2 500 ₸)» в меню или перейдите на fixly.kz/pricing.",

    support_text:
      "💬 *Служба заботы и технической поддержки Fixly:*\n\n" +
      "Если у вас есть вопросы по подключению дома, подаче заявок или работе сервиса, напишите нам сообщение прямо сюда или администратору: @fixlysupport.\n\n" +
      "Мы на связи ежедневно!",
  },

  kk: {
    welcome: "👋 *Fixly* — Қазақстан Республикасындағы үйлерді басқару (*МТБ / НСУ / УК*), тұрғындар мен шеберлерге арналған бірыңғай цифрлық платформаға қош келдіңіз! 🇰🇿\n\nТөмендегі мәзірден қажетті бөлімді таңдаңыз:",
    menu_share_phone: "📱 Кіру үшін нөмірмен бөлісу",
    menu_osi: "🏢 МТБ / НСУ Төрағаларына",
    menu_masters: "🛠 Шеберлерге (3%)",
    menu_data_entry: "📋 Үйді оцифровкалау (2 500 ₸)",
    menu_resident: "🏠 Тұрғындарға",
    menu_video: "🎥 Бейненұсқаулықтар",
    menu_ikomek: "🚨 iKomek 109 / Апаттық қызметтер",
    menu_legal: "📜 Оферталар мен құжаттар",
    menu_faq: "❓ Жиі қойылатын сұрақтар",
    menu_lang: "🌐 Тіл / Язык (Language)",
    menu_support: "💬 Қолдау қызметіне жазу",

    phone_linked_success: "✅ *Тамаша! Телефон нөміріңіз сәтті байланыстырылды.*\n\nЕнді Fixly сайтына немесе қосымшасына оралыңыз — авторизация коды осы чатқа келеді.",
    phone_linked_error: "Нөмірді анықтау мүмкін болмады. Түймені басып қайта жіберіңіз.",

    lang_selected: "✅ Бот интерфейсінің тілі ауыстырылды: *Қазақша* 🇰🇿",

    video_text: "🎥 *Fixly жүйесі бойынша бейненұсқаулықтар:*\n\nКеректі бейнені таңдаңыз:",
    video_btn_auth: "▶️ Жүйеге қалай кіру керек",
    video_btn_master: "▶️ Шеберге өтінім беру",
    video_btn_voting: "▶️ Онлайн дауыс беру",
    video_btn_osi: "▶️ Төрағаға арналған нұсқаулық",

    data_entry_text:
      "📋 *Fixly деректерді бастапқы енгізу қызметі:*\n\n" +
      "Пәтерлер тізімін қолмен толтырғыңыз келмей ме?\n" +
      "Біздің команда барлық пәтерлерді, меншік иелерін және аудандарды жүйеге сіз үшін енгізіп береді.\n\n" +
      "💰 *Құны:* бір үйге 2 500 ₸-ден бастап\n" +
      "⚡️ *Мерзімі:* 1 жұмыс күні\n\n" +
      "Тапсырыс беру үшін үйдің мекенжайын және байланыс нөмірін жазыңыз:",

    osi_text:
      "🏢 *Төрағалар мен басқарушыларға (МТБ / НСУ / УК):*\n\n" +
      "Fixly үйді басқаруды автоматтандырады және аптасына 15 сағатқа дейін үнемдейді:\n\n" +
      "• *«Стандарт» тарифі*: пәтеріне 120 ₸/ай (пилот бойынша алғашқы 3 айға *50 ₸*)\n" +
      "• *«VIP» тарифі*: 140 ₸/ай (басымдықты қолдау)\n" +
      "• *«Максималды» тарифі*: 160 ₸/ай (толық автоматтандыру)\n\n" +
      "📊 *Негізгі мүмкіндіктер:*\n" +
      "— ҚР Өнеркәсіп министрлігінің № 163 ресми формасы бойынша жылдық PDF есептер\n" +
      "— Заңды онлайн дауыс беру және кворумды есептеу\n" +
      "— Тұрғындардан фотосы бар өтінімдерді қабылдау\n" +
      "— Пәтерлер тізілімін 2 500 ₸-ге оцифровкалау",

    master_text:
      "🛠 *Шеберлер мен мамандарға:*\n\n" +
      "Fixly — қала тұрғындарынан тікелей тапсырыстар алу құралыңыз (Сантехника, Электрика, Әрлеу, Құлыптар).\n\n" +
      "• *Платформа комиссиясы*: орындалған тапсырыстан небәрі 3%\n" +
      "• *Мәртебе*: тәуелсіз мердігер (ЖК / өзін-өзі жұмыспен қамтыған)\n" +
      "• *Техрегламент*: ДЕЙІН/КЕЙІН фотоесеп және 30 күн кепілдік\n" +
      "• *Тікелей есеп айырысуға тыйым*: тапсырысты қосымшадан тыс өткізуге болмайды",

    resident_text:
      "🏠 *Пәтер тұрғындары мен жалға алушыларға:*\n\n" +
      "Үйіңіздің барлық функциялары бір қосымшада — *100% ТЕГІН*:\n\n" +
      "— Жөндеуге фотосуреттермен өтінім беру\n" +
      "— Үйдің онлайн жиналыстары мен сауалнамаларына қатысу\n" +
      "— МТБ-ның ашық түбіртектері мен есептерін көру\n" +
      "— Рейтингі бар тексерілген қала шеберлерін шақыру",

    ikomek_text:
      "🚨 *ТКШ жедел және апаттық қызметтері:*\n\n" +
      "• 📞 *Бірыңғай байланыс орталығы:* 109 (iKomek)\n" +
      "• 🚒 *Құтқару қызметі / ТЖ:* 112\n" +
      "• 💧 *Су арнасы:* +7 (7162) 72-20-40\n" +
      "• ⚡️ *Электр желілері:* +7 (7162) 72-10-10\n" +
      "• ♨️ *Жылу транзиті:* +7 (7162) 72-30-30\n" +
      "• 👮 *Полиция:* 102 | 🚑 *Жедел жәрдем:* 103",

    legal_text:
      "📜 *Fixly құқықтық орталығы және Қоғамдық Оферталар:*\n\n" +
      "Платформа ҚР «Тұрғын үй қатынастары туралы» және «Дербес деректер туралы» (№ 94-V) Заңдарына толық сәйкес жұмыс істейді. Барлық серверлер Қазақстанда орналасқан.\n\n" +
      "Ресми құжаттармен сілтемелер арқылы таныса аласыз:",

    faq_text:
      "❓ *Жиі қойылатын сұрақтар (FAQ):*\n\n" +
      "*1. ПИК (КСК) жойылды ма?*\n" +
      "Иә, заң бойынша ескі ПИК жойылды. Заңды түрлер: МТБ (ОСИ), ТББ/НСУ (16 пәтерге дейін) және Басқарушы компаниялар.\n\n" +
      "*2. Жөндеу сапасына кім жауапты?*\n" +
      "Орындаушы (Шебер) 30 күндік кепілдік бере отырып, тікелей азаматтық-құқықтық жауапкершілік көтереді.",

    support_text:
      "💬 *Fixly қолдау қызметі:*\n\n" +
      "Үйді қосу, өтінімдер беру немесе жүйе жұмысы туралы сұрақтарыңыз болса, осы чатқа немесе операторға жазыңыз: @fixlysupport.",
  },

  en: {
    welcome: "👋 Welcome to *Fixly* — the digital platform for building management (*HOA / OSI / Property Management*), residents, and service masters in Kazakhstan 🇰🇿\n\nChoose a category below:",
    menu_share_phone: "📱 Share Phone for Login",
    menu_osi: "🏢 For HOA / OSI Chairmen",
    menu_masters: "🛠 For Masters (3%)",
    menu_data_entry: "📋 Data Digitization (2,500 ₸)",
    menu_resident: "🏠 For Residents",
    menu_video: "🎥 Video Tutorials",
    menu_ikomek: "🚨 iKomek 109 / Emergency",
    menu_legal: "📜 Legal Offers & Policies",
    menu_faq: "❓ FAQ",
    menu_lang: "🌐 Тіл / Язык (Language)",
    menu_support: "💬 Support",

    phone_linked_success: "✅ *Great! Your phone number is successfully linked.*\n\nReturn to Fixly web or mobile app — the OTP code will be delivered here in this chat.",
    phone_linked_error: "Could not detect phone number. Please use the button to share contact.",

    lang_selected: "✅ Bot language set to: *English* 🇬🇧",

    video_text: "🎥 *Fixly Video Tutorials:*\n\nSelect a tutorial below to watch:",
    video_btn_auth: "▶️ How to Login",
    video_btn_master: "▶️ How to Hire a Master",
    video_btn_voting: "▶️ Online Voting Guide",
    video_btn_osi: "▶️ Chairman Onboarding",

    data_entry_text:
      "📋 *Fixly Building Registry Onboarding:*\n\n" +
      "Don't want to type apartments manually?\n" +
      "Our team will digitize and enter all apartments, owners, and square meters into the system for you.\n\n" +
      "💰 *Price:* from 2,500 ₸ per building\n" +
      "⚡️ *Turnaround:* 1 business day",

    osi_text:
      "🏢 *For HOA / OSI Chairmen & Property Managers:*\n\n" +
      "• *Standard Plan*: 120 ₸/apt/mo (*50 ₸* promotional pilot rate for first 3 months)\n" +
      "• *VIP Plan*: 140 ₸/apt/mo (priority support)\n" +
      "• *Maximum Plan*: 160 ₸/apt/mo (full automation)\n\n" +
      "📊 *Key Features:*\n" +
      "— Automated annual reports under RK Ministry Form № 163\n" +
      "— Legally binding online voting with quorum calculation\n" +
      "— Resident request ticketing with photos\n" +
      "— Apartment data onboarding from 2,500 ₸",

    master_text:
      "🛠 *For Masters & Service Specialists:*\n\n" +
      "Direct repair requests from city residents (Plumbing, Electrical, Finishing, Locks).\n\n" +
      "• *Commission*: 3% per completed job\n" +
      "• *Status*: Independent contractor (sole proprietor / self-employed)\n" +
      "• *Tech Regulation*: mandatory BEFORE/AFTER photo check, 30 days warranty",

    resident_text:
      "🏠 *For Residents & Tenants:*\n\n" +
      "All building management features in your smartphone — *100% FREE*:\n\n" +
      "— File repair requests with photos\n" +
      "— Participate in online meetings and voting\n" +
      "— View utility bills and transparent HOA reports\n" +
      "— Book verified masters with verified ratings",

    ikomek_text:
      "🚨 *Emergency & Municipal Hotlines (Kazakhstan):*\n\n" +
      "• 📞 *Unified Contact Center:* 109 (iKomek)\n" +
      "• 🚒 *Emergency Dispatch / Rescue:* 112\n" +
      "• 💧 *Water Utility:* +7 (7162) 72-20-40\n" +
      "• ⚡️ *Power Grid:* +7 (7162) 72-10-10\n" +
      "• ♨️ *Heating Services:* +7 (7162) 72-30-30\n" +
      "• 👮 *Police:* 102 | 🚑 *Ambulance:* 103",

    legal_text:
      "📜 *Fixly Legal Center & Public Offers:*\n\n" +
      "Fully compliant with RK Law 'On Housing Relations' and RK Law 'On Personal Data' (№ 94-V). All servers are located in Kazakhstan.\n\n" +
      "Review the official documents via the links below:",

    faq_text:
      "❓ *Frequently Asked Questions:*\n\n" +
      "*1. Are old KSК/KSK abolished?*\n" +
      "Yes, according to Kazakhstan housing legislation reform, KSK are completely abolished. Legal forms are strictly OSI (HOA), NSU/PT (up to 16 apts), and licensed Property Management Companies.",

    support_text:
      "💬 *Fixly Customer Care & Support:*\n\n" +
      "Have questions about building onboarding or requests? Message us directly here or contact: @fixlysupport.",
  },
};

// ─── Главное меню ─────────────────────────────────────────────────────────────

export async function sendMainMenu(chatId: string): Promise<void> {
  const lang = getUserLang(chatId);
  const t = BOT_I18N[lang] || BOT_I18N.ru;

  if (env.TELEGRAM_PROVIDER === "console") {
    console.info(`[TELEGRAM:console] chat ${chatId} → [Поделиться номером] ${t.welcome}`);
    return;
  }

  const replyMarkup = {
    keyboard: [
      [{ text: t.menu_share_phone, request_contact: true }],
      [{ text: t.menu_osi }, { text: t.menu_masters }],
      [{ text: t.menu_data_entry }, { text: t.menu_resident }],
      [{ text: t.menu_video }, { text: t.menu_faq }],
      [{ text: t.menu_ikomek }, { text: t.menu_legal }],
      [{ text: t.menu_lang }, { text: t.menu_support }],
    ],
    resize_keyboard: true,
  };

  await sendTelegramMessage(chatId, t.welcome, replyMarkup, "Markdown");
}

// ─── Выбор языка ──────────────────────────────────────────────────────────────

export async function sendLanguageSelection(chatId: string): Promise<void> {
  const inlineMarkup = {
    inline_keyboard: [
      [
        { text: "🇰🇿 Қазақша", callback_data: "set_lang_kk" },
        { text: "🇷🇺 Русский", callback_data: "set_lang_ru" },
        { text: "🇬🇧 English", callback_data: "set_lang_en" },
      ],
    ],
  };

  await sendTelegramMessage(
    chatId,
    "🌐 *Тілді таңдаңыз / Выберите язык / Select language:*",
    inlineMarkup,
    "Markdown"
  );
}

// ─── Меню видеоинструкций ─────────────────────────────────────────────────────

export async function sendVideoInstructions(chatId: string): Promise<void> {
  const lang = getUserLang(chatId);
  const t = BOT_I18N[lang] || BOT_I18N.ru;

  const inlineMarkup = {
    inline_keyboard: [
      [
        { text: t.video_btn_auth, url: `${APP_URL}` },
      ],
      [
        { text: t.video_btn_master, url: `${APP_URL}/app` },
      ],
      [
        { text: t.video_btn_voting, url: "https://youtu.be/1l0IeDFhXS0" },
      ],
      [
        { text: t.video_btn_osi, url: `${APP_URL}/pricing` },
      ],
    ],
  };

  await sendTelegramMessage(chatId, t.video_text, inlineMarkup, "Markdown");
}

// ─── Меню оферт ───────────────────────────────────────────────────────────────

export async function sendLegalLinks(chatId: string): Promise<void> {
  const lang = getUserLang(chatId);
  const t = BOT_I18N[lang] || BOT_I18N.ru;

  const inlineMarkup = {
    inline_keyboard: [
      [
        { text: "🏠 Оферта для Жильцов", url: `${APP_URL}/legal/terms` },
      ],
      [
        { text: "🏢 Оферта ОСИ / НСУ / УК", url: `${APP_URL}/legal/oferta-osi` },
      ],
      [
        { text: "🛠 Оферта Мастера (3%)", url: `${APP_URL}/legal/terms-master` },
      ],
      [
        { text: "🛡 Политика конфиденциальности", url: `${APP_URL}/legal/privacy` },
      ],
      [
        { text: "🎁 Меморандум Пилот 50 ₸", url: `${APP_URL}/legal/memorandum-pilot` },
      ],
    ],
  };

  await sendTelegramMessage(chatId, t.legal_text, inlineMarkup, "Markdown");
}

// ─── Меню оцифровки ───────────────────────────────────────────────────────────

export async function sendDataEntryInfo(chatId: string): Promise<void> {
  const lang = getUserLang(chatId);
  const t = BOT_I18N[lang] || BOT_I18N.ru;

  const inlineMarkup = {
    inline_keyboard: [
      [
        { text: "⚡️ Заказать оцифровку (2 500 ₸)", url: `${APP_URL}/pricing#service-data-entry` },
      ],
      [
        { text: "🌐 Тарифы на сайте", url: `${APP_URL}/pricing` },
      ],
    ],
  };

  await sendTelegramMessage(chatId, t.data_entry_text, inlineMarkup, "Markdown");
}

// ─── Меню Председателям ───────────────────────────────────────────────────────

export async function sendOsiInfo(chatId: string): Promise<void> {
  const lang = getUserLang(chatId);
  const t = BOT_I18N[lang] || BOT_I18N.ru;

  const inlineMarkup = {
    inline_keyboard: [
      [
        { text: "📊 Калькулятор тарифа на сайте", url: `${APP_URL}/pricing` },
      ],
      [
        { text: "📋 Оцифровка реестра (2 500 ₸)", callback_data: "cmd_data_entry" },
      ],
      [
        { text: "🚀 Войти в кабинет председателя", url: `${APP_URL}/login?role=chairman` },
      ],
    ],
  };

  await sendTelegramMessage(chatId, t.osi_text, inlineMarkup, "Markdown");
}

// ─── Меню Мастерам ────────────────────────────────────────────────────────────

export async function sendMasterInfo(chatId: string): Promise<void> {
  const lang = getUserLang(chatId);
  const t = BOT_I18N[lang] || BOT_I18N.ru;

  const inlineMarkup = {
    inline_keyboard: [
      [
        { text: "📝 Заполнить анкету мастера", url: `${APP_URL}/app` },
      ],
      [
        { text: "📖 Техрегламент и правила", url: `${APP_URL}/legal/master-rules` },
      ],
      [
        { text: "📜 Оферта мастера (3%)", url: `${APP_URL}/legal/terms-master` },
      ],
    ],
  };

  await sendTelegramMessage(chatId, t.master_text, inlineMarkup, "Markdown");
}

// ─── Обработка апдейтов Bot API ───────────────────────────────────────────────

export type TelegramUpdate = {
  message?: {
    chat: { id: number | string; type?: string };
    from?: { id: number | string };
    text?: string;
    contact?: { phone_number: string; user_id?: number };
  };
  callback_query?: {
    id: string;
    from: { id: number | string };
    message?: { chat: { id: number | string } };
    data?: string;
  };
};

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  // 1. Обработка нажатий Inline кнопок (callback_query)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = String(cb.message?.chat.id || cb.from.id);
    const data = cb.data;

    if (data === "set_lang_ru") {
      setUserLang(chatId, "ru");
      await sendTelegramMessage(chatId, BOT_I18N.ru.lang_selected, undefined, "Markdown");
      await sendMainMenu(chatId);
      return;
    }
    if (data === "set_lang_kk") {
      setUserLang(chatId, "kk");
      await sendTelegramMessage(chatId, BOT_I18N.kk.lang_selected, undefined, "Markdown");
      await sendMainMenu(chatId);
      return;
    }
    if (data === "set_lang_en") {
      setUserLang(chatId, "en");
      await sendTelegramMessage(chatId, BOT_I18N.en.lang_selected, undefined, "Markdown");
      await sendMainMenu(chatId);
      return;
    }
    if (data === "cmd_data_entry") {
      await sendDataEntryInfo(chatId);
      return;
    }
  }

  const message = update.message;
  if (!message) return;
  const chatId = String(message.chat.id);
  const lang = getUserLang(chatId);
  const t = BOT_I18N[lang] || BOT_I18N.ru;

  // 2. Обработка передачи контакта (привязка номера для OTP)
  if (message.contact) {
    // TECH-011: a forwarded contact must never transfer access to its phone number.
    if (
      message.chat.type !== "private" ||
      message.from?.id == null ||
      message.contact.user_id == null ||
      String(message.from.id) !== chatId ||
      String(message.contact.user_id) !== String(message.from.id)
    ) {
      await sendTelegramMessage(chatId, t.phone_linked_error);
      return;
    }
    const phone = normalizeKzPhone(message.contact.phone_number);
    if (!phone) {
      await sendTelegramMessage(chatId, t.phone_linked_error);
      return;
    }
    await prisma.telegramLink.upsert({
      where: { phone },
      create: { phone, chatId },
      update: { chatId },
    });
    console.info(`[TELEGRAM] привязан ${maskPhone(phone)} → chat ${chatId}`);
    await sendTelegramMessage(chatId, t.phone_linked_success, undefined, "Markdown");
    return;
  }

  const text = message.text?.trim() || "";

  // 3. Обработка Deep Links (/start data_entry, /start master, etc.)
  if (text.startsWith("/start")) {
    const param = text.replace("/start", "").trim();
    if (param === "data_entry") {
      await sendDataEntryInfo(chatId);
      return;
    }
    if (param === "osi") {
      await sendOsiInfo(chatId);
      return;
    }
    if (param === "master") {
      await sendMasterInfo(chatId);
      return;
    }
    if (param === "video") {
      await sendVideoInstructions(chatId);
      return;
    }
    if (param === "legal") {
      await sendLegalLinks(chatId);
      return;
    }
    if (param === "ikomek") {
      await sendTelegramMessage(chatId, t.ikomek_text, undefined, "Markdown");
      return;
    }
    await sendMainMenu(chatId);
    return;
  }

  // 4. Текстовые команды меню
  if (text === "/menu" || text === "Меню") {
    await sendMainMenu(chatId);
    return;
  }

  if (
    text.includes("Видеоинструкции") ||
    text.includes("Бейненұсқаулықтар") ||
    text.includes("Video Tutorials") ||
    text === "/video"
  ) {
    await sendVideoInstructions(chatId);
    return;
  }

  if (
    text.includes("Председателям") ||
    text.includes("Төрағаларға") ||
    text.includes("Chairmen") ||
    text === "/osi"
  ) {
    await sendOsiInfo(chatId);
    return;
  }

  if (
    text.includes("Мастерам") ||
    text.includes("Шеберлерге") ||
    text.includes("Masters") ||
    text === "/master"
  ) {
    await sendMasterInfo(chatId);
    return;
  }

  if (
    text.includes("Оцифровка") ||
    text.includes("оцифровка") ||
    text.includes("Digitization") ||
    text === "/data"
  ) {
    await sendDataEntryInfo(chatId);
    return;
  }

  if (
    text.includes("Жильцам") ||
    text.includes("Тұрғындарға") ||
    text.includes("Residents") ||
    text === "/resident"
  ) {
    await sendTelegramMessage(
      chatId,
      t.resident_text,
      {
        inline_keyboard: [
          [{ text: "🚀 Открыть Fixly", url: `${APP_URL}/login` }],
        ],
      },
      "Markdown"
    );
    return;
  }

  if (
    text.includes("iKomek") ||
    text.includes("Аварийные") ||
    text.includes("Апаттық") ||
    text === "/ikomek"
  ) {
    await sendTelegramMessage(chatId, t.ikomek_text, undefined, "Markdown");
    return;
  }

  if (
    text.includes("Оферты") ||
    text.includes("құжаттар") ||
    text.includes("Legal") ||
    text === "/legal"
  ) {
    await sendLegalLinks(chatId);
    return;
  }

  if (
    text.includes("Тіл") ||
    text.includes("Язык") ||
    text.includes("Language") ||
    text === "/lang"
  ) {
    await sendLanguageSelection(chatId);
    return;
  }

  if (
    text.includes("Частые вопросы") ||
    text.includes("сұрақтар") ||
    text.includes("FAQ") ||
    text === "/faq"
  ) {
    await sendTelegramMessage(chatId, t.faq_text, undefined, "Markdown");
    return;
  }

  if (
    text.includes("поддержку") ||
    text.includes("Қолдау") ||
    text.includes("Support") ||
    text === "/support"
  ) {
    await sendTelegramMessage(chatId, t.support_text, undefined, "Markdown");
    return;
  }

  // Дефолтный ответ
  await sendMainMenu(chatId);
}
