/*
  # Clean duplicate halls and re-seed UCC halls

  1. Changes
    - Remove all duplicate hall entries
    - Re-insert 9 unique UCC halls with correct metadata
    - Halls: Atlantic, Oguaa, Adehye, Casely Hayford, Kwame Nkrumah, Valco, SRC, PSI, Alumni

  2. Notes
    - Each hall gets a unique entry with correct type, category, and capacity
    - No dependent data exists in hall_members/hall_posts/hall_events (0 rows)
*/

DO $$
BEGIN
  IF (SELECT count(*) FROM hall_members) = 0
     AND (SELECT count(*) FROM hall_posts) = 0
     AND (SELECT count(*) FROM hall_events) = 0 THEN

    DELETE FROM halls;

    INSERT INTO halls (name, short_name, hall_type, hall_category, capacity, is_graduate, is_active) VALUES
      ('Atlantic Hall', 'ATL', 'mixed', 'traditional', 1200, false, true),
      ('Oguaa Hall', 'Oguaa', 'mixed', 'traditional', 1000, false, true),
      ('Adehye Hall', 'Adehye', 'female', 'traditional', 800, false, true),
      ('Casely Hayford Hall', 'Casford', 'male', 'traditional', 900, false, true),
      ('Kwame Nkrumah Hall', 'KNH', 'male', 'traditional', 850, false, true),
      ('Valco Hall', 'Valco', 'mixed', 'traditional', 700, false, true),
      ('SRC Hall', 'SRC', 'mixed', 'src', 600, false, true),
      ('PSI Hall', 'PSI', 'mixed', 'src', 500, false, true),
      ('Alumni Hall', 'Alumni', 'mixed', 'graduate', 400, true, true);
  END IF;
END $$;
