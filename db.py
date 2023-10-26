import os
import pymysql
import sqlalchemy
from sqlalchemy.engine.url import make_url
from dotenv import load_dotenv

load_dotenv()


def create_engine():
    ssl_args = {'ssl_ca': os.getenv("SSL_CERT")}
    engine = sqlalchemy.create_engine(
        os.getenv("DATABASE_URL"),
        connect_args=ssl_args
    )
    return engine


def connect():
    url = make_url(os.getenv("DATABASE_URL"))
    connection = pymysql.connect(
        host=url.host,
        user=url.username,
        password=url.password,
        database=url.database,
        ssl_ca=os.getenv("SSL_CERT")
    )

    return connection
