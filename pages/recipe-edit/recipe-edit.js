const api = require("../../utils/api");

function ingToText(list) { return list.map(x => x.name + "|" + x.amount).join("\n"); }

Page({
  data: { id: "", title: "", description: "", tags: "", ingredients: "", steps: "" },
  onLoad(opt) {
    const id = opt.id || "";
    this.setData({ id });
    if (!id) return;
    api.getRecipeDetail(id).then((r) => {
      if (!r) return;
      this.setData({ title: r.title, description: r.description, tags: r.tags.join(","), ingredients: ingToText(r.ingredients), steps: r.steps.join("\n") });
    });
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
  async save() {
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
      steps
    };
    await api.saveRecipe(payload);
    wx.navigateBack();
  }
});
