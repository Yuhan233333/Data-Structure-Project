# 导入必要的模块
import os
import sys

# 将项目根目录添加到 Python 路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.user_manager import UserManager
from backend.user import User, Role
from backend.auth_manager import AuthManager


def main():
    # 测试文件名
    filename = "users.txt"

    # 创建一个UserManager实例，传入文件名
    user_manager = UserManager(filename)
    user_manager.display_users()  # 显示当前用户列表

    # 创建一个AuthManager实例
    auth_manager = AuthManager(user_manager)

    # 添加用户，使用 Role.Admin 和 Role.User 来表示权限
    user_manager.add_user(User("Alice", "password123", Role.Admin))  # Alice，管理员
    user_manager.add_user(User("Bob", "password456", Role.User))    # Bob，普通用户

    # 输出当前所有用户
    print("\nUsers after adding:")
    user_manager.display_users()

    # 测试登录功能
    print("\nTesting login functionality:")
    auth_manager.login("Alice", "password123")  # 测试正确的用户名和密码
    auth_manager.login("Bob", "wrongpassword")  # 测试错误的密码

    # 测试登出功能
    print("\nTesting logout functionality:")
    auth_manager.logout()

    # 保存用户到文件
    user_manager.save_users_to_file()


if __name__ == "__main__":
    main() 