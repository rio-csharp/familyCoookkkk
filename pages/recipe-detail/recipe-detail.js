const api = require("../../utils/api");

Page({
  data: { id: "", recipe: null, comment: "", loading: false, errorText: "", submitting: false },
  onLoad(opt) { this.setData({ id: opt.id || "" }); },
  async onShow() { await this.reload(true); },
  async reload(showLoading) {
    if (showLoading) this.setData({ loading: true, errorText: "" });
    try {
      this.setData({ recipe: await api.getRecipeDetail(this.data.id), errorText: "" });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      if (showLoading) this.setData({ loading: false });
    }
  },
  async like() { await api.toggleLike(this.data.id); await this.reload(false); },
  async favorite() { await api.toggleFavorite(this.data.id); await this.reload(false); },
  onInput(e) { this.setData({ comment: e.detail.value }); },
  async submitComment() {
    const text = this.data.comment.trim();
    if (!text) return wx.showToast({ title: "请输入评论", icon: "none" });
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      await api.addComment(this.data.id, text);
      this.setData({ comment: "" });
      await this.reload(false);
      wx.showToast({ title: "发布成功", icon: "success" });
    } finally {
      this.setData({ submitting: false });
    }
  },
  editRecipe() { wx.navigateTo({ url: "/pages/recipe-edit/recipe-edit?id=" + this.data.id }); },
  deleteRecipe() {
    wx.showModal({
      title: "确认删除",
      content: "删除后不可恢复",
      success: async (res) => {
        if (!res.confirm) return;
        await api.deleteRecipe(this.data.id);
        wx.navigateBack();
      }
    });
  }
});
