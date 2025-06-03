// 后端API的基础URL
const API_BASE_URL = 'http://localhost:5000';

/**
 * 创建Vue个人中心应用实例
 */
const app = Vue.createApp({
    /**
     * 定义响应式数据
     */
    data() {
        return {
            // 用户基本信息
            username: sessionStorage.getItem('username') || '',
            userRole: sessionStorage.getItem('role') || 'user',
            activeTab: 'security', // 当前激活的标签页

            // 密码修改表单
            passwordForm: {
                oldPassword: '',
                newPassword: '',
                confirmPassword: ''
            },

            // 日记统计
            statistics: {
                diaryCount: 0,
                averageRating: 0,
                lastUpdate: null
            }
        }
    },

    /**
     * 生命周期钩子：组件挂载时
     */
    async mounted() {
        // 检查用户是否已登录
        await this.checkAuth();
        // 加载日记统计信息
        await this.loadStatistics();
    },

    methods: {
        /**
         * 检查用户认证状态
         */
        async checkAuth() {
            try {
                const username = sessionStorage.getItem('username');
                const token = sessionStorage.getItem('token');
                
                if (!username || !token) {
                    window.location.href = 'login.html';
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/api/check_auth`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'X-Username': username
                    }
                });

                if (response.status === 401) {
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('username');
                    sessionStorage.removeItem('role');
                    window.location.href = 'login.html';
                    return;
                }

                const data = await response.json();
                if (!data.isAuthenticated) {
                    window.location.href = 'login.html';
                    return;
                }

                if (data.user && data.user.role) {
                    this.userRole = data.user.role;
                    sessionStorage.setItem('role', data.user.role);
                }
            } catch (error) {
                console.error('认证检查失败:', error);
                ElementPlus.ElMessage.error('认证检查失败，请重新登录');
                window.location.href = 'login.html';
            }
        },

        /**
         * 退出登录
         */
        async logout() {
            // 显示确认对话框
            ElementPlus.ElMessageBox.confirm(
                '确定要退出登录吗？',
                '提示',
                {
                    confirmButtonText: '确定',
                    cancelButtonText: '取消',
                    type: 'warning',
                }
            ).then(async () => {
                try {
                    // 调用后端退出接口
                    const response = await fetch(`${API_BASE_URL}/api/logout`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
                            'X-Username': sessionStorage.getItem('username')
                        }
                    });

                    const data = await response.json();
                    if (data.success) {
                        // 清除会话存储的用户信息
                        sessionStorage.removeItem('token');
                        sessionStorage.removeItem('username');
                        sessionStorage.removeItem('role');
                        
                        // 显示退出成功消息
                        ElementPlus.ElMessage.success('退出登录成功');
                        
                        // 跳转到登录页面
                        setTimeout(() => {
                            window.location.href = 'login.html';
                        }, 500);
                    } else {
                        ElementPlus.ElMessage.error(data.message || '退出登录失败');
                    }
                } catch (error) {
                    console.error('退出登录失败:', error);
                    ElementPlus.ElMessage.error('退出登录失败，请稍后重试');
                }
            }).catch(() => {
                // 用户取消退出，不做任何操作
            });
        },

        /**
         * 修改密码
         */
        async changePassword() {
            if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
                ElementPlus.ElMessage.error('两次输入的密码不一致');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${this.username}/password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    },
                    body: JSON.stringify({
                        oldPassword: this.passwordForm.oldPassword,
                        newPassword: this.passwordForm.newPassword
                    })
                });

                const data = await response.json();
                if (data.success) {
                    ElementPlus.ElMessage.success('密码修改成功');
                    // 清空表单
                    this.passwordForm = {
                        oldPassword: '',
                        newPassword: '',
                        confirmPassword: ''
                    };
                } else {
                    ElementPlus.ElMessage.error(data.message || '修改密码失败');
                }
            } catch (error) {
                console.error('修改密码失败:', error);
                ElementPlus.ElMessage.error('修改密码失败，请稍后重试');
            }
        },

        /**
         * 加载日记统计信息
         */
        async loadStatistics() {
            try {
                // 初始化IndexedDB
                const db = await this.initDB();
                const transaction = db.transaction(['diaries'], 'readonly');
                const store = transaction.objectStore('diaries');
                const request = store.getAll();

                request.onsuccess = () => {
                    const diaries = request.result;
                    const userDiaries = diaries.filter(diary => diary.author === this.username);
                    
                    // 计算统计数据
                    this.statistics = {
                        diaryCount: userDiaries.length,
                        averageRating: this.calculateAverageRating(userDiaries),
                        lastUpdate: this.getLastUpdateTime(userDiaries)
                    };
                };

                request.onerror = () => {
                    console.error('加载日记统计失败');
                    ElementPlus.ElMessage.error('加载日记统计失败');
                };
            } catch (error) {
                console.error('加载日记统计失败:', error);
                ElementPlus.ElMessage.error('加载日记统计失败');
            }
        },

        /**
         * 初始化IndexedDB数据库
         */
        async initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('TravelDiaryDB', 1);

                request.onerror = () => {
                    reject('数据库打开失败');
                };

                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('diaries')) {
                        db.createObjectStore('diaries', { keyPath: 'id' });
                    }
                };
            });
        },

        /**
         * 计算平均评分
         */
        calculateAverageRating(diaries) {
            const ratedDiaries = diaries.filter(diary => diary.ratings && diary.ratings.length > 0);
            if (ratedDiaries.length === 0) return 0;

            const totalRating = ratedDiaries.reduce((sum, diary) => {
                const diaryRating = diary.ratings.reduce((acc, r) => acc + r.score, 0) / diary.ratings.length;
                return sum + diaryRating;
            }, 0);

            return (totalRating / ratedDiaries.length).toFixed(1);
        },

        /**
         * 获取最近更新时间
         */
        getLastUpdateTime(diaries) {
            if (diaries.length === 0) return null;
            
            const lastDiary = diaries.reduce((latest, diary) => {
                return new Date(diary.updatedAt) > new Date(latest.updatedAt) ? diary : latest;
            }, diaries[0]);

            return new Date(lastDiary.updatedAt).toLocaleString();
        }
    }
});

// 使用Element Plus
app.use(ElementPlus);

// 挂载Vue应用到DOM
app.mount('#app'); 