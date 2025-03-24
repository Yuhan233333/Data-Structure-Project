#ifndef USER_H
#define USER_H

#include <string>
#include <iostream>

// 定义用户权限类型
enum class Role {
    User = 0,   // 普通用户
    Admin = 1   // 管理员
};

class User {
public:
    std::string username;
    std::string password;
    Role admin;  // 用户权限，使用Role枚举

    // 构造函数
    User(std::string uname, std::string pwd, Role r );

    // 显示用户信息
    void display() const; 
};

#endif // USER_H
