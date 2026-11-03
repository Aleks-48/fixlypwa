import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:fixly_app/theme/app_theme.dart';
import 'package:fixly_app/core/api_client.dart';
import 'package:fixly_app/main.dart' show appLanguage;

enum LegalDocTab { resident, chairman, master, privacy, pilot }

class LegalDocsSheet extends StatefulWidget {
  final LegalDocTab initialTab;

  const LegalDocsSheet({super.key, this.initialTab = LegalDocTab.resident});

  static Future<void> show(BuildContext context, {LegalDocTab initialTab = LegalDocTab.resident}) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LegalDocsSheet(initialTab: initialTab),
    );
  }

  @override
  State<LegalDocsSheet> createState() => _LegalDocsSheetState();
}

class _LegalDocsSheetState extends State<LegalDocsSheet> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    final initialIndex = switch (widget.initialTab) {
      LegalDocTab.resident => 0,
      LegalDocTab.chairman => 1,
      LegalDocTab.master => 2,
      LegalDocTab.privacy => 3,
      LegalDocTab.pilot => 4,
    };
    _tabController = TabController(length: 5, vsync: this, initialIndex: initialIndex);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _openWebLegal() async {
    final uri = Uri.parse('${ApiClient.instance.baseUrl}/legal');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = AppColors.of(context);
    final lang = appLanguage.value;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Center(
            child: Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: c.textTertiary.withOpacity(0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: c.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(LucideIcons.shieldCheck, color: c.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        lang == 'en' ? 'Legal Center' : (lang == 'kk' ? 'Құқықтық орталық' : 'Правовой центр Fixly'),
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: AppTypography.cardTitle,
                          fontWeight: AppTypography.bold,
                        ),
                      ),
                      Text(
                        lang == 'en' ? 'Terms & Privacy Policy' : (lang == 'kk' ? 'Оферта және Құпиялылық' : 'Публичные оферты и политики'),
                        style: TextStyle(color: c.textSecondary, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: Icon(LucideIcons.globe, color: c.primary, size: 20),
                  tooltip: 'fixly.kz/legal',
                  onPressed: _openWebLegal,
                ),
                IconButton(
                  icon: Icon(Icons.close, color: c.textSecondary),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Tab Bar
          TabBar(
            controller: _tabController,
            isScrollable: true,
            labelColor: c.primary,
            unselectedLabelColor: c.textSecondary,
            indicatorColor: c.primary,
            indicatorWeight: 3,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 13),
            tabs: [
              Tab(text: lang == 'en' ? 'Residents' : (lang == 'kk' ? 'Тұрғындарға' : 'Жильцам')),
              Tab(text: lang == 'en' ? 'Chairmen' : (lang == 'kk' ? 'Төрағаларға' : 'Председателям')),
              Tab(text: lang == 'en' ? 'Masters' : (lang == 'kk' ? 'Шеберлерге' : 'Мастерам')),
              Tab(text: lang == 'en' ? 'Privacy' : (lang == 'kk' ? 'Құпиялылық' : 'Конфиденциальность')),
              Tab(text: lang == 'en' ? 'Pilot 50 ₸' : (lang == 'kk' ? 'Пилот 50 ₸' : 'Пилот 50 ₸')),
            ],
          ),

          const Divider(height: 1),

          // Tab Content
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildResidentTab(c, lang),
                _buildChairmanTab(c, lang),
                _buildMasterTab(c, lang),
                _buildPrivacyTab(c, lang),
                _buildPilotTab(c, lang),
              ],
            ),
          ),

          // Bottom Action
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: c.card,
              border: Border(top: BorderSide(color: c.cardBorder)),
            ),
            child: SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton.icon(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(LucideIcons.check, size: 18, color: Colors.white),
                label: Text(
                  lang == 'en' ? 'I Understand and Agree' : (lang == 'kk' ? 'Түсінікті, келісемін' : 'Понятно, принимаю условия'),
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: c.primary,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // 1. Вкладка Жильцам
  Widget _buildResidentTab(AppColors c, String lang) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHighlightCard(
          c,
          title: lang == 'en' ? '💡 Key Terms for Residents:' : (lang == 'kk' ? '💡 Тұрғындарға арналған негізгі шарттар:' : '💡 Главное для Жильцов:'),
          bullets: [
            lang == 'en'
                ? 'Building features (requests, polls, announcements) are 100% FREE.'
                : (lang == 'kk'
                    ? 'Үй функциялары (өтінімдер, дауыс беру, хабарландырулар) — ТЕГІН.'
                    : 'Функции дома (заявки, опросы, объявления) — полностью БЕСПЛАТНО.'),
            lang == 'en'
                ? 'When hiring masters, the contract is directly between you and the master.'
                : (lang == 'kk'
                    ? 'Шеберді шақырғанда келісім-шарт тікелей сіз бен шебер арасында жасалады.'
                    : 'При вызове мастера договор заключается напрямую между вами и мастером.'),
            lang == 'en'
                ? 'The master is responsible for work quality and water leak damages.'
                : (lang == 'kk'
                    ? 'Жұмыс сапасы мен су басуға шебер толық жауапты.'
                    : 'За качество работы и затопления отвечает исполнитель (Мастер).'),
            lang == 'en'
                ? 'Tenants: Major repairs require owner consent.'
                : (lang == 'kk'
                    ? 'Жалға алушылар: Күрделі жөндеу пәтер иесінің келісімімен жасалады.'
                    : 'Арендаторам: Крупный ремонт проводится с согласия собственника.'),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionTitle(c, lang == 'en' ? '1. Subject of the Offer' : (lang == 'kk' ? '1. Офертаның мәні' : '1. Предмет оферты')),
        _buildText(c, lang == 'en'
            ? 'Fixly provides digital IT tools for condominium administration, ticket management, and online voting under RK Law.'
            : (lang == 'kk'
                ? 'Fixly платформасы ҚР Заңнамасына сәйкес үйді басқару, өтінімдер беру және онлайн дауыс беру бойынша қызметтер кешенін ұсынады.'
                : 'Платформа Fixly предоставляет информационно-технологический комплекс сервисов для управления домом, подачи заявок, проведения юридически значимых онлайн-голосований и взаимодействия с проверенными специалистами в соответствии с Законом РК «О жилищных отношениях».')),
        const SizedBox(height: 12),
        _buildSectionTitle(c, lang == 'en' ? '2. Payments & Billing' : (lang == 'kk' ? '2. Төлем және есеп айырысу' : '2. Оплата и расчеты')),
        _buildText(c, lang == 'en'
            ? 'All settlements for master services are recorded in the application to ensure warranty tracking.'
            : (lang == 'kk'
                ? 'Кепілдік есебін қамтамасыз ету үшін шеберлердің ақылы қызметтеріне барлық төлемдер қосымшада тіркеледі.'
                : 'Все расчеты за заказные услуги мастеров фиксируются в приложении для обеспечения гарантийного учета. Запрещены расчеты в обход сервиса.')),
        const SizedBox(height: 12),
        _buildSectionTitle(c, lang == 'en' ? '3. Acceptance of Offer' : (lang == 'kk' ? '3. Офертаны қабылдау' : '3. Акцепт оферты')),
        _buildText(c, lang == 'en'
            ? 'Phone number OTP authentication constitutes full acceptance of this Public Offer.'
            : (lang == 'kk'
                ? 'Телефон нөмірі (OTP) арқылы қосымшаға кіру осы Қоғамдық оферта шарттарын толық қабылдау болып табылады.'
                : 'Авторизация в приложении по номеру телефона (OTP) является полным принятием условий настоящей Публичной оферты.')),
      ],
    );
  }

  // 2. Вкладка Председателям
  Widget _buildChairmanTab(AppColors c, String lang) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHighlightCard(
          c,
          title: lang == 'en' ? '💡 Key Terms for Chairmen:' : (lang == 'kk' ? '💡 Төрағаларға арналған негізгі шарттар:' : '💡 Главное для Председателей ОСИ:'),
          bullets: [
            lang == 'en'
                ? 'Transparent pricing: from 120 ₸/apt/mo (50 ₸ referral promo for first 3 mo).'
                : (lang == 'kk'
                    ? 'Ашық тарифтер: айына пәтеріне 120 ₸-ден (алғашқы 3 айға 50 ₸ жеңілдік).'
                    : 'Прозрачные тарифы: от 120 ₸/кв/мес (50 ₸ первые 3 мес по промо-программе).'),
            lang == 'en'
                ? 'Automated annual PDF reports strictly compliant with RK Ministry forms.'
                : (lang == 'kk'
                    ? 'ҚР Құрылыс министрлігінің ресми формасына сай жылдық PDF автоесептер.'
                    : 'Автоматические годовые отчеты в PDF по официальной форме Минпрома РК.'),
            lang == 'en'
                ? 'Data digitization service available from 2,500 ₸ per building.'
                : (lang == 'kk'
                    ? 'Үй тізілімін сандық форматқа көшіру қызметі — 2 500 ₸-ден бастап.'
                    : 'Услуга оцифровки поквартирного списка дома — от 2 500 ₸ за дом.'),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionTitle(c, lang == 'en' ? '1. Subscription Plans' : (lang == 'kk' ? '1. Тарифтік жоспарлар' : '1. Тарифные планы')),
        _buildText(c, lang == 'en'
            ? '• Standard: 120 ₸ / apt / mo (50 ₸ first 3 months)\n• VIP: 140 ₸ / apt / mo (priority support)\n• Maximum: 160 ₸ / apt / mo (full automation)'
            : (lang == 'kk'
                ? '• Стандарт: 120 ₸ / пәтер / ай (алғашқы 3 айға 50 ₸)\n• VIP: 140 ₸ / пәтер / ай (басымдықты саппорт)\n• Максималды: 160 ₸ / пәтер / ай (толық автоматтандыру)'
                : '• Стандарт: 120 ₸ / квартира / мес (50 ₸ первые 3 месяца)\n• VIP: 140 ₸ / квартира / мес (приоритетный саппорт)\n• Максимальный: 160 ₸ / квартира / мес (полная автоматизация)')),
        const SizedBox(height: 12),
        _buildSectionTitle(c, lang == 'en' ? '2. Data Security' : (lang == 'kk' ? '2. Деректер қауіпсіздігі' : '2. Безопасность данных')),
        _buildText(c, lang == 'en'
            ? 'All homeowner registries and voting minutes are stored on Kazakhstani servers.'
            : (lang == 'kk'
                ? 'Барлық меншік иелерінің деректері мен хаттамалар Қазақстандағы серверлерде сақталады.'
                : 'Все данные собственников и протоколы хранятся на серверах в Казахстане согласно Закону РК «О персональных данных».')),
      ],
    );
  }

  // 3. Вкладка Мастерам
  Widget _buildMasterTab(AppColors c, String lang) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHighlightCard(
          c,
          title: lang == 'en' ? '💡 Key Terms for Masters:' : (lang == 'kk' ? '💡 Шеберлерге арналған негізгі шарттар:' : '💡 Главное для Мастеров:'),
          bullets: [
            lang == 'en'
                ? 'Independent contractor status (IP, self-employed). Fixly is your digital tool.'
                : (lang == 'kk'
                    ? 'Тәуелсіз мердігер мәртебесі (ЖК, өзін-өзі жұмыспен қамтыған). Fixly — сіздің құралыңыз.'
                    : 'Вы работаете на себя (ИП, самозанятый). Fixly — ваш инструмент для поиска заказов.'),
            lang == 'en'
                ? 'Platform fee is 3% per completed job.'
                : (lang == 'kk'
                    ? 'Платформа комиссиясы — орындалған тапсырыстан 3%.'
                    : 'Комиссия платформы составляет 3% от выполненного заказа.'),
            lang == 'en'
                ? 'Strict ban on bypassing platform payments (penalty & account ban).'
                : (lang == 'kk'
                    ? 'Платформаны айналып өтуге қатаң тыйым салынады (бұғаттау).'
                    : 'Запрещен увод клиентов мимо платформы на наличные (бан профиля).'),
            lang == 'en'
                ? 'Obligatory photo check BEFORE & AFTER according to Tech Regulation.'
                : (lang == 'kk'
                    ? 'Техникалық регламент бойынша ЖҰМЫСҚА ДЕЙІН және КЕЙІН міндетті фотоесеп.'
                    : 'Обязательная фотофиксация ДО и ПОСЛЕ работ по Техрегламенту.'),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionTitle(c, lang == 'en' ? 'Technical Regulations' : (lang == 'kk' ? 'Техникалық регламент' : 'Технологический регламент')),
        _buildText(c, lang == 'en'
            ? '1. Plumbing: shut off entry valves, 15 min pressure test, weld at 260°C.\n2. Electrical: de-energize panel, ban copper-aluminum twisting, use certified terminals.\n3. Finishing: 48h material acclimation, 8-10 mm expansion gap.'
            : (lang == 'kk'
                ? '1. Сантехника: кіреберіс шүмектерді жабу, 15 мин қысым сынағы, 260°C дәнекерлеу.\n2. Электрика: қалқанды сөндіру, мыс-алюминий бұрауына тыйым, клеммалармен қосу.\n3. Әрлеу: материалдарды 48 сағ бейімдеу, 8-10 мм деформациялық саңылау.'
                : '1. Сантехника: перекрытие вводных кранов, опрессовка 15 мин, пайка при 260°C.\n2. Электрика: обесточивание щита, запрет скруток меди с алюминием, соединения гильзами/клеммами.\n3. Отделка: акклиматизация материалов 48 ч, зазор ламината 8-10 мм.')),
      ],
    );
  }

  // 4. Вкладка Конфиденциальность
  Widget _buildPrivacyTab(AppColors c, String lang) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHighlightCard(
          c,
          title: lang == 'en' ? '🛡 Data Privacy (RK Law № 94-V):' : (lang == 'kk' ? '🛡 Дербес деректерді қорғау (ҚР Заңы № 94-V):' : '🛡 Защита данных (Закон РК № 94-V):'),
          bullets: [
            lang == 'en'
                ? 'All servers and user data are strictly hosted within the Republic of Kazakhstan.'
                : (lang == 'kk'
                    ? 'Барлық серверлер мен деректер тек Қазақстан Республикасының аумағында сақталады.'
                    : 'Все серверы и базы данных расположены строго в Республике Казахстан.'),
            lang == 'en'
                ? 'Your personal data is NEVER sold or shared with advertisers.'
                : (lang == 'kk'
                    ? 'Деректеріңіз ешқашан жарнама берушілерге сатылмайды немесе берілмейді.'
                    : 'Данные пользователей не передаются рекламодателям или посторонним лицам.'),
            lang == 'en'
                ? 'Phone numbers are used exclusively for login OTP and service updates.'
                : (lang == 'kk'
                    ? 'Телефон нөмірі тек кіру кодын (OTP) алу және хабарламалар үшін қолданылады.'
                    : 'Номер телефона используется исключительно для авторизации и домовых заявок.'),
          ],
        ),
        const SizedBox(height: 16),
        _buildSectionTitle(c, lang == 'en' ? 'Legal Framework' : (lang == 'kk' ? 'Құқықтық негіздер' : 'Правовые основания')),
        _buildText(c, lang == 'en'
            ? 'Processing of personal data is carried out in strict compliance with the Law of the Republic of Kazakhstan dated May 21, 2013 No. 94-V "On Personal Data and its Protection".'
            : (lang == 'kk'
                ? 'Дербес деректерді өңдеу «Дербес деректер және оларды қорғау туралы» Қазақстан Республикасының 2013 жылғы 21 мамырдағы № 94-V Заңына қатаң сәйкестікте жүзеге асырылады.'
                : 'Обработка персональных данных осуществляется в строгом соответствии с Законом Республики Казахстан от 21 мая 2013 года № 94-V «О персональных данных и их защите».')),
      ],
    );
  }

  // 5. Вкладка Пилот
  Widget _buildPilotTab(AppColors c, String lang) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildHighlightCard(
          c,
          title: lang == 'en' ? '🎁 Pilot Launch 50 ₸:' : (lang == 'kk' ? '🎁 Пилоттық іске қосу 50 ₸:' : '🎁 Условия Пилотного проекта 50 ₸:'),
          bullets: [
            lang == 'en'
                ? 'First 3 months: special promo price 50 ₸ per apartment/month.'
                : (lang == 'kk'
                    ? 'Алғашқы 3 ай: пәтеріне айына небәрі 50 ₸ промо-бағасы.'
                    : 'Первые 3 месяца: специальная льготная цена 50 ₸ за квартиру в месяц.'),
            lang == 'en'
                ? 'Includes all Maximum Tier features: voting, annual reports, master feed.'
                : (lang == 'kk'
                    ? 'Максималды тарифінің барлық мүмкіндіктері кіреді.'
                    : 'Включает все функции Максимального тарифа: голосования, отчеты, заявки.'),
            lang == 'en'
                ? 'From month 4: standard 120 ₸/apt or continue with referral program.'
                : (lang == 'kk'
                    ? '4-айдан бастап: стандартты 120 ₸/пәтер немесе жолдама бағдарламасы.'
                    : 'С 4-го месяца: стандартный тариф 120 ₸/кв или продолжение по реферальной программе.'),
          ],
        ),
      ],
    );
  }

  // UI Helpers
  Widget _buildHighlightCard(AppColors c, {required String title, required List<String> bullets}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: c.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: c.primary.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: c.primary, fontWeight: FontWeight.bold, fontSize: 13)),
          const SizedBox(height: 8),
          ...bullets.map((b) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(LucideIcons.checkCircle2, size: 14, color: c.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(b, style: TextStyle(color: c.textPrimary, fontSize: 12, height: 1.35)),
                    ),
                  ],
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(AppColors c, String title) {
    return Text(
      title,
      style: TextStyle(color: c.textPrimary, fontWeight: FontWeight.bold, fontSize: 14),
    );
  }

  Widget _buildText(AppColors c, String text) {
    return Text(
      text,
      style: TextStyle(color: c.textSecondary, fontSize: 12, height: 1.4),
    );
  }
}
