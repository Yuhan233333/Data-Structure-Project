class AuthManager:
    def __init__(self, user_manager):
        self.user_manager = user_manager
        self.current_user = None

    def login(self, username, password):
        user = self.user_manager.find_user(username)
        if user is not None and user.password == password:
            self.current_user = user  # 设置当前登录的用户
            print(f"Login successful. Welcome, {username}!")
            return True  # 登录成功
        print("Invalid username or password.")
        return False  # 登录失败

    def logout(self):
        self.current_user = None
        print("Logged out successfully.")

    def get_current_user(self):
        return self.current_user

    def is_logged_in(self):
        return self.current_user is not None 