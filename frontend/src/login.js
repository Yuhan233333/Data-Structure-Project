const API_BASE_URL = 'http://localhost:5000';

const app = Vue.createApp({
    data() {
        return {
            activeForm: 'login',
            showPassword: false,
            loginForm: {
                username: '',
                password: ''
            },
            registerForm: {
                username: '',
                password: '',
                confirmPassword: ''
            }
        }
    },
    methods: {
        // 处理登录
        async handleLogin(event) {
            event.preventDefault();
            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: this.loginForm.username,
                        password: this.loginForm.password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // 保存token和用户角色
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('role', data.user.role);

                    // 根据角色跳转到不同页面
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin.html';
                    } else {
                        window.location.href = '../index.html';
                    }
                } else {
                    alert(data.message || '用户名或密码错误');
                }
            } catch (error) {
                console.error('登录失败:', error);
                alert('登录失败，请检查网络连接');
            }
        },

        // 处理注册
        async handleRegister(event) {
            event.preventDefault();
            try {
                // 验证密码是否一致
                if (this.registerForm.password !== this.registerForm.confirmPassword) {
                    alert('两次输入的密码不一致');
                    return;
                }

                const response = await fetch(`${API_BASE_URL}/api/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: this.registerForm.username,
                        password: this.registerForm.password
                    })
                });

                const data = await response.json();

                if (data.success) {
                    alert('注册成功！');
                    this.activeForm = 'login';
                    this.registerForm = {
                        username: '',
                        password: '',
                        confirmPassword: ''
                    };
                } else {
                    alert(data.message || '注册失败');
                }
            } catch (error) {
                console.error('注册失败:', error);
                alert('注册失败，请检查网络连接');
            }
        },

        // 检查登录状态
        async checkAuth() {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');

            if (token) {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/check_auth`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await response.json();
                    
                    if (data.isAuthenticated) {
                        // 如果已登录，根据角色跳转
                        if (role === 'admin') {
                            window.location.href = 'admin.html';
                        } else {
                            window.location.href = '../index.html';
                        }
                    }
                } catch (error) {
                    console.error('检查登录状态失败:', error);
                }
            }
        }
    },
    mounted() {
        // 检查当前登录状态
        this.checkAuth();
    }
});

// 挂载 Vue 应用
app.mount('#app'); 