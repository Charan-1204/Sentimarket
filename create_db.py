import os

import pymysql
from dotenv import load_dotenv

load_dotenv()

conn = pymysql.connect(
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=int(os.getenv("DB_PORT") or "3306"),
)

cursor = conn.cursor()
cursor.execute(f"CREATE DATABASE {os.getenv('DB_NAME')};")
print("Database created!")
conn.close()
