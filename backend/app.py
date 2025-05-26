r'''
Author: Yuhan_233 1536943817@qq.com
Date: 2025-04-17 19:37:27
LastEditTime: 2025-04-27 15:52:35
LastEditors: Yuhan_233 1536943817@qq.com
FilePath: \Data-Structure-Project\backend\app.py
Description: 头部注释配置模板
'''
from flask import Flask,request, jsonify
from flask_cors import CORS
from auth import auth
import webbrowser
from route_generator import generate_route_map  # 你实际定义 generate_route_map
import threading
import os
from flask import send_from_directory

# 前端根目录
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
app = Flask(__name__)
# 启用CORS，允许前端访问
CORS(app)
@app.route('/')
def serve_index():
    return send_from_directory(os.path.join(frontend_dir, 'views'), 'login.html')
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(frontend_dir, path)
# 注册认证蓝图
app.register_blueprint(auth)
@app.route('/api/generate-map', methods=['POST'])
@app.route('/api/generate-map', methods=['POST'])
def generate_map():
    data = request.json
    start = data.get('start')
    end = data.get('end')
    try:
        print("⏳ 开始生成地图")
        generate_route_map(start, end)
        print("✅ 地图生成完成")
        return jsonify({"status": "success"})
    except Exception as e:
        print("❌ 地图生成失败：", e)
        return jsonify({"status": "error", "message": str(e)}), 500
def open_browser():
    """打开浏览器访问登录页面"""
    # 获取前端登录页面的绝对路径
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    login_path = os.path.join(frontend_dir, 'views', 'login.html')
    webbrowser.open('http://localhost:5000')
if __name__ == '__main__':
    # 仅在主进程中打开浏览器
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        import threading
        threading.Timer(1.5, open_browser).start()
    # 启动Flask应用
    app.run(debug=True, port=5000) 