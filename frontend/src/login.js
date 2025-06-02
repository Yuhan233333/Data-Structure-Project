// 后端API的基础URL
const API_BASE_URL = 'http://localhost:5000';

/**
 * 创建Vue应用实例
 */
const app = Vue.createApp({
    /**
     * 定义响应式数据
     * @returns {Object} 包含表单数据和UI状态的对象
     */
    data() {
        return {
            activeForm: 'login', // 当前激活的表单（登录/注册）
            showPassword: false, // 是否显示密码
            loginForm: {
                username: '', // 登录用户名
                password: ''  // 登录密码
            },
            registerForm: {
                username: '', // 注册用户名
                password: '', // 注册密码
                confirmPassword: '' // 确认密码
            }
        }
    },
    methods: {
        /**
         * 处理用户登录
         * @param {Event} event - 表单提交事件
         */
        async handleLogin(event) {
            event.preventDefault();
            try {
                // 发送登录请求到后端
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
                    // 生成一个简单的token（实际应用中应该使用JWT等更安全的方式）
                    const token = btoa(`${data.user.username}:${Date.now()}`);
                    
                    // 保存认证信息到会话存储
                    sessionStorage.setItem('token', token);
                    sessionStorage.setItem('role', data.user.role);
                    sessionStorage.setItem('username', data.user.username);

                    // 根据用户角色跳转到不同页面
                    if (data.user.role === 'admin') {
                        window.location.href = 'admin.html'; // 管理员跳转到管理页面
                    } else {
                        window.location.href = '../index.html'; // 普通用户跳转到首页
                    }
                } else {
                    ElementPlus.ElMessage.error(data.message || '用户名或密码错误');
                }
            } catch (error) {
                console.error('登录失败:', error);
                ElementPlus.ElMessage.error('登录失败，请检查网络连接');
            }
        },

        /**
         * 处理用户注册
         * @param {Event} event - 表单提交事件
         */
        async handleRegister(event) {
            event.preventDefault();
            try {
                // 验证两次输入的密码是否一致
                if (this.registerForm.password !== this.registerForm.confirmPassword) {
                    alert('两次输入的密码不一致');
                    return;
                }

                // 发送注册请求到后端
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
                    // 重置注册表单并切换到登录界面
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

        /**
         * 检查用户登录状态
         * 如果用户已登录，根据角色跳转到对应页面
         */
        async checkAuth() {
            const token = localStorage.getItem('token');
            const role = localStorage.getItem('role');

            if (token) {
                try {
                    // 验证token有效性
                    const response = await fetch(`${API_BASE_URL}/api/check_auth`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    const data = await response.json();
                    
                    if (data.isAuthenticated) {
                        // 根据用户角色跳转到对应页面
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
    /**
     * Vue生命周期钩子：组件挂载完成时
     * 检查用户登录状态
     */
    mounted() {
        this.checkAuth();
    }
});

// 挂载Vue应用到DOM
app.mount('#app'); 