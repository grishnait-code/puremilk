-- ============================================================
-- PureMilk Quality Monitor — полная миграция БД
-- Запускать при первом развёртывании ПОСЛЕ того, как
-- SQLAlchemy создал основные таблицы (через Base.metadata.create_all)
--
-- Порядок применения:
--   1. Запустить backend (он создаст таблицы через create_all)
--   2. Применить этот файл:
--      cmd /c "docker exec -i qm_postgres psql -U postgres -d quality_monitor < scripts\migrate_all.sql"
--   3. Активировать сорта:
--      docker exec qm_postgres psql -U postgres -d quality_monitor -c "UPDATE grades SET is_active = TRUE WHERE is_active IS NULL;"
-- ============================================================

\echo '=== [1/6] Добавляем поле name в grade_standards ==='
ALTER TABLE grade_standards ADD COLUMN IF NOT EXISTS name VARCHAR(100);


\echo '=== [2/6] Создаём таблицу grades ==='
CREATE TABLE IF NOT EXISTS grades (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(20)  UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    sort_order   INT          NOT NULL,
    color        VARCHAR(20)  DEFAULT '#1a3a5c',
    is_active    BOOLEAN      DEFAULT TRUE
);

INSERT INTO grades (code, display_name, sort_order, color, is_active)
VALUES
    ('E',  'Экстра',   1, '#2e7d32', TRUE),
    ('I',  'Спец. I',  2, '#f57f17', TRUE),
    ('II', 'Спец. II', 3, '#e65100', TRUE)
ON CONFLICT (code) DO NOTHING;


\echo '=== [3/6] Заполняем grade_standards нормативами ГОСТ 31449-2013 ==='
DELETE FROM grade_standards;

INSERT INTO grade_standards
    (grade, indicator, value_min, value_max, unit, valid_from, source, name)
