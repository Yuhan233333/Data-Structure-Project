// 创建 Vue 应用
const app = Vue.createApp({
    data() {
        return {
            map: null,
            searchQuery: '',
            activeType: 'all',
            sortBy: 'rating',
            places: [
                {
                    id: 1,
                    name: '故宫博物院',
                    type: 'cultural',
                    image: '../assets/images/forbidden-city.jpg',
                    rating: 4.9,
                    address: '北京市东城区景山前街4号',
                    distance: 0,
                    popularity: 98,
                    location: [39.9169, 116.3907]
                },
                {
                    id: 2,
                    name: '南锣鼓巷',
                    type: 'entertainment',
                    image: '../assets/images/nanluoguxiang.jpg',
                    rating: 4.7,
                    address: '北京市东城区南锣鼓巷',
                    distance: 2.5,
                    popularity: 92,
                    location: [39.9367, 116.4033]
                },
                {
                    id: 3,
                    name: '北海公园',
                    type: 'nature',
                    image: '../assets/images/beihai-park.jpg',
                    rating: 4.6,
                    address: '北京市西城区文津街1号',
                    distance: 1.8,
                    popularity: 85,
                    location: [39.9263, 116.3906]
                }
            ]
        }
    },
    computed: {
        filteredPlaces() {
            let result = [...this.places];
            
            // 按类型筛选
            if (this.activeType !== 'all') {
                result = result.filter(place => place.type === this.activeType);
            }
            
            // 按搜索词筛选
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase();
                result = result.filter(place => 
                    place.name.toLowerCase().includes(query) ||
                    place.address.toLowerCase().includes(query)
                );
            }
            
            // 排序
            switch(this.sortBy) {
                case 'rating':
                    result.sort((a, b) => b.rating - a.rating);
                    break;
                case 'distance':
                    result.sort((a, b) => a.distance - b.distance);
                    break;
                case 'popularity':
                    result.sort((a, b) => b.popularity - a.popularity);
                    break;
            }
            
            return result;
        }
    },
    methods: {
        filterByType(type) {
            this.activeType = type;
        },
        sortPlaces(criterion) {
            this.sortBy = criterion;
        },
        viewPlaceDetails(placeId) {
            const place = this.places.find(p => p.id === placeId);
            if (place) {
                ElementPlus.ElMessage({
                    message: `正在查看${place.name}的详细信息`,
                    type: 'info'
                });
            }
        },
        initMap() {
            // 初始化地图，设置中心点为北京市中心
            this.map = L.map('map').setView([39.9042, 116.4074], 12);
            
            // 添加OpenStreetMap图层
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(this.map);
            
            // 为每个地点添加标记
            this.places.forEach(place => {
                L.marker(place.location)
                    .bindPopup(`
                        <h3>${place.name}</h3>
                        <p>${place.address}</p>
                        <p>评分: ${place.rating}</p>
                        <button onclick="viewPlaceDetails(${place.id})" class="popup-btn">查看详情</button>
                    `)
                    .addTo(this.map);
            });
        }
    },
    mounted() {
        this.initMap();
    }
});

app.use(ElementPlus);
app.mount('#app');

// 全局函数，用于从地图弹窗中调用
window.viewPlaceDetails = function(placeId) {
    app._instance.proxy.viewPlaceDetails(placeId);
}; 