// 创建Vue应用
const app = Vue.createApp({
    data() {
        return {
            // 搜索相关
            searchQuery: '',
            activeType: '全部',
            sortMethod: 'rating',
            
            // 数据相关
            places: [],
            types: [],
            loading: false,
            error: null
        }
    },
    
    computed: {
        // 过滤和排序后的场所列表
        filteredPlaces() {
            let result = [...this.places]
            
            // 按类型过滤
            if (this.activeType !== '全部') {
                result = result.filter(place => place.type === this.activeType)
            }
            
            // 按评分或热度排序
            result.sort((a, b) => {
                if (this.sortMethod === 'rating') {
                    return b.rating - a.rating
                } else {
                    return b.popularity - a.popularity
                }
            })
            
            return result
        }
    },
    
    methods: {
        // 加载场所数据
        async loadPlaces() {
            this.loading = true
            this.error = null
            
            try {
                // 获取场所类型列表
                const typesResponse = await fetch('/api/places/types')
                const typesData = await typesResponse.json()
                if (typesData.code === 200) {
                    this.types = ['全部', ...typesData.data]
                }
                
                // 获取场所列表
                const response = await fetch('/api/places')
                const data = await response.json()
                if (data.code === 200) {
                    this.places = data.data
                } else {
                    throw new Error(data.message)
                }
            } catch (err) {
                this.error = err.message
                console.error('加载场所数据失败:', err)
            } finally {
                this.loading = false
            }
        },
        
        // 搜索场所
        async searchPlaces() {
            this.loading = true
            this.error = null
            
            try {
                const response = await fetch(`/api/places?query=${encodeURIComponent(this.searchQuery)}`)
                const data = await response.json()
                if (data.code === 200) {
                    this.places = data.data
                } else {
                    throw new Error(data.message)
                }
            } catch (err) {
                this.error = err.message
                console.error('搜索场所失败:', err)
            } finally {
                this.loading = false
            }
        },
        
        // 按类型过滤
        async filterByType(type) {
            this.activeType = type
            this.loading = true
            this.error = null
            
            try {
                if (type === '全部') {
                    await this.loadPlaces()
                    return
                }
                const response = await fetch(`/api/places?type=${encodeURIComponent(type)}`)
                const data = await response.json()
                if (data.code === 200) {
                    this.places = data.data
                } else {
                    throw new Error(data.message)
                }
            } catch (err) {
                this.error = err.message
                console.error('按类型过滤失败:', err)
            } finally {
                this.loading = false
            }
        },
        
        // 查看场所详情
        viewPlaceDetails(place) {
            // 可扩展：弹窗或跳转详情页
            console.log('查看场所详情:', place)
        }
    },
    
    // 组件挂载时加载数据
    mounted() {
        this.loadPlaces()
    }
})

// 使用Element Plus组件
app.use(ElementPlus)
app.use(ElementPlusIconsVue)

// 挂载应用
app.mount('#app') 