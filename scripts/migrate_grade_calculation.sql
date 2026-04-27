-- ============================================================
-- Функция расчёта сорта молока по показателям качества
-- Логика: Экстра → Спец. I → Спец. II → Вне специфики
-- NULL-значения не учитываются (показатель не измерялся)
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_grade(p_delivery_id INT)
RETURNS VARCHAR AS $$
DECLARE
    q  quality_results%ROWTYPE;
    ab BOOLEAN;
BEGIN
    -- Антибиотики
    SELECT has_antibiotics INTO ab FROM deliveries WHERE id = p_delivery_id;
    IF ab = TRUE THEN
        RETURN 'out';
    END IF;

    -- Показатели качества
    SELECT * INTO q FROM quality_results WHERE delivery_id = p_delivery_id;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- ── Экстра ───────────────────────────────────────────────
    IF (q.scc               IS NULL OR q.scc               <= 200        )
   AND (q.bact_count_lab    IS NULL OR q.bact_count_lab    <= 50         )
   AND (q.fat_pct           IS NULL OR q.fat_pct           >= 3.60       )
   AND (q.protein_pct       IS NULL OR q.protein_pct       >= 3.20       )
   AND (q.snf_pct           IS NULL OR q.snf_pct           >= 8.20       )
   AND (q.density           IS NULL OR q.density           >= 1027       )
   AND (q.coliforms         IS NULL OR q.coliforms         <= 100        )
   AND (q.fatty_acids       IS NULL OR q.fatty_acids       <= 0.80       )
   AND (q.clostridium_spores IS NULL OR q.clostridium_spores <= 1000     )
   AND (q.freeze_point_lab  IS NULL OR (q.freeze_point_lab >= 520
                                    AND q.freeze_point_lab <= 560)       )
   AND (q.temperature_lab   IS NULL OR (q.temperature_lab  >= 2
                                    AND q.temperature_lab  <= 4)         )
   AND (q.organoleptic_lab  IS NULL OR q.organoleptic_lab  >= 5          )
   AND (q.acidity           IS NULL OR (q.acidity          >= 16
                                    AND q.acidity          <= 18)        )
    THEN
        RETURN 'E';
    END IF;

    -- ── Спец. I ──────────────────────────────────────────────
    IF (q.scc               IS NULL OR q.scc               <= 400        )
   AND (q.bact_count_lab    IS NULL OR q.bact_count_lab    <= 100        )
   AND (q.fat_pct           IS NULL OR q.fat_pct           >= 3.40       )
   AND (q.protein_pct       IS NULL OR q.protein_pct       >= 3.00       )
   AND (q.snf_pct           IS NULL OR q.snf_pct           >= 8.20       )
   AND (q.density           IS NULL OR q.density           >= 1027       )
   AND (q.coliforms         IS NULL OR q.coliforms         <= 200        )
   AND (q.clostridium_spores IS NULL OR q.clostridium_spores <= 3500     )
   AND (q.freeze_point_lab  IS NULL OR (q.freeze_point_lab >= 512
                                    AND q.freeze_point_lab <= 560)       )
   AND (q.temperature_lab   IS NULL OR (q.temperature_lab  >= 2
                                    AND q.temperature_lab  <= 6)         )
   AND (q.organoleptic_lab  IS NULL OR q.organoleptic_lab  >= 4          )
   AND (q.acidity           IS NULL OR (q.acidity          >= 16
                                    AND q.acidity          <= 18)        )
    THEN
        RETURN 'I';
    END IF;

    -- ── Спец. II ─────────────────────────────────────────────
    IF (q.scc               IS NULL OR q.scc               <= 500        )
   AND (q.bact_count_lab    IS NULL OR q.bact_count_lab    <= 300        )
   AND (q.fat_pct           IS NULL OR q.fat_pct           >= 2.80       )
   AND (q.protein_pct       IS NULL OR q.protein_pct       >= 2.80       )
   AND (q.coliforms         IS NULL OR q.coliforms         <= 300        )
   AND (q.clostridium_spores IS NULL OR q.clostridium_spores <= 5000     )
   AND (q.freeze_point_lab  IS NULL OR (q.freeze_point_lab >= 506
                                    AND q.freeze_point_lab <= 560)       )
   AND (q.temperature_lab   IS NULL OR (q.temperature_lab  >= 2
                                    AND q.temperature_lab  <= 10)        )
   AND (q.organoleptic_lab  IS NULL OR q.organoleptic_lab  >= 3          )
   AND (q.acidity           IS NULL OR (q.acidity          >= 16
                                    AND q.acidity          <= 21)        )
    THEN
        RETURN 'II';
    END IF;

    RETURN 'out';
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- Детальная функция: возвращает какой показатель нарушен
-- Используется для отображения причины понижения сорта
-- ============================================================

CREATE OR REPLACE FUNCTION grade_violations(p_delivery_id INT)
RETURNS TABLE(indicator VARCHAR, value NUMERIC, threshold VARCHAR, grade_affected VARCHAR) AS $$
DECLARE
    q quality_results%ROWTYPE;
