const api = require("../../utils/api");

Page({
  data: {
    family: null,
    families: [],
    memberships: [],
    name: "",
    createFamilyName: "",
    inviteCode: "",
    loading: false,
    errorText: "",
    saving: false,
    isSuperAdmin: false,
    canManage: false,
    canDissolve: false,
    showInviteModal: false,
    showEditModal: false,
    showMemberMenu: false,
    selectedMember: null,
    activeTab: "create",
    totalMembers: 0,
    isEditing: false,
    adminCount: 0,
    createTime: "",
    toastVisible: false,
    toastMessage: "",
    toastTimer: null
  },
  async onShow() {
    await this.reload();
  },
  async reload() {
    this.setData({ loading: true, errorText: "" });
    try {
      const data = await api.getFamily();
      const families = data.families || [];
      const totalMembers = families.reduce((sum, f) => sum + (f.members || []).length, 0);

      // 获取用户的所有家庭信息
      let memberships = [];
      try {
        const session = await api.getSession();
        memberships = session.memberships || [];
      } catch (e) {
        // 如果获取失败，使用空数组
        memberships = [];
      }

      // 计算管理员数量
      const adminCount = data.family
        ? data.family.members.filter(m => m.familyRole === 'admin' || m.familyRole === 'owner').length
        : 0;

      // 格式化创建时间
      let createTime = "";
      if (data.family && data.family.createdAt) {
        const date = new Date(data.family.createdAt);
        createTime = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
      } else {
        createTime = "未知";
      }

      this.setData({
        family: data.family || null,
        families,
        memberships,
        isSuperAdmin: !!data.isSuperAdmin,
        canManage: !!data.canManage || !!data.isSuperAdmin,
        canDissolve: !!data.canDissolve || !!data.isSuperAdmin,
        name: data.family ? data.family.name : "",
        totalMembers,
        adminCount,
        createTime,
        isEditing: false,
        errorText: ""
      });
    } catch (e) {
      this.setData({ errorText: e.message || "加载失败" });
    } finally {
      this.setData({ loading: false });
    }
  },
  onInput(e) {
    const field = e.currentTarget.dataset.f;
    this.setData({ [field]: e.detail.value });
  },
  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },
  // 显示提示
  showToast(message, duration = 2000) {
    if (this.data.toastTimer) {
      clearTimeout(this.data.toastTimer);
    }
    this.setData({ 
      toastMessage: message,
      toastVisible: true 
    });
    const timer = setTimeout(() => {
      this.setData({ toastVisible: false });
    }, duration);
    this.setData({ toastTimer: timer });
  },
  // 复制邀请码
  copyInvite() {
    wx.setClipboardData({ 
      data: "IPNIVN",
      success: () => this.showToast("✓ 复制成功"),
      fail: () => this.showToast("✗ 复制失败")
    });
  },
  // 切换编辑状态
  toggleEdit() {
    if (this.data.isEditing) {
      this.setData({ isEditing: false, name: this.data.family.name });
    } else {
      this.setData({ isEditing: true });
    }
  },
  // 点击名称开始编辑
  startEditName() {
    console.log('startEditName 被调用', {
      canManage: this.data.canManage,
      isSuperAdmin: this.data.isSuperAdmin,
      family: this.data.family
    });

    if (this.data.canManage) {
      this.setData({ isEditing: true });
    } else {
      this.showToast("您没有编辑权限");
    }
  },
  async saveName() {
    if (this.data.saving) return;
    const v = this.data.name.trim();
    if (!v) return this.showToast("请输入家庭名");
    this.setData({ saving: true });
    try {
      await api.updateFamilyName(v);
      this.showToast("✓ 保存成功");
      await this.reload();
      this.setData({ isEditing: false });
    } catch (e) {
      this.showToast("✗ 保存失败：" + (e.message || ""));
    } finally {
      this.setData({ saving: false });
    }
  },
  // 取消编辑名称
  cancelEditName() {
    console.log('cancelEditName 被调用', {
      isEditing: this.data.isEditing,
      currentName: this.data.name,
      familyName: this.data.family?.name
    });

    if (this.data.isEditing) {
      this.setData({
        isEditing: false,
        name: this.data.family?.name || ''
      });
    }
  },
  // 点击页面空白处取消编辑
  handlePageTap() {
    this.cancelEditName();
  },
  async createFamily() {
    if (this.data.saving) return;
    const v = this.data.createFamilyName.trim();
    if (!v) return this.showToast("请输入家庭名称");
    this.setData({ saving: true });
    try {
      await api.createFamily(v);
      this.setData({ createFamilyName: "" });
      this.showToast("✓ 创建成功");
      await this.reload();
    } catch (e) {
      this.showToast("✗ 创建失败：" + (e.message || ""));
    } finally {
      this.setData({ saving: false });
    }
  },
  async joinByInvite() {
    if (this.data.saving) return;
    const code = this.data.inviteCode.trim();
    if (!code) return this.showToast("请输入邀请码");
    this.setData({ saving: true });
    try {
      await api.joinFamilyByInvite(code);
      this.showToast("✓ 加入成功");
      this.setData({ inviteCode: "" });
      await this.reload();
    } catch (e) {
      this.showToast("✗ 加入失败：" + (e.message || ""));
    } finally {
      this.setData({ saving: false });
    }
  },
  // 切换家庭
  async switchFamily(e) {
    if (this.data.saving) return;
    const familyId = e.currentTarget.dataset.familyId;
    if (!familyId || !this.data.family || familyId === this.data.family.id) {
      return;
    }
    this.setData({ saving: true });
    try {
      await api.switchActiveFamily(familyId);
      this.showToast("✓ 已切换家庭");
      await this.reload();
    } catch (e) {
      this.showToast("✗ 切换失败：" + (e.message || ""));
    } finally {
      this.setData({ saving: false });
    }
  },
  async toggleAdmin(e) {
    if (this.data.saving || !this.data.canManage) return;
    const member = e.currentTarget.dataset.member || this.data.selectedMember;
    if (!member) return;
    
    const userId = member.id;
    const isAdmin = member.familyRole === 'admin';
    this.setData({ saving: true, showMemberMenu: false });
    try {
      await api.setFamilyAdmin(userId, !isAdmin, this.data.family.id);
      this.showToast(isAdmin ? "✓ 已取消管理员" : "✓ 已设为管理员");
      await this.reload();
    } catch (e) {
      this.showToast("✗ 操作失败：" + (e.message || ""));
    } finally {
      this.setData({ saving: false });
    }
  },
  async removeMember(e) {
    if (this.data.saving || !this.data.canManage) return;
    const member = e.currentTarget.dataset.member || this.data.selectedMember;
    if (!member) return;
    
    wx.showModal({
      title: "确认移除",
      content: `确定要移除成员"${member.name}"吗？`,
      success: async (res) => {
        if (!res.confirm) return;
        
        const userId = member.id;
        this.setData({ saving: true, showMemberMenu: false });
        try {
          await api.removeFamilyMember(userId, this.data.family.id);
          this.showToast("✓ 已移除成员");
          await this.reload();
        } catch (e) {
          this.showToast("✗ 移除失败：" + (e.message || ""));
        } finally {
          this.setData({ saving: false });
        }
      }
    });
  },
  dissolveFamily() {
    if (!this.data.canDissolve || this.data.saving) return;
    wx.showModal({
      title: "解散家庭",
      content: "该操作不可恢复，是否继续？",
      confirmColor: "#EF4444",
      success: async (res) => {
        if (!res.confirm) return;
        this.setData({ saving: true });
        try {
          await api.dissolveFamily(this.data.family.id);
          this.showToast("✓ 已解散家庭");
          await this.reload();
        } catch (e) {
          this.showToast("✗ 解散失败：" + (e.message || ""));
        } finally {
          this.setData({ saving: false });
        }
      }
    });
  },
  // 标签切换
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },
  // 弹窗控制
  showInviteModal() { this.setData({ showInviteModal: true }); },
  hideInviteModal() { this.setData({ showInviteModal: false }); },
  showEditModal() { this.setData({ showEditModal: true }); },
  hideEditModal() { this.setData({ showEditModal: false }); },
  showMemberMenu(e) {
    const member = e.currentTarget.dataset.member;
    this.setData({ showMemberMenu: true, selectedMember: member });
  },
  hideMemberMenu() { this.setData({ showMemberMenu: false, selectedMember: null }); },
  stopPropagation() {},
  // 工具函数
  getRoleName(role) {
    const roleMap = {
      owner: "创建者",
      admin: "管理员",
      member: "成员"
    };
    return roleMap[role] || role;
  },
  // 快捷操作
  viewRecipes() {
    this.showToast("查看家庭菜谱");
  },
  viewStats() {
    this.showToast("查看家庭统计");
  },
  viewFamilyDetail(e) {
    const family = e.currentTarget.dataset.family;
    this.showToast("查看家庭：" + family.name);
  },
  // 页面卸载时清除定时器
  onUnload() {
    if (this.data.toastTimer) {
      clearTimeout(this.data.toastTimer);
    }
  }
});



