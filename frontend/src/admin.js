// 后端API的基础URL
const API_BASE_URL = 'http://localhost:5000';

/**
 * 创建Vue管理员界面应用实例
 */
const app = Vue.createApp({
    /**
     * 定义响应式数据
     * @returns {Object} 包含用户列表的对象
     */
    data() {
        return {
            users: [], // 存储所有用户的数组
            db: null,  // IndexedDB数据库对象
            diaries: [] // 新增：存储所有日记
        }
    },
    methods: {
        /**
         * 获取所有用户列表
         * 从后端API获取用户数据并更新到users数组
         */
        async fetchUsers() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                const data = await response.json();
                if (data.success) {
                    this.users = data.users;
                } else {
                    ElementPlus.ElMessage.error('获取用户列表失败');
                }
            } catch (error) {
                console.error('获取用户列表失败:', error);
                ElementPlus.ElMessage.error('获取用户列表失败，请检查网络连接');
            }
        },

        /**
         * 删除指定用户
         * @param {string} username - 要删除的用户名
         */
        async deleteUser(username) {
            // 二次确认
            if (!confirm('确定要删除这个用户吗？')) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${username}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = await response.json();
                if (data.success) {
                    ElementPlus.ElMessage.success('删除用户成功！');
                    // 刷新用户列表
                    await this.fetchUsers();
                } else {
                    ElementPlus.ElMessage.error(data.message || '删除用户失败');
                }
            } catch (error) {
                console.error('删除用户失败:', error);
                ElementPlus.ElMessage.error('删除用户失败，请检查网络连接');
            }
        },

        /**
         * 退出登录
         * 清除本地存储的认证信息并跳转到登录页面
         */
        logout() {
            // 清除所有认证信息
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            localStorage.removeItem('username');
            // 跳转到登录页面
            window.location.href = 'login.html';
        },

        /**
         * 检查管理员权限
         * 验证当前用户是否具有管理员权限
         */
        async checkAdminAuth() {
            const role = localStorage.getItem('role');
            if (role !== 'admin') {
                ElementPlus.ElMessage.warning('无权访问管理员页面');
                window.location.href = 'login.html';
            }
        },

        /**
         * 初始化IndexedDB数据库
         */
        async initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('TravelDiaryDB', 1);

                request.onerror = () => {
                    ElementPlus.ElMessage.error('数据库打开失败');
                    reject('数据库打开失败');
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    resolve();
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
         * 清理无作者日记
         */
        async cleanNoAuthorDiaries() {
            if (!confirm('确定要清理所有无作者日记吗？此操作不可恢复！')) {
                return;
            }

            try {
                await this.initDB();
                const transaction = this.db.transaction(['diaries'], 'readwrite');
                const store = transaction.objectStore('diaries');
                const request = store.getAll();

                request.onsuccess = async () => {
                    const diaries = request.result;
                    const noAuthorDiaries = diaries.filter(diary => !diary.author);
                    
                    if (noAuthorDiaries.length === 0) {
                        ElementPlus.ElMessage.info('没有发现无作者日记');
                        return;
                    }

                    // 删除所有无作者日记
                    const deletePromises = noAuthorDiaries.map(diary => {
                        return new Promise((resolve, reject) => {
                            const deleteRequest = store.delete(diary.id);
                            deleteRequest.onsuccess = resolve;
                            deleteRequest.onerror = reject;
                        });
                    });

                    await Promise.all(deletePromises);
                    ElementPlus.ElMessage.success(`成功清理 ${noAuthorDiaries.length} 条无作者日记`);
                };

                request.onerror = () => {
                    ElementPlus.ElMessage.error('清理失败');
                };
            } catch (error) {
                console.error('清理无作者日记时出错:', error);
                ElementPlus.ElMessage.error('清理失败');
            }
        },

        // 加载所有日记
        async loadAllDiaries() {
            await this.initDB();
            const transaction = this.db.transaction(['diaries'], 'readonly');
            const store = transaction.objectStore('diaries');
            const request = store.getAll();
            request.onsuccess = () => {
                this.diaries = request.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            };
        },

        // 删除指定日记
        async deleteDiary(id) {
            if (!confirm('确定要删除这篇日记吗？')) return;
            await this.initDB();
            const transaction = this.db.transaction(['diaries'], 'readwrite');
            const store = transaction.objectStore('diaries');
            const request = store.delete(id);
            request.onsuccess = () => {
                ElementPlus.ElMessage.success('日记删除成功');
                this.loadAllDiaries();
            };
            request.onerror = () => {
                ElementPlus.ElMessage.error('删除失败');
            };
        }
    },
    /**
     * Vue生命周期钩子：组件挂载完成时
     * 检查权限并获取用户列表
     */
    async mounted() {
        await this.checkAdminAuth(); // 检查管理员权限
        await this.fetchUsers();     // 获取用户列表
        await this.initDB();         // 初始化数据库
        await this.loadAllDiaries(); // 加载所有日记
    }
});

// 使用Element Plus
app.use(ElementPlus);

// 挂载Vue应用到DOM
app.mount('#app'); 