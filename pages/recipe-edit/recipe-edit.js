const api = require("../../utils/api");

function ingToText(list) { return list.map(x => x.name + "|" + x.amount).join("\n"); }

Page({
  data: { 
    id: "", 
    title: "", 
    description: "", 
    tags: "", 
    ingredients: "", 
    steps: "", 
    visibility: "family", 
    coverUrl: "",
    saving: false, 
    aiOptimizing: false 
  },
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
        visibility: r.visibility || "family",
        coverUrl: r.coverUrl || ""
      });
    });
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
  
  // 选择封面图片
  async chooseCoverImage() {
    try {
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      });
      
      const tempFilePath = res.tempFilePaths[0];
      
      // 显示上传进度
      wx.showLoading({ title: '上传中...', mask: true });
      
      // 上传到云存储
      const cloudPath = `recipe-covers/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempFilePath
      });
      
      wx.hideLoading();
      
      // 保存云存储 fileID
      this.setData({ coverUrl: uploadRes.fileID });
      wx.showToast({ title: '上传成功', icon: 'success' });
      
    } catch (error) {
      wx.hideLoading();
      console.error('上传封面失败:', error);
      wx.showToast({ title: '上传失败，请重试', icon: 'none' });
    }
  },
  
  // 移除封面图片
  removeCoverImage(e) {
    e.stopPropagation();
    wx.showModal({
      title: '确认删除',
      content: '确定要删除封面图片吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ coverUrl: '' });
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },
  
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
      visibility: this.data.visibility,
      coverUrl: this.data.coverUrl || ""
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
