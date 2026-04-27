-- Quality Monitor — начальные данные

CREATE TABLE IF NOT EXISTS targets (
    id          SERIAL PRIMARY KEY,
    enterprise_id INTEGER,
    indicator   VARCHAR(50) NOT NULL,
    value_min   NUMERIC,
    value_max   NUMERIC,
    valid_from  DATE,
    valid_to    DATE,
    notes       TEXT
);

CREATE TABLE IF NOT EXISTS grade_standards (
    id          SERIAL PRIMARY KEY,
    grade       VARCHAR(10) NOT NULL,
    indicator   VARCHAR(50) NOT NULL,
    value_min   NUMERIC,
    value_max   NUMERIC,
    unit        VARCHAR(30),
    valid_from  DATE,
    valid_to    DATE,
    source      VARCHAR(100)
);

-- Целевые значения показателей (глобальные)
INSERT INTO targets (indicator, value_max, valid_from, notes) VALUES
  ('scc',               200,  '2017-01-01', 'ГОСТ 31449-2013 Экстра'),
  ('bact_count',         50,  '2017-01-01', 'ГОСТ 31449-2013 Экстра'),
  ('coliforms',         100,  '2017-01-01', NULL),
  ('clostridium_spores',1000, '2017-01-01', NULL),
  ('fatty_acids',      0.80,  '2017-01-01', NULL),
  ('urea',               30,  '2017-01-01', 'верхняя граница')
ON CONFLICT DO NOTHING;

INSERT INTO targets (indicator, value_min, valid_from, notes) VALUES
  ('fat_pct',     3.6, '2017-01-01', 'Базис 3.6%'),
  ('protein_pct', 3.2, '2017-01-01', NULL),
  ('freeze_point',520, '2017-01-01', 'нижняя граница (более отрицательное)')
ON CONFLICT DO NOTHING;

-- Нормативы сортности (ГОСТ 31449-2013)
INSERT INTO grade_standards (grade, indicator, value_max, unit, valid_from, source) VALUES
  ('Экстра', 'scc',       200,  'тыс. ед./мл', '2017-01-01', 'ГОСТ 31449-2013'),
  ('Высший', 'scc',       400,  'тыс. ед./мл', '2017-01-01', 'ГОСТ 31449-2013'),
  ('Первый', 'scc',       600,  'тыс. ед./мл', '2017-01-01', 'ГОСТ 31449-2013'),
  ('Экстра', 'bact_count', 100, 'тыс. КОЕ/мл', '2017-01-01', 'ГОСТ 31449-2013'),
  ('Высший', 'bact_count', 300, 'тыс. КОЕ/мл', '2017-01-01', 'ГОСТ 31449-2013'),
  ('Первый', 'bact_count', 500, 'тыс. КОЕ/мл', '2017-01-01', 'ГОСТ 31449-2013')
ON CONFLICT DO NOTHING;
