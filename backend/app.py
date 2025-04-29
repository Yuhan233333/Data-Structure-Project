'''
Author: Yuhan_233 1536943817@qq.com
Date: 2025-04-17 19:37:27
LastEditTime: 2025-04-27 15:38:47
LastEditors: Yuhan_233 1536943817@qq.com
FilePath: \Data-Structure-Project\backend\app.py
Description: 头部注释配置模板
'''
from flask import Flask
from flask_cors import CORS
from auth import auth
import webbrowser
import os

app = Flask(__name__)
# 启用CORS，允许前端访问
CORS(app)

# 注册认证蓝图
app.register_blueprint(auth)

def open_browser():
    """打开浏览器访问登录页面"""
    # 获取前端登录页面的绝对路径
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    login_path = os.path.join(frontend_dir, 'views', 'login.html')
    webbrowser.open('file://' + login_path)

if __name__ == '__main__':
    # 仅在主进程中打开浏览器
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        import threading
        threading.Timer(1.5, open_browser).start()
    # 启动Flask应用
    app.run(debug=True, port=5000) 