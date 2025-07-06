import os
import mysql.connector
from mysql.connector import errorcode
from .schema import table_statements
from flask import current_app


# 1. Connect to MySQL (no specific database yet)
def get_server_connection():
    cfg = current_app.config['MYSQL']
    # → returns a Connection object you can use to run server-level statements
    return mysql.connector.connect(
        host = cfg['host'],
        port = cfg.get('port', 3306),
        user = cfg['user'],
        password = cfg['password'],
        autocommit = True  # commit after each table creation automatically
    )


# 2. Create a new database
def create_database():
    # → runs CREATE DATABASE IF NOT EXISTS
    con = get_server_connection()
    cursor = con.cursor()
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {current_app.config['MYSQL']['database']} DEFAULT CHARACTER SET 'utf8'")
        print(f"Database '{current_app.config['MYSQL']['database']}' created successfully.")
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_DB_CREATE_EXISTS:
            print(f"Database '{current_app.config['MYSQL']['database']}' already exists.")
        else:
            print(f"Failed creating database: {err}")
    finally:
        cursor.close()
        con.close()


# 3. Initialize the database and create each table in turn
def init_db():

    #Called once at startup (only in the reloader child process) to create the
    # database and all tables.

    # the following code is used to Only run this code if this is the main reloaded process, not the initial boot process.

    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        return

    create_database()

    # open our shared connection
    cfg = current_app.config['MYSQL']
    conn = mysql.connector.connect(
        host=cfg['host'],
        port=cfg.get('port', 330),
        user=cfg['user'],
        password=cfg['password'],
        database=cfg['database'],
        autocommit=True
    )

    cursor = conn.cursor()
    try:

        for table in table_statements:
            try:
                cursor.execute(table)
                # → prints the table name it just processed
                print(f"✔ Table created or already exists: {table.split()[2]}")
            except mysql.connector.Error as err:
                print(f"✖ Error creating table: {err.msg}")
    finally:
        cursor.close()
        conn.close()

# 4. Connect *into* the newly created database
def get_db_connection():
    cfg = current_app.config['MYSQL']
    return mysql.connector.connect(
        host=cfg['host'],
        port=cfg.get('port', 3306),
        user=cfg['user'],
        password=cfg['password'],
        database=cfg['database'],
        autocommit=cfg.get('autocommit', False),
        charset='utf8mb4'
    )
