const api = require("../../utils/api");

Page({
  data: {
    keyword: "",
    recipes: [],
    filteredRecipes: [],
    hotRecipes: [],
    loading: false,
    errorText: "",
    showFilter: false,
    selectedTag: "",
    commonTags: ["家常", "快手", "下饭", "汤品", "甘甜", "健康"],
    swiperCurrent: 0
  },
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
      const [data, hotData] = await Promise.all([
        api.getCommunityData(this.data.keyword),
        api.getHotRecipes()
      ]);
      this.setData({
        recipes: data.recipes || [],
        filteredRecipes: data.recipes || [],
        hotRecipes: hotData.hotRecipes || [],
        errorText: ""
      });
      this.applyFilter();
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      if (showLoading) this.setData({ loading: false });
    }
  },
  onInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.reload(true); },
  clearKeyword() { this.setData({ keyword: "", selectedTag: "" }, () => this.reload(true)); },

  toggleFilter() {
    this.setData({ showFilter: !this.data.showFilter });
  },

  selectTag(e) {
    const tag = e.currentTarget.dataset.tag;
    const newTag = this.data.selectedTag === tag ? "" : tag;
    this.setData({ selectedTag: newTag }, () => {
      this.applyFilter();
    });
  },

  applyFilter() {
    let filtered = this.data.recipes;

    if (this.data.selectedTag) {
      filtered = filtered.filter(recipe =>
        recipe.tags && recipe.tags.includes(this.data.selectedTag)
      );
    }

    this.setData({ filteredRecipes: filtered });
  },

  goDetail(e) { wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + e.currentTarget.dataset.id }); },

  // 轮播图事件
  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current });
  },

  onHotDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + id });
  }
});
