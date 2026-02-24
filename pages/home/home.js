const api = require("../../utils/api");

Page({
  data: { keyword: "", currentUser: null, recipes: [] },
  watcher: null,
  async onShow() {
    const session = await api.getSession().catch(() => ({ isLoggedIn: false }));
    if (!session.isLoggedIn) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    await this.reload();
    this.startWatch();
  },
  onHide() { this.stopWatch(); },
  onUnload() { this.stopWatch(); },
  async reload() {
    const data = await api.getHomeData(this.data.keyword);
    this.setData({ currentUser: data.currentUser, recipes: data.recipes });
  },
  startWatch() {
    if (this.watcher) return;
    this.watcher = api.watchState(() => this.reload(), () => {});
  },
  stopWatch() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  },
  onInput(e) { this.setData({ keyword: e.detail.value }); },
  async onSearch() { await this.reload(); },
  clearKeyword() { this.setData({ keyword: "" }, () => this.reload()); },
  goDetail(e) { wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + e.currentTarget.dataset.id }); },
  goCreate() { wx.navigateTo({ url: "/pages/recipe-edit/recipe-edit" }); },
  goFamily() { wx.navigateTo({ url: "/pages/family/family" }); },
  goProfile() { wx.navigateTo({ url: "/pages/profile/profile" }); },
  goTools() { wx.navigateTo({ url: "/pages/tools/tools" }); }
});
