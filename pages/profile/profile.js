const api = require("../../utils/api");

Page({
  data: {
    loading: false,
    errorText: "",
    busy: false,
    session: null,
    familyData: null,
    editNickname: "",
    editPhone: "",
    memberships: [],
    activeFamilyId: "",
    stats: {
      recipeCount: 0,
      familyCount: 0,
      memberCount: 0
    },
    showEditModal: false,
    showFamilyModal: false,
    showAllFamilyModal: false
  },
  async onShow() { await this.reload(); },
  async reload() {
    this.setData({ loading: true, errorText: "" });
    try {
      const session = await api.getSession();
      const familyData = await api.getFamily();
      const memberships = session.memberships || familyData.myMemberships || [];
      
      // 计算统计数据
      const stats = {
        recipeCount: await this.getMyRecipeCount(),
        familyCount: memberships.length,
        memberCount: familyData.family && familyData.family.members ? familyData.family.members.length : 0
      };

      this.setData({
        session,
        familyData,
        editNickname: (session.user && session.user.name) || "",
        editPhone: (session.user && session.user.phone) || "",
        memberships,
        activeFamilyId: session.familyId || "",
        stats,
        errorText: ""
      });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  async getMyRecipeCount() {
    try {
      const res = await api.callCloudFunction("api", { action: "listRecipes" });
      return (res.data && res.data.list) ? res.data.list.filter(r => r.creatorOpenid === this.data.session.openid).length : 0;
    } catch (e) {
      return 0;
    }
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
  goFamily() { wx.navigateTo({ url: "/pages/family/family" }); },
  
  // 编辑资料弹窗
  showEditProfile() { this.setData({ showEditModal: true }); },
  hideEditProfile() { this.setData({ showEditModal: false }); },
  stopPropagation() {},
  
  async saveProfile() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      await api.updateProfile(this.data.editNickname.trim(), this.data.editPhone.trim());
      wx.showToast({ title: "保存成功", icon: "success" });
      this.setData({ showEditModal: false });
      await this.reload();
    } finally {
      this.setData({ busy: false });
    }
  },
  
  // 家庭切换
  showFamilyList() { this.setData({ showFamilyModal: true }); },
  hideFamilyList() { this.setData({ showFamilyModal: false }); },
  
  async switchFamily(e) {
    if (this.data.busy) return;
    const familyId = e.currentTarget.dataset.familyId;
    if (!familyId || familyId === this.data.activeFamilyId) return;
    this.setData({ busy: true });
    try {
      await api.switchActiveFamily(familyId);
      wx.showToast({ title: "已切换", icon: "success" });
      this.setData({ showFamilyModal: false });
      await this.reload();
    } finally {
      this.setData({ busy: false });
    }
  },
  
  // 全部家庭
  showAllFamilies() { this.setData({ showAllFamilyModal: true }); },
  hideAllFamilies() { this.setData({ showAllFamilyModal: false }); },
  
  // 功能入口
  goMyRecipes() {
    wx.navigateTo({ url: "/pages/my-recipes/my-recipes" });
  },
  showSettings() {
    wx.showToast({ title: "功能开发中", icon: "none" });
  },
  showHelp() {
    wx.showToast({ title: "功能开发中", icon: "none" });
  },
  
  async logout() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      await api.logout();
      wx.reLaunch({ url: "/pages/login/login" });
    } finally {
      this.setData({ busy: false });
    }
  }
});

