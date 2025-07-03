from flask import Blueprint, request, session, jsonify, abort, redirect, url_for, flash
from werkzeug.security import generate_password_hash
from app.models.db import get_db_connection  # Adjust import as needed

admin = Blueprint('admin', __name__)

def admin_required():
    """Simple helper to check admin access."""
    if 'user_id' not in session or session.get('role_id') != 1:
        abort(403, description="Admin access required")

@admin.route('/feedback/resolve', methods=['POST'])
def resolve_feedback():
    admin_required()
    f_id = request.json.get('f_id')
    if not f_id:
        return jsonify({"error": "Feedback ID missing"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE feedback SET status = 2 WHERE f_id = %s", (f_id,))
        conn.commit()
        return jsonify({"message": "Feedback marked as resolved"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin.route('/users', methods=['GET'])
def get_users():
    admin_required()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT user_id, full_name, email, role_id, username, created_at
            FROM fd_user
            ORDER BY created_at DESC
        """)
        users = cursor.fetchall()
        # Map role_id to role name for frontend
        role_map = {1: "Admin", 2: "User"}  # adjust roles as needed
        for u in users:
            u['role'] = role_map.get(u['role_id'], "Unknown")
            u['registration_date'] = u.get('created_at').strftime('%Y-%m-%d') if u.get('created_at') else None
        return jsonify(users)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin.route('/users/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    admin_required()
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT user_id, full_name, email, role_id, username, created_at
            FROM fd_user WHERE user_id = %s
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        role_map = {1: "Admin", 2: "User"}
        user['role'] = role_map.get(user['role_id'], "Unknown")
        user['registration_date'] = user.get('created_at').strftime('%Y-%m-%d') if user.get('created_at') else None
        return jsonify(user)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin.route('/users/<int:user_id>/promote', methods=['POST'])
def promote_to_admin(user_id):
    admin_required()
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # First check user exists and not already admin
        cursor.execute("SELECT role_id FROM fd_user WHERE user_id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        if user[0] == 1:
            return jsonify({"message": "User is already admin"}), 400

        cursor.execute("UPDATE fd_user SET role_id = 1 WHERE user_id = %s", (user_id,))
        conn.commit()
        return jsonify({"message": "User promoted to admin"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@admin.route('/admins/add', methods=['POST'])
def add_admin():
    admin_required()
    data = request.json
    full_name = data.get('name')
    email = data.get('email')
    password = data.get('password')

    if not full_name or not email or not password:
        return jsonify({"error": "Missing required fields"}), 400

    hashed_password = generate_password_hash(password)

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if email or username already exists (you may have username/email unique constraint)
        cursor.execute("SELECT user_id FROM fd_user WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "Email already exists"}), 409

        cursor.execute("""
            INSERT INTO fd_user (full_name, email, password, role_id, status, username)
            VALUES (%s, %s, %s, 1, 1, %s)
        """, (full_name, email, hashed_password, email.split('@')[0]))  # username from email prefix
        conn.commit()
        return jsonify({"message": "New admin added successfully"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
