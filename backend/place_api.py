import csv
import os
from flask import Blueprint, jsonify
from typing import List, Dict

# 定义场所类
class ScenicSpot:
    def __init__(self, name: str, type_: str, rating: float, popularity: int, keywords: List[str], image: str = None, address: str = None):
        self.name = name
        self.type = type_
        self.rating = rating
        self.popularity = popularity
        self.keywords = keywords
        self.image = image or ''
        self.address = address or ''

    def to_dict(self) -> Dict:
        return {
            'name': self.name,
            'type': self.type,
            'rating': self.rating,
            'popularity': self.popularity,
            'keywords': self.keywords,
            'image': self.image,
            'address': self.address
        }

# 推荐系统类
class RecommendationSystem:
    def __init__(self):
        self.spots: List[ScenicSpot] = []
        self.type_map: Dict[str, List[ScenicSpot]] = {}
        self.keywords_map: Dict[str, List[ScenicSpot]] = {}

    def load_spots_csv(self, filename: str):
        try:
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
            import io
            reader = csv.reader(io.StringIO(content))
            header = next(reader)
            # 兼容不同表头顺序
            col_map = {col: idx for idx, col in enumerate(header)}
            for row in reader:
                try:
                    name = row[col_map.get('name', 0)].strip()
                    type_ = row[col_map.get('type', 1)].strip()
                    rating = float(row[col_map.get('rating', 2)])
                    popularity = int(float(row[col_map.get('popularity', 3)]))
                    keywords = [kw.strip() for kw in row[col_map.get('keywords', 4)].split('|') if kw.strip()]
                    image = row[col_map.get('image', 5)] if 'image' in col_map else ''
                    if image and not image.startswith('http'):
                        image = f'backend/{image}' if image else ''
                    address = row[col_map.get('address', 6)] if 'address' in col_map else ''
                    spot = ScenicSpot(name, type_, rating, popularity, keywords, image, address)
                    self.spots.append(spot)
                    # 类型映射
                    if type_ not in self.type_map:
                        self.type_map[type_] = []
                    self.type_map[type_].append(spot)
                    # 关键词映射
                    for kw in keywords:
                        if kw not in self.keywords_map:
                            self.keywords_map[kw] = []
                        self.keywords_map[kw].append(spot)
                except Exception as e:
                    print(f"处理数据时出错: {e}")
                    continue
            return True
        except Exception as e:
            print(f"加载数据时发生错误: {str(e)}")
            return False

# 创建推荐系统实例并加载数据
place_bp = Blueprint('place', __name__)
PLACES_FILE = os.path.join(os.path.dirname(__file__), 'place_data.csv')
recommendation_system = RecommendationSystem()
recommendation_system.load_spots_csv(PLACES_FILE)

@place_bp.route('/api/places', methods=['GET'])
def get_places():
    """获取所有场所数据，前端自行筛选"""
    return jsonify([spot.to_dict() for spot in recommendation_system.spots])

@place_bp.route('/api/places/types', methods=['GET'])
def get_place_types():
    """获取所有场所类型"""
    return jsonify(list(recommendation_system.type_map.keys()))

@place_bp.route('/api/places/keywords', methods=['GET'])
def get_place_keywords():
    """获取所有场所关键词"""
    return jsonify(list(recommendation_system.keywords_map.keys())) 