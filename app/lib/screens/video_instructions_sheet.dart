import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/main.dart' show appLanguage;

class _UiField {
  final String label;
  final String value;
  final bool active;
  const _UiField({required this.label, required this.value, this.active = false});
}

class _DocStep {
  final int num;
  final String title;
  final String description;
  final String screenTitle;
  final String badge;
  final List<_UiField> fields;
  final String buttonText;
  final String note;

  const _DocStep({
    required this.num,
    required this.title,
    required this.description,
    required this.screenTitle,
    required this.badge,
    required this.fields,
    required this.buttonText,
    required this.note,
  });
}

class _GuideItem {
  final String id;
  final String tag;
  final String title;
  final String duration;
  final String description;
  final List<_DocStep> steps;
  final String tip;
  final IconData icon;
  final String url;

  const _GuideItem({
    required this.id,
    required this.tag,
    required this.title,
    required this.duration,
    required this.description,
    required this.steps,
    required this.tip,
    required this.icon,
    required this.url,
  });
}

class VideoInstructionsSheet extends StatefulWidget {
  const VideoInstructionsSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const VideoInstructionsSheet(),
    );
  }

  @override
  State<VideoInstructionsSheet> createState() => _VideoInstructionsSheetState();
}

class _VideoInstructionsSheetState extends State<VideoInstructionsSheet> {
  int _selectedIndex = 0;
  bool _isDocsMode = true; // По умолчанию: пошаговая документация

