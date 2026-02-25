App({
  globalData: {
    cloudEnvId: ""
  },
  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({ title: "提示", content: "基础库版本过低，请升级微信后重试。", showCancel: false });
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnvId || wx.cloud.DYNAMIC_CURRENT_ENV,
      traceUser: true
    });
    wx.cloud.callFunction({
      name: "api",
      data: { action: "init", data: {} }
    }).catch(() => {});
  }
});
