# just a demo not actual code that is needed to us

import mysql.connector
from mysql.connector import errorcode

def create_con(
        host_name: str = "localhost",
        port: int = "3306",
        user_name: str = "root",
        user_password: str = "",
        database: str = "test_db"):
    try:
        connection = mysql.connector.connect(
            host=host_name,
            port=port,
            user=user_name,
            password=user_password,
            database=database
        )
        with connection.cursor() as curser:
            curser.execute("""
            CREATE TABLE IF NOT EXISTS users(
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;""")
            connection.commit()
            print(f"Table 'users' exists in `{database}`." )
    except mysql.connector.Error as e:
        if e.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("Access denied: check your username or password.")
        elif e.errno == errorcode.ER_BAD_DB_ERROR:
            print(f"Database `{database}` doesn't exist.")
        else:
            print(f"MySql error [{e.errno}]: {e.msg}`.")

if __name__=='__main__':
    create_con()
