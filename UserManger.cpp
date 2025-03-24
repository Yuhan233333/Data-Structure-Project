#include "UserManager.h"
#include <fstream>
#include <sstream>
#include <iostream>

UserManager::UserManager(std::string fname) : filename(fname) {
    loadUsersFromFile();  // 程序启动时加载用户数据
}

// 添加用户
void UserManager::addUser(const User& user) {
    // 检查用户是否已经存在
    if (findUser(user.username) != users.end()) {
        std::cout << "Error: User with username '" << user.username << "' already exists!" << std::endl;
        return;  // 如果用户已经存在，直接返回
    }
    
    // 如果用户不存在，则添加
    users.push_back(user);
    saveUsersToFile();  // 每次更新后保存到文件
    std::cout << "User '" << user.username << "' added successfully." << std::endl;
}

// 删除用户
bool UserManager::deleteUser(const std::string& username) {
    auto userIter = findUser(username);
    if (userIter != users.end()) {
        users.erase(userIter);
        saveUsersToFile();  // 删除后保存文件
        return true;
    }
    return false;  // 用户不存在
}

// 显示所有用户
void UserManager::displayUsers() const {
    for (const auto& user : users) {
        user.display();
    }
}

// 从文件加载用户数据
void UserManager::loadUsersFromFile() {
    std::ifstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Unable to open file for reading!" << std::endl;
        return;
    }

    std::string line;
    while (std::getline(file, line)) {
        std::istringstream ss(line);
        std::string username, password;
        int admin;  // 用来读取权限字段
        if (std::getline(ss, username, ',') && std::getline(ss, password, ',') && ss >> admin) {
            // 根据读取到的 admin 字段值设置权限
            Role role = (admin == 1) ? Role::Admin : Role::User;
            users.emplace_back(username, password, role);  // 每行依次读入用户名和密码
        }
    }

    file.close();
}

// 将用户数据保存到文件
void UserManager::saveUsersToFile() const {
    std::ofstream file(filename);
    if (!file.is_open()) {
        std::cerr << "Unable to open file for writing!" << std::endl;
        return;
    }

    for (const auto& user : users) {
        file << user.username << "," << user.password << ","
             << (user.admin == Role::Admin ? 1 : 0) << std::endl;  // 使用枚举值 1 或 0
    }

    file.close();
}



// 查找用户
std::vector<User>::iterator UserManager::findUser(const std::string& username) {
    for (auto it = users.begin(); it != users.end(); ++it) {
        if (it->username == username) {
            return it;  // 找到用户，返回其迭代器
        }
    }
    return users.end();  // 如果未找到，返回end迭代器
}

// 获取所有用户
const std::vector<User>& UserManager::getUsers() const {
    return users;  // 返回用户列表的常量引用
}
