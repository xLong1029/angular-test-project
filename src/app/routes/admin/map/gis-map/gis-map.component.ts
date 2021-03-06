import { Component, OnInit, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { ModalHelper } from '@delon/theme';

// component
import { GisWellResDetailComponent } from './well-res-detail/well-res-detail.component';
import { GisChargingResDetailComponent } from './charging-res-detail/charging-res-detail.component';
import { GisWaterResDetailComponent } from './water-res-detail/water-res-detail.component';
import { GisResDetailComponent } from './res-detail/res-detail.component';
// enum
import { MonitorTypeEnum } from '@shared/enum/monitor-type.enum';
// service
import { MapService } from '../map.service';
// ts
import { MapLightSplitList } from '@common/mapLightSplitList';
import { Page } from '@common/page';

/**
 * 地图视图枚举
 */
enum MapViewEnum {
  // 未选择任何视图
  null = 0,
  // 显示所有资源（聚点数据）
  lightLite = 1,
  // 聚合视图
  cluster = 2,
}

@Component({
  selector: 'app-gis-map',
  templateUrl: './gis-map.component.html',
  styleUrls: [`gis-map.component.less`],
})
export class GisMapComponent implements OnInit, AfterViewInit {
  // 视图枚举
  viewEnum = MapViewEnum;
  // 当前视图
  currentView = this.viewEnum.null;

  // 页面高度适配
  pageH: any = "auto";

  // 地图实例
  map: any = null;
  // 地图扩展库实例
  // mapV: any;
  // 地图样式
  mapStyle = [
    // 修改道路中间的线条
    {
      featureType: 'all',
      elementType: 'all',
      stylers: {
        color: '#1d1778',
      },
    },
    // 道路
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: {
        color: '#100e5eff',
      },
    },
    // 背景
    {
      featureType: 'background',
      elementType: 'all',
      stylers: {
        color: '#1b196aff',
      },
    },
    // 文本描边
    {
      featureType: 'all',
      elementType: 'labels.text.stroke',
      stylers: {
        color: '#110f60ff',
      },
    },
    // 文本填充
    {
      featureType: 'all',
      elementType: 'labels.text.fill',
      stylers: {
        color: '#8684dbff',
      },
    },
    // 人造区域
    {
      featureType: 'manmade',
      elementType: 'all',
      stylers: {
        color: '#252374ff',
      },
    },
    // 隐藏兴趣点
    {
      featureType: 'poilabel',
      elementType: 'labels.icon',
      stylers: {
        visibility: 'off',
      },
    },
    // 隐藏地铁
    {
      featureType: 'subway',
      elementType: 'all',
      stylers: {
        visibility: 'off',
      },
    },
    // 隐藏高速路图标
    {
      featureType: "highway",
      elementType: "labels.icon",
      stylers: {
        visibility: "off"
      }
    }
  ];

  // 资源标记Markers
  resMarkers: any = [];

  // 加载
  loading = false;

  // 监控类型
  monitorType = MonitorTypeEnum;

  // 资源列表弹窗可见性
  resListVisible: any = false;

  // 资源详情侧边栏可见性
  resDetailVisible: any = false;

  // 当前选中资源
  currentSelectRes: any = {};

  // 页码
  page = new Page();

  // 资源坐标点集合
  groupPoints = [];

  // 获取资源聚点的配置
  lightLiteList = [];
  lightLiteCount = 0;
  // 聚点图层
  lightLiteLayer = null;
  // 显示资源聚点图层
  showLightLiteLayer = false;
  // 聚点选项
  lightOptions = MapLightSplitList;

  // 获取聚合点的配置
  pointClusterList = [];
  pointClusterCount = 0;
  // 聚合视图图层
  pointClusterLayer = null;

  constructor(private change: ChangeDetectorRef, private modal: ModalHelper, public service: MapService, ) { }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.initPage();
    this.initMap();
  }

  // 初始化内容页面
  initPage() {
    let headerH = 64;
    let docH = document.body.clientHeight;
    this.pageH = docH - headerH;
    // 强迫式变更检测，解决ExpressionChangedAfterItHasBeenCheckedError报错问题
    this.change.detectChanges();
  }

  // 初始化地图
  initMap() {
    this.map = new BMap.Map('bmap', { enableMapClick: false });
    this.map.enableScrollWheelZoom(true);
    this.map.addControl(new BMap.ScaleControl());
    // 配置地图样式
    this.map.setMapStyle({ styleJson: this.mapStyle });

    this.initMapView();
    // this.map.setMapStyle({ style: 'midnight' }); // 这个栅格显示有BUG
  }

  // 初始化地图视野
  initMapView() {
    let point = new BMap.Point(108.297233556, 22.8064929356);
    this.map.centerAndZoom(point, 7);
  }

  // 显示聚合视图
  showPointCluster() {
    this.clearMap();
    this.loading = true;
    this.page.page = 1;
    this.currentView = this.viewEnum.cluster;
    this.getPointClusterData();
  }

  // 获取聚合视图坐标点
  getPointClusterData() {
    this.service.GetResourcesPoints(this.page.page, this.page.pageSize).subscribe((res: any) => {
      if (res.code === 200) {
        console.log(
          `返回第${this.page.page}段获取到的数据，已获取${res.data.length}条数据`,
        );
        this.pointClusterCount = res.page.total;
        this.pointClusterDataFormat(res.data);

        // 如果还有后续数据，继续加载
        if (this.pointClusterCount > this.pointClusterList.length) {
          this.page.page++;
          this.getPointClusterData();
        } else {
          this.loading = false;
          console.log(
            `完成所有数据请求(共${this.pointClusterList.length}条数据)，开始创建地图图层`,
          );

          // 根据分组分布坐标设置地图视野
          this.pointClusterCreateLayer(this.pointClusterList);
          this.map.setViewport(this.groupPoints, { enableAnimation: false });
        }
      }
    });
  }

  // 资源聚合数据格式化
  pointClusterDataFormat(data) {
    // 批量标记
    data.forEach(obj => {
      this.pointClusterList.push({
        geometry: {
          type: 'Point',
          coordinates: [obj.lng, obj.lat],
        },
        count: 1,
      });

      // 保存坐标点
      const point = new BMap.Point(obj.lng, obj.lat);
      this.groupPoints.push(point);
    });
  }

  // 生成聚合视图
  pointClusterCreateLayer(data) {
    this.map.clearOverlays();

    const dataSet = new mapv.DataSet(data);

    // 配置参考：https://github.com/huiyan-fe/mapv/blob/master/src/map/baidu-map/Layer.md
    // 示例：https://mapv.baidu.com/examples/#baidu-map-point-cluster.html
    this.pointClusterLayer = new mapv.baiduMapLayer(this.map, dataSet, {
      fillStyle: '#ff9712', // 非聚合点填充颜色      
      strokeStyle: '#000000', // 边框颜色
      lineWidth: 5, // 描边宽度
      size: 6, // 非聚合点的半径
      minSize: 20, // 聚合点最小半径
      maxSize: 50, // 聚合点最大半径
      globalAlpha: 0.8, // 透明度
      clusterRadius: 150, // 聚合像素半径
      maxZoom: 19, // 最大显示级别
      label: { // 聚合文本样式
        show: true,
        fillStyle: '#fff',
        font: '18px Arial',
      },
      gradient: { 0: "#2db7f5", 0.5: '#a0d911', 1.0: "#ff9712"}, // 聚合图标渐变色
      draw: 'cluster'
    });

    this.loading = false;
  }

  // 清理聚合视图
  clearPointCluster() {
    if (this.pointClusterLayer) {
      this.pointClusterLayer.destroy();
      this.pointClusterLayer = null;
    }
    
    this.pointClusterList = [];
    this.pointClusterCount = 0;
  }

  // 显示所有资源（聚点）
  showLightLite() {
    this.clearMap();
    this.loading = true;
    this.page.page = 1;
    this.currentView = this.viewEnum.lightLite;
    this.getLightLiteData();
  }

  // 获取资源坐标点
  getLightLiteData() {
    this.service.GetLightResPoints(this.page.page, this.page.pageSize).subscribe((res: any) => {
      if (res.code === 200) {
        console.log(
          `返回第${this.page.page}段获取到的数据，已获取${res.data.length}条数据`,
        );
        this.lightLiteCount = res.page.total;
        this.lightLiteDataFormat(res.data);

        // 如果还有后续数据，继续加载
        if (this.lightLiteCount > this.lightLiteList.length) {
          this.page.page++;
          this.getLightLiteData();
        } else {
          this.loading = false;
          console.log(
            `完成所有数据请求(共${this.lightLiteList.length}条数据)，开始创建地图图层`,
          );

          // 根据分组分布坐标设置地图视野
          this.lightLiteCreateLayer(this.lightLiteList);
          this.map.setViewport(this.groupPoints, { enableAnimation: false });
        }
      }
    });
  }

  // 资源聚点数据格式化
  lightLiteDataFormat(data) {
    // 批量标记
    data.forEach(obj => {
      this.lightLiteList.push({
        geometry: {
          type: 'Point',
          coordinates: [obj.lng, obj.lat],
        },
        count: obj.lampInfo.brightness1,
        // count: 105, // 测试用，实际需要修改
      });

      // 保存坐标点
      const point = new BMap.Point(obj.lng, obj.lat);
      this.groupPoints.push(point);
    });
  }

  // 生成资源聚点图层
  lightLiteCreateLayer(data) {
    this.map.clearOverlays();

    const dataSet = new mapv.DataSet(data);

    this.lightLiteLayer = new mapv.baiduMapLayer(this.map, dataSet, {
      size: 6,
      zIndex: 10,
      splitList: this.lightOptions,
      max: 30,
      draw: 'choropleth',
    });

    this.showLightLiteLayer = true;
    this.loading = false;
  }

  // 重置资源聚点
  clearLightLite() {
    if (this.lightLiteLayer) {
      this.lightLiteLayer.destroy();
    }
    this.showLightLiteLayer = false;
    this.lightLiteLayer = null;
    this.lightLiteList = [];
    this.lightLiteCount = 0;
  }

  // 筛选资源聚点
  filterLightLite(start, end) {
    const filterList = this.lightLiteList.filter(item => item.count >= start && item.count < end);

    this.lightLiteCreateLayer(filterList);
  }

  // 重置地图
  resetMap() {
    this.clearMap();
    this.initMapView();
  }

  // 清理地图
  clearMap() {
    this.groupPoints = [];

    // 关闭在地图上打开的信息窗口
    if (this.map.getInfoWindow()) {
      this.map.closeInfoWindow();
    }
    this.map.clearOverlays();    // 清除地图上所有覆盖物

    this.clearPointCluster();
    this.clearLightLite();
    this.clearMarkers();
  }

  // 清除Markers
  clearMarkers() {
    this.resMarkers.forEach(
      f => {
        this.map.removeOverlay(f);
      }
    );
  }

  // 资源列表可见性
  setResListVisible(val: boolean) {
    this.resListVisible = val;
  }

  // 资源详情可见性
  setResDetailVisible(val: boolean) {
    this.resDetailVisible = val;
  }

  // 获取监控资源
  getLocateRes(res) {
    this.clearMap();
    this.showLightLiteLayer = false;

    // 关闭资源列表弹窗
    this.setResListVisible(false);

    // 显示监控资源资源
    let p = new BMap.Point(res.lng, res.lat);
    this.createResIcon(p, res);
    this.map.setViewport([p]);
    this.map.centerAndZoom(p, 19);
  }

  /**
   * 生成监控资源坐标
   * @param point 坐标点
   * @param element 对象
   */
  createResIcon(point, element) {
    let _this = this;

    function ComplexCustomOverlay(point) {
      this._point = point;
    }

    ComplexCustomOverlay.prototype = new BMap.Overlay();
    ComplexCustomOverlay.prototype.initialize = function (bmap) {
      this.map = bmap;
      let div = (this._div = document.createElement('div'));
      let arrow = (this._arrow = document.createElement('div'));

      return _this.setMonitorResOverlay(point, element, bmap, div, arrow);
    };
    ComplexCustomOverlay.prototype.draw = function () {
      let map = this.map;
      let pixel = map.pointToOverlayPixel(this._point);

      this._div.style.left = pixel.x - 10 + 'px';
      this._div.style.top = pixel.y - 40 + 'px';
    };

    let myCompOverlay = new ComplexCustomOverlay(point);
    this.resMarkers.push(myCompOverlay);
    this.map.addOverlay(myCompOverlay);

    // 附近资源
    this.setNearbyResLine(point, element, 1);
    this.setNearbyResLine(point, element, 2);
    this.setNearbyResLine(point, element, 3);
  }

  /**
   * 设置监控资源信息弹窗
   * @param point 坐标点
   * @param element 对象
   * @param bmap 地图
   * @param div 信息框div
   * @param arrow 信息框箭头
   */
  setMonitorResOverlay(point, element, bmap, div, arrow) {
    div.style.position = 'absolute';
    // 默认情况下，纬度较低的标注会覆盖在纬度较高的标注之上，从而形成一种立体效果。通过此方法使某个标注覆盖在其他标注之上
    // div.style.zIndex = BMap.Overlay.getZIndex(this._point.lat);
    div.style.zIndex = BMap.Overlay.getZIndex(1);

    arrow.className = '_MapIcon';
    arrow.style.position = 'relative';

    let centerimg = document.createElement('img');
    centerimg.style.width = '22px';
    centerimg.style.height = '40px';
    centerimg.src = './assets/images/map/icon-pole.png';
    arrow.append(centerimg);
    div.appendChild(arrow);

    bmap.getPanes().labelPane.appendChild(div);

    div.onclick = () => {
      if (element.hasLampControl || element.hasMeteorologicalEnv) {
        this.resDetailVisible = true;
      }

      this.currentSelectRes = element;

      let opts = {
        width: 455, // 信息窗口宽度
        height: 260, // 信息窗口高度
        // title: "信息窗口", // 信息窗口标题
        enableMessage: true, //设置允许信息窗发送短息
      };
      if (element.siteName.length > 21) {
        opts.height = 280;
      }
      let content = `
        <div class="locate-title">${element.siteName}</div>
        <div class="locate-info">
          <div class="locate-info__left">
            <p>站址编码：${element.siteCode}</p>
            <p>站址名称：${element.siteName}</p>
            <p>经度：${element.lng} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 纬度：${element.lat}</p>
            <p>详细地址：${element.address}</p>
          </div>
          <div class="locate-info__right">
            <img src="assets/images/map/lamp.jpg"/>
            <div>站地址实景</div>
          </div>
        </div>
        <div class="locate-attr">
        <span style="min-width:45px">功能：</span><div class="locate-icon-wrapper">`;

      content += `<div class="locate-icon" id="meteorologicalEnvBtn">
            <img class="locate-icon__img" src="assets/images/map/img-env${element.hasMeteorologicalEnv ? "" : "-disable"}.png"/>
            <span class="locate-icon__name ${ element.hasMeteorologicalEnv ? 'enable' : ''}">环境监测</span>
          </div>
          `
      content += `<div class="locate-icon" id="lampControlBtn">
          <img class="locate-icon__img" src="assets/images/map/img-light-control${element.hasLampControl ? "" : "-disable"}.png"/>
          <span class="locate-icon__name ${ element.hasLampControl ? 'enable' : ''}">灯杆控制</span>
        </div>
        `
      content += `</div></div>`;

      let infoWindow = new BMap.InfoWindow(content, opts);
      // 禁用点击地图时关闭信息窗口
      infoWindow.disableCloseOnClick();
      //点击信息窗口的关闭按钮时触发此事件
      infoWindow.addEventListener("close", () => {
        this.resDetailVisible = false;
      });
      bmap.openInfoWindow(infoWindow, point); //开启信息窗口

      // 打开信息窗口加载“功能”按钮点击事件
      setTimeout(() => {
        this.setResDetailVisible(true);
      }, 100);
    };

    return div;
  }

  /**
   * 生成附近资源标记
   * 
   * @param point 坐标点
   * @param element 对象
   * @param type 1 井盖 2 智能换电 3 水力资源
   */
  createNearbyResIcon(point, element, type) {
    let _this = this;

    function ComplexCustomOverlay(point) {
      this._point = point;
    }

    ComplexCustomOverlay.prototype = new BMap.Overlay();
    ComplexCustomOverlay.prototype.initialize = function (bmap) {
      this.map = bmap;
      let div = (this._div = document.createElement('div'));
      let arrow = (this._arrow = document.createElement('div'));

      div.style.position = 'absolute';
      // 默认情况下，纬度较低的标注会覆盖在纬度较高的标注之上，从而形成一种立体效果。通过此方法使某个标注覆盖在其他标注之上
      // div.style.zIndex = BMap.Overlay.getZIndex(this._point.lat);
      div.style.zIndex = BMap.Overlay.getZIndex(1);

      arrow.className = '_MapIcon';
      arrow.style.position = 'relative';

      let centerimg = document.createElement('img');
      centerimg.style.width = '22px';
      centerimg.style.height = '40px';

      let imgUrl: any = "";
      switch (type) {
        case 1:
          imgUrl = `./assets/images/map/${element.status === 1 ? "icon-well-open" : "icon-well-close"}.png`;
          break;
        case 2:
          imgUrl = `./assets/images/map/icon-charge.png`;
          break;
        case 3:
          imgUrl = `./assets/images/map/icon-water-res.png`;
          break;
        default: console.log("type is error");
      }

      centerimg.src = imgUrl;
      arrow.append(centerimg);
      div.appendChild(arrow);

      bmap.getPanes().labelPane.appendChild(div);

      div.onclick = () => {
        _this.showNearbyResDetail(true, element, type);
      };

      return div;
    };
    ComplexCustomOverlay.prototype.draw = function () {
      let map = this.map;
      let pixel = map.pointToOverlayPixel(this._point);

      this._div.style.left = pixel.x - 10 + 'px';
      this._div.style.top = pixel.y - 20 + 'px';
    };

    let myCompOverlay = new ComplexCustomOverlay(point);
    this.resMarkers.push(myCompOverlay);
    this.map.addOverlay(myCompOverlay);
  }

  /**
   * 设置附近资源连线
   * 
   * @param point 坐标点
   * @param element 对象
   * @param type 1 井盖 2 智能换电 3 水力资源
   */
  setNearbyResLine(point, element, type) {
    let linePoints: any = [];
    let resources: any = null;
    let strokeColor: any = "";

    switch (type) {
      case 1:
        resources = element.wellCoverResources;
        strokeColor = "#2aa515";
        break;
      case 2:
        resources = element.batteryCabinets;
        strokeColor = "#e16631";
        break;
      case 3:
        resources = element.waterResources;
        strokeColor = "#e16631";
        break;
      default: console.log("type is error");
    }

    if (resources && resources.length) {
      resources.forEach((e) => {
        linePoints.push(new BMap.Point(element.lng, element.lat));
        linePoints.push(new BMap.Point(e.lng, e.lat));
        let p = new BMap.Point(e.lng, e.lat);
        this.createNearbyResIcon(p, e, type);
      });

      // 添加连线
      var polyline = new BMap.Polyline(linePoints, { strokeColor, strokeWeight: 1, strokeStyle: "dashed", strokeOpacity: 0.8 });
      this.map.addOverlay(polyline);
    }
  }

  /**
   * 查看附近资源详情
   * 
   * @param visible 可见性
   * @param resource 资源对象
   * @param type 1 井盖 2 智能换电 3 水力资源
   */
  showNearbyResDetail(visible: boolean, resource: any, type: number) {
    if (visible) {
      this.resDetailVisible = false;

      switch (type) {
        case 1:
          this.modal.static(GisWellResDetailComponent, { resource }, 600).subscribe((res: any) => { });
          break;
        case 2:
          this.modal.static(GisChargingResDetailComponent, { resource }, 600).subscribe((res: any) => { });
          break;
        case 3:
          this.modal.static(GisWaterResDetailComponent, { resource }, 800).subscribe((res: any) => { });
          break;
        default: console.log("type is error");
      }
    }
  }
}