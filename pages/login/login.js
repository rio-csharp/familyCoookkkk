const api = require("../../utils/api");

Page({
  data: {
    nickname: ""
  },
  onShow() {
    api.getSession().then((res) => {
      if (res.isLoggedIn) wx.reLaunch({ url: "/pages/home/home" });
    }).catch(() => {});
  },
  onInput(e) {
    this.setData({ nickname: e.detail.value });
  },
  async onLogin() {
    try {
      await api.login(this.data.nickname.trim());
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (e) {
      wx.showToast({ title: e.message || "登录失败", icon: "none" });
    }
  }
});
