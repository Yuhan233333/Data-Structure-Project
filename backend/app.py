from flask import Flask, render_template, send_from_directory, request, jsonify
from flask_cors import CORS
from auth import auth
import webbrowser
import os
import pandas as pd
from place_api import place_bp
import json
from datetime import datetime

app = Flask(__name__, template_folder='../frontend/views')
# 启用CORS，允许前端访问
CORS(app)

app.register_blueprint(auth)
app.register_blueprint(place_bp)

# 添加导出目录配置
EXPORT_DIR = os.path.join(os.path.dirname(__file__), 'data', 'diaries')
os.makedirs(EXPORT_DIR, exist_ok=True)

@app.route('/place-search')
def place_search():
    csv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'place_data.csv')
    df = pd.read_csv(csv_path, encoding='utf-8')
    places = df.to_dict(orient='records')
    return render_template('place-search-ssr.html', places=places)

@app.route('/frontend/<path:filename>')
def frontend_static(filename):
    return send_from_directory('../frontend', filename)

@app.route('/backend/<path:filename>')
def backend_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/export/diaries', methods=['POST'])
def export_diaries():
    """导出所有日记到程序文件夹"""
    try:
        data = request.get_json()
        if not data or 'diaries' not in data:
            return jsonify({
                'success': False,
                'message': '无效的请求数据'
            }), 400

        # 清空现有日记文件
        for file in os.listdir(EXPORT_DIR):
            if file.endswith('.json'):
                os.remove(os.path.join(EXPORT_DIR, file))

        # 保存每篇日记
        for diary in data['diaries']:
            # 使用日记ID作为文件名
            filename = f"diary_{diary['id']}.json"
            file_path = os.path.join(EXPORT_DIR, filename)
            
            # 保存日记内容
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(diary, f, ensure_ascii=False, indent=2)

        return jsonify({
            'success': True,
            'message': '日记导出成功',
            'export_path': EXPORT_DIR
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'导出失败: {str(e)}'
        }), 500

@app.route('/api/import/diaries', methods=['GET'])
def import_diaries():
    """从程序文件夹导入所有日记"""
    try:
        diaries = []
        for file in os.listdir(EXPORT_DIR):
            if file.endswith('.json'):
                with open(os.path.join(EXPORT_DIR, file), 'r', encoding='utf-8') as f:
                    diary = json.load(f)
                    diaries.append(diary)
        
        return jsonify({
            'success': True,
            'diaries': diaries
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'导入失败: {str(e)}'
        }), 500

def open_browser():
    """打开浏览器访问登录页面"""
    # 获取前端登录页面的绝对路径
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    login_path = os.path.join(frontend_dir, 'views', 'login.html')
    webbrowser.open('http://localhost:5000/frontend/views/login.html')

if __name__ == '__main__':
    # 仅在主进程中打开浏览器
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        import threading
        threading.Timer(1.5, open_browser).start()
    # 启动Flask应用
    app.run(debug=True, port=5000) 