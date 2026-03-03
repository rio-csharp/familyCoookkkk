const api = require("../../utils/api");

Page({
  data: {
    loading: false,
    errorText: "",
    recipes: []
  },

  async onLoad() {
    await this.loadRecipes();
  },

  async onShow() {
    // 每次显示页面都重新加载，确保数据最新
    await this.loadRecipes();
  },

  async loadRecipes() {
    this.setData({ loading: true, errorText: "" });
    try {
      // 获取当前用户的 ID
      const session = await api.getSession();
      const myId = session.user.id;

      // 调用云函数获取所有菜谱
      const res = await api.listRecipes();
      const allRecipes = (res && res.list) || [];

      // 筛选出我发布的菜谱
      const myRecipes = allRecipes
        .filter(recipe => recipe.authorId === myId)
        .map(recipe => ({
          id: recipe.id,
          title: recipe.title,
          description: recipe.description || "",
          coverUrl: recipe.coverUrl || "",
          createTime: this.formatDate(recipe.createdAt),
          viewCount: recipe.viewCount || 0
        }));

      this.setData({
        recipes: myRecipes,
        errorText: ""
      });
    } catch (e) {
      console.error("加载菜谱失败:", e);
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },

  formatDate(timestamp) {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    // 一天内显示时间
    if (diff < 86400000) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    // 一年内显示日期
    if (diff < 31536000000) {
      return `${date.getMonth() + 1}/${date.getDate()}`;
    }
    // 超过一年显示完整日期
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  },

  viewRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe-detail/recipe-detail?id=${id}`
    });
  },

  editRecipe(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/recipe-edit/recipe-edit?id=${id}`
    });
  },

  deleteRecipe(e) {
    const id = e.currentTarget.dataset.id;
    const recipe = this.data.recipes.find(r => r.id === id);

    wx.showModal({
      title: "确认删除",
      content: `确定要删除菜谱"${recipe.title}"吗？此操作不可恢复。`,
      confirmColor: "#EF4444",
      success: async (res) => {
        if (!res.confirm) return;

        wx.showLoading({ title: "删除中..." });
        try {
          await api.deleteRecipe(id);
          wx.showToast({ title: "删除成功", icon: "success" });
          await this.loadRecipes();
        } catch (e) {
          wx.showToast({ title: "删除失败：" + (e.message || ""), icon: "none" });
        } finally {
          wx.hideLoading();
        }
      }
    });
  },

  goCreateRecipe() {
    wx.navigateTo({
      url: "/pages/recipe-edit/recipe-edit"
    });
  }
});
