#include <iostream>
#include "UserManager.h"
#include "User.h"

int main() {
    // 测试文件名
    std::string filename = "users.txt";

    // 创建一个UserManager实例，传入文件名
    UserManager userManager(filename);
    userManager.displayUsers();  // 显示当前用户列表
    // 添加用户，使用 Role::Admin 和 Role::User 来表示权限
    userManager.addUser(User("Alice", "password123", Role::Admin));  // Alice，管理员
    userManager.addUser(User("Bob", "password456", Role::User));    // Bob，普通用户

    // 输出当前所有用户
    std::cout << "Users after adding:" << std::endl;
    userManager.displayUsers();

    // 保存用户到文件
    userManager.saveUsersToFile();


    return 0;
}
