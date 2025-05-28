import csv
import os
import heapq
import random
from flask import Blueprint, jsonify, request
from typing import List, Dict, Callable, Any

# 定义场所类
class ScenicSpot:
    def __init__(self, name: str, type_: str, rating: float, popularity: float, keywords: List[str], image: str = None, address: str = None):
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
        self.name_to_index: Dict[str, int] = {}  # 用于快速查找景点索引

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
            
            index = 0
            for row in reader:
                try:
                    name = row[col_map.get('name', 0)].strip()
                    type_ = row[col_map.get('type', 1)].strip()
                    rating = float(row[col_map.get('rating', 2)])
                    popularity = float(row[col_map.get('popularity', 3)])
                    
                    # 处理浮点数精度问题
                    rating = round(rating, 1)
                    popularity = round(popularity, 1)
                    
                    keywords = [kw.strip() for kw in row[col_map.get('keywords', 4)].split('|') if kw.strip()]
                    # 统一设置所有场所的图片路径为/backend/gugong.jpg
                    image = '/backend/gugong.jpg'
                    address = row[col_map.get('address', 6)] if 'address' in col_map else ''
                    spot = ScenicSpot(name, type_, rating, popularity, keywords, image, address)
                    self.spots.append(spot)
                    self.name_to_index[name] = index
                    index += 1
                    
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
    
    def update_popularity(self, name: str, increment: float = 0.1):
        """更新景点人气值"""
        if name in self.name_to_index:
            index = self.name_to_index[name]
            spot = self.spots[index]
            
            # 处理浮点数精度问题，先转换为字符串，再转回浮点数
            current_popularity = float(f"{spot.popularity:.1f}")
            new_popularity = current_popularity + increment
            
            # 确保不会出现过大的值或精度问题
            spot.popularity = round(new_popularity, 1)
            
            self._save_to_csv()
            return True
        return False
    
    def _save_to_csv(self):
        """将更新后的数据保存回CSV文件"""
        try:
            with open(PLACES_FILE, 'w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file)
                # 写入表头
                writer.writerow(['name', 'type', 'rating', 'popularity', 'keywords', 'image'])
                
                # 写入数据
                for spot in self.spots:
                    keywords = '|'.join(spot.keywords)
                    # 处理浮点数精度问题
                    rating = round(float(spot.rating), 1)
                    popularity = round(float(spot.popularity), 1)
                    
                    writer.writerow([
                        spot.name,
                        spot.type,
                        rating,
                        popularity,
                        keywords,
                        spot.image
                    ])
            return True
        except Exception as e:
            print(f"保存数据时发生错误: {str(e)}")
            return False
    
    def find_top_k_spots(self, k: int = 10, filter_func: Callable[[ScenicSpot], bool] = None, 
                         key_func: Callable[[ScenicSpot], Any] = None) -> List[ScenicSpot]:
        """
        使用部分排序算法找出前k个景点
        
        参数:
            k: 需要返回的景点数量
            filter_func: 过滤函数，用于筛选符合条件的景点
            key_func: 排序键函数，用于确定排序标准
            
        返回:
            前k个符合条件的景点列表
        """
        # 默认排序键：评分和人气的加权平均
        if key_func is None:
            key_func = lambda spot: 0.5 * spot.rating + 0.5 * spot.popularity / 10
        
        # 先过滤
        filtered_spots = self.spots
        if filter_func:
            filtered_spots = [spot for spot in self.spots if filter_func(spot)]
        
        # 如果过滤后的景点数量小于等于k，直接返回
        if len(filtered_spots) <= k:
            return sorted(filtered_spots, key=key_func, reverse=True)
        
        # 使用堆算法找出前k个元素
        # 使用nlargest比手动实现堆更简洁高效
        return heapq.nlargest(k, filtered_spots, key=key_func)

# 创建推荐系统实例并加载数据
place_bp = Blueprint('place', __name__)
PLACES_FILE = os.path.join(os.path.dirname(__file__), 'place_data.csv')
recommendation_system = RecommendationSystem()
recommendation_system.load_spots_csv(PLACES_FILE)

@place_bp.route('/api/places', methods=['GET'])
def get_places():
    """获取所有场所数据，前端自行筛选"""
    return jsonify([spot.to_dict() for spot in recommendation_system.spots])

@place_bp.route('/api/places/top', methods=['GET'])
def get_top_places():
    """获取评分最高的场所数据，使用部分排序算法"""
    # 获取请求参数
    count = request.args.get('count', default=10, type=int)
    type_filter = request.args.get('type', default=None, type=str)
    sort_by = request.args.get('sort_by', default='mixed', type=str)
    
    # 定义过滤函数
    filter_func = None
    if type_filter:
        filter_func = lambda spot: spot.type == type_filter
    
    # 定义排序键函数
    key_func = None
    if sort_by == 'rating':
        key_func = lambda spot: spot.rating
    elif sort_by == 'popularity':
        key_func = lambda spot: spot.popularity
    else:  # mixed
        key_func = lambda spot: 0.5 * spot.rating + 0.5 * spot.popularity / 10
    
    # 获取前k个景点
    top_spots = recommendation_system.find_top_k_spots(count, filter_func, key_func)
    
    return jsonify([spot.to_dict() for spot in top_spots])

@place_bp.route('/api/places/types', methods=['GET'])
def get_place_types():
    """获取所有场所类型"""
    return jsonify(list(recommendation_system.type_map.keys()))

@place_bp.route('/api/places/keywords', methods=['GET'])
def get_place_keywords():
    """获取所有场所关键词"""
    return jsonify(list(recommendation_system.keywords_map.keys()))

@place_bp.route('/api/places/interest', methods=['POST'])
def update_place_interest():
    """更新景点人气值"""
    data = request.json
    if not data or 'name' not in data:
        return jsonify({'success': False, 'message': '缺少景点名称'}), 400
    
    name = data['name']
    increment = data.get('increment', 0.1)
    
    if recommendation_system.update_popularity(name, increment):
        return jsonify({'success': True, 'message': '更新成功'})
    else:
        return jsonify({'success': False, 'message': '找不到该景点'}), 404

@place_bp.route('/api/foods/random', methods=['GET'])
def get_random_foods():
    """获取随机菜品数据"""
    try:
        # 获取请求参数
        count = request.args.get('count', default=6, type=int)  # 默认改为6个
        sort_by = request.args.get('sort_by', default='rating', type=str)
        place_name = request.args.get('place_name', default='', type=str)  # 新增景点名称参数
        
        # 读取菜品数据
        foods = []
        food_file = os.path.join(os.path.dirname(__file__), 'Food_dataset.csv')
        
        encodings = ['utf-8', 'utf-8-sig', 'gbk', 'gb2312']
        content = None
        for encoding in encodings:
            try:
                with open(food_file, 'r', encoding=encoding) as file:
                    content = file.read()
                    break
            except UnicodeDecodeError:
                continue
                
        if content is None:
            return jsonify({'error': '无法读取菜品数据文件'}), 500
            
        import io
        reader = csv.reader(io.StringIO(content))
        header = next(reader)  # 跳过表头
        
        # 读取所有菜品
        for row in reader:
            try:
                food = {
                    'name': row[0],
                    'description': row[1],
                    'rating': float(row[2]),
                    'popularity': float(row[3]),
                    'distance': float(row[4])
                }
                foods.append(food)
            except Exception as e:
                print(f"处理菜品数据时出错: {e}")
                continue
        
        # 使用景点名称作为随机种子，确保相同景点每次获取的菜品相同
        if place_name:
            # 将景点名称转换为数字种子
            seed = sum(ord(c) for c in place_name)
            random.seed(seed)
        
        # 随机选择菜品
        if len(foods) <= count:
            selected_foods = foods
        else:
            # 使用固定种子进行随机选择
            selected_foods = random.sample(foods, count)
            # 重置随机种子，避免影响其他功能
            random.seed()
        
        # 根据排序方式进行排序
        if sort_by == 'rating':
            selected_foods.sort(key=lambda x: x['rating'], reverse=True)
        elif sort_by == 'popularity':
            selected_foods.sort(key=lambda x: x['popularity'], reverse=True)
        elif sort_by == 'distance':
            selected_foods.sort(key=lambda x: x['distance'])
        
        return jsonify(selected_foods)
    except Exception as e:
        print(f"获取随机菜品数据时出错: {e}")
        return jsonify({'error': '获取随机菜品数据失败'}), 500 