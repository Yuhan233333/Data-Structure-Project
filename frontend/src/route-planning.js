// 创建Vue应用
const app = Vue.createApp({
    data() {
        return {
            // 地图相关
            map: null,
            markers: [],
            routeLayer: null,
            tileLayer: null,
            mapBounds: null,
            isMapLoaded: false,
            mapLoadingPromise: null,

            // 出行方式
            transportMode: 'walking', // 'walking', 'driving', 'transit'

            // 路线策略
            routeStrategy: 'fastest', // 'fastest', 'shortest', 'scenic'

            // 起终点
            startPoint: '',
            endPoint: '',
            startCoords: null,  // 起点坐标
            endCoords: null,    // 终点坐标

            // 路线详情
            showRouteDetails: false,
            routeDistance: 0,
            routeDuration: 0,
            routeSteps: [],

            // API基础URL
            API_BASE_URL: 'http://localhost:5000',

            // 地图缓存
            mapCache: new Map(),
            preloadQueue: [],
            isPreloading: false
        }
    },

    mounted() {
        this.initMap();
        // 监听地图移动事件，预加载新区域
        this.map.on('moveend', this.handleMapMoveEnd);
    },

    methods: {
        // 初始化地图
        async initMap() {
            // 创建地图实例，设置中心点为北京市中心
            this.map = L.map('map', {
                zoomControl: false,  // 禁用默认缩放控件
                attributionControl: false,  // 禁用默认属性控件
                preferCanvas: true,  // 使用Canvas渲染器提高性能
                maxZoom: 18,  // 限制最大缩放级别
                minZoom: 5,   // 限制最小缩放级别
            }).setView([39.9042, 116.4074], 13);

            // 添加自定义缩放控件
            L.control.zoom({
                position: 'topright'
            }).addTo(this.map);

            // 添加OpenStreetMap图层，使用本地缓存
            this.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18,
                subdomains: 'abc',  // 使用多个子域名提高并发
                crossOrigin: true,  // 允许跨域
                updateWhenIdle: true,  // 仅在空闲时更新
                updateWhenZooming: false,  // 缩放时不更新
                keepBuffer: 4,  // 保持缓冲区大小
                maxNativeZoom: 18,  // 最大原生缩放级别
                tileSize: 256,  // 瓦片大小
                zoomOffset: 0,  // 缩放偏移
                detectRetina: true,  // 检测视网膜屏幕
            }).addTo(this.map);

            // 添加点击事件监听
            this.map.on('click', this.handleMapClick);

            // 预加载当前视图区域
            this.preloadCurrentView();
        },

        // 处理地图移动结束事件
        handleMapMoveEnd() {
            this.preloadCurrentView();
        },

        // 预加载当前视图区域
        async preloadCurrentView() {
            const bounds = this.map.getBounds();
            const center = bounds.getCenter();
            const radius = Math.max(
                geodesicDistance(center, bounds.getNorthEast()),
                geodesicDistance(center, bounds.getSouthWest())
            );

            // 将预加载任务添加到队列
            this.preloadQueue.push({
                lat: center.lat,
                lng: center.lng,
                radius: radius
            });

            // 如果当前没有预加载任务，开始处理队列
            if (!this.isPreloading) {
                this.processPreloadQueue();
            }
        },

        // 处理预加载队列
        async processPreloadQueue() {
            if (this.preloadQueue.length === 0) {
                this.isPreloading = false;
                return;
            }

            this.isPreloading = true;
            const task = this.preloadQueue.shift();

            try {
                await fetch(`${this.API_BASE_URL}/api/route/preload`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        lat: task.lat,
                        lon: task.lng,
                        radius: task.radius
                    })
                });
            } catch (error) {
                console.error('预加载失败:', error);
            }

            // 处理下一个任务
            this.processPreloadQueue();
        },

        // 处理地图点击事件
        handleMapClick(e) {
            const { lat, lng } = e.latlng;
            // 如果起点为空，设置为起点，否则设置为终点
            if (!this.startPoint) {
                this.startPoint = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                this.startCoords = [lat, lng];
                this.addMarker(lat, lng, 'start');
            } else if (!this.endPoint) {
                this.endPoint = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                this.endCoords = [lat, lng];
                this.addMarker(lat, lng, 'end');
            }
        },

        // 添加标记
        addMarker(lat, lng, type) {
            // 使用自定义图标
            const icon = L.icon({
                iconUrl: type === 'start' ? 
                    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png' :
                    'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });

            // 创建标记并添加到地图
            const marker = L.marker([lat, lng], { 
                icon,
                riseOnHover: true,  // 悬停时提升
                autoPan: true,      // 自动平移
                autoPanPadding: [50, 50]  // 自动平移边距
            }).addTo(this.map);

            // 绑定弹出窗口
            marker.bindPopup(type === 'start' ? '起点' : '终点', {
                closeButton: false,  // 禁用关闭按钮
                autoClose: false,    // 禁用自动关闭
                closeOnClick: false  // 禁用点击关闭
            }).openPopup();

            this.markers.push(marker);
        },

        // 清除所有标记
        clearMarkers() {
            this.markers.forEach(marker => marker.remove());
            this.markers = [];
            if (this.routeLayer) {
                this.routeLayer.remove();
            }
            this.startPoint = '';
            this.endPoint = '';
            this.startCoords = null;
            this.endCoords = null;
            this.showRouteDetails = false;
        },

        // 规划路线
        async calculateRoute() {
            if (!this.startCoords || !this.endCoords) {
                ElementPlus.ElMessage.warning('请先选择起点和终点');
                return;
            }

            try {
                // 显示加载提示
                const loading = ElementPlus.ElLoading.service({
                    lock: true,
                    text: '正在规划路线...',
                    background: 'rgba(0, 0, 0, 0.7)'
                });

                const response = await fetch(`${this.API_BASE_URL}/api/route/plan`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        start_lat: this.startCoords[0],
                        start_lon: this.startCoords[1],
                        end_lat: this.endCoords[0],
                        end_lon: this.endCoords[1],
                        strategy: this.routeStrategy
                    })
                });

                const data = await response.json();
                
                // 关闭加载提示
                loading.close();
                
                if (data.success) {
                    // 显示路线
                    this.displayRoute(data.route);
                    // 更新路线详情
                    this.updateRouteDetails(data.route);
                } else {
                    ElementPlus.ElMessage.error(data.message || '路线规划失败');
                }
            } catch (error) {
                console.error('路线规划请求失败:', error);
                ElementPlus.ElMessage.error('路线规划请求失败，请检查网络连接');
            }
        },

        // 显示路线
        displayRoute(route) {
            // 清除现有路线
            if (this.routeLayer) {
                this.routeLayer.remove();
            }

            // 创建路线图层
            const pathPoints = route.path.map(point => [point.lat, point.lon]);
            this.routeLayer = L.polyline(pathPoints, {
                color: '#1890ff',
                weight: 5,
                opacity: 0.7,
                lineJoin: 'round',  // 圆角连接
                lineCap: 'round',   // 圆角端点
                dashArray: null,    // 实线
                smoothFactor: 1.0,  // 平滑因子
                noClip: false       // 允许裁剪
            }).addTo(this.map);

            // 调整地图视图以显示完整路线
            this.map.fitBounds(this.routeLayer.getBounds(), {
                padding: [50, 50],
                maxZoom: 15  // 限制最大缩放级别
            });
        },

        // 更新路线详情
        updateRouteDetails(route) {
            this.routeDistance = (route.distance / 1000).toFixed(1); // 转换为公里
            this.routeDuration = Math.ceil(route.duration / 60); // 转换为分钟
            this.routeSteps = route.instructions.map(instruction => ({
                type: instruction.type,
                instruction: instruction.instruction,
                distance: instruction.distance
            }));
            this.showRouteDetails = true;
        },

        // 获取步骤图标
        getStepIcon(type) {
            const icons = {
                'start': 'fas fa-play-circle',
                'end': 'fas fa-flag-checkered',
                'turn': 'fas fa-exchange-alt',
                'straight': 'fas fa-arrow-up',
                'uturn': 'fas fa-undo',
                'roundabout': 'fas fa-sync'
            };
            return icons[type] || 'fas fa-arrow-right';
        },

        // 地图控制方法
        zoomIn() {
            this.map.zoomIn();
        },

        zoomOut() {
            this.map.zoomOut();
        },

        locateMe() {
            if (navigator.geolocation) {
                // 显示加载提示
                const loading = ElementPlus.ElLoading.service({
                    lock: true,
                    text: '正在获取位置...',
                    background: 'rgba(0, 0, 0, 0.7)'
                });

                navigator.geolocation.getCurrentPosition(
                    position => {
                        const { latitude, longitude } = position.coords;
                        this.map.setView([latitude, longitude], 15);
                        this.addMarker(latitude, longitude, 'start');
                        this.startPoint = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                        this.startCoords = [latitude, longitude];
                        loading.close();
                    },
                    error => {
                        ElementPlus.ElMessage.error('无法获取您的位置');
                        console.error('定位错误:', error);
                        loading.close();
                    },
                    {
                        enableHighAccuracy: true,  // 高精度定位
                        timeout: 5000,             // 超时时间
                        maximumAge: 0              // 不使用缓存
                    }
                );
            } else {
                ElementPlus.ElMessage.error('您的浏览器不支持地理定位');
            }
        }
    }
});

// 辅助函数：计算两点之间的距离（公里）
function geodesicDistance(point1, point2) {
    const R = 6371; // 地球半径（公里）
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLon = (point2.lng - point1.lng) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// 使用Element Plus
app.use(ElementPlus);

// 挂载Vue应用
app.mount('#app'); 