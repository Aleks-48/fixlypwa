-- Restore missing schema migrations without discarding bank references or old reviews.
ALTER TABLE apartment ADD COLUMN IF NOT EXISTS rooms INTEGER;
ALTER TABLE master ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE master ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;
ALTER TABLE master_review ADD COLUMN IF NOT EXISTS author_user_id UUID;
ALTER TABLE master_review ADD COLUMN IF NOT EXISTS osi_id UUID;
ALTER TABLE master_review ALTER COLUMN osi_id DROP NOT NULL;
ALTER TABLE master_review ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE master_review ALTER COLUMN author_user_id DROP NOT NULL;

UPDATE master_review AS review
SET author_user_id = COALESCE(review.author_user_id, request.author_user_id),
    osi_id = COALESCE(review.osi_id, request.osi_id)
FROM request WHERE request.id = review.request_id;

CREATE INDEX IF NOT EXISTS master_review_master_id_idx ON master_review(master_id);
CREATE INDEX IF NOT EXISTS master_review_author_user_id_idx ON master_review(author_user_id);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_review_master_id_fkey') THEN
    ALTER TABLE master_review ADD CONSTRAINT master_review_master_id_fkey FOREIGN KEY (master_id) REFERENCES master(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_review_author_user_id_fkey') THEN
    ALTER TABLE master_review ADD CONSTRAINT master_review_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_review_request_id_fkey') THEN
    ALTER TABLE master_review ADD CONSTRAINT master_review_request_id_fkey FOREIGN KEY (request_id) REFERENCES request(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vote_user_id_fkey') THEN
    ALTER TABLE vote ADD CONSTRAINT vote_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
