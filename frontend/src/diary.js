// 日记助手页面脚本
const { createApp, ref, onMounted, nextTick } = Vue;

// 创建Vue应用
const app = createApp({
    setup() {
        // 状态变量
        const diaryTitle = ref('');
        const quill = ref(null);
        const uploadedImages = ref([]);
        const showImagePreview = ref(false);
        const currentDiaryId = ref(null);
        const diaryList = ref([]); // 添加日记列表
        const showDiaryList = ref(false); // 控制日记列表显示
        const currentUser = ref(sessionStorage.getItem('username')); // 获取当前登录用户
        const userRating = ref(0);        // 用户当前评分
        const hoverRating = ref(0);       // 鼠标悬停时的评分

        // 检查用户是否登录
        const checkLogin = () => {
            const token = sessionStorage.getItem('token');
            const username = sessionStorage.getItem('username');
            
            if (!token || !username) {
                ElementPlus.ElMessage.warning('请先登录');
                window.location.href = 'login.html';
                return false;
            }
            return true;
        };

        // 初始化Quill编辑器
        onMounted(() => {
            // 检查登录状态
            if (!checkLogin()) return;

            // 配置Quill编辑器
            const toolbarOptions = [
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'header': 1 }, { 'header': 2 }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'font': [] }],
                [{ 'align': [] }],
                ['clean'],
                ['link', 'image']
            ];

            // 初始化Quill编辑器
            quill.value = new Quill('#editor', {
                modules: {
                    toolbar: toolbarOptions
                },
                placeholder: '开始写下你的旅行故事...',
                theme: 'snow'
            });

            // 加载保存的日记
            loadSavedDiary();
            // 加载日记列表
            loadDiaryList();
        });

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

        // 加载日记列表
        const loadDiaryList = async () => {
            try {
                const db = await openDatabase();
                const transaction = db.transaction(['diaries'], 'readonly');
                const store = transaction.objectStore('diaries');
                const request = store.getAll();

                request.onsuccess = (event) => {
                    // 只显示当前用户的日记
                    diaryList.value = event.target.result
                        .filter(diary => diary.author === currentUser.value)
                        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                };
            } catch (error) {
                console.error('加载日记列表失败:', error);
                ElementPlus.ElMessage.error('加载日记列表失败');
            }
        };

        // 加载指定日记
        const loadDiary = async (id) => {
            try {
                const db = await openDatabase();
                const transaction = db.transaction(['diaries'], 'readonly');
                const store = transaction.objectStore('diaries');
                const request = store.get(id);

                request.onsuccess = (event) => {
                    const diary = event.target.result;
                    // 检查是否是当前用户的日记
                    if (diary && diary.author === currentUser.value) {
                        diaryTitle.value = diary.title;
                        quill.value.root.innerHTML = diary.content;
                        currentDiaryId.value = diary.id;
                        showDiaryList.value = false;
                    } else {
                        ElementPlus.ElMessage.error('无权访问此日记');
                    }
                };
            } catch (error) {
                console.error('加载日记失败:', error);
                ElementPlus.ElMessage.error('加载日记失败');
            }
        };

        // 加载保存的日记
        const loadSavedDiary = async () => {
            try {
                const db = await openDatabase();
                const transaction = db.transaction(['diaries'], 'readonly');
                const store = transaction.objectStore('diaries');
                const request = store.getAll();

                request.onsuccess = (event) => {
                    const diaries = event.target.result
                        .filter(diary => diary.author === currentUser.value);
                    if (diaries && diaries.length > 0) {
                        const latestDiary = diaries[diaries.length - 1];
                        diaryTitle.value = latestDiary.title;
                        quill.value.root.innerHTML = latestDiary.content;
                        currentDiaryId.value = latestDiary.id;
                    }
                };
            } catch (error) {
                console.error('加载日记失败:', error);
                ElementPlus.ElMessage.error('加载日记失败');
            }
        };

        // 保存日记
        const saveDiary = async () => {
            if (!checkLogin()) return;
            
            if (!diaryTitle.value.trim()) {
                ElementPlus.ElMessage.warning('请输入日记标题');
                return;
            }

            try {
                const diaryData = {
                    id: currentDiaryId.value || Date.now(),
                    title: diaryTitle.value,
                    content: quill.value.root.innerHTML,
                    author: currentUser.value, // 添加作者信息
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ratings: [] // 新增：初始化评分字段
                };

                const db = await openDatabase();
                const transaction = db.transaction(['diaries'], 'readwrite');
                const store = transaction.objectStore('diaries');
                const request = store.put(diaryData);
                
                request.onsuccess = () => {
                    ElementPlus.ElMessage.success('日记保存成功');
                    currentDiaryId.value = request.result;
                    loadDiaryList(); // 更新日记列表
                };
            } catch (error) {
                console.error('保存日记失败:', error);
                ElementPlus.ElMessage.error('保存日记失败');
            }
        };

        // 删除日记
        const deleteDiary = async (id) => {
            if (!checkLogin()) return;

            try {
                const db = await openDatabase();
                const transaction = db.transaction(['diaries'], 'readonly');
                const store = transaction.objectStore('diaries');
                const request = store.get(id);

                request.onsuccess = async (event) => {
                    const diary = event.target.result;
                    // 检查是否是当前用户的日记
                    if (diary && diary.author === currentUser.value) {
                        const deleteTransaction = db.transaction(['diaries'], 'readwrite');
                        const deleteStore = deleteTransaction.objectStore('diaries');
                        const deleteRequest = deleteStore.delete(id);
                        
                        deleteRequest.onsuccess = () => {
                            ElementPlus.ElMessage.success('日记删除成功');
                            loadDiaryList(); // 更新日记列表
                            if (currentDiaryId.value === id) {
                                // 如果删除的是当前日记，加载最新的一篇
                                loadSavedDiary();
                            }
                        };
                    } else {
                        ElementPlus.ElMessage.error('无权删除此日记');
                    }
                };
            } catch (error) {
                console.error('删除日记失败:', error);
                ElementPlus.ElMessage.error('删除日记失败');
            }
        };

        // 新建日记
        const newDiary = () => {
            diaryTitle.value = '';
            quill.value.root.innerHTML = '';
            currentDiaryId.value = null;
            showDiaryList.value = false;
        };

        // 上传图片
        const uploadImages = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (event) => {
                const files = event.target.files;
                for (let file of files) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        uploadedImages.value.push({
                            name: file.name,
                            url: e.target.result,
                            file: file
                        });
                    };
                    reader.readAsDataURL(file);
                }
                showImagePreview.value = true;
            };
            input.click();
        };

        // 插入图片到编辑器
        const insertImage = (image) => {
            const range = quill.value.getSelection();
            quill.value.insertEmbed(range.index, 'image', image.url);
            showImagePreview.value = false;
        };

        // 移除已上传的图片
        const removeImage = (index) => {
            uploadedImages.value.splice(index, 1);
            if (uploadedImages.value.length === 0) {
                showImagePreview.value = false;
            }
        };

        // 关闭图片预览
        const closeImagePreview = () => {
            showImagePreview.value = false;
            uploadedImages.value = [];
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
                        'Authorization': sessionStorage.getItem('token'),
                        'X-Username': sessionStorage.getItem('username')
                    },
                    body: JSON.stringify({ diaries })
                });

                const result = await response.json();
                if (result.success) {
                    ElementPlus.ElMessage.success('日记已导出到程序文件夹');
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
                // 调用后端导入接口
                const response = await fetch('/api/import/diaries', {
                    headers: {
                        'Authorization': sessionStorage.getItem('token'),
                        'X-Username': sessionStorage.getItem('username')
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
                loadDiaryList(); // 更新日记列表
                loadSavedDiary();
            } catch (error) {
                console.error('导入日记失败:', error);
                ElementPlus.ElMessage.error('导入失败，请稍后重试');
            }
        };

        // 评分方法
        const rateDiary = async (rating) => {
            if (!currentUser.value) {
                ElementPlus.ElMessage.warning('请先登录后再评分');
                return;
            }

            try {
                const response = await fetch('/api/diary/rate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        diaryId: currentDiaryId.value,
                        rating: rating,
                        username: currentUser.value
                    })
                });

                if (!response.ok) {
                    throw new Error('评分失败');
                }

                const result = await response.json();
                userRating.value = rating;
                ElementPlus.ElMessage.success('评分成功');
                
                // 更新日记列表中的平均分
                const diary = diaryList.value.find(d => d.id === currentDiaryId.value);
                if (diary) {
                    diary.averageRating = result.averageRating;
        }
            } catch (error) {
                console.error('评分失败:', error);
                ElementPlus.ElMessage.error('评分失败，请稍后重试');
            }
        };

        // 加载用户评分
        const loadUserRating = async () => {
            if (!currentUser.value || !currentDiaryId.value) return;

            try {
                const response = await fetch(`/api/diary/rating/${currentDiaryId.value}/${currentUser.value}`);
                if (response.ok) {
                    const data = await response.json();
                    userRating.value = data.rating;
                }
            } catch (error) {
                console.error('加载用户评分失败:', error);
    }
        };

        // 检查用户登录状态
        const checkLoginStatus = async () => {
            try {
                const response = await fetch('/api/user/current');
                if (response.ok) {
                    const user = await response.json();
                    currentUser.value = user.username;
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
            }
        };

        return {
            diaryTitle,
            uploadedImages,
            showImagePreview,
            diaryList,
            showDiaryList,
            saveDiary,
            uploadImages,
            insertImage,
            removeImage,
            closeImagePreview,
            exportDiaries,
            importDiaries,
            loadDiary,
            deleteDiary,
            newDiary,
            userRating,
            hoverRating,
            currentUser,
            rateDiary,
            loadUserRating,
            checkLoginStatus
        };
    }
});

// 使用Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 