# 导入必要的模块
from .user import User, Role


class UserManager:
    def __init__(self, filename):
        """构造函数，加载文件"""
        self.users = []
        self.filename = filename
        self.load_users_from_file()  # 程序启动时加载用户数据

    def add_user(self, user):
        """添加用户"""
        # 检查用户是否已经存在
        if self.find_user(user.username) is not None:
            print(f"Error: User with username '{user.username}' already exists!")
            return  # 如果用户已经存在，直接返回

        # 如果用户不存在，则添加
        self.users.append(user)
        self.save_users_to_file()  # 每次更新后保存到文件
        print(f"User '{user.username}' added successfully.")

    def delete_user(self, username):
        """删除用户"""
        user = self.find_user(username)
        if user is not None:
            self.users.remove(user)
            self.save_users_to_file()  # 删除后保存文件
            return True
        return False  # 用户不存在

    def display_users(self):
        """显示所有用户"""
        for user in self.users:
            user.display()

    def load_users_from_file(self):
        """从文件加载用户数据"""
        try:
            with open(self.filename, 'r') as file:
                for line in file:
                    username, password, admin = line.strip().split(',')
                    role = Role.Admin if int(admin) == 1 else Role.User
                    self.users.append(User(username, password, role))
        except FileNotFoundError:
            print("Unable to open file for reading!")

    def save_users_to_file(self):
        """将用户数据保存到文件"""
        try:
            with open(self.filename, 'w') as file:
                for user in self.users:
                    file.write(f"{user.username},{user.password},{1 if user.role == Role.Admin else 0}\n")
        except IOError:
            print("Unable to open file for writing!")

    def find_user(self, username):
        """查找用户"""
        for user in self.users:
            if user.username == username:
                return user
        return None

    def get_users(self):
        """获取用户列表"""
        return self.users 