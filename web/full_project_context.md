---
FILE: D:\fixlypwa\web\prisma\README.md
---
# Prisma вЂ” РјРѕРґРµР»СЊ РґР°РЅРЅС‹С…

`schema.prisma` вЂ” РµРґРёРЅС‹Р№ РёСЃС‚РѕС‡РЅРёРє РјРѕРґРµР»Рё РґР°РЅРЅС‹С… (CLAUDE.md). Р РµР°Р»РёР·СѓРµС‚ РґРѕРјРµРЅ, РѕРїРёСЃР°РЅРЅС‹Р№ РІ
`docs/specs/domain-model.md`, `docs/specs/report-spec.md`, `docs/specs/bank-import.md`,
`docs/specs/features.md` (РўРёСЂ 1: Р¤Р°Р·С‹ 1вЂ“2).

## РЎС‚СЂСѓРєС‚СѓСЂР° РјРёРіСЂР°С†РёР№
- `20260701113453_init` вЂ” С‚Р°Р±Р»РёС†С‹ (СЃРіРµРЅРµСЂРёСЂРѕРІР°РЅРѕ РёР· schema.prisma).
- `20260701120000_rls_policies` вЂ” RLS-РїРѕР»РёС‚РёРєРё РїРѕРІРµСЂС… РјРёРіСЂР°С†РёРё (ADR-0006). РќР°РїРёСЃР°РЅР° РІСЂСѓС‡РЅСѓСЋ
  raw SQL, РїР°С‚С‚РµСЂРЅ РїРѕРґС‚РІРµСЂР¶РґС‘РЅ СЃРїР°Р№РєРѕРј `spikes/rls-prisma/`.

## Identity vs Tenant (ADR-0006)
- **Р’РЅРµ RLS** (bootstrapping): `Osi`, `User`, `Session`, `UserOsiRole`.
- **РџРѕРґ RLS** (РЅРµСЃСѓС‚ `osiId`, РёР·РѕР»РёСЂСѓСЋС‚СЃСЏ РїРѕ С‚РµРЅР°РЅС‚Сѓ): РІСЃРµ РѕСЃС‚Р°Р»СЊРЅС‹Рµ 24 С‚Р°Р±Р»РёС†С‹.

## РљР°Рє СЌС‚Рѕ РёСЃРїРѕР»СЊР·РѕРІР°С‚СЊ РІ РєРѕРґРµ РїСЂРёР»РѕР¶РµРЅРёСЏ
Р›СЋР±РѕР№ РґРѕСЃС‚СѓРї Рє tenant-С‚Р°Р±Р»РёС†Р°Рј вЂ” С‚РѕР»СЊРєРѕ С‡РµСЂРµР· РѕР±С‘СЂС‚РєСѓ `forTenant(osiId, fn)`
(РїР°С‚С‚РµСЂРЅ СЃРј. `spikes/rls-prisma/src/tenant.ts`; РІ `/app` РїРѕСЏРІРёС‚СЃСЏ С„РёРЅР°Р»СЊРЅР°СЏ РІРµСЂСЃРёСЏ РїСЂРё
СЂРµР°Р»РёР·Р°С†РёРё Р±СЌРєРµРЅРґР°):

```ts
await forTenant(session.activeOsiId, (tx) => tx.building.findMany());
```

Р‘РµР· РѕР±С‘СЂС‚РєРё RLS РѕС‚РґР°СЃС‚ 0 СЃС‚СЂРѕРє (DENY BY DEFAULT), Р° РЅРµ В«РІСЃРµ СЃС‚СЂРѕРєРёВ» вЂ” С‚Р°Рє Рё Р·Р°РґСѓРјР°РЅРѕ.

## Р РѕР»Рё Р‘Р” (СЃРѕР·РґР°СЋС‚СЃСЏ РјРёРіСЂР°С†РёРµР№ RLS)
- `app_login` вЂ” РѕР±С‹С‡РЅР°СЏ СЂРѕР»СЊ РїСЂРёР»РѕР¶РµРЅРёСЏ, РїРѕРґС‡РёРЅСЏРµС‚СЃСЏ RLS. РР· РїРѕРґ РЅРµС‘ СЂР°Р±РѕС‚Р°РµС‚ РІРµСЃСЊ РѕР±С‹С‡РЅС‹Р№
  С‚СЂР°С„РёРє (С‡РµСЂРµР· PgBouncer, transaction pooling).
- `app_superadmin` вЂ” `BYPASSRLS`, С‚РѕР»СЊРєРѕ РґР»СЏ СЏРІРЅРѕ РїРѕРјРµС‡РµРЅРЅС‹С… РєСЂРѕСЃСЃ-С‚РµРЅР°РЅС‚РЅС‹С… Р°РґРјРёРЅ-РїСѓС‚РµР№.
  РћР±СЂР°С‰Р°С‚СЊСЃСЏ СЃ С‚РѕР№ Р¶Рµ РѕСЃС‚РѕСЂРѕР¶РЅРѕСЃС‚СЊСЋ, С‡С‚Рѕ Рё СЃ СЃСѓРїРµСЂРїРѕР»СЊР·РѕРІР°С‚РµР»РµРј Р‘Р”.

вљ пёЏ РџР°СЂРѕР»Рё СЂРѕР»РµР№ РІ РјРёРіСЂР°С†РёРё вЂ” РїР»РµР№СЃС…РѕР»РґРµСЂС‹ (`CHANGE_ME_IN_DEPLOY`), Р·Р°РјРµРЅСЏСЋС‚СЃСЏ СЃРµРєСЂРµС‚Р°РјРё
РґРµРїР»РѕСЏ, РЅРµ С…СЂР°РЅРёС‚СЊ СЂРµР°Р»СЊРЅС‹Рµ РїР°СЂРѕР»Рё РІ СЂРµРїРѕР·РёС‚РѕСЂРёРё.

## РљРѕРјР°РЅРґС‹
```bash
npm install
npx prisma generate        # СЃРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ РєР»РёРµРЅС‚
npx prisma migrate deploy  # РїСЂРёРјРµРЅРёС‚СЊ РјРёРіСЂР°С†РёРё (РїСЂРѕРґ/staging)
npx prisma migrate dev     # РїСЂРёРјРµРЅРёС‚СЊ + СЃРѕР·РґР°С‚СЊ РЅРѕРІСѓСЋ РјРёРіСЂР°С†РёСЋ (С‚РѕР»СЊРєРѕ Р»РѕРєР°Р»СЊРЅРѕ, dev-Р‘Р”)
```

`migrate dev` **РЅРµ РґРѕР»Р¶РµРЅ** С‚СЂРѕРіР°С‚СЊ RLS-РјРёРіСЂР°С†РёСЋ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё вЂ” РѕРЅР° raw SQL, Prisma РЅРµ СѓРјРµРµС‚
РґРёС„С„Р°С‚СЊ РїРѕР»РёС‚РёРєРё. РќРѕРІС‹Рµ РјРѕРґРµР»Рё в†’ `prisma migrate dev --create-only`, Р·Р°С‚РµРј РІСЂСѓС‡РЅСѓСЋ РґРѕР±Р°РІРёС‚СЊ
`ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY` + `CREATE POLICY` РґР»СЏ РЅРѕРІС‹С… tenant-С‚Р°Р±Р»РёС† РІ
С‚РѕР№ Р¶Рµ РёР»Рё РЅРѕРІРѕР№ РјРёРіСЂР°С†РёРё.

## РќРµ РїРѕРєСЂС‹С‚Рѕ РІ СЌС‚РѕР№ СЃС…РµРјРµ (РѕСЃРѕР·РЅР°РЅРЅРѕ)
- **РўРёСЂ 2** (Р»РµРіРёС‚РёРјРЅС‹Рµ РіРѕР»РѕСЃРѕРІР°РЅРёСЏ `Meeting`, РіРѕСЃРІРµСЂРёС„РёРєР°С†РёСЏ) вЂ” Р·Р°РіРѕС‚РѕРІРєР° РјРёРЅРёРјР°Р»СЊРЅР°.
  Р РµР°Р»РёР·Р°С†РёСЏ flow вЂ” Р¤Р°Р·Р° 3, Р·Р°РІРёСЃРёС‚ РѕС‚ ADR-0007 (РїР°СЂС‚РЅС‘СЂСЃС‚РІРѕ СЃ Р°РєРєСЂРµРґРёС‚РѕРІР°РЅРЅС‹Рј РѕРїРµСЂР°С‚РѕСЂРѕРј).
- РҐРµС€Рё СЃРµСЃСЃРёР№, OTP-РєРѕРґС‹ Рё С‚.Рї. вЂ” Р»РѕРіРёРєР° РїСЂРёР»РѕР¶РµРЅРёСЏ (ADR-0005), РЅРµ С‡Р°СЃС‚СЊ СЃС…РµРјС‹ РґР°РЅРЅС‹С….



---
FILE: D:\fixlypwa\web\prisma\schema.prisma
---
// Р•РґРёРЅС‹Р№ РёСЃС‚РѕС‡РЅРёРє РјРѕРґРµР»Рё РґР°РЅРЅС‹С… РїСЂРѕРµРєС‚Р° (CLAUDE.md).
// Р”РѕРјРµРЅ РѕРїРёСЃР°РЅ РЅР° СЏР·С‹РєРµ РїСЂРµРґРјРµС‚РЅРѕР№ РѕР±Р»Р°СЃС‚Рё РІ docs/specs/domain-model.md вЂ” СЌС‚РѕС‚ С„Р°Р№Р» РµРіРѕ
// С‚РµС…РЅРёС‡РµСЃРєР°СЏ СЂРµР°Р»РёР·Р°С†РёСЏ. РњСѓР»СЊС‚РёС‚РµРЅР°РЅС‚РЅРѕСЃС‚СЊ вЂ” Postgres RLS РїРѕ osiId (ADR-0006, РїР°С‚С‚РµСЂРЅ
// РїРѕРґС‚РІРµСЂР¶РґС‘РЅ СЃРїР°Р№РєРѕРј spikes/rls-prisma/). RLS-РїРѕР»РёС‚РёРєРё РґРѕР±Р°РІР»СЏСЋС‚СЃСЏ raw-SQL РїРѕРІРµСЂС… РјРёРіСЂР°С†РёРё,
// СЃРіРµРЅРµСЂРёСЂРѕРІР°РЅРЅРѕР№ РёР· СЌС‚РѕР№ СЃС…РµРјС‹ (СЃРј. prisma/migrations/.../migration.sql).
//
// РўРёСЂ 1 (Р¤Р°Р·С‹ 1вЂ“2, features.md) вЂ” С‚Рѕ, С‡С‚Рѕ РІ СЌС‚РѕР№ СЃС…РµРјРµ. РўРёСЂ 2 (Р»РµРіРёС‚РёРјРЅС‹Рµ РіРѕР»РѕСЃРѕРІР°РЅРёСЏ Meeting,
// РіРѕСЃРІРµСЂРёС„РёРєР°С†РёСЏ) вЂ” Р·Р°РіРѕС‚РѕРІРєРё РјРёРЅРёРјР°Р»СЊРЅС‹, СЂРµР°Р»РёР·Р°С†РёСЏ Р·Р° ADR-0007 (РїР°СЂС‚РЅС‘СЂСЃС‚РІРѕ).

