import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { File, FileEntry } from '@ionic-native/File/ngx';
import { ToastController } from '@ionic/angular';
import { finalize } from 'rxjs/operators';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { LoginService } from 'src/app/shared/services/login.service';
import { ToastService } from 'src/app/shared/services/toast.service';
import * as CryptoJS from 'crypto-js';
import { DbService } from 'src/app/shared/services/offline-code/db.service';
import { ConnectivityService } from 'src/app/shared/services/offline-code/connectivity.service';
import { HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { ModuleService } from 'src/app/shared/services/module.service';
import { environment } from 'src/environments/environment';
import { Network } from '@ionic-native/network/ngx';
import { ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';
import { HTTP } from '@ionic-native/http/ngx';
import {EncrDecrServiceService} from '../../../shared/services/encr-decr-service.service';
import { AuthenticationService } from 'src/app/shared/services/authentication.service';
import { AppAvailability } from '@ionic-native/app-availability/ngx'
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { UaepassService } from 'src/app/shared/services/uaepass.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  submitted = false;
  errorMsg = '';
  file = new File()
  private httpClient: HttpClient;
  percentDone: any;
  catchaURL: any;
  captchaValue: any;
  @ViewChild('dataContainer') dataContainer: ElementRef;
  isOnline: any = "false";
  refresh: Subject<any> = new Subject();
  rememberMe:boolean=false;
  sourceId: any;
  fileName: any;
  isClicked:boolean=true;
  initailType="password";
  userTypeWithMobileAccess: any =[];
  uaepassbuttonenable: boolean = false;
  
  constructor(
    private fb: FormBuilder,
    private loginServices: LoginService,
    public routerServices: Router,
    private loaderService: LoaderService,
    private moduleService: ModuleService,
    public toastService: ToastService,
    private dbservice: DbService, private connectivity: ConnectivityService,
    private network: Network, private cref: ChangeDetectorRef,private httpobj: HTTP,
    private EncrDecr: EncrDecrServiceService,
    private route:ActivatedRoute,private auth: AuthenticationService,
    private appAvailability : AppAvailability,
    private inAppBrowser: InAppBrowser,
    private uaePassService:UaepassService,
  ) {
    
    route.params.subscribe(val => {
      if (localStorage.getItem('remcredentials')) {

        let userCredentials = JSON.parse(localStorage.getItem('remcredentials'))
        this.loginForm.controls['userName'].setValue(userCredentials.username)
        this.loginForm.controls['password'].setValue(userCredentials.password)
        this.rememberMe = true;
      }
    });
    this.loginForm = this.fb.group({
      userName: [null, [Validators.required]],
      password: [null, [Validators.required]],
      captcha: [null, [Validators.required]],
      frmremember:[null]
    }, { validator: this.validateCaptcha('captcha') });

    this.connectivity.appIsOnline$.subscribe(async online => {

      console.log(online)

      if (online) {    
        setTimeout(async () => {
          await this.createCaptcha()
          this.refresh.next()
          this.cref.detectChanges();
        }, 80); 
        this.loginForm.controls['captcha'].setValidators([Validators.required]);
        this.isOnline = "true";

      }
      else {
        this.loginForm.controls['captcha'].clearValidators();
        this.isOnline = "false";
      }
      this.loginForm.controls['captcha'].updateValueAndValidity();
    })
  }

ngOnInit() {   
  console.log("ngOnInit called");
  this.uaePassSettings();
}

  ngAfterViewInit(): void {
    this.connectivity.appIsOnline$.subscribe(async online => {
      if (online) {
        this.isOnline = "true";
      }
      else {
        this.isOnline = "false";
      }
    })
    this.generateCaptch();
  }

  ionViewDidEnter() {

  }

  get form() { return this.loginForm.controls; }
  get username() { return this.loginForm.get('userName')?.value; }
  get password() { return this.loginForm.get('password')?.value; }

  login() {
    console.log('Welcome to login');
    this.submitted = true;
    if (this.loginForm.invalid) {
      setTimeout(async () => {
        await this.createCaptcha()
        this.refresh.next()
        this.cref.detectChanges();
      }, 80);
      return;
    }


    if (this.rememberMe) {
      localStorage.setItem('remcredentials', JSON.stringify({username:this.loginForm.value.userName,password:this.password}));
      
    }
    else {
        if(localStorage.getItem('remcredentials'))
        {
          localStorage.removeItem('remcredentials')
        }
    }

    const encpassword = this.EncrDecr.set(this.password)//CryptoJS.MD5(this.password).toString();
    const payload = {
      "email": this.loginForm.value.userName.trim(),
      // password: this.loginForm.value.password
      "password": encpassword,
      "filename":this.fileName
    };
    // console.log('data', data);

    if (localStorage.getItem('isOnline') === "true") {

      if (this.captchaValue === this.loginForm.value.captcha) {

        // payload.captchaValue = this.captchaValue;
        this.loginServices.validateUser(payload).pipe(finalize(()=>{
          console.log(payload,"sss");
          
          setTimeout(async () => {
            await this.createCaptcha()
            this.refresh.next()
            this.cref.detectChanges();
          }, 80);
        })).subscribe((res: any) => {
          if (res.statusCode === 200 || res.status === 200) {
            const user = res.data[0].user_type;
            const parse_user = JSON.parse(user);
            console.log(parse_user);
            console.log(user);
            for (const [userType, mobileAccess] of Object.entries(parse_user)) {
              console.log(mobileAccess)
              console.log(userType)
                if (mobileAccess == 1) {
                    this.userTypeWithMobileAccess.push(userType);
                }else{
                  setTimeout(async () => {
                    await this.createCaptcha()
                    this.refresh.next()
                    this.cref.detectChanges();
                  }, 80);
                  console.log('No Mobile asscess')
                }
            }
            console.log(this.userTypeWithMobileAccess);
            const offlineMode = res.synChFlag;
            const userInfo = res.data;
            console.log('userInfo', userInfo);
            console.log('res', res);
            this.sourceId = res.data[0].source_id;
            const menuAccess : any = res.menuAccessByRoles;
            console.log("menuAccess", menuAccess);
            const dedAccess : any = res.dedSelectedEmirate;

            localStorage.setItem('sourceId', res.data[0].source_id)
            localStorage.setItem('currentUser', this.username);//userInfo[0].email_id);
            localStorage.setItem('hashToken', res.token);
            localStorage.setItem('ssoToken', res.sso_token);
            localStorage.setItem('user_id', userInfo[0].user_id);
            localStorage.setItem('user_type', this.userTypeWithMobileAccess);
            localStorage.setItem('first_name', userInfo[0].first_name);
            localStorage.setItem('last_name', userInfo[0].last_name);
            localStorage.setItem('offlineMode', offlineMode);
            localStorage.setItem('menuAccessbyUserRole', JSON.stringify(menuAccess));
            localStorage.setItem('dedSelectedEmirate', JSON.stringify(dedAccess));
            localStorage.setItem('userRoles',userInfo[0].user_role_names);
            localStorage.setItem('language', 'en');
            this.toastService.showSuccess('Login Successfully', 'Success');
            this.loginForm.reset();
            this.submitted = false;
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

            this.routerServices.navigate(['/']);
            this.userTypeWithMobileAccess = [];
          }
          else {   
            this.toastService.showError('Invalid Credentials or Not Authorized !', 'Alert');      
          }
        }),
          (error) => {
            setTimeout(async () => {
              await this.createCaptcha()
              this.refresh.next()
              this.cref.detectChanges();
            }, 80);
            console.log(error)
          };
      }
      else {
        setTimeout(async () => {
          await this.createCaptcha()
          this.refresh.next()
          this.cref.detectChanges();
        }, 80);
        this.toastService.showError('Invalid Captcha.', 'Alert');
      }
    }
    else {
      // const offlinePayload = {
      //   "email": this.loginForm.value.userName.trim(),
      //   // password: this.loginForm.value.password
      //   "password": encpassword,
      //   // "filename":this.fileName
      // };
      this.dbservice.validateUser(payload).then((res: any) => {
        console.log(res,"offline login");
        debugger
        if (res.length > 0) {
          const userInfo = res;
          console.log('userInfo', userInfo);
          console.log('res', res);
          localStorage.setItem('currentUser', this.username);//userInfo[0].email_id);
          //localStorage.setItem('hashToken', res.token);
          localStorage.setItem('user_id', userInfo[0].user_id);

          localStorage.setItem('first_name', userInfo[0].first_name);
          localStorage.setItem('last_name', userInfo[0].last_name);

          localStorage.setItem('language', 'en');
          this.toastService.showSuccess('Login Successfully', 'Success');
          this.loginForm.reset();
          this.routerServices.navigate(['/']);
        }
        else {
          this.toastService.showError("Invalid Credentials", "");
        }
      })
    }

  }


  ionViewWillLeave() {


  }


  async syncDataMasters() {
    //this.loaderService.loadingPresentcm("Data Syncing. Please Wait...");

    if (localStorage.getItem('isOnline') === "true") {
      console.log('network connected!');
      await this.getVoilationTypeData();
      await this.getDocumentTypeData();
      await this.ListViolationCategories();
      await this.ListFineCodes();
      await this.ListAreas();
      await this.ListPlateCodes();
      await this.ListPlateSources();
      await this.ListReserved();
      //await this.syncViolations();
      // this.loaderService.loadingDismiss();
    }
    else {
      // this.loaderService.loadingDismiss();
    }

  }

  async getVoilationTypeData(): Promise<any> {
    let payload = {
      "source_id": this.sourceId
    }
    return this.moduleService.getVoilationType(payload).subscribe((result: any) => {
      this.dbservice.bulkInsertViolationTypes(result.data);
    }),
      (error) => {
        console.log(error)
      };
  }

  async getDocumentTypeData(): Promise<any> {
    return this.moduleService.getDocumentType().subscribe((result: any) => {
      this.dbservice.bulkInsertDocumentTypes(result.data);
    }),
      (error) => {
        console.log(error)
      };
  }

  async ListViolationCategories(): Promise<any> {
    let payload = {
      "source_id": this.sourceId
    }
    return this.moduleService.getViolationCategory(payload).subscribe((result: any) => {
      this.dbservice.bulkInsertFineCategories(result.data);
    });
  }

  async ListFineCodes(): Promise<any> {
    return this.moduleService.ListFineCodes().subscribe((result: any) => {
      this.dbservice.bulkInsertFineCategoryCodes(result.data);
    }),
      (error) => {
        console.log(error)
      };
  }

  async ListAreas(): Promise<any> {
    let payload ={
      "source_id": this.sourceId
    }
    return this.moduleService.getArea(payload).subscribe((result: any) => {
      this.dbservice.bulkInsertAreas(result.data);
    }),
      (error) => {
        console.log(error)
      };

  }

  async ListPlateCodes() {
    let payload = {
      "source_id": this.sourceId,
    }
    return this.moduleService.getPlateCode(payload).subscribe((result: any) => {
      this.dbservice.bulkInsertPlateCodes(result.data);
    }),
      (error) => {
        console.log(error)
      }
  }

  async ListPlateSources() {
    let payload = {
      "source_id": this.sourceId
    }
    return this.moduleService.getPlateSource(payload).subscribe((result: any) => {
      this.dbservice.bulkInsertPlateSources(result.data);
    }),
      (error) => {
        console.log(error)
      }
  }

  async ListReserved() {
    let payload = {
      "source_id": this.sourceId
    }
    return this.moduleService.getReservedCode(payload).subscribe((result: any) => {
      this.dbservice.bulkInsertReserved(result.data);
    }),
      (error) => {
        console.log(error)
      }
  }

  async syncViolations() {
    //let documents: any = [];
    let violationIDs = [];
    /* Start Sync Violations Code */
    let violations: any;
    if (localStorage.getItem('isOnline') === "true") {
      await this.dbservice.getviolationList(this.sourceId).then(async (data) => {
        console.log("Violation", data);
        violations = data;
        if (data.length > 0) {
          await this.moduleService.violationCreationOffline(data).subscribe((result: any) => {
            data.map((item: any) => {
              violationIDs.push(item.violation_id);
              this.dbservice.DeleteViolationSyncStatus(item.violation_id).then((res) => {
                console.log(res);
              })
            })
            //return;
            //console.log(result);
          }),
            (error) => {
              console.log(error)
            }
        }
      })
      /* End Sync Violations Code */

      /* Start Violations Docs Sync */
      const documents = await this.dbservice.getviolationDocList().then(async (data) => {
        console.log("getviolationDocList", data);
        let violationdocs = data;
        let documents: any = [];
        //violationdocs.map((item) => {
        for (var i = 0; i < violationdocs.length; i++) {
          let docsList: any = violationdocs[i].violationdocs.split(',')
          // await docsList.map(async (document) => {
          for (var doc = 0; doc < docsList.length; doc++) {
            let localdocPath: any = this.file.externalDataDirectory + "ViolationDocs/" + docsList[doc];
            let directoryPath = localdocPath.substr(0, localdocPath.lastIndexOf('/'));
            let fileName = localdocPath.substr(localdocPath.lastIndexOf('/') + 1);
            await this.file.readAsArrayBuffer(directoryPath, fileName).then((result) => {
              let blob = new Blob([result], { type: "image/jpeg" });
              let blobSize = blob.size / (1024 * 1024);
              documents.push({ blob: blob, filename: fileName });
            }).catch(err => {
              console.log('file not found' + JSON.stringify(err));
            });

          }
          //})  
        }
        // })
        return documents;
      })
      const formData = new FormData();
      for (let i = 0; i < documents.length; i++) {
        console.log(documents[i]);
        //var file=new File([documents[i]],)

        formData.append("files", documents[i].blob, documents[i].filename);
      }
      this.httpobj.setDataSerializer('multipart');
      this.httpobj.setHeader(environment.authorizationURL, "Authorization", localStorage.getItem('hashToken'));
      this.httpobj.sendRequest(environment.apiUrl + '/uploadoffline', {
        method: "post",
        data: formData,
        timeout: 60,
      })
        .then(response => {
          this.loaderService.loadingDismiss();

        })
        .catch(error => {
          this.loaderService.loadingDismiss();
        });

      /* End Violations Docs Sync */

      /* Start Violation Amend  Docs */


      const amenddocs = await this.dbservice.getviolationAmenddocs().then(async (data) => {
        let violationamenddocs = data;
        let amenddocs: any = [];

        // violationVideos.map((item)=>{
        for (var i = 0; i < violationamenddocs.length; i++) {
          let amenddoc: any = violationamenddocs[i].images;
          let localamenddocPath: any = amenddoc;
          let directoryPath = localamenddocPath.substr(0, localamenddocPath.lastIndexOf('/'));
          let fileName = localamenddocPath.substr(localamenddocPath.lastIndexOf('/') + 1);
          await this.file.readAsArrayBuffer(directoryPath, fileName).then((result) => {

            let blob = new Blob([result], { type: "image/jpeg" });
            let blobSize = blob.size / (1024 * 1024);
            amenddocs.push({ blob: blob, filename: fileName });
          }).catch(err => {
            console.log('file not found' + JSON.stringify(err));
          });
        }
        return amenddocs;
      })
      const formDataamenddocs = new FormData();
      for (let i = 0; i < amenddocs.length; i++) {
        console.log(amenddocs[i]);
        //var file=new File([documents[i]],)

        formDataamenddocs.append("files", amenddocs[i].blob, amenddocs[i].filename);
      }
      this.httpobj.setDataSerializer('multipart');
      this.httpobj.setHeader(environment.authorizationURL, "Authorization", localStorage.getItem('hashToken'));
      this.httpobj.sendRequest(environment.apiUrl + '/uploadmultipleamenddocs', {
        method: "post",
        data: formDataamenddocs,
        timeout: 60,
      })
        .then(response => {
          this.loaderService.loadingDismiss();

        })
        .catch(error => {
          this.loaderService.loadingDismiss();
        });

      /* End Violation Amend docs */

      /* Start Violations videos Sync */

      const videos = await this.dbservice.getviolationVideosList().then(async (data) => {
        let violationVideos = data;
        let videos: any = [];
        // violationVideos.map((item)=>{
        for (var i = 0; i < violationVideos.length; i++) {
          let video: any = violationVideos[i].violationvideos;
          let localvideoPath: any = video;
          let directoryPath = localvideoPath.substr(0, localvideoPath.lastIndexOf('/'));
          let fileName = localvideoPath.substr(localvideoPath.lastIndexOf('/') + 1);
          await this.file.readAsArrayBuffer(directoryPath, fileName).then((result) => {

            let blob = new Blob([result], { type: "video/mp4" });
            let blobSize = blob.size / (1024 * 1024);
            videos.push({ blob: blob, filename: fileName });
          }).catch(err => {
            console.log('file not found' + JSON.stringify(err));
          });
        }
        return videos;
      })
      const formDataVideos = new FormData();
      for (let i = 0; i < videos.length; i++) {
        console.log(videos[i]);
        //var file=new File([documents[i]],)

        formDataVideos.append("files", videos[i].blob, videos[i].filename);
      }
      
      this.httpobj.setDataSerializer('multipart');
      this.httpobj.setHeader(environment.authorizationURL, "Authorization", localStorage.getItem('hashToken'));
      this.httpobj.sendRequest(environment.apiUrl + '/uploadofflineVideos', {
        method: "post",
        data: formDataVideos,
        timeout: 60,
      })
        .then(response => {
          this.loaderService.loadingDismiss();

        })
        .catch(error => {
          this.loaderService.loadingDismiss();
        });

      /* End Violations videos Sync */
      violationIDs.map((item) => {
        this.dbservice.DeleteAmendRequest(item).then((res: any) => {
          console.log("amend record deleted");
        })

      })

    }
  }

  generateCaptch(): any {

    this.loginServices.generateCaptcha().subscribe((res: any) => {
      this.catchaURL = res.data.image;
      this.captchaValue = res.data.word;
      this.fileName = res.data.filename
      this.dataContainer.nativeElement.innerHTML = this.catchaURL;
      this.cref.detectChanges();
    })

  }

  createCaptcha() {
    this.generateCaptch();
  }

  validateCaptcha(inputvalue: string) {

    return (group: FormGroup): { [key: string]: any } => {
      let inputCaptcha = group.controls[inputvalue];
      let captcha = this.captchaValue;

      if (inputCaptcha.value !== captcha && this.isOnline === "true") {
        return {
          mismatchedcaptcha: true
        };
      }
    }

  }

  rememberme(event:any)
  {
    //console.log(event.currentTarget.checked)
    this.rememberMe = event.currentTarget.checked;
  }

  showOrHidePassword(){
    if(this.isClicked===true){
      this.isClicked=false
      this.initailType="test"
    }
    else if (this.isClicked===false){
      this.isClicked=true
      this.initailType="password"
    }
  }

   checkApp(){
    const packageId = environment.uaePass.packageId;
    console.log(packageId,'djsnjdn');
    this.appAvailability.check(packageId)
    .then(() => {
      console.log('UAE PASS is installed');
      this.openUAEPassApp();
    })
    .catch((error) => {
      this.navigatetoUae();
      // Handle the error appropriately
    });
  };

openUAEPassApp() {
  const state = encodeURIComponent(environment.uaePass.state);
  const uaePassConfig = environment.uaePass;

  // Construct the UAE Pass authentication URL
  const loginUrl = `${uaePassConfig.authUrl}?acr_values=${encodeURIComponent(uaePassConfig.mobileacrValues)}&client_id=${uaePassConfig.clientId}&redirect_uri=${encodeURIComponent(uaePassConfig.redirectUri)}&response_type=${uaePassConfig.responseType}&scope=${encodeURIComponent(uaePassConfig.scope)}&state=${state}`;

  console.log('UAE Pass Auth URL:', loginUrl);

  // Open in InAppBrowser with proper options
  this.loaderService.loadingPresentcm('Launching UAE Pass...');
  const browser = this.inAppBrowser.create(loginUrl, '_blank', {
    location: 'no',
    hidden: 'no',
    clearcache: 'yes',
    clearsessioncache: 'yes',
    toolbar: 'no',
  });

  // Handle navigation events
  browser.on('loadstart').subscribe(async (event) => {
    this.loaderService.loadingDismiss();
    if (!event.url) return;
    let url = event.url;
    console.log('Navigation URL:', event.url);
    const cleaned = url.replace(/^http:\/\/uaepass:\/\//,'');
    // Handle UAE Pass callback URLs
    if (url.startsWith('http://uaepass://')) {
      try {
        console.log('uaepassstg URL detected', url)
        // Normalize the URL (remove protocol inconsistencies)
        const normalizedUrl = new URL(url.replace('http://uaepass://', 'https://uaepassstg/'));
        
        const successURL = normalizedUrl.searchParams.get('successurl');
        const failureURL = normalizedUrl.searchParams.get('failureurl');
        console.log('successurl', successURL);
        console.log('failureurl', failureURL);
        const pathOnly = cleaned.split('?')[0];
        if (successURL && failureURL) {
          console.log('Processing UAE Pass response...');
          // Prepare the deep link URLs for your app
          const appScheme = environment.schema;
          const encodedSuccess = encodeURIComponent(`${appScheme}://resume_authentication?url=${successURL}`);
          const encodedFailure = encodeURIComponent(`${appScheme}://resume_authentication?url=${failureURL}`);
          
          const rewrittenUrl = `${environment.uaePass.schema}://${pathOnly}?successurl=${encodedSuccess}&failureurl=${encodedFailure}`;

          console.log('Rewritten URL:', rewrittenUrl);
          browser.close();
          // Open the system browser to trigger the app deep link
          this.inAppBrowser.create(rewrittenUrl, '_system');
        }
      } catch (error) {
        console.error('Error processing UAE Pass response:', error);
        browser.close();
        this.toastService.showError('Authentication processing failed', '');
      }
    }
  });

  // Handle browser exit
  browser.on('exit').subscribe(() => {
    console.log('UAE Pass browser closed');
  });
}
  navigatetoUae() {
    //const dynamicUrl = `${environment.UAEPassBaseUrl}?${environment.params.toString()}`;
    const state = encodeURIComponent(environment.uaePass.state); // Replace or generate dynamically
    const uaePassConfig = environment.uaePass;
 
    const dynamicUrl = `${uaePassConfig.authUrl}?acr_values=${encodeURIComponent(uaePassConfig.webacrValues)}&client_id=${uaePassConfig.clientId}&redirect_uri=${encodeURIComponent(uaePassConfig.redirectUri)}&response_type=${uaePassConfig.responseType}&scope=${encodeURIComponent(uaePassConfig.scope)}&state=${state}`
    this.uaePassService.verifyAppAuthentication(dynamicUrl);
  }

uaePassSettings() {
  const btoaValue = btoa('uaeSettings');
  let payload = {
    uaeCheck: btoaValue
  };
  console.log("Calling UAE Pass settings API...");

  this.moduleService.getUaeSettings(payload).subscribe(
    (res: any) => {
      console.log(res, "uae check");
      if (res.statusCode == 200) {
        if (res.data.buttonCheck == "Yes") {
          this.uaepassbuttonenable = true;
        }
      }
    },
    (error) => {
      console.error("Error in UAE Pass settings:", error);
    }
  );
}



}



