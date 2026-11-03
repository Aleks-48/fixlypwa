export interface HotlineContact {
  id: string;
  title: string;
  subtitle: string;
  phone: string;
  whatsapp?: string;
  isPrimary?: boolean;
}

export const KOKSHETAU_HOTLINES: HotlineContact[] = [
  {
    id: "ikomek-109",
    title: "iKomek 109 (Акимат г. Кокшетау)",
    subtitle: "Штрафы мусорным компаниям за невывоз ТБО и свалки",
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
  {
    id: "tazalyk",
    title: "ТОО «Кокшетау Тазалык»",
    subtitle: "Диспетчерская вывозчика мусора",
    phone: "+77162250000", // укажите точный номер диспетчерской при необходимости
  },
];

export const GARBAGE_ISSUE_TYPES = [
  { id: "OVERFLOW", label: "Переполненные баки / мусор на земле" },
  { id: "NO_SCHEDULE", label: "Мусор не вывозят более 2 дней" },
  { id: "BULKY_WASTE", label: "Крупногабаритный мусор / ветки" },
  { id: "BROKEN_CONTAINER", label: "Сломан контейнер / площадка" },
] as const;