  List<_GuideItem> _getItems(String lang) {
    final baseUrl = ApiClient.instance.baseUrl;

    if (lang == 'kk') {
      return [
        _GuideItem(
          id: 'auth',
          tag: 'Жылдам кіру',
          title: '1. Жүйеге кіру және Telegram байланыстыру',
          duration: '1:45 мин',
          description: 'Телефон нөмірі бойынша кіру және @fixlyosibot ботынан құпиясөзсіз бірреттік OTP код алу.',
          tip: 'Смартфоннан кіргенде код автоматты түрде қойылуы мүмкін.',
          icon: LucideIcons.smartphone,
          url: '$baseUrl/instructions',
          steps: [
            _DocStep(
              num: 1,
              title: 'Телефон нөміріңізді енгізіңіз',
              description: 'Кіру бетінде +7 (7XX) XXX-XX-XX форматындағы қазақстандық нөміріңізді жазыңыз.',
              screenTitle: 'Fixly-ге кіру',
              badge: '1 / 3 қадам',
              fields: [
                _UiField(label: 'Телефон немесе email', value: '+7 (771) 373-08-82', active: true),
              ],
              buttonText: 'Кодты алу',
              note: 'Код ресми @fixlyosibot ботына жіберіледі',
            ),
            _DocStep(
              num: 2,
              title: 'Telegram-ботта нөмірді растаңыз',
              description: '@fixlyosibot ботына өтіп, «📱 Кіру үшін нөмірмен бөлісу» түймесін басыңыз.',
              screenTitle: 'Telegram: @fixlyosibot',
              badge: '2 / 3 қадам',
              fields: [
                _UiField(label: 'Бот', value: '👋 Fixly жүйесіне қош келдіңіз!'),
                _UiField(label: 'Әрекет', value: 'Төмендегі батырманы басыңыз ⬇️', active: true),
              ],
              buttonText: '📱 Кіру үшін нөмірмен бөлісу',
              note: 'Нөмір бір рет қана байланыстырылады',
            ),
            _DocStep(
              num: 3,
              title: '6 таңбалы кодты енгізіңіз',
              description: 'Боттан келген кодты қосымшаға енгізіңіз — кіру сәтті аяқталды!',
              screenTitle: 'Кіруді растау',
              badge: '3 / 3 қадам',
              fields: [
                _UiField(label: 'Telegram-нан келген код', value: '4  8  2  9  1  5', active: true),
              ],
              buttonText: 'Кабинетке кіру',
              note: 'Сессия 30 күн бойы жарамды',
            ),
          ],
        ),
        _GuideItem(
          id: 'master',
          tag: 'Тұрғындарға',
          title: '2. Шеберді шақыру және фотомен өтінім беру',
          duration: '2:30 мин',
          description: 'Сантехник, электрик және әрлеушіні 30 күн кепілдікпен тапсырыс беріп шақырыңыз.',
          tip: 'Тапсырыстарды қосымшадан тыс өткізбеңіз — тек Fixly арқылы ресімделген жұмыстарға кепілдік беріледі.',
          icon: LucideIcons.wrench,
          url: '$baseUrl/instructions',
          steps: [
            _DocStep(
              num: 1,
              title: 'Қызмет санатын таңдаңыз',
              description: '«Шеберлер» бөлімінде қажетті бағытты таңдаңыз: Сантехника, Электрика, Әрлеу.',
              screenTitle: 'Қызметтер каталогы',
              badge: '1 / 3 қадам',
              fields: [
                _UiField(label: 'Санаттар', value: '🚰 Сантехника  ⚡️ Электрика', active: true),
              ],
              buttonText: 'Маманды таңдау',
              note: 'Рейтингі бар 150-ден астам тексерілген шебер',
            ),
            _DocStep(
              num: 2,
              title: 'Ақау фотосын тіркеңіз',
              description: 'Ақау болған орынды камераға түсіріп, мәселені қысқаша сипаттаңыз.',
              screenTitle: 'Жаңа өтінім',
              badge: '2 / 3 қадам',
              fields: [
                _UiField(label: 'Сипаттама', value: 'Ас үйде раковинаның астынан су тамшылап тұр'),
                _UiField(label: 'Фотосурет', value: '📷 photo_defect.jpg тіркелді', active: true),
              ],
              buttonText: 'Өтінімді жариялау',
              note: 'Шеберлер фотоны көріп, нақты бағасын айтады',
            ),
            _DocStep(
              num: 3,
              title: 'Жұмысты қабылдаңыз',
              description: 'Ремонт біткен соң «КЕЙІН» фотосын қарап, 30 күндік кепілдікпен қабылдаңыз.',
              screenTitle: 'Тапсырыс орындалды',
              badge: '3 / 3 қадам',
              fields: [
                _UiField(label: 'Мәртебе', value: '✅ Тұрғын жұмысты қабылдады'),
                _UiField(label: 'Кепілдік', value: '🛡 30 күндік ресми кепілдік', active: true),
              ],
              buttonText: 'Шеберге пікір қалдыру',
              note: 'Платформа комиссиясы небәрі 3%',
            ),
          ],
        ),
        _GuideItem(
          id: 'voting',
          tag: 'Кондоминиум',
          title: '3. Онлайн дауыс беру және кворум',
          duration: '2:15 мин',
          description: 'Пәтер иелерінің заңды онлайн дауыс беруі, күн тәртібі және кворумды есептеу.',
          tip: 'ҚР Заңы бойынша электрондық хаттамалар толық заңды күшке ие.',
          icon: LucideIcons.vote,
          url: 'https://youtu.be/1l0IeDFhXS0',
          steps: [
            _DocStep(
              num: 1,
              title: 'Белсенді сауалнаманы ашыңыз',
              description: 'Дауыс беру басталғанда жиналыстың карточкасын басыңыз.',
              screenTitle: '№ 48 үйдің жиналысы',
              badge: '1 / 3 қадам',
              fields: [
                _UiField(label: 'Күн тәртібі', value: '1. Шатырды жөндеу сметасын бекіту', active: true),
              ],
              buttonText: 'Бюллетеньге өту',
              note: 'Кворум: аудандардың >50% қатысуы қажет',
            ),
            _DocStep(
              num: 2,
              title: 'Смета мен құжаттарды қараңыз',
              description: 'Әр сұраққа шығындар сметасы және PDF келісімшарттар тіркелген.',
              screenTitle: 'Жиналыс құжаттары',
              badge: '2 / 3 қадам',
              fields: [
                _UiField(label: 'Құжат', value: '📄 Smeta_shatyr_2026.pdf (1.2 MB)', active: true),
              ],
              buttonText: 'Есептерді қарау',
              note: 'Толық қаржылық ашықтық',
            ),
            _DocStep(
              num: 3,
              title: '1 батырмамен дауыс беріңіз',
              description: '«Қолдаймын», «Қарсымын» немесе «Қалыс қалдым» деп таңдаңыз.',
              screenTitle: 'Сіздің таңдауыңыз',
              badge: '3 / 3 қадам',
              fields: [
                _UiField(label: 'Таңдау', value: '🟢 ҚОЛДАЙМЫН  |  🔴 ҚАРСЫМЫН', active: true),
              ],
              buttonText: 'Дауысты растау',
              note: 'Хаттама автоматты түрде жасалады',
            ),
          ],
        ),
        _GuideItem(
          id: 'osi',
          tag: 'МТБ / НСУ / УК',
          title: '4. Төраға кабинеті: оцифровка және №163 есептер',
          duration: '4:10 мин',
          description: 'Пәтерлерді енгізу, 2 500 ₸ оцифровка және ҚР Министрлігінің формасы бойынша PDF есептер.',
          tip: 'Пилот бойынша алғашқы 3 айға тариф бір пәтерге небәрі 50 ₸ құрайды.',
          icon: LucideIcons.building,
          url: '$baseUrl/instructions',
          steps: [
            _DocStep(
              num: 1,
              title: 'Үйді қосу және оцифровка',
              description: 'Пәтерлерді енгізіңіз немесе 2 500 ₸-ге Fixly мамандарына тапсырыс беріңіз.',
              screenTitle: 'Тізілімді оцифровкалау',
              badge: '1 / 3 қадам',
              fields: [
                _UiField(label: 'Нысан', value: 'Көкшетау қ., Абай к-сі, 48-үй'),
                _UiField(label: 'Пәтерлер', value: '72 пәтер / 4 860 ш.м', active: true),
              ],
              buttonText: '⚡️ Оцифровкаға тапсырыс беру (2 500 ₸)',
              note: 'Орындалу мерзімі — 1 жұмыс күні',
            ),
            _DocStep(
              num: 2,
              title: 'Шығыстар мен түсімдер',
              description: 'Ағымдағы және жинақтау түсімдерін белгілеңіз.',
              screenTitle: 'Қаржы және сметалар',
              badge: '2 / 3 қадам',
              fields: [
                _UiField(label: 'МТБ тарифі', value: '120 ₸ / ш.м (пилот 50 ₸)', active: true),
              ],
              buttonText: 'Түбіртектерді жасау',
              note: 'WhatsApp-қа автоматты жіберу',
            ),
            _DocStep(
              num: 3,
              title: '№ 163 форма бойынша жылдық PDF есеп',
              description: '1 батырмамен мемлекеттік стандартқа сай ресми жылдық есепті жүктеңіз.',
              screenTitle: 'Есептер генераторы',
              badge: '3 / 3 қадам',
              fields: [
                _UiField(label: 'Форма', value: 'ҚР МИИР № 163 (МТБ жылдық есебі)', active: true),
              ],
              buttonText: '📥 Жылдық есепті жүктеу (PDF)',
              note: 'Жалпы жиналыста тапсыруға дайын',
            ),
          ],
        ),
      ];
    }

    if (lang == 'en') {
      return [
        _GuideItem(
          id: 'auth',
          tag: 'Quick Start',
          title: '1. Passwordless Login via Telegram OTP',
          duration: '1:45 min',
          description: 'Login with phone number and get instant 6-digit OTP code in @fixlyosibot.',
          tip: 'Application runs smoothly on mobile phones and web browsers.',
          icon: LucideIcons.smartphone,
          url: '$baseUrl/instructions',
          steps: [
            _DocStep(
              num: 1,
              title: 'Enter phone number',
              description: 'Enter your Kazakhstan mobile number in +7 (7XX) XXX-XX-XX format.',
              screenTitle: 'Fixly Sign In',
              badge: 'Step 1 of 3',
              fields: [
                _UiField(label: 'Phone or email', value: '+7 (771) 373-08-82', active: true),
              ],
              buttonText: 'Request Code',
              note: 'Delivered to official @fixlyosibot',
            ),
            _DocStep(
              num: 2,
              title: 'Confirm in Telegram bot',
              description: 'Open @fixlyosibot on Telegram and tap "Share Phone for Login".',
              screenTitle: 'Telegram: @fixlyosibot',
              badge: 'Step 2 of 3',
              fields: [
                _UiField(label: 'Bot', value: '👋 Welcome to Fixly!'),
                _UiField(label: 'Action', value: 'Tap the button at the bottom ⬇️', active: true),
              ],
              buttonText: '📱 Share Phone for Login',
              note: 'One-time phone link',
            ),
            _DocStep(
              num: 3,
              title: 'Enter 6-digit code',
              description: 'Enter the verification code received from the bot.',
              screenTitle: 'Verify Code',
              badge: 'Step 3 of 3',
              fields: [
                _UiField(label: 'Code from Telegram', value: '4  8  2  9  1  5', active: true),
              ],
              buttonText: 'Sign In',
              note: 'Session is active for 30 days',
            ),
          ],
        ),
        _GuideItem(
          id: 'master',
          tag: 'For Residents',
          title: '2. Booking Masters with Photo Attachments',
          duration: '2:30 min',
          description: 'Hire verified plumbers and electricians with transparent pricing and 30-day warranty.',
          tip: 'All orders processed inside Fixly carry a verified 30-day warranty.',
          icon: LucideIcons.wrench,
          url: '$baseUrl/instructions',
          steps: [
            _DocStep(
              num: 1,
              title: 'Select service category',
              description: 'Choose Plumbing, Electrical, Locksmith, or Handyman in the catalog.',
              screenTitle: 'Service Catalog',
              badge: 'Step 1 of 3',
              fields: [
                _UiField(label: 'Categories', value: '🚰 Plumbing  ⚡️ Electrical', active: true),
              ],
              buttonText: 'Choose Specialist',
              note: '150+ verified masters with ratings',
            ),
            _DocStep(
              num: 2,
              title: 'Attach photo of defect',
              description: 'Take a photo of the malfunction so the master can prepare exact replacement parts.',
              screenTitle: 'New Request',
              badge: 'Step 2 of 3',
              fields: [
                _UiField(label: 'Description', value: 'Leaking kitchen faucet under the sink'),
                _UiField(label: 'Photo', value: '📷 photo_defect.jpg attached', active: true),
              ],
              buttonText: 'Publish Request',
              note: 'Masters view photos and provide accurate quotes',
            ),
            _DocStep(
              num: 3,
              title: 'Confirm job & warranty',
              description: 'Approve completion and receive your 30-day workmanship warranty.',
              screenTitle: 'Job Completed',
              badge: 'Step 3 of 3',
              fields: [
                _UiField(label: 'Status', value: '✅ Approved by Resident'),
                _UiField(label: 'Warranty', value: '🛡 30 Days Warranty', active: true),
              ],
              buttonText: 'Leave Master Review',
              note: 'Platform fee is only 3%',
            ),
          ],
        ),
        _GuideItem(
          id: 'voting',
          tag: 'Condominium',
          title: '3. Digital Online Voting (General Meetings)',
          duration: '2:15 min',
          description: 'Legally compliant online voting for residents with automated quorum.',
          tip: 'Under RK Housing Law, electronic protocols have full legal standing.',
          icon: LucideIcons.vote,
          url: 'https://youtu.be/1l0IeDFhXS0',
          steps: [
            _DocStep(
              num: 1,
              title: 'Open active poll',
              description: 'Tap the general meeting card in your building tab.',
              screenTitle: 'Building #48 Voting',
              badge: 'Step 1 of 3',
              fields: [
                _UiField(label: 'Agenda', value: '1. Roof repair budget approval', active: true),
              ],
              buttonText: 'Open Ballot',
              note: 'Quorum: >50% of total area',
            ),
            _DocStep(
              num: 2,
              title: 'Review proposals & PDF',
              description: 'Review attached PDF budget calculations and contracts.',
              screenTitle: 'Meeting Documents',
              badge: 'Step 2 of 3',
              fields: [
                _UiField(label: 'Document', value: '📄 Smeta_roof_2026.pdf (1.2 MB)', active: true),
              ],
              buttonText: 'Review Calculations',
              note: 'Full financial transparency',
            ),
            _DocStep(
              num: 3,
              title: 'Cast your vote in 1 click',
              description: 'Select In Favor, Against, or Abstain.',
              screenTitle: 'Your Ballot',
              badge: 'Step 3 of 3',
              fields: [
                _UiField(label: 'Choice', value: '🟢 IN FAVOR  |  🔴 AGAINST', active: true),
              ],
              buttonText: 'Confirm Vote',
              note: 'Protocol is generated automatically',
            ),
          ],
        ),
        _GuideItem(
          id: 'osi',
          tag: 'HOA / OSI / PM',
          title: '4. Chairman Portal: Digitization & Form №163',
          duration: '4:10 min',
          description: 'Apartment onboarding, 2,500 ₸ data entry, and Form №163 annual reports.',
          tip: 'Pilot rate is 50 ₸ per apartment/month for the first 3 months.',
          icon: LucideIcons.building,
          url: '$baseUrl/instructions',
          steps: [
            _DocStep(
              num: 1,
              title: 'Import registry & onboarding',
              description: 'Import apartments or order 2,500 ₸ registry digitization.',
              screenTitle: 'Owner Registry',
              badge: 'Step 1 of 3',
              fields: [
                _UiField(label: 'Building', value: '48 Abay Ave, Kokshetau'),
                _UiField(label: 'Apartments', value: '72 apartments / 4,860 sq.m', active: true),
              ],
              buttonText: '⚡️ Order Digitization (2,500 ₸)',
              note: 'Turnaround: 1 business day',
            ),
            _DocStep(
              num: 2,
              title: 'Manage monthly balances',
              description: 'Track maintenance and utility contributions.',
              screenTitle: 'Finances & Budgets',
              badge: 'Step 2 of 3',
              fields: [
                _UiField(label: 'HOA Rate', value: '120 ₸/sq.m (pilot 50 ₸)', active: true),
              ],
              buttonText: 'Generate Invoices',
              note: 'Automated WhatsApp sharing',
            ),
            _DocStep(
              num: 3,
              title: 'Export Annual Report (Form № 163)',
              description: 'Download the official Ministry-standard annual PDF report.',
              screenTitle: 'Report Generator',
              badge: 'Step 3 of 3',
              fields: [
                _UiField(label: 'Form', value: 'MIIR RK Form № 163 (Annual HOA Report)', active: true),
              ],
              buttonText: '📥 Download Annual Report (PDF)',
              note: 'Ready for general meeting',
            ),
          ],
        ),
      ];
    }

    // Default: Russian (ru)
    return [
      _GuideItem(
        id: 'auth',
        tag: 'Быстрый вход',
        title: '1. Вход в систему и привязка Telegram (без пароля)',
        duration: '1:45 мин',
        description: 'Вход по одноразовому 6-значному коду в Telegram. Никаких сложных паролей запоминать не нужно.',
        tip: 'Если вы входите с телефона, код подставится автоматически. Приложение доступно на смартфонах и в браузере.',
        icon: LucideIcons.smartphone,
        url: 'https://youtube.com/shorts/r9n6Fv4aP00',
        steps: [
          _DocStep(
            num: 1,
            title: 'Введите номер телефона',
            description: 'На странице входа укажите ваш казахстанский номер в формате +7 (7XX) XXX-XX-XX.',
            screenTitle: 'Вход в Fixly',
            badge: 'Шаг 1 из 3',
            fields: [
              _UiField(label: 'Телефон или email', value: '+7 (771) 373-08-82', active: true),
            ],
            buttonText: 'Получить код',
            note: 'Код поступит в официальный бот @fixlyosibot',
          ),
          _DocStep(
            num: 2,
            title: 'Подтвердите номер в Telegram-боте',
            description: 'Перейдите в Telegram-бота @fixlyosibot и нажмите кнопку «📱 Поделиться номером для входа».',
            screenTitle: 'Telegram: @fixlyosibot',
            badge: 'Шаг 2 из 3',
            fields: [
              _UiField(label: 'Бот', value: '👋 Добро пожаловать в Fixly!'),
              _UiField(label: 'Действие', value: 'Нажмите кнопку внизу экрана ⬇️', active: true),
            ],
            buttonText: '📱 Поделиться номером для входа',
            note: 'Номер привязывается один раз и навсегда',
          ),
          _DocStep(
            num: 3,
            title: 'Введите 6-значный код',
            description: 'Бот пришлет проверочный код. Введите его в приложении — вход выполнен!',
            screenTitle: 'Подтверждение входа',
            badge: 'Шаг 3 из 3',
            fields: [
              _UiField(label: 'Код из Telegram', value: '4  8  2  9  1  5', active: true),
            ],
            buttonText: 'Войти в кабинет',
            note: 'Сессия действует 30 дней',
          ),
        ],
      ),
      _GuideItem(
        id: 'master',
        tag: 'Для жителей',
        title: '2. Вызов мастера на дом и подача заявки с фото',
        duration: '2:30 мин',
        description: 'Заказывайте проверенных мастеров города с фотофиксацией сметы и 30-дневной гарантией.',
        tip: 'Никогда не рассчитывайтесь в обход приложения — только оформленные через Fixly заявки защищены гарантией 30 дней.',
        icon: LucideIcons.wrench,
        url: 'https://youtube.com/shorts/r9n6Fv4aP00',
        steps: [
          _DocStep(
            num: 1,
            title: 'Выберите категорию услуги',
            description: 'Откройте вкладку «Мастера»: Сантехника, Электрика, Отделка, Замки.',
            screenTitle: 'Каталог услуг Fixly',
            badge: 'Шаг 1 из 3',
            fields: [
              _UiField(label: 'Категории', value: '🚰 Сантехника  ⚡️ Электрика', active: true),
            ],
            buttonText: 'Выбрать специалиста',
            note: 'Более 150 проверенных мастеров с рейтингом',
          ),
          _DocStep(
            num: 2,
            title: 'Опишите поломку и прикрепите фото',
            description: 'Сделайте фото дефекта с камеры телефона, чтобы мастер взял нужные запчасти.',
            screenTitle: 'Новая заявка мастеру',
            badge: 'Шаг 2 из 3',
            fields: [
              _UiField(label: 'Описание', value: 'Капает кран на кухне под раковиной'),
              _UiField(label: 'Фотография', value: '📷 photo_defect_01.jpg прикреплено', active: true),
            ],
            buttonText: 'Опубликовать заявку',
            note: 'Мастера видят фото и называют точную цену',
          ),
          _DocStep(
            num: 3,
            title: 'Согласуйте время и примите работу',
            description: 'После завершения ремонта мастер загрузит фото «ПОСЛЕ», а вы подтвердите с гарантией 30 дней.',
            screenTitle: 'Заказ выполнен',
            badge: 'Шаг 3 из 3',
            fields: [
              _UiField(label: 'Статус', value: '✅ Работы приняты жильцом'),
              _UiField(label: 'Гарантия', value: '🛡 30 дней официальной гарантии', active: true),
            ],
            buttonText: 'Оставить отзыв мастеру',
            note: 'Комиссия платформы всего 3%',
          ),
        ],
      ),
      _GuideItem(
        id: 'voting',
        tag: 'Кондоминиум',
        title: '3. Онлайн-голосования собственников (ОСС) по Закону РК',
        duration: '2:15 мин',
        description: 'Легитимный сбор голосов без хождения по квартирам с автоматическим расчетом кворума.',
        tip: 'По Закону РК электронные протоколы имеют полную юридическую силу для банков и жилищных инспекций.',
        icon: LucideIcons.vote,
        url: 'https://youtu.be/6VHxtXRnv3E',
        steps: [
          _DocStep(
            num: 1,
            title: 'Откройте активное голосование',
            description: 'При запуске опроса вам придет уведомление в Telegram и пуш в приложении.',
            screenTitle: 'Голосование дома № 48',
            badge: 'Шаг 1 из 3',
            fields: [
              _UiField(label: 'Повестка дня', value: '1. Утверждение сметы на ремонт кровли', active: true),
            ],
            buttonText: 'Перейти к бюллетеню',
            note: 'Кворум: требуется участие >50% площадей',
          ),
          _DocStep(
            num: 2,
            title: 'Ознакомьтесь со сметой в PDF',
            description: 'К каждому вопросу прикреплены сметы расходов и проекты договоров в PDF.',
            screenTitle: 'Материалы собрания',
            badge: 'Шаг 2 из 3',
            fields: [
              _UiField(label: 'Документ', value: '📄 Smeta_remont_krovli_2026.pdf (1.2 MB)', active: true),
            ],
            buttonText: 'Изучить расчеты',
            note: 'Полная финансовая прозрачность',
          ),
          _DocStep(
            num: 3,
            title: 'Отдайте голос в 1 клик',
            description: 'Нажмите «За», «Против» или «Воздержался». Ваш голос мгновенно фиксируется в реестре.',
            screenTitle: 'Ваш бюллетень',
            badge: 'Шаг 3 из 3',
            fields: [
              _UiField(label: 'Ваш выбор', value: '🟢 ЗА  |  🔴 ПРОТИВ  |  ⚪️ ВОЗДЕРЖАЛСЯ', active: true),
            ],
            buttonText: 'Подтвердить голос',
            note: 'Протокол формируется автоматически',
          ),
        ],
      ),
      _GuideItem(
        id: 'osi',
        tag: 'ОСИ / НСУ / УК',
        title: '4. Кабинет председателя: реестр, оцифровка (2 500 ₸) и отчеты №163',
        duration: '4:10 мин',
        description: 'Импорт квартир из Excel, заказ оцифровки за 2 500 ₸ и годовой PDF-отчет по форме Минпрома РК.',
        tip: 'По пилотной программе Fixly первые 3 месяца тариф составляет всего 50 ₸ за квартиру в месяц.',
        icon: LucideIcons.building,
        url: 'https://youtu.be/6VHxtXRnv3E',
        steps: [
          _DocStep(
            num: 1,
            title: 'Добавление дома и импорт жителей',
            description: 'Загрузите список квартир в Excel или закажите оцифровку у Fixly за 2 500 ₸.',
            screenTitle: 'Реестр собственников',
            badge: 'Шаг 1 из 3',
            fields: [
              _UiField(label: 'Объект', value: 'г. Кокшетау, ул. Абая, дом 48'),
              _UiField(label: 'Квартир', value: '72 квартиры / 4 860 кв.м', active: true),
            ],
            buttonText: '⚡️ Заказать оцифровку (2 500 ₸)',
            note: 'Срок занесения — 1 рабочий день',
          ),
          _DocStep(
            num: 2,
            title: 'Учет взносов и расходов дома',
            description: 'Фиксируйте текущие и накопительные поступления с прозрачностью для жителей.',
            screenTitle: 'Финансы и сметы',
            badge: 'Шаг 2 из 3',
            fields: [
              _UiField(label: 'Тариф ОСИ', value: '120 ₸ / кв.м (пилот 50 ₸)', active: true),
            ],
            buttonText: 'Сформировать квитанции',
            note: 'Автоматическая рассылка в WhatsApp',
          ),
          _DocStep(
            num: 3,
            title: 'Годовой PDF-отчет по форме № 163',
            description: 'В 1 клик система генерирует готовый печатный документ по стандарту Минпрома РК.',
            screenTitle: 'Генератор отчетов',
            badge: 'Шаг 3 из 3',
            fields: [
              _UiField(label: 'Форма', value: '№ 163 МИИР РК (Годовой отчет ОСИ)', active: true),
            ],
            buttonText: '📥 Скачать годовой отчет (PDF)',
            note: 'Готов к сдаче на общем собрании',
          ),
        ],
      ),
    ];
  }

