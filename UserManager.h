#ifndef USERMANAGER_H
#define USERMANAGER_H

#include <vector>
#include <string>
#include "User.h"

class UserManager {
private:
    std::vector<User> users;
    std::string filename;

public:
    // 构造函数，加载文件
    UserManager(std::string fname);

    // 添加用户
    void addUser(const User& user);

    // 删除用户
    bool deleteUser(const std::string& username);

    // 显示所有用户
    void displayUsers() const;

    // 从文件加载用户数据
    void loadUsersFromFile();

    // 将用户数据保存到文件
    void saveUsersToFile() const;

    // 查找用户
    std::vector<User>::iterator findUser(const std::string& username);

    // 获取用户列表
    const std::vector<User>& getUsers() const;
};

#endif // USERMANAGER_H
