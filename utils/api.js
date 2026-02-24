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
    await call("getHomeData", { keyword: "" });
    report.push("2. 接口 getHomeData 调用成功");
  } catch (e) {
    return { ok: false, report: [...report, "2. 接口 getHomeData 调用失败", "错误：" + (e.message || "unknown")] };
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
  login: (nickname) => call("login", { nickname: nickname || "" }),
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
  getRecipeDetail: (id) => call("getRecipeDetail", { id }),
  saveRecipe: (payload) => call("saveRecipe", payload),
  deleteRecipe: (id) => call("deleteRecipe", { id }),
  toggleLike: (id) => call("toggleLike", { id }),
  toggleFavorite: (id) => call("toggleFavorite", { id }),
  addComment: (recipeId, content) => call("addComment", { recipeId, content }),
  getFamily: () => call("getFamily"),
  updateFamilyName: (name) => call("updateFamilyName", { name }),
  addUser: (name, role, joinFamily) => call("addUser", { name, role, joinFamily }),
  switchUser: (id) => call("switchUser", { id }),
  getUsers: () => call("getUsers"),
  getTools: () => call("getTools"),
  addShoppingItem: (text) => call("addShoppingItem", { text }),
  removeShoppingItem: (index) => call("removeShoppingItem", { index }),
  watchState
};