VALUES
-- Экстра
('E','scc',               NULL,  200,  'тыс. ед./мл',   '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','bact_count_lab',    NULL,   50,  'тыс. КОЕ/мл',   '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','fat_pct',           3.60, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','protein_pct',       3.20, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','snf_pct',           8.20, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','density',        1027.0,  NULL,  'кг/м³',          '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','coliforms',         NULL,  100,  'КОЕ/мл',         '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','fatty_acids',       NULL, 0.80,  NULL,             '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','clostridium_spores',NULL, 1000, 'НВЧ/л',           '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','freeze_point_lab',  520,   560,  '×10⁻³ °C',       '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','temperature_lab',     2,     4,  '°C',             '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','organoleptic_lab',    5,  NULL,  'баллы',          '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('E','acidity',            16,    18,  '°T',             '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
-- Спец. I
('I','scc',               NULL,  400,  'тыс. ед./мл',   '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','bact_count_lab',    NULL,  100,  'тыс. КОЕ/мл',   '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','fat_pct',           3.40, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','protein_pct',       3.00, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','snf_pct',           8.20, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','density',        1027.0,  NULL,  'кг/м³',          '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','coliforms',         NULL,  200,  'КОЕ/мл',         '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','clostridium_spores',NULL, 3500, 'НВЧ/л',           '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','freeze_point_lab',  512,   560,  '×10⁻³ °C',       '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','temperature_lab',     2,     6,  '°C',             '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','organoleptic_lab',    4,  NULL,  'баллы',          '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('I','acidity',            16,    18,  '°T',             '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
-- Спец. II
('II','scc',              NULL,  500,  'тыс. ед./мл',   '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','bact_count_lab',   NULL,  300,  'тыс. КОЕ/мл',   '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','fat_pct',          2.80, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','protein_pct',      2.80, NULL,  '%',              '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','coliforms',        NULL,  300,  'КОЕ/мл',         '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','clostridium_spores',NULL,5000, 'НВЧ/л',           '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','freeze_point_lab', 506,   560,  '×10⁻³ °C',       '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','temperature_lab',    2,    10,  '°C',             '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','organoleptic_lab',   3,  NULL,  'баллы',          '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013'),
('II','acidity',           16,    21,  '°T',             '2017-01-01','ГОСТ 31449-2013','ГОСТ 31449-2013');


\echo '=== [4/6] Функция calculate_grade (динамическая, row_to_json) ==='
CREATE OR REPLACE FUNCTION calculate_grade(p_delivery_id INT)
RETURNS VARCHAR AS $$
DECLARE
    ab         BOOLEAN;
    q          quality_results%ROWTYPE;
    qjson      JSONB;
    cur_grade  VARCHAR;
    passes     BOOLEAN;
    rec        RECORD;
    val        NUMERIC;
BEGIN
    SELECT has_antibiotics INTO ab FROM deliveries WHERE id = p_delivery_id;
    IF ab = TRUE THEN RETURN 'out'; END IF;

    SELECT * INTO q FROM quality_results WHERE delivery_id = p_delivery_id;
    IF NOT FOUND THEN RETURN NULL; END IF;

    qjson := row_to_json(q)::JSONB;

    FOR rec IN
        SELECT code FROM grades
        WHERE is_active = TRUE
        ORDER BY sort_order ASC
    LOOP
        cur_grade := rec.code;
        passes := TRUE;

        FOR rec IN
            SELECT indicator, value_min, value_max
            FROM grade_standards
            WHERE grade_standards.grade = cur_grade
              AND valid_to IS NULL
        LOOP
            val := (qjson->>(rec.indicator))::NUMERIC;
            IF val IS NOT NULL THEN
                IF rec.value_min IS NOT NULL AND val < rec.value_min THEN
                    passes := FALSE; EXIT;
                END IF;
                IF rec.value_max IS NOT NULL AND val > rec.value_max THEN
                    passes := FALSE; EXIT;
                END IF;
            END IF;
        END LOOP;

        IF passes THEN RETURN cur_grade; END IF;
    END LOOP;

    RETURN 'out';
END;
$$ LANGUAGE plpgsql;


\echo '=== [5/6] Функции grade_violations и create_grade_with_standards ==='
CREATE OR REPLACE FUNCTION grade_violations(p_delivery_id INT)
RETURNS TABLE(indicator VARCHAR, value NUMERIC, threshold VARCHAR, grade_affected VARCHAR) AS $$
DECLARE q quality_results%ROWTYPE;
BEGIN
    SELECT * INTO q FROM quality_results WHERE delivery_id = p_delivery_id;
    IF NOT FOUND THEN RETURN; END IF;
    IF q.scc IS NOT NULL THEN
        IF q.scc > 500 THEN RETURN QUERY SELECT 'scc'::VARCHAR,q.scc,'> 500'::VARCHAR,'out'::VARCHAR;
        ELSIF q.scc > 400 THEN RETURN QUERY SELECT 'scc'::VARCHAR,q.scc,'> 400'::VARCHAR,'I'::VARCHAR;
        ELSIF q.scc > 200 THEN RETURN QUERY SELECT 'scc'::VARCHAR,q.scc,'> 200'::VARCHAR,'E'::VARCHAR;
        END IF;
    END IF;
    IF q.bact_count_lab IS NOT NULL THEN
        IF q.bact_count_lab > 300 THEN RETURN QUERY SELECT 'bact_count_lab'::VARCHAR,q.bact_count_lab,'> 300'::VARCHAR,'out'::VARCHAR;
        ELSIF q.bact_count_lab > 100 THEN RETURN QUERY SELECT 'bact_count_lab'::VARCHAR,q.bact_count_lab,'> 100'::VARCHAR,'I'::VARCHAR;
        ELSIF q.bact_count_lab > 50 THEN RETURN QUERY SELECT 'bact_count_lab'::VARCHAR,q.bact_count_lab,'> 50'::VARCHAR,'E'::VARCHAR;
        END IF;
    END IF;
    IF q.clostridium_spores IS NOT NULL THEN
        IF q.clostridium_spores > 5000 THEN RETURN QUERY SELECT 'clostridium_spores'::VARCHAR,q.clostridium_spores,'> 5000'::VARCHAR,'out'::VARCHAR;
        ELSIF q.clostridium_spores > 3500 THEN RETURN QUERY SELECT 'clostridium_spores'::VARCHAR,q.clostridium_spores,'> 3500'::VARCHAR,'I'::VARCHAR;
        ELSIF q.clostridium_spores > 1000 THEN RETURN QUERY SELECT 'clostridium_spores'::VARCHAR,q.clostridium_spores,'> 1000'::VARCHAR,'E'::VARCHAR;
        END IF;
    END IF;
    IF q.coliforms IS NOT NULL THEN
        IF q.coliforms > 300 THEN RETURN QUERY SELECT 'coliforms'::VARCHAR,q.coliforms,'> 300'::VARCHAR,'out'::VARCHAR;
        ELSIF q.coliforms > 200 THEN RETURN QUERY SELECT 'coliforms'::VARCHAR,q.coliforms,'> 200'::VARCHAR,'I'::VARCHAR;
        ELSIF q.coliforms > 100 THEN RETURN QUERY SELECT 'coliforms'::VARCHAR,q.coliforms,'> 100'::VARCHAR,'E'::VARCHAR;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_grade_with_standards(
    p_code VARCHAR, p_display_name VARCHAR, p_sort_order INT, p_color VARCHAR DEFAULT '#607d8b'
) RETURNS INT AS $$
DECLARE v_id INT;
BEGIN
    INSERT INTO grades (code, display_name, sort_order, color)
    VALUES (p_code, p_display_name, p_sort_order, p_color) RETURNING id INTO v_id;
    INSERT INTO grade_standards (grade, indicator, unit, valid_from, name)
    SELECT p_code, indicator, unit, CURRENT_DATE, name
    FROM grade_standards WHERE grade = 'E' AND valid_to IS NULL
    ON CONFLICT DO NOTHING;
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;


\echo '=== [6/6] VIEW deliveries_graded ==='
CREATE OR REPLACE VIEW deliveries_graded AS
SELECT d.*, calculate_grade(d.id) AS calculated_grade
FROM deliveries d;


\echo '=== Готово! Все миграции применены. ==='
\echo 'Не забудьте: UPDATE grades SET is_active = TRUE WHERE is_active IS NULL;'
