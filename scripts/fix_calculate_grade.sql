-- Исправление: переменная grade переименована в cur_grade
-- чтобы не конфликтовать с колонкой grade_standards.grade

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

    FOREACH cur_grade IN ARRAY ARRAY['E', 'I', 'II'] LOOP
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

CREATE OR REPLACE VIEW deliveries_graded AS
SELECT d.*, calculate_grade(d.id) AS calculated_grade
FROM deliveries d;
