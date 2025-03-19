#include <iostream>
#include "User.h"
using namespace std;


/**
 * @description: 该函数用于初始化User类
 * @param {int} id指用于id
 * @param {string} account指用户账号
 * @param {string} password指用于密码
 * @param {string} username指用于用户名
 * @return {*}
 */
User::User(int id, string account, string password, string username)
    : _id(id), _account(account), _password(password), _username(username) {}


/**
 * @description: 该函数用于显示用户信息
 * @return {*}
 */
void User::Show_Info() const {
    cout << "ID: " << _id << ", 账号: " << _account 
         << ", 用户名: " << _username << endl;
}


/**
 * @description: 该函数用于获取用户账号
 * @return {string}
 */
string User::Get_Account() const {
    return _account;
}