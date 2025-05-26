import osmnx as ox
import folium
from geopy.distance import geodesic
import heapq
from folium.plugins import TimestampedGeoJson
import datetime
import math
from zoneinfo import ZoneInfo
def get_direction(p1, p2, p3):
    import math
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


#  输入起点终点经纬度

lat_begin = float(input("请输入起点纬度："))     # 比如 39.918603
lon_begin = float(input("请输入起点经度："))     # 比如 116.397477
lat_dest  = float(input("请输入终点纬度："))     # 比如 39.961554
lon_dest  = float(input("请输入终点经度："))     # 比如 116.358103

#  下载地图数据（以起点和终点中点为中心）
point1 = (lat_begin, lon_begin)
point2 = (lat_dest, lon_dest)
distance_km = geodesic(point1, point2).km
G = ox.graph_from_point(((lat_begin+lat_dest)/2, (lon_begin+lon_dest)/2),
                        dist=distance_km * 500, network_type='all', simplify=False)

#  获取节点与边
nodes, edges = ox.graph_to_gdfs(G, nodes=True, edges=True)
edges = edges.reset_index()
#  构建 nodes_dict: osmid -> (lat, lon)
nodes_dict = dict(zip(nodes.index, zip(nodes['y'], nodes['x'])))

#  构建 graph: osmid -> [(neighbor_id, distance), ...]
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
    return speed_table.get(highway, 20)  # 默认速度 20 km/h

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


#  找到起点和终点在图中对应的最近节点
def find_nearest_node(lat, lon, nodes_dict):
    min_dist = float('inf')
    nearest = None
    for node_id, (nlat, nlon) in nodes_dict.items():
        dist = geodesic((lat, lon), (nlat, nlon)).meters
        if dist < min_dist:
            min_dist = dist
            nearest = node_id
    return nearest

start_id = find_nearest_node(lat_begin, lon_begin, nodes_dict)
end_id   = find_nearest_node(lat_dest, lon_dest, nodes_dict)

# ✅ 手写 Dijkstra 算法
def dijkstra(graph, start):
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

#  回溯路径
def reconstruct_path(prev, start, end):
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

#  求最短路径
# 最短距离路径
dist_d, prev_d = dijkstra(distance_graph, start_id)
path_d = reconstruct_path(prev_d, start_id, end_id)

# 最短时间路径
dist_t, prev_t = dijkstra(time_graph, start_id)
path_t = reconstruct_path(prev_t, start_id, end_id)


if not path_d:
    print("最短路径失败")
else:
    print("最短路径：", path_d)
    print(f"路径总长：{dist_d[end_id]:.2f} 米")
if not path_t:
    print("最短时间失败")
else:
    print("最短时间：", path_t)
    print(f"路径总长：{dist_t[end_id]:.2f} 米")


# ✅ 可视化地图
m = folium.Map(location=[lat_begin, lon_begin], zoom_start=15, tiles="CartoDB positron")

# ✅ 加入道路
def get_road_color(highway_type):
    if isinstance(highway_type, list):
        highway_type = highway_type[0]  # 只取第一个

    if highway_type in ['motorway', 'trunk']:
        return 'black'
    elif highway_type in ['primary', 'secondary']:
        return 'red'
    elif highway_type in ['tertiary', 'residential']:
        return 'orange'
    elif highway_type in ['cycleway']:
        return 'green'
    elif highway_type in ['footway', 'path']:
        return 'purple'
    else:
        return 'gray'  # 默认色

folium.GeoJson(
    edges,
    name='roads',
    style_function=lambda feat: {
        'color': get_road_color(feat['properties'].get('highway')),
        'weight': 2
    }
).add_to(m)


# ✅ 加入起点终点标记
folium.Marker([lat_begin, lon_begin], popup="起点", icon=folium.Icon(color='red')).add_to(m)
folium.Marker([lat_dest, lon_dest], popup="终点", icon=folium.Icon(color='green')).add_to(m)

# ✅ 在地图上画出绿色最短路径
latlon_path = [nodes_dict[n] for n in path_d]
folium.PolyLine(latlon_path, color='blue', weight=5).add_to(m)
latlon_path = [nodes_dict[n] for n in path_t]
folium.PolyLine(latlon_path, color='brown', weight=5).add_to(m)




# ✅ 构建多帧 Feature：每一帧是一个点 + time + 同一个 trackId
latlon_path_d = [nodes_dict[n] for n in path_d]  # 最短距离路径（blue）
latlon_path_t = [nodes_dict[n] for n in path_t]  # 最短时间路径（brown）


tz = ZoneInfo("Asia/Shanghai")
features = []
base_time = datetime.datetime.now(tz)

# 最短距离路径动画（蓝色）
for i, (lat, lon) in enumerate(latlon_path_d):
    timestamp = (base_time + datetime.timedelta(seconds=i)).isoformat()
    features.append({
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {
            "time": timestamp,
            "popup": "最短距离",
            "icon": "circle",
            "iconstyle": {
                "fillColor": "blue",
                "fillOpacity": 1.0,
                "stroke": "true",
                "radius": 6
            },
            "trackId": "dist-track"
        }
    })

# 最短时间路径动画（棕色）
for i, (lat, lon) in enumerate(latlon_path_t):
    timestamp = (base_time + datetime.timedelta(seconds=i)).isoformat()
    features.append({
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {
            "time": timestamp,
            "popup": "最短时间",
            "icon": "circle",
            "iconstyle": {
                "fillColor": "brown",
                "fillOpacity": 1.0,
                "stroke": "true",
                "radius": 6
            },
            "trackId": "time-track"
        }
    })


timestamped_geojson = {
    "type": "FeatureCollection",
    "features": features
}

TimestampedGeoJson(
    timestamped_geojson,
    period="PT1S",
    duration="PT0S",
    transition_time=200,
    add_last_point=False,
    auto_play=True,
    loop=False
).add_to(m)


legend_html = """
<div style="position: fixed; 
     bottom: 50px; left: 50px; width: 200px; height: 180px; 
     background-color: white; z-index:9999; font-size:14px;
     border:2px solid grey; padding: 10px;">
<b>道路类型图例</b><br>
<span style="color:black;">●</span> 高速/主干道<br>
<span style="color:red;">●</span> 一级/二级道路<br>
<span style="color:orange;">●</span> 住宅/小区道路<br>
<span style="color:green;">●</span> 自行车道<br>
<span style="color:purple;">●</span> 人行道/步道<br>
<span style="color:gray;">●</span> 其他/未知道路<br>
<span style="color:blue;">▬</span> 最短距离路径<br>
<span style="color:brown;">▬</span> 最短时间路径<br>
</div>
"""
m.get_root().html.add_child(folium.Element(legend_html))



# 保存 HTML 地图
m.save("shortest_path_map.html")
print("最短路径已绘制，打开 shortest_path_map.html 查看")