from flask import Blueprint, request, jsonify
import os
import json
from werkzeug.security import generate_password_hash, check_password_hash

auth = Blueprint('auth', __name__)

# 用户数据文件路径
USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'users.txt')

def load_users():
    """从文件加载用户数据"""
    if not os.path.exists(USERS_FILE):
        return {}
    
    users = {}
    with open(USERS_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                username, password = line.split(':')
                users[username] = password
    return users

def save_users(users):
    """保存用户数据到文件"""
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        for username, password in users.items():
            f.write(f"{username}:{password}\n")

@auth.route('/api/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400

    users = load_users()
    
    if username in users and users[username] == password:
        return jsonify({
            'success': True,
            'user': {
                'username': username,
                'role': 'admin' if username == 'admin' else 'user'
            }
        })
    
    return jsonify({'success': False, 'message': '用户名或密码错误'}), 401

@auth.route('/api/register', methods=['POST'])
def register():
    """用户注册"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400

    # 加载现有用户
    users = load_users()

    # 检查用户名是否已存在
    if username in users:
        return jsonify({'success': False, 'message': '用户名已存在'}), 400

    # 在实际应用中，这里应该对密码进行加密
    # password_hash = generate_password_hash(password)
    users[username] = password

    # 保存用户数据
    try:
        save_users(users)
        return jsonify({'success': True, 'message': '注册成功'})
    except Exception as e:
        return jsonify({'success': False, 'message': '注册失败'}), 500

@auth.route('/api/check_auth', methods=['GET'])
def check_auth():
    """检查用户是否已登录"""
    # 这里应该实现会话验证逻辑
    # 目前仅返回示例数据
    return jsonify({'isAuthenticated': False}) 