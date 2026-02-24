const api = require("../../utils/api");

Page({
  data: { id: "", recipe: null, comment: "" },
  onLoad(opt) { this.setData({ id: opt.id || "" }); },
  async onShow() { await this.reload(); },
  async reload() { this.setData({ recipe: await api.getRecipeDetail(this.data.id) }); },
  async like() { await api.toggleLike(this.data.id); await this.reload(); },
  async favorite() { await api.toggleFavorite(this.data.id); await this.reload(); },
  onInput(e) { this.setData({ comment: e.detail.value }); },
  async submitComment() {
    const text = this.data.comment.trim();
    if (!text) return wx.showToast({ title: "请输入评论", icon: "none" });
    await api.addComment(this.data.id, text);
    this.setData({ comment: "" });
    await this.reload();
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
