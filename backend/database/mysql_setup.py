"""Create the MySQL database if it does not exist."""

import pymysql

from config import Config


def ensure_mysql_database() -> None:
    if not Config.SQLALCHEMY_DATABASE_URI.startswith("mysql"):
        return

    conn = pymysql.connect(
        host=Config.MYSQL_HOST,
        port=Config.MYSQL_PORT,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        charset="utf8mb4",
    )
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                f"CREATE DATABASE IF NOT EXISTS `{Config.MYSQL_DATABASE}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
        conn.commit()
    finally:
        conn.close()


def build_mysql_uri() -> str:
    from urllib.parse import quote_plus

    user = quote_plus(Config.MYSQL_USER)
    password = quote_plus(Config.MYSQL_PASSWORD)
    return (
        f"mysql+pymysql://{user}:{password}@"
        f"{Config.MYSQL_HOST}:{Config.MYSQL_PORT}/{Config.MYSQL_DATABASE}?charset=utf8mb4"
    )
