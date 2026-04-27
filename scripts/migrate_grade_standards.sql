-- ============================================================
-- Миграция: настраиваемые границы сортов
-- 1. Добавляем поле name в grade_standards
-- 2. Заполняем таблицу текущими нормативами
-- 3. Переписываем calculate_grade на динамическое чтение
-- ============================================================


-- ── Шаг 1: добавляем поле name ────────────────────────────

ALTER TABLE grade_standards
    ADD COLUMN IF NOT EXISTS name VARCHAR(100);

COMMENT ON COLUMN grade_standards.name IS
    'Название набора нормативов, напр. «ГОСТ 31449-2013»';


-- ── Шаг 2: заполняем нормативами ─────────────────────────
-- valid_to = NULL означает «действует сейчас»
-- Используем INSERT ... ON CONFLICT DO NOTHING на случай
-- повторного запуска миграции

-- Удаляем старые данные если есть (от init.sql)
DELETE FROM grade_standards;

INSERT INTO grade_standards
    (grade, indicator, value_min, value_max, unit, valid_from, source, name)
VALUES

-- ── Экстра ───────────────────────────────────────────────
('E', 'scc',               NULL,  200,  'тыс. ед./мл',    '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'bact_count_lab',    NULL,   50,  'тыс. КОЕ/мл',    '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'fat_pct',           3.60, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'protein_pct',       3.20, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'snf_pct',           8.20, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'density',        1027.0, NULL,  'кг/м³',            '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'coliforms',         NULL,  100,  'КОЕ/мл',          '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'fatty_acids',       NULL, 0.80,  NULL,              '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'clostridium_spores',NULL, 1000, 'НВЧ/л',            '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'freeze_point_lab',  520,   560,  '×10⁻³ °C',        '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'temperature_lab',     2,     4,  '°C',              '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'organoleptic_lab',    5,  NULL,  'баллы',           '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('E', 'acidity',            16,    18,  '°T',              '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),

-- ── Спец. I ──────────────────────────────────────────────
('I', 'scc',               NULL,  400,  'тыс. ед./мл',    '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'bact_count_lab',    NULL,  100,  'тыс. КОЕ/мл',    '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'fat_pct',           3.40, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'protein_pct',       3.00, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'snf_pct',           8.20, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'density',        1027.0, NULL,  'кг/м³',            '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'coliforms',         NULL,  200,  'КОЕ/мл',          '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'clostridium_spores',NULL, 3500, 'НВЧ/л',            '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'freeze_point_lab',  512,   560,  '×10⁻³ °C',        '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'temperature_lab',     2,     6,  '°C',              '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'organoleptic_lab',    4,  NULL,  'баллы',           '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('I', 'acidity',            16,    18,  '°T',              '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),

-- ── Спец. II ─────────────────────────────────────────────
('II', 'scc',              NULL,  500,  'тыс. ед./мл',    '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'bact_count_lab',   NULL,  300,  'тыс. КОЕ/мл',    '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'fat_pct',          2.80, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'protein_pct',      2.80, NULL,  '%',               '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'coliforms',        NULL,  300,  'КОЕ/мл',          '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'clostridium_spores',NULL,5000, 'НВЧ/л',            '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'freeze_point_lab', 506,   560,  '×10⁻³ °C',        '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'temperature_lab',    2,    10,  '°C',              '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'organoleptic_lab',   3,  NULL,  'баллы',           '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013'),
('II', 'acidity',           16,    21,  '°T',              '2017-01-01', 'ГОСТ 31449-2013', 'ГОСТ 31449-2013');


-- ── Шаг 3: динамическая функция расчёта сорта ────────────

CREATE OR REPLACE FUNCTION calculate_grade(p_delivery_id INT)
RETURNS VARCHAR AS $$
DECLARE
    ab       BOOLEAN;
    q        quality_results%ROWTYPE;
    grade    VARCHAR;
    passes   BOOLEAN;
    rec      RECORD;
    val      NUMERIC;
BEGIN
    -- Антибиотики → сразу вне специфики
    SELECT has_antibiotics INTO ab FROM deliveries WHERE id = p_delivery_id;
    IF ab = TRUE THEN RETURN 'out'; END IF;

    -- Показатели качества
    SELECT * INTO q FROM quality_results WHERE delivery_id = p_delivery_id;
    IF NOT FOUND THEN RETURN NULL; END IF;

    -- Перебираем сорта по убыванию требований
    FOREACH grade IN ARRAY ARRAY['E', 'I', 'II'] LOOP
        passes := TRUE;

        -- Для каждого норматива этого сорта проверяем показатель
        FOR rec IN
            SELECT indicator, value_min, value_max
            FROM grade_standards
            WHERE grade_standards.grade = grade
              AND valid_to IS NULL
        LOOP
            -- Получаем значение нужного поля из quality_results
            EXECUTE format(
                'SELECT ($1).%I::NUMERIC', rec.indicator
            ) INTO val USING q;

            -- Если значение есть — проверяем границы
            IF val IS NOT NULL THEN
                IF rec.value_min IS NOT NULL AND val < rec.value_min THEN
                    passes := FALSE; EXIT;
                END IF;
                IF rec.value_max IS NOT NULL AND val > rec.value_max THEN
                    passes := FALSE; EXIT;
                END IF;
            END IF;
        END LOOP;

        IF passes THEN RETURN grade; END IF;
    END LOOP;

    RETURN 'out';
END;
$$ LANGUAGE plpgsql;


-- Обновляем VIEW
CREATE OR REPLACE VIEW deliveries_graded AS
SELECT d.*, calculate_grade(d.id) AS calculated_grade
FROM deliveries d;
