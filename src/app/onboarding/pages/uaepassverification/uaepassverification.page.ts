import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Network } from '@ionic-native/network/ngx';
import { finalize } from 'rxjs/operators';
import { AuthenticationService } from 'src/app/shared/services/authentication.service';
// import { AuthService } from 'src/app/services/auth.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { LoginService } from 'src/app/shared/services/login.service';

import { ToastService } from 'src/app/shared/services/toast.service';

import { environment } from 'src/environments/environment';
 
@Component({
  selector: 'app-uaepassverification',
  templateUrl: './uaepassverification.page.html',
  styleUrls: ['./uaepassverification.page.scss'],
})
export class UaepassverificationPage implements OnInit {
  queryParams: any;
  userInfo: any;
  userTypeWithMobileAccess: any =[];
  sourceId: any;
  username: string;
 
  constructor(
    private router: Router,
    private loaderService: LoaderService,
    private authService: AuthenticationService,
    private toastService: ToastService,
    private network: Network,
    private loginService: LoginService
   
  ) {
    const navigation: any = this.router.getCurrentNavigation();
    this.queryParams = navigation?.extras.state;
    console.log("query params", this.queryParams);
   }
 
  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    console.log(state, "state")
    if (state && state['authorization_code']) {
      this.getAccessToken(state['authorization_code']);
    } else {
      this.router.navigate(['/login']);
    }
  }
 
  async getAccessToken(authorizationCode: string) {
    try {
      await this.loaderService.loadingPresent();
     
      const username = environment.uaePass.username;
      const password = environment.uaePass.password;
      const credentials = `${username}:${password}`;
      const creds = btoa(credentials);
     
      this.authService.getaccesstoken(authorizationCode, creds).pipe(
        finalize(() => {
          // You probably want to dismiss the loader here, not present it again
          this.loaderService.loadingDismiss();
        })
      ).subscribe(
        (response: any) => {
          if (response && response.access_token) {
            console.log("access token response", response);
            this.getUserInfo(response.access_token);
          } else {
            this.toastService.showError('Failed to get access token', 'Error');
            this.router.navigate(['/login']);
          }
        },
        (error: any) => {
          console.error(error);
          this.toastService.showError('Authentication failed', 'Error');
          this.router.navigate(['/login']);
        }
      );
    } catch (error) {
      console.error(error);
      this.loaderService.loadingDismiss();
      this.router.navigate(['/login']);
    }
  }
 
  getUserInfo(token: string) {
    this.authService.uaeuserInfo(token).pipe(
      finalize(() => {
        this.loaderService.loadingDismiss();
      })
    ).subscribe(
      (response: any) => {
        console.log("response in userinfo", response);
        if (response?.email) {
          this.userInfo = response;

         
          this.validateUser(this.userInfo);
        } else {
          this.toastService.showError('Failed to get user information', 'Error');
          this.router.navigate(['/login']);
        }
      },
      (error : any) => {
        console.error(error);
        this.toastService.showError('Failed to get user information', 'Error');
        this.router.navigate(['/login']);
      }
    );
  }
 
  validateUser(payload: any) {
    this.loginService.validateUaeUser(payload).subscribe(
      (res: any) => {
        if (res.status == 200 && res.success == true) {
          console.log(res.data);
          const user = res.data.user_type;
            const parse_user = JSON.parse(user);
            console.log(parse_user);
            console.log(user);
            for (const [userType, mobileAccess] of Object.entries(parse_user)) {
              console.log(mobileAccess)
              console.log(userType)
                if (mobileAccess == 1) {
                    this.userTypeWithMobileAccess.push(userType);
                }else{
                  console.log('No Mobile asscess')
                }
            }
            console.log(this.userTypeWithMobileAccess);
            const offlineMode = res.synChFlag;
            const userInfo = res.data;
            console.log('userInfo', userInfo);
            console.log('res', res);
            this.sourceId = res.data.source_id;
            const menuAccess : any = res.menuAccessByRoles;
            console.log("menuAccess", menuAccess);

            localStorage.setItem('sourceId', res.data.source_id)
            localStorage.setItem('currentUser', this.username);//userInfo[0].email_id);
            localStorage.setItem('hashToken', res.token);
            localStorage.setItem('ssoToken', res.sso_token);
            localStorage.setItem('user_id', userInfo.user_id);
            localStorage.setItem('user_type', this.userTypeWithMobileAccess);
            localStorage.setItem('first_name', userInfo.first_name);
            localStorage.setItem('last_name', userInfo.last_name);
            localStorage.setItem('offlineMode', offlineMode);
            localStorage.setItem('menuAccessbyUserRole', JSON.stringify(menuAccess));

            localStorage.setItem('language', 'en');
            this.toastService.showSuccess('Successfully authenticated with UAE Pass', 'Success');
            this.network.onConnect().subscribe(() => {
              console.log('network connected!');
              localStorage.setItem('isOnline', "true");
              setTimeout(() => {
                if (this.network.type === 'wifi') {
                 // this.syncViolations();
                  // this.syncDataMasters();
                }
              }, 3000);
            }),
              (error) => {
                console.log(error)
              };

            this.router.navigate(['/']);
            this.userTypeWithMobileAccess = [];
          
         
          
        } else {
          // User doesn't exist - show error instead of registration form
          this.toastService.showError('User not authorized. Please contact support.', 'Error');
          this.router.navigate(['/login']);
        }
      },
      (error) => {
        console.error(error);
        this.toastService.showError('Authentication Failed', 'Error');
        this.router.navigate(['/login']);
      }
    );
  }

}
 