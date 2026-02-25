const api = require("../../utils/api");

Page({
  data: {
    family: null,
    families: [],
    name: "",
    createFamilyName: "",
    inviteCode: "",
    loading: false,
    errorText: "",
    saving: false,
    isSuperAdmin: false,
    canManage: false,
    canDissolve: false
  },
  async onShow() { await this.reload(); },
  async reload() {
    this.setData({ loading: true, errorText: "" });
    try {
      const data = await api.getFamily();
      this.setData({
        family: data.family || null,
        families: data.families || [],
        isSuperAdmin: !!data.isSuperAdmin,
        canManage: !!data.canManage || !!data.isSuperAdmin,
        canDissolve: !!data.canDissolve || !!data.isSuperAdmin,
        name: data.family ? data.family.name : "",
        errorText: ""
      });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
  copyInvite() {
    const code = (this.data.family && this.data.family.inviteCode) || "";
    if (!code) return wx.showToast({ title: "邀请码为空", icon: "none" });
    wx.setClipboardData({ data: code });
  },
  async saveName() {
    if (this.data.saving) return;
    const v = this.data.name.trim();
    if (!v) return wx.showToast({ title: "请输入家庭名", icon: "none" });
    this.setData({ saving: true });
    try {
      await api.updateFamilyName(v);
      wx.showToast({ title: "保存成功", icon: "success" });
      await this.reload();
    } finally {
      this.setData({ saving: false });
    }
  },
  async createFamily() {
    if (this.data.saving) return;
    const v = this.data.createFamilyName.trim();
    if (!v) return wx.showToast({ title: "请输入家庭名称", icon: "none" });
    this.setData({ saving: true });
    try {
      await api.createFamily(v);
      this.setData({ createFamilyName: "" });
      wx.showToast({ title: "创建成功", icon: "success" });
      await this.reload();
    } finally {
      this.setData({ saving: false });
    }
  },
  async joinByInvite() {
    if (this.data.saving) return;
    const code = this.data.inviteCode.trim();
    if (!code) return wx.showToast({ title: "请输入邀请码", icon: "none" });
    this.setData({ saving: true });
    try {
      await api.joinFamilyByInvite(code);
      wx.showToast({ title: "加入成功", icon: "success" });
      this.setData({ inviteCode: "" });
      await this.reload();
    } finally {
      this.setData({ saving: false });
    }
  },
  async toggleAdmin(e) {
    if (this.data.saving || !this.data.canManage) return;
    const userId = e.currentTarget.dataset.id;
    const isAdmin = !!e.currentTarget.dataset.admin;
    this.setData({ saving: true });
    try {
      await api.setFamilyAdmin(userId, !isAdmin, this.data.family.id);
      wx.showToast({ title: isAdmin ? "已取消管理员" : "已设为管理员", icon: "success" });
      await this.reload();
    } finally {
      this.setData({ saving: false });
    }
  },
  async removeMember(e) {
    if (this.data.saving || !this.data.canManage) return;
    const userId = e.currentTarget.dataset.id;
    this.setData({ saving: true });
    try {
      await api.removeFamilyMember(userId, this.data.family.id);
      wx.showToast({ title: "已移除成员", icon: "success" });
      await this.reload();
    } finally {
      this.setData({ saving: false });
    }
  },
  dissolveFamily() {
    if (!this.data.canDissolve || this.data.saving) return;
    wx.showModal({
      title: "解散家庭",
      content: "该操作不可恢复，是否继续？",
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ saving: true });
        try {
          await api.dissolveFamily(this.data.family.id);
          wx.showToast({ title: "已解散", icon: "success" });
          await this.reload();
        } finally {
          this.setData({ saving: false });
        }
      }
    });
  }
});
