from flask import Blueprint, request, jsonify
import osmnx as ox
from geopy.distance import geodesic
import heapq
import math
from datetime import datetime
from zoneinfo import ZoneInfo
import json
import os
from functools import lru_cache
import threading
import time
from map_service.visualization import MapVisualizer

map_service = Blueprint('map_service', __name__)

# 缓存目录
CACHE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'map_cache')
os.makedirs(CACHE_DIR, exist_ok=True)

# 缓存文件路径
CACHE_FILE = os.path.join(CACHE_DIR, 'map_data.json')

# 全局变量存储地图数据
G = None
nodes_dict = None
distance_graph = None
time_graph = None

# 缓存锁
cache_lock = threading.Lock()

def get_cache_key(lat, lon, radius_km):
    """生成缓存键"""
    return f"{lat:.4f}_{lon:.4f}_{radius_km:.1f}"

@lru_cache(maxsize=10)
def get_cached_map_data(cache_key):
    """从缓存获取地图数据"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return None
    return None

def save_map_data_to_cache(cache_key, data):
    """保存地图数据到缓存"""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.json")
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
    except:
        pass

def load_map_data_from_cache(cache_key):
    """从缓存加载地图数据"""
    with cache_lock:
        cached_data = get_cached_map_data(cache_key)
        if cached_data:
            return cached_data
    return None

def get_direction(p1, p2, p3):
    """计算转向方向"""
    # A → B 向量
    ax, ay = p2[1] - p1[1], p2[0] - p1[0]
    # B → C 向量
    bx, by = p3[1] - p2[1], p3[0] - p2[0]

    angle1 = math.atan2(ay, ax)
    angle2 = math.atan2(by, bx)
    delta = math.degrees(angle2 - angle1)

    # 归一化角度到 [-180, 180]
    while delta <= -180:
        delta += 360
    while delta > 180:
        delta -= 360

    if abs(delta) < 30:
        return "直行"
    elif delta > 30:
        return "左转"
    elif delta < -30:
        return "右转"
    else:
        return "掉头"

def get_speed_by_highway(highway):
    """根据道路类型获取速度限制"""
    if isinstance(highway, list):
        highway = highway[0]
    speed_table = {
        'motorway': 80,
        'trunk': 70,
        'primary': 60,
        'secondary': 50,
        'tertiary': 40,
        'residential': 30,
        'service': 20,
        'cycleway': 15,
        'footway': 5,
        'path': 5,
    }
    return speed_table.get(highway, 20)  # 默认速度 20 km/h

def find_nearest_node(lat, lon, nodes_dict):
    """找到最近的节点"""
    min_dist = float('inf')
    nearest = None
    for node_id, (nlat, nlon) in nodes_dict.items():
        dist = geodesic((lat, lon), (nlat, nlon)).meters
        if dist < min_dist:
            min_dist = dist
            nearest = node_id
    return nearest

def dijkstra(graph, start):
    """Dijkstra算法实现"""
    dist = {node: float('inf') for node in graph}
    prev = {}
    dist[start] = 0
    heap = [(0, start)]

    while heap:
        current_dist, u = heapq.heappop(heap)
        if current_dist > dist[u]:
            continue
        for v, weight in graph[u]:
            alt = current_dist + weight
            if alt < dist[v]:
                dist[v] = alt
                prev[v] = u
                heapq.heappush(heap, (alt, v))
    return dist, prev

def reconstruct_path(prev, start, end):
    """重建路径"""
    path = []
    current = end
    while current != start:
        path.append(current)
        current = prev.get(current)
        if current is None:
            return []  # 没有路径
    path.append(start)
    path.reverse()
    return path

def init_map_data(lat, lon, radius_km=5):
    """初始化地图数据，优先使用缓存"""
    global G, nodes_dict, distance_graph, time_graph
    
    cache_key = get_cache_key(lat, lon, radius_km)
    cached_data = load_map_data_from_cache(cache_key)
    
    if cached_data:
        G = ox.graph_from_gdfs(
            ox.graph_to_gdfs(ox.graph_from_gdfs(
                cached_data['nodes'],
                cached_data['edges']
            ))
        )
        nodes_dict = cached_data['nodes_dict']
        distance_graph = cached_data['distance_graph']
        time_graph = cached_data['time_graph']
        return
    
    try:
        # 下载地图数据
        G = ox.graph_from_point((lat, lon), dist=radius_km * 1000, network_type='all', simplify=True)
        
        # 获取节点与边
        nodes, edges = ox.graph_to_gdfs(G, nodes=True, edges=True)
        edges = edges.reset_index()
        
        # 构建节点字典
        nodes_dict = dict(zip(nodes.index, zip(nodes['y'], nodes['x'])))
        
        # 构建距离图和时间图
        distance_graph = {}
        time_graph = {}
        
        for idx, row in edges.iterrows():
            u = row['u']
            v = row['v']
            dist_m = row['length'] if 'length' in row else geodesic(nodes_dict[u], nodes_dict[v]).meters
            highway = row.get('highway')
            speed_kmh = get_speed_by_highway(highway)
            speed_mps = speed_kmh * 1000 / 3600
            time_sec = dist_m / speed_mps if speed_mps > 0 else float('inf')

            # 距离图
            distance_graph.setdefault(u, []).append((v, dist_m))
            distance_graph.setdefault(v, []).append((u, dist_m))

            # 时间图
            time_graph.setdefault(u, []).append((v, time_sec))
            time_graph.setdefault(v, []).append((u, time_sec))
        
        # 保存到缓存
        cache_data = {
            'nodes': nodes.to_dict(),
            'edges': edges.to_dict(),
            'nodes_dict': nodes_dict,
            'distance_graph': distance_graph,
            'time_graph': time_graph
        }
        save_map_data_to_cache(cache_key, cache_data)
        
    except Exception as e:
        print(f"地图数据初始化失败: {str(e)}")
        raise

def preload_map_data(lat, lon, radius_km=5):
    """预加载地图数据"""
    def preload():
        try:
            init_map_data(lat, lon, radius_km)
        except:
            pass
    
    # 在新线程中预加载
    thread = threading.Thread(target=preload)
    thread.daemon = True
    thread.start()

def get_route_instructions(path, nodes_dict):
    """生成路线指引"""
    if len(path) < 3:
        return []
    
    instructions = []
    for i in range(len(path) - 2):
        p1 = nodes_dict[path[i]]
        p2 = nodes_dict[path[i + 1]]
        p3 = nodes_dict[path[i + 2]]
        
        direction = get_direction(p1, p2, p3)
        distance = geodesic(p2, p3).meters
        
        instructions.append({
            'type': 'turn' if direction != '直行' else 'straight',
            'direction': direction,
            'distance': round(distance),
            'instruction': f"{direction} {round(distance)}米"
        })
    
    return instructions

@map_service.route('/api/route/plan', methods=['POST'])
def plan_route():
    """路线规划接口"""
    try:
        data = request.get_json()
        start_lat = float(data.get('start_lat'))
        start_lon = float(data.get('start_lon'))
        end_lat = float(data.get('end_lat'))
        end_lon = float(data.get('end_lon'))
        strategy = data.get('strategy', 'fastest')
        
        # 计算中心点和距离
        center_lat = (start_lat + end_lat) / 2
        center_lon = (start_lon + end_lon) / 2
        distance_km = geodesic((start_lat, start_lon), (end_lat, end_lon)).km
        
        # 预加载下一个可能需要的区域
        preload_map_data(center_lat, center_lon, distance_km * 2)
        
        # 初始化当前区域的地图数据
        init_map_data(center_lat, center_lon, distance_km * 1.5)
        
        # 找到最近的节点
        start_id = find_nearest_node(start_lat, start_lon, nodes_dict)
        end_id = find_nearest_node(end_lat, end_lon, nodes_dict)
        
        # 根据策略选择图
        graph = time_graph if strategy == 'fastest' else distance_graph
        
        # 计算路径
        dist, prev = dijkstra(graph, start_id)
        path = reconstruct_path(prev, start_id, end_id)
        
        if not path:
            return jsonify({
                'success': False,
                'message': '未找到可行路径'
            }), 404
        
        # 生成路线指引
        instructions = get_route_instructions(path, nodes_dict)
        
        # 计算总距离和时间
        total_distance = dist[end_id]
        total_time = sum(instruction['distance'] / (get_speed_by_highway('primary') * 1000 / 3600) 
                        for instruction in instructions)
        
        # 构建路径点列表
        path_points = [{'lat': nodes_dict[node][0], 'lon': nodes_dict[node][1]} 
                      for node in path]
        
        return jsonify({
            'success': True,
            'route': {
                'distance': round(total_distance),  # 米
                'duration': round(total_time),      # 秒
                'instructions': instructions,
                'path': path_points
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'路线规划失败: {str(e)}'
        }), 500

@map_service.route('/api/route/preload', methods=['POST'])
def preload_route():
    """预加载路线数据接口"""
    try:
        data = request.get_json()
        lat = float(data.get('lat'))
        lon = float(data.get('lon'))
        radius_km = float(data.get('radius', 5))
        
        # 异步预加载数据
        preload_map_data(lat, lon, radius_km)
        
        return jsonify({
            'success': True,
            'message': '开始预加载地图数据'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'预加载失败: {str(e)}'
        }), 500

@map_service.route('/api/route/nearby', methods=['GET'])
def get_nearby_places():
    """获取附近地点接口"""
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        radius = float(request.args.get('radius', 1.0))  # 默认1公里
        
        # 初始化地图数据
        init_map_data(lat, lon, radius)
        
        # 获取附近的兴趣点（这里需要根据实际需求实现）
        # 示例返回
        return jsonify({
            'success': True,
            'places': [
                {
                    'name': '示例地点1',
                    'type': 'restaurant',
                    'lat': lat + 0.001,
                    'lon': lon + 0.001,
                    'distance': 100  # 米
                }
            ]
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'获取附近地点失败: {str(e)}'
        }), 500

@map_service.route('/api/route/visualize', methods=['POST'])
def visualize_route():
    """可视化路线规划结果"""
    try:
        data = request.get_json()
        start_lat = float(data.get('start_lat'))
        start_lon = float(data.get('start_lon'))
        end_lat = float(data.get('end_lat'))
        end_lon = float(data.get('end_lon'))
        strategy = data.get('strategy', 'distance')  # 'distance' 或 'time'
        
        # 初始化地图数据
        init_map_data(start_lat, start_lon)
        
        # 找到最近的节点
        start_id = find_nearest_node(start_lat, start_lon, nodes_dict)
        end_id = find_nearest_node(end_lat, end_lon, nodes_dict)
        
        # 计算路径
        if strategy == 'time':
            dist, prev = dijkstra(time_graph, start_id)
        else:
            dist, prev = dijkstra(distance_graph, start_id)
            
        path = reconstruct_path(prev, start_id, end_id)
        
        if not path:
            return jsonify({
                'success': False,
                'message': '未找到可行路径'
            }), 404
            
        # 创建可视化器
        visualizer = MapVisualizer()
        center_lat = (start_lat + end_lat) / 2
        center_lon = (start_lon + end_lon) / 2
        visualizer.create_map(center_lat, center_lon)
        
        # 添加道路网络
        nodes, edges = ox.graph_to_gdfs(G, nodes=True, edges=True)
        visualizer.add_roads(edges)
        
        # 添加起终点标记
        visualizer.add_markers([
            {'lat': start_lat, 'lon': start_lon, 'popup': '起点', 'color': 'red'},
            {'lat': end_lat, 'lon': end_lon, 'popup': '终点', 'color': 'green'}
        ])
        
        # 添加路径
        path_points = [nodes_dict[n] for n in path]
        visualizer.add_path(path_points, color='blue' if strategy == 'distance' else 'brown')
        
        # 添加动画效果
        visualizer.add_animation(
            path_points,
            color='blue' if strategy == 'distance' else 'brown',
            track_id=f"{strategy}-track",
            popup_text='最短距离' if strategy == 'distance' else '最短时间'
        )
        
        # 添加时间轴
        visualizer.add_timeline()
        
        # 获取路线指引
        instructions = get_route_instructions(path, nodes_dict)
        
        return jsonify({
            'success': True,
            'map_html': visualizer.get_map_html(),
            'instructions': instructions,
            'distance': dist[end_id],
            'path': path
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'可视化失败: {str(e)}'
        }), 500 