export interface HotlineContact {
  id: string;
  title: string;
  subtitle: string;
  phone: string;
  whatsapp?: string;
  isPrimary?: boolean;
}

export interface GarbageIssueType {
  id: string;
  label: string;
}

export interface CityData {
  id: string;
  name: string;
  ikomekWhatsapp: string;
  hotlines: HotlineContact[];
}

export const CITIES_DATA: Record<string, CityData> = {
  kokshetau: {
    id: "kokshetau",
    name: "г. Кокшетау",
    ikomekWhatsapp: "77001090109",
    hotlines: [
      {
        id: "ikomek-109",
        title: "iKomek 109 (Акимат г. Кокшетау)",
        subtitle: "Жалобы на невывоз ТБО, свалки и контейнерные площадки",
        phone: "109",
        whatsapp: "77001090109",
        isPrimary: true,
      },
      {
        id: "police-102",
        title: "102 (Участковый / Полиция)",
        subtitle: "Протокол по ст. 505 КоАП РК (Благоустройство)",
        phone: "102",
      },
    ],
  },
  astana: {
    id: "astana",
    name: "г. Астана",
    ikomekWhatsapp: "77761090109",
    hotlines: [
      {
        id: "ikomek-109",
        title: "iKomek 109 (Акимат г. Астана)",
        subtitle: "Единый контакт-центр столицы",
        phone: "109",
        whatsapp: "77761090109",
        isPrimary: true,
      },
      {
        id: "police-102",
        title: "102 (Полиция г. Астана)",
        subtitle: "Протокол за мусор и загромождение территории",
        phone: "102",
      },
    ],
  },
  almaty: {
    id: "almaty",
    name: "г. Алматы",
    ikomekWhatsapp: "77770001308",
    hotlines: [
      {
        id: "open-almaty",
        title: "Open Almaty / ЕКЦ 109",
        subtitle: "Единая общественная приемная акимата",
        phone: "109",
        whatsapp: "77770001308",
        isPrimary: true,
      },
      {
        id: "police-102",
        title: "102 (Департамент полиции)",
        subtitle: "Нарушения правил благоустройства",
        phone: "102",
      },
    ],
  },
  karaganda: {
    id: "karaganda",
    name: "г. Караганда",
    ikomekWhatsapp: "77001090109",
    hotlines: [
      {
        id: "ikomek-109",
        title: "iKomek 109 (Акимат г. Караганда)",
        subtitle: "Единая диспетчерская служба",
        phone: "109",
        whatsapp: "77001090109",
        isPrimary: true,
      },
      {
        id: "police-102",
        title: "102 (Полиция)",
        subtitle: "Протокол по ст. 505 КоАП РК",
        phone: "102",
      },
    ],
  },
  shymkent: {
    id: "shymkent",
    name: "г. Шымкент",
    ikomekWhatsapp: "77001090109",
    hotlines: [
      {
        id: "ikomek-109",
        title: "iKomek 109 (Акимат г. Шымкент)",
        subtitle: "Контакт-центр акимата",
        phone: "109",
        whatsapp: "77001090109",
        isPrimary: true,
      },
      {
        id: "police-102",
        title: "102 (Полиция)",
        subtitle: "Благоустройство и стихийные свалки",
        phone: "102",
      },
    ],
  },
};

export const GARBAGE_ISSUE_TYPES: GarbageIssueType[] = [
  { id: "OVERFLOW", label: "Переполненные баки / мусор на земле" },
  { id: "NO_SCHEDULE", label: "Мусор не вывозят более 2 дней" },
  { id: "BULKY_WASTE", label: "Крупногабаритный мусор / ветки" },
  { id: "BROKEN_CONTAINER", label: "Сломан контейнер / площадка" },
];