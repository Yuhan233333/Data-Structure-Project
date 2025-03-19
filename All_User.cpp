#include <iostream>
#include "All_User.h"
using namespace std;


All_User::All_User() : _user_num(0) {}

/**
 * @description: 该函数用于添加用户
 * @param {string} account指用户账号
 * @param {string} password指用户密码
 * @param {string} username指用于昵称
 * @return {*}
 */
void All_User::Add_User(string account, string password, string username) {
    _users.emplace_back(_user_num, account, password, username);
    _user_num++;
}

/**
 * @description: 该函数用于删除用户
 * @param {string} account被删除的用于的账号
 * @return {*}
 */
void All_User::Delete_User(string account) {
    for (auto it = _users.begin(); it != _users.end(); ++it) {
        if (it->Get_Account() == account) {
            _users.erase(it);
            _user_num--;
            cout << "用户 " << account << " 已删除。" << endl;
            return;
        }
    }
    cout << "未找到该用户，删除失败。" << endl;
}

/**
 * @description: 显示当前所有用户
 * @return {*}
 */
void All_User::Show_User() const {
    if (_users.empty()) {
        cout << "当前没有用户。" << endl;
        return;
    }

    cout << "当前共有 " << _user_num << " 个用户：" << endl;
    for (const auto& user : _users) {
        user.Show_Info();
    }
}
