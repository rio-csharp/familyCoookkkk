const api = require("../../utils/api");

Page({
  data: { shoppingList: [], newItem: "", timerMin: "20", remain: 0, timerText: "00:00", randomText: "", loading: false, errorText: "", busy: false },
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
    const min = Number(this.data.timerMin);
    if (!min || min <= 0) return wx.showToast({ title: "请输入分钟", icon: "none" });
    this.stopTimer();
    let sec = min * 60;
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
  stopTimer() { if (this.timer) { clearInterval(this.timer); this.timer = null; } },
  async randomRecipe() {
    const data = await api.getHomeData("");
    const list = data.recipes || [];
    if (!list.length) return this.setData({ randomText: "暂无食谱" });
    const one = list[Math.floor(Math.random() * list.length)];
    this.setData({ randomText: "今日推荐：" + one.title });
  },
  formatTime(sec) {
    const min = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return min + ":" + s;
  }
});
