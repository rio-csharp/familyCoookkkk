function call(action, data) {
  return wx.cloud.callFunction({
    name: "api",
    data: { action, data: data || {} }
  }).then((res) => {
    if (!res.result || !res.result.ok) {
      throw new Error((res.result && res.result.message) || "接口调用失败");
    }
    return res.result.data;
  });
}

async function diagnoseConnection() {
  const report = [];
  if (!wx.cloud) {
    return { ok: false, report: ["基础库不支持 wx.cloud，请升级微信开发者工具。"] };
  }
  try {
    await call("init");
    report.push("1. 云函数 init 调用成功");
  } catch (e) {
    return { ok: false, report: ["1. 云函数 init 调用失败", "错误：" + (e.message || "unknown")] };
  }
  try {
    await call("getSession");
    report.push("2. 接口 getSession 调用成功");
  } catch (e) {
    return { ok: false, report: [...report, "2. 接口 getSession 调用失败", "错误：" + (e.message || "unknown")] };
  }
  try {
    await wx.cloud.database().collection("platform").doc("main").get();
    report.push("3. 数据库读取 platform/main 成功");
  } catch (e) {
    return { ok: false, report: [...report, "3. 数据库读取失败", "错误：" + ((e && (e.errMsg || e.message)) || "unknown")] };
  }
  return { ok: true, report };
}

function watchState(onChange, onError) {
  return wx.cloud.database().collection("platform").doc("main").watch({
    onChange,
    onError
  });
}

module.exports = {
  loginByPhone: (phone, pin, nickname) => call("loginByPhone", { phone, pin, nickname: nickname || "" }),
  registerByPhone: (nickname, phone, pin, inviteCode) => call("registerByPhone", { nickname, phone, pin, inviteCode }),
  logout: () => call("logout"),
  getSession: () => call("getSession"),
  testConnection: async () => {
    await call("init");
    await call("getHomeData", { keyword: "" });
    return true;
  },
  diagnoseConnection,
  initData: () => call("init"),
  getHomeData: (keyword) => call("getHomeData", { keyword: keyword || "" }),
  getCommunityData: (keyword) => call("getCommunityData", { keyword: keyword || "" }),
  getRecipeDetail: (id) => call("getRecipeDetail", { id }),
  saveRecipe: (payload) => call("saveRecipe", payload),
  deleteRecipe: (id) => call("deleteRecipe", { id }),
  toggleLike: (id) => call("toggleLike", { id }),
  toggleFavorite: (id) => call("toggleFavorite", { id }),
  addComment: (recipeId, content) => call("addComment", { recipeId, content }),
  getFamily: () => call("getFamily"),
  createFamily: (name) => call("createFamily", { name }),
  joinFamilyByInvite: (code) => call("joinFamilyByInvite", { code }),
  switchActiveFamily: (familyId) => call("switchActiveFamily", { familyId }),
  updateProfile: (nickname, phone) => call("updateProfile", { nickname, phone }),
  updateFamilyName: (name) => call("updateFamilyName", { name }),
  setFamilyAdmin: (userId, isAdmin, familyId) => call("setFamilyAdmin", { userId, isAdmin, familyId }),
  removeFamilyMember: (userId, familyId) => call("removeFamilyMember", { userId, familyId }),
  dissolveFamily: (familyId) => call("dissolveFamily", { familyId }),
  getTools: () => call("getTools"),
  addShoppingItem: (text) => call("addShoppingItem", { text }),
  removeShoppingItem: (index) => call("removeShoppingItem", { index }),
  watchState
};
