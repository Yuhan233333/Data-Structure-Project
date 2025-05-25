// 创建 Vue 应用
const app = Vue.createApp({
    data() {
        return {
            activeTab: '个性化',
            activeNavOption: '最短距离',
            recommendations: [
                {
                    id: 1,
                    name: '西湖风景区',
                    image: './assets/place1.jpg',
                    rating: 4.9,
                    duration: '约2小时'
                },
                {
                    id: 2,
                    name: '灵隐寺',
                    image: './assets/place2.jpg',
                    rating: 4.8,
                    duration: '约1.5小时'
                },
                {
                    id: 3,
                    name: '千岛湖',
                    image: './assets/place3.jpg',
                    rating: 4.7,
                    duration: '约4小时'
                }
            ]
        }
    },
    methods: {
        // 切换推荐标签
        switchTab(tab) {
            this.activeTab = tab;
            // 这里可以添加获取不同类型推荐的逻辑
        },

        // 切换导航选项
        switchNavOption(option) {
            this.activeNavOption = option;
            // 这里可以添加切换路线规划策略的逻辑
        },

        // 查看详情
        viewDetails(id) {
            console.log('查看详情:', id);
            // 这里可以添加查看详情的逻辑
        }
    }
});

// 挂载应用
app.mount('#app'); 