"""
Создание первого администратора.

Использование:
    python scripts/create_admin.py --username admin --password ВашПароль --name "Имя Фамилия"
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from app.models import Base, User

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/quality_monitor",
).replace("postgresql://", "postgresql+psycopg://")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def main():
    parser = argparse.ArgumentParser(description="Создать администратора")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--name", default=None, help="Полное имя")
    args = parser.parse_args()

    engine = create_engine(DATABASE_URL)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    existing = db.query(User).filter(User.username == args.username).first()
    if existing:
        print(f"Пользователь '{args.username}' уже существует.")
        db.close()
        return

    user = User(
        username=args.username,
        full_name=args.name,
        hashed_password=pwd_context.hash(args.password),
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    print(f"Администратор '{args.username}' создан успешно.")
    db.close()


if __name__ == "__main__":
    main()
