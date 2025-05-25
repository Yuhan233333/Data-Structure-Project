// 检查登录状态
function checkLogin() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
        window.location.href = 'views/login.html';
        return false;
    }
    return true;
}

// 推荐系统类
class RecommendationSystem {
    constructor() {
        // 首先检查登录状态
        if (!checkLogin()) return;
        
        this.spots = [];
        this.typeMap = {};
        this.keywordsMap = {};
        this.apiBaseUrl = window.location.protocol === 'file:' ? 
            'http://localhost:5000/api' : '/api';  // 根据运行环境选择API地址
    }

    // 加载景点数据
    async loadSpotsData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/spots`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            // 数据预处理
            this.spots = data.map(spot => ({
                name: spot.name,
                type: spot.type,
                score: parseFloat(spot.score),
                popularity: parseInt(spot.popularity),
                keywords: spot.keywords,
                image: spot.image || 'https://via.placeholder.com/300x200',
                description: spot.description || '暂无描述'
            }));

            // 构建类型映射
            this.spots.forEach(spot => {
                if (!this.typeMap[spot.type]) {
                    this.typeMap[spot.type] = [];
                }
                this.typeMap[spot.type].push(spot);
            });

            // 构建关键词映射
            this.spots.forEach(spot => {
                spot.keywords.forEach(keyword => {
                    if (!this.keywordsMap[keyword]) {
                        this.keywordsMap[keyword] = [];
                    }
                    this.keywordsMap[keyword].push(spot);
                });
            });

            return true;
        } catch (error) {
            console.error('加载景点数据失败:', error);
            ElementPlus.ElMessage.error('加载数据失败，请检查后端服务是否正常运行');
            return false;
        }
    }

    // 获取推荐景点
    getRecommendations(size = 10, start = 0, sortBy = 'popularity') {
        const sortedSpots = this._sortSpots([...this.spots], sortBy);
        return sortedSpots.slice(start, start + size);
    }

    // 按类型获取推荐
    getRecommendationsByType(type, size = 10, start = 0, sortBy = 'popularity') {
        if (!this.typeMap[type]) {
            return [];
        }
        const sortedSpots = this._sortSpots([...this.typeMap[type]], sortBy);
        return sortedSpots.slice(start, start + size);
    }

    // 按关键词搜索
    searchByKeyword(keyword, size = 10, start = 0, sortBy = 'popularity') {
        // 从关键词映射中获取景点
        const keywordSpots = this.keywordsMap[keyword] || [];
        
        // 获取包含关键词的其他景点
        const additionalSpots = this.spots.filter(spot => 
            spot.keywords.some(kw => kw.includes(keyword)) && 
            !keywordSpots.includes(spot)
        );

        const allSpots = [...keywordSpots, ...additionalSpots];
        const sortedSpots = this._sortSpots(allSpots, sortBy);
        return sortedSpots.slice(start, start + size);
    }

    // 按名称搜索
    searchByName(name, size = 10, start = 0, sortBy = 'popularity') {
        const matchedSpots = this.spots.filter(spot => 
            spot.name.toLowerCase().includes(name.toLowerCase())
        );
        const sortedSpots = this._sortSpots(matchedSpots, sortBy);
        return sortedSpots.slice(start, start + size);
    }

    // 内部排序方法
    _sortSpots(spots, sortBy) {
        return spots.sort((a, b) => {
            if (sortBy === 'score') {
                return b.score - a.score || b.popularity - a.popularity;
            }
            // 默认按热度排序
            return b.popularity - a.popularity;
        });
    }
}

// 创建Vue应用
const app = Vue.createApp({
    data() {
        return {
            recommendSystem: null,
            activeTab: '个性化',
            recommendations: [],
            loading: false,
            currentPage: 1,
            pageSize: 10,
            totalSpots: 0,
            selectedType: '全部',
            sortBy: 'popularity',
            searchQuery: '',
            types: ['全部', '自然风光', '文化古迹', '主题乐园', '美食街区', '购物中心'],
            username: localStorage.getItem('username') || '游客',
            // 导航选项
            navigationOptions: {
                selectedStrategy: '最短距离',
                strategies: ['最短距离', '最少时间', 'AI优化']
            }
        }
    },
    methods: {
        // 初始化推荐系统
        async initRecommendSystem() {
            this.loading = true;
            this.recommendSystem = new RecommendationSystem();
            const success = await this.recommendSystem.loadSpotsData();
            if (success) {
                await this.loadRecommendations();
            }
            this.loading = false;
        },

        // 加载推荐
        async loadRecommendations() {
            if (!this.recommendSystem) return;
            
            this.loading = true;
            try {
                const start = (this.currentPage - 1) * this.pageSize;
                
                if (this.searchQuery) {
                    this.recommendations = this.recommendSystem.searchByName(
                        this.searchQuery,
                        this.pageSize,
                        start,
                        this.sortBy
                    );
                } else if (this.selectedType !== '全部') {
                    this.recommendations = this.recommendSystem.getRecommendationsByType(
                        this.selectedType,
                        this.pageSize,
                        start,
                        this.sortBy
                    );
                } else {
                    this.recommendations = this.recommendSystem.getRecommendations(
                        this.pageSize,
                        start,
                        this.sortBy
                    );
                }
            } catch (error) {
                console.error('加载推荐失败:', error);
                ElementPlus.ElMessage.error('加载推荐失败，请重试');
            } finally {
                this.loading = false;
            }
        },

        // 切换标签
        switchTab(tab) {
            this.activeTab = tab;
            this.currentPage = 1;
            this.loadRecommendations();
        },

        // 切换类型
        switchType(type) {
            this.selectedType = type;
            this.currentPage = 1;
            this.loadRecommendations();
        },

        // 切换排序方式
        switchSort(sort) {
            this.sortBy = sort;
            this.loadRecommendations();
        },

        // 搜索
        handleSearch() {
            this.currentPage = 1;
            this.loadRecommendations();
        },

        // 查看详情
        viewDetails(spot) {
            ElementPlus.ElMessage({
                message: `正在查看${spot.name}的详细信息`,
                type: 'info'
            });
        },

        // 页面变化
        handlePageChange(page) {
            this.currentPage = page;
            this.loadRecommendations();
        },

        // 退出登录
        handleLogout() {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('username');
            localStorage.removeItem('userRole');
            window.location.href = 'views/login.html';
        },

        // 导航相关方法
        selectNavigationStrategy(strategy) {
            this.navigationOptions.selectedStrategy = strategy;
            // TODO: 实现导航策略切换逻辑
        }
    },
    mounted() {
        // 检查登录状态
        if (checkLogin()) {
            this.recommendSystem = new RecommendationSystem();
            this.initRecommendSystem();
        }
    }
});

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 