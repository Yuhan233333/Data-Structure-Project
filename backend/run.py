import webbrowser
import os
from .app import app

def main():
    # 获取前端页面的绝对路径
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    login_path = os.path.join(frontend_dir, 'views', 'login.html')
    
    # 在新线程中打开浏览器，指向登录页面
    webbrowser.open('file://' + login_path)
    
    # 启动Flask服务器
    app.run(debug=True, port=5000)

if __name__ == "__main__":
    main() 