python -c "
content = open('backend/routes/db_health.py', 'r', encoding='utf-8').read()
fix = '''

@db_health_bp.route('/db/make-admin', methods=['POST'])
def make_admin():
    from flask import request
    data = request.get_json() or {}
    if data.get('secret') != 'mm_admin_2026':
        return jsonify({'error': 'unauthorized'}), 401
    email = data.get('email', '')
    db = SessionLocal()
    try:
        db.execute(sql_text('UPDATE users SET is_admin=TRUE WHERE email=:email'), {'email': email})
        db.commit()
        row = db.execute(sql_text('SELECT id, name, is_admin FROM users WHERE email=:email'), {'email': email}).fetchone()
        return jsonify({'success': True, 'user': {'id': row[0], 'name': row[1], 'is_admin': row[2]}})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
'''
content = content + fix
open('backend/routes/db_health.py', 'w', encoding='utf-8').write(content)
print('Done!')
"


@db_health_bp.route('/db/set-admin/<path:email>', methods=['GET'])
def set_admin(email):
    db = SessionLocal()
    try:
        db.execute(sql_text('UPDATE users SET is_admin=TRUE WHERE email=:email'), {'email': email})
        db.commit()
        return jsonify({'success': True, 'message': 'Admin granted to ' + email})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        db.close()
