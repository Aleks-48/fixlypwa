export type Language = "ru" | "kk" | "en";

export const requestsDict = {
  ru: {
    title: "Заявки жителей",
    subtitle: "Управление обращениями и аварийными заявками",
    createRequest: "Создать заявку",
    filterAll: "Все заявки",
    filterNew: "Новые",
    filterInProgress: "В работе",
    filterCompleted: "Завершенные",
    filterEmergency: "Аварийные",
    
    // Поля формы
    apartment: "Квартира",
    category: "Категория",
    description: "Описание проблемы",
    descriptionPlaceholder: "Опишите подробнее, что произошло...",
    priority: "Приоритет",
    photos: "Фотографии",
    
    // Статусы
    statusNew: "Новая",
    statusInProgress: "В работе",
    statusDone: "Выполнена",
    statusCanceled: "Отменена",
    
    // Приоритеты
    priorityLow: "Низкий",
    priorityMedium: "Средний",
    priorityHigh: "Высокий",
    priorityEmergency: "Аварийная",
    
    // Действия
    assignMaster: "Назначить мастера",
    changeStatus: "Изменить статус",
    closeRequest: "Закрыть заявку",
    save: "Сохранить",
    cancel: "Отмена",
    emptyState: "Заявок не найдено",
  },
  kk: {
    title: "Тұрғындар өтінімдері",
    subtitle: "Өтініштер мен апаттық шағымдарды басқару",
    createRequest: "Өтінім жасау",
    filterAll: "Барлық өтінімдер",
    filterNew: "Жаңа",
    filterInProgress: "Орындалуда",
    filterCompleted: "Аяқталды",
    filterEmergency: "Апаттық",
    
    // Поля формы
    apartment: "Пәтер",
    category: "Санат",
    description: "Мәселенің сипаттамасы",
    descriptionPlaceholder: "Не болғанын толығырақ сипаттаңыз...",
    priority: "Басымдық",
    photos: "Фотосуреттер",
    
    // Статусы
    statusNew: "Жаңа",
    statusInProgress: "Жұмыс үстінде",
    statusDone: "Орындалды",
    statusCanceled: "Бас тартылды",
    
    // Приоритеты
    priorityLow: "Төмен",
    priorityMedium: "Орташа",
    priorityHigh: "Жоғары",
    priorityEmergency: "Апаттық",
    
    // Действия
    assignMaster: "Шеберді тағайындау",
    changeStatus: "Мәртебені өзгерту",
    closeRequest: "Өтінімді жабу",
    save: "Сақтау",
    cancel: "Бас тарту",
    emptyState: "Өтінімдер табылмады",
  },
  en: {
    title: "Resident Requests",
    subtitle: "Manage maintenance and emergency requests",
    createRequest: "Create Request",
    filterAll: "All Requests",
    filterNew: "New",
    filterInProgress: "In Progress",
    filterCompleted: "Completed",
    filterEmergency: "Emergency",
    
    // Поля формы
    apartment: "Apartment",
    category: "Category",
    description: "Problem description",
    descriptionPlaceholder: "Describe in detail what happened...",
    priority: "Priority",
    photos: "Photos",
    
    // Статусы
    statusNew: "New",
    statusInProgress: "In Progress",
    statusDone: "Completed",
    statusCanceled: "Canceled",
    
    // Приоритеты
    priorityLow: "Low",
    priorityMedium: "Medium",
    priorityHigh: "High",
    priorityEmergency: "Emergency",
    
    // Действия
    assignMaster: "Assign Specialist",
    changeStatus: "Change Status",
    closeRequest: "Close Request",
    save: "Save",
    cancel: "Cancel",
    emptyState: "No requests found",
  },
} as const;