-- Quality Monitor — начальные данные

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
