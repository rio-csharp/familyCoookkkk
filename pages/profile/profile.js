const api = require("../../utils/api");

Page({
  data: { users: [], currentUserId: "", newUser: "" },
  async onShow() { await this.reload(); },
  async reload() {
    const d = await api.getUsers();
    this.setData({ users: d.users, currentUserId: d.currentUserId });
  },
  onInput(e) { this.setData({ newUser: e.detail.value }); },
  async switchUser(e) {
    await api.switchUser(e.currentTarget.dataset.id);
    await this.reload();
  },
  async addUser() {
    const v = this.data.newUser.trim();
    if (!v) return wx.showToast({ title: "请输入用户名", icon: "none" });
    await api.addUser(v, "成员", false);
    this.setData({ newUser: "" });
    await this.reload();
  },
  async logout() {
    await api.logout();
    wx.reLaunch({ url: "/pages/login/login" });
  }
});
