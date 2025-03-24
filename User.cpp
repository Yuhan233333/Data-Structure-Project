#include "User.h"
#include <iostream>

// 构造函数初始化
User::User(std::string uname, std::string pwd, Role r = Role::User)
        : username(std::move(uname)), password(std::move(pwd)), admin(r) {}

// 显示用户信息
void User::display() const {
    std::cout << "Username: " << username << ", Password: " << password
              << ", Role: " << (admin == Role::Admin ? "admin" : "user") << std::endl;
}
