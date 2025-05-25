// API基础URL
const API_BASE_URL = window.location.protocol === 'file:' ? 
    'http://localhost:5000' : '';

// 确保所有依赖都已加载
function initializeApp() {
    if (!window.Vue || !window.ElementPlus || !window.ElementPlusIconsVue) {
        console.error('依赖未完全加载');
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        return;
    }

    try {
        // 创建Vue应用
        const app = Vue.createApp({
            /**
             * 定义响应式数据
             * @returns {Object} 包含表单数据和UI状态的对象
             */
            data() {
                // 确认密码的验证规则
                const validatePass2 = (rule, value, callback) => {
                    if (value === '') {
                        callback(new Error('请再次输入密码'));
                    } else if (value !== this.registerForm.password) {
                        callback(new Error('两次输入密码不一致!'));
                    } else {
                        callback();
                    }
                };

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
                    },
                    loading: false,
                    loginRules: {
                        username: [
                            { required: true, message: '请输入用户名', trigger: 'blur' },
                            { min: 3, max: 20, message: '用户名长度应在3-20个字符之间', trigger: 'blur' }
                        ],
                        password: [
                            { required: true, message: '请输入密码', trigger: 'blur' },
                            { min: 6, max: 20, message: '密码长度应在6-20个字符之间', trigger: 'blur' }
                        ]
                    },
                    registerRules: {
                        username: [
                            { required: true, message: '请输入用户名', trigger: 'blur' },
                            { min: 3, max: 20, message: '用户名长度应在3-20个字符之间', trigger: 'blur' }
                        ],
                        password: [
                            { required: true, message: '请输入密码', trigger: 'blur' },
                            { min: 6, max: 20, message: '密码长度应在6-20个字符之间', trigger: 'blur' }
                        ],
                        confirmPassword: [
                            { required: true, message: '请再次输入密码', trigger: 'blur' },
                            { validator: validatePass2, trigger: 'blur' }
                        ]
                    }
                }
            },
            methods: {
                /**
                 * 处理用户登录
                 * @param {Event} event - 表单提交事件
                 */
                async handleLogin() {
                    try {
                        // 表单验证
                        await this.$refs.loginForm.validate();
                        
                        this.loading = true;
                        
                        // 发送登录请求
                        const response = await fetch(`${API_BASE_URL}/api/login`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(this.loginForm)
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            // 存储登录状态和用户信息
                            localStorage.setItem('isLoggedIn', 'true');
                            localStorage.setItem('username', data.data.username);
                            localStorage.setItem('userRole', data.data.role);
                            
                            // 显示成功消息
                            ElementPlus.ElMessage.success('登录成功');
                            
                            // 延迟跳转到推荐页面
                            setTimeout(() => {
                                window.location.href = '../index.html';
                            }, 1000);
                        } else {
                            throw new Error(data.message);
                        }
                    } catch (error) {
                        // 显示错误消息
                        ElementPlus.ElMessage.error(error.message || '登录失败，请重试');
                    } finally {
                        this.loading = false;
                    }
                },

                /**
                 * 处理用户注册
                 * @param {Event} event - 表单提交事件
                 */
                async handleRegister() {
                    try {
                        // 表单验证
                        await this.$refs.registerForm.validate();
                        
                        this.loading = true;
                        
                        // 发送注册请求
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
                            // 显示成功消息
                            ElementPlus.ElMessage.success('注册成功，请登录');
                            
                            // 清空注册表单
                            this.$refs.registerForm.resetFields();
                            
                            // 切换到登录表单
                            this.activeForm = 'login';
                        } else {
                            throw new Error(data.message);
                        }
                    } catch (error) {
                        // 显示错误消息
                        ElementPlus.ElMessage.error(error.message || '注册失败，请重试');
                    } finally {
                        this.loading = false;
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

        // 注册Element Plus
        app.use(ElementPlus);

        // 注册Element Plus图标
        for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
            app.component(key, component);
        }

        // 挂载应用
        app.mount('#app');

        // 显示应用
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';

    } catch (error) {
        console.error('初始化失败:', error);
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
}

// 等待DOM和资源加载完成
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
} 