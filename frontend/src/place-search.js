const app = Vue.createApp({
    data() {
        return {
            places: [],
            searchQuery: '',
            activeType: '',
            sortBy: 'rating', // 默认使用评分排序
            types: [],
            currentPage: 1,
            pageSize: 10,
            loading: false,
            totalCount: 0,
            // 详情弹窗相关
            showDetailModal: false,
            selectedPlace: {},
            foods: [],
            foodSortBy: 'rating', // 默认使用评分排序
            // 菜品详情弹窗相关
            showFoodDetailModal: false,
            selectedFood: {}
        }
    },
    computed: {
        // 由于我们使用了后端分页和排序，这里不需要再进行过滤和排序
        paginatedPlaces() {
            return this.places;
        },
        totalPages() {
            return Math.ceil(this.totalCount / this.pageSize);
        },
        pageNumbers() {
            const pages = [];
            const maxVisiblePages = 5;
            
            if (this.totalPages <= maxVisiblePages) {
                // 如果总页数小于等于最大可见页数，显示所有页码
                for (let i = 1; i <= this.totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // 总是显示第一页
                pages.push(1);
                
                // 计算中间页码的起始和结束
                let startPage = Math.max(2, this.currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(this.totalPages - 1, startPage + maxVisiblePages - 3);
                
                // 调整起始页，确保显示足够的页码
                if (endPage - startPage < maxVisiblePages - 3) {
                    startPage = Math.max(2, endPage - (maxVisiblePages - 3));
                }
                
                // 添加省略号
                if (startPage > 2) {
                    pages.push('...');
                }
                
                // 添加中间页码
                for (let i = startPage; i <= endPage; i++) {
                    pages.push(i);
                }
                
                // 添加省略号
                if (endPage < this.totalPages - 1) {
                    pages.push('...');
                }
                
                // 总是显示最后一页
                pages.push(this.totalPages);
            }
            
            return pages;
        }
    },
    methods: {
        fetchPlaces() {
            this.loading = true;
            
            // 构建API URL，使用top端点
            let url = `http://localhost:5000/api/places/top?count=${this.pageSize}&sort_by=${this.sortBy}`;
            
            // 添加类型过滤
            if (this.activeType) {
                url += `&type=${encodeURIComponent(this.activeType)}`;
            }
            
            // 获取数据
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    // 处理返回的数据
                    this.places = data.map(place => {
                        // 处理keywords字段，确保它是数组
                        let keywords = place.keywords;
                        if (typeof keywords === 'string') {
                            keywords = keywords.split('|').filter(k => k.trim());
                        } else if (!Array.isArray(keywords)) {
                            keywords = [];
                        }
                        
                        return {
                            ...place,
                            keywords: keywords,
                            // 确保图片路径正确
                            image: place.image && place.image.includes('gugong.jpg') ? 
                                  '/backend/gugong.jpg' : 
                                  (place.image || '/backend/gugong.jpg')
                        };
                    });
                    
                    // 如果有搜索关键词，在前端进行过滤
                    if (this.searchQuery) {
                        const query = this.searchQuery.toLowerCase();
                        this.places = this.places.filter(place => 
                            place.name.toLowerCase().includes(query) || 
                            place.type.toLowerCase().includes(query) ||
                            place.keywords.some(keyword => keyword.toLowerCase().includes(query))
                        );
                    }
                    
                    // 获取总数量（用于计算分页）
                    fetch('http://localhost:5000/api/places')
                        .then(res => res.json())
                        .then(allData => {
                            // 计算符合条件的总数量
                            let filteredData = allData;
                            if (this.activeType) {
                                filteredData = filteredData.filter(p => p.type === this.activeType);
                            }
                            if (this.searchQuery) {
                                const q = this.searchQuery.toLowerCase();
                                filteredData = filteredData.filter(p => 
                                    p.name.toLowerCase().includes(q) || 
                                    p.type.toLowerCase().includes(q) ||
                                    (p.keywords && (typeof p.keywords === 'string' ? 
                                        p.keywords.toLowerCase().includes(q) : 
                                        p.keywords.some(k => k.toLowerCase().includes(q))))
                                );
                            }
                            this.totalCount = filteredData.length;
                        })
                        .catch(error => {
                            console.error('获取总数量失败:', error);
                            this.totalCount = this.places.length;
                        })
                        .finally(() => {
                            this.loading = false;
                        });
                    
                    // 获取所有类型（用于筛选）
                    fetch('http://localhost:5000/api/places/types')
                        .then(res => res.json())
                        .then(types => {
                            this.types = types;
                        })
                        .catch(error => {
                            console.error('获取类型失败:', error);
                            this.types = [...new Set(this.places.map(p => p.type))];
                        });
                })
                .catch(error => {
                    console.error('获取景点数据失败:', error);
                    this.loading = false;
                });
        },
        
        filterByType(type) {
            this.activeType = type;
            this.currentPage = 1; // 重置到第一页
            this.fetchPlaces();
        },
        
        sortPlaces(sort) {
            this.sortBy = sort;
            this.fetchPlaces();
        },
        
        goToPage(page) {
            if (typeof page === 'number' && page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                this.fetchPlaces();
                
                // 滚动到页面顶部
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        },
        
        previousPage() {
            if (this.currentPage > 1) {
                this.goToPage(this.currentPage - 1);
            }
        },
        
        nextPage() {
            if (this.currentPage < this.totalPages) {
                this.goToPage(this.currentPage + 1);
            }
        },
        
        // 处理图片加载错误
        handleImageError(e) {
            // 当图片加载失败时，替换为默认图片
            e.target.src = '../assets/place1.jpg';
        },
        
        // 显示详情弹窗
        async showDetail(place) {
            this.selectedPlace = {...place};
            this.showDetailModal = true;
            
            // 获取随机菜品数据
            await this.fetchRandomFoods();
            
            // 阻止页面滚动
            document.body.style.overflow = 'hidden';
        },
        
        // 显示菜品详情弹窗
        showFoodDetail(food) {
            this.selectedFood = {...food};
            this.showFoodDetailModal = true;
            
            // 阻止页面滚动
            document.body.style.overflow = 'hidden';
        },
        
        // 关闭菜品详情弹窗
        closeFoodDetail() {
            this.showFoodDetailModal = false;
            
            // 不要恢复页面滚动，因为景点详情弹窗仍然打开
        },
        
        // 关闭详情弹窗
        closeDetail() {
            this.showDetailModal = false;
            this.foods = [];
            
            // 确保菜品详情弹窗也关闭
            this.showFoodDetailModal = false;
            
            // 恢复页面滚动
            document.body.style.overflow = 'auto';
        },
        
        // 获取随机菜品数据
        async fetchRandomFoods() {
            try {
                const response = await fetch(`http://localhost:5000/api/foods/random?count=6&sort_by=${this.foodSortBy}&place_name=${encodeURIComponent(this.selectedPlace.name)}`);
                if (response.ok) {
                    this.foods = await response.json();
                } else {
                    console.error('获取菜品数据失败');
                    ElementPlus.ElMessage.error('获取菜品数据失败');
                }
            } catch (error) {
                console.error('获取菜品数据出错:', error);
                ElementPlus.ElMessage.error('获取菜品数据失败');
            }
        },
        
        // 排序菜品
        sortFoods(sortBy) {
            this.foodSortBy = sortBy;
            
            if (sortBy === 'rating') {
                this.foods.sort((a, b) => b.rating - a.rating);
            } else if (sortBy === 'popularity') {
                this.foods.sort((a, b) => b.popularity - a.popularity);
            } else if (sortBy === 'distance') {
                this.foods.sort((a, b) => a.distance - b.distance);
            }
        }
    },
    mounted() {
        this.fetchPlaces();
    }
});

// 使用Element Plus
app.use(ElementPlus);

app.mount('#app'); 