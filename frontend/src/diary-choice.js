// 创建Vue应用
const app = Vue.createApp({
    setup() {
        // 检查登录状态
        const checkLogin = () => {
            const token = localStorage.getItem('token');
            const username = localStorage.getItem('username');
            
            if (!token || !username) {
                ElementPlus.ElMessage.warning('请先登录');
                window.location.href = 'login.html';
                return false;
            }
            return true;
        };

        // 跳转到查看日记页面
        const goToView = () => {
            if (checkLogin()) {
                window.location.href = 'diary-view.html';
            }
        };

        // 跳转到编辑日记页面
        const goToEdit = () => {
            if (checkLogin()) {
                window.location.href = 'diary.html';
            }
        };

        return {
            goToView,
            goToEdit
        };
    }
});

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 