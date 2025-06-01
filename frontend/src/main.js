// 创建 Vue 应用
const app = Vue.createApp({
    data() {
        return {
            activeTab: '热门榜单', // 当前激活的标签页：热门榜单 or 随机推荐
            allPlaces: [], // 所有景点数据
            allTypes: [], // 所有景点类型
            selectedTypes: [], // 已选择的类型
            loading: true,
            randomPlaces: [] // 随机推荐的景点
        }
    },
    computed: {
        // 筛选后的推荐景点
        filteredRecommendations() {
            // 如果是随机推荐，则直接返回随机景点
            if (this.activeTab === '随机推荐') {
                return this.randomPlaces;
            }
            
            // 热门榜单逻辑
            // 先筛选评分大于等于4.5的热门景点（放宽条件，确保有足够的景点显示）
            let filteredPlaces = this.allPlaces.filter(place => parseFloat(place.rating) >= 4.5);
            
            // 如果选择了特定类型，则进一步筛选
            if (this.selectedTypes.length > 0 && this.selectedTypes.length < this.allTypes.length) {
                filteredPlaces = filteredPlaces.filter(place => this.selectedTypes.includes(place.type));
            }
            
            // 使用部分排序找出前6个最高评分的景点
            return this.findTopK(filteredPlaces, 6, (a, b) => {
                const scoreA = 0.5 * parseFloat(a.rating) + 0.5 * parseFloat(a.popularity) / 10; // 将人气归一化到10分制
                const scoreB = 0.5 * parseFloat(b.rating) + 0.5 * parseFloat(b.popularity) / 10;
                return scoreB - scoreA;
            });
        }
    },
    methods: {
        // 使用快速选择算法找出前k个元素（不完全排序）
        findTopK(arr, k, compareFn) {
            if (arr.length <= k) return arr;
            
            // 创建数组副本，避免修改原数组
            const result = [...arr];
            
            // 使用最小堆实现部分排序
            // 先构建大小为k的最小堆
            for (let i = 0; i < k; i++) {
                this.heapifyDown(result, i, k, compareFn);
            }
            
            // 遍历剩余元素，如果比堆顶大，则替换堆顶并重新堆化
            for (let i = k; i < result.length; i++) {
                if (compareFn(result[i], result[0]) < 0) {
                    [result[0], result[i]] = [result[i], result[0]];
                    this.heapifyDown(result, 0, k, compareFn);
                }
            }
            
            // 对结果进行排序（只对前k个元素排序）
            return result.slice(0, k).sort(compareFn);
        },
        
        // 堆化操作
        heapifyDown(arr, i, size, compareFn) {
            let smallest = i;
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            
            if (left < size && compareFn(arr[left], arr[smallest]) < 0) {
                smallest = left;
            }
            
            if (right < size && compareFn(arr[right], arr[smallest]) < 0) {
                smallest = right;
            }
            
            if (smallest !== i) {
                [arr[i], arr[smallest]] = [arr[smallest], arr[i]];
                this.heapifyDown(arr, smallest, size, compareFn);
            }
        },
        
        // 切换推荐标签
        switchTab(tab) {
            this.activeTab = tab;
            
            // 如果切换到随机推荐，则生成随机推荐
            if (tab === '随机推荐') {
                this.generateRandomRecommendations();
            }
        },

        // 生成随机推荐
        generateRandomRecommendations() {
            if (this.allPlaces.length === 0) return;
            
            const randomPlaces = [];
            const placesCount = this.allPlaces.length;
            
            // 随机选择6个景点（允许重复）
            for (let i = 0; i < 6; i++) {
                const randomIndex = Math.floor(Math.random() * placesCount);
                randomPlaces.push({...this.allPlaces[randomIndex]});
            }
            
            this.randomPlaces = randomPlaces;
        },

        // 表达兴趣（点击"我感兴趣"按钮）
        async expressInterest(place) {
            try {
                console.log('表达兴趣:', place.name);
                
                // 先获取最新数据，确保与CSV文件同步
                await this.refreshPlaceData(place.name);
                
                // 调用API更新人气
                const response = await fetch('http://localhost:5000/api/places/interest', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: place.name,
                        increment: 0.1
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    // 更新成功后重新获取最新数据
                    await this.refreshPlaceData(place.name);
                    ElementPlus.ElMessage.success('感谢您的兴趣！');
                } else {
                    ElementPlus.ElMessage.error(data.message || '操作失败');
                }
            } catch (error) {
                console.error('表达兴趣失败:', error);
                ElementPlus.ElMessage.error('操作失败，请稍后重试');
            }
        },
        
        // 刷新单个景点数据
        async refreshPlaceData(placeName) {
            try {
                const response = await fetch('http://localhost:5000/api/places');
                if (response.ok) {
                    const data = await response.json();
                    // 找到对应景点
                    const placeData = data.find(p => p.name === placeName);
                    if (placeData) {
                        // 更新本地数据
                        const index = this.allPlaces.findIndex(p => p.name === placeName);
                        if (index !== -1) {
                            // 处理keywords字段
                            let keywords = placeData.keywords;
                            if (typeof keywords === 'string') {
                                keywords = keywords.split('|').filter(k => k.trim());
                            } else if (!Array.isArray(keywords)) {
                                keywords = [];
                            }
                            
                            // 更新数据，保留id和image
                            this.allPlaces[index] = {
                                ...placeData,
                                id: this.allPlaces[index].id,
                                keywords: keywords,
                                image: this.allPlaces[index].image
                            };
                            
                            // 如果是随机推荐中的景点，也需要更新
                            const randomIndex = this.randomPlaces.findIndex(p => p.name === placeName);
                            if (randomIndex !== -1) {
                                this.randomPlaces[randomIndex] = {
                                    ...this.allPlaces[index]
                                };
                            }
                            
                            return true;
                        }
                    }
                }
                return false;
            } catch (error) {
                console.error('刷新景点数据失败:', error);
                return false;
            }
        },
        
        // 处理图片加载错误
        handleImageError(e) {
            // 当图片加载失败时，替换为默认图片
            e.target.src = './assets/place1.jpg';
        },
        
        // 获取所有景点数据
        async fetchPlaces() {
            try {
                this.loading = true;
                const response = await fetch('http://localhost:5000/api/places');
                if (response.ok) {
                    const data = await response.json();
                    this.allPlaces = data.map((place, index) => {
                        // 处理keywords字段，确保它是数组
                        let keywords = place.keywords;
                        if (typeof keywords === 'string') {
                            keywords = keywords.split('|').filter(k => k.trim());
                        } else if (!Array.isArray(keywords)) {
                            keywords = [];
                        }
                        
                        return {
                            ...place,
                            id: index + 1,
                            keywords: keywords,
                            // 确保图片路径正确
                            image: place.image && place.image.includes('gugong.jpg') ? 
                                  '/backend/gugong.jpg' : 
                                  (place.image || '/backend/gugong.jpg')
                        };
                    });
                    
                    console.log('获取到的景点数据:', this.allPlaces);
                    
                    // 提取所有景点类型
                    this.allTypes = [...new Set(this.allPlaces.map(place => place.type))];
                    
                    // 生成随机推荐
                    this.generateRandomRecommendations();
                } else {
                    console.error('获取景点数据失败');
                    // 使用模拟数据
                    this.loadMockData();
                }
            } catch (error) {
                console.error('获取景点数据出错:', error);
                // 使用模拟数据
                this.loadMockData();
            } finally {
                this.loading = false;
            }
        },
        
        // 加载模拟数据
        loadMockData() {
            // 模拟数据
            this.allPlaces = [
                {
                    id: 1,
                    name: '故宫博物院',
                    type: '历史名胜',
                    rating: '4.8',
                    popularity: '10',
                    keywords: ['历史', '展览', '建筑'],
                    image: '/backend/gugong.jpg'
                },
                {
                    id: 2,
                    name: '北京环球度假区',
                    type: '主题公园',
                    rating: '4.5',
                    popularity: '10',
                    keywords: ['娱乐', '主题公园'],
                    image: '/backend/gugong.jpg'
                },
                {
                    id: 3,
                    name: '八达岭长城',
                    type: '历史名胜',
                    rating: '4.7',
                    popularity: '10',
                    keywords: ['历史', '建筑', '地标'],
                    image: '/backend/gugong.jpg'
                },
                {
                    id: 4,
                    name: '中国国家博物馆',
                    type: '展馆展览',
                    rating: '4.8',
                    popularity: '9.0',
                    keywords: ['历史', '展览', '文化'],
                    image: '/backend/gugong.jpg'
                },
                {
                    id: 5,
                    name: '恭王府',
                    type: '历史名胜',
                    rating: '4.7',
                    popularity: '8.9',
                    keywords: ['历史', '建筑', '文化'],
                    image: '/backend/gugong.jpg'
                },
                {
                    id: 6,
                    name: '颐和园',
                    type: '历史名胜',
                    rating: '4.7',
                    popularity: '8.9',
                    keywords: ['历史', '建筑', '园林'],
                    image: '/backend/gugong.jpg'
                }
            ];
            
            console.log('使用模拟数据:', this.allPlaces);
            
            // 提取所有景点类型
            this.allTypes = [...new Set(this.allPlaces.map(place => place.type))];
            
            // 生成随机推荐
            this.generateRandomRecommendations();
        },
        
        // 切换所有类型
        toggleAllTypes() {
            if (this.selectedTypes.length === this.allTypes.length) {
                this.selectedTypes = [];
            } else {
                this.selectedTypes = [...this.allTypes];
            }
        },
        
        // 切换单个类型
        toggleType(type) {
            const index = this.selectedTypes.indexOf(type);
            if (index === -1) {
                this.selectedTypes.push(type);
            } else {
                this.selectedTypes.splice(index, 1);
            }
        },
        
        // 刷新随机推荐
        refreshRandomRecommendations() {
            this.generateRandomRecommendations();
            ElementPlus.ElMessage.success('已刷新随机推荐');
        }
    },
    mounted() {
        // 页面加载时获取景点数据
        this.fetchPlaces();
        // 默认选中所有类型
        setTimeout(() => {
            this.selectedTypes = [...this.allTypes];
        }, 500);
    }
});

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 