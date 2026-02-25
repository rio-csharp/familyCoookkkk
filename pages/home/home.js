const api = require("../../utils/api");

Page({
  data: { keyword: "", currentUser: null, recipes: [], loading: false, errorText: "" },
  watcher: null,
  async onShow() {
    const session = await api.getSession().catch(() => ({ isLoggedIn: false }));
    if (!session.isLoggedIn) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    await this.reload(true);
    this.startWatch();
  },
  onHide() { this.stopWatch(); },
  onUnload() { this.stopWatch(); },
  async reload(showLoading) {
    if (showLoading) this.setData({ loading: true, errorText: "" });
    try {
      const data = await api.getHomeData(this.data.keyword);
      this.setData({ currentUser: data.currentUser, recipes: data.recipes, errorText: "" });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      if (showLoading) this.setData({ loading: false });
    }
  },
  startWatch() {
    if (this.watcher) return;
    this.watcher = api.watchState(() => this.reload(false), () => this.setData({ errorText: "实时同步失败，请手动刷新" }));
  },
  stopWatch() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  },
  onInput(e) { this.setData({ keyword: e.detail.value }); },
  async onSearch() { await this.reload(true); },
  clearKeyword() { this.setData({ keyword: "" }, () => this.reload(true)); },
  goDetail(e) { wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + e.currentTarget.dataset.id }); },
  goCreate() { wx.navigateTo({ url: "/pages/recipe-edit/recipe-edit" }); }
});
