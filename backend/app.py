'''
Author: Yuhan_233 1536943817@qq.com
Date: 2025-04-17 19:37:27
LastEditTime: 2025-04-27 15:52:35
LastEditors: Yuhan_233 1536943817@qq.com
FilePath: \Data-Structure-Project\backend\app.py
Description: 头部注释配置模板
'''
from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import os
from typing import List, Dict
import json

app = Flask(__name__)
# 启用CORS，允许前端访问
CORS(app)

# 设置JSON响应编码
app.config['JSON_AS_ASCII'] = False

# 用户数据文件路径
USERS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'users.txt')

# 加载用户数据
def load_users():
    users = {
        'admin': {
            'password': 'admin123',
            'role': 'admin'
        }
    }
    
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r', encoding='utf-8') as f:
                for line in f:
                    # 跳过空行和注释
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    # 解析用户数据（格式：username:password:role）
                    parts = line.split(':')
                    if len(parts) >= 2:
                        username = parts[0]
                        password = parts[1]
                        role = parts[2] if len(parts) > 2 else 'user'
                        users[username] = {
                            'password': password,
                            'role': role
                        }
        except Exception as e:
            print(f"加载用户数据时出错: {str(e)}")
    
    return users

# 保存用户数据
def save_users(users):
    try:
        os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            # 写入文件头
            f.write('# 用户数据文件\n')
            f.write('# 格式：username:password:role\n\n')
            # 写入默认管理员账号
            f.write('admin:admin123:admin\n')
            # 写入其他用户数据
            for username, data in users.items():
                if username != 'admin':  # 跳过管理员账号（已写入）
                    f.write(f"{username}:{data['password']}:{data['role']}\n")
        return True
    except Exception as e:
        print(f"保存用户数据时出错: {str(e)}")
        return False

# 初始化用户数据
USERS = load_users()

@app.route('/api/login', methods=['POST'])
def login():
    """用户登录API"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({
            'success': False,
            'message': '用户名和密码不能为空'
        }), 400
    
    user = USERS.get(username)
    if user and user['password'] == password:
        return jsonify({
            'success': True,
            'message': '登录成功',
            'data': {
                'username': username,
                'role': user['role']
            }
        })
    
    return jsonify({
        'success': False,
        'message': '用户名或密码错误'
    }), 401

@app.route('/api/register', methods=['POST'])
def register():
    """用户注册API"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({
            'success': False,
            'message': '用户名和密码不能为空'
        }), 400
    
    if username in USERS:
        return jsonify({
            'success': False,
            'message': '用户名已存在'
        }), 400
    
    # 创建新用户
    USERS[username] = {
        'password': password,
        'role': 'user'  # 默认为普通用户
    }
    
    # 保存用户数据
    if save_users(USERS):
        return jsonify({
            'success': True,
            'message': '注册成功'
        })
    else:
        # 如果保存失败，删除内存中的用户数据
        del USERS[username]
        return jsonify({
            'success': False,
            'message': '注册失败，请重试'
        }), 500

class ScenicSpot:
    def __init__(self, name: str, type_: str, score: float, popularity: int, keywords: List[str]):
        self.name = name
        self.type = type_
        self.score = score
        self.popularity = popularity
        self.keywords = keywords
    
    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'type': self.type,
            'score': self.score,
            'popularity': self.popularity,
            'keywords': self.keywords,
            'image': 'https://via.placeholder.com/300x200'  # 使用占位图片
        }

class RecommendationSystem:
    def __init__(self):
        self.spots: List[ScenicSpot] = []
        self.type_map: Dict[str, List[ScenicSpot]] = {}
        self.keywords_map: Dict[str, List[ScenicSpot]] = {}
    
    def load_spots_csv(self, filename: str = None) -> bool:
        if filename is None:
            # 获取当前文件的目录
            current_dir = os.path.dirname(os.path.abspath(__file__))
            # 构建到data目录的路径
            data_dir = os.path.join(os.path.dirname(current_dir), 'data')
            # 构建CSV文件的完整路径
            filename = os.path.join(data_dir, 'Tourism dataset.csv')

        try:
            # 尝试不同的编码方式
            encodings = ['utf-8', 'utf-8-sig', 'gbk', 'gb2312']
            content = None
            
            for encoding in encodings:
                try:
                    with open(filename, 'r', encoding=encoding) as file:
                        content = file.read()
                        break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                print(f"无法以任何支持的编码方式读取文件: {filename}")
                return False

            # 使用csv.reader处理内容
            import io
            reader = csv.reader(io.StringIO(content))
            next(reader)  # 跳过表头
            
            success_count = 0
            error_count = 0
            
            for row in reader:
                if len(row) < 5:
                    error_count += 1
                    continue
                
                name, type_, score_str, popularity_str, keywords_str = row[:5]
                
                try:
                    # 清理数据
                    score = float(score_str.strip())
                    popularity = float(popularity_str.strip())  # 先转换为float
                    popularity = int(popularity * 10) if popularity < 10 else int(popularity)  # 统一热度计算
                    keywords = [kw.strip() for kw in keywords_str.split('|') if kw.strip()]
                    
                    spot = ScenicSpot(name, type_, score, popularity, keywords)
                    self.spots.append(spot)
                    
                    # 更新类型映射
                    if type_ not in self.type_map:
                        self.type_map[type_] = []
                    self.type_map[type_].append(spot)
                    
                    # 更新关键词映射
                    for kw in keywords:
                        if kw not in self.keywords_map:
                            self.keywords_map[kw] = []
                        self.keywords_map[kw].append(spot)
                    
                    success_count += 1
                
                except (ValueError, IndexError) as e:
                    print(f"处理数据时出错 [{name}]: {str(e)}")
                    error_count += 1
                    continue
            
            print(f"数据加载完成：成功 {success_count} 条，失败 {error_count} 条")
            return True
        
        except Exception as e:
            print(f"加载数据时发生错误: {str(e)}")
            return False

# 创建推荐系统实例
recommendation_system = RecommendationSystem()
recommendation_system.load_spots_csv()

@app.route('/api/spots')
def get_spots():
    """获取所有景点数据"""
    return jsonify([spot.to_dict() for spot in recommendation_system.spots])

@app.route('/api/spots/types', methods=['GET'])
def get_spot_types():
    """获取所有景点类型"""
    types = set()
    try:
        # 获取数据文件路径
        data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
        data_file = os.path.join(data_dir, 'Tourism dataset.csv')
        
        # 尝试不同的编码方式读取文件
        encodings = ['utf-8', 'utf-8-sig', 'gbk', 'gb2312']
        content = None
        
        for encoding in encodings:
            try:
                with open(data_file, 'r', encoding=encoding) as file:
                    reader = csv.reader(file)
                    next(reader)  # 跳过表头
                    for row in reader:
                        if len(row) > 1:  # 确保行有足够的列
                            types.add(row[1].strip())  # 第二列是类型
                break
            except UnicodeDecodeError:
                continue
        
        return jsonify(list(types))
    except Exception as e:
        print(f"获取景点类型时出错: {str(e)}")
        return jsonify([])

@app.route('/api/spots/keywords')
def get_keywords():
    """获取所有关键词"""
    return jsonify(list(recommendation_system.keywords_map.keys()))

if __name__ == '__main__':
    # 启动Flask应用
    app.run(debug=True, port=5000) 