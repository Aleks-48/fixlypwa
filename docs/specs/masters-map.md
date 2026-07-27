# Спецификация: Карта и портфолио мастеров (Masters Map & Portfolio)

> Статус: DRAFT · Версия: 0.1 · Дата: 2026-07-23
> Архитектурное соответствие: ADR-0009 (Маркетплейс мастеров), docs/specs/marketplace.md

Модуль «Карта и портфолио мастеров» обеспечивает жителям и председателям публичный просмотр проверенных специалистов (сантехники, электрики, КИПиА, ремонт) с привязкой к городу/району и примерам выполненных работ.

---

## 1. Функциональные требования

1. **Каталог мастеров (`REQ-070`):**
   - Просмотр списка одобренных (`status: APPROVED`) мастеров города.
   - Фильтрация по специализациям (`RequestCategory`: Сантехника, Электрика, Отопление, Общий ремонт и др.).
   - Отображение анкеты мастера: ФИО, аватар/фото, город, стаж, категории, статус верификации.

2. **Портфолио выполненных работ (`REQ-071`):**
   - Просмотр галереи фото выполненных объектов мастера (`MasterPortfolioItem`).
   - Краткое описание объекта, категория и дата выполнения.

3. **Карта и гео-привязка (`REQ-072`):**
   - Интерактивное отображение мастеров на карте города / списка районов (Кокшетау, Астана, Алматы).
   - Выбор радиуса / района обслуживания.

4. **Контакты и прямая связь (`REQ-073`):**
   - Для верифицированных резидентов и председателей — возможность быстрой связи с мастером (телефон / WhatsApp).

---

## 2. Архитектура и модель данных (`web/prisma/schema.prisma`)

Модель `Master` находится на **Identity-уровне** (вне RLS, согласно ADR-0009).

### Добавление модели `MasterPortfolioItem`:
```prisma
model MasterPortfolioItem {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  masterId    String   @map("master_id") @db.Uuid
  title       String
  description String?
  category    String   // RequestCategory
  photoUrls   String[] @map("photo_urls")
  createdAt   DateTime @default(now()) @map("created_at")

  master Master @relation(fields: [masterId], references: [id], onDelete: Cascade)

  @@index([masterId])
  @@map("master_portfolio_item")
}
```

---

## 3. API Контракты

- **`GET /api/masters`**
  - **Params:** `city`, `category` (optional)
  - **Response:**
    ```json
    {
      "masters": [
        {
          "id": "uuid",
          "fullName": "Алексей Смирнов",
          "city": "Кокшетау",
          "categories": ["PLUMBING", "HEATING"],
          "about": "Опыт 10 лет. Аварийный выезд.",
          "portfolioCount": 5,
          "photoUrl": "/uploads/master_1.jpg"
        }
      ]
    }
    ```

- **`GET /api/masters/[id]`**
  - **Response:** Профиль мастера + массив `portfolioItems`.

---

## 4. UX & Страницы

- **Маршрут:** `/app/masters`
- **Компоненты:**
  - `MasterFilterBar` — фильтр по категориям и поисковая строка.
  - `MasterGrid` — сетка карточек мастеров с галереей работ.
  - `MasterDetailModal` — модальное окно с подробным портфолио и фото.
