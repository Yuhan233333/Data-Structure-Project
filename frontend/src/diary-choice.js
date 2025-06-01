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

        // 打开IndexedDB数据库
        const openDatabase = () => {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('TravelDiaryDB', 1);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('diaries')) {
                        db.createObjectStore('diaries', { keyPath: 'id', autoIncrement: true });
                    }
                };
            });
        };

        // 导出日记到程序文件夹
        const exportDiaries = async () => {
            try {
                const db = await openDatabase();
                const transaction = db.transaction(['diaries'], 'readonly');
                const store = transaction.objectStore('diaries');
                const request = store.getAll();
                const diaries = await new Promise((resolve) => {
                    request.onsuccess = () => resolve(request.result);
                });
                // 调用后端导出接口
                const response = await fetch('/api/export/diaries', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': localStorage.getItem('token'),
                        'X-Username': localStorage.getItem('username')
                    },
                    body: JSON.stringify({ diaries })
                });
                const result = await response.json();
                if (result.success) {
                    ElementPlus.ElMessage.success('日记导出成功');
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                console.error('导出日记失败:', error);
                ElementPlus.ElMessage.error('导出失败，请稍后重试');
            }
        };

        // 从程序文件夹导入日记
        const importDiaries = async () => {
            try {
                const response = await fetch('/api/import/diaries', {
                    headers: {
                        'Authorization': localStorage.getItem('token'),
                        'X-Username': localStorage.getItem('username')
                    }
                });
                const result = await response.json();
                if (!result.success) {
                    throw new Error(result.message);
                }
                const db = await openDatabase();
                const transaction = db.transaction(['diaries'], 'readwrite');
                const store = transaction.objectStore('diaries');
                // 清空现有数据
                await new Promise((resolve, reject) => {
                    const clearRequest = store.clear();
                    clearRequest.onsuccess = resolve;
                    clearRequest.onerror = reject;
                });
                // 导入新数据
                for (const diary of result.diaries) {
                    await new Promise((resolve, reject) => {
                        const request = store.add(diary);
                        request.onsuccess = resolve;
                        request.onerror = reject;
                    });
                }
                ElementPlus.ElMessage.success('日记导入成功');
            } catch (error) {
                console.error('导入日记失败:', error);
                ElementPlus.ElMessage.error('导入失败，请稍后重试');
            }
        };

        return {
            goToView,
            goToEdit,
            exportDiaries,
            importDiaries
        };
    }
});

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 