const api = require("../../utils/api");

function ingToText(list) { return list.map(x => x.name + "|" + x.amount).join("\n"); }

Page({
  data: { id: "", title: "", description: "", tags: "", ingredients: "", steps: "", visibility: "family", saving: false, aiOptimizing: false },
  onLoad(opt) {
    const id = opt.id || "";
    this.setData({ id });
    if (!id) return;
    api.getRecipeDetail(id).then((r) => {
      if (!r) return;
      this.setData({
        title: r.title,
        description: r.description,
        tags: r.tags.join(","),
        ingredients: ingToText(r.ingredients),
        steps: r.steps.join("\n"),
        visibility: r.visibility || "family"
      });
    });
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
    async aiOptimizeRecipe() {
      const title = this.data.title.trim();
      const steps = this.data.steps.split("\n").map(x => x.trim()).filter(Boolean);
      const ingredients = this.data.ingredients.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
        const p = l.split("|");
        return { name: (p[0] || "").trim(), amount: (p[1] || "适量").trim() };
      }).filter(x => x.name);
    
      if (!title || !steps.length || !ingredients.length) {
        return wx.showToast({ title: "请先填写标题、步骤和食材", icon: "none" });
      }
    
      if (this.data.aiOptimizing) return;
      this.setData({ aiOptimizing: true });
    
      try {
        wx.showLoading({ title: "AI优化中...", mask: true });
        const result = await api.aiOptimizeRecipe(ingredients, steps, this.data.description.trim());
        this.setData({
          description: result.description || this.data.description,
          steps: result.steps ? result.steps.join("\n") : this.data.steps
        });
        wx.hideLoading();
        wx.showToast({ title: "✨ AI优化完成", icon: "success", duration: 2000 });
      } catch (e) {
        wx.hideLoading();
        wx.showToast({ title: "优化失败: " + (e.message || "请重试"), icon: "none" });
      } finally {
        this.setData({ aiOptimizing: false });
      }
    },
  async save() {
    if (this.data.saving) return;
    const title = this.data.title.trim();
    const steps = this.data.steps.split("\n").map(x => x.trim()).filter(Boolean);
    if (!title || !steps.length) return wx.showToast({ title: "标题和步骤必填", icon: "none" });
    const payload = {
      id: this.data.id || undefined,
      title,
      description: this.data.description.trim(),
      tags: this.data.tags.split(",").map(x => x.trim()).filter(Boolean),
      ingredients: this.data.ingredients.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
        const p = l.split("|");
        return { name: (p[0] || "").trim(), amount: (p[1] || "适量").trim() };
      }).filter(x => x.name),
      steps,
      visibility: this.data.visibility
    };
    this.setData({ saving: true });
    try {
      await api.saveRecipe(payload);
      wx.showToast({ title: "保存成功", icon: "success" });
      wx.navigateBack();
    } finally {
      this.setData({ saving: false });
    }
  },
  onSelectFamily() { this.setData({ visibility: "family" }); },
  onSelectCommunity() { this.setData({ visibility: "community" }); }
});
