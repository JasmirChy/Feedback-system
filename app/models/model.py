
# All of ours CREATE TABLE statements in one list

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
      user_id  INT(11) NOT NULL,
      full_name VARCHAR(30) NOT NULL,
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

    #attachment store
    """
    CREATE TABLE attachment (
      attach_id INT(45) NOT NULL AUTO_INCREMENT,
      attach MEDIUMBLOB,
      feedback_id INT(11),
      PRIMARY KEY (attach_id),
      FOREIGN KEY (feedback_id)
        REFERENCES feedback(f_id)
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
