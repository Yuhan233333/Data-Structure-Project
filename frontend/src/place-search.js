// 创建 Vue 应用
const app = Vue.createApp({
    data() {
        return {
            searchQuery: '',
            activeType: '全部',
            sortBy: 'rating',
            places: [
                {
                    id: 1,
                    name: '西湖风景区',
                    type: '景点',
                    image: '../assets/place1.jpg',
                    rating: 4.9,
                    address: '浙江省杭州市西湖区龙井路1号',
                    distance: '步行15分钟',
                    popularity: 98
                },
                {
                    id: 2,
                    name: '楼外楼',
                    type: '餐厅',
                    image: '../assets/place2.jpg',
                    rating: 4.7,
                    address: '浙江省杭州市上城区孤山路30号',
                    distance: '步行20分钟',
                    popularity: 95
                },
                {
                    id: 3,
                    name: '杭州西子湖四季酒店',
                    type: '酒店',
                    image: '../assets/place3.jpg',
                    rating: 4.8,
                    address: '浙江省杭州市西湖区灵隐路5号',
                    distance: '步行25分钟',
                    popularity: 96
                }
            ]
        }
    },
    computed: {
        filteredPlaces() {
            return this.places
                .filter(place => {
                    // 类型筛选
                    if (this.activeType !== '全部' && place.type !== this.activeType) {
                        return false;
                    }
                    // 搜索筛选
                    if (this.searchQuery) {
                        const query = this.searchQuery.toLowerCase();
                        return place.name.toLowerCase().includes(query) ||
                               place.address.toLowerCase().includes(query);
                    }
                    return true;
                })
                .sort((a, b) => {
                    // 排序
                    switch (this.sortBy) {
                        case 'rating':
                            return b.rating - a.rating;
                        case 'distance':
                            return a.distance.localeCompare(b.distance);
                        case 'popularity':
                            return b.popularity - a.popularity;
                        default:
                            return 0;
                    }
                });
        }
    },
    methods: {
        filterByType(type) {
            this.activeType = type;
        },
        sortPlaces(sortType) {
            this.sortBy = sortType;
        },
        viewPlaceDetails(id) {
            // 查看详情的逻辑
            console.log('查看场所详情:', id);
        },
        initMap() {
            // 初始化地图的逻辑
            console.log('初始化3D地图...');
        }
    },
    mounted() {
        this.initMap();
    }
});

// 挂载应用
app.mount('#app'); 