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
    activeFamilyId: ""
  },
  async onShow() { await this.reload(); },
  async reload() {
    this.setData({ loading: true, errorText: "" });
    try {
      const session = await api.getSession();
      const familyData = await api.getFamily();
      this.setData({
        session,
        familyData,
        editNickname: (session.user && session.user.name) || "",
        editPhone: (session.user && session.user.phone) || "",
        memberships: session.memberships || familyData.myMemberships || [],
        activeFamilyId: session.familyId || "",
        errorText: ""
      });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
  goFamily() { wx.navigateTo({ url: "/pages/family/family" }); },
  async saveProfile() {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      await api.updateProfile(this.data.editNickname.trim(), this.data.editPhone.trim());
      wx.showToast({ title: "保存成功", icon: "success" });
      await this.reload();
    } finally {
      this.setData({ busy: false });
    }
  },
  async switchFamily(e) {
    if (this.data.busy) return;
    const familyId = e.currentTarget.dataset.familyId;
    if (!familyId || familyId === this.data.activeFamilyId) return;
    this.setData({ busy: true });
    try {
      await api.switchActiveFamily(familyId);
      wx.showToast({ title: "已切换", icon: "success" });
      await this.reload();
    } finally {
      this.setData({ busy: false });
    }
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
