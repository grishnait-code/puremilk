from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5433/quality_monitor"
    app_title: str = "Quality Monitor API"
    app_version: str = "1.0.0"
    debug: bool = False

    class Config:
        env_file = ".env"


settings = Settings()
