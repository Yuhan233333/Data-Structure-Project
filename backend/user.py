# 定义用户权限类型
from enum import Enum


class Role(Enum):
    User = 0  # 普通用户
    Admin = 1  # 管理员


class User:
    def __init__(self, username, password, role=Role.User):
        """构造函数"""
        self.username = username
        self.password = password
        self.role = role

    def display(self):
        """显示用户信息"""
        print(f"Username: {self.username}, Password: {self.password}, Role: {'admin' if self.role == Role.Admin else 'user'}") 