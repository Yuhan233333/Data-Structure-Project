/*
 * @Author: Yuhan_233 1536943817@qq.com
 * @Date: 2025-03-19 13:38:59
 * @LastEditTime: 2025-03-19 13:49:11
 * @LastEditors: Yuhan_233 1536943817@qq.com
 * @FilePath: \C++\Data-Structure-Project\All_User.h
 * @Description: 头部注释配置模板
 */
#ifndef ALL_USER_H    
#define ALL_USER_H

#include <vector>
#include "User.h"      

class All_User {
private:
    vector<User> _users;
    int _user_num;

public:
    All_User();//构造函数
    void Add_User(string account, string password, string username);//添加用户
    void Delete_User(string account);//删除用户
    void Show_User() const;//展示用户
};

#endif // ALL_USER_H
