from flask import Flask, render_template, send_from_directory
from flask_cors import CORS
from auth import auth
import webbrowser
import os
import pandas as pd
from place_api import place_bp

app = Flask(__name__, template_folder='../frontend/views')
# 启用CORS，允许前端访问
CORS(app)

app.register_blueprint(auth)
app.register_blueprint(place_bp)

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