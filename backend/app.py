import os
import math
import threading
import webbrowser
import json
import zlib
import base64
from datetime import datetime
from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_cors import CORS
from auth import auth
from place_api import place_bp     # 你原本已有的蓝图
from route_generator import generate_route_map

app = Flask(__name__, template_folder='../frontend/views')
CORS(app)

# ———— 先注册你已有的蓝图 ————
app.register_blueprint(auth)
app.register_blueprint(place_bp)

# ==========================
#  下面新增"附近匹配"所需代码
# ==========================

# 1. 先把 internal/external 两套地点一次性读入内存
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

def load_places(mode: str = 'internal') -> list[dict]:
    """
    mode: 'internal' / 'external'
    返回形如 [{ "id":1, "name":"故宫午门", "lat":39.916..., "lng":116.397..., "type":"景点" }, ...]
    """
    file_map = {
        'internal': 'internal-places.json',
        'external': 'external-places.json',
    }
    fname = file_map.get(mode, 'internal-places.json')
    path = os.path.join(DATA_DIR, fname)
    try:
        with open(path, 'r', encoding='utf-8') as f:
            places = json.load(f)
        print(f"[INFO] 已加载 {len(places)} 条 {mode} 地点")
        return places
    except Exception as e:
        print(f"[WARN] 加载 {fname} 失败：{e}")
        return []

# 把两份数据放在全局字典里，后面直接查缓存
PLACES_CACHE = {
    'internal': load_places('internal'),
    'external': load_places('external'),
}

# Haversine 公式：计算两点间距离（米）
def haversine(lat1, lng1, lat2, lng2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(lat1))
         * math.cos(math.radians(lat2))
         * math.sin(dlng / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@app.route("/api/search-nearby", methods=["POST"])
def search_nearby():
    data = request.json
    # 必须同时带 keyword、latitude、longitude、mode
    if ("keyword" not in data) or ("latitude" not in data) or ("longitude" not in data) or ("mode" not in data):
        return jsonify({"status": "error", "message": "参数不完整，请传 keyword, latitude, longitude, mode"}), 400

    keyword = data["keyword"]    # 可能是 ""
    latitude = data["latitude"]
    longitude = data["longitude"]
    mode = data["mode"]          # "internal" 或 "external"
    type_filter = data.get("type")  # 可选

    # 根据 mode 选缓存里对应的列表
    places = PLACES_CACHE.get(mode, PLACES_CACHE["internal"])

    # "附近筛选"逻辑示例（按距离 + 模糊名称 + 可选类型）：
    nearby_list = []
    for p in places:
        name = p.get("name", "")
        lat = p.get("lat")
        lng = p.get("lng")
        typ = p.get("type", "")

        # 如果提供了 keyword，就按 keyword 模糊匹配名称
        if keyword and keyword not in name.lower():
            continue

        # 如果提供了 type_filter，就按类型过滤
        if type_filter and type_filter not in typ.lower():
            continue

        # 计算跟当前点的距离（米）
        dist = haversine(latitude, longitude, lat, lng)
        # 假设只返回 5000 米以内的
        if dist <= 5000:
            nearby_list.append({"name": name, "distance": dist, "lat": lat, "lng": lng})

    # 按距离排序，取前 30 条
    nearby_list.sort(key=lambda x: x["distance"])
    nearby_list = nearby_list[:30]

    return jsonify({"status": "success", "data": nearby_list}), 200


# ==========================
#  下面保留你原来已有的日记导出/导入接口（不动）
# ==========================
EXPORT_DIR = os.path.join(os.path.dirname(__file__), 'data', 'diaries')
os.makedirs(EXPORT_DIR, exist_ok=True)

@app.route('/api/export/diaries', methods=['POST'])
def export_diaries():
    try:
        data = request.get_json()
        if not data or 'diaries' not in data:
            return jsonify({'success': False, 'message': '无效的请求数据'}), 400

        # 清空目录里旧的 .json
        for fn in os.listdir(EXPORT_DIR):
            if fn.endswith('.json'):
                os.remove(os.path.join(EXPORT_DIR, fn))

        # 将所有日记合并为一个列表
        all_diaries = data['diaries']
        
        # 将日记列表转换为JSON字符串
        json_str = json.dumps(all_diaries, ensure_ascii=False)
        
        # 压缩JSON字符串
        compressed_data = zlib.compress(json_str.encode('utf-8'))
        
        # 将压缩后的数据转换为base64字符串
        base64_data = base64.b64encode(compressed_data).decode('utf-8')
        
        # 保存压缩后的数据
        with open(os.path.join(EXPORT_DIR, 'diaries_compressed.json'), 'w', encoding='utf-8') as f:
            json.dump({'compressed_data': base64_data}, f, ensure_ascii=False)

        return jsonify({'success': True, 'message': '日记导出成功', 'export_path': EXPORT_DIR})
    except Exception as e:
        return jsonify({'success': False, 'message': f'导出失败: {e}'}), 500

@app.route('/api/import/diaries', methods=['GET'])
def import_diaries():
    try:
        compressed_file = os.path.join(EXPORT_DIR, 'diaries_compressed.json')
        if not os.path.exists(compressed_file):
            return jsonify({'success': False, 'message': '未找到压缩的日记文件'}), 404

        # 读取压缩文件
        with open(compressed_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            base64_data = data['compressed_data']

        # 解码base64数据
        compressed_data = base64.b64decode(base64_data)
        
        # 解压缩数据
        json_str = zlib.decompress(compressed_data).decode('utf-8')
        
        # 解析JSON数据
        diaries = json.loads(json_str)

        return jsonify({'success': True, 'diaries': diaries})
    except Exception as e:
        return jsonify({'success': False, 'message': f'导入失败: {e}'}), 500

# ==========================
#  路线生成接口（保留你原来的逻辑）
# ==========================
@app.route('/api/generate-map', methods=['POST'])
def generate_map():
    data = request.get_json()
    start      = data.get('start')
    waypoints  = data.get('waypoints')      # list[str] 或 None
    end        = data.get('end')            # 兼容旧页面可留
    mode       = data.get('mode', 'internal')

    if not start:
        return jsonify({'status':'error','message':'缺少起点'}), 400

    try:
        # 调用你已有的 generate_route_map 函数
        generate_route_map(
            start_name=start,
            end=end,
            waypoints=waypoints,
            mode=mode
        )
        return jsonify({'status':'success'})
    except Exception as e:
        return jsonify({'status':'error','message':str(e)}), 500

# ==========================
#  静态文件 & 单页应用逻辑（不变）
# ==========================
@app.route('/frontend/<path:filename>')
def frontend_static(filename):
    return send_from_directory('../frontend', filename)

@app.route('/backend/<path:filename>')
def backend_static(filename):
    return send_from_directory('.', filename)

@app.route('/')
def serve_index():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    return send_from_directory(os.path.join(frontend_dir, 'views'), 'login.html')

@app.route('/<path:path>')
def serve_static(path):
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    return send_from_directory(frontend_dir, path)

# ==========================
#  启动时自动打开浏览器（可选）
# ==========================
def open_browser():
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    login_path = os.path.join(frontend_dir, 'views', 'login.html')
    webbrowser.open('http://localhost:5000/frontend/views/login.html')

if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        threading.Timer(1.5, open_browser).start()
    app.run(debug=True, port=5000)
