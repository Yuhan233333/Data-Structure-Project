#ifndef AUTHMANAGER_H
#define AUTHMANAGER_H

#include <string>
#include "UserManager.h"

class AuthManager {
private:
    UserManager& userManager;
    User* currentUser;  // 当前登录的用户

public:
    AuthManager(UserManager& um);

    // 登录功能
    bool login(const std::string& username, const std::string& password);

    // 退出功能
    void logout();

    // 获取当前登录用户
    User* getCurrentUser() const;

    // 检查是否已登录
    bool isLoggedIn() const;
};

#endif // AUTHMANAGER_H
