import { SettingsService, _HttpClient } from '@delon/theme';
import { Component, OnDestroy, Inject, Optional, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NzMessageService, NzModalService } from 'ng-zorro-antd';
import { ITokenService, DA_SERVICE_TOKEN } from '@delon/auth';
import { ReuseTabService } from '@delon/abc';
import { StartupService } from '@core';

import { PassportService } from './../passport.service';

@Component({
  selector: 'passport-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.less'],
  providers: [PassportService],
})
export class UserLoginComponent implements OnDestroy {
  constructor(
    fb: FormBuilder,
    modalSrv: NzModalService,
    private router: Router,
    private settingsService: SettingsService,
    @Optional()
    @Inject(ReuseTabService)
    private reuseTabService: ReuseTabService,
    @Inject(DA_SERVICE_TOKEN) private tokenService: ITokenService,
    private startupSrv: StartupService,
    public http: _HttpClient,
    public msg: NzMessageService,
    private change: ChangeDetectorRef,
    public service: PassportService,
  ) {
    this.form = fb.group({
      userName: [null, [Validators.required, Validators.minLength(4)]],
      password: [null, Validators.required],
      mobile: [null, [Validators.required, Validators.pattern(/^1\d{10}$/)]],
      captcha: [null, [Validators.required]],
      remember: [true],
    });
    modalSrv.closeAll();
  }

  // #region fields

  get userName() {
    return this.form.controls.userName;
  }
  get password() {
    return this.form.controls.password;
  }

  form: FormGroup;
  error = '';

  submit() {
    this.error = '';
    this.userName.markAsDirty();
    this.userName.updateValueAndValidity();
    this.password.markAsDirty();
    this.password.updateValueAndValidity();
    if (this.userName.invalid || this.password.invalid) {
      return;
    }
    // 默认配置中对所有HTTP请求都会强制 [校验](https://ng-alain.com/auth/getting-started) 用户 Token
    // 然一般来说登录请求不需要校验，因此可以在请求URL加上：`/login?_allow_anonymous=true` 表示不触发用户 Token 校验

    this.service.Login(this.userName.value, this.password.value).then((res: any) => {
      if (res.code === 200) {
        // 清空路由复用信息
        this.reuseTabService.clear(true);

        const user = {
          token: res.data.token,
          name: res.data.nickName,
          avatar: res.data.userFace,
          id: res.data.objectId,
          time: +new Date(),
        };

        // 设置用户Token信息
        this.tokenService.set(user);

        // 设置用户信息
        this.settingsService.setUser(user);
        // 重新获取 StartupService 内容
        this.startupSrv.load().then(() => {
          this.router.navigate(['/']);
          // 由于angular-cli升级到8.x的关系，偶尔会提示"ViewDestroyedError: Attempt to use a destroyed view: detectChanges"错误，但不影响功能使用
          this.change.detach();
        });
      } else {
        this.error = '用户名或密码错误';
      }
    });
    // this.service.Login(this.userName.value, this.password.value).subscribe((res: any) => {

    //   tslint:disable-next-line: triple-equals
    //   if (res.code == 200) {
    //     // 清空路由复用信息
    //     this.reuseTabService.clear(true);
    //     // 设置用户Token信息
    //     this.tokenService.set(res.user);
    //     // 设置用户信息
    //     this.settingsService.setUser(res.user);
    //     // 重新获取 StartupService 内容
    //     this.startupSrv.load().then(() => {
    //       this.router.navigate(['/']);
    //       // 由于angular-cli升级到8.x的关系，偶尔会提示"ViewDestroyedError: Attempt to use a destroyed view: detectChanges"错误，但不影响功能使用
    //       this.change.detach();
    //     });
    //   } else {
    //     this.error = res.msg;
    //   }
    // });
  }

  ngOnDestroy(): void {}
}
