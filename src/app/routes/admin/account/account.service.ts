import { _HttpClient } from '@delon/theme';
import { Injectable } from '@angular/core';
// BmobServer
import BmobServer from '@bmob/bmob-server';

@Injectable()
export class AccountService {
  constructor(public http: _HttpClient) {}

  /**
   * 获取个人资料
   * @param token 用户token
   */
  GetUserInfo(token) {
    const query = BmobServer.GetQuery('_User');
    query.equalTo('token', '==', token);
    // 只返回select的字段值
    query.select('username', 'userFace', 'nickName', 'realName', 'nickName', 'gender');
    return new Promise((resolve, reject) => {
      query
        .find()
        .then(res => {
          resolve({ code: 200, data: res[0] });
        })
        .catch(err => reject(err));
    });
  }
  /**
   * 修改个人资料
   * @param params 修改的参数对象
   * @param id 对象id
   */
  EditProfile(params, id) {
    return new Promise((resolve, reject) => {
      BmobServer.EditOne('_User', id, params)
        .then(res => resolve(res))
        .catch(err => reject(err));
    });
  }
  // 修改密码
  // params: 修改的参数对象，token: token值

  /**
   * 修改密码
   * @param params 修改的参数对象
   * @param token 用户token
   */
  ChangePwd(params, token) {
    const query = BmobServer.GetQuery('_User');
    // 根据唯一键查询对象
    query.equalTo('token', '==', token);
    query.equalTo('password', '==', params.oldPassword);

    return new Promise((resolve, reject) => {
      query
        .find()
        .then(res => {
          if (res.length) {
            // 只能批量修改
            res.set('password', params.newPassword);
            res
              .saveAll()
              .then(() => resolve({ code: 200, msg: '操作成功！' }))
              .catch(err => reject(err));
          } else {
            resolve({ code: 404, msg: '旧密码不正确！' });
          }
        })
        .catch(err => reject(err));
    });
  }
}