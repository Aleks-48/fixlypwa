-- Расширяем market_read (миграция 20260705073011): мастер должен видеть листинг НЕ только
-- пока он PUBLISHED в его городе, но и ЛЮБОЙ листинг, на который он когда-либо откликнулся —
-- иначе после принятия отклика (статус уходит в TAKEN) собственная история мастера
-- («Мои отклики») теряет заголовок/описание заказа (listMyOffers видит listing = null,
-- см. src/lib/market/service.ts). Схема не меняется — только политика RLS.

DROP POLICY IF EXISTS market_read ON "market_listing";

CREATE POLICY market_read ON "market_listing"
  FOR SELECT
  USING (
    (status = 'PUBLISHED' AND city = nullif(current_setting('app.current_master_city', true), ''))
    OR EXISTS (
      SELECT 1 FROM "market_offer" mo
      WHERE mo.listing_id = "market_listing".id
        AND mo.master_id = nullif(current_setting('app.current_master_id', true), '')::uuid
    )
  );
