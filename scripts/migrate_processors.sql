-- Миграция: переработчики молока
-- Применить:
-- Get-Content scripts\migrate_processors.sql | docker exec -i qm_postgres psql -U postgres -d quality_monitor

CREATE TABLE IF NOT EXISTS processors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    legal_address VARCHAR(500),
    actual_address VARCHAR(500),
    inn VARCHAR(12),
    kpp VARCHAR(9),
    ogrn VARCHAR(15),
    director_name VARCHAR(150),
    phone VARCHAR(50),
    email VARCHAR(150),
    notes TEXT
);

CREATE TABLE IF NOT EXISTS enterprise_processors (
    id SERIAL PRIMARY KEY,
    enterprise_id INTEGER NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
    processor_id INTEGER NOT NULL REFERENCES processors(id) ON DELETE CASCADE,
    started_at DATE,
    ended_at DATE,
    notes TEXT,
    UNIQUE (enterprise_id, processor_id)
);
