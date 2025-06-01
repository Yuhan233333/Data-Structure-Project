from http.server import HTTPServer, SimpleHTTPRequestHandler
import webbrowser
import os

# 设置服务器端口
PORT = 8000

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(__file__), **kwargs)

def run():
    # 切换到前端目录
    os.chdir(os.path.dirname(__file__))
    
    # 创建服务器
    server = HTTPServer(('', PORT), Handler)
    print(f'前端服务器运行在 http://localhost:{PORT}')
    
    # 打开浏览器
    webbrowser.open(f'http://localhost:{PORT}/views/login.html')
    
    # 启动服务器
    server.serve_forever()

if __name__ == '__main__':
    run() 