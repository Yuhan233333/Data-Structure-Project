#ifndef USER_H      
#define USER_H

#include <iostream>
#include <string>
using namespace std;

class User {
private:
    int _id;// 用户id
    string _account;// 账号
    string _password;// 密码
    string _username;// 用户名

public:
    User(int id, string account, string password, string username);// 构造函数
    void Show_Info() const;// 成员函数
    string Get_Account() const;// 获取用户Id (用于查找用户)
};

#endif 