generator client {
  provider      = "prisma-client-js"
  // native вЂ” РґР»СЏ Р»РѕРєР°Р»СЊРЅРѕР№ СЂР°Р·СЂР°Р±РѕС‚РєРё; debian вЂ” РґР»СЏ Docker-РѕР±СЂР°Р·Р° (node:bookworm-slim).
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider  = "postgresql"
  // url вЂ” СЂР°РЅС‚Р°Р№Рј-РїРѕРґРєР»СЋС‡РµРЅРёРµ РїСЂРёР»РѕР¶РµРЅРёСЏ С‡РµСЂРµР· PgBouncer (transaction pooling, app_login).
  // directUrl вЂ” РїСЂСЏРјРѕРµ РїРѕРґРєР»СЋС‡РµРЅРёРµ СЃСѓРїРµСЂРїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РґР»СЏ РјРёРіСЂР°С†РёР№/РёРЅС‚СЂРѕСЃРїРµРєС†РёРё (РІ РѕР±С…РѕРґ
  // PgBouncer): prisma migrate С‚СЂРµР±СѓРµС‚ РЅРµ-pooled СЃРѕРµРґРёРЅРµРЅРёСЏ (ADR-0006, СЃРїР°Р№Рє). Р•СЃР»Рё DIRECT_URL
  // РЅРµ Р·Р°РґР°РЅ, Prisma РёСЃРїРѕР»СЊР·СѓРµС‚ url.
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// =====================================================================================
// IDENTITY вЂ” РІРЅРµ RLS (bootstrapping, ADR-0006 СЂРµРІРёР·РёСЏ): СЃРµСЃСЃРёСЏ в†’ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ в†’ РµРіРѕ Osi
// РѕС‚СЂР°Р±Р°С‚С‹РІР°РµС‚ Р”Рћ С‚РѕРіРѕ, РєР°Рє РёР·РІРµСЃС‚РµРЅ osi_id, РїРѕСЌС‚РѕРјСѓ СЌС‚Рё С‚Р°Р±Р»РёС†С‹ РЅРµ РјРѕРіСѓС‚ Р±С‹С‚СЊ РїРѕРґ RLS.
// =====================================================================================

/// РћР±СЉРµРґРёРЅРµРЅРёРµ СЃРѕР±СЃС‚РІРµРЅРЅРёРєРѕРІ РёРјСѓС‰РµСЃС‚РІР° вЂ” РµРґРёРЅРёС†Р° С‚РµРЅР°РЅС‚Р° (Q-005). РЎР°РјР° Osi С‚РѕР¶Рµ РІРЅРµ RLS:
/// РґРѕСЃС‚СѓРї Рє СЃС‚СЂРѕРєР°Рј Osi РєРѕРЅС‚СЂРѕР»РёСЂСѓРµС‚СЃСЏ С‡РµСЂРµР· UserOsiRole (РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІРёРґРёС‚ С‚РѕР»СЊРєРѕ СЃРІРѕРё Osi
/// РЅР° СѓСЂРѕРІРЅРµ РїСЂРёР»РѕР¶РµРЅРёСЏ/API), Р° РЅРµ С‡РµСЂРµР· RLS-РїРѕР»РёС‚РёРєСѓ РЅР° osi_id (СЌС‚Рѕ Р¶Рµ РєР»СЋС‡ С‚РµРЅР°РЅС‚Р°).
model Osi {
  id           String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String
  bin          String?   @unique @db.VarChar(12) // Р‘РРќ вЂ” [TBD] С‚РѕС‡РЅС‹Р№ С„РѕСЂРјР°С‚
  address      String?
  registeredAt DateTime? @map("registered_at")
  createdAt    DateTime  @default(now()) @map("created_at")

  roles        UserOsiRole[]
  buildings    Building[]
  joinRequests OsiJoinRequest[] // Р·Р°СЏРІРєРё РЅР° РїРѕРґРєР»СЋС‡РµРЅРёРµ Рє РћРЎР (REQ-151)

  @@map("osi")
}

enum JoinRequestStatus {
  PENDING
  RESOLVED
}

/// Р—Р°СЏРІРєР° Р¶РёС‚РµР»СЏ РЅР° РїРѕРґРєР»СЋС‡РµРЅРёРµ Рє РћРЎР (REQ-151..154, docs/specs/osi-join-request.md) вЂ”
/// identity-С‚Р°Р±Р»РёС†Р°, Р’РќР• RLS: СЃРѕР·РґР°С‘С‚СЃСЏ Р”Рћ С‚РѕРіРѕ, РєР°Рє Сѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РµСЃС‚СЊ СЂРѕР»СЊ/osiId-РєРѕРЅС‚РµРєСЃС‚
/// РІ СЌС‚РѕР№ РћРЎР (С‚РѕС‚ Р¶Рµ РїСЂРёРЅС†РёРї, С‡С‚Рѕ TelegramLink/UserOsiRole). РџСЂРµРґСЃРµРґР°С‚РµР»СЊ С‡РёС‚Р°РµС‚ РµС‘ РІСЂСѓС‡РЅСѓСЋ
/// С„РёР»СЊС‚СЂСѓСЏ РїРѕ СЃРІРѕРµР№ osiId (РїР°С‚С‚РµСЂРЅ chairmenOfOsi() РІ notifications/service.ts) вЂ” РїСЂРёРІСЏР·РєСѓ
/// Рє РєРІР°СЂС‚РёСЂРµ Р·Р°СЏРІРєР° РќР• РґРµР»Р°РµС‚ СЃР°РјР°, С‚РѕР»СЊРєРѕ СѓРІРµРґРѕРјР»СЏРµС‚; РїСЂРµРґСЃРµРґР°С‚РµР»СЊ РїРѕ-РїСЂРµР¶РЅРµРјСѓ РїРѕРґРєР»СЋС‡Р°РµС‚
/// С‡РµСЂРµР· AddResidentForm (РїРѕРёСЃРє РїРѕ С‚РµР»РµС„РѕРЅСѓ/email, REQ-013).
model OsiJoinRequest {
  id         String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId      String            @map("osi_id") @db.Uuid
  userId     String            @map("user_id") @db.Uuid
  /// РЎРІРѕР±РѕРґРЅС‹Р№ С‚РµРєСЃС‚ Р¶РёС‚РµР»СЏ (РґРѕРј/РєРІР°СЂС‚РёСЂР°/РїРѕРґСЉРµР·Рґ) вЂ” РЅРµ Apartment: РїСЂРµРґСЃРµРґР°С‚РµР»СЊ РІРµСЂРёС„РёС†РёСЂСѓРµС‚
  /// Рё РїСЂРёРІСЏР·С‹РІР°РµС‚ Рє СЂРµР°Р»СЊРЅРѕР№ РєРІР°СЂС‚РёСЂРµ СЃР°Рј, Р·Р°СЏРІРєР° вЂ” С‚РѕР»СЊРєРѕ РєРѕРЅС‚РµРєСЃС‚ РґР»СЏ РЅРµРіРѕ.
  note       String?
  status     JoinRequestStatus @default(PENDING)
  createdAt  DateTime          @default(now()) @map("created_at")
  resolvedAt DateTime?         @map("resolved_at")

  osi  Osi  @relation(fields: [osiId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, osiId])
  @@index([osiId, status])
  @@map("osi_join_request")
}

model User {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  phone        String   @unique
  email        String?  @unique
  passwordHash String?  @map("password_hash")
  isSuperadmin Boolean  @default(false) @map("is_superadmin")
  createdAt    DateTime @default(now()) @map("created_at")

  sessions               Session[]
  roles                  UserOsiRole[]
  occupant               Occupant?
  pushSubscriptions      PushSubscription[]
  notifications          Notification[]
  master                 Master?
  votes                  Vote[]
  OsiJoinRequest         OsiJoinRequest[]
  FcmToken               FcmToken[]
  AssistantConversation  AssistantConversation[]
  NotificationPreference NotificationPreference[]
  reviews                MasterReview[]

  @@map("users")
}

/// Web Push РїРѕРґРїРёСЃРєР° СѓСЃС‚СЂРѕР№СЃС‚РІР° (СЃСЂРµР· 7, REQ-102). Identity-С‚Р°Р±Р»РёС†Р° вЂ” Р’РќР• RLS: РїРѕРґРїРёСЃРєР°
/// РїСЂРёРЅР°РґР»РµР¶РёС‚ СѓСЃС‚СЂРѕР№СЃС‚РІСѓ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ, РЅРµ РћРЎР. РњС‘СЂС‚РІС‹Рµ РїРѕРґРїРёСЃРєРё (404/410) СѓРґР°Р»СЏСЋС‚СЃСЏ
/// РїСЂРёР»РѕР¶РµРЅРёРµРј (REQ-103). РљР»СЋС‡Рё p256dh/auth вЂ” РїР°СЂР°РјРµС‚СЂС‹ С€РёС„СЂРѕРІР°РЅРёСЏ payload РїРѕ СЃС‚Р°РЅРґР°СЂС‚Сѓ Web Push.
model PushSubscription {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  endpoint  String   @unique
  p256dh    String
  auth      String
  userAgent String?  @map("user_agent")
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("push_subscription")
}

/// FCM-С‚РѕРєРµРЅ РЅР°С‚РёРІРЅРѕРіРѕ РєР»РёРµРЅС‚Р° (ADR-0012 В§5, REQ-127) вЂ” РїР°СЂР°Р»Р»РµР»СЊРЅС‹Р№ push-РєР°РЅР°Р»: PushSubscription
/// = Web Push/VAPID (СЃР°Р№С‚), FcmToken = Firebase Cloud Messaging (Flutter). Р Р°Р·РЅС‹Рµ РїСЂРѕС‚РѕРєРѕР»С‹,
/// СЂР°Р·РЅС‹Рµ С‚Р°Р±Р»РёС†С‹. Identity вЂ” Р’РќР• RLS, РєР°Рє PushSubscription (СѓСЃС‚СЂРѕР№СЃС‚РІРѕ, РЅРµ С‚РµРЅР°РЅС‚). РњС‘СЂС‚РІС‹Рµ
/// С‚РѕРєРµРЅС‹ (UNREGISTERED/INVALID_ARGUMENT РѕС‚ Firebase) СѓРґР°Р»СЏСЋС‚СЃСЏ РїСЂРёР»РѕР¶РµРЅРёРµРј (REQ-130).
model FcmToken {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("fcm_token")
}

/// РљР°РЅР°Р» РґРѕСЃС‚Р°РІРєРё РѕРґРЅРѕСЂР°Р·РѕРІРѕРіРѕ РєРѕРґР° (auth-email.md, REQ-005/006): СЃР»РµРґСѓРµС‚ РёР· С‚РёРїР°
/// РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂР° (email в†’ EMAIL, С‚РµР»РµС„РѕРЅ в†’ SMS РёР»Рё TELEGRAM). TELEGRAM вЂ” REQ-009,
/// РІСЂРµРјРµРЅРЅР°СЏ Р·Р°РјРµРЅР° SMS-С€Р»СЋР·Р° (PHONE_OTP_CHANNEL=telegram), РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РєР°РЅР°Р» РЅРµ РІС‹Р±РёСЂР°РµС‚ вЂ”
/// РѕРЅ РѕРїСЂРµРґРµР»СЏРµС‚СЃСЏ С‚РёРїРѕРј РёРґРµРЅС‚РёС„РёРєР°С‚РѕСЂР° Рё РєРѕРЅС„РёРіСѓСЂР°С†РёРµР№ СЃРµСЂРІРµСЂР°.
enum OtpChannel {
  SMS
  EMAIL
  TELEGRAM
}

/// РџСЂРёРІСЏР·РєР° С‚РµР»РµС„РѕРЅР° Рє С‡Р°С‚Сѓ Telegram-Р±РѕС‚Р° (REQ-009, telegram-otp.md) вЂ” identity, Р’РќР• RLS
/// (РЅСѓР¶РЅР° Р”Рћ С‚РѕРіРѕ, РєР°Рє РёР·РІРµСЃС‚РµРЅ osi_id/User). РџСЂРёРІСЏР·РєР° РїСЂРѕРёСЃС…РѕРґРёС‚ РўРћР›Р¬РљРћ С‡РµСЂРµР· РєРЅРѕРїРєСѓ
/// В«РџРѕРґРµР»РёС‚СЊСЃСЏ РЅРѕРјРµСЂРѕРјВ» Р±РѕС‚Р° (Bot API request_contact вЂ” С„РёР·РёС‡РµСЃРєРё РЅРµ РјРѕР¶РµС‚ РїРµСЂРµРґР°С‚СЊ С‡СѓР¶РѕР№
/// РЅРѕРјРµСЂ), РїРѕСЌС‚РѕРјСѓ Р·РґРµСЃСЊ РЅРµС‚ РїРѕРґРїРёСЃР°РЅРЅРѕРіРѕ С‚РѕРєРµРЅР°/nonce вЂ” СЃР°РјР° РїСЂРёСЂРѕРґР° Р·Р°РїРёСЃРё СѓР¶Рµ РґРѕРєР°Р·С‹РІР°РµС‚
/// РІР»Р°РґРµРЅРёРµ С‚РµР»РµС„РѕРЅРѕРј РЅР° РјРѕРјРµРЅС‚ СЃРѕР·РґР°РЅРёСЏ.
model TelegramLink {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  phone     String   @unique
  chatId    String   @map("chat_id")
  createdAt DateTime @default(now()) @map("created_at")

  @@map("telegram_link")
}

/// Р§РµР»Р»РµРЅРґР¶ OTP-РІС…РѕРґР° (ADR-0005 + СЂРµРІРёР·РёСЏ 2026-07-15, REQ-005/006/091, NFR-054).
/// Identity-С‚Р°Р±Р»РёС†Р° вЂ” Р’РќР• RLS (РЅСѓР¶РЅР° Р”Рћ С‚РѕРіРѕ, РєР°Рє РёР·РІРµСЃС‚РµРЅ osi_id). identifier вЂ”
/// РЅРѕСЂРјР°Р»РёР·РѕРІР°РЅРЅС‹Р№ С‚РµР»РµС„РѕРЅ РёР»Рё email РІ lowercase. РҐСЂР°РЅРёС‚ С…РµС€ РєРѕРґР° (РЅРµ СЃР°Рј РєРѕРґ), TTL Рё
/// СЃС‡С‘С‚С‡РёРє РїРѕРїС‹С‚РѕРє; requestIp вЂ” РґР»СЏ rate-limit РїРѕ IP. РЎР»СѓР¶РёС‚ Рё rate-limit-Р¶СѓСЂРЅР°Р»РѕРј: СЃРІРµР¶РёРµ
/// Р·Р°РїРёСЃРё РїРѕ identifier/ip РІ РѕРєРЅРµ РѕРіСЂР°РЅРёС‡РёРІР°СЋС‚ С‡Р°СЃС‚РѕС‚Сѓ Р·Р°РїСЂРѕСЃРѕРІ (SMS РїР»Р°С‚РЅС‹Рµ вЂ” Р·Р°С‰РёС‚Р° РѕС‚
/// SMS-pumping; РґР»СЏ email вЂ” Р·Р°С‰РёС‚Р° РѕС‚ СЃРїР°РјР° СЃ РЅР°С€РµРіРѕ РґРѕРјРµРЅР°).
model OtpChallenge {
  id         String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  identifier String
  channel    OtpChannel @default(SMS)
  codeHash   String     @map("code_hash") // sha256(identifier:code) вЂ” РєРѕРґ РІ РѕС‚РєСЂС‹С‚РѕРј РІРёРґРµ РЅРµ С…СЂР°РЅРёС‚СЃСЏ
  requestIp  String?    @map("request_ip")
  attempts   Int        @default(0) // РїРѕРїС‹С‚РєРё РІРІРѕРґР° РєРѕРґР° вЂ” РїСЂРё РїСЂРµРІС‹С€РµРЅРёРё С‡РµР»Р»РµРЅРґР¶ СЃРіРѕСЂР°РµС‚
  consumedAt DateTime?  @map("consumed_at") // СѓСЃРїРµС€РЅРѕ РёСЃРїРѕР»СЊР·РѕРІР°РЅ вЂ” РѕРґРЅРѕСЂР°Р·РѕРІРѕСЃС‚СЊ
  expiresAt  DateTime   @map("expires_at")
  createdAt  DateTime   @default(now()) @map("created_at")

  @@index([identifier])
  @@index([createdAt])
  @@map("otp_challenge")
}

/// РЎР°РјРѕРїРёСЃРЅС‹Рµ СЃРµСЃСЃРёРё РїРѕ РїР°С‚С‚РµСЂРЅСѓ Lucia (ADR-0005, СЂРµРІРёР·РёСЏ вЂ” РїР°РєРµС‚ `lucia` РЅРµ РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ).
/// id вЂ” hash С‚РѕРєРµРЅР° (РЅРµ С…СЂР°РЅРёС‚СЊ С‚РѕРєРµРЅ РІ РѕС‚РєСЂС‹С‚РѕРј РІРёРґРµ). activeOsiId вЂ” С‚РµРєСѓС‰РёР№ СЂР°Р±РѕС‡РёР№
/// РєРѕРЅС‚РµРєСЃС‚ РїСЂРµРґСЃРµРґР°С‚РµР»СЏ (user-roles.md В§3): РєР°РєР°СЏ Osi Р°РєС‚РёРІРЅР°, РѕРїСЂРµРґРµР»СЏРµС‚ RLS-РєРѕРЅС‚РµРєСЃС‚
/// Р·Р°РїСЂРѕСЃР° С‡РµСЂРµР· forTenant(activeOsiId, ...).
model Session {
  id          String   @id // sha256-hash С‚РѕРєРµРЅР° СЃРµСЃСЃРёРё
  userId      String   @map("user_id") @db.Uuid
  activeOsiId String?  @map("active_osi_id") @db.Uuid
  expiresAt   DateTime @map("expires_at")
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

enum Role {
  SUPERADMIN
  CHAIRMAN
  RESIDENT
  // ACCOUNTANT вЂ” РІРЅРµ MVP (Q-016 Р·Р°РєСЂС‹С‚), Р·Р°СЂРµР·РµСЂРІРёСЂРѕРІР°РЅРѕ РІ РјРѕРґРµР»Рё РїСЂР°РІ, РЅРµ РєР°Рє РѕС‚РґРµР»СЊРЅР°СЏ СЂРѕР»СЊ Р·РґРµСЃСЊ
}

/// User в†” Osi РјРЅРѕРіРёРµ-РєРѕ-РјРЅРѕРіРёРј (Q-011): РїСЂРµРґСЃРµРґР°С‚РµР»СЊ РјРѕР¶РµС‚ СЃРѕСЃС‚РѕСЏС‚СЊ РІ РЅРµСЃРєРѕР»СЊРєРёС… Osi.
model UserOsiRole {
  userId String @map("user_id") @db.Uuid
  osiId  String @map("osi_id") @db.Uuid
  role   Role

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  osi  Osi  @relation(fields: [osiId], references: [id], onDelete: Cascade)

  @@id([userId, osiId])
  @@map("user_osi_role")
}

enum MasterStatus {
  PENDING // Р°РЅРєРµС‚Р° РїРѕРґР°РЅР°, Р¶РґС‘С‚ СЂСѓС‡РЅРѕРіРѕ РѕРґРѕР±СЂРµРЅРёСЏ (Q-053, РґРѕ РїРѕСЏРІР»РµРЅРёСЏ Р°РґРјРёРЅРєРё)
  APPROVED // РІРёРґРёС‚ РІРёС‚СЂРёРЅСѓ Р·Р°РєР°Р·РѕРІ СЃРІРѕРµРіРѕ РіРѕСЂРѕРґР°
  REJECTED
  BLOCKED
}

/// РњР°СЃС‚РµСЂ РјР°СЂРєРµС‚РїР»РµР№СЃР° Р·Р°СЏРІРѕРє (ADR-0009, docs/specs/marketplace.md) вЂ” identity-С‚Р°Р±Р»РёС†Р°,
/// Р’РќР• RLS: РјР°СЃС‚РµСЂ РЅРµ СѓС‡Р°СЃС‚РЅРёРє РЅРё РѕРґРЅРѕР№ РћРЎР, Сѓ РЅРµРіРѕ РЅРµС‚ osiId/tenant-РєРѕРЅС‚РµРєСЃС‚Р°. Р”РѕСЃС‚СѓРї Рє
/// РІРёС‚СЂРёРЅРµ РґР°С‘С‚ РћРўР”Р•Р›Р¬РќР«Р™ РєРѕРЅС‚РµРєСЃС‚ forMaster() (city), РЅРµ forTenant(). РћРґРёРЅ User вЂ” РјР°РєСЃРёРјСѓРј
/// РѕРґРёРЅ Master (1:1): СЂРѕР»СЊ "РјР°СЃС‚РµСЂ" РЅРµ РїРµСЂРµСЃРµРєР°РµС‚СЃСЏ СЃ СЂРѕР»СЏРјРё UserOsiRole.
model Master {
  id           String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId       String            @unique @map("user_id") @db.Uuid
  fullName     String            @map("full_name")
  city         String
  categories   RequestCategory[]
  bio          String?
  status       MasterStatus      @default(PENDING)
  /// РљСЌС€РёСЂРѕРІР°РЅРЅС‹Р№ СЃСЂРµРґРЅРёР№ СЂРµР№С‚РёРЅРі (РїРµСЂРµСЃС‡РёС‚С‹РІР°РµС‚СЃСЏ РїСЂРё РґРѕР±Р°РІР»РµРЅРёРё РѕС‚Р·С‹РІР°)
  rating       Float             @default(0.0)
  /// РљРѕР»-РІРѕ РѕС‚Р·С‹РІРѕРІ (РґРµРЅРѕСЂРјР°Р»РёР·Р°С†РёСЏ РґР»СЏ Р±С‹СЃС‚СЂРѕРіРѕ РѕС‚РѕР±СЂР°Р¶РµРЅРёСЏ)
  reviewsCount Int               @default(0) @map("reviews_count")
  createdAt    DateTime          @default(now()) @map("created_at")

  user         User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  offers       MarketOffer[]
  portfolio    MasterPortfolioItem[]
  reviews      MasterReview[]
  assignedReqs Request[]             @relation("RequestMaster")

  @@index([city, status])
  @@map("master")
}

/// РџРѕСЂС‚С„РѕР»РёРѕ РІС‹РїРѕР»РЅРµРЅРЅС‹С… СЂР°Р±РѕС‚ РјР°СЃС‚РµСЂР° (docs/specs/masters-map.md, REQ-073)
/// Identity-СЃР»РѕР№ (РІРЅРµ RLS), С‚Р°Рє РєР°Рє РјР°СЃС‚РµСЂ РЅРµ РїСЂРёРІСЏР·Р°РЅ Рє РћРЎР.
model MasterPortfolioItem {
  id          String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  masterId    String          @map("master_id") @db.Uuid
  title       String
  description String?
  category    RequestCategory
  photoUrls   String[]        @map("photo_urls")
  createdAt   DateTime        @default(now()) @map("created_at")

  master Master @relation(fields: [masterId], references: [id], onDelete: Cascade)

  @@index([masterId])
  @@map("master_portfolio_item")
}

/// РћС‚Р·С‹РІ Рѕ СЂР°Р±РѕС‚Рµ РјР°СЃС‚РµСЂР° РјР°СЂРєРµС‚РїР»РµР№СЃР°. Identity-СЃР»РѕР№ (РІРЅРµ RLS).
model MasterReview {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  masterId     String   @map("master_id") @db.Uuid
  authorUserId String   @map("author_user_id") @db.Uuid
  requestId    String?  @map("request_id") @db.Uuid
  rating       Int
  comment      String?
  photoUrls    String[] @default([]) @map("photo_urls")
  createdAt    DateTime @default(now()) @map("created_at")

  master  Master   @relation(fields: [masterId], references: [id], onDelete: Cascade)
  author  User     @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  request Request? @relation(fields: [requestId], references: [id], onDelete: SetNull)

  @@index([masterId])
  @@index([authorUserId])
  @@map("master_review")
}

// =====================================================================================
// TENANT вЂ” РїРѕРґ RLS. РљР°Р¶РґР°СЏ РјРѕРґРµР»СЊ РЅРµСЃС‘С‚ osiId (ADR-0006). Р”РѕСЃС‚СѓРї С‚РѕР»СЊРєРѕ С‡РµСЂРµР· forTenant().
// =====================================================================================

model Building {
  id              String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId           String @map("osi_id") @db.Uuid
  address         String
  /// РЎС‚СЂСѓРєС‚СѓСЂРёСЂРѕРІР°РЅРЅС‹Р№ РіРѕСЂРѕРґ (ADR-0009: РјР°СЂРєРµС‚РїР»РµР№СЃ РјР°СЃС‚РµСЂРѕРІ РјР°С‚С‡РёС‚ РїРѕ РіРѕСЂРѕРґСѓ, РЅРµ РїРѕ
  /// СЃРІРѕР±РѕРґРЅРѕРјСѓ Р°РґСЂРµСЃСѓ). Р”РµС„РѕР»С‚ вЂ” Р±СЌРєС„РёР»Р» СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёС… РґРѕРјРѕРІ, РјРµРЅСЏС‚СЊ РїРѕ РјРµСЂРµ СЂРѕСЃС‚Р° Р·Р° РљРѕРєС€РµС‚Р°Сѓ.
  city            String @default("РљРѕРєС€РµС‚Р°Сѓ")
  apartmentsCount Int?   @map("apartments_count")
  builtYear       Int?   @map("built_year") // [TBD]

  // Osi РІРЅРµ RLS (identity) вЂ” СЌС‚Р° СЃРІСЏР·СЊ РЅРµ СѓС‡Р°СЃС‚РІСѓРµС‚ РІ forTenant()-РїР°С‚С‚РµСЂРЅРµ, С‚РѕР»СЊРєРѕ РґР»СЏ С‡С‚РµРЅРёСЏ
  // СЃРІСЏР·Р°РЅРЅС‹С… РґР°РЅРЅС‹С… РїСЂРёР»РѕР¶РµРЅРёРµРј (РЅР°РїСЂ. РѕС‚РѕР±СЂР°Р¶РµРЅРёРµ РЅР°Р·РІР°РЅРёСЏ РћРЎР СЂСЏРґРѕРј СЃ РґРѕРјРѕРј).
  osi           Osi            @relation(fields: [osiId], references: [id])
  apartments    Apartment[]
  tariffs       Tariff[]
  reports       Report[]
  subscription  Subscription?
  bankAccounts  BankAccount[]
  expenses      Expense[]
  announcements Announcement[]
  requests      Request[]
  infoItems     InfoItem[]
  polls         Poll[]
  meetings      Meeting[]
  documents     Document[]

  @@index([osiId])
  @@map("building")
}

// РўРёРї РїРѕРјРµС‰РµРЅРёСЏ (REQ-011 СЂРµРІРёР·РёСЏ 2026-07-18, Q-063, excel-import.md В§5) вЂ” РґР»СЏ Р±СѓРґСѓС‰РµР№
// СЃРІРµСЂРєРё СЃ IncomeCategory (РєРІР°СЂС‚РёСЂС‹/РЅРµР¶РёР»С‹Рµ vs РїР°СЂРєРѕРІРєРё/РєР»Р°РґРѕРІРєРё, report-spec.md В§2Р°).
// РћРїС†РёРѕРЅР°Р»СЊРЅРѕ: СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёРµ РїРѕРјРµС‰РµРЅРёСЏ Р±РµР· СѓРєР°Р·Р°РЅРёСЏ С‚РёРїР° РѕСЃС‚Р°СЋС‚СЃСЏ NULL, РѕР±СЂР°С‚РЅРѕР№ СЃРёР»С‹ РЅРµС‚.
enum ApartmentType {
  RESIDENTIAL
  NON_RESIDENTIAL
  PARKING
  STORAGE
}

/// Р•РґРёРЅРёС†Р° СЃРѕР±СЃС‚РІРµРЅРЅРѕСЃС‚Рё РІ РґРѕРјРµ (REQ-011).
model Apartment {
  id         String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId      String         @map("osi_id") @db.Uuid
  buildingId String         @map("building_id") @db.Uuid
  number     String
  area       Decimal?       @db.Decimal(8, 2) // РјВІ
  type       ApartmentType?

  building  Building   @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  account   Account?
  owners    Owner[]
  occupants Occupant[]
  requests  Request[]

  @@index([osiId])
  @@index([buildingId])
  @@map("apartment")
}

/// Р›РёС†РµРІРѕР№ СЃС‡С‘С‚ вЂ” СѓС‡С‘С‚РЅР°СЏ РµРґРёРЅРёС†Р° РЅР°С‡РёСЃР»РµРЅРёР№ (Q-006: 1 РєРІР°СЂС‚РёСЂР° = 1 Account).
model Account {
  id            String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId         String  @map("osi_id") @db.Uuid
  apartmentId   String  @unique @map("apartment_id") @db.Uuid
  accountNumber String? @map("account_number")

  apartment Apartment @relation(fields: [apartmentId], references: [id], onDelete: Cascade)
  charges   Charge[]
  payments  Payment[]

  @@index([osiId])
  @@map("account")
}

/// РЎРѕР±СЃС‚РІРµРЅРЅРёРє вЂ” СЋСЂРёРґРёС‡РµСЃРєРѕРµ РІР»Р°РґРµРЅРёРµ (Q-007), РјРѕР¶РµС‚ РѕС‚Р»РёС‡Р°С‚СЊСЃСЏ РѕС‚ Occupant.
/// userId РѕРїС†РёРѕРЅР°Р»РµРЅ: РЅРµ Сѓ РєР°Р¶РґРѕРіРѕ Owner РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ РµСЃС‚СЊ Р»РѕРіРёРЅ.
model Owner {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId          String   @map("osi_id") @db.Uuid
  apartmentId    String   @map("apartment_id") @db.Uuid
  userId         String?  @map("user_id") @db.Uuid
  fullName       String   @map("full_name")
  phone          String?
  iin            String? // РџР”РЅ вЂ” NFR-051, С…СЂР°РЅРёС‚СЊ С‚РѕР»СЊРєРѕ РЅР° РёРЅС„СЂР°СЃС‚СЂСѓРєС‚СѓСЂРµ РІ Р Рљ
  ownershipShare Decimal? @map("ownership_share") @db.Decimal(5, 4) // РґРѕР»СЏ РІР»Р°РґРµРЅРёСЏ, [TBD]

  apartment Apartment @relation(fields: [apartmentId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([apartmentId])
  @@map("owner")
}

/// РџСЂРѕР¶РёРІР°СЋС‰РёР№ вЂ” С„Р°РєС‚РёС‡РµСЃРєРёР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РєР°Р±РёРЅРµС‚Р° (Q-007). userId РѕР±СЏР·Р°С‚РµР»РµРЅ (СЌС‚Рѕ Рё РµСЃС‚СЊ
/// РѕСЃРЅРѕРІРЅРѕР№ РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РєР°Р±РёРЅРµС‚Р° Р¶РёС‚РµР»СЏ, REQ-052). РњРѕР¶РµС‚ РЅРµ СЃРѕРІРїР°РґР°С‚СЊ СЃ Owner вЂ”
/// РІРёРґРёС‚ РґР°РЅРЅС‹Рµ Account/Apartment С†РµР»РёРєРѕРј (Q-033 Р·Р°РєСЂС‹С‚, domain-model.md).
/// phone РѕРїС†РёРѕРЅР°Р»РµРЅ СЃ СЂРµРІРёР·РёРё REQ-013 (auth-email.md В§4): Р¶РёС‚РµР»СЏ РјРѕР¶РЅРѕ РїСЂРёРіР»Р°СЃРёС‚СЊ РїРѕ email.
model Occupant {
  id          String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId       String  @map("osi_id") @db.Uuid
  apartmentId String  @map("apartment_id") @db.Uuid
  userId      String  @unique @map("user_id") @db.Uuid
  fullName    String  @map("full_name")
  phone       String?

  apartment Apartment @relation(fields: [apartmentId], references: [id], onDelete: Cascade)
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([apartmentId])
  @@map("occupant")
}

/// РЎС‚Р°С‚СЊСЏ С‚Р°СЂРёС„Р° вЂ” РјРёРЅРёРјСѓРј 3 (Q-008): СЌРєСЃРїР»СѓР°С‚Р°С†РёСЏ, С†РµР»РµРІРѕР№ СЃР±РѕСЂ, РєР°Рї.СЂРµРјРѕРЅС‚.
/// РЎРѕРІРїР°РґР°РµС‚ СЃ Р±Р°РєРµС‚Р°РјРё Р·Р°РґРѕР»Р¶РµРЅРЅРѕСЃС‚Рё (REQ-024, Q-032) Рё РіСЂСѓРїРїРёСЂРѕРІРєРѕР№ IncomeCategory РЅРёР¶Рµ.
enum TariffCategory {
  MAINTENANCE // СЌРєСЃРїР»СѓР°С‚Р°С†РёРѕРЅРЅС‹Рµ СЂР°СЃС…РѕРґС‹ / СѓРїСЂР°РІР»РµРЅРёРµ РѕР±СЉРµРєС‚РѕРј РєРѕРЅРґРѕРјРёРЅРёСѓРјР°
  TARGETED // С†РµР»РµРІРѕР№ СЃР±РѕСЂ
  CAPITAL_REPAIR // РЅР°РєРѕРїР»РµРЅРёСЏ РЅР° РєР°РїРёС‚Р°Р»СЊРЅС‹Р№ СЂРµРјРѕРЅС‚ (РѕР±РѕСЃРѕР±Р»РµРЅРЅС‹Р№ С„РѕРЅРґ)
}

enum RateType {
  PER_SQM
  FIXED
}

model Tariff {
  id         String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId      String         @map("osi_id") @db.Uuid
  buildingId String         @map("building_id") @db.Uuid
  category   TariffCategory
  rateType   RateType       @map("rate_type")
  rate       Decimal        @db.Decimal(12, 2)
  periodFrom DateTime       @map("period_from")
  periodTo   DateTime?      @map("period_to")

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  charges  Charge[]

  @@index([osiId])
  @@index([buildingId])
  @@map("tariff")
}

/// РЎС‚Р°С‚СѓСЃ РћРџР›РђРўР« РЅР°С‡РёСЃР»РµРЅРёСЏ вЂ” 3 Р·РЅР°С‡РµРЅРёСЏ (REQ-023, РїРµСЂРµСЃРјРѕС‚СЂРµРЅРѕ РїСЂРё СЂРµРІРёР·РёРё).
/// "РџСЂРѕСЃСЂРѕС‡РµРЅРѕ" РќР• С…СЂР°РЅРёС‚СЃСЏ: СЌС‚Рѕ computed-РїСЂРёР·РЅР°Рє (dueDate РІ РїСЂРѕС€Р»РѕРј Р status != PAID),
/// РІС‹С‡РёСЃР»СЏРµС‚СЃСЏ РІ Р·Р°РїСЂРѕСЃРµ/РїСЂРёР»РѕР¶РµРЅРёРё, Р° РЅРµ РІ Р‘Р” вЂ” СЃС‚Р°С‚СѓСЃ РѕРїР»Р°С‚С‹ Рё РїСЂРѕСЃСЂРѕС‡РєР° РѕСЂС‚РѕРіРѕРЅР°Р»СЊРЅС‹.
enum ChargeStatus {
  OPEN
  PARTIALLY_PAID
  PAID
}

model Charge {
  id        String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId     String       @map("osi_id") @db.Uuid
  accountId String       @map("account_id") @db.Uuid
  tariffId  String       @map("tariff_id") @db.Uuid
  period    DateTime // РјРµСЃСЏС† РЅР°С‡РёСЃР»РµРЅРёСЏ
  amount    Decimal      @db.Decimal(12, 2)
  dueDate   DateTime     @map("due_date")
  status    ChargeStatus @default(OPEN)

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
  tariff  Tariff  @relation(fields: [tariffId], references: [id])

  @@index([osiId])
  @@index([accountId])
  @@map("charge")
}

/// РљР°С‚РµРіРѕСЂРёСЏ РїРѕСЃС‚СѓРїР»РµРЅРёСЏ вЂ” СЃС‚СЂРѕРєРё 6.1вЂ“6.7 С„РѕСЂРјС‹ РѕС‚С‡С‘С‚Р° (report-spec.md В§2). Р‘РѕР»РµРµ РіСЂР°РЅСѓР»СЏСЂРЅР°,
/// С‡РµРј TariffCategory: СЂР°Р·Р»РёС‡Р°РµС‚ РєРІР°СЂС‚РёСЂС‹/РЅРµР¶РёР»С‹Рµ vs РїР°СЂРєРѕРІРєРё/РєР»Р°РґРѕРІРєРё, Р°СЂРµРЅРґСѓ, С†РµР»РµРІС‹Рµ, РёРЅРѕРµ.
/// Р‘Р°РєРµС‚ Р·Р°РґРѕР»Р¶РµРЅРЅРѕСЃС‚Рё (TariffCategory) РІС‹РІРѕРґРёС‚СЃСЏ РёР· IncomeCategory РїСЂРё Р°РіСЂРµРіР°С†РёРё
/// (RESIDENT_DUES/PARKING_DUES в†’ MAINTENANCE; CAPITAL_REPAIR_CONTRIBUTION в†’ CAPITAL_REPAIR;
/// TARGETED_* в†’ TARGETED; RENTAL/OTHER вЂ” РІРЅРµ Р±Р°РєРµС‚РѕРІ РґРѕР»РіР°).
enum IncomeCategory {
  RESIDENT_DUES // 6.1 С‚РµРєСѓС‰РёРµ РІР·РЅРѕСЃС‹ РєРІР°СЂС‚РёСЂ/РЅРµР¶РёР»С‹С… РЅР° СѓРїСЂР°РІР»РµРЅРёРµ
  PARKING_STORAGE_DUES // 6.2 РІР·РЅРѕСЃС‹ Р·Р° РїР°СЂРєРѕРІРєРё/РєР»Р°РґРѕРІРєРё
  CAPITAL_REPAIR_CONTRIBUTION // 6.3 РЅР°РєРѕРїРёС‚РµР»СЊРЅС‹Рµ РІР·РЅРѕСЃС‹ РЅР° РєР°Рї.СЂРµРјРѕРЅС‚
  RENTAL_INCOME // 6.4 РїР»Р°С‚Р° Р·Р° Р°СЂРµРЅРґСѓ РѕР±С‰РµРіРѕ РёРјСѓС‰РµСЃС‚РІР°
  TARGETED_RESIDENT // 6.5 С†РµР»РµРІС‹Рµ РІР·РЅРѕСЃС‹ РєРІР°СЂС‚РёСЂ/РЅРµР¶РёР»С‹С…
  TARGETED_PARKING // 6.6 С†РµР»РµРІС‹Рµ РІР·РЅРѕСЃС‹ РїР°СЂРєРѕРІРѕРє/РєР»Р°РґРѕРІРѕРє
  OTHER_INCOME // 6.7 РёРЅС‹Рµ РїРѕСЃС‚СѓРїР»РµРЅРёСЏ
}

/// Р¤Р°РєС‚ РѕРїР»Р°С‚С‹ (РїРѕСЃС‚СѓРїР»РµРЅРёРµ). РЎС‚Р°С‚СЊСЏ вЂ” РћР‘РЇР—РђРўР•Р›Р¬РќРћР• РїРѕР»Рµ, РїСЂРµРґСЃРµРґР°С‚РµР»СЊ СѓРєР°Р·С‹РІР°РµС‚ РІСЂСѓС‡РЅСѓСЋ
/// РїСЂРё РІРІРѕРґРµ (Q-032 Р·Р°РєСЂС‹С‚): РѕРґРёРЅ СЂРµР°Р»СЊРЅС‹Р№ РїР»Р°С‚С‘Р¶ РЅР° РЅРµСЃРєРѕР»СЊРєРѕ СЃС‚Р°С‚РµР№ = РЅРµСЃРєРѕР»СЊРєРѕ СЃС‚СЂРѕРє Payment.
/// РќРёРєР°РєРѕР№ Р°РІС‚Рѕ-Р°Р»Р»РѕРєР°С†РёРё РІ MVP.
model Payment {
  id             String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId          String         @map("osi_id") @db.Uuid
  accountId      String         @map("account_id") @db.Uuid
  amount         Decimal        @db.Decimal(12, 2)
  paidAt         DateTime       @map("paid_at")
  method         String? // СЂСѓС‡РЅРѕР№ РІРІРѕРґ / РёРјРїРѕСЂС‚ (Q-012) / РґРµРјРѕ-РѕРїР»Р°С‚Р° РѕРЅР»Р°Р№РЅ (payments-online.md)
  /// РњРµС‚РєР° СЃРёРјСѓР»СЏС‚РѕСЂР° СЌРєРІР°Р№СЂРёРЅРіР° (payments-online.md, ADR-0010) вЂ” С‚РѕР»СЊРєРѕ РґР»СЏ РѕРЅР»Р°Р№РЅ-РґРµРјРѕ-РѕРїР»Р°С‚,
  /// null РґР»СЏ СЂСѓС‡РЅРѕРіРѕ РІРІРѕРґР° РїСЂРµРґСЃРµРґР°С‚РµР»РµРј. РРЅС„РѕСЂРјР°С†РёРѕРЅРЅР°СЏ, РќР• РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РґР»СЏ РёРґРµРјРїРѕС‚РµРЅС‚РЅРѕСЃС‚Рё
  /// (С‚Р° РѕР±РµСЃРїРµС‡РёРІР°РµС‚СЃСЏ РїРµСЂРµСЃС‡С‘С‚РѕРј РґРѕР»РіР° РЅР° СЃРµСЂРІРµСЂРµ РїСЂРё РєР°Р¶РґРѕРј РІС‹Р·РѕРІРµ).
  gatewayRef     String?        @map("gateway_ref")
  incomeCategory IncomeCategory @map("income_category")

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([accountId])
  @@map("payment")
}

// ---- Р‘Р°РЅРєРѕРІСЃРєРёРµ СЃС‡РµС‚Р° Рё СЂР°СЃС…РѕРґС‹ (report-spec.md, bank-import.md) вЂ” REQ-025/026 ----

enum BankAccountType {
  CURRENT // С‚РµРєСѓС‰РёР№ вЂ” СѓРїСЂР°РІР»РµРЅРёРµ/СЃРѕРґРµСЂР¶Р°РЅРёРµ
  SAVINGS // СЃР±РµСЂРµРіР°С‚РµР»СЊРЅС‹Р№ вЂ” РЅР°РєРѕРїР»РµРЅРёСЏ РЅР° РєР°Рї.СЂРµРјРѕРЅС‚ (СЂР°СЃС…РѕРґРѕРІР°РЅРёРµ С‚РѕР»СЊРєРѕ РїРѕ СЂРµС€РµРЅРёСЋ СЃРѕР±СЂР°РЅРёСЏ)
}

model BankAccount {
  id             String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId          String          @map("osi_id") @db.Uuid
  buildingId     String          @map("building_id") @db.Uuid
  type           BankAccountType
  bankName       String          @map("bank_name")
  accountNumber  String          @map("account_number") // IBAN
  currentBalance Decimal?        @map("current_balance") @db.Decimal(14, 2)
  updatedAt      DateTime        @updatedAt @map("updated_at")

  building   Building        @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  expenses   Expense[]
  statements BankStatement[]

  @@index([osiId])
  @@index([buildingId])
  @@map("bank_account")
}

/// РРјРїРѕСЂС‚РёСЂРѕРІР°РЅРЅР°СЏ РІС‹РїРёСЃРєР° (Kaspi Pay Рё С‚.Рї., bank-import.md) вЂ” РёСЃС‚РѕС‡РЅРёРє РѕСЃС‚Р°С‚РєРѕРІ (Р±Р»РѕРє 1вЂ“2
/// РѕС‚С‡С‘С‚Р°) Рё СЃРІРµСЂРєРё РёС‚РѕРіРѕРІ (РїСЂР°РІРёР»Рѕ 3 РІ bank-import.md: "Р’СЃРµРіРѕ СЃРїРёСЃР°РЅРѕ" = ОЈ Expense РґРѕ С‚РёС‹РЅР°).
model BankStatement {
  id             String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId          String    @map("osi_id") @db.Uuid
  bankAccountId  String    @map("bank_account_id") @db.Uuid
  periodFrom     DateTime  @map("period_from")
  periodTo       DateTime  @map("period_to")
  openingBalance Decimal   @map("opening_balance") @db.Decimal(14, 2)
  closingBalance Decimal   @map("closing_balance") @db.Decimal(14, 2)
  totalIncome    Decimal   @map("total_income") @db.Decimal(14, 2)
  totalExpense   Decimal   @map("total_expense") @db.Decimal(14, 2)
  sourceFileUrl  String?   @map("source_file_url") // РѕСЂРёРіРёРЅР°Р» PDF вЂ” РїРµСЂРІРёС‡РЅС‹Р№ РґРѕРєСѓРјРµРЅС‚
  reconciledAt   DateTime? @map("reconciled_at")

  bankAccount BankAccount @relation(fields: [bankAccountId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([bankAccountId])
  @@map("bank_statement")
}

/// РљР°С‚РµРіРѕСЂРёСЏ СЂР°СЃС…РѕРґР° вЂ” СЃС‚СЂРѕРєРё 7.1.1вЂ“7.6 С„РѕСЂРјС‹ РѕС‚С‡С‘С‚Р° (report-spec.md В§2, РџСЂРёР»РѕР¶РµРЅРёРµ 3 в„– 163).
enum ExpenseCategory {
  LABOR_ACCOUNTING // 7.1.1 РѕРїР»Р°С‚Р° С‚СЂСѓРґР° вЂ” Р±СѓС…СѓС‡С‘С‚/РѕС‚С‡С‘С‚РЅРѕСЃС‚СЊ
  LABOR_MANAGEMENT // 7.1.2 РѕРїР»Р°С‚Р° С‚СЂСѓРґР° вЂ” СѓРїСЂР°РІР»РµРЅРёРµ РѕР±СЉРµРєС‚РѕРј
  BUDGET_PAYMENTS // 7.1.3 РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рµ РїР»Р°С‚РµР¶Рё РІ Р±СЋРґР¶РµС‚
  BANK_SERVICES // 7.1.4 Р±Р°РЅРєРѕРІСЃРєРёРµ СѓСЃР»СѓРіРё
  CASH_SERVICE // 7.1.5 СЂР°СЃС‡С‘С‚РЅРѕ-РєР°СЃСЃРѕРІРѕРµ РѕР±СЃР»СѓР¶РёРІР°РЅРёРµ
  OFFICE // 7.1.6 СЃРѕРґРµСЂР¶Р°РЅРёРµ РѕС„РёСЃР°
  SERVICE_CONTRACT // 7.2.1 СѓСЃР»СѓРіРё СЃСѓР±СЉРµРєС‚Р°Рј СЃРµСЂРІРёСЃРЅРѕР№ РґРµСЏС‚РµР»СЊРЅРѕСЃС‚Рё (СЃРј. counterparty)
  CURRENT_REPAIR // 7.3 С‚РµРєСѓС‰РёР№ СЂРµРјРѕРЅС‚ РѕР±С‰РµРіРѕ РёРјСѓС‰РµСЃС‚РІР°
  UTILITIES // 7.4 РєРѕРјРјСѓРЅР°Р»СЊРЅС‹Рµ СѓСЃР»СѓРіРё РЅР° СЃРѕРґРµСЂР¶Р°РЅРёРµ РѕР±С‰РµРіРѕ РёРјСѓС‰РµСЃС‚РІР°
  HOUSEHOLD // 7.5 С…РѕР·СЏР№СЃС‚РІРµРЅРЅС‹Рµ СЂР°СЃС…РѕРґС‹
  CAPITAL_REPAIR // 7.6 РєР°РїРёС‚Р°Р»СЊРЅС‹Р№ СЂРµРјРѕРЅС‚ (С‚РѕР»СЊРєРѕ СЃРѕ СЃР±РµСЂРµРіР°С‚РµР»СЊРЅРѕРіРѕ СЃС‡С‘С‚Р°, РїРѕ СЂРµС€РµРЅРёСЋ СЃРѕР±СЂР°РЅРёСЏ)
}

model Counterparty {
  id    String  @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId String  @map("osi_id") @db.Uuid
  name  String
  bin   String? // Р‘РРќ/РРРќ РєРѕРЅС‚СЂР°РіРµРЅС‚Р°
  type  String? // РРџ/РўРћРћ/РќРђРћ/С„РёР·Р»РёС†Рѕ

  expenses Expense[]

  @@index([osiId])
  @@map("counterparty")
}

/// Р Р°СЃС…РѕРґ РћРЎР (Р±Р»РѕРє 7 РѕС‚С‡С‘С‚Р°). withheldTax/contractRef вЂ” РґР»СЏ РІС‹РїР»Р°С‚ С„РёР·Р»РёС†Р°Рј РїРѕ Р”Р“Рџ
/// (bank-import.md РїСЂР°РІРёР»Рѕ 2: СЃСѓРјРјР° + СѓРґРµСЂР¶Р°РЅРЅС‹Р№ РРџРќ 10%, СЃСЃС‹Р»РєР° РЅР° РґРѕРіРѕРІРѕСЂ Р“РџРҐ).
model Expense {
  id                 String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId              String          @map("osi_id") @db.Uuid
  buildingId         String          @map("building_id") @db.Uuid
  bankAccountId      String          @map("bank_account_id") @db.Uuid
  expenseCategory    ExpenseCategory @map("expense_category")
  date               DateTime
  amount             Decimal         @db.Decimal(14, 2)
  counterpartyId     String?         @map("counterparty_id") @db.Uuid
  purpose            String?
  withheldTax        Decimal?        @map("withheld_tax") @db.Decimal(14, 2)
  contractRef        String?         @map("contract_ref") // Р”Р“Рџ/РґРѕРіРѕРІРѕСЂ/Р°РєС‚
  isInternalTransfer Boolean         @default(false) @map("is_internal_transfer") // РїРµСЂРµРІРѕРґ РјРµР¶РґСѓ СЃРІРѕРёРјРё СЃС‡РµС‚Р°РјРё вЂ” РЅРµ РґРѕС…РѕРґ/СЂР°СЃС…РѕРґ
  actUrl             String?         @map("act_url") // РїРѕРґС‚РІРµСЂР¶РґР°СЋС‰РёР№ Р°РєС‚ (7.2.1)

  building     Building      @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  bankAccount  BankAccount   @relation(fields: [bankAccountId], references: [id])
  counterparty Counterparty? @relation(fields: [counterpartyId], references: [id])

  @@index([osiId])
  @@index([buildingId])
  @@index([bankAccountId])
  @@map("expense")
}

// ---- РћС‚С‡С‘С‚С‹ Рё РїРѕРґРїРёСЃРєР° ----

enum ReportType {
  MONTHLY
  QUARTERLY // REQ-045: РѕС‚С‡С‘С‚ Р·Р° РєРІР°СЂС‚Р°Р» (report-spec.md В§4Р°)
  ANNUAL
}

enum ReportStatus {
  DRAFT
  GENERATED
  PUBLISHED
}

/// РџСѓР±Р»РёС‡РЅРѕРµ РїСЂРµРґСЃС‚Р°РІР»РµРЅРёРµ (Р¶РёС‚РµР»СЏРј) РёСЃРєР»СЋС‡Р°РµС‚ РџР”РЅ вЂ” report-spec.md В§2Р°: РРРќ, С‚РµР»РµС„РѕРЅС‹,
/// СЂРµРєРІРёР·РёС‚С‹, Р¤РРћ СЂСЏРґРѕРІРѕРіРѕ РїРµСЂСЃРѕРЅР°Р»Р° СЃРєСЂС‹С‚С‹ (Р·Р°РјРµРЅСЏСЋС‚СЃСЏ Р°РіСЂРµРіР°С‚РѕРј В«Р¤РћРў РїРµСЂСЃРѕРЅР°Р»Р°В»).
/// Р Р°Р·РґРµР»РµРЅРёРµ internal/public СЂРµР°Р»РёР·СѓРµС‚СЃСЏ РЅР° СѓСЂРѕРІРЅРµ СЃРµСЂРёР°Р»РёР·Р°С†РёРё РїСЂРё РѕС‚РґР°С‡Рµ РѕС‚С‡С‘С‚Р°, РЅРµ СЃС…РµРјРѕР№.
model Report {
  id               String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId            String       @map("osi_id") @db.Uuid
  buildingId       String       @map("building_id") @db.Uuid
  type             ReportType   @default(MONTHLY)
  periodFrom       DateTime     @map("period_from")
  periodTo         DateTime     @map("period_to")
  status           ReportStatus @default(DRAFT)
  generatedAt      DateTime?    @map("generated_at")
  publishedAt      DateTime?    @map("published_at")
  accountantName   String?      @map("accountant_name")
  chairmanName     String?      @map("chairman_name")
  houseCouncilName String?      @map("house_council_name")
  fileUrl          String?      @map("file_url") // Q-013 РѕСЃС‚Р°С‚РѕРє: С„РѕСЂРјР°С‚ РІС‹РІРѕРґР° PDF/РІРµР±
  /// РЎРЅРёРјРѕРє С†РёС„СЂ РѕС‚С‡С‘С‚Р° РЅР° РјРѕРјРµРЅС‚ РіРµРЅРµСЂР°С†РёРё (4 Р±Р»РѕРєР° С„РѕСЂРјС‹) вЂ” РѕРїСѓР±Р»РёРєРѕРІР°РЅРЅС‹Р№ РѕС‚С‡С‘С‚ РЅРµ В«РїР»С‹РІС‘С‚В»
  /// РїСЂРё РїРѕСЃР»РµРґСѓСЋС‰РёС… РїСЂР°РІРєР°С… РґР°РЅРЅС‹С… (Р¤Р°Р·Р° 2, REQ-040/041).
  data             Json?

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([buildingId])
  @@map("report")
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELED
}

/// Р•РґРёРЅРёС†Р° РїРѕРґРїРёСЃРєРё вЂ” Building, РЅРµ Osi С†РµР»РёРєРѕРј (Q-009 Р·Р°РєСЂС‹С‚).
model Subscription {
  id          String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId       String             @map("osi_id") @db.Uuid
  buildingId  String             @unique @map("building_id") @db.Uuid
  plan        String?
  status      SubscriptionStatus @default(TRIAL)
  periodStart DateTime           @map("period_start")
  periodEnd   DateTime?          @map("period_end")

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@map("subscription")
}

// ---- РђСѓРґРёС‚ (NFR-055) ----

enum AuditEntityType {
  CHARGE
  PAYMENT
  TARIFF
  EXPENSE
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
}

/// Append-only Р¶СѓСЂРЅР°Р» С„РёРЅР°РЅСЃРѕРІС‹С… РјСѓС‚Р°С†РёР№ вЂ” СЃРЅРёРјР°РµС‚ СЃРїРѕСЂС‹ В«РєСѓРґР° СѓС€Р»Рё РґРµРЅСЊРіРёВ» (vision.md В§3).
/// РџСЂРёР»РѕР¶РµРЅРёРµ РЅРёРєРѕРіРґР° РЅРµ РґРµР»Р°РµС‚ UPDATE/DELETE РЅР°Рґ СЌС‚РѕР№ С‚Р°Р±Р»РёС†РµР№.
model AuditLog {
  id          String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId       String          @map("osi_id") @db.Uuid
  entityType  AuditEntityType @map("entity_type")
  entityId    String          @map("entity_id") @db.Uuid
  action      AuditAction
  diff        Json?
  actorUserId String          @map("actor_user_id") @db.Uuid
  createdAt   DateTime        @default(now()) @map("created_at")

  @@index([osiId])
  @@index([entityType, entityId])
  @@map("audit_log")
}

/// Р–СѓСЂРЅР°Р» РґРµР№СЃС‚РІРёР№ Р°РґРјРёРЅРєРё РїР»Р°С‚С„РѕСЂРјС‹ (ADR-0008, REQ-110) вЂ” identity-С‚Р°Р±Р»РёС†Р° Р’РќР• RLS
/// (РґРµР№СЃС‚РІРёСЏ СЃСѓРїРµСЂР°РґРјРёРЅР° РїР»Р°С‚С„РѕСЂРјРµРЅРЅС‹Рµ: Сѓ СЃРјРµРЅС‹ СЃС‚Р°С‚СѓСЃР° РјР°СЃС‚РµСЂР° osiId РЅРµС‚ РІ РїСЂРёРЅС†РёРїРµ).
/// Append-only: РїСЂРёР»РѕР¶РµРЅРёРµ РЅРёРєРѕРіРґР° РЅРµ РґРµР»Р°РµС‚ UPDATE/DELETE. РќР• СЃРјРµС€РёРІР°С‚СЊ СЃ С„РёРЅР°РЅСЃРѕРІС‹Рј
/// AuditLog РћРЎР (С‚РѕС‚ вЂ” С‚РµРЅР°РЅС‚РЅС‹Р№ Р¶СѓСЂРЅР°Р» СЃРїРѕСЂРѕРІ Рѕ РґРµРЅСЊРіР°С…). РЎРµРєСЂРµС‚С‹ (РїР°СЂРѕР»Рё) РІ diff РЅРµ РїРёС€СѓС‚СЃСЏ.
model AdminAuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  actorUserId String   @map("actor_user_id") @db.Uuid
  /// РљРѕРґ РґРµР№СЃС‚РІРёСЏ: MASTER_STATUS | SUBSCRIPTION_SET | CHAIRMAN_GRANT | PASSWORD_RESET | вЂ¦
  action      String
  /// РРґРµРЅС‚РёС„РёРєР°С‚РѕСЂ Р·Р°С‚СЂРѕРЅСѓС‚РѕР№ СЃСѓС‰РЅРѕСЃС‚Рё (uuid РјР°СЃС‚РµСЂР°/РґРѕРјР°/РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ вЂ” С‚РёРї Р·Р°РІРёСЃРёС‚ РѕС‚ action).
  entityId    String   @map("entity_id")
  diff        Json?
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([actorUserId])
  @@index([action, entityId])
  @@map("admin_audit_log")
}

// =====================================================================================
// РљРћРњРњРЈРќРРљРђР¦РРЇ вЂ” Р¤Р°Р·Р° 1, features.md Р±Р»РѕРє B. РЎРЅРёР¶Р°РµС‚ РЅР°РіСЂСѓР·РєСѓ РїСЂРµРґСЃРµРґР°С‚РµР»СЏ/РіРѕР»РѕРІРЅСѓСЋ Р±РѕР»СЊ
// Р¶РёС‚РµР»РµР№; РќР• Р·Р°РјРµРЅСЏРµС‚ WhatsApp (vision.md В§1 СЂРµРІРёР·РёСЏ).
// =====================================================================================

enum AnnouncementScope {
  BUILDING
  ENTRANCE
  APARTMENT
}

model Announcement {
  id           String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId        String            @map("osi_id") @db.Uuid
  buildingId   String            @map("building_id") @db.Uuid
  authorUserId String            @map("author_user_id") @db.Uuid
  title        String
  body         String
  scope        AnnouncementScope @default(BUILDING)
  targetIds    String[]          @map("target_ids") // id РїРѕРґСЉРµР·РґРѕРІ/РєРІР°СЂС‚РёСЂ РїСЂРё scope != BUILDING
  isPinned     Boolean           @default(false) @map("is_pinned")
  createdAt    DateTime          @default(now()) @map("created_at")

  building Building           @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  reads    AnnouncementRead[]

  @@index([osiId])
  @@index([buildingId])
  @@map("announcement")
}

model AnnouncementRead {
  osiId          String   @map("osi_id") @db.Uuid // РґРµРЅРѕСЂРјР°Р»РёР·РѕРІР°РЅРѕ СЃ Announcement вЂ” ADR-0006: РєР°Р¶РґР°СЏ tenant-С‚Р°Р±Р»РёС†Р° РЅРµСЃС‘С‚ osiId РґР»СЏ RLS
  announcementId String   @map("announcement_id") @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  readAt         DateTime @default(now()) @map("read_at")

  announcement Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)

  @@id([announcementId, userId])
  @@index([osiId])
  @@map("announcement_read")
}

enum RequestCategory {
  PLUMBING
  ELEVATOR
  CLEANING
  ELECTRICITY
  OTHER
}

enum RequestStatus {
  RECEIVED
  IN_PROGRESS
  RESOLVED
}

/// Р—Р°СЏРІРєР° Р¶РёС‚РµР»СЏ вЂ” СЃРЅРёР¶Р°РµС‚ РЅР°РіСЂСѓР·РєСѓ РїСЂРµРґСЃРµРґР°С‚РµР»СЏ (features.md РїСЂРёРЅС†РёРї 3), РѕС„РёС†РёР°Р»СЊРЅС‹Р№ СЃР»РµРґ
/// РІРјРµСЃС‚Рѕ РїРѕС‚РµСЂСЏРЅРЅРѕРіРѕ СЃРѕРѕР±С‰РµРЅРёСЏ РІ WhatsApp.
model Request {
  id           String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId        String          @map("osi_id") @db.Uuid
  buildingId   String          @map("building_id") @db.Uuid
  apartmentId  String?         @map("apartment_id") @db.Uuid
  authorUserId String          @map("author_user_id") @db.Uuid
  /// РќР°Р·РЅР°С‡РµРЅРЅС‹Р№ РјР°СЃС‚РµСЂ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ) вЂ” РїСЂРµРґСЃРµРґР°С‚РµР»СЊ РЅР°Р·РЅР°С‡Р°РµС‚ РёР· СЃРїРёСЃРєР° РїСЂРѕРІРµСЂРµРЅРЅС‹С… РјР°СЃС‚РµСЂРѕРІ
  masterId     String?         @map("master_id") @db.Uuid
  category     RequestCategory
  text         String
  photoUrls    String[]        @map("photo_urls")
  status       RequestStatus   @default(RECEIVED)
  createdAt    DateTime        @default(now()) @map("created_at")
  updatedAt    DateTime        @updatedAt @map("updated_at")

  building      Building         @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  apartment     Apartment?       @relation(fields: [apartmentId], references: [id])
  master        Master?          @relation("RequestMaster", fields: [masterId], references: [id], onDelete: SetNull)
  messages      RequestMessage[]
  marketListing MarketListing?
  reviews       MasterReview[]

  @@index([osiId])
  @@index([buildingId])
  @@index([status])
  @@index([masterId])
  @@map("request")
}

model RequestMessage {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId        String   @map("osi_id") @db.Uuid // РґРµРЅРѕСЂРјР°Р»РёР·РѕРІР°РЅРѕ СЃ Request вЂ” ADR-0006: РєР°Р¶РґР°СЏ tenant-С‚Р°Р±Р»РёС†Р° РЅРµСЃС‘С‚ osiId РґР»СЏ RLS
  requestId    String   @map("request_id") @db.Uuid
  authorUserId String   @map("author_user_id") @db.Uuid
  text         String
  /// Р’Р»РѕР¶РµРЅРёСЏ РјРѕР±РёР»СЊРЅРѕРіРѕ РєР»РёРµРЅС‚Р° (mobile-app.md В§4, СЃСЂРµР· 22) вЂ” СЃСЃС‹Р»РєРё РЅР° СѓР¶Рµ Р·Р°РіСЂСѓР¶РµРЅРЅС‹Рµ С‡РµСЂРµР·
  /// /api/uploads С„Р°Р№Р»С‹ (REQ-131, РїСЂРёРІР°С‚РЅС‹Рµ, РЅРµ РїСѓР±Р»РёС‡РЅС‹Р№ storage). РћР±Р° РѕРїС†РёРѕРЅР°Р»СЊРЅС‹, text
  /// РѕСЃС‚Р°С‘С‚СЃСЏ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹Рј (Р°СѓРґРёРѕ/С„РѕС‚Рѕ РґРѕРїРѕР»РЅСЏСЋС‚ СЃРѕРѕР±С‰РµРЅРёРµ, РЅРµ Р·Р°РјРµРЅСЏСЋС‚).
  audioUrl     String?  @map("audio_url")
  imageUrl     String?  @map("image_url")
  createdAt    DateTime @default(now()) @map("created_at")

  request Request @relation(fields: [requestId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([requestId])
  @@map("request_message")
}

// ---- РњР°СЂРєРµС‚РїР»РµР№СЃ Р·Р°СЏРІРѕРє вЂ” РјР°СЃС‚РµСЂР° (ADR-0009, docs/specs/marketplace.md) ----
// MarketListing/MarketOffer вЂ” tenant-С‚Р°Р±Р»РёС†С‹ (РЅРµСЃСѓС‚ osiId), РќРћ СЃ Р”Р’РЈРњРЇ RLS-РїРѕР»РёС‚РёРєР°РјРё
// (permissive, РѕР±СЉРµРґРёРЅСЏСЋС‚СЃСЏ С‡РµСЂРµР· OR): tenant_iso вЂ” РїСѓС‚СЊ РїСЂРµРґСЃРµРґР°С‚РµР»СЏ С‡РµСЂРµР· forTenant();
// market_read/master_own вЂ” РїСѓС‚СЊ РјР°СЃС‚РµСЂР° С‡РµСЂРµР· forMaster() (СЃРј. RLS-РјРёРіСЂР°С†РёСЋ). РћР±С‹С‡РЅС‹Р№
// generic-С†РёРєР» RLS-РїРѕР»РёС‚РёРє (prisma/migrations/.../rls_policies) РЅР° РЅРёС… РќР• РїСЂРёРјРµРЅСЏРµС‚СЃСЏ вЂ”
// РїРѕР»РёС‚РёРєРё СЌС‚РёС… РґРІСѓС… С‚Р°Р±Р»РёС† РѕРїРёСЃР°РЅС‹ РѕС‚РґРµР»СЊРЅРѕ.

enum MarketListingStatus {
  PUBLISHED // РІРёРґРЅР° РїСЂРѕРІРµСЂРµРЅРЅС‹Рј (APPROVED) РјР°СЃС‚РµСЂР°Рј СЃРІРѕРµРіРѕ РіРѕСЂРѕРґР°
  TAKEN // РѕС‚РєР»РёРє РїСЂРёРЅСЏС‚, СЃРЅСЏС‚Р° СЃ РѕР±С‰РµР№ РІРёС‚СЂРёРЅС‹
  CLOSED // РїСЂРµРґСЃРµРґР°С‚РµР»СЊ СЃРЅСЏР» РїСѓР±Р»РёРєР°С†РёСЋ / Р·Р°СЏРІРєР° Р·Р°РєСЂС‹С‚Р°
}

/// Р’РёС‚СЂРёРЅР°-РїСЂРѕРµРєС†РёСЏ Р·Р°СЏРІРєРё РґР»СЏ РјР°СЃС‚РµСЂРѕРІ (ADR-0009, РІР°СЂРёР°РЅС‚ C: РќР• JOIN Рє Request, Р° СЏРІРЅР°СЏ
/// РєРѕРїРёСЏ whitelist-РїРѕР»РµР№). РќРРљРћР“Р”Рђ РЅРµ РєРѕРїРёСЂРѕРІР°С‚СЊ: РєРІР°СЂС‚РёСЂСѓ, Р¤РРћ/С‚РµР»РµС„РѕРЅ Р¶РёС‚РµР»СЏ, С‚СЂРµРґ Р·Р°СЏРІРєРё вЂ”
/// СЌС‚Рѕ РіР°СЂР°РЅС‚РёСЏ РїСЂРёРІР°С‚РЅРѕСЃС‚Рё РґРѕ РїСЂРёРЅСЏС‚РёСЏ РѕС‚РєР»РёРєР° (marketplace.md В§4).
model MarketListing {
  id            String              @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId         String              @map("osi_id") @db.Uuid
  requestId     String              @unique @map("request_id") @db.Uuid
  city          String
  category      RequestCategory
  title         String
  description   String
  photoUrls     String[]            @map("photo_urls")
  buildingLabel String              @map("building_label") // Р°РґСЂРµСЃ РґРѕРјР° Р‘Р•Р— РЅРѕРјРµСЂР° РєРІР°СЂС‚РёСЂС‹
  status        MarketListingStatus @default(PUBLISHED)
  publishedAt   DateTime            @default(now()) @map("published_at")
  closedAt      DateTime?           @map("closed_at")

  request Request       @relation(fields: [requestId], references: [id], onDelete: Cascade)
  offers  MarketOffer[]

  @@index([osiId])
  @@index([city, status])
  @@map("market_listing")
}

enum MarketOfferStatus {
  OFFERED
  ACCEPTED
  DECLINED
  WITHDRAWN
}

/// РћС‚РєР»РёРє РјР°СЃС‚РµСЂР° РЅР° Р»РёСЃС‚РёРЅРі. osiId РґРµРЅРѕСЂРјР°Р»РёР·РѕРІР°РЅ СЃ MarketListing вЂ” РєР°Рє Рё РІРµР·РґРµ РІ СЃС…РµРјРµ,
/// РєР°Р¶РґР°СЏ tenant-С‚Р°Р±Р»РёС†Р° РЅРµСЃС‘С‚ СЃРІРѕР№ osiId РґР»СЏ RLS (ADR-0006), РґР°Р¶Рµ РµСЃР»Рё РѕРЅ РІС‹РІРѕРґРёРј С‡РµСЂРµР· JOIN.
model MarketOffer {
  id        String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId     String            @map("osi_id") @db.Uuid
  listingId String            @map("listing_id") @db.Uuid
  masterId  String            @map("master_id") @db.Uuid
  message   String
  price     Decimal?          @db.Decimal(12, 2)
  status    MarketOfferStatus @default(OFFERED)
  createdAt DateTime          @default(now()) @map("created_at")

  listing MarketListing @relation(fields: [listingId], references: [id], onDelete: Cascade)
  master  Master        @relation(fields: [masterId], references: [id], onDelete: Cascade)

  @@unique([listingId, masterId]) // РѕРґРёРЅ РјР°СЃС‚РµСЂ вЂ” РѕРґРёРЅ Р°РєС‚РёРІРЅС‹Р№ РѕС‚РєР»РёРє РЅР° Р»РёСЃС‚РёРЅРі
  @@index([osiId])
  @@index([listingId])
  @@index([masterId])
  @@map("market_offer")
}

enum InfoItemType {
  TRASH_SCHEDULE
  EMERGENCY_CONTACTS
  PAYMENT_DETAILS
  CHAIRMAN_CONTACTS
  OTHER
}

model InfoItem {
  id         String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId      String       @map("osi_id") @db.Uuid
  buildingId String       @map("building_id") @db.Uuid
  type       InfoItemType
  title      String
  content    String

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([buildingId])
  @@map("info_item")
}

enum DocumentCategory {
  GOV_REGULATION
  REPORT
  PROTOCOL
  ESTIMATE // РЎРјРµС‚Р° СЂР°Р±РѕС‚
  CONTRACT
  TECHNICAL
  OTHER
}

/// Р”РѕРєСѓРјРµРЅС‚ РћРЎР / РґРѕРјР° (Р‘РёР±Р»РёРѕС‚РµРєР° РґРѕРєСѓРјРµРЅС‚РѕРІ).
/// Tenant-С‚Р°Р±Р»РёС†Р° вЂ” РџРћР” RLS (РЅРµСЃС‘С‚ osiId).
model Document {
  id           String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId        String           @map("osi_id") @db.Uuid
  buildingId   String           @map("building_id") @db.Uuid
  category     DocumentCategory @default(OTHER)
  title        String
  description  String?
  fileUrl      String           @map("file_url")
  fileSize     Int?             @map("file_size")
  fileType     String?          @map("file_type")
  isPublic     Boolean          @default(true) @map("is_public")
  authorUserId String           @map("author_user_id") @db.Uuid
  /// РЎСЃС‹Р»РєР° РЅР° РіРѕР»РѕСЃРѕРІР°РЅРёРµ (РґР»СЏ РїСЂРѕС‚РѕРєРѕР»РѕРІ РѕРїСЂРѕСЃРѕРІ)
  pollId       String?          @map("poll_id") @db.Uuid
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  poll     Poll?    @relation(fields: [pollId], references: [id], onDelete: SetNull)

  @@index([osiId])
  @@index([buildingId])
  @@index([category])
  @@index([pollId])
  @@map("document")
}

enum NotificationType {
  ANNOUNCEMENT
  REQUEST_CREATED
  REQUEST_STATUS
  REQUEST_MESSAGE
  CHARGE_CREATED // REQ-106: РјР°СЃСЃРѕРІР°СЏ РіРµРЅРµСЂР°С†РёСЏ РЅР°С‡РёСЃР»РµРЅРёР№ в†’ Р¶РёС‚РµР»СЏРј РєРІР°СЂС‚РёСЂС‹
  OSI_JOIN_REQUEST // REQ-152: Р¶РёС‚РµР»СЊ РѕС‚РїСЂР°РІРёР» Р·Р°СЏРІРєСѓ РЅР° РїРѕРґРєР»СЋС‡РµРЅРёРµ Рє РћРЎР
}

/// In-app СѓРІРµРґРѕРјР»РµРЅРёРµ (СЃСЂРµР· 7, REQ-100/101). Tenant-С‚Р°Р±Р»РёС†Р° вЂ” РџРћР” RLS (РЅРµСЃС‘С‚ osiId).
/// userId вЂ” РїРѕР»СѓС‡Р°С‚РµР»СЊ. entityType/entityId вЂ” deep link РЅР° РёСЃС‚РѕС‡РЅРёРє (РѕР±СЉСЏРІР»РµРЅРёРµ/Р·Р°СЏРІРєСѓ).
/// Web Push РґРѕСЃС‚Р°РІР»СЏРµС‚ С‚РѕР»СЊРєРѕ С‚РёРї+id (REQ-105), Р° СЌС‚РѕС‚ С‚РµРєСЃС‚ РїРѕРєР°Р·С‹РІР°РµС‚СЃСЏ РІ РїСЂРёР»РѕР¶РµРЅРёРё.
model Notification {
  id         String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId      String           @map("osi_id") @db.Uuid
  userId     String           @map("user_id") @db.Uuid
  type       NotificationType
  title      String
  body       String
  entityType String?          @map("entity_type") // 'announcement' | 'request'
  entityId   String?          @map("entity_id") @db.Uuid
  readAt     DateTime?        @map("read_at")
  createdAt  DateTime         @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([userId, readAt])
  @@map("notification")
}

// =====================================================================================
// AI-РђРЎРЎРРЎРўР•РќРў (СЃСЂРµР· 30, docs/specs/ai-assistant.md) вЂ” read-only tool use РїРѕРІРµСЂС… СЃРµСЂРІРёСЃРѕРІ
// РІС‹С€Рµ + РёСЃС‚РѕСЂРёСЏ РґРёР°Р»РѕРіР°. РџСЂРѕРІР°Р№РґРµСЂ (Groq/Claude) РІС‹Р±РёСЂР°РµС‚СЃСЏ С‡РµСЂРµР· LLM_PROVIDER (env.ts) вЂ”
// СЃРѕРґРµСЂР¶РёРјРѕРµ РЅРёР¶Рµ РїСЂРѕРІР°Р№РґРµСЂ-Р°РіРЅРѕСЃС‚РёС‡РЅРѕ.
// =====================================================================================

enum AssistantRole {
  USER
  ASSISTANT
}

/// Р”РёР°Р»РѕРі СЃ Р°СЃСЃРёСЃС‚РµРЅС‚РѕРј. Tenant-С‚Р°Р±Р»РёС†Р° РџРћР” RLS. вљ пёЏ content СЃРѕРѕР±С‰РµРЅРёР№ (РЅРёР¶Рµ) С…СЂР°РЅРёС‚СЃСЏ РўРћР›Р¬РљРћ
/// РІ РїСЃРµРІРґРѕРЅРёРјРёР·РёСЂРѕРІР°РЅРЅРѕРј РІРёРґРµ (Р¤РРћ/С‚РµР»РµС„РѕРЅС‹/РРРќ Р·Р°РјРµРЅРµРЅС‹ РґРѕ Р·Р°РїРёСЃРё, В§6 СЃРїРµРєРё) вЂ” pseudonymMap
/// СЌС‚Рѕ СЃР»РѕРІР°СЂСЊ РґР»СЏ РґРµ-РїРѕРґСЃС‚Р°РЅРѕРІРєРё РџР Р Р Р•РќР”Р•Р Р• РєР»РёРµРЅС‚Сѓ, РѕРЅ РЅРµ РѕС‚РїСЂР°РІР»СЏРµС‚СЃСЏ РІРѕ РІРЅРµС€РЅРёР№ LLM.
model AssistantConversation {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId        String   @map("osi_id") @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  title        String?
  pseudonymMap Json     @default("{}") @map("pseudonym_map")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  user     User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages AssistantMessage[]

  @@index([osiId, userId])
  @@map("assistant_conversation")
}

/// РћРґРЅРѕ СЃРѕРѕР±С‰РµРЅРёРµ РґРёР°Р»РѕРіР° вЂ” content СѓР¶Рµ РїСЃРµРІРґРѕРЅРёРјРёР·РёСЂРѕРІР°РЅ (СЃРј. AssistantConversation).
/// toolCalls вЂ” С‚РѕР»СЊРєРѕ РёРјРµРЅР°/Р°СЂРіСѓРјРµРЅС‚С‹ РІС‹Р·РѕРІРѕРІ (Р°СѓРґРёС‚), РќР• СЂРµР·СѓР»СЊС‚Р°С‚С‹ (С‚Рµ РЅРµ С…СЂР°РЅСЏС‚СЃСЏ РѕС‚РґРµР»СЊРЅРѕ,
/// РѕРЅРё СѓР¶Рµ РІРѕС€Р»Рё РІ С‚РµРєСЃС‚ РѕС‚РІРµС‚Р° РјРѕРґРµР»Рё).
model AssistantMessage {
  id             String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId          String        @map("osi_id") @db.Uuid
  conversationId String        @map("conversation_id") @db.Uuid
  role           AssistantRole
  content        String
  toolCalls      Json?         @map("tool_calls")
  tokensIn       Int?          @map("tokens_in")
  tokensOut      Int?          @map("tokens_out")
  createdAt      DateTime      @default(now()) @map("created_at")

  conversation AssistantConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([conversationId])
  @@map("assistant_message")
}

// =====================================================================================
// Р“РћР›РћРЎРћР’РђРќРРЇ вЂ” Р±С‹СЃС‚СЂС‹Рµ РѕРїСЂРѕСЃС‹ (Р¤Р°Р·Р° 1, lite, РќР• СЋСЂРёРґРёС‡РµСЃРєРё Р·РЅР°С‡РёРјС‹Рµ) Рё Р»РµРіРёС‚РёРјРЅС‹Рµ СЃРѕР±СЂР°РЅРёСЏ
// (Р¤Р°Р·Р° 3, РўРёСЂ 2 вЂ” Р·Р° СЂРµРіСѓР»СЏС‚РѕСЂРЅС‹Рј Р±Р°СЂСЊРµСЂРѕРј Р°РєРєСЂРµРґРёС‚Р°С†РёРё, ADR-0007). Meeting/MeetingVote вЂ”
// Р·Р°РіРѕС‚РѕРІРєР° РїРѕ domain-model.md, СЂРµР°Р»РёР·Р°С†РёСЏ РѕС‚Р»РѕР¶РµРЅР° РґРѕ РїР°СЂС‚РЅС‘СЂСЃС‚РІР° (Q-039/Q-043).
// =====================================================================================

model Poll {
  id         String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId      String    @map("osi_id") @db.Uuid
  buildingId String    @map("building_id") @db.Uuid
  question   String
  deadline   DateTime?
  createdAt  DateTime  @default(now()) @map("created_at")

  building Building     @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  options  PollOption[]
  Document Document[]

  @@index([osiId])
  @@index([buildingId])
  @@map("poll")
}

model PollOption {
  id     String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId  String @map("osi_id") @db.Uuid
  pollId String @map("poll_id") @db.Uuid
  label  String

  poll  Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)
  votes Vote[]

  @@index([osiId])
  @@map("poll_option")
}

/// РќРµС„РѕСЂРјР°Р»СЊРЅРѕРµ РіРѕР»РѕСЃРѕРІР°РЅРёРµ (lite) вЂ” РЅРµ СЋСЂРёРґРёС‡РµСЃРєРё Р·РЅР°С‡РёРјРѕРµ, 1 РіРѕР»РѕСЃ РЅР° РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ.
model Vote {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId     String   @map("osi_id") @db.Uuid
  optionId  String   @map("option_id") @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  option PollOption @relation(fields: [optionId], references: [id], onDelete: Cascade)
  User   User       @relation(fields: [userId], references: [id])

  @@unique([optionId, userId])
  @@index([osiId])
  @@map("vote")
}

enum MeetingStatus {
  DRAFT
  IN_PROGRESS
  CLOSED
}

/// Р›РµРіРёС‚РёРјРЅРѕРµ СЃРѕР±СЂР°РЅРёРµ (РџСЂРёР»РѕР¶РµРЅРёРµ 1 Рє РїСЂРёРєР°Р·Сѓ в„– 163) вЂ” РўРёСЂ 2, Р·Р° Р±Р°СЂСЊРµСЂРѕРј Р°РєРєСЂРµРґРёС‚Р°С†РёРё.
/// Р—Р°РіРѕС‚РѕРІРєР° СЃС…РµРјС‹; СЂРµР°Р»РёР·Р°С†РёСЏ flow (РєРІРѕСЂСѓРј, РёРґРµРЅС‚РёС„РёРєР°С†РёСЏ, Р­Р¦Рџ-РїСЂРѕС‚РѕРєРѕР») вЂ” Р¤Р°Р·Р° 3, ADR-0007.
model Meeting {
  id                String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId             String        @map("osi_id") @db.Uuid
  buildingId        String        @map("building_id") @db.Uuid
  agenda            String
  quorumRequirement String?       @map("quorum_requirement") // >50% СѓС‡Р°СЃС‚РЅРёРєРѕРІ Р»РёР±Рѕ РѕС‚ РѕР±С‰РµРіРѕ С‡РёСЃР»Р° вЂ” Рї.11/12 РїСЂРёРєР°Р·Р° в„–163
  status            MeetingStatus @default(DRAFT)
  protocolUrl       String?       @map("protocol_url")

  building Building @relation(fields: [buildingId], references: [id], onDelete: Cascade)

  @@index([osiId])
  @@index([buildingId])
  @@map("meeting")
}

// ---- РќР°СЃС‚СЂРѕР№РєРё СѓРІРµРґРѕРјР»РµРЅРёР№ (settings.md В§1.2, REQ-048) ----

/// Р“СЂР°РЅСѓР»СЏСЂРЅС‹Рµ С‚СѓРјР±Р»РµСЂС‹ push-РєР°С‚РµРіРѕСЂРёР№ РґР»СЏ РїР°СЂС‹ (РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ Г— РћРЎР).
/// РҐСЂР°РЅРёС‚СЃСЏ РїРѕРґ RLS: РїРѕР»СЊР·РѕРІР°С‚РµР»СЊ РІРёРґРёС‚/СЂРµРґР°РєС‚РёСЂСѓРµС‚ С‚РѕР»СЊРєРѕ СЃРІРѕРё СЃС‚СЂРѕРєРё РІРЅСѓС‚СЂРё РћРЎР.
/// Р—Р°РїРёСЃСЊ СЃРѕР·РґР°С‘С‚СЃСЏ РїСЂРё РїРµСЂРІРѕРј РѕР±СЂР°С‰РµРЅРёРё (upsert), РґРµС„РѕР»С‚С‹ вЂ” РІСЃС‘ РІРєР»СЋС‡РµРЅРѕ.
model NotificationPreference {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  osiId          String   @map("osi_id") @db.Uuid
  userId         String   @map("user_id") @db.Uuid
  /// РћР±СЉСЏРІР»РµРЅРёСЏ РґРѕРјР° (NotificationType.ANNOUNCEMENT)
  announcements  Boolean  @default(true)
  /// РР·РјРµРЅРµРЅРёСЏ СЃС‚Р°С‚СѓСЃР° Р·Р°СЏРІРѕРє (NotificationType.REQUEST_*)
  requestUpdates Boolean  @default(true) @map("request_updates")
  /// РќРѕРІС‹Рµ РЅР°С‡РёСЃР»РµРЅРёСЏ (NotificationType.CHARGE_CREATED)
  charges        Boolean  @default(true)
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([osiId, userId])
  @@index([osiId])
  @@map("notification_preference")
}



---
FILE: D:\fixlypwa\web\pwa\README.md
---
# CODING AGENTS: READ THIS FIRST

This is a **handoff bundle** from Claude Design (claude.ai/design).

A user mocked up designs in HTML/CSS/JS using an AI design tool, then exported this bundle so a coding agent can implement the designs for real.

## What you should do вЂ” IMPORTANT

**Read `pwa/project/Р”РѕРј В· PWA РґРёР·Р°Р№РЅ.dc.html` in full.** The user had this file open when they triggered the handoff, so it's almost certainly the primary design they want built. Read it top to bottom вЂ” don't skim. Then **follow its imports**: open every file it pulls in (shared components, CSS, scripts) so you understand how the pieces fit together before you start implementing.

**If anything is ambiguous, ask the user to confirm before you start implementing.** It's much cheaper to clarify scope up front than to build the wrong thing.

## About the design files

The design medium is **HTML/CSS/JS** вЂ” these are prototypes, not production code. Your job is to **recreate them pixel-perfectly** in whatever technology makes sense for the target codebase (React, Vue, native, whatever fits). Match the visual output; don't copy the prototype's internal structure unless it happens to fit.

**Don't render these files in a browser or take screenshots unless the user asks you to.** Everything you need вЂ” dimensions, colors, layout rules вЂ” is spelled out in the source. Read the HTML and CSS directly; a screenshot won't tell you anything they don't.

## Bundle contents

- `pwa/README.md` вЂ” this file
- `pwa/project/` вЂ” the `PWA РґРёР·Р°Р№РЅ С‚СЂРµР±РѕРІР°РЅРёСЏ` project files (HTML prototypes, assets, components)



---
FILE: D:\fixlypwa\web\scripts\approve-master.ts
---
import { PrismaClient, MasterStatus } from "@prisma/client";
import { normalizeKzPhone } from "../src/lib/phone";

// Р СѓС‡РЅРѕРµ РѕРґРѕР±СЂРµРЅРёРµ Р°РЅРєРµС‚С‹ РјР°СЃС‚РµСЂР° (Q-053) вЂ” РґРѕ РїРѕСЏРІР»РµРЅРёСЏ Р°РґРјРёРЅРєРё (ADR-0008). РЎСѓРїРµСЂРїРѕР»СЊР·РѕРІР°С‚РµР»СЊ
// (DIRECT_URL) вЂ” Master identity-С‚Р°Р±Р»РёС†Р° РІРЅРµ RLS, РЅРѕ РёСЃРїРѕР»СЊР·СѓРµРј DIRECT_URL РґР»СЏ РєРѕРЅСЃРёСЃС‚РµРЅС‚РЅРѕСЃС‚Рё
// СЃ РѕСЃС‚Р°Р»СЊРЅС‹РјРё СЃРєСЂРёРїС‚Р°РјРё (bootstrap/seed).
//
// РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ:
//   npx tsx scripts/approve-master.ts +77011234567           # в†’ APPROVED
//   npx tsx scripts/approve-master.ts +77011234567 REJECTED  # в†’ Р»СЋР±РѕР№ СЃС‚Р°С‚СѓСЃ MasterStatus

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const [rawPhone, rawStatus] = process.argv.slice(2);
  if (!rawPhone) {
    console.error("РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ: npx tsx scripts/approve-master.ts <С‚РµР»РµС„РѕРЅ> [STATUS]");
    process.exitCode = 1;
    return;
  }

  const phone = normalizeKzPhone(rawPhone);
  if (!phone) {
    console.error(`РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ РЅРѕРјРµСЂ С‚РµР»РµС„РѕРЅР°: ${rawPhone}`);
    process.exitCode = 1;
    return;
  }

  const status = (rawStatus ?? "APPROVED") as MasterStatus;
  if (!Object.values(MasterStatus).includes(status)) {
    console.error(`РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ СЃС‚Р°С‚СѓСЃ: ${rawStatus}. Р”РѕРїСѓСЃС‚РёРјРѕ: ${Object.values(MasterStatus).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    console.error(`РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ СЃ С‚РµР»РµС„РѕРЅРѕРј ${phone} РЅРµ РЅР°Р№РґРµРЅ`);
    process.exitCode = 1;
    return;
  }

  const master = await prisma.master.findUnique({ where: { userId: user.id } });
  if (!master) {
    console.error(`РђРЅРєРµС‚Р° РјР°СЃС‚РµСЂР° РґР»СЏ ${phone} РЅРµ РЅР°Р№РґРµРЅР° вЂ” СЃРЅР°С‡Р°Р»Р° СЂРµРіРёСЃС‚СЂР°С†РёСЏ С‡РµСЂРµР· /register?role=master`);
    process.exitCode = 1;
    return;
  }

  const updated = await prisma.master.update({ where: { id: master.id }, data: { status } });
  console.log(`master ${updated.id} (${phone}, ${updated.fullName}, РіРѕСЂРѕРґ ${updated.city}) в†’ ${updated.status}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());



---
FILE: D:\fixlypwa\web\scripts\db-bootstrap.ts
---
import { PrismaClient } from "@prisma/client";

// Р—Р°РјРµРЅСЏРµС‚ РїР»РµР№СЃС…РѕР»РґРµСЂ-РїР°СЂРѕР»Рё СЂРѕР»РµР№ Р‘Р” (prisma/migrations/..._rls_policies СЃРѕР·РґР°С‘С‚ app_login Рё
// app_superadmin СЃ 'CHANGE_ME_IN_DEPLOY') РЅР° СЂРµР°Р»СЊРЅС‹Рµ СЃРµРєСЂРµС‚С‹ РёР· РѕРєСЂСѓР¶РµРЅРёСЏ РґРµРїР»РѕСЏ
// (prisma/README.md, NFR-053: СЃРµРєСЂРµС‚С‹ РІРЅРµ СЂРµРїРѕ). Р—Р°РїСѓСЃРєР°РµС‚СЃСЏ РџРћРЎР›Р• `prisma migrate deploy`
// СЃСѓРїРµСЂРїРѕР»СЊР·РѕРІР°С‚РµР»РµРј (DIRECT_URL), С‚.Рє. ALTER ROLE С‚СЂРµР±СѓРµС‚ РїСЂР°РІ РЅР° СЂРѕР»Рё.
//
// РџР°СЂРѕР»Рё вЂ” DDL, РёС… РЅРµР»СЊР·СЏ РїР°СЂР°РјРµС‚СЂРёР·РѕРІР°С‚СЊ; СЌРєСЂР°РЅРёСЂСѓРµРј РѕРґРёРЅР°СЂРЅС‹Рµ РєР°РІС‹С‡РєРё. Р—РЅР°С‡РµРЅРёСЏ РїСЂРёС…РѕРґСЏС‚
// РёР· РєРѕРЅС‚СЂРѕР»РёСЂСѓРµРјРѕРіРѕ РѕРєСЂСѓР¶РµРЅРёСЏ РґРµРїР»РѕСЏ, РЅРµ РёР· РїРѕР»СЊР·РѕРІР°С‚РµР»СЊСЃРєРѕРіРѕ РІРІРѕРґР°.

function sqlQuote(value: string): string {
  return value.replace(/'/g, "''");
}

async function main(): Promise<void> {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("db-bootstrap: DIRECT_URL/DATABASE_URL РЅРµ Р·Р°РґР°РЅ");

  const appPassword = process.env.APP_DB_PASSWORD;
  if (!appPassword) {
    throw new Error("db-bootstrap: APP_DB_PASSWORD РЅРµ Р·Р°РґР°РЅ (РїР°СЂРѕР»СЊ СЂРѕР»Рё app_login)");
  }
  const superPassword = process.env.APP_SUPERADMIN_PASSWORD ?? appPassword;

  const prisma = new PrismaClient({ datasourceUrl: url });
  try {
    await prisma.$executeRawUnsafe(
      `ALTER ROLE app_login LOGIN PASSWORD '${sqlQuote(appPassword)}'`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER ROLE app_superadmin LOGIN PASSWORD '${sqlQuote(superPassword)}'`,
    );
    console.log("db-bootstrap: РїР°СЂРѕР»Рё СЂРѕР»РµР№ app_login/app_superadmin РѕР±РЅРѕРІР»РµРЅС‹");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("db-bootstrap failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});



---
FILE: D:\fixlypwa\web\scripts\make-superadmin.ts
---
import { PrismaClient } from "@prisma/client";
import { parseIdentifier } from "../src/lib/identifier";

// РќР°Р·РЅР°С‡РµРЅРёРµ/СЃРЅСЏС‚РёРµ СЃСѓРїРµСЂР°РґРјРёРЅР° РїР»Р°С‚С„РѕСЂРјС‹ (ADR-0008, REQ-110). Р•Р”РРќРЎРўР’Р•РќРќР«Р™ РїСѓС‚СЊ РјСѓС‚Р°С†РёРё
// User.isSuperadmin вЂ” РёР· РІРµР±-РїСЂРёР»РѕР¶РµРЅРёСЏ РїРѕР»Рµ РЅРµ РёР·РјРµРЅСЏРµС‚СЃСЏ РЅРёРіРґРµ (РЅРµС‚ РїСѓС‚Рё СЌСЃРєР°Р»Р°С†РёРё РёР· РІРµР±Р°).
// DIRECT_URL вЂ” РєРѕРЅСЃРёСЃС‚РµРЅС‚РЅРѕ СЃ РѕСЃС‚Р°Р»СЊРЅС‹РјРё СЃРєСЂРёРїС‚Р°РјРё РѕР±СЃР»СѓР¶РёРІР°РЅРёСЏ (bootstrap/seed/approve-master).
//
// РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ (С‚РµР»РµС„РѕРЅ РёР»Рё email вЂ” auth-email.md):
//   npx tsx scripts/make-superadmin.ts +77011234567          # в†’ isSuperadmin = true
//   npx tsx scripts/make-superadmin.ts rahim@example.kz      # в†’ isSuperadmin = true
//   npx tsx scripts/make-superadmin.ts rahim@example.kz off  # в†’ isSuperadmin = false
//
// РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ РґРѕР»Р¶РµРЅ СѓР¶Рµ СЃСѓС‰РµСЃС‚РІРѕРІР°С‚СЊ (РѕР±С‹С‡РЅР°СЏ СЂРµРіРёСЃС‚СЂР°С†РёСЏ РїРѕ РєРѕРґСѓ РёР»Рё СЃРёРґ) вЂ”
// СЃРєСЂРёРїС‚ РЅРµ СЃРѕР·РґР°С‘С‚ Р°РєРєР°СѓРЅС‚РѕРІ, С‚РѕР»СЊРєРѕ РїРѕРјРµС‡Р°РµС‚ СЃСѓС‰РµСЃС‚РІСѓСЋС‰РёР№.

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

async function main() {
  const [rawIdentifier, mode] = process.argv.slice(2);
  if (!rawIdentifier) {
    console.error("РСЃРїРѕР»СЊР·РѕРІР°РЅРёРµ: npx tsx scripts/make-superadmin.ts <С‚РµР»РµС„РѕРЅ|email> [off]");
    process.exitCode = 1;
    return;
  }

  const identifier = parseIdentifier(rawIdentifier);
  if (!identifier) {
    console.error(`РќРµРєРѕСЂСЂРµРєС‚РЅС‹Р№ С‚РµР»РµС„РѕРЅ РёР»Рё email: ${rawIdentifier}`);
    process.exitCode = 1;
    return;
  }

  const isSuperadmin = mode !== "off";
  const where =
    identifier.kind === "email" ? { email: identifier.value } : { phone: identifier.value };
  const user = await prisma.user.findUnique({ where });
  if (!user) {
    console.error(
      `РџРѕР»СЊР·РѕРІР°С‚РµР»СЊ ${identifier.value} РЅРµ РЅР°Р№РґРµРЅ вЂ” СЃРЅР°С‡Р°Р»Р° РѕР±С‹С‡РЅР°СЏ СЂРµРіРёСЃС‚СЂР°С†РёСЏ/РІС…РѕРґ`,
    );
    process.exitCode = 1;
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isSuperadmin },
  });
  console.log(`user ${updated.id} (${identifier.value}) в†’ isSuperadmin=${updated.isSuperadmin}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());



---
FILE: D:\fixlypwa\web\scripts\seed-demo.ts
---
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/password";

// Р”РµРјРѕ-РґР°РЅРЅС‹Рµ РґР»СЏ Р»РѕРєР°Р»СЊРЅРѕР№ СЂР°Р·СЂР°Р±РѕС‚РєРё/РїРѕРєР°Р·Р°. РРґРµРјРїРѕС‚РµРЅС‚РЅРѕ: РїРѕРІС‚РѕСЂРЅС‹Р№ Р·Р°РїСѓСЃРє РЅРµ РїР»РѕРґРёС‚ РґСѓР±Р»Рё.
// РЎРµРµС‚ СЃСѓРїРµСЂРїРѕР»СЊР·РѕРІР°С‚РµР»РµРј (DIRECT_URL) вЂ” РѕР±С…РѕРґРёС‚ RLS, РїРѕСЌС‚РѕРјСѓ osiId РїСЂРѕСЃС‚Р°РІР»СЏРµС‚СЃСЏ СЏРІРЅРѕ.
//
// Р”РµРјРѕ-РґРѕСЃС‚СѓРїС‹:
//   РџСЂРµРґСЃРµРґР°С‚РµР»СЊ: demo@osi.kz / demo12345 (РІС…РѕРґ С‡РµСЂРµР· /login?role=chairman)
//   Р–РёС‚РµР»СЊ:       +77010000001            (РІС…РѕРґ РїРѕ OTP С‡РµСЂРµР· /login; РєРѕРґ РїРµС‡Р°С‚Р°РµС‚СЃСЏ РІ Р»РѕРі СЃРµСЂРІРµСЂР°)

const prisma = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const CHAIR_EMAIL = "demo@osi.kz";
const CHAIR_PHONE = "+77015550000";
// Р РµР°Р»СЊРЅС‹Р№ РЅРѕРјРµСЂ+С‡Р°С‚ РґРµРјРѕ-Р¶РёС‚РµР»СЏ вЂ” С‡РёС‚Р°РµРј РёР· env, РќР• С…Р°СЂРґРєРѕРґРёРј (review 2026-07-22: СЌС‚Рѕ Р»РёС‡РЅС‹Рµ
// РґР°РЅРЅС‹Рµ РєРѕРЅРєСЂРµС‚РЅРѕРіРѕ С‡РµР»РѕРІРµРєР°, coР·РґР°С‚РµР»СЊ СЂРµРїРѕР·РёС‚РѕСЂРёСЏ РЅРµ РѕР±СЏР·Р°РЅ РёРјРё РґРµР»РёС‚СЊСЃСЏ). Р—Р°РґР°РЅС‹ РІ
// web/.env (РЅРµ РєРѕРјРјРёС‚РёС‚СЃСЏ, СЃРј. .env.example) вЂ” Р±РµР· РЅРёС… СЂРµР·РёРґРµРЅС‚ СЃРёРґРёС‚СЃСЏ СЃ fake-РЅРѕРјРµСЂРѕРј Р±РµР·
// Telegram-РїСЂРёРІСЏР·РєРё (РЅСѓР¶РЅРѕ Р±СѓРґРµС‚ РїСЂРѕР№С‚Рё /start+В«РџРѕРґРµР»РёС‚СЊСЃСЏ РЅРѕРјРµСЂРѕРјВ» РІСЂСѓС‡РЅСѓСЋ РІ @fixlyosibot).
const RESIDENT_PHONE = process.env.SEED_RESIDENT_PHONE || "+77010000001";
const RESIDENT_TELEGRAM_CHAT_ID = process.env.SEED_RESIDENT_TG_CHAT || null;
const OSI_NAME = "РћРЎР Р”РµРјРѕ (РљРѕРєС€РµС‚Р°Сѓ)";

async function main() {
  const chair = await prisma.user.upsert({
    where: { email: CHAIR_EMAIL },
    update: { passwordHash: hashPassword("demo12345") },
    create: {
      email: CHAIR_EMAIL,
      phone: CHAIR_PHONE,
      passwordHash: hashPassword("demo12345"),
    },
  });

  // Р’РѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј РїСЂРёРІСЏР·РєСѓ Р”Рћ СЂР°РЅРЅРµРіРѕ return РЅРёР¶Рµ (СЃСѓС‰РµСЃС‚РІСѓСЋС‰Р°СЏ РћРЎР РїСЂРµСЂС‹РІР°РµС‚ С„СѓРЅРєС†РёСЋ) вЂ”
  // РёРЅР°С‡Рµ РїРѕРІС‚РѕСЂРЅС‹Р№ СЃРёРґ РЅР° РЅРµРїСѓСЃС‚РѕР№ Р‘Р” РјРѕР»С‡Р° РїСЂРѕРїСѓСЃС‚РёР» Р±С‹ РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёРµ РїСЂРёРІСЏР·РєРё. РўРѕР»СЊРєРѕ РµСЃР»Рё
  // Р·Р°РґР°РЅР° РІ env (СЃРј. РєРѕРјРјРµРЅС‚Р°СЂРёР№ Сѓ RESIDENT_TELEGRAM_CHAT_ID РІС‹С€Рµ).
  if (RESIDENT_TELEGRAM_CHAT_ID) {
    await prisma.telegramLink.upsert({
      where: { phone: RESIDENT_PHONE },
      update: { chatId: RESIDENT_TELEGRAM_CHAT_ID },
      create: { phone: RESIDENT_PHONE, chatId: RESIDENT_TELEGRAM_CHAT_ID },
    });
  }

  const existing = await prisma.osi.findFirst({ where: { name: OSI_NAME } });
  if (existing) {
    console.log(`seed: РґРµРјРѕ-РћРЎР СѓР¶Рµ СЃСѓС‰РµСЃС‚РІСѓРµС‚ (${existing.id}) вЂ” РїСЂРѕРїСѓСЃРєР°СЋ СЃС‚СЂСѓРєС‚СѓСЂСѓ`);
    await prisma.$disconnect();
    return;
  }

  const osi = await prisma.osi.create({
    data: { name: OSI_NAME, bin: "080840000000", address: "Рі. РљРѕРєС€РµС‚Р°Сѓ, СѓР». РђР±Р°СЏ, 1" },
  });
  await prisma.userOsiRole.create({
    data: { userId: chair.id, osiId: osi.id, role: "CHAIRMAN" },
  });

  const building = await prisma.building.create({
    data: { osiId: osi.id, address: "СѓР». РђР±Р°СЏ, 1", apartmentsCount: 2, builtYear: 2015 },
  });

  const apt1 = await prisma.apartment.create({
    data: { osiId: osi.id, buildingId: building.id, number: "1", area: "48.5" },
  });
  await prisma.apartment.create({
    data: { osiId: osi.id, buildingId: building.id, number: "2", area: "62.0" },
  });

  const resident = await prisma.user.upsert({
    where: { phone: RESIDENT_PHONE },
    update: {},
    create: { phone: RESIDENT_PHONE },
  });
  await prisma.userOsiRole.upsert({
    where: { userId_osiId: { userId: resident.id, osiId: osi.id } },
    update: {},
    create: { userId: resident.id, osiId: osi.id, role: "RESIDENT" },
  });
  await prisma.occupant.upsert({
    where: { userId: resident.id },
    update: { apartmentId: apt1.id },
    create: {
      osiId: osi.id,
      apartmentId: apt1.id,
      userId: resident.id,
      fullName: "РРІР°РЅ Р–РёР»РµС†",
      phone: RESIDENT_PHONE,
    },
  });

  console.log(`seed: СЃРѕР·РґР°РЅР° РґРµРјРѕ-РћРЎР ${osi.id}`);
  console.log(`  РџСЂРµРґСЃРµРґР°С‚РµР»СЊ: ${CHAIR_EMAIL} / demo12345`);
  console.log(`  Р–РёС‚РµР»СЊ:       ${RESIDENT_PHONE} (РІС…РѕРґ РїРѕ OTP)`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("seed failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});



---
FILE: D:\fixlypwa\web\scripts\__smoke-sms.ts
---
// Р’Р Р•РњР•РќРќР«Р™ СЃРјРѕСѓРє Р”3 (СѓРґР°Р»СЏРµС‚СЃСЏ РїРѕСЃР»Рµ РїСЂРѕРіРѕРЅР°): СЂРµР°Р»СЊРЅР°СЏ РѕС‚РїСЂР°РІРєР° SMS С‡РµСЂРµР· src/lib/sms.ts
// (Mobizon, РѕР±С‰Р°СЏ РїРѕРґРїРёСЃСЊ). Env Р·Р°РґР°С‘С‚СЃСЏ РїСЂРё Р·Р°РїСѓСЃРєРµ, .env РЅРµ С‚СЂРѕРіР°РµРј.
import { sendSms } from "../src/lib/sms";
import { normalizeKzPhone } from "../src/lib/phone";

async function main() {
  const phone = normalizeKzPhone("87713730882");
  if (!phone) throw new Error("РЅРѕРјРµСЂ РЅРµ РЅРѕСЂРјР°Р»РёР·РѕРІР°Р»СЃСЏ");
  console.log("РѕС‚РїСЂР°РІРєР° РЅР°", phone);
  const started = Date.now();
  await sendSms(phone, "РљРѕРґ РґР»СЏ РІС…РѕРґР° РІ РћРЎР: 123456. Р”РµР№СЃС‚РІСѓРµС‚ 5 РјРёРЅ. (СЃРјРѕСѓРє Р”3)");
  console.log(`sent ok in ${Date.now() - started}ms`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("SEND FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  },
);



