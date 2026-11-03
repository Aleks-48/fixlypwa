import 'package:fixly_app/main.dart' show appLanguage;

const Map<String, Map<String, String>> requestCategoryLabelsMap = {
  'ru': {
    'PLUMBING': 'Сантехника',
    'ELEVATOR': 'Лифт',
    'CLEANING': 'Уборка',
    'ELECTRICITY': 'Электрика',
    'OTHER': 'Другое',
  },
  'kk': {
    'PLUMBING': 'Сантехника',
    'ELEVATOR': 'Лифт',
    'CLEANING': 'Тазалау',
    'ELECTRICITY': 'Электрика',
    'OTHER': 'Басқа',
  },
};

const Map<String, Map<String, String>> requestStatusLabelsMap = {
  'ru': {
    'RECEIVED': 'Принята',
    'IN_PROGRESS': 'В работе',
    'RESOLVED': 'Решена',
  },
  'kk': {
    'RECEIVED': 'Қабылданды',
    'IN_PROGRESS': 'Орындалуда',
    'RESOLVED': 'Шешілді',
  },
};

Map<String, String> get requestCategoryLabels => requestCategoryLabelsMap[appLanguage.value] ?? requestCategoryLabelsMap['ru']!;
Map<String, String> get requestStatusLabels => requestStatusLabelsMap[appLanguage.value] ?? requestStatusLabelsMap['ru']!;

String getRequestCategoryLabel(String cat) {
  final lang = appLanguage.value;
  return requestCategoryLabelsMap[lang]?[cat] ?? requestCategoryLabelsMap['ru']![cat] ?? cat;
}

String getRequestStatusLabel(String status) {
  final lang = appLanguage.value;
  return requestStatusLabelsMap[lang]?[status] ?? requestStatusLabelsMap['ru']![status] ?? status;
}

const List<String> requestCategoryOrder = [
  'PLUMBING',
  'ELEVATOR',
  'CLEANING',
  'ELECTRICITY',
  'OTHER',
];