  Future<void> _openVideoUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final lang = appLanguage.value;
    final items = _getItems(lang);
    final selected = items[_selectedIndex];

    final sheetTitle = switch (lang) {
      'kk' => 'Нұсқаулықтар мен басшылық',
      'en' => 'Guides & Tutorials',
      _ => 'Инструкции и руководства',
    };

    final docsBtnText = switch (lang) {
      'kk' => '📖 Скриншоттармен',
      'en' => '📖 Step-by-Step',
      _ => '📖 Со скриншотами',
    };

    final videoBtnText = switch (lang) {
      'kk' => '🎥 Бейне',
      'en' => '🎥 Video',
      _ => '🎥 Видео',
    };

    final watchBtnText = switch (lang) {
      'kk' => 'Бейнені ашу',
      'en' => 'Watch Video',
      _ => 'Смотреть видео',
    };

    final tipLabel = switch (lang) {
      'kk' => 'Пайдалы кеңес:',
      'en' => 'Helpful Tip:',
      _ => 'Полезный совет:',
    };

    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: c.cardBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppDimens.spaceLg),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: c.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                  ),
                  child: Icon(LucideIcons.bookOpen, size: 18, color: c.primary),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        sheetTitle,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 17,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                      Text(
                        'Fixly Learning & Docs Center',
                        style: TextStyle(
                          color: c.textSecondary,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: Icon(LucideIcons.x, size: 20, color: c.textSecondary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // Mode Selector (Docs with Screenshots vs Video)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppDimens.spaceLg),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: c.card,
                borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                border: Border.all(color: c.cardBorder),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _isDocsMode = true),
                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _isDocsMode ? c.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          docsBtnText,
                          style: TextStyle(
                            color: _isDocsMode ? Colors.white : c.textSecondary,
                            fontSize: 12,
                            fontWeight: AppTypography.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: InkWell(
                      onTap: () => setState(() => _isDocsMode = false),
                      borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: !_isDocsMode ? c.primary : Colors.transparent,
                          borderRadius: BorderRadius.circular(AppDimens.radiusSm),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          videoBtnText,
                          style: TextStyle(
                            color: !_isDocsMode ? Colors.white : c.textSecondary,
                            fontSize: 12,
                            fontWeight: AppTypography.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 10),
          Divider(height: 1, color: c.cardBorder),

          // Content
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(AppDimens.spaceLg),
              children: [
                // Category Pills
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: List.generate(items.length, (idx) {
                      final item = items[idx];
                      final isSelected = _selectedIndex == idx;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          showCheckmark: false,
                          avatar: Icon(
                            item.icon,
                            size: 14,
                            color: isSelected ? Colors.white : c.textSecondary,
                          ),
                          label: Text(
                            item.tag,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: isSelected ? AppTypography.bold : AppTypography.medium,
                              color: isSelected ? Colors.white : c.textSecondary,
                            ),
                          ),
                          selected: isSelected,
                          selectedColor: c.primary,
                          backgroundColor: c.card,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                            side: BorderSide(
                              color: isSelected ? c.primary : c.cardBorder,
                            ),
                          ),
                          onSelected: (_) => setState(() => _selectedIndex = idx),
                        ),
                      );
                    }),
                  ),
                ),
                const SizedBox(height: AppDimens.spaceLg),

                // MODE 1: DOCUMENTATION WITH SCREENSHOT MOCKUPS
                if (_isDocsMode) ...[
                  Container(
                    padding: const EdgeInsets.all(AppDimens.spaceMd),
                    decoration: BoxDecoration(
                      color: c.card,
                      borderRadius: BorderRadius.circular(AppDimens.radiusLg),
                      border: Border.all(color: c.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          selected.title,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 16,
                            fontWeight: AppTypography.bold,
                            height: 1.3,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          selected.description,
                          style: TextStyle(
                            color: c.textSecondary,
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: AppDimens.spaceLg),

                        // Render Steps with UI Screenshot Mockups
                        ...List.generate(selected.steps.length, (sIdx) {
                          final st = selected.steps[sIdx];
                          return Container(
                            margin: const EdgeInsets.only(bottom: AppDimens.spaceLg),
                            padding: const EdgeInsets.all(AppDimens.spaceMd),
                            decoration: BoxDecoration(
                              color: c.surface,
                              borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                              border: Border.all(color: c.cardBorder.withValues(alpha: 0.8)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Step Number & Title
                                Row(
                                  children: [
                                    Container(
                                      width: 24,
                                      height: 24,
                                      decoration: BoxDecoration(
                                        color: c.primary,
                                        shape: BoxShape.circle,
                                      ),
                                      alignment: Alignment.center,
                                      child: Text(
                                        '${st.num}',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 12,
                                          fontWeight: AppTypography.bold,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        st.title,
                                        style: TextStyle(
                                          color: c.textPrimary,
                                          fontSize: 14,
                                          fontWeight: AppTypography.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  st.description,
                                  style: TextStyle(
                                    color: c.textSecondary,
                                    fontSize: 12,
                                    height: 1.35,
                                  ),
                                ),
                                const SizedBox(height: AppDimens.spaceMd),

                                // UI Screenshot Mockup Box
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: c.card,
                                    borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                    border: Border.all(color: c.primary.withValues(alpha: 0.3)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            '📱 ${st.screenTitle}',
                                            style: TextStyle(
                                              color: c.textPrimary,
                                              fontSize: 11,
                                              fontWeight: AppTypography.bold,
                                            ),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: c.primary.withValues(alpha: 0.1),
                                              borderRadius: BorderRadius.circular(4),
                                            ),
                                            child: Text(
                                              st.badge,
                                              style: TextStyle(
                                                color: c.primary,
                                                fontSize: 9,
                                                fontWeight: AppTypography.bold,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      ...List.generate(st.fields.length, (fIdx) {
                                        final fld = st.fields[fIdx];
                                        return Container(
                                          margin: const EdgeInsets.only(bottom: 6),
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                                          decoration: BoxDecoration(
                                            color: fld.active ? c.primary.withValues(alpha: 0.08) : c.surface,
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(
                                              color: fld.active ? c.primary.withValues(alpha: 0.4) : c.cardBorder,
                                            ),
                                          ),
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Text(
                                                fld.label,
                                                style: TextStyle(
                                                  color: c.textSecondary,
                                                  fontSize: 10,
                                                ),
                                              ),
                                              Text(
                                                fld.value,
                                                style: TextStyle(
                                                  color: fld.active ? c.primary : c.textPrimary,
                                                  fontSize: 11,
                                                  fontWeight: AppTypography.semibold,
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      }),
                                      const SizedBox(height: 4),
                                      Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.symmetric(vertical: 6),
                                        decoration: BoxDecoration(
                                          color: c.primary,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                          st.buttonText,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 11,
                                            fontWeight: AppTypography.bold,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  '💡 ${st.note}',
                                  style: TextStyle(
                                    color: c.textSecondary,
                                    fontSize: 10,
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),

                        // Tip banner
                        Container(
                          padding: const EdgeInsets.all(AppDimens.spaceMd),
                          decoration: BoxDecoration(
                            color: c.primary.withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                            border: Border.all(color: c.primary.withValues(alpha: 0.2)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(LucideIcons.info, size: 16, color: c.primary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text.rich(
                                  TextSpan(
                                    text: '$tipLabel ',
                                    style: TextStyle(
                                      color: c.primary,
                                      fontSize: 12,
                                      fontWeight: AppTypography.bold,
                                    ),
                                    children: [
                                      TextSpan(
                                        text: selected.tip,
                                        style: TextStyle(
                                          color: c.textSecondary,
                                          fontWeight: AppTypography.regular,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                // MODE 2: VIDEO TUTORIAL
                if (!_isDocsMode) ...[
                  Container(
                    decoration: BoxDecoration(
                      color: c.card,
                      borderRadius: BorderRadius.circular(AppDimens.radiusLg),
                      border: Border.all(color: c.cardBorder),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Video Player Preview Box
                        InkWell(
                          onTap: () => _openVideoUrl(selected.url),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
                          child: Container(
                            height: 160,
                            width: double.infinity,
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  c.primary.withValues(alpha: 0.15),
                                  c.primary.withValues(alpha: 0.05),
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimens.radiusLg)),
                            ),
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Container(
                                  width: 56,
                                  height: 56,
                                  decoration: BoxDecoration(
                                    color: c.primary,
                                    shape: BoxShape.circle,
                                    boxShadow: [
                                      BoxShadow(
                                        color: c.primary.withValues(alpha: 0.4),
                                        blurRadius: 16,
                                        offset: const Offset(0, 4),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(LucideIcons.play, color: Colors.white, size: 24),
                                ),
                                Positioned(
                                  bottom: 10,
                                  right: 10,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: Colors.black.withValues(alpha: 0.7),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(LucideIcons.clock, size: 11, color: Colors.white70),
                                        const SizedBox(width: 4),
                                        Text(
                                          selected.duration,
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontSize: 11,
                                            fontWeight: AppTypography.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Video Details
                        Padding(
                          padding: const EdgeInsets.all(AppDimens.spaceMd),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                selected.title,
                                style: TextStyle(
                                  color: c.textPrimary,
                                  fontSize: 16,
                                  fontWeight: AppTypography.bold,
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                selected.description,
                                style: TextStyle(
                                  color: c.textSecondary,
                                  fontSize: 13,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: AppDimens.spaceLg),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: () => _openVideoUrl(selected.url),
                                  icon: const Icon(LucideIcons.play, size: 16),
                                  label: Text(
                                    watchBtnText,
                                    style: const TextStyle(fontWeight: AppTypography.bold),
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: c.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(AppDimens.radiusMd),
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: AppDimens.spaceLg),

                // Telegram Bot Helper Card
                Container(
                  padding: const EdgeInsets.all(AppDimens.spaceMd),
                  decoration: BoxDecoration(
                    color: c.primary.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(AppDimens.radiusLg),
                    border: Border.all(color: c.primary.withValues(alpha: 0.2)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: c.primary.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(LucideIcons.bot, size: 18, color: c.primary),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '@fixlyosibot',
                              style: TextStyle(
                                color: c.textPrimary,
                                fontSize: 13,
                                fontWeight: AppTypography.bold,
                              ),
                            ),
                            Text(
                              'Telegram-бот с поддержкой и видео',
                              style: TextStyle(color: c.textSecondary, fontSize: 11),
                            ),
                          ],
                        ),
                      ),
                      OutlinedButton(
                        onPressed: () => _openVideoUrl('https://t.me/fixlyosibot?start=video'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          side: BorderSide(color: c.primary),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppDimens.radiusSm)),
                        ),
                        child: Text(
                          'Telegram',
                          style: TextStyle(color: c.primary, fontSize: 11, fontWeight: AppTypography.bold),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppDimens.spaceLg),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
