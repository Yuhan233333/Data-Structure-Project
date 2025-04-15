// 创建 Quill 编辑器实例
let quill;

// 创建 Vue 应用
const app = Vue.createApp({
    data() {
        return {
            diaryTitle: '',
            showAIAssistant: false,
            showImagePreview: false,
            uploadedImages: [],
            writingSuggestions: [
                {
                    id: 1,
                    text: '建议添加更多感受描写，让游记更有代入感。'
                },
                {
                    id: 2,
                    text: '可以描述一下当地的特色美食。'
                },
                {
                    id: 3,
                    text: '建议加入一些历史文化背景介绍。'
                }
            ],
            promptTemplates: [
                {
                    id: 1,
                    title: '景点描写',
                    content: '这里的自然风光让人印象深刻，...'
                },
                {
                    id: 2,
                    title: '美食体验',
                    content: '品尝了当地特色美食，...'
                },
                {
                    id: 3,
                    title: '人文体验',
                    content: '在与当地人的交流中，...'
                },
                {
                    id: 4,
                    title: '旅行感悟',
                    content: '这次旅行让我深深体会到，...'
                }
            ]
        }
    },
    methods: {
        // 初始化编辑器
        initEditor() {
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
                ['image', 'video']
            ];

            quill = new Quill('#editor', {
                modules: {
                    toolbar: toolbarOptions
                },
                theme: 'snow'
            });
        },

        // 切换AI助手面板
        toggleAIAssistant() {
            this.showAIAssistant = !this.showAIAssistant;
        },

        // 应用AI建议
        applySuggestion(suggestion) {
            const range = quill.getSelection(true);
            quill.insertText(range.index, '\n' + suggestion.text + '\n');
        },

        // 使用提示模板
        usePrompt(prompt) {
            const range = quill.getSelection(true);
            quill.insertText(range.index, '\n' + prompt.content + '\n');
        },

        // 上传图片
        uploadImages() {
            // 模拟图片上传
            const mockImages = [
                {
                    id: 1,
                    name: '西湖风景1.jpg',
                    url: '../assets/place1.jpg'
                },
                {
                    id: 2,
                    name: '西湖风景2.jpg',
                    url: '../assets/place2.jpg'
                }
            ];
            this.uploadedImages = [...this.uploadedImages, ...mockImages];
            this.showImagePreview = true;
        },

        // 插入图片到编辑器
        insertImage(image) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', image.url);
            quill.setSelection(range.index + 1);
        },

        // 移除上传的图片
        removeImage(index) {
            this.uploadedImages.splice(index, 1);
        },

        // 关闭图片预览
        closeImagePreview() {
            this.showImagePreview = false;
        },

        // 保存日记
        saveDiary() {
            const content = quill.root.innerHTML;
            console.log('保存日记:', {
                title: this.diaryTitle,
                content: content
            });
            // 这里可以添加保存到服务器的逻辑
        }
    },
    mounted() {
        this.initEditor();
    }
});

// 挂载应用
app.mount('#app'); 