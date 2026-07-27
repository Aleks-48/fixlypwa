// Русские подписи для RequestCategory/RequestStatus — зеркало
// fixlypwa/src/lib/comms/labels.ts (единый источник — сервер, копия синхронизируется вручную
// при изменении enum, как и остальные UI-строки моб. клиента, REQ-080).
const Map<String, String> requestCategoryLabels = {
  'PLUMBING': 'Сантехника',
  'ELEVATOR': 'Лифт',
  'CLEANING': 'Уборка',
  'ELECTRICITY': 'Электрика',
  'OTHER': 'Другое',
};

const Map<String, String> requestStatusLabels = {
  'RECEIVED': 'Принята',
  'IN_PROGRESS': 'В работе',
  'RESOLVED': 'Решена',
};

const List<String> requestCategoryOrder = [
  'PLUMBING',
  'ELEVATOR',
  'CLEANING',
  'ELECTRICITY',
  'OTHER',
];
