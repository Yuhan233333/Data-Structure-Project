const API_BASE_URL = 'http://localhost:5000';

const app = Vue.createApp({
    data() {
        return {
            users: [], // 用户列表
            newUser: {
                username: '',
                password: ''
            }
        }
    },
    methods: {
        // 获取所有用户
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

        // 添加新用户
        async handleAddUser() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(this.newUser)
                });

                const data = await response.json();
                if (data.success) {
                    alert('添加用户成功！');
                    this.newUser = { username: '', password: '' };
                    await this.fetchUsers(); // 刷新用户列表
                } else {
                    alert(data.message || '添加用户失败');
                }
            } catch (error) {
                console.error('添加用户失败:', error);
                alert('添加用户失败，请检查网络连接');
            }
        },

        // 删除用户
        async deleteUser(userId) {
            if (!confirm('确定要删除这个用户吗？')) {
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = await response.json();
                if (data.success) {
                    alert('删除用户成功！');
                    await this.fetchUsers(); // 刷新用户列表
                } else {
                    alert(data.message || '删除用户失败');
                }
            } catch (error) {
                console.error('删除用户失败:', error);
                alert('删除用户失败，请检查网络连接');
            }
        },

        // 退出登录
        logout() {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = 'login.html';
        },

        // 检查管理员权限
        async checkAdminAuth() {
            const role = localStorage.getItem('role');
            if (role !== 'admin') {
                alert('无权访问管理员页面');
                window.location.href = 'login.html';
            }
        }
    },
    mounted() {
        this.checkAdminAuth();
        this.fetchUsers();
    }
});

// 挂载 Vue 应用
app.mount('#app'); 