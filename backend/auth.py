from flask import Blueprint, request, jsonify
import os
import json
from datetime import datetime

auth = Blueprint('auth', __name__)

# 用户数据文件路径
USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'users.txt')
USER_PROFILES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'users')

# 在线用户信息文件路径
ONLINE_USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'online_users.json')

# 确保用户配置文件目录存在
os.makedirs(USER_PROFILES_DIR, exist_ok=True)

def get_user_profile_path(username):
    """获取用户配置文件的路径"""
    return os.path.join(USER_PROFILES_DIR, f"{username}.json")

def load_user_profile(username):
    """加载用户配置文件"""
    profile_path = get_user_profile_path(username)
    if os.path.exists(profile_path):
        with open(profile_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {
        'username': username,
        'nickname': '',
        'email': '',
        'phone': '',
        'bio': '',
        'avatar': None,
        'preferences': {
            'theme': 'light',
            'emailNotification': False,
            'smsNotification': False
        },
        'statistics': {
            'visitedPlaces': 0,
            'diaryCount': 0,
            'routeCount': 0,
            'averageRating': 0
        },
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat()
    }

def save_user_profile(username, profile):
    """保存用户配置文件"""
    profile_path = get_user_profile_path(username)
    profile['updatedAt'] = datetime.now().isoformat()
    with open(profile_path, 'w', encoding='utf-8') as f:
        json.dump(profile, f, ensure_ascii=False, indent=2)

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

# 加载在线用户信息
def load_online_users():
    """从文件加载在线用户信息"""
    if not os.path.exists(ONLINE_USERS_FILE):
        return {}
    with open(ONLINE_USERS_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return {}

# 保存在线用户信息
def save_online_users(online_users):
    """保存在线用户信息到文件"""
    with open(ONLINE_USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(online_users, f)

@auth.route('/api/users', methods=['GET'])
def get_users():
    """获取所有用户列表"""
    try:
        users = load_users()
        user_list = [{'username': username, 'role': 'admin' if username == 'admin' else 'user'} 
                    for username in users.keys()]
        return jsonify({
            'success': True,
            'users': user_list
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '获取用户列表失败'
        }), 500

@auth.route('/api/users/<username>', methods=['DELETE'])
def delete_user(username):
    """删除指定用户"""
    try:
        # 不允许删除管理员账号
        if username == 'admin':
            return jsonify({
                'success': False,
                'message': '不能删除管理员账号'
            }), 403

        users = load_users()
        
        # 检查用户是否存在
        if username not in users:
            return jsonify({
                'success': False,
                'message': '用户不存在'
            }), 404
            
        # 删除用户
        del users[username]
        
        # 保存更改
        save_users(users)
        
        return jsonify({
            'success': True,
            'message': '用户删除成功'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '删除用户失败'
        }), 500

@auth.route('/api/login', methods=['POST'])
def login():
    """用户登录，增加同一用户名唯一登录检测"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'success': False, 'message': '用户名和密码不能为空'}), 400

    users = load_users()
    online_users = load_online_users()

    # 检查用户名是否已在线
    if username in online_users:
        return jsonify({'success': False, 'message': '该用户已在其他地方登录，请先退出后再登录'}), 403

    if username in users and users[username] == password:
        # 登录成功，记录在线状态，生成简单token
        token = f"{username}_{datetime.now().timestamp()}"
        online_users[username] = token
        save_online_users(online_users)
        return jsonify({
            'success': True,
            'user': {
                'username': username,
                'role': 'admin' if username == 'admin' else 'user'
            },
            'token': token
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
    # 从请求头中获取认证信息
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return jsonify({'isAuthenticated': False}), 401

    try:
        # 获取用户名
        username = request.headers.get('X-Username')
        if not username:
            return jsonify({'isAuthenticated': False}), 401

        # 检查用户是否存在
        users = load_users()
        if username not in users:
            return jsonify({'isAuthenticated': False}), 401

        return jsonify({
            'isAuthenticated': True,
            'user': {
                'username': username,
                'role': 'admin' if username == 'admin' else 'user'
            }
        })
    except Exception as e:
        return jsonify({'isAuthenticated': False}), 401

@auth.route('/api/users/<username>/profile', methods=['GET'])
def get_user_profile(username):
    """获取用户个人信息"""
    try:
        # 检查用户是否存在
        users = load_users()
        if username not in users:
            return jsonify({
                'success': False,
                'message': '用户不存在'
            }), 404

        # 加载用户配置文件
        profile = load_user_profile(username)
        return jsonify({
            'success': True,
            'profile': profile
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '获取用户信息失败'
        }), 500

@auth.route('/api/users/<username>/profile', methods=['PUT'])
def update_user_profile(username):
    """更新用户个人信息"""
    try:
        # 检查用户是否存在
        users = load_users()
        if username not in users:
            return jsonify({
                'success': False,
                'message': '用户不存在'
            }), 404

        # 获取请求数据
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '无效的请求数据'
            }), 400

        # 加载现有配置文件
        profile = load_user_profile(username)

        # 更新允许修改的字段
        allowed_fields = ['nickname', 'email', 'phone', 'bio']
        for field in allowed_fields:
            if field in data:
                profile[field] = data[field]

        # 保存更新后的配置文件
        save_user_profile(username, profile)

        return jsonify({
            'success': True,
            'message': '个人信息更新成功',
            'profile': profile
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '更新用户信息失败'
        }), 500

@auth.route('/api/users/<username>/password', methods=['PUT'])
def change_password(username):
    """修改用户密码"""
    try:
        # 检查用户是否存在
        users = load_users()
        if username not in users:
            return jsonify({
                'success': False,
                'message': '用户不存在'
            }), 404

        # 获取请求数据
        data = request.get_json()
        if not data or 'oldPassword' not in data or 'newPassword' not in data:
            return jsonify({
                'success': False,
                'message': '无效的请求数据'
            }), 400

        # 验证旧密码
        if users[username] != data['oldPassword']:
            return jsonify({
                'success': False,
                'message': '当前密码错误'
            }), 401

        # 更新密码
        users[username] = data['newPassword']
        save_users(users)

        return jsonify({
            'success': True,
            'message': '密码修改成功'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '修改密码失败'
        }), 500

@auth.route('/api/users/<username>/preferences', methods=['GET'])
def get_user_preferences(username):
    """获取用户偏好设置"""
    try:
        profile = load_user_profile(username)
        return jsonify({
            'success': True,
            'preferences': profile['preferences']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '获取偏好设置失败'
        }), 500

@auth.route('/api/users/<username>/preferences', methods=['PUT'])
def update_user_preferences(username):
    """更新用户偏好设置"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '无效的请求数据'
            }), 400

        profile = load_user_profile(username)
        profile['preferences'].update(data)
        save_user_profile(username, profile)

        return jsonify({
            'success': True,
            'message': '偏好设置更新成功',
            'preferences': profile['preferences']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '更新偏好设置失败'
        }), 500

@auth.route('/api/users/<username>/statistics', methods=['GET'])
def get_user_statistics(username):
    """获取用户使用统计"""
    try:
        profile = load_user_profile(username)
        return jsonify({
            'success': True,
            'statistics': profile['statistics']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '获取使用统计失败'
        }), 500

@auth.route('/api/users/<username>/statistics', methods=['PUT'])
def update_user_statistics(username):
    """更新用户使用统计"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': '无效的请求数据'
            }), 400

        profile = load_user_profile(username)
        profile['statistics'].update(data)
        save_user_profile(username, profile)

        return jsonify({
            'success': True,
            'message': '使用统计更新成功',
            'statistics': profile['statistics']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '更新使用统计失败'
        }), 500

@auth.route('/api/logout', methods=['POST'])
def logout():
    """用户退出登录"""
    try:
        # 获取用户名
        username = request.headers.get('X-Username')
        if not username:
            return jsonify({'success': False, 'message': '未提供用户名'}), 400

        # 加载在线用户信息
        online_users = load_online_users()
        
        # 如果用户在线，则删除其在线状态
        if username in online_users:
            del online_users[username]
            save_online_users(online_users)
            
        return jsonify({
            'success': True,
            'message': '退出登录成功'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': '退出登录失败'
        }), 500 