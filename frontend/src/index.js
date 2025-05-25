/*
 * @Author: Yuhan_233 1536943817@qq.com
 * @Date: 2025-04-17 14:28:41
 * @LastEditTime: 2025-04-27 14:59:13
 * @LastEditors: Yuhan_233 1536943817@qq.com
 * @FilePath: \Data-Structure-Project\frontend\src\index.js
 * @Description: 头部注释配置模板
 */
// API基础URL
const API_BASE_URL = window.location.protocol === 'file:' ? 
    'http://localhost:5000' : '';

// 创建Vue应用
const app = Vue.createApp({
    data() {
        return {
            spots: [], // 所有景点
            displayedSpots: [], // 当前显示的景点
            types: [], // 景点类型
            selectedType: '全部',
            searchQuery: '',
            sortBy: '热度',
            currentPage: 1,
            pageSize: 6, // 每页显示6个景点
            loading: true,
            error: null,
            username: localStorage.getItem('username') || '游客',
            activeTab: '个性化',
            dialogVisible: false,
            selectedSpot: null
        }
    },
    computed: {
        totalPages() {
            return Math.ceil(this.filteredSpots.length / this.pageSize)
        },
        filteredSpots() {
            let filtered = this.spots
            
            // 按类型筛选
            if (this.selectedType !== '全部') {
                filtered = filtered.filter(spot => spot.type === this.selectedType)
            }
            
            // 按搜索关键词筛选
            if (this.searchQuery) {
                const query = this.searchQuery.toLowerCase()
                filtered = filtered.filter(spot => 
                    spot.name.toLowerCase().includes(query) ||
                    spot.keywords.some(kw => kw.toLowerCase().includes(query))
                )
            }
            
            // 排序
            filtered.sort((a, b) => {
                if (this.sortBy === '热度') {
                    return b.popularity - a.popularity
                } else {
                    return b.score - a.score
                }
            })
            
            return filtered
        }
    },
    methods: {
        async fetchSpots() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/spots`)
                const data = await response.json()
                this.spots = data
                this.updateDisplayedSpots()
            } catch (error) {
                console.error('获取景点数据失败:', error)
                this.error = '获取景点数据失败，请刷新重试'
            } finally {
                this.loading = false
            }
        },
        async fetchTypes() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/spots/types`)
                const data = await response.json()
                this.types = ['全部', ...data]
            } catch (error) {
                console.error('获取景点类型失败:', error)
            }
        },
        updateDisplayedSpots() {
            const start = (this.currentPage - 1) * this.pageSize
            const end = start + this.pageSize
            this.displayedSpots = this.filteredSpots.slice(start, end)
        },
        handlePageChange(page) {
            this.currentPage = page
            this.updateDisplayedSpots()
            // 滚动到页面顶部
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            })
        },
        handleTypeChange(type) {
            this.selectedType = type
            this.currentPage = 1 // 重置页码
            this.updateDisplayedSpots()
        },
        handleSortChange(sort) {
            this.sortBy = sort
            this.updateDisplayedSpots()
        },
        switchTab(tab) {
            this.activeTab = tab
            // 这里可以添加不同标签页的处理逻辑
        },
        viewSpotDetails(spot) {
            this.selectedSpot = spot
            this.dialogVisible = true
        },
        handleLogout() {
            // 清除登录状态
            localStorage.removeItem('isLoggedIn')
            localStorage.removeItem('username')
            localStorage.removeItem('userRole')
            // 跳转到登录页面
            window.location.href = './views/login.html'
        },
        checkAuth() {
            // 检查是否已登录
            const isLoggedIn = localStorage.getItem('isLoggedIn')
            if (!isLoggedIn) {
                window.location.href = './views/login.html'
            }
        }
    },
    watch: {
        searchQuery() {
            this.currentPage = 1 // 搜索时重置页码
            this.updateDisplayedSpots()
        },
        filteredSpots() {
            this.updateDisplayedSpots()
        }
    },
    mounted() {
        // 检查登录状态
        this.checkAuth()
        // 获取数据
        this.fetchTypes()
        this.fetchSpots()
    }
});

// 挂载Vue应用
app.use(ElementPlus);
app.mount('#app');

// 全局函数，用于从地图弹窗中调用
window.showPlaceDetails = function(placeName) {
    app._instance.proxy.showPlaceDetails(placeName);
}; 