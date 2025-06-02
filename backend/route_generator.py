import json
import os
import heapq
import random
import numpy as np
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import folium
import networkx as nx
import osmnx as ox
from branca.element import Element
from folium.plugins import TimestampedGeoJson

import MapDatumTrans


# ---------------------------------------------------------------------------
# Helper utilities -----------------------------------------------------------
# ---------------------------------------------------------------------------
def _haversine_m(lat1, lon1, lat2, lon2):
    """Return great-circle distance between two WGS-84 points (metres)."""
    from math import radians, sin, cos, atan2, sqrt

    R = 6_371_000
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return R * c


# ---------------------------------------------------------------------------
# Main entry -----------------------------------------------------------------
# ---------------------------------------------------------------------------
def generate_route_map(
    start_name: str,
    end: str | None = None,
    waypoints: list[str] | None = None,
    mode: str = "internal",
):
    """Compute *distance-shortest* & *time-shortest* tours and render to HTML."""

    #规范输入：把 end 始终放在列表最后
    waypoints = waypoints or []
    names: list[str] = [start_name] + waypoints + ([end] if end else [])

    #读景点坐标
    here = os.path.dirname(__file__)
    data_file = "internal-places.json" if mode == "internal" else "external-places.json"
    with open(os.path.join(here, "..", "frontend", "data", data_file), "r", encoding="utf-8") as f:
        places = {p["name"]: (p["lat"], p["lng"]) for p in json.load(f)}
    print("景点坐标已读入")
    def _gcj_to_wgs(name: str):
        lat_gcj, lon_gcj = places[name]
        return MapDatumTrans.gcj02_to_wgs84(lat_gcj, lon_gcj)

    coords: list[tuple[float, float]] = [_gcj_to_wgs(n) for n in names]

    #取子图
    lat_c = sum(lat for lat, _ in coords) / len(coords)
    lon_c = sum(lon for _, lon in coords) / len(coords)
    max_r = max(_haversine_m(lat_c, lon_c, lat, lon) for lat, lon in coords) + 200  # +200 m buffer

    ox.settings.timeout = 180
    G = ox.graph_from_point((lat_c, lon_c), dist=max_r, network_type="all", simplify=False)
    nodes_gdf, edges_gdf = ox.graph_to_gdfs(G, nodes=True, edges=True)
    node_xy = dict(zip(nodes_gdf.index, zip(nodes_gdf["y"], nodes_gdf["x"])))
    print("点已生成")
    #为每条边生成独立拥挤度
    n_edges = len(edges_gdf)
    edges_gdf["car_cong"] = np.random.uniform(0.3, 1.5, size=n_edges)
    edges_gdf["bike_cong"] = np.random.uniform(0.3, 1.5, size=n_edges)
    edges_gdf["walk_cong"] = np.random.uniform(0.3, 1.5, size=n_edges)
    print("拥挤度生成")
    # build a map: edge index tuple -> (car_cong, bike_cong, walk_cong)
    congestion_map = {}
    for idx, row in edges_gdf.iterrows():
        car_c = float(row["car_cong"])
        bike_c = float(row["bike_cong"])
        walk_c = float(row["walk_cong"])
        congestion_map[idx] = (car_c, bike_c, walk_c)

    #生成加权图（距离 / 时间），使用边级拥挤度
    dist_graph: dict[int, list[tuple[int, float]]] = {}
    time_graph: dict[int, list[tuple[int, float]]] = {}

    # 为了后面绘制需要，我们还记录每条边的“最优模式”：0=car, 1=bike, 2=walk
    best_mode_map = {}

    for idx, row in edges_gdf.iterrows():
        # idx is (u, v, key)
        u, v, key = idx

        # 计算距离（米）
        d_m = row.get("length") or _haversine_m(*node_xy[u], *node_xy[v])

        # highway 属性
        hw = row.get("highway")
        if isinstance(hw, list):
            hw0 = hw[0]
        else:
            hw0 = hw

        # 取该边的拥挤度
        car_c, bike_c, walk_c = congestion_map[idx]

        #汽车最大速度逻辑：只允许以下 highway 类型通行汽车
        if hw0 in {"motorway", "trunk", "primary", "secondary", "tertiary"}:
            base_speed_car = 60
            speed_car_kmh = base_speed_car * car_c
        elif hw0 in {"road","bus"}:
            # residential/service 这些城市道路，自行车/行人也可通行
            base_speed_car = 20
            speed_car_kmh = base_speed_car * car_c
        elif hw0 in {"residential", "service", "unclassified", }:
            speed_car_kmh = 0
        else:
            # footway/path/pedestrian/track/living_street/cycleway 等，都禁止汽车通行
            speed_car_kmh = 0

        #自行车最大速度逻辑
        if hw0 == "cycleway":
            speed_bike_kmh = 20 * bike_c
        elif hw0 in {"residential", "service", "road"}:
            speed_bike_kmh = 10 * bike_c
        else:
            speed_bike_kmh = 0 * bike_c

        #步行最大速度逻辑
        if hw0 in {"footway", "path", "pedestrian", "living_street", "track"}:
            speed_walk_kmh = 7 * walk_c
        elif hw0 in {"residential", "service", "unclassified", "road"}:
            # 城市道路上也有人行道可走，7 km/h
            speed_walk_kmh = 7 * walk_c
        else:
            # 其它（如高速）强制不让行人走
            speed_walk_kmh = 0

        # 三种时间 (秒)
        t_car  = d_m / (speed_car_kmh / 3.6) if speed_car_kmh > 0 else float("inf")
        t_bike = d_m / (speed_bike_kmh / 3.6) if speed_bike_kmh > 0 else float("inf")
        t_walk = d_m / (speed_walk_kmh / 3.6) if speed_walk_kmh > 0 else float("inf")

        # 取最小作为“混合交通时间”权重
        t_min = min(t_car, t_bike, t_walk)
        time_graph.setdefault(u, []).append((v, t_min))
        time_graph.setdefault(v, []).append((u, t_min))
        dist_graph.setdefault(u, []).append((v, d_m))
        dist_graph.setdefault(v, []).append((u, d_m))

        # 记录是哪种模式最优：0=car, 1=bike, 2=walk
        if t_min == t_car:
            best_mode_map[idx] = 0
        elif t_min == t_bike:
            best_mode_map[idx] = 1
        else:
            best_mode_map[idx] = 2

    #找最近节点
    def _nearest_node(lat, lon):
        return min(node_xy, key=lambda n: _haversine_m(lat, lon, *node_xy[n]))

    node_ids = [_nearest_node(lat, lon) for lat, lon in coords]

    #迪杰斯特拉 & TSP
    def _dijkstra(graph, s):
        dist = {n: float("inf") for n in graph}
        dist[s] = 0
        prev: dict[int, int] = {}
        pq: list[tuple[float, int]] = [(0, s)]
        while pq:
            d, u = heapq.heappop(pq)
            if d > dist[u]:
                continue
            for v, w in graph[u]:
                nd = d + w
                if nd < dist[v]:
                    dist[v], prev[v] = nd, u
                    heapq.heappush(pq, (nd, v))
        return dist, prev

    def _shortest_path(prev, s, t):
        path = []
        while t != s:
            path.append(t)
            t = prev[t]
        path.append(s)
        return path[::-1]

    if len(node_ids) == 2:
        # 两点：直接算最短距离 + 最短时间
        s, t = node_ids
        _, prev_d = _dijkstra(dist_graph, s)
        _, prev_t = _dijkstra(time_graph, s)
        path_d = _shortest_path(prev_d, s, t)
        path_t = _shortest_path(prev_t, s, t)
    else:
        # 多点：TSP 顺序，然后拼接
        def _tsp_path(graph):
            n = len(node_ids)
            mat = {}
            for i, sid in enumerate(node_ids):
                dist_i, _ = _dijkstra(graph, sid)
                for j, tid in enumerate(node_ids):
                    mat[i, j] = dist_i[tid]
            order = nx.algorithms.approximation.traveling_salesman_problem(
                nx.complete_graph(n), weight=lambda u, v, d: mat[u, v], cycle=True
            )
            full: list[int] = []
            for a, b in zip(order, order[1:]):
                _, prevp = _dijkstra(graph, node_ids[a])
                seg = _shortest_path(prevp, node_ids[a], node_ids[b])
                full.extend(seg[:-1])
            full.append(node_ids[order[-1]])
            return full

        path_d = _tsp_path(dist_graph)
        path_t = _tsp_path(time_graph)

    #绘图
    lat0, lon0 = coords[0]
    m = folium.Map(location=[lat0, lon0], zoom_start=15, tiles="CartoDB positron")
    print("图已生成")
    # 路线折线
    folium.PolyLine([node_xy[n] for n in path_d], color="blue", weight=5, popup="距离最短").add_to(m)
    folium.PolyLine([node_xy[n] for n in path_t], color="brown", weight=5, popup="时间最短").add_to(m)

    #动画：在路径上添加移动点
    tz = ZoneInfo("Asia/Shanghai")
    base_t = datetime.now(tz)
    feats = []

    # 蓝线（距离最短）上的点
    for idx_pt, n in enumerate(path_d):
        lat_pt, lon_pt = node_xy[n]
        feats.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon_pt, lat_pt]},
            "properties": {
                "time": (base_t + timedelta(seconds=idx_pt)).isoformat(),
                "trackId": "dist",
                "icon": "circle",
                "iconstyle": {"fillColor": "blue", "radius": 5},
            },
        })

    # 棕线（时间最短）上的点
    for idx_pt, n in enumerate(path_t):
        lat_pt, lon_pt = node_xy[n]
        feats.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon_pt, lat_pt]},
            "properties": {
                "time": (base_t + timedelta(seconds=idx_pt)).isoformat(),
                "trackId": "time",
                "icon": "circle",
                "iconstyle": {"fillColor": "brown", "radius": 5},
            },
        })

    TimestampedGeoJson(
        {"type": "FeatureCollection", "features": feats},
        period="PT1S",      # 每秒一步
        duration="PT0S",    # 0 秒后立即消失
        add_last_point=False,
        transition_time=200,
        auto_play=True,
        loop=False
    ).add_to(m)
    print("动画已生成")
    # 起点 / 途经点 / 终点
    for idx_pt, (name, (lat, lon)) in enumerate(zip(names, coords)):
        color = "red" if idx_pt == 0 else "green"
        icon = "flag" if idx_pt == 0 else "info-sign"
        folium.Marker([lat, lon], popup=name, icon=folium.Icon(color=color, icon=icon)).add_to(m)
    print("起始点已添加")
    #边拥挤度 & 最优模式可视化
    # 三种模式的渐变配色：汽车(灰→绿)、自行车(浅黄→深橙)、行人(浅粉→深红)
    for idx, row in edges_gdf.iterrows():
        u, v, key = idx
        coords_line = [(y, x) for y, x in zip(row.geometry.xy[1], row.geometry.xy[0])]
        mode_best = best_mode_map[idx]

        if mode_best == 0:
            # 汽车：灰→绿
            car_c, bike_c, walk_c = congestion_map[idx]
            norm = (car_c - 0.3) / (1.5 - 0.3)
            r = int(255 * (0.8 * (1 - norm)))
            g = int(255 * (0.5 + 0.5 * norm))
            b = int(255 * (0.8 * (1 - norm)))
            color = f"#{r:02x}{g:02x}{b:02x}"

        elif mode_best == 1:
            # 自行车：浅黄→深橙 (用 bike_cong 归一化)
            car_c, bike_c, walk_c = congestion_map[idx]
            norm_b = (bike_c - 0.3) / (1.5 - 0.3)
            # 淡黄( rgb(255, 255, 150) ) 到 深橙( rgb(255, 100, 0) )
            r = 255
            g = int(255 - 155 * norm_b)   # 255→100
            b = int(150 - 150 * norm_b)   # 150→0
            color = f"#{r:02x}{g:02x}{b:02x}"

        else:
            # 行人：浅粉→深红 (用 walk_cong 归一化)
            car_c, bike_c, walk_c = congestion_map[idx]
            norm_w = (walk_c - 0.3) / (1.5 - 0.3)
            # 浅粉( rgb(255, 200, 200) ) 到 深红( rgb(200, 0, 0) )
            r = int(255 - 55 * norm_w)   # 255→200
            g = int(200 - 200 * norm_w)  # 200→0
            b = int(200 - 200 * norm_w)  # 200→0
            color = f"#{r:02x}{g:02x}{b:02x}"

        folium.PolyLine(coords_line, color=color, weight=2, opacity=0.6).add_to(m)
    print("道路已生成")
    #图例：显示拥挤度范围、模式颜色及路径说明
    all_car = edges_gdf["car_cong"].values
    car_min, car_max = float(all_car.min()), float(all_car.max())
    all_bike = edges_gdf["bike_cong"].values
    bike_min, bike_max = float(all_bike.min()), float(all_bike.max())
    all_walk = edges_gdf["walk_cong"].values
    walk_min, walk_max = float(all_walk.min()), float(all_walk.max())

    legend_html = f"""
        <div style='position:fixed;bottom:50px;left:50px;width:300px;
                    background:#fff;border:2px solid #666;padding:10px;
                    font-size:14px;z-index:9999;'>
          <b>图例</b><br>
          机动车(汽车观光车)基础60速拥挤度：{car_min:.2f} ~ {car_max:.2f}（灰→绿）<br>
          电瓶车基础20速拥挤度：{bike_min:.2f} ~ {bike_max:.2f}（浅黄→深橙）<br>
          行人基础7速拥挤度：{walk_min:.2f} ~ {walk_max:.2f}（浅粉→深红）<br>
          <hr style='margin:4px 0;'/>
          <span style='color:red;'>●</span> 起点<br>
          <span style='color:green;'>●</span> 途经/终点<br>
          <span style='color:blue;'>▬</span> 距离最短<br>
          <span style='color:brown;'>▬</span> 时间最短<br>
        </div>
    """
    m.get_root().html.add_child(Element(legend_html))
    print("图例已添加")
    #保存
    save_dir = os.path.join(here, "..", "frontend", "views")
    os.makedirs(save_dir, exist_ok=True)
    m.save(os.path.join(save_dir, "route-planning2.html"))
    print("✔ 路线已保存到 frontend/views/route-planning2.html")
