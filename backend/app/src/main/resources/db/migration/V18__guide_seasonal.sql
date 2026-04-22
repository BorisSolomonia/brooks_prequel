ALTER TABLE guides ADD COLUMN best_season_start_month SMALLINT CHECK (best_season_start_month BETWEEN 1 AND 12);
ALTER TABLE guides ADD COLUMN best_season_end_month SMALLINT CHECK (best_season_end_month BETWEEN 1 AND 12);
ALTER TABLE guides ADD COLUMN best_season_label VARCHAR(60);
