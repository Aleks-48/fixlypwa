export const requestsDict = {
  ru: {
    title: "Мои заявки",
    createBtn: "Создать заявку",
    status: {
      new: "Новая",
      inProgress: "В работе",
      done: "Выполнено",
    },
    emptyState: "У вас пока нет активных заявок",
  },
  kk: {
    title: "Менің өтінімдерім",
    createBtn: "Өтінім жасау",
    status: {
      new: "Жаңа",
      inProgress: "Орындалуда",
      done: "Орындалды",
    },
    emptyState: "Сізде әзірше белсенді өтінімдер жоқ",
  },
  en: {
    title: "My Requests",
    createBtn: "New Request",
    status: {
      new: "New",
      inProgress: "In Progress",
      done: "Completed",
    },
    emptyState: "You have no active requests yet",
  },
} as const;