import { Component, OnDestroy, OnInit, ChangeDetectorRef, Renderer2, ViewChild, ElementRef } from '@angular/core';
import {
  ToastController,
  Platform,
  LoadingController
} from '@ionic/angular';
import {
  GoogleMaps,
  GoogleMap,
  GoogleMapsEvent,
  Marker,
  GoogleMapsAnimation,
  MyLocation,
  ILatLng,
  BaseArrayClass
} from '@ionic-native/google-maps';
import { ModuleService } from 'src/app/shared/services/module.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, NavigationExtras, Router } from '@angular/router';
import { finalize, first } from 'rxjs/operators';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { TranslateService } from '@ngx-translate/core';
import { Network } from '@ionic-native/network/ngx';
import { ToastService } from 'src/app/shared/services/toast.service';
import { ConnectivityService } from 'src/app/shared/services/offline-code/connectivity.service';
import { DbService } from '../../../shared/services/offline-code/db.service';
import { LoaderService } from 'src/app/shared/services/loader.service';
import { HttpBackend, HttpClient, HttpEventType, HttpResponse } from '@angular/common/http';
import { File, FileEntry } from '@ionic-native/File/ngx';
import { environment } from 'src/environments/environment';
import { settings } from 'cluster';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
import { LocationAccuracy } from '@ionic-native/location-accuracy/ngx';
import { ExternalBrowserService } from 'src/app/shared/services/external-browser.service';
import { InAppBrowser } from '@ionic-native/in-app-browser/ngx';
import { HTTP } from '@ionic-native/http/ngx';
import { LoginService } from 'src/app/shared/services/login.service';
import { from, Observable } from 'rxjs';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit, OnDestroy {

  map: GoogleMap;
  violationList: any;
  postion: any = [];
  subParams: Subscription;
  vioCount: any=0;
  userId: any;
  setLanguage: any;
  file = new File();
  private httpClient: HttpClient;
  percentDone: any;
  latlong:any;
  @ViewChild('map_canvas') mapContainer: ElementRef;
  _height: string = '100%';
  _width: string = '100%';
  height:any=100;
  width:any=100;
  locationCoords: any;
  timetest: any;
  sourceId: string;
  plateCategoryid: string;
  plateSourceid: string;
  selectedPlateSources: any;
  user_type: any;
  complaintsMenuData: any;
  show = false;
  showInspector: boolean = false;
  checkoffline: any;
  menuAccess: any[] = [];
  baseUrl = environment.webUrl;
  first_name: string;
  last_name: string;

  
  constructor(public loadingCtrl: LoadingController,
    public toastCtrl: ToastController,
    private moduleService: ModuleService,
    private platform: Platform, private route: ActivatedRoute,
    private translateService: TranslateService,
    private cRef: ChangeDetectorRef, public geolocation: Geolocation,
    private androidPermissions: AndroidPermissions,
    private locationAccuracy: LocationAccuracy,
    private network: Network, public toastService: ToastService,
    private dbservice: DbService,
    private loaderService: LoaderService, private connectivity: ConnectivityService, httpBackend: HttpBackend,private renderer: Renderer2,
    private router: Router,
    private externalBrowserService: ExternalBrowserService,
    private iab: InAppBrowser,
    private httpobj: HTTP,
  private loginService: LoginService
  ) 
    {
    this.sourceId = localStorage.getItem('sourceId');
    this.plateCategoryid = localStorage.getItem('plateCategory');
    this.plateSourceid = localStorage.getItem('plateSource');
    this.selectedPlateSources =localStorage.getItem('plateSourceId');
    this.httpClient = new HttpClient(httpBackend);
    this.setLanguage = window.localStorage.getItem('language');
    this.translateService.use(this.setLanguage);
    this.first_name = localStorage.getItem('first_name');
    this.last_name = localStorage.getItem('last_name');
    }

  ngOnInit(): void {
    const menuAccessStored = localStorage.getItem('menuAccessbyUserRole');
    this.user_type = localStorage.getItem('user_type');
    console.log(this.user_type);
    if (menuAccessStored) {
      this.menuAccess = JSON.parse(menuAccessStored);
    }
    const order = [
      'violations', 'create_violation', 'sync_masters', 'sync_violations',
      'create_raqib_complaint', 'raqib_complaints', 'create_warning', 'warnings',
      'create_inspector_report', 'inspector_reports', 'reject_inspector_reports','permits','toll_free_services',
      'create_general_incident', 'general_incidents', 'create_permit', 'warning_to_violations',
      'assorted_report','create_follow_up_request','follow_up_requests','legal_notices',"legal_notice_invoices"
    ];

    this.menuAccess.sort((a, b) => {
      return order.indexOf(a.menu_check) - order.indexOf(b.menu_check);
    });

  }
  ionViewWillEnter() {
    this.checkoffline = localStorage.getItem('offlineMode');
    console.log("this.check", this.checkoffline);
    const userTypeString = this.user_type || '';
    this.showInspector = userTypeString.includes('12') || userTypeString.includes('32');
    console.log(this.showInspector);

    this.platform.ready()
      .then(
        () => {
          setTimeout(() => {
          }, 80);
        }
      );
            
    this.getComplaintsMenu();
    this.user_type = localStorage.getItem('user_type');
    console.log(this.user_type);
      localStorage.setItem("locationserviceenabled","true");
    this.moduleService.languageEvent.subscribe((result: any) => {
      this.translateService.use(result);
    }),
      (error) => {
        console.log(error)
      };
    this.subParams = this.route.params.pipe( 
      finalize(() => {
       
      })
    ).subscribe(params => {
      this.connectivity.appIsOnline$.subscribe(async online => {

        console.log(online)

        if (online) {
          if(this.user_type == 12 || this.user_type == 32){
          this.getViolationList();
          }
        }
        else {
          //this.loadMap();
          this.getOfflineViolationList();
        }
      })
    }),
      (error) => {
        console.log(error)
      };
  }
hasAccess(menuRoleIds: any): boolean {
  // console.log(menuRoleIds);
  if(menuRoleIds == null){ 
    return false;
  }
  else{
    const roles = menuRoleIds.split(',');
    const userRoles = this.user_type.split(',');
    return userRoles.some(role => roles.includes(role));
  }

  }

  private setupContainer() {
    this.setWidth();
    this.setHeight();

    // set display block
  //  this.renderer.setAttribute(this.mapContainer, 'z-index', '1000');
    this.renderer.setAttribute(this.mapContainer, 'display', 'block');
  }

  private setWidth() {
    this.renderer.setAttribute(this.mapContainer, 'width', this._width);
  }

  private setHeight() {
    this.renderer.setAttribute(this.mapContainer, 'height', this._height);
  }

  navigateToDetails(complaintTypeId: string) {
    this.router.navigate(['/viewgeneral', complaintTypeId]);
  }

  async onButtonClick() {
    this.map.clear();




    // Get the location of you
    this.map.getMyLocation().then((location: MyLocation) => {

      console.log(JSON.stringify(location, null, 2));

      // Move the map camera to the location with animation
      this.map.animateCamera({
        target: location.latLng,
        zoom: 17,
        tilt: 30
      });

      // add a marker
      const marker: Marker = this.map.addMarkerSync({
        //title: 'RP Web Apps',
        //snippet: 'It Service',
        position: location.latLng,
        animation: GoogleMapsAnimation.BOUNCE
      });

      // show the infoWindow
      marker.showInfoWindow();

      // If clicked it, display the alert
      marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(() => {
        //this.showToast('clicked!');
      }),
        (error) => {
          console.log(error)
        };
    })
      .catch(err => {

        //this.showToast(err.error_message);
      });
  }

  async getComplaintsMenu(){
    // this.show = true;
    console.log("entered to menu");
    this.userId = localStorage.getItem('user_id');
    console.log(this.userId);
    await this.moduleService.getComplaintsMenuByRole(this.userId).subscribe((resp: any)=>{
      console.log(resp);
      if(resp.statusCode == 200){
        this.complaintsMenuData = resp.data;
        if(this.complaintsMenuData.length > 0){
        localStorage.setItem('complaint_type_id',this.complaintsMenuData[0].complaint_type_id); 
        }
      }
    })
  }
  
  getViolationList() {
    this.userId = localStorage.getItem('user_id');
    console.log('getViolationList_1');
    let payload = {
      "sourceId": this.sourceId,
      "userid": this.userId,
      "count": true
    }
    this.moduleService.getViolationList(payload).pipe(finalize(() => {
     
      //this.loadMap();
    
    })).subscribe((res: any) => {
      console.log("Violation List", res);
      this.violationList = res.data;
      console.log("vioCount", this.violationList.length);
      if (this.violationList.length > 0) {
        this.vioCount = this.violationList.length;
        this.violationList.map((item:any) => {
          // console.log(this.violationList);
          if(item.fine_place){
            const splitval = item.fine_place.split(",");
            if (splitval.length === 2 && splitval[0] !== undefined && splitval[1] !== undefined) {
              const objVal = {
                position: {
                  lat: splitval[0],
                  lng: splitval[1]
                },
                icon: {
                  url: item.side_type == "1" ? '../../../../assets/icon/commercial.png' :
                    item.side_type == "2" ? '../../../../assets/icon/individual.png' :
                      item.side_type == "3" ? '../../../../assets/icon/vehicle.png' : '',
                  // size: {
                  //   width: 24,
                  //   height: 24
                  // },
                }
              };
             this.postion.push(objVal);
            }
          }
        });
        //console.log("postion", this.postion);
        this.cRef.detectChanges();
      }
      else {
        this.vioCount = 0;
      }

    }),
      (error) => {
        console.log(error)
      };
    console.log("postion", this.postion);
  }


  getOfflineViolationList() {
    this.userId = localStorage.getItem('user_id');
    console.log('getViolationList_1');
    this.vioCount = 0;
    this.dbservice.fetchViolationList(this.userId).pipe(finalize(() => {
     
    // this.loadMap();
     
    })).subscribe((data) => {
      console.log("Violation List", data);
      this.violationList = data;
      console.log("vioCount", this.violationList.length);
      if (this.violationList.length > 0) {

        this.vioCount = this.violationList.length;
        this.violationList.map((item) => {
          const splitval = item.fine_place.split(",");
          const objVal = {
            position: {
              lat: splitval[0],
              lng: splitval[1]
            },
            icon: {
              url: item.side_type == "1" ? '../../../../assets/icon/commercial.png' :
                item.side_type == "2" ? '../../../../assets/icon/individual.png' :
                  item.side_type == "3" ? '../../../../assets/icon/vehicle.png' : '',
              // size: {
              //   width: 24,
              //   height: 24
              // },
            }
          };
          if (splitval[0] != undefined && splitval[1] != undefined) {
            this.postion.push(objVal);
          }


        });
        //console.log("postion", this.postion);
        this.cRef.detectChanges();

      } else {
        this.vioCount = 0;
      }
    }),
      (error) => {
        console.log(error)
      };
    console.log("postion", this.postion);
  }


  loadMap() {
    this.goToMyLocation();
  }


  goToMyLocation() {
    //this.map.clear();
    let options = {
      timeout: 10000,
      enableHighAccuracy: true,
      maximumAge: 3600
    };
    this.geolocation.getCurrentPosition(options).then((position) => {

      this.map = GoogleMaps.create(document.getElementById("map_canvas"), {
        animate: {
          target: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          zoom: 17,
          tilt: 30
        }
      });


      // Get the location of you
      this.map.getMyLocation().then((location: MyLocation) => {
        console.log(JSON.stringify(location, null, 2));

        // Move the map camera to the location with animation
        this.map.animateCamera({
          target: location.latLng,
          zoom: 17,
          duration: 5000
        });

        //add a marker
        let marker: Marker = this.map.addMarkerSync({
          position: location.latLng,
          animation: GoogleMapsAnimation.BOUNCE
        });

      })
        .catch(err => {
          this.checkPermission();
        });
    }).catch(err => {
      this.checkPermission();
    });

  }

  loadMap1() {
    console.log("position", this.postion.length);

    if (this.postion.length === 0) {
      console.log("position objVal");
      const objVal = {
        position: {
          lat: 24.342501,
          lng: 51.711278,
        },
      }
      this.postion.push(objVal);
    }
    const POINTS: BaseArrayClass<any> = new BaseArrayClass<any>(

      this.postion
    );

    const bounds: ILatLng[] = POINTS.map((data: any, idx: number) => {
      console.log(data);
      return data.position;
    });

    this.map = GoogleMaps.create('map_canvas', {
      camera: {
        target: bounds,
        zoom: 17
      }
    });
    POINTS.forEach((data: any) => {
      data.disableAutoPan = true;
      const marker: Marker = this.map.addMarkerSync(data);
      marker.on(GoogleMapsEvent.MARKER_CLICK).subscribe(this.onMarkerClick),
        (error) => {
          console.log(error)
        };
      marker.on(GoogleMapsEvent.INFO_CLICK).subscribe(this.onMarkerClick),
        (error) => {
          console.log(error)
        };
    });

  }

  onMarkerClick(params: any) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const marker: Marker = <Marker>params[1];
    const iconData: any = marker.get('iconData');
    marker.setIcon(iconData);
  }

  ngOnDestroy() {
    this.subParams.unsubscribe();
  }

  
  ionViewWillLeave() {
  this.vioCount = 0;
  }

  

  async syncDataMasters() {
    this.loaderService.loadingPresentcm("Data Syncing. Please Wait...");

    if (localStorage.getItem('isOnline') === "true") {
      console.log('network connected!');
      await this.getVoilationTypeData();
      await this.getDocumentTypeData();
      await this.ListViolationCategories();
      await this.ListFineCodes();
      await this.ListAreas();
      await this.ListPlateCodes();
      await this.ListPlateSources();
      await this.ListPlateCategory();
      await this.ListReserved();
      this.loaderService.loadingDismiss();
    }
    else
    {
      this.loaderService.loadingDismiss();
    }

  }

  async getVoilationTypeData(): Promise<any> {
    console.log(this.sourceId,"dashboardsourrce");
    let payload = {
      "source_id": this.sourceId
    }
    return this.moduleService.getVoilationType(payload).subscribe((result: any) => {
      console.log(result.data);
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
    let payload ={
      "source_id": this.sourceId
    }
    return this.moduleService.getPlateCodeoffline(payload).subscribe((result: any) => {
      console.log(result,"platecodeofflineindashboard");
      this.dbservice.bulkInsertPlateCodes(result.data);
    }),
      (error) => {
        console.log(error)
      }
  }

  async ListPlateSources() {
    let payload = {
      "source_id" : this.sourceId
    }
    return this.moduleService.getPlateSource(payload).subscribe((result: any) => {
      this.dbservice.bulkInsertPlateSources(result.data);
    }),
      (error) => {
        console.log(error)
      }
  }

  async ListPlateCategory(){
    let payload ={
      "source_id": this.sourceId
    }
    console.log(payload,"platecategory");
    return this.moduleService.getPlateCategoryoffline(payload).subscribe((result : any)=>{
      this.dbservice.bulkInsertPlateCategory(result.data);
    }),
    (error) =>{
      console.log(error);
    }
  }

  async ListReserved() {
    let payload = {
      "source_id": this.sourceId
    }
    return this.moduleService.getReservedCode(payload).subscribe((result: any) => {
      console.log(result);
      this.dbservice.bulkInsertReserved(result.data);
    }),
      (error) => {
        console.log(error)
      }
  }

  async syncViolations() {
    //let documents: any = [];
    let violationIDs=[];

    let violations: any;
    if (localStorage.getItem('isOnline') === "true") {

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
        console.log(documents[i],":documentsssssss");
        //var file=new File([documents[i]],)
        formData.append("files", documents[i].blob, documents[i].filename);
      }

      this.httpClient.post<any>(environment.violationApiUrl + 'violationDocUpload', formData, { reportProgress: true, observe: 'events' })
        .subscribe((response: any) => {
          console.log("violation Doc Upload",response.body.data);
          if (response.type === HttpEventType['UploadProgress']) {
            const percentDone = Math.round(100 * response.loaded / response.total);
            this.percentDone = percentDone;
            if (this.percentDone === 100) {
              this.percentDone = this.percentDone + '%';
              setTimeout(() => {
                this.percentDone = "Completed...";
                // this.toastService.showSuccess('Video Uploaded', 'Message');
              }, 0)
            } else {
              // this.loaderService.loadingPresent();
              this.percentDone = this.percentDone + '%';
            }
            console.log(`File is ${percentDone}% uploaded.`);
          } else if (event instanceof HttpResponse) {
            console.log('File is completely uploaded!');
          }
        });

      /* End Violations Docs Sync */

      /* Start Sync Violations Code */
      await this.dbservice.getviolationList(this.sourceId).then(async (data) => {
        console.log("Violation", data);
        violations = data;
        if (data.length > 0) {
          console.log(data);
          await this.moduleService.violationCreation(data).subscribe((result: any) => {
            console.log(result,"syncviolation");
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
      this.httpClient.post<any>(environment.apiUrl + '/uploadmultipleamenddocs', formDataamenddocs, { reportProgress: true, observe: 'events' })
        .subscribe((response) => {
          if (response.type === HttpEventType['UploadProgress']) {
            const percentDone = Math.round(100 * response.loaded / response.total);
            this.percentDone = percentDone;
            if (this.percentDone === 100) {
              this.percentDone = this.percentDone + '%';
              setTimeout(() => {
                this.percentDone = "Completed...";
              }, 0)
            } else {
              this.percentDone = this.percentDone + '%';
            }
            console.log(`File is ${percentDone}% uploaded.`);
          } else if (event instanceof HttpResponse) {
            console.log('File is completely uploaded!');
          }
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
        formDataVideos.append("files", videos[i].blob, videos[i].filename);
      }
      this.httpClient.post<any>(environment.apiUrl + '/uploadofflineVideos', formDataVideos, { reportProgress: true, observe: 'events' })
        .subscribe((response) => {
          if (response.type === HttpEventType['UploadProgress']) {
            const percentDone = Math.round(100 * response.loaded / response.total);
            this.percentDone = percentDone;
            if (this.percentDone === 100) {
              this.percentDone = this.percentDone + '%';
              setTimeout(() => {
                this.percentDone = "Completed...";
              }, 0)
            } else {
              // this.loaderService.loadingPresent();
              this.percentDone = this.percentDone + '%';
            }
            console.log(`File is ${percentDone}% uploaded.`);
          } else if (event instanceof HttpResponse) {
            console.log('File is completely uploaded!');
          }
        });

      /* End Violations videos Sync */
      violationIDs.map((item) => {
        this.dbservice.DeleteAmendRequest(item).then((res:any)=>{
          console.log("amend record deleted");
        })

      })
      
    }
  }
  

  checkPermission() {
    this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION).then(
      result => {
        if (result.hasPermission) {
          this.enableGPS();
        } else {
          this.locationAccPermission();
        }
      },
      error => {
      }
    );
  }

  locationAccPermission() {
    
    this.locationAccuracy.canRequest().then((canRequest: boolean) => {
      if (canRequest) {
      } else {
        this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.ACCESS_COARSE_LOCATION)
          .then(
            () => {
              this.enableGPS();
            },
            error => {
            }
          );
      }
    });
  }

  enableGPS() {
    this.locationAccuracy.request(this.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY).then(
      () => {
        localStorage.setItem("locationserviceenabled","true");

      },
      error => localStorage.setItem("locationserviceenabled","false")
    );
  }

  toaddReport(){
    let navigationExtras: NavigationExtras = {
      state: {
        data:'',
        type:'add_report'
      }
    };
    this.router.navigate(['/add-report'], navigationExtras);
  }

  // toAssortReport(){

  //   const url = `${this.baseUrl}administrator/Dashboard/assorted_report/violations`
  //   this.iab.create(url, '_system');
  //   // this.externalBrowserService.openExternalUrl(`${this.baseUrl}administrator/Dashboard/assorted_report/violations`)
  // }

  toAssortReport() {

  const ssoToken = localStorage.getItem('ssoToken');

  if (!ssoToken) {
    console.error('SSO token not found');
    this.loginService.logout();
    return;
  }

  const url =
    `${this.baseUrl}sso/assortedReport?token=${encodeURIComponent(ssoToken)}`;

  this.httpobj.setHeader('*', 'Content-Type', 'application/json');
  this.httpobj.setHeader('*', 'Accept', 'application/json');

  from(this.httpobj.get(url, {}, {})).subscribe(
    (res: any) => {

      console.log('Assorted report SSO response:', res);

      // Parse response
      let response: any;

      try {
        response = res.data?.data
          ? JSON.parse(res.data.data)
          : typeof res.data === 'string'
            ? JSON.parse(res.data)
            : res.data;
      } catch (error) {
        console.error('Unable to parse SSO response', error);
        return;
      }

      console.log('Parsed response:', response);

      // SUCCESS
      if (
        response?.success === true &&
        response?.statusCode === 200 &&
        response?.redirectUrl
      ) {

        this.iab.create(
          response.redirectUrl,
          '_system'
        );

        return;
      }

      // TOKEN EXPIRED / UNAUTHORIZED
      if (
        response?.statusCode === 401 ||
        res?.status === 401
      ) {

        this.loginService.logout();
        return;
      }

      console.error(
        'Assorted report redirect failed:',
        response
      );
    },

    (err: any) => {

      console.error('Assorted report SSO API error:', err);

      // Native HTTP can return 401 through the error callback
      if (err?.status === 401) {
        this.loginService.logout();
        return;
      }

      // Sometimes the API response body contains statusCode: 401
      try {

        const errorResponse =
          typeof err?.error === 'string'
            ? JSON.parse(err.error)
            : err?.error;

        if (errorResponse?.statusCode === 401) {
          this.loginService.logout();
          return;
        }

      } catch (parseError) {
        console.error('Unable to parse error response', parseError);
      }
    }
  );
}

}
