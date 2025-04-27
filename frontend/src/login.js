const API_BASE_URL = 'http://localhost:5000';

const app = Vue.createApp({
    data() {
        return {
            activeForm: 'login',
            showPassword: false,
            countdown: 0,
            loginForm: {
                username: '',
                password: '',
                remember: false
            },
            registerForm: {
                username: '',
                password: '',
                confirmPassword: '',
                agreement: false
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
                    // 如果选择了"记住我"，保存登录状态
                    if (this.loginForm.remember) {
                        localStorage.setItem('username', this.loginForm.username);
                        localStorage.setItem('isLoggedIn', 'true');
                        localStorage.setItem('userRole', data.user.role);
                    }
                    // 登录成功后跳转到首页
                    window.location.href = '../index.html';
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
                        confirmPassword: '',
                        agreement: false
                    };
                } else {
                    alert(data.message || '注册失败');
                }
            } catch (error) {
                console.error('注册失败:', error);
                alert('注册失败，请检查网络连接');
            }
        },

        // 发送验证码
        async sendVerifyCode() {
            if (this.countdown > 0) return;
            
            try {
                // 验证手机号
                if (!/^1[3-9]\d{9}$/.test(this.registerForm.phone)) {
                    alert('请输入正确的手机号');
                    return;
                }

                // 这里添加发送验证码的实际逻辑
                console.log('发送验证码到:', this.registerForm.phone);
                
                // 开始倒计时
                this.countdown = 60;
                const timer = setInterval(() => {
                    this.countdown--;
                    if (this.countdown <= 0) {
                        clearInterval(timer);
                    }
                }, 1000);
            } catch (error) {
                console.error('发送验证码失败:', error);
                this.countdown = 0;
                // 这里可以添加错误提示
            }
        },

        // 第三方登录
        async thirdPartyLogin(platform) {
            try {
                console.log('第三方登录:', platform);
                // 这里添加第三方登录的实际逻辑
            } catch (error) {
                console.error('第三方登录失败:', error);
                // 这里可以添加错误提示
            }
        },

        // 忘记密码
        forgotPassword() {
            // 这里添加忘记密码的逻辑
            console.log('忘记密码');
        },

        // 显示用户协议
        showAgreement() {
            alert('用户协议内容');
        },

        // 显示隐私政策
        showPrivacy() {
            alert('隐私政策内容');
        },

        // 检查登录状态
        async checkAuth() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/check_auth`);
                const data = await response.json();
                
                if (!data.isAuthenticated) {
                    // 如果未登录且不在登录页面，则重定向到登录页
                    if (!window.location.pathname.includes('login.html')) {
                        window.location.href = 'login.html';
                    }
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
            }
        }
    },
    mounted() {
        // 检查是否有保存的登录状态
        const savedUsername = localStorage.getItem('username');
        const isLoggedIn = localStorage.getItem('isLoggedIn');
        
        if (isLoggedIn === 'true' && savedUsername) {
            this.loginForm.username = savedUsername;
            this.loginForm.remember = true;
        }

        // 检查当前登录状态
        this.checkAuth();
    }
});

// 挂载 Vue 应用
app.mount('#app'); 