const api = require("../../utils/api");

Page({
  data: {
    shoppingList: [],
    newItem: "",
    timerValue: "20",
    timerUnit: "min",
    remain: 0,
    timerText: "00:00",
    randomText: "",
    loading: false,
    errorText: "",
    busy: false,
    showRecommend: false,
    recommendIngredients: "",
    recommendList: [],
    recommendLoading: false,
    cloudTestResult: "",
    recipeResult: "",
    aiTestResult: ""
  },
  timer: null,
  async onShow() { await this.reload(); },
  onUnload() { this.stopTimer(); },
  async reload() {
    this.setData({ loading: true, errorText: "" });
    try {
      const tools = await api.getTools();
      this.setData({ shoppingList: tools.shoppingList || [], errorText: "" });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
  selectUnit(e) {
    this.setData({ timerUnit: e.currentTarget.dataset.unit });
  },
  async addItem() {
    if (this.data.busy) return;
    const v = this.data.newItem.trim();
    if (!v) return;
    this.setData({ busy: true });
    try {
      await api.addShoppingItem(v);
      this.setData({ newItem: "" });
      await this.reload();
    } finally {
      this.setData({ busy: false });
    }
  },
  async removeItem(e) {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      await api.removeShoppingItem(Number(e.currentTarget.dataset.i));
      await this.reload();
    } finally {
      this.setData({ busy: false });
    }
  },
  startTimer() {
    const value = Number(this.data.timerValue);
    if (!value || value <= 0) return wx.showToast({ title: "请输入时间", icon: "none" });
    this.stopTimer();
    let sec = this.data.timerUnit === "min" ? value * 60 : value * 3600;
    this.setData({ remain: sec, timerText: this.formatTime(sec) });
    this.timer = setInterval(() => {
      sec -= 1;
      if (sec <= 0) {
        this.stopTimer();
        this.setData({ remain: 0, timerText: "00:00" });
        wx.showToast({ title: "计时结束", icon: "success" });
        return;
      }
      this.setData({ remain: sec, timerText: this.formatTime(sec) });
    }, 1000);
  },
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },
  async randomRecipe() {
    const data = await api.getHomeData("");
    const list = data.recipes || [];
    if (!list.length) return this.setData({ randomText: "暂无食谱" });
    const one = list[Math.floor(Math.random() * list.length)];
    this.setData({ randomText: "今日推荐：" + one.title });
  },
  toggleRecommendPanel() {
    this.setData({ showRecommend: !this.data.showRecommend, recommendList: [], recommendIngredients: "" });
  },
  async aiRecommendRecipes() {
    const ingredients = this.data.recommendIngredients.trim().split(/[，,、\s]+/).filter(Boolean);
    if (!ingredients.length) {
      return wx.showToast({ title: "请输入至少一个食材", icon: "none" });
    }

    this.setData({ recommendLoading: true });
    try {
      wx.showLoading({ title: "AI推荐中...", mask: true });
      const result = await api.aiRecommendRecipes(ingredients);
      this.setData({ recommendList: result.recipes || [] });
      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: "推荐失败: " + (e.message || "请重试"), icon: "none" });
      this.setData({ recommendList: [] });
    } finally {
      this.setData({ recommendLoading: false });
    }
  },
  async testCloudConnection() {
    if (this.data.busy) return;
    this.setData({ busy: true, cloudTestResult: "正在检测云开发...", aiTestResult: "" });
    try {
      const cloudReport = await api.diagnoseConnection();
      if (!cloudReport.ok) {
        this.setData({ cloudTestResult: "云开发异常：" + (cloudReport.report || []).join(" | "), aiTestResult: "" });
        return;
      }
      this.setData({ cloudTestResult: "云开发连接正常，正在检测AI..." });
      const ai = await api.aiHealthCheck();
      this.setData({
        cloudTestResult: "云开发连接正常",
        aiTestResult: "AI连接正常：" + (ai.message || "OK")
      });
      wx.showToast({ title: "AI连接正常", icon: "success" });
    } catch (e) {
      this.setData({ aiTestResult: "AI连接失败：" + (e.message || "未知错误") });
      wx.showToast({ title: "AI连接失败", icon: "none" });
    } finally {
      this.setData({ busy: false });
    }
  },
  async addSampleRecipes() {
    if (this.data.busy) return;
    this.setData({ busy: true, recipeResult: "正在初始化示例数据..." });
    try {
      await api.initData();
      this.setData({ recipeResult: "示例数据已初始化" });
      wx.showToast({ title: "已初始化", icon: "success" });
    } catch (e) {
      this.setData({ recipeResult: "初始化失败：" + (e.message || "未知错误") });
      wx.showToast({ title: "初始化失败", icon: "none" });
    } finally {
      this.setData({ busy: false });
    }
  },
  copyDiagnosticText() {
    const text = this.data.aiTestResult || this.data.cloudTestResult || this.data.recipeResult;
    if (!text) return;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: "已复制到剪贴板", icon: "success", duration: 1500 });
      },
      fail: () => {
        wx.showToast({ title: "复制失败", icon: "none" });
      }
    });
  },
  formatTime(sec) {
    const hour = Math.floor(sec / 3600);
    const min = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    if (hour > 0) {
      return hour + ":" + min + ":" + s;
    }
    return min + ":" + s;
  }
});
