import mysql.connector
from mysql.connector import errorcode



# 1. Connect to MySQL (no specific database yet)
def get_server_connection():
    # → returns a Connection object you can use to run server-level statements
    return mysql.connector.connect(
        host="localhost",
        port="3306",
        user="root",
        password="",
        autocommit=True  # commit after each table creation automatically
    )


# 2. Create a new database
def create_database():
    # → runs CREATE DATABASE IF NOT EXISTS
    db_name = "feedback_system"
    con = get_server_connection()
    cursor = con.cursor()
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {db_name} DEFAULT CHARACTER SET 'utf8'")
        print(f"Database '{db_name}' created successfully.")
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_DB_CREATE_EXISTS:
            print(f"Database '{db_name}' already exists.")
        else:
            print(f"Failed creating database: {err}")
    finally:
        cursor.close()
        con.close()


# 3. Connect *into* the newly created database
def get_db_connection():
    # → now that feedback_system exists, we include database="feedback_system"
    return mysql.connector.connect(
        host="localhost",
        port="3306",
        user="root",
        password="",
        database="feedback_system",
        autocommit=True  # commit after each table creation automatically
    )


# 4. All of yours CREATE TABLE statements in one list
table_statements = [
    # staff_table
    """
    CREATE TABLE staff_table (
      staff_id   INT(11) NOT NULL,
      staff_name VARCHAR(40) NOT NULL,
      staff_dob  DATE NOT NULL,
      PRIMARY KEY (staff_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # student_table
    """
    CREATE TABLE student_table (
      student_id INT(11) NOT NULL,
      std_name   VARCHAR(30) NOT NULL,
      std_dob    DATE NOT NULL,
      PRIMARY KEY (student_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # category
    """
    CREATE TABLE category (
      category_id INT(11) NOT NULL AUTO_INCREMENT,
      category    VARCHAR(20)   NOT NULL,
      PRIMARY KEY (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # role
    """
    CREATE TABLE role (
      role_id INT(11) NOT NULL,
      role    VARCHAR(40) NOT NULL,
      PRIMARY KEY (role_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # fd_user
    """
    CREATE TABLE fd_user (
      user_id  INT(11) NOT NULL AUTO_INCREMENT,
      username VARCHAR(20) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      email    VARCHAR(60) NOT NULL UNIQUE,
      designation VARCHAR(50),
      dob      DATE NOT NULL,
      role_id  INT(11) NOT NULL,
      status   INT(10) NOT NULL DEFAULT 1,
      PRIMARY KEY (user_id),
      FOREIGN KEY (role_id)
        REFERENCES role(role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # feedback
    """
    CREATE TABLE feedback (
      f_id     INT(11) NOT NULL AUTO_INCREMENT,
      f_title  VARCHAR(60) NOT NULL,
      f_body   VARCHAR(150) NOT NULL,
      category INT(11) NOT NULL,
      user_id  INT(11) NOT NULL,
      f_date   DATE NOT NULL,
      status   INT(10) NOT NULL DEFAULT 1,
      hide     TINYINT(1) NOT NULL DEFAULT 0,
      PRIMARY KEY (f_id),
      INDEX idx_feedback_category (category),
      INDEX idx_feedback_user     (user_id),
      FOREIGN KEY (category)
        REFERENCES category(category_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
      FOREIGN KEY (user_id)
        REFERENCES fd_user(user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """,

    # otp store
    """
    CREATE TABLE email_verifications (
        email       VARCHAR(255) NOT NULL,
        otp         CHAR(6)       NOT NULL,
        expires_at  DATETIME      NOT NULL,
        PRIMARY KEY(email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    """
]


# 5. Create each table in turn
def create_table():
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


if __name__ == "__main__":
    create_database()
    conn = get_db_connection()
    create_table()
