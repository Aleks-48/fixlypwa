import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_presentation():
    prs = Presentation()
    # 16:9 widescreen
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6] # completely blank layout

    # Colors
    NAVY_DARK = RGBColor(15, 23, 42)      # #0F172A (Deep Slate)
    NAVY_BRAND = RGBColor(30, 64, 175)    # #1E40AF (Fixly Blue)
    BLUE_ACCENT = RGBColor(37, 99, 235)   # #2563EB (Primary Blue)
    CYAN_ACCENT = RGBColor(14, 165, 233)  # #0EA5E9 (Cyan Accent)
    BG_LIGHT = RGBColor(248, 250, 252)    # #F8FAFC (Light slate background)
    WHITE = RGBColor(255, 255, 255)
    CARD_BG = RGBColor(255, 255, 255)
    BORDER_COLOR = RGBColor(226, 232, 240) # #E2E8F0
    TEXT_MUTED = RGBColor(100, 116, 139)   # #64748B
    TEXT_DARK = RGBColor(30, 41, 59)       # #1E293B
    GREEN_ACCENT = RGBColor(16, 185, 129)  # #10B981
    AMBER_ACCENT = RGBColor(245, 158, 11)  # #F59E0B
    PURPLE_ACCENT = RGBColor(139, 92, 246) # #8B5CF6

    def add_header(slide, badge_text, title_text, subtitle_text=""):
        # Header category badge
        badge_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.45), Inches(8.0), Inches(0.35))
        tf_b = badge_box.text_frame
        tf_b.word_wrap = True
        tf_b.margin_left = tf_b.margin_right = tf_b.margin_top = tf_b.margin_bottom = 0
        p_b = tf_b.paragraphs[0]
        p_b.text = badge_text.upper()
        p_b.font.size = Pt(9.5)
        p_b.font.bold = True
        p_b.font.color.rgb = CYAN_ACCENT
        p_b.font.name = "Segoe UI"

        # Slide Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.5), Inches(0.6))
        tf_t = title_box.text_frame
        tf_t.word_wrap = True
        tf_t.margin_left = tf_t.margin_right = tf_t.margin_top = tf_t.margin_bottom = 0
        p_t = tf_t.paragraphs[0]
        p_t.text = title_text
        p_t.font.size = Pt(21)
        p_t.font.bold = True
        p_t.font.color.rgb = NAVY_DARK
        p_t.font.name = "Segoe UI"

        if subtitle_text:
            p_sub = tf_t.add_paragraph()
            p_sub.text = subtitle_text
            p_sub.font.size = Pt(11)
            p_sub.font.color.rgb = TEXT_MUTED
            p_sub.font.name = "Segoe UI"
            p_sub.space_before = Pt(3)

    def add_footer(slide, slide_num):
        footer_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.0), Inches(11.733), Inches(0.35))
        tf = footer_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = f"Fixly | Управление ИТ-проектом (PMBOK 6)  •  Слайд {slide_num} из 7"
        p.font.size = Pt(9)
        p.font.color.rgb = TEXT_MUTED
        p.font.name = "Segoe UI"

    def draw_card(slide, left, top, width, height, bg_color=WHITE, border_color=BORDER_COLOR):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(1)
        else:
            shape.line.fill.background()
        return shape

    # -------------------------------------------------------------
    # SLIDE 1: ТИТУЛЬНЫЙ
    # -------------------------------------------------------------
    slide1 = prs.slides.add_slide(blank_layout)
    
    # Dark modern high-tech background
    bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg1.fill.solid()
    bg1.fill.fore_color.rgb = NAVY_DARK
    bg1.line.fill.background()

    # Top accent line
    accent_line = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(0.8), Inches(1.8), Inches(0.06))
    accent_line.fill.solid()
    accent_line.fill.fore_color.rgb = CYAN_ACCENT
    accent_line.line.fill.background()

    # Product tag
    tag_box = slide1.shapes.add_textbox(Inches(0.8), Inches(1.1), Inches(8.0), Inches(0.4))
    tf_tag = tag_box.text_frame
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = "PROPTECH PWA-ПЛАТФОРМА ДЛЯ КАЗАХСТАНА • PMBOK GUIDE 6TH EDITION"
    p_tag.font.size = Pt(11)
    p_tag.font.bold = True
    p_tag.font.color.rgb = CYAN_ACCENT
    p_tag.font.name = "Segoe UI"

    # Main Title
    t_box = slide1.shapes.add_textbox(Inches(0.8), Inches(1.6), Inches(11.5), Inches(2.2))
    tf_main = t_box.text_frame
    tf_main.word_wrap = True
    p1 = tf_main.paragraphs[0]
    p1.text = "Управление ИТ-проектами"
    p1.font.size = Pt(40)
    p1.font.bold = True
    p1.font.color.rgb = WHITE
    p1.font.name = "Segoe UI"

    p2 = tf_main.add_paragraph()
    p2.text = "Практические задания №1, №2, №3 на базе продукта Fixly"
    p2.font.size = Pt(22)
    p2.font.color.rgb = RGBColor(191, 219, 254) # Light blue
    p2.font.name = "Segoe UI"
    p2.space_before = Pt(8)

    # Context Card on Slide 1
    c1 = draw_card(slide1, Inches(0.8), Inches(4.1), Inches(11.733), Inches(2.3), bg_color=RGBColor(30, 41, 59), border_color=RGBColor(51, 65, 85))
    c_box = slide1.shapes.add_textbox(Inches(1.1), Inches(4.25), Inches(11.1), Inches(2.0))
    tf_c = c_box.text_frame
    tf_c.word_wrap = True
    
    p_c_head = tf_c.paragraphs[0]
    p_c_head.text = "ОБЪЕКТ ИССЛЕДОВАНИЯ: СИСТЕМА FIXLY"
    p_c_head.font.size = Pt(11)
    p_c_head.font.bold = True
    p_c_head.font.color.rgb = CYAN_ACCENT
    p_c_head.font.name = "Segoe UI"

    p_c1 = tf_c.add_paragraph()
    p_c1.text = "• Продукт: Цифровая экосистема и PWA-платформа для прозрачного управления ОСИ/КСК многоквартирных домов в РК."
    p_c1.font.size = Pt(13)
    p_c1.font.color.rgb = RGBColor(241, 245, 249)
    p_c1.font.name = "Segoe UI"
    p_c1.space_before = Pt(6)

    p_c2 = tf_c.add_paragraph()
    p_c2.text = "• Методологическая база: Стандарт PMI PMBOK® Guide (6-е издание) — группы процессов, области знаний, анализ окружения."
    p_c2.font.size = Pt(13)
    p_c2.font.color.rgb = RGBColor(241, 245, 249)
    p_c2.font.name = "Segoe UI"
    p_c2.space_before = Pt(4)

    p_c3 = tf_c.add_paragraph()
    p_c3.text = "• Состав работы: Анализ терминов (Задание 1), Проект vs Операции (Задание 2), Окружение и стейкхолдеры (Задание 3)."
    p_c3.font.size = Pt(13)
    p_c3.font.color.rgb = RGBColor(241, 245, 249)
    p_c3.font.name = "Segoe UI"
    p_c3.space_before = Pt(4)

    # -------------------------------------------------------------
    # SLIDE 2: О ПРОДУКТЕ FIXLY
    # -------------------------------------------------------------
    slide2 = prs.slides.add_slide(blank_layout)
    bg2 = slide2.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg2.fill.solid()
    bg2.fill.fore_color.rgb = BG_LIGHT
    bg2.line.fill.background()

    add_header(slide2, "О продукте // Контекст ИТ-проекта", "Fixly: Цифровая PropTech PWA-платформа", "Автоматизация управления жилой недвижимостью, прозрачность бюджета и мобильные сервисы")
    add_footer(slide2, 2)

    # Top Banner Card: Назначение
    draw_card(slide2, Inches(0.8), Inches(1.5), Inches(11.733), Inches(1.35), bg_color=WHITE, border_color=BORDER_COLOR)
    tb_box = slide2.shapes.add_textbox(Inches(1.0), Inches(1.6), Inches(11.3), Inches(1.1))
    tf_tb = tb_box.text_frame
    tf_tb.word_wrap = True
    p_tb_h = tf_tb.paragraphs[0]
    p_tb_h.text = "ГЛАВНОЕ НАЗНАЧЕНИЕ ПРОДУКТА"
    p_tb_h.font.size = Pt(10)
    p_tb_h.font.bold = True
    p_tb_h.font.color.rgb = BLUE_ACCENT
    p_tb_h.font.name = "Segoe UI"

    p_tb_body = tf_tb.add_paragraph()
    p_tb_body.text = "Комплексная цифровизация многоквартирных домов в Казахстане: устранение непрозрачности старых КСК, обеспечение 100% открытости финансовых отчетов, легитимный сбор кворума жильцов через электронное голосование и ускорение решения коммунальных аварий."
    p_tb_body.font.size = Pt(12.5)
    p_tb_body.font.color.rgb = TEXT_DARK
    p_tb_body.font.name = "Segoe UI"
    p_tb_body.space_before = Pt(4)

    # 3 Feature Cards
    features = [
        ("AI-ДИСПЕТЧЕР ЗАЯВОК", "Gemini API & LLM Маршрутизация", 
         "Автоматическая классификация обращений жителей по фото и аудио. AI определяет тип аварии (сантехника, электрика, лифт), критичность и автоматически назначает дежурного мастера с контролем SLA.", BLUE_ACCENT),
        ("ИНТЕГРАЦИЯ С БАНКАМИ", "Kaspi.kz & Halyk Bank API", 
         "Бесшовное выставление цифровых квитанций на оплату содержания дома (РСЖ, капремонт). Моментальное расщепление платежей, автоматическая сверка лицевых счетов и прозрачный остаток на счетах дома.", GREEN_ACCENT),
        ("ЛЕГИТИМНЫЕ ГОЛОСОВАНИЯ", "Кворум онлайн & Юридическая сила", 
         "Проведение общих собраний собственников (ОСИ) в цифровом формате. Верификация через SMS/ЭЦП, соблюдение закона 'О жилищных отношениях РК', автоматическое формирование итогового протокола собрания.", PURPLE_ACCENT)
    ]

    card_w = Inches(3.75)
    card_gap = Inches(0.24)
    start_x = Inches(0.8)

    for i, (f_tag, f_title, f_desc, f_color) in enumerate(features):
        x = start_x + i * (card_w + card_gap)
        draw_card(slide2, x, Inches(3.05), card_w, Inches(3.65), bg_color=WHITE, border_color=BORDER_COLOR)

        # Top color badge line inside card
        c_line = slide2.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(3.05), card_w, Inches(0.08))
        c_line.fill.solid()
        c_line.fill.fore_color.rgb = f_color
        c_line.line.fill.background()

        fc_box = slide2.shapes.add_textbox(x + Inches(0.25), Inches(3.25), card_w - Inches(0.5), Inches(3.3))
        tf_fc = fc_box.text_frame
        tf_fc.word_wrap = True

        p_ftag = tf_fc.paragraphs[0]
        p_ftag.text = f_tag
        p_ftag.font.size = Pt(9.5)
        p_ftag.font.bold = True
        p_ftag.font.color.rgb = f_color
        p_ftag.font.name = "Segoe UI"

        p_ftitle = tf_fc.add_paragraph()
        p_ftitle.text = f_title
        p_ftitle.font.size = Pt(14)
        p_ftitle.font.bold = True
        p_ftitle.font.color.rgb = NAVY_DARK
        p_ftitle.font.name = "Segoe UI"
        p_ftitle.space_before = Pt(4)

        p_fdesc = tf_fc.add_paragraph()
        p_fdesc.text = f_desc
        p_fdesc.font.size = Pt(11.5)
        p_fdesc.font.color.rgb = TEXT_DARK
        p_fdesc.font.name = "Segoe UI"
        p_fdesc.space_before = Pt(8)

    # -------------------------------------------------------------
    # SLIDE 3: ЗАДАНИЕ 3 — ВНУТРЕННЕЕ И ВНЕШНЕЕ ОКРУЖЕНИЕ
    # -------------------------------------------------------------
    slide3 = prs.slides.add_slide(blank_layout)
    bg3 = slide3.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg3.fill.solid()
    bg3.fill.fore_color.rgb = BG_LIGHT
    bg3.line.fill.background()

    add_header(slide3, "Задание 3 // Анализ стейкхолдеров", "Внутреннее и внешнее окружение проекта Fixly", "Идентификация заинтересованных сторон согласно стандарту PMBOK 6 (Project Stakeholder Management)")
    add_footer(slide3, 3)

    col_w = Inches(5.75)
    
    # Left Card: Внутреннее окружение
    draw_card(slide3, Inches(0.8), Inches(1.5), col_w, Inches(5.2), bg_color=WHITE, border_color=BORDER_COLOR)
    # Header strip
    strip_in = slide3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), col_w, Inches(0.45))
    strip_in.fill.solid()
    strip_in.fill.fore_color.rgb = NAVY_BRAND
    strip_in.line.fill.background()
    p_si = strip_in.text_frame.paragraphs[0]
    p_si.text = "  1. ВНУТРЕННЕЕ ОКРУЖЕНИЕ ПРОЕКТА (TEAM & FOUNDERS)"
    p_si.font.size = Pt(11)
    p_si.font.bold = True
    p_si.font.color.rgb = WHITE
    p_si.font.name = "Segoe UI"

    box_in = slide3.shapes.add_textbox(Inches(1.0), Inches(2.05), col_w - Inches(0.4), Inches(4.5))
    tf_in = box_in.text_frame
    tf_in.word_wrap = True

    internal_roles = [
        ("Инициаторы (Фаундеры / Sponsor):", "Определяют бизнес-видение, формируют Устав проекта (Project Charter), привлекают инвестиции и валидируют ключевые бизнес-цели."),
        ("Руководитель проекта (Project Manager):", "Управляет содержанием (Scope), расписанием (Schedule), бюджетом и рисками; проводит Daily Scrum, фасилитирует спринты и взаимодействие."),
        ("Команда разработки (Fullstack Devs):", "Создает Next.js бэкенд, микросервисы взаимодействия с БД PostgreSQL/Prisma, PWA-клиенты и кроссплатформенное приложение на Flutter."),
        ("AI / ML Инженеры:", "Интегрируют модели Gemini API, настраивают промпт-инжиниринг классификации фото дефектов и маршрутизации входящих заявок жильцов."),
        ("Проектировщики UI/UX & QA Инженеры:", "Проектируют интуитивные экраны для председателей ОСИ и жителей, проводят приемочные тесты, регрессионное тестирование функционала.")
    ]

    for idx, (role, desc) in enumerate(internal_roles):
        p_r = tf_in.paragraphs[0] if idx == 0 else tf_in.add_paragraph()
        p_r.text = f"• {role} "
        p_r.font.bold = True
        p_r.font.size = Pt(11)
        p_r.font.color.rgb = NAVY_BRAND
        p_r.font.name = "Segoe UI"
        if idx > 0:
            p_r.space_before = Pt(7)

        run = p_r.add_run()
        run.text = desc
        run.font.bold = False
        run.font.size = Pt(10.5)
        run.font.color.rgb = TEXT_DARK

    # Right Card: Внешнее окружение
    draw_card(slide3, Inches(6.78), Inches(1.5), col_w, Inches(5.2), bg_color=WHITE, border_color=BORDER_COLOR)
    strip_out = slide3.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(6.78), Inches(1.5), col_w, Inches(0.45))
    strip_out.fill.solid()
    strip_out.fill.fore_color.rgb = CYAN_ACCENT
    strip_out.line.fill.background()
    p_so = strip_out.text_frame.paragraphs[0]
    p_so.text = "  2. ВНЕШНЕЕ ОКРУЖЕНИЕ ПРОЕКТА (EXTERNAL STAKEHOLDERS)"
    p_so.font.size = Pt(11)
    p_so.font.bold = True
    p_so.font.color.rgb = WHITE
    p_so.font.name = "Segoe UI"

    box_out = slide3.shapes.add_textbox(Inches(6.98), Inches(2.05), col_w - Inches(0.4), Inches(4.5))
    tf_out = box_out.text_frame
    tf_out.word_wrap = True

    external_roles = [
        ("Заказчики (Председатели ОСИ / КСК):", "Приобретают SaaS-подписку на сервис Fixly, формулируют функциональные требования к бухгалтерским отчетам и ведению реестров собственников."),
        ("Конечные потребители (Жильцы квартир):", "Подают заявки на устранение неисправностей в доме, оплачивают квитанции в приложении, принимают участие в юридических голосованиях."),
        ("Государственные органы и регуляторы:", "Жилищная инспекция, районные Акиматы, МЦРИАП — контролируют легитимность сбора кворума, соблюдение ФЗ 'О жилищных отношениях' и 152-ФЗ/ЗРК по защите персональных данных."),
        ("Поставщики внешних API и сервисов:", "Google Cloud (Gemini API LLM), платежные шлюзы (Kaspi Pay, Halyk Bank), SMS-шлюзы верификации пользователей (Mobizon)."),
        ("Подрядные сервисные организации:", "Аварийные службы, электрики, сантехники, лифтовые компании — исполнители задач по заявкам из системы Fixly.")
    ]

    for idx, (role, desc) in enumerate(external_roles):
        p_r = tf_out.paragraphs[0] if idx == 0 else tf_out.add_paragraph()
        p_r.text = f"• {role} "
        p_r.font.bold = True
        p_r.font.size = Pt(11)
        p_r.font.color.rgb = RGBColor(3, 105, 161) # Deep cyan
        p_r.font.name = "Segoe UI"
        if idx > 0:
            p_r.space_before = Pt(6)

        run = p_r.add_run()
        run.text = desc
        run.font.bold = False
        run.font.size = Pt(10.5)
        run.font.color.rgb = TEXT_DARK

    # -------------------------------------------------------------
    # SLIDE 4: ЗАДАНИЕ 3 — СХЕМА СВЯЗЕЙ И ДЕЙСТВИЙ
    # -------------------------------------------------------------
    slide4 = prs.slides.add_slide(blank_layout)
    bg4 = slide4.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg4.fill.solid()
    bg4.fill.fore_color.rgb = BG_LIGHT
    bg4.line.fill.background()

    add_header(slide4, "Задание 3 // Модель взаимодействия", "Схема связей и потоков данных в проекте Fixly", "Карта интеракций стейкхолдеров с центральной платформой (Inputs & Outputs)")
    add_footer(slide4, 4)

    # 5 Rows of Interactions around Fixly Core
    interactions = [
        ("Инициаторы (Фаундеры)", "Утверждает стратегическое видение, Устав проекта и ключевые метрики (OKRs)", "Финансовая и операционная аналитика, рост стоимости стартапа", NAVY_BRAND),
        ("Заказчик (ОСИ / КСК)", "Формирует бизнес-требования к учету, оплачивает ежемесячную SaaS-подписку", "Готовая панель управления домом, прозрачные балансы, кворум онлайн", BLUE_ACCENT),
        ("Команда разработки", "Проектирует архитектуру, разрабатывает код PWA/Flutter, тестирует и деплоит релизы", "Задачи спринта, Jira/GitHub backlog, критерии приемки, фонд оплаты труда", GREEN_ACCENT),
        ("Поставщики API (Gemini / Kaspi)", "Предоставляют LLM-модели для AI-диспетчера и финансовые платежные шлюзы", "API-запросы от пользователей, оплата потребления облачных токенов и комиссий", AMBER_ACCENT),
        ("Потребители (Жители)", "Регистрируют заявки на ремонт с фото/видео, голосуют онлайн и оплачивают услуги", "Устраненные поломки, прозрачный отчет о тратах дома, мобильный сервис 24/7", PURPLE_ACCENT)
    ]

    card_y = Inches(1.5)
    row_h = Inches(0.95)
    gap_y = Inches(0.12)

    for i, (actor, act_in, act_out, color) in enumerate(interactions):
        y = card_y + i * (row_h + gap_y)
        
        # 1. Left Actor Card
        draw_card(slide4, Inches(0.8), y, Inches(2.8), row_h, bg_color=WHITE, border_color=BORDER_COLOR)
        # Left color bar
        bar = slide4.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), y, Inches(0.08), row_h)
        bar.fill.solid()
        bar.fill.fore_color.rgb = color
        bar.line.fill.background()

        abox = slide4.shapes.add_textbox(Inches(0.95), y + Inches(0.12), Inches(2.6), row_h - Inches(0.24))
        tf_a = abox.text_frame
        tf_a.word_wrap = True
        p_a = tf_a.paragraphs[0]
        p_a.text = actor
        p_a.font.size = Pt(11)
        p_a.font.bold = True
        p_a.font.color.rgb = NAVY_DARK
        p_a.font.name = "Segoe UI"

        # 2. Arrow to Fixly (Action / Inflow)
        arrow_box = slide4.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(3.7), y + Inches(0.25), Inches(0.5), Inches(0.45))
        arrow_box.fill.solid()
        arrow_box.fill.fore_color.rgb = color
        arrow_box.line.fill.background()

        # 3. Middle Flow Description (To Fixly & From Fixly)
        draw_card(slide4, Inches(4.3), y, Inches(5.8), row_h, bg_color=WHITE, border_color=BORDER_COLOR)
        flow_box = slide4.shapes.add_textbox(Inches(4.45), y + Inches(0.08), Inches(5.5), row_h - Inches(0.16))
        tf_f = flow_box.text_frame
        tf_f.word_wrap = True

        p_f1 = tf_f.paragraphs[0]
        p_f1.text = "➔ Передает в Fixly: "
        p_f1.font.bold = True
        p_f1.font.size = Pt(10)
        p_f1.font.color.rgb = color
        p_f1.font.name = "Segoe UI"
        run1 = p_f1.add_run()
        run1.text = act_in
        run1.font.bold = False
        run1.font.color.rgb = TEXT_DARK

        p_f2 = tf_f.add_paragraph()
        p_f2.text = "⬅ Получает от Fixly: "
        p_f2.font.bold = True
        p_f2.font.size = Pt(10)
        p_f2.font.color.rgb = TEXT_MUTED
        p_f2.font.name = "Segoe UI"
        p_f2.space_before = Pt(2)
        run2 = p_f2.add_run()
        run2.text = act_out
        run2.font.bold = False
        run2.font.color.rgb = TEXT_DARK

        # 4. Right Target Node: Fixly Platform
        draw_card(slide4, Inches(10.2), y, Inches(2.33), row_h, bg_color=RGBColor(238, 242, 255), border_color=RGBColor(199, 210, 254))
        fix_box = slide4.shapes.add_textbox(Inches(10.3), y + Inches(0.15), Inches(2.13), row_h - Inches(0.3))
        tf_fix = fix_box.text_frame
        tf_fix.word_wrap = True
        p_fix = tf_fix.paragraphs[0]
        p_fix.text = "ЭКОСИСТЕМА FIXLY"
        p_fix.font.size = Pt(10)
        p_fix.font.bold = True
        p_fix.font.color.rgb = NAVY_BRAND
        p_fix.font.name = "Segoe UI"
        p_subfix = tf_fix.add_paragraph()
        p_subfix.text = "Ядро продукта & БД"
        p_subfix.font.size = Pt(9)
        p_subfix.font.color.rgb = TEXT_MUTED
        p_subfix.font.name = "Segoe UI"

    # -------------------------------------------------------------
    # SLIDE 5: ЗАДАНИЕ 1 — СООТВЕТСТВИЕ ТЕРМИНОВ PMBOK
    # -------------------------------------------------------------
    slide5 = prs.slides.add_slide(blank_layout)
    bg5 = slide5.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg5.fill.solid()
    bg5.fill.fore_color.rgb = BG_LIGHT
    bg5.line.fill.background()

    add_header(slide5, "Задание 1 // Теоретический базис", "Соответствие ключевых понятий стандарта PMBOK 6", "Базовый глоссарий управления проектами и организационные структуры компании")
    add_footer(slide5, 5)

    # 4 Cards of Core Terms (Top Row)
    terms = [
        ("ПРОЕКТ (PROJECT)", 
         "Временное предприятие, направленное на создание уникального продукта, услуги или результата. Проект Fixly ограничен дедлайнами релиза и создает уникальную PWA-платформу.", BLUE_ACCENT),
        ("ЖИЗНЕННЫЙ ЦИКЛ (LIFECYCLE)", 
         "Набор последовательных (или итеративных) фаз от инициации до закрытия проекта. В Fixly используется гибридный цикл: Agile-спринты (Scrum) внутри общих вех PMBOK.", GREEN_ACCENT),
        ("ОКРУЖЕНИЕ ПРОЕКТА (EEF / OPA)", 
         "Внутренние и внешние факторы среды (EEF) и активы процессов организации (OPA): нормативная база РК, законы об ОСИ, облачная инфраструктура AWS/Yandex.", AMBER_ACCENT),
        ("ОУП / PMO (PROJECT OFFICE)", 
         "Офис управления проектами — подразделение, стандартизирующее процессы проектного управления и распределяющее ресурсы между продуктовыми модулями Fixly.", PURPLE_ACCENT)
    ]

    card_w5 = Inches(2.81)
    gap5 = Inches(0.16)
    start_x5 = Inches(0.8)

    for i, (t_name, t_def, col) in enumerate(terms):
        x = start_x5 + i * (card_w5 + gap5)
        draw_card(slide5, x, Inches(1.5), card_w5, Inches(2.2), bg_color=WHITE, border_color=BORDER_COLOR)
        # top bar
        tb = slide5.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(1.5), card_w5, Inches(0.06))
        tb.fill.solid()
        tb.fill.fore_color.rgb = col
        tb.line.fill.background()

        tbox = slide5.shapes.add_textbox(x + Inches(0.18), Inches(1.65), card_w5 - Inches(0.36), Inches(1.95))
        tf = tbox.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = t_name
        pt.font.size = Pt(10.5)
        pt.font.bold = True
        pt.font.color.rgb = col
        pt.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = t_def
        pd.font.size = Pt(9.5)
        pd.font.color.rgb = TEXT_DARK
        pd.font.name = "Segoe UI"
        pd.space_before = Pt(4)

    # Bottom Section: Comparison of Organizational Structures
    draw_card(slide5, Inches(0.8), Inches(3.9), Inches(11.733), Inches(2.8), bg_color=WHITE, border_color=BORDER_COLOR)
    
    # Table inside
    rows = 4
    cols = 5
    table_shape = slide5.shapes.add_table(rows, cols, Inches(0.9), Inches(4.05), Inches(11.533), Inches(2.45))
    table = table_shape.table

    # Column widths
    table.columns[0].width = Inches(2.5) # Structure Type
    table.columns[1].width = Inches(2.2) # PM Authority
    table.columns[2].width = Inches(2.2) # Resource Availability
    table.columns[3].width = Inches(2.3) # Budget Manager
    table.columns[4].width = Inches(2.333) # Fixly Context

    headers = ["Тип оргструктуры", "Власть руководителя (РП)", "Доступность ресурсов", "Управление бюджетом", "Применимость в Fixly"]
    for c_idx, h_text in enumerate(headers):
        cell = table.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY_BRAND
        p = cell.text_frame.paragraphs[0]
        p.text = h_text
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.font.name = "Segoe UI"
        p.alignment = PP_ALIGN.CENTER

    data_rows = [
        ("Функциональная (Functional)", "Малая или отсутствует", "Малая или отсутствует", "Функциональный менеджер", "Не подходит (низкая скорость ИТ-разработки)"),
        ("Матричная (Сбалансированная / Сильная)", "От умеренной до высокой", "От умеренной до высокой", "Смешанное / Руководитель проекта", "Оптимально при масштабировании Fixly"),
        ("Проектная (Projectized)", "Высокая или полная", "Высокая или полная", "Руководитель проекта (PM)", "Текущая стадия Fixly (выделенная команда стартапа)")
    ]

    for r_idx, row_data in enumerate(data_rows):
        for c_idx, val in enumerate(row_data):
            cell = table.cell(r_idx + 1, c_idx)
            cell.fill.solid()
            cell.fill.fore_color.rgb = RGBColor(248, 250, 252) if r_idx % 2 == 1 else WHITE
            p = cell.text_frame.paragraphs[0]
            p.text = val
            p.font.size = Pt(9.5)
            p.font.name = "Segoe UI"
            p.font.color.rgb = NAVY_DARK if c_idx == 0 else TEXT_DARK
            if c_idx == 0:
                p.font.bold = True
            if c_idx in [1, 2, 3]:
                p.alignment = PP_ALIGN.CENTER

    # -------------------------------------------------------------
    # SLIDE 6: ЗАДАНИЕ 2 — ПРОЕКТНАЯ (CHANGE) VS ОПЕРАЦИОННАЯ (RUN)
    # -------------------------------------------------------------
    slide6 = prs.slides.add_slide(blank_layout)
    bg6 = slide6.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg6.fill.solid()
    bg6.fill.fore_color.rgb = BG_LIGHT
    bg6.line.fill.background()

    add_header(slide6, "Задание 2 // Сравнительный анализ", "Сравнение: Проектная (Change) vs Операционная (Run) деятельность", "Разграничение создания нового продукта и поддержания текущего сервиса на базе Fixly")
    add_footer(slide6, 6)

    # 6-criteria Table
    table_card = draw_card(slide6, Inches(0.8), Inches(1.5), Inches(11.733), Inches(5.2), bg_color=WHITE, border_color=BORDER_COLOR)
    
    t_shape6 = slide6.shapes.add_table(7, 4, Inches(0.95), Inches(1.65), Inches(11.433), Inches(4.85))
    t6 = t_shape6.table

    t6.columns[0].width = Inches(2.2) # Критерий
    t6.columns[1].width = Inches(4.3) # Проектная деятельность (Change)
    t6.columns[2].width = Inches(4.3) # Операционная деятельность (Run)
    t6.columns[3].width = Inches(0.633) # Marker

    cols_h = ["Критерий сравнения", "Проектная деятельность (Change / Fixly Dev)", "Операционная деятельность (Run / Fixly SaaS)", ""]
    for c_idx, h_text in enumerate(cols_h):
        cell = t6.cell(0, c_idx)
        cell.fill.solid()
        cell.fill.fore_color.rgb = NAVY_BRAND
        p = cell.text_frame.paragraphs[0]
        p.text = h_text
        p.font.size = Pt(10.5)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.font.name = "Segoe UI"
        if c_idx == 0:
            p.alignment = PP_ALIGN.LEFT
        else:
            p.alignment = PP_ALIGN.CENTER

    criteria_data = [
        ("1. Связь со стратегией", 
         "Реализует стратегические изменения: выход на рынок PropTech РК, создание нового AI-модуля и запуск интеграций.", 
         "Поддерживает текущую бизнес-модель: обслуживание существующих клиентов (ОСИ/КСК), генерация регулярной выручки.", "💡"),
        ("2. Продолжительность", 
         "Временный характер: четкие дедлайны этапов MVP, бета-тестирования и финальной сдачи релиза v1.0.", 
         "Непрерывный и циклический процесс: бессрочное сопровождение серверов, ежедневная обработка заявок жильцов.", "⏱"),
        ("3. Организационная структура", 
         "Кросс-функциональная проектная команда (Dev, QA, PM, UI/UX), формируемая под цели релиза.", 
         "Линейная/функциональная структура: служба техподдержки L1/L2, дежурные системные администраторы, менеджеры аккаунтов.", "👥"),
        ("4. Регламентация процессов", 
         "Высокая степень неопределенности; гибкие методологии (Agile, Scrum), инновационный поиск архитектурных решений.", 
         "Жесткие регламенты, инструкции, SLA (время реакции на сбой < 15 мин), стандартные операционные процедуры (SOP).", "📋"),
        ("5. Получаемый результат", 
         "Уникальный результат: скомпилированная система Fixly, мобильные приложения, база знаний и закрытый Устав проекта.", 
         "Стандартный повторяющийся результат: закрытые инциденты жителей, собранные платежи, регулярные отчеты за месяц.", "🎯"),
        ("6. Распределение ресурсов", 
         "Динамическое проектное бюджетирование (CAPEX), ресурсы привлекаются под фазы разработки.", 
         "Стабильные операционные расходы (OPEX): аренда облачных мощностей, фонд оплаты постоянного саппорта.", "💰")
    ]

    for r_idx, (crit, change_val, run_val, icon) in enumerate(criteria_data):
        cell_crit = t6.cell(r_idx + 1, 0)
        cell_ch = t6.cell(r_idx + 1, 1)
        cell_ru = t6.cell(r_idx + 1, 2)
        cell_ic = t6.cell(r_idx + 1, 3)

        bg_row = RGBColor(248, 250, 252) if r_idx % 2 == 1 else WHITE
        for cell in (cell_crit, cell_ch, cell_ru, cell_ic):
            cell.fill.solid()
            cell.fill.fore_color.rgb = bg_row

        p0 = cell_crit.text_frame.paragraphs[0]
        p0.text = crit
        p0.font.size = Pt(10)
        p0.font.bold = True
        p0.font.color.rgb = NAVY_BRAND
        p0.font.name = "Segoe UI"

        p1 = cell_ch.text_frame.paragraphs[0]
        p1.text = change_val
        p1.font.size = Pt(9.5)
        p1.font.color.rgb = TEXT_DARK
        p1.font.name = "Segoe UI"

        p2 = cell_ru.text_frame.paragraphs[0]
        p2.text = run_val
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = TEXT_DARK
        p2.font.name = "Segoe UI"

        p3 = cell_ic.text_frame.paragraphs[0]
        p3.text = icon
        p3.font.size = Pt(11)
        p3.alignment = PP_ALIGN.CENTER

    # -------------------------------------------------------------
    # SLIDE 7: КОНСПЕКТ ЛЕКЦИИ 1 (ПАМЯТКА ДЛЯ ТЕТРАДИ)
    # -------------------------------------------------------------
    slide7 = prs.slides.add_slide(blank_layout)
    bg7 = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg7.fill.solid()
    bg7.fill.fore_color.rgb = BG_LIGHT
    bg7.line.fill.background()

    add_header(slide7, "Конспект лекции 1 // Памятка для тетради", "Ключевой каркас стандарта PMBOK 6", "Структурная шпаргалка: 5 групп процессов, 10 областей знаний и шестиугольник проектных ограничений")
    add_footer(slide7, 7)

    # 3 Columns Layout: 5 Process Groups, 10 Knowledge Areas, Constraints Hexagon
    col_w7 = Inches(3.75)
    gap7 = Inches(0.24)

    # 1. 5 Process Groups
    draw_card(slide7, Inches(0.8), Inches(1.5), col_w7, Inches(5.2), bg_color=WHITE, border_color=BORDER_COLOR)
    strip1 = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), col_w7, Inches(0.42))
    strip1.fill.solid()
    strip1.fill.fore_color.rgb = NAVY_BRAND
    strip1.line.fill.background()
    p_s1 = strip1.text_frame.paragraphs[0]
    p_s1.text = " 5 ГРУПП ПРОЦЕССОВ (PROCESSES)"
    p_s1.font.size = Pt(10)
    p_s1.font.bold = True
    p_s1.font.color.rgb = WHITE
    p_s1.font.name = "Segoe UI"

    box_p = slide7.shapes.add_textbox(Inches(0.95), Inches(2.0), col_w7 - Inches(0.3), Inches(4.5))
    tf_p = box_p.text_frame
    tf_p.word_wrap = True

    process_steps = [
        ("1. Инициация (Initiating)", "Разработка Устава проекта (Project Charter), определение стейкхолдеров, авторизация старта."),
        ("2. Планирование (Planning)", "Формирование базовых планов: ИСР (WBS), расписание (CPM), смета, матрица рисков."),
        ("3. Исполнение (Executing)", "Разработка продукта, координация работы команды, выполнение пакетов работ."),
        ("4. Мониторинг и контроль (M&C)", "Анализ освоенного объема (EVM), контроль изменений, отслеживание дефектов и рисков."),
        ("5. Закрытие (Closing)", "Формальная передача продукта заказчику, закрытие контрактов, усвоенные уроки (Lessons Learned).")
    ]

    for idx, (title, desc) in enumerate(process_steps):
        p_step = tf_p.paragraphs[0] if idx == 0 else tf_p.add_paragraph()
        p_step.text = f"{title}\n"
        p_step.font.size = Pt(10.5)
        p_step.font.bold = True
        p_step.font.color.rgb = BLUE_ACCENT
        p_step.font.name = "Segoe UI"
        if idx > 0:
            p_step.space_before = Pt(6)

        run = p_step.add_run()
        run.text = desc
        run.font.bold = False
        run.font.size = Pt(9.5)
        run.font.color.rgb = TEXT_DARK

    # 2. 10 Knowledge Areas
    draw_card(slide7, Inches(4.79), Inches(1.5), col_w7, Inches(5.2), bg_color=WHITE, border_color=BORDER_COLOR)
    strip2 = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(4.79), Inches(1.5), col_w7, Inches(0.42))
    strip2.fill.solid()
    strip2.fill.fore_color.rgb = CYAN_ACCENT
    strip2.line.fill.background()
    p_s2 = strip2.text_frame.paragraphs[0]
    p_s2.text = " 10 ОБЛАСТЕЙ ЗНАНИЙ (KNOWLEDGE AREAS)"
    p_s2.font.size = Pt(10)
    p_s2.font.bold = True
    p_s2.font.color.rgb = WHITE
    p_s2.font.name = "Segoe UI"

    box_k = slide7.shapes.add_textbox(Inches(4.94), Inches(2.0), col_w7 - Inches(0.3), Inches(4.5))
    tf_k = box_k.text_frame
    tf_k.word_wrap = True

    areas = [
        "1. Управление интеграцией (Integration)",
        "2. Управление содержанием (Scope)",
        "3. Управление расписанием (Schedule / Time)",
        "4. Управление стоимостью (Cost / Budget)",
        "5. Управление качеством (Quality)",
        "6. Управление ресурсами (Resources)",
        "7. Управление коммуникациями (Communications)",
        "8. Управление рисками (Risk)",
        "9. Управление закупками (Procurement)",
        "10. Управление заинтересованными сторонами (Stakeholders)"
    ]

    for idx, area in enumerate(areas):
        pa = tf_k.paragraphs[0] if idx == 0 else tf_k.add_paragraph()
        pa.text = f"• {area}"
        pa.font.size = Pt(9.8)
        pa.font.bold = (idx in [0, 1, 2, 3, 7]) # Highlight key ones
        pa.font.color.rgb = NAVY_DARK if (idx in [0, 1, 2, 3, 7]) else TEXT_DARK
        pa.font.name = "Segoe UI"
        if idx > 0:
            pa.space_before = Pt(3.5)

    # 3. Hexagon of Constraints
    draw_card(slide7, Inches(8.78), Inches(1.5), col_w7, Inches(5.2), bg_color=WHITE, border_color=BORDER_COLOR)
    strip3 = slide7.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(8.78), Inches(1.5), col_w7, Inches(0.42))
    strip3.fill.solid()
    strip3.fill.fore_color.rgb = GREEN_ACCENT
    strip3.line.fill.background()
    p_s3 = strip3.text_frame.paragraphs[0]
    p_s3.text = " ШЕСТИУГОЛЬНИК ОГРАНИЧЕНИЙ"
    p_s3.font.size = Pt(10)
    p_s3.font.bold = True
    p_s3.font.color.rgb = WHITE
    p_s3.font.name = "Segoe UI"

    box_h = slide7.shapes.add_textbox(Inches(8.93), Inches(2.0), col_w7 - Inches(0.3), Inches(4.5))
    tf_h = box_h.text_frame
    tf_h.word_wrap = True

    constraints = [
        ("1. Содержание (Scope):", "Объем функционала платформы Fixly (PWA, AI-модуль, реестры)."),
        ("2. Качество (Quality):", "Стандарты безопасности, безотказность 99.9%, отсутствие багов."),
        ("3. Сроки (Schedule):", "Календарные дедлайны спринтов и дата релиза системы на рынок."),
        ("4. Бюджет (Cost):", "Финансовый лимит инвестиций фаундеров на разработку MVP."),
        ("5. Ресурсы (Resources):", "Доступность разработчиков, лицензии API, сервера."),
        ("6. Риски (Risks):", "Изменения законов в РК, отказы API банков, конкурентные угрозы.")
    ]

    for idx, (c_name, c_text) in enumerate(constraints):
        pc = tf_h.paragraphs[0] if idx == 0 else tf_h.add_paragraph()
        pc.text = f"◆ {c_name} "
        pc.font.size = Pt(10.2)
        pc.font.bold = True
        pc.font.color.rgb = GREEN_ACCENT
        pc.font.name = "Segoe UI"
        if idx > 0:
            pc.space_before = Pt(5)

        run = pc.add_run()
        run.text = c_text
        run.font.bold = False
        run.font.size = Pt(9.5)
        run.font.color.rgb = TEXT_DARK

    # Save outputs
    output_workspace = r"d:\fixlypwa\Fixly_Project_Management.pptx"
    output_downloads = r"D:\загрузки\Fixly_Project_Management.pptx"
    output_flash = r"F:\Fixly_Project_Management.pptx"

    prs.save(output_workspace)
    print(f"Saved: {output_workspace}")

    try:
        prs.save(output_downloads)
        print(f"Saved: {output_downloads}")
    except Exception as e:
        print(f"Error saving to downloads: {e}")

    try:
        prs.save(output_flash)
        print(f"Saved: {output_flash}")
    except Exception as e:
        print(f"Error saving to flash: {e}")

if __name__ == "__main__":
    create_presentation()
