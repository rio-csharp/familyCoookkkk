const api = require("../../utils/api");

Page({
  data: { keyword: "", recipes: [], loading: false, errorText: "" },
  async onShow() {
    const session = await api.getSession().catch(() => ({ isLoggedIn: false }));
    if (!session.isLoggedIn) {
      wx.reLaunch({ url: "/pages/login/login" });
      return;
    }
    await this.reload(true);
  },
  async reload(showLoading) {
    if (showLoading) this.setData({ loading: true, errorText: "" });
    try {
      const data = await api.getCommunityData(this.data.keyword);
      this.setData({ recipes: data.recipes || [], errorText: "" });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      if (showLoading) this.setData({ loading: false });
    }
  },
  onInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.reload(true); },
  clearKeyword() { this.setData({ keyword: "" }, () => this.reload(true)); },
  goDetail(e) { wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + e.currentTarget.dataset.id }); }
});
