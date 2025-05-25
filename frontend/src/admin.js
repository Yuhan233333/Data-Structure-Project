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
            users: [] // 存储所有用户的数组
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
                    alert('获取用户列表失败');
                }
            } catch (error) {
                console.error('获取用户列表失败:', error);
                alert('获取用户列表失败，请检查网络连接');
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
                    alert('删除用户成功！');
                    // 刷新用户列表
                    await this.fetchUsers();
                } else {
                    alert(data.message || '删除用户失败');
                }
            } catch (error) {
                console.error('删除用户失败:', error);
                alert('删除用户失败，请检查网络连接');
            }
        },

        /**
         * 退出登录
         * 清除本地存储的认证信息并跳转到登录页面
         */
        logout() {
            // 清除认证信息
            localStorage.removeItem('token');
            localStorage.removeItem('role');
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
                alert('无权访问管理员页面');
                window.location.href = 'login.html';
            }
        }
    },
    /**
     * Vue生命周期钩子：组件挂载完成时
     * 检查权限并获取用户列表
     */
    mounted() {
        this.checkAdminAuth(); // 检查管理员权限
        this.fetchUsers();     // 获取用户列表
    }
});

// 挂载Vue应用到DOM
app.mount('#app'); 