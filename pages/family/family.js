const api = require("../../utils/api");

Page({
  data: { family: null, name: "", memberName: "" },
  async onShow() { await this.reload(); },
  async reload() {
    const family = await api.getFamily();
    this.setData({ family, name: family.name });
  },
  onInput(e) { this.setData({ [e.currentTarget.dataset.f]: e.detail.value }); },
  saveName() {
    const v = this.data.name.trim();
    if (!v) return;
    api.updateFamilyName(v).then(() => this.reload());
  },
  addMember() {
    const v = this.data.memberName.trim();
    if (!v) return wx.showToast({ title: "请输入成员名", icon: "none" });
    api.addUser(v, "成员", true).then(() => {
      this.setData({ memberName: "" });
      this.reload();
    });
  }
});
