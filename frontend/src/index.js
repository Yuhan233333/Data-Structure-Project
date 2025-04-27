// 创建Vue应用
const app = Vue.createApp({
    data() {
        return {
            map: null,
            markers: [],
            places: [
                {
                    name: '故宫博物院',
                    location: [39.9169, 116.3907],
                    description: '中国明清两代的皇家宫殿'
                },
                {
                    name: '天安门广场',
                    location: [39.9054, 116.3976],
                    description: '世界上最大的城市广场'
                },
                {
                    name: '颐和园',
                    location: [40.0000, 116.2755],
                    description: '最大的皇家园林'
                },
                {
                    name: '长城八达岭',
                    location: [40.3544, 116.0197],
                    description: '万里长城最著名的段落'
                },
                {
                    name: '天坛',
                    location: [39.8822, 116.4066],
                    description: '明清两代皇帝祭天的场所'
                }
            ]
        }
    },
    mounted() {
        this.initMap();
    },
    methods: {
        initMap() {
            // 初始化地图，设置中心点为北京市中心
            this.map = L.map('map').setView([39.9042, 116.4074], 12);

            // 添加OpenStreetMap图层
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);

            // 添加景点标记
            this.places.forEach(place => {
                const marker = L.marker(place.location)
                    .bindPopup(`
                        <h3>${place.name}</h3>
                        <p>${place.description}</p>
                        <button onclick="showPlaceDetails('${place.name}')" class="popup-btn">查看详情</button>
                    `)
                    .addTo(this.map);
                this.markers.push(marker);
            });
        },

        resetMapView() {
            // 重置地图视图到北京市中心
            this.map.setView([39.9042, 116.4074], 12);
        },

        showPlaceDetails(placeName) {
            // 显示景点详情的方法
            const place = this.places.find(p => p.name === placeName);
            if (place) {
                ElementPlus.ElMessage({
                    message: `正在查看${place.name}的详细信息`,
                    type: 'info'
                });
            }
        }
    }
});

// 挂载Vue应用
app.use(ElementPlus);
app.mount('#app');

// 全局函数，用于从地图弹窗中调用
window.showPlaceDetails = function(placeName) {
    app._instance.proxy.showPlaceDetails(placeName);
}; 