BEGIN
    SELECT * INTO q FROM quality_results WHERE delivery_id = p_delivery_id;
    IF NOT FOUND THEN RETURN; END IF;

    -- SCC
    IF q.scc IS NOT NULL THEN
        IF q.scc > 500 THEN
            RETURN QUERY SELECT 'scc'::VARCHAR, q.scc, '> 500 (Вне специф.)'::VARCHAR, 'out'::VARCHAR;
        ELSIF q.scc > 400 THEN
            RETURN QUERY SELECT 'scc'::VARCHAR, q.scc, '> 400 (Спец. I)'::VARCHAR, 'I'::VARCHAR;
        ELSIF q.scc > 200 THEN
            RETURN QUERY SELECT 'scc'::VARCHAR, q.scc, '> 200 (Экстра)'::VARCHAR, 'E'::VARCHAR;
        END IF;
    END IF;

    -- КМАФАнМ
    IF q.bact_count_lab IS NOT NULL THEN
        IF q.bact_count_lab > 300 THEN
            RETURN QUERY SELECT 'bact_count_lab'::VARCHAR, q.bact_count_lab, '> 300'::VARCHAR, 'out'::VARCHAR;
        ELSIF q.bact_count_lab > 100 THEN
            RETURN QUERY SELECT 'bact_count_lab'::VARCHAR, q.bact_count_lab, '> 100'::VARCHAR, 'I'::VARCHAR;
        ELSIF q.bact_count_lab > 50 THEN
            RETURN QUERY SELECT 'bact_count_lab'::VARCHAR, q.bact_count_lab, '> 50'::VARCHAR, 'E'::VARCHAR;
        END IF;
    END IF;

    -- Жир
    IF q.fat_pct IS NOT NULL AND q.fat_pct < 2.80 THEN
        RETURN QUERY SELECT 'fat_pct'::VARCHAR, q.fat_pct, '< 2.80'::VARCHAR, 'out'::VARCHAR;
    ELSIF q.fat_pct IS NOT NULL AND q.fat_pct < 3.40 THEN
        RETURN QUERY SELECT 'fat_pct'::VARCHAR, q.fat_pct, '< 3.40'::VARCHAR, 'I'::VARCHAR;
    ELSIF q.fat_pct IS NOT NULL AND q.fat_pct < 3.60 THEN
        RETURN QUERY SELECT 'fat_pct'::VARCHAR, q.fat_pct, '< 3.60'::VARCHAR, 'E'::VARCHAR;
    END IF;

    -- Белок
    IF q.protein_pct IS NOT NULL AND q.protein_pct < 2.80 THEN
        RETURN QUERY SELECT 'protein_pct'::VARCHAR, q.protein_pct, '< 2.80'::VARCHAR, 'out'::VARCHAR;
    ELSIF q.protein_pct IS NOT NULL AND q.protein_pct < 3.00 THEN
        RETURN QUERY SELECT 'protein_pct'::VARCHAR, q.protein_pct, '< 3.00'::VARCHAR, 'I'::VARCHAR;
    ELSIF q.protein_pct IS NOT NULL AND q.protein_pct < 3.20 THEN
        RETURN QUERY SELECT 'protein_pct'::VARCHAR, q.protein_pct, '< 3.20'::VARCHAR, 'E'::VARCHAR;
    END IF;

    -- Клостридии
    IF q.clostridium_spores IS NOT NULL THEN
        IF q.clostridium_spores > 5000 THEN
            RETURN QUERY SELECT 'clostridium_spores'::VARCHAR, q.clostridium_spores, '> 5000'::VARCHAR, 'out'::VARCHAR;
        ELSIF q.clostridium_spores > 3500 THEN
            RETURN QUERY SELECT 'clostridium_spores'::VARCHAR, q.clostridium_spores, '> 3500'::VARCHAR, 'I'::VARCHAR;
        ELSIF q.clostridium_spores > 1000 THEN
            RETURN QUERY SELECT 'clostridium_spores'::VARCHAR, q.clostridium_spores, '> 1000'::VARCHAR, 'E'::VARCHAR;
        END IF;
    END IF;

    -- БГКП
    IF q.coliforms IS NOT NULL THEN
        IF q.coliforms > 300 THEN
            RETURN QUERY SELECT 'coliforms'::VARCHAR, q.coliforms, '> 300'::VARCHAR, 'out'::VARCHAR;
        ELSIF q.coliforms > 200 THEN
            RETURN QUERY SELECT 'coliforms'::VARCHAR, q.coliforms, '> 200'::VARCHAR, 'I'::VARCHAR;
        ELSIF q.coliforms > 100 THEN
            RETURN QUERY SELECT 'coliforms'::VARCHAR, q.coliforms, '> 100'::VARCHAR, 'E'::VARCHAR;
        END IF;
    END IF;

    -- Точка замерзания
    IF q.freeze_point_lab IS NOT NULL AND (q.freeze_point_lab < 506 OR q.freeze_point_lab > 560) THEN
        RETURN QUERY SELECT 'freeze_point_lab'::VARCHAR, q.freeze_point_lab, 'вне 506-560'::VARCHAR, 'out'::VARCHAR;
    ELSIF q.freeze_point_lab IS NOT NULL AND q.freeze_point_lab < 512 THEN
        RETURN QUERY SELECT 'freeze_point_lab'::VARCHAR, q.freeze_point_lab, '< 512'::VARCHAR, 'I'::VARCHAR;
    ELSIF q.freeze_point_lab IS NOT NULL AND q.freeze_point_lab < 520 THEN
        RETURN QUERY SELECT 'freeze_point_lab'::VARCHAR, q.freeze_point_lab, '< 520'::VARCHAR, 'E'::VARCHAR;
    END IF;

END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- VIEW: поставки с рассчитанным сортом
-- ============================================================

CREATE OR REPLACE VIEW deliveries_graded AS
SELECT
    d.*,
    calculate_grade(d.id) AS calculated_grade
FROM deliveries d;
