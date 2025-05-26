// 日记选择页面脚本
const { createApp } = Vue;

// 创建Vue应用
const app = createApp({
    methods: {
        /**
         * 导航到指定页面
         * @param {string} type - 页面类型：'edit' 或 'view'
         */
        navigateTo(type) {
            if (type === 'edit') {
                window.location.href = 'diary.html';
            } else if (type === 'view') {
                window.location.href = 'diary-view.html';
            }
        }
    }
});

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 