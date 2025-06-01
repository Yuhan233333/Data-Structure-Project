import json
import os
import osmnx as ox
import folium
import heapq
from geopy.distance import geodesic
from folium.plugins import TimestampedGeoJson
import datetime
from zoneinfo import ZoneInfo
import MapDatumTrans

def generate_route_map(start_name, end_name, mode='internal'):
    current_dir = os.path.dirname(__file__)

    # 选择不同的 JSON 文件
    filename = 'internal-places.json' if mode == 'internal' else 'external-places.json'
    if mode == 'internal':
        print("internal")
    places_path = os.path.join(current_dir, '..', 'frontend', 'data', filename)
    #ox.settings.overpass_endpoint = "https://overpass.kumi.systems/api/interpreter"

    # 设置超时时间（单位：秒）
    ox.settings.timeout = 180
    with open(places_path, 'r', encoding='utf-8') as f:
        places = json.load(f)

    def find_coords_by_name(name):
        for p in places:
            if p['name'] == name:
                return p['lat'], p['lng']
        raise ValueError(f"\u5730\u70b9\u201c{name}\u201d\u672a\u5728 places.json \u4e2d\u627e\u5230")

    lat_begin, lon_begin = find_coords_by_name(start_name)
    lat_dest, lon_dest = find_coords_by_name(end_name)
    lat_begin, lon_begin = MapDatumTrans.gcj02_to_wgs84(lat_begin, lon_begin)
    lat_dest, lon_dest = MapDatumTrans.gcj02_to_wgs84(lat_dest, lon_dest)
    def get_direction(p1, p2, p3):
        ax, ay = p2[1] - p1[1], p2[0] - p1[0]
        bx, by = p3[1] - p2[1], p3[0] - p2[0]
        angle1 = math.atan2(ay, ax)
        angle2 = math.atan2(by, bx)
        delta = math.degrees(angle2 - angle1)
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

    point1 = (lat_begin, lon_begin)
    point2 = (lat_dest, lon_dest)
    distance_km = geodesic(point1, point2).km
    G = ox.graph_from_point(((lat_begin+lat_dest)/2, (lon_begin+lon_dest)/2),
                            dist=distance_km * 600, network_type='all', simplify=False)

    nodes, edges = ox.graph_to_gdfs(G, nodes=True, edges=True)
    edges = edges.reset_index()
    nodes_dict = dict(zip(nodes.index, zip(nodes['y'], nodes['x'])))

    distance_graph = {}
    time_graph = {}

    def get_speed_by_highway(highway):
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
        return speed_table.get(highway, 10)

    for _, row in edges.iterrows():
        u, v = row['u'], row['v']
        dist_m = row.get('length', geodesic(nodes_dict[u], nodes_dict[v]).meters)
        highway = row.get('highway')
        speed_mps = get_speed_by_highway(highway) * 1000 / 3600
        time_sec = dist_m / speed_mps if speed_mps > 0 else float('inf')
        distance_graph.setdefault(u, []).append((v, dist_m))
        distance_graph.setdefault(v, []).append((u, dist_m))
        time_graph.setdefault(u, []).append((v, time_sec))
        time_graph.setdefault(v, []).append((u, time_sec))

    def find_nearest_node(lat, lon):
        return min(nodes_dict, key=lambda nid: geodesic((lat, lon), nodes_dict[nid]).meters)

    def dijkstra(graph, start, target=None):
        dist, prev = {n: float('inf') for n in graph}, {}
        dist[start] = 0
        heap = [(0, start)]
        while heap:
            d, u = heapq.heappop(heap)
            if u == target:
                print("已找到终点，提前终止 Dijkstra")
                break
            if d > dist[u]:
                continue
            for v, w in graph[u]:
                alt = d + w
                if alt < dist[v]:
                    dist[v], prev[v] = alt, u
                    heapq.heappush(heap, (alt, v))
        return dist, prev

    def reconstruct_path(prev, start, end):
        path, current = [], end
        while current != start:
            path.append(current)
            current = prev.get(current)
            if current is None: return []
        path.append(start)
        return path[::-1]

    start_id = find_nearest_node(lat_begin, lon_begin)
    end_id = find_nearest_node(lat_dest, lon_dest)
    dist_d, prev_d = dijkstra(distance_graph, start_id, end_id)
    path_d = reconstruct_path(prev_d, start_id, end_id)
    dist_t, prev_t = dijkstra(time_graph, start_id, end_id)
    path_t = reconstruct_path(prev_t, start_id, end_id)

    m = folium.Map(location=[lat_begin, lon_begin], zoom_start=15, tiles="CartoDB positron")

    def get_road_color(ht):
        if isinstance(ht, list): ht = ht[0]
        return {
            'motorway': 'black', 'trunk': 'black', 'primary': 'red', 'secondary': 'red',
            'tertiary': 'orange', 'residential': 'orange', 'cycleway': 'green',
            'footway': 'purple', 'path': 'purple'
        }.get(ht, 'gray')
    if mode == 'internal':
        folium.GeoJson(edges, name='roads', style_function=lambda f: {
            'color': get_road_color(f['properties'].get('highway')),
            'weight': 2
        }).add_to(m)

    folium.Marker([lat_begin, lon_begin], popup="起点", icon=folium.Icon(color='red')).add_to(m)
    folium.Marker([lat_dest, lon_dest], popup="终点", icon=folium.Icon(color='green')).add_to(m)

    folium.PolyLine([nodes_dict[n] for n in path_d], color='blue', weight=5).add_to(m)
    folium.PolyLine([nodes_dict[n] for n in path_t], color='brown', weight=5).add_to(m)

    tz = ZoneInfo("Asia/Shanghai")
    base_time = datetime.datetime.now(tz)
    features = []

    for i, (lat, lon) in enumerate([nodes_dict[n] for n in path_d]):
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
                         "properties": {"time": (base_time + datetime.timedelta(seconds=i)).isoformat(),
                                         "popup": "最短距离", "icon": "circle", "iconstyle": {"fillColor": "blue",
                                         "fillOpacity": 1.0, "stroke": "true", "radius": 6}, "trackId": "dist-track"}})

    for i, (lat, lon) in enumerate([nodes_dict[n] for n in path_t]):
        features.append({"type": "Feature", "geometry": {"type": "Point", "coordinates": [lon, lat]},
                         "properties": {"time": (base_time + datetime.timedelta(seconds=i)).isoformat(),
                                         "popup": "最短时间", "icon": "circle", "iconstyle": {"fillColor": "brown",
                                         "fillOpacity": 1.0, "stroke": "true", "radius": 6}, "trackId": "time-track"}})

    TimestampedGeoJson({"type": "FeatureCollection", "features": features},
                        period="PT1S", duration="PT0S", transition_time=200,
                        add_last_point=False, auto_play=True, loop=False).add_to(m)
    if mode == 'internal':
        m.get_root().html.add_child(folium.Element("""
        <div style='position: fixed; bottom: 50px; left: 50px; width: 200px; height: 180px;
        background-color: white; z-index:9999; font-size:14px; border:2px solid grey; padding: 10px;'>
        <b>道路类型图例</b><br>
        <span style='color:black;'>●</span> 高速/主干道<br>
        <span style='color:red;'>●</span> 一级/二级道路<br>
        <span style='color:orange;'>●</span> 住宅/小区道路<br>
        <span style='color:green;'>●</span> 自行车道<br>
        <span style='color:purple;'>●</span> 人行道/步道(拥挤)<br>
        <span style='color:gray;'>●</span> 步行道路(人少)<br>
        <span style='color:blue;'>▬</span> 最短距离路径<br>
        <span style='color:brown;'>▬</span> 最短时间路径<br>
        </div>
        """))
    else:
        m.get_root().html.add_child(folium.Element("""
        <div style='position: fixed; bottom: 50px; left: 50px; width: 200px; height: 180px;
        background-color: white; z-index:9999; font-size:14px; border:2px solid grey; padding: 10px;'>
        <span style='color:blue;'>▬</span> 最短距离路径<br>
        <span style='color:brown;'>▬</span> 最短时间路径<br>
        </div>
        """))
    print("最短路径已绘制")
    save_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend', 'views'))
    os.makedirs(save_path, exist_ok=True)  # 创建目录（如果不存在）
    print("保存地图路径：", os.path.join(save_path, 'route-planning2.html'))
    m.save(os.path.join(save_path, 'route-planning2.html'))
    print("地图保存成功")
