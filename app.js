App({
  globalData: {
    cloudEnvId: "cloud1-0g6g08sfb912fa85"
  },
  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({ title: "提示", content: "基础库版本过低，请升级微信后重试。", showCancel: false });
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnvId,
      traceUser: true
    });
    wx.cloud.callFunction({
      name: "api",
      data: { action: "init", data: {} }
    }).catch(() => {});
  }
});
