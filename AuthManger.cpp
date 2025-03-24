/*
 * @Author: Yuhan_233 1536943817@qq.com
 * @Date: 2025-03-24 21:12:36
 * @LastEditTime: 2025-03-24 21:15:15
 * @LastEditors: Yuhan_233 1536943817@qq.com
 * @FilePath: \C++\Data-Structure-Project\AuthManger.cpp
 * @Description: 头部注释配置模板
 */
#include "AuthManager.h"
#include <iostream>

AuthManager::AuthManager(UserManager& um) : userManager(um), currentUser(nullptr) {}

bool AuthManager::login(const std::string& username, const std::string& password) {
    auto userIter = userManager.findUser(username);
    if (userIter != userManager.getUsers().end() && userIter->password == password) {
        currentUser = &(*userIter);  // 设置当前登录的用户
        std::cout << "Login successful. Welcome, " << username << "!" << std::endl;
        return true;  // 登录成功
    }
    std::cout << "Invalid username or password." << std::endl;
    return false;  // 登录失败
}

void AuthManager::logout() {
    currentUser = nullptr;
    std::cout << "Logged out successfully." << std::endl;
}

User* AuthManager::getCurrentUser() const {
    return currentUser;
}

bool AuthManager::isLoggedIn() const {
    return currentUser != nullptr;
}
