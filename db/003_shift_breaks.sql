-- 003_shift_breaks.sql
-- Unpaid breaks.
--
-- NOT APPLIED. Read it, then paste it into Supabase -> SQL Editor -> Run.
-- It is additive and safe: one new column with a default of 0, so every shift that
-- exists today keeps the exact hours it has now.
--
-- WHY
-- A shift stored a start and an end and nothing else, so an eight-hour shift with a
-- half-hour unpaid break counted as eight paid hours. Every labour figure in the app --
-- the weekly cost, the percentage of sales, the overtime threshold -- was therefore
-- high by the length of the breaks. Thirty minutes a shift across sixteen people is
-- not a rounding error.
--
-- The app works with or without this column: it checks once whether the column is
-- there, and simply does not offer the field if it is not. Running this turns it on.

ALTER TABLE public.shifts
  ADD COLUMN IF NOT EXISTS break_min integer NOT NULL DEFAULT 0;

-- Nobody's break is negative, and nobody's break is longer than a day.
ALTER TABLE public.shifts
  DROP CONSTRAINT IF EXISTS shifts_break_min_sane;
ALTER TABLE public.shifts
  ADD CONSTRAINT shifts_break_min_sane CHECK (break_min >= 0 AND break_min <= 480);

-- TO UNDO:
--   ALTER TABLE public.shifts DROP COLUMN IF EXISTS break_min;
