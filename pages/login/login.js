const api = require("../../utils/api");

Page({
  data: {
    nickname: "",
    phone: "",
    pin: "",
    inviteCode: "",
    loading: false
  },
  onShow() {
    api.getSession().then((res) => {
      if (res.isLoggedIn) wx.reLaunch({ url: "/pages/home/home" });
    }).catch(() => {});
  },
  onInput(e) {
    this.setData({ [e.currentTarget.dataset.f]: e.detail.value });
  },
  async onPhoneLogin() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      await api.loginByPhone(this.data.phone.trim(), this.data.pin.trim(), this.data.nickname.trim());
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (e) {
      wx.showToast({ title: e.message || "登录失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async onRegister() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      await api.registerByPhone(
        this.data.nickname.trim(),
        this.data.phone.trim(),
        this.data.pin.trim(),
        this.data.inviteCode.trim()
      );
      wx.reLaunch({ url: "/pages/home/home" });
    } catch (e) {
      wx.showToast({ title: e.message || "登录失败", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  }
});
