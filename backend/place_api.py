import pandas as pd
from flask import Blueprint, jsonify, request
import os

# 创建蓝图
place_bp = Blueprint('place', __name__)

# 场所数据文件路径
PLACES_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'place_data.csv')

# 全局缓存变量
places_cache = []

def load_places_to_cache():
    """加载场所数据到内存缓存"""
    global places_cache
    try:
        df = pd.read_csv(PLACES_FILE, encoding='utf-8')
        places_cache = []
        for _, row in df.iterrows():
            if pd.isna(row['name']) or pd.isna(row['type']):
                continue
            place = {
                'name': str(row['name']).strip(),
                'type': str(row['type']).strip(),
                'rating': float(row['rating']),
                'popularity': float(row['popularity']),
                'keywords': str(row['keywords']).strip().split('|'),
                'image': str(row['image']).strip()
            }
            places_cache.append(place)
    except Exception as e:
        print(f"加载场所数据时出错: {str(e)}")
        places_cache = []

# 启动时加载一次
load_places_to_cache()

@place_bp.route('/api/places', methods=['GET'])
def get_places():
    """获取场所列表（支持关键词和类型筛选）"""
    try:
        query = request.args.get('query', '').strip()
        place_type = request.args.get('type', '').strip()
        places = places_cache
        if query:
            places = [p for p in places if query.lower() in p['name'].lower() or 
                      any(query.lower() in k.lower() for k in p['keywords'])]
        if place_type:
            places = [p for p in places if p['type'] == place_type]
        return jsonify({'code': 200, 'message': '获取成功', 'data': places})
    except Exception as e:
        return jsonify({'code': 500, 'message': f'获取场所列表失败: {str(e)}', 'data': []})

@place_bp.route('/api/places/types', methods=['GET'])
def get_place_types():
    """获取场所类型列表"""
    try:
        types = sorted(list(set(p['type'] for p in places_cache)))
        return jsonify({'code': 200, 'message': '获取成功', 'data': types})
    except Exception as e:
        return jsonify({'code': 500, 'message': f'获取场所类型失败: {str(e)}', 'data': []})