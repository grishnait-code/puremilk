-- ============================================================
-- Таблица grades — настраиваемые сорта молока
-- ============================================================

CREATE TABLE IF NOT EXISTS grades (
    id           SERIAL PRIMARY KEY,
    code         VARCHAR(20)  UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    sort_order   INT          NOT NULL,
    color        VARCHAR(20)  DEFAULT '#1a3a5c',
    is_active    BOOLEAN      DEFAULT TRUE
);

-- Заполняем текущими сортами
INSERT INTO grades (code, display_name, sort_order, color) VALUES
    ('E',  'Экстра',   1, '#2e7d32'),
    ('I',  'Спец. I',  2, '#f57f17'),
    ('II', 'Спец. II', 3, '#e65100')
ON CONFLICT (code) DO NOTHING;


-- ============================================================
-- Обновляем calculate_grade: читает сорта из таблицы grades
-- ============================================================

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

    -- Перебираем активные сорта по приоритету (sort_order ASC)
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


-- ============================================================
-- Функция для создания нового сорта с пустыми нормативами
-- ============================================================

CREATE OR REPLACE FUNCTION create_grade_with_standards(
    p_code         VARCHAR,
    p_display_name VARCHAR,
    p_sort_order   INT,
    p_color        VARCHAR DEFAULT '#607d8b'
) RETURNS INT AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO grades (code, display_name, sort_order, color)
    VALUES (p_code, p_display_name, p_sort_order, p_color)
    RETURNING id INTO v_id;

    -- Создаём пустые строки нормативов для всех стандартных показателей
    INSERT INTO grade_standards (grade, indicator, unit, valid_from, name)
    SELECT p_code, indicator, unit, CURRENT_DATE, name
    FROM grade_standards
    WHERE grade = 'E'
      AND valid_to IS NULL
    ON CONFLICT DO NOTHING;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;


-- Обновляем VIEW
CREATE OR REPLACE VIEW deliveries_graded AS
SELECT d.*, calculate_grade(d.id) AS calculated_grade
FROM deliveries d;
