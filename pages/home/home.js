const api = require("../../utils/api");

Page({
  data: { 
    keyword: "", 
    currentUser: null, 
    family: null,
    stats: { totalRecipes: 0, myRecipes: 0, todayRecipes: 0 },
    featuredRecipes: [],
    recipes: [],
    filteredRecipes: [], // 筛选后的食谱
    loading: false, 
    errorText: "",
    greeting: "",
    // 筛选条件
    showFilter: false,
    selectedTag: "",
    commonTags: ["家常", "快手", "下饭", "汤品", "甘甜", "健康"]
  },
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
      const greeting = this.getGreeting();
      this.setData({ 
        currentUser: data.currentUser, 
        family: data.family,
        stats: data.stats || { totalRecipes: 0, myRecipes: 0, todayRecipes: 0 },
        featuredRecipes: data.featuredRecipes || [],
        recipes: data.recipes,
        filteredRecipes: data.recipes,
        errorText: "",
        greeting
      });
      this.applyFilter();
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      if (showLoading) this.setData({ loading: false });
    }
  },
  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return "🌙 深夜好";
    if (hour < 9) return "🌅 早上好";
    if (hour < 12) return "☀️ 上午好";
    if (hour < 14) return "🍴 中午好";
    if (hour < 18) return "☀️ 下午好";
    if (hour < 22) return "🌆 晚上好";
    return "🌙 晚安";
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
  clearKeyword() { this.setData({ keyword: "", selectedTag: "" }, () => this.reload(true)); },
  
  // 筛选功能
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
    
    // 按标签筛选
    if (this.data.selectedTag) {
      filtered = filtered.filter(recipe => 
        recipe.tags && recipe.tags.includes(this.data.selectedTag)
      );
    }
    
    this.setData({ filteredRecipes: filtered });
  },
  
  goDetail(e) { wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + e.currentTarget.dataset.id }); },
  goCreate() { wx.navigateTo({ url: "/pages/recipe-edit/recipe-edit" }); },
  goAI() { wx.switchTab({ url: "/pages/tools/tools" }); },
  goMyRecipes() { wx.switchTab({ url: "/pages/my-recipes/my-recipes" }); },
  goFeatured(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + id });
  },
  randomRecipe() {
    if (!this.data.recipes || this.data.recipes.length === 0) {
      return wx.showToast({ title: "还没有食谱哦", icon: "none" });
    }
    const random = this.data.recipes[Math.floor(Math.random() * this.data.recipes.length)];
    wx.navigateTo({ url: "/pages/recipe-detail/recipe-detail?id=" + random.id });
  }
});
