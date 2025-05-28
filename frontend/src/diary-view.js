// 创建 Vue 应用
const app = Vue.createApp({
    data() {
        return {
            // 日记列表
            diaries: [],
            // 当前选中的日记ID
            currentDiaryId: null,
            // 当前显示的日记内容
            currentDiary: null,
            // 搜索关键词
            searchQuery: '',
            // IndexedDB 数据库对象
            db: null,
            // 当前登录用户
            currentUser: localStorage.getItem('username'),
            hoverRating: 0, // 鼠标悬停评分
            myRating: 0,    // 当前用户对当前日记的评分
        }
    },

    computed: {
        // 根据搜索关键词过滤日记列表，并按评分高低排序
        filteredDiaries() {
            if (!this.searchQuery) {
                // 没有搜索时，按评分高低排序
                return this.diaries.slice().sort((a, b) => {
                    const avgA = this.averageRating(a);
                    const avgB = this.averageRating(b);
                    return avgB - avgA;
                });
            }
            const query = this.searchQuery.toLowerCase();
            // 支持全文搜索：标题、作者、内容
            return this.diaries.filter(diary => {
                // 标题、作者、内容都转为小写后进行匹配
                const title = diary.title ? diary.title.toLowerCase() : '';
                const author = diary.author ? diary.author.toLowerCase() : '';
                // diary.content 可能包含HTML标签，先去除标签再搜索
                let content = diary.content ? diary.content : '';
                // 用正则去除HTML标签
                content = content.replace(/<[^>]+>/g, '').toLowerCase();
                return title.includes(query) || author.includes(query) || content.includes(query);
            }).sort((a, b) => {
                const avgA = this.averageRating(a);
                const avgB = this.averageRating(b);
                return avgB - avgA;
            });
        }
    },

    methods: {
        // 初始化 IndexedDB
        async initDB() {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open('TravelDiaryDB', 1);

                request.onerror = () => {
                    reject('数据库打开失败');
                };

                request.onsuccess = (event) => {
                    this.db = event.target.result;
                    resolve();
                };

                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains('diaries')) {
                        db.createObjectStore('diaries', { keyPath: 'id' });
                    }
                };
            });
        },

        // 加载所有日记
        async loadDiaries() {
            try {
                const transaction = this.db.transaction(['diaries'], 'readonly');
                const store = transaction.objectStore('diaries');
                const request = store.getAll();

                request.onsuccess = () => {
                    // 显示所有日记，按时间倒序排序，并补全ratings字段和views字段
                    this.diaries = request.result.map(diary => {
                        if (!Array.isArray(diary.ratings)) {
                            diary.ratings = [];
                        }
                        // 初始化浏览量字段
                        diary.views = diary.views || 0;
                        return diary;
                    }).sort((a, b) => 
                        new Date(b.createdAt) - new Date(a.createdAt)
                    );
                };

                request.onerror = () => {
                    console.error('加载日记失败');
                    ElementPlus.ElMessage.error('加载日记失败');
                };
            } catch (error) {
                console.error('加载日记时出错:', error);
                ElementPlus.ElMessage.error('加载日记失败');
            }
        },

        // 加载指定日记
        async loadDiary(diary, incrementViews = true) {
            // diary 可能是旧对象，需用最新的
            const latest = this.diaries.find(d => String(d.id) === String(diary.id));
            this.currentDiaryId = diary.id;
            this.currentDiary = latest || diary;
            this.myRating = this.getMyRating(this.currentDiary);

            // 增加浏览量（仅在直接点击查看时增加）
            if (incrementViews && this.currentDiary) {
                // 确保 views 字段存在
                this.currentDiary.views = (this.currentDiary.views || 0) + 1;
                // 保存更新后的日记，但不重新加载
                await this.saveDiaryViews(this.currentDiary);
            }
        },

        // 新增：专门用于保存浏览量的方法
        async saveDiaryViews(diary) {
            // 先深拷贝，去掉 Proxy
            const plainDiary = JSON.parse(JSON.stringify(diary));
            const transaction = this.db.transaction(['diaries'], 'readwrite');
            const store = transaction.objectStore('diaries');
            await new Promise((resolve, reject) => {
                const req = store.put(plainDiary);
                req.onsuccess = resolve;
                req.onerror = (e) => {
                    console.error('保存浏览量失败:', e.target.error);
                    reject(e);
                };
            });
            // 更新本地数据，但不重新加载
            const index = this.diaries.findIndex(d => String(d.id) === String(plainDiary.id));
            if (index !== -1) {
                this.diaries[index] = plainDiary;
            }
        },

        // 保存评分到IndexedDB
        async saveDiaryRating(diary) {
            // 先深拷贝，去掉 Proxy
            const plainDiary = JSON.parse(JSON.stringify(diary));
            const transaction = this.db.transaction(['diaries'], 'readwrite');
            const store = transaction.objectStore('diaries');
            await new Promise((resolve, reject) => {
                const req = store.put(plainDiary);
                req.onsuccess = resolve;
                req.onerror = (e) => {
                    console.error('保存评分失败:', e.target.error);
                    reject(e);
                };
            });
            // 更新本地数据，但不重新加载
            const index = this.diaries.findIndex(d => String(d.id) === String(plainDiary.id));
            if (index !== -1) {
                this.diaries[index] = plainDiary;
            }
            // 更新当前显示的日记
            if (this.currentDiaryId === plainDiary.id) {
                this.currentDiary = plainDiary;
            }
        },

        // 格式化日期
        formatDate(dateString) {
            const date = new Date(dateString);
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        // 检查登录状态
        checkLogin() {
            const token = localStorage.getItem('token');
            const username = localStorage.getItem('username');
            
            if (!token || !username) {
                ElementPlus.ElMessage.warning('请先登录');
                window.location.href = 'login.html';
                return false;
            }
            return true;
        },

        // 计算平均分
        averageRating(diary) {
            if (!diary.ratings || diary.ratings.length === 0) return 0;
            const sum = diary.ratings.reduce((acc, r) => acc + r.score, 0);
            return (sum / diary.ratings.length).toFixed(1);
        },

        // 评分
        async rateDiary(score) {
            if (!this.currentUser) {
                ElementPlus.ElMessage.warning('请先登录');
                return;
            }
            // 一定要用 this.diaries 里的最新对象
            const diary = this.diaries.find(d => String(d.id) === String(this.currentDiaryId));
            if (!diary) return;
            if (!Array.isArray(diary.ratings)) diary.ratings = [];
            const idx = diary.ratings.findIndex(r => r.username === this.currentUser);
            if (idx !== -1) {
                diary.ratings[idx].score = score;
            } else {
                diary.ratings.push({ username: this.currentUser, score });
            }
            this.myRating = score;
            await this.saveDiaryRating(diary);
            ElementPlus.ElMessage.success('评分成功');
        },

        // 获取我的评分
        getMyRating(diary) {
            if (!diary.ratings) return 0;
            const r = diary.ratings.find(r => r.username === this.currentUser);
            return r ? r.score : 0;
        },
    },

    // 组件挂载时初始化
    async mounted() {
        if (!this.checkLogin()) return;
        try {
            await this.initDB();
            await this.loadDiaries();
            // 如果没有选中日记，才默认选中第一篇，但不增加浏览量
            if (!this.currentDiary && this.diaries.length > 0) {
                this.loadDiary(this.diaries[0], false);
            }
        } catch (error) {
            console.error('初始化失败:', error);
            ElementPlus.ElMessage.error('初始化失败');
        }
    }
});

// 使用 Element Plus
app.use(ElementPlus);

// 挂载应用
app.mount('#app'); 