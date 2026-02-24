const cloud = require("wx-server-sdk");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const stateCol = db.collection("platform");
const STATE_ID = "main";

function uid(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

function defaults() {
  const now = new Date().toISOString();
  return {
    currentUserId: "u1",
    userOpenIdMap: {},
    users: [
      { id: "u1", name: "妈妈", role: "管理员" },
      { id: "u2", name: "爸爸", role: "成员" },
      { id: "u3", name: "我", role: "成员" }
    ],
    family: { id: "f1", name: "幸福一家", inviteCode: "HOME88", memberIds: ["u1", "u2", "u3"] },
    recipeLikesByUser: {},
    recipeFavoritesByUser: {},
    tools: { shoppingList: ["鸡蛋 4个", "番茄 2个"] },
    recipes: [
      {
        id: "r1",
        title: "番茄炒蛋",
        description: "家常快手菜，酸甜开胃。",
        tags: ["家常", "快手"],
        ingredients: [{ name: "番茄", amount: "2个" }, { name: "鸡蛋", amount: "3个" }],
        steps: ["番茄切块，鸡蛋打散。", "热油炒蛋盛出。", "番茄炒软后回锅鸡蛋调味。"],
        authorId: "u1",
        comments: [{ id: "c1", userId: "u2", content: "很好吃！", createdAt: now }],
        createdAt: now,
        updatedAt: now
      }
    ],
    updatedAt: now
  };
}

function sanitizeForWrite(input) {
  if (Array.isArray(input)) return input.map((x) => sanitizeForWrite(x));
  if (!input || typeof input !== "object") return input;
  const out = {};
  Object.keys(input).forEach((k) => {
    if (k === "_id" || k === "_openid") return;
    out[k] = sanitizeForWrite(input[k]);
  });
  return out;
}

async function ensurePlatformCollection() {
  try {
    await db.createCollection("platform");
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) || "";
    if (msg.includes("already exists")) return;
    if (msg.includes("Collection.get")) return;
    if (msg.includes("collection exists")) return;
  }
}

async function loadState() {
  try {
    const r = await stateCol.doc(STATE_ID).get();
    return r.data;
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) || "";
    if (msg.includes("collection not exists") || msg.includes("Db or Table not exist")) {
      await ensurePlatformCollection();
    }
    const init = defaults();
    await stateCol.doc(STATE_ID).set({ data: sanitizeForWrite(init) });
    return init;
  }
}

function userName(state, uid0) {
  const u = state.users.find((x) => x.id === uid0);
  return u ? u.name : "未知";
}
function likesCount(state, rid) {
  return Object.values(state.recipeLikesByUser || {}).filter((ids) => (ids || []).includes(rid)).length;
}
function favsCount(state, rid) {
  return Object.values(state.recipeFavoritesByUser || {}).filter((ids) => (ids || []).includes(rid)).length;
}
function currentUser(state) {
  return state.users.find((u) => u.id === state.currentUserId) || state.users[0];
}

function getOpenId() {
  const ctx = cloud.getWXContext();
  return ctx.OPENID || "";
}

function currentUserByOpenId(state, openid) {
  const mappedId = (state.userOpenIdMap || {})[openid];
  if (mappedId) {
    const mappedUser = state.users.find((u) => u.id === mappedId);
    if (mappedUser) return mappedUser;
  }
  return null;
}

function requireLoginUser(state, openid) {
  const me = currentUserByOpenId(state, openid);
  if (!me) throw new Error("请先登录");
  return me;
}
async function persist(state) {
  state.updatedAt = new Date().toISOString();
  await ensurePlatformCollection();
  await stateCol.doc(STATE_ID).set({ data: sanitizeForWrite(state) });
}
function recipesWithMeta(state, keyword) {
  const key = (keyword || "").trim().toLowerCase();
  return state.recipes
    .filter((r) => !key || r.title.toLowerCase().includes(key) || r.description.toLowerCase().includes(key) || r.tags.some((t) => t.toLowerCase().includes(key)))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((r) => ({
      ...r,
      authorName: userName(state, r.authorId),
      likeCount: likesCount(state, r.id),
      favoriteCount: favsCount(state, r.id)
    }));
}

exports.main = async (event) => {
  try {
    const action = event.action;
    const payload = event.data || {};
    const state = await loadState();
    const openid = getOpenId();
    let me = currentUserByOpenId(state, openid);

    if (action === "init") return { ok: true, data: { ready: true } };
    if (action === "getSession") return { ok: true, data: { isLoggedIn: !!me, user: me || null } };
    if (action === "login") {
      if (!state.userOpenIdMap) state.userOpenIdMap = {};
      if (!me) {
        const user = {
          id: uid("u"),
          name: (payload.nickname || "").trim() || ("用户" + (state.users.length + 1)),
          role: "成员"
        };
        state.users.push(user);
        if (!state.family.memberIds.includes(user.id)) state.family.memberIds.push(user.id);
        state.userOpenIdMap[openid] = user.id;
        state.currentUserId = user.id;
        await persist(state);
        me = user;
      }
      return { ok: true, data: { user: me } };
    }
    if (action === "logout") {
      if (state.userOpenIdMap && openid && state.userOpenIdMap[openid]) {
        delete state.userOpenIdMap[openid];
        await persist(state);
      }
      return { ok: true, data: { success: true } };
    }

    if (action === "getHomeData") {
      me = requireLoginUser(state, openid);
      return { ok: true, data: { currentUser: me, recipes: recipesWithMeta(state, payload.keyword) } };
    }
    if (action === "getRecipeDetail") {
      me = requireLoginUser(state, openid);
      const recipe = state.recipes.find((x) => x.id === payload.id);
      if (!recipe) return { ok: true, data: null };
      const liked = (state.recipeLikesByUser[me.id] || []).includes(recipe.id);
      const favorited = (state.recipeFavoritesByUser[me.id] || []).includes(recipe.id);
      return {
        ok: true,
        data: {
          ...recipe,
          authorName: userName(state, recipe.authorId),
          comments: recipe.comments.map((c) => ({ ...c, userName: userName(state, c.userId) })),
          likeCount: likesCount(state, recipe.id),
          favoriteCount: favsCount(state, recipe.id),
          liked,
          favorited,
          isOwner: recipe.authorId === me.id
        }
      };
    }
    if (action === "saveRecipe") {
      me = requireLoginUser(state, openid);
      const now = new Date().toISOString();
      if (payload.id) {
        const i = state.recipes.findIndex((r) => r.id === payload.id);
        if (i < 0) throw new Error("食谱不存在");
        state.recipes[i] = { ...state.recipes[i], ...payload, authorId: state.recipes[i].authorId, updatedAt: now };
      } else {
        state.recipes.unshift({ ...payload, id: uid("r"), authorId: me.id, comments: [], createdAt: now, updatedAt: now });
      }
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "deleteRecipe") {
      requireLoginUser(state, openid);
      state.recipes = state.recipes.filter((r) => r.id !== payload.id);
      Object.keys(state.recipeLikesByUser).forEach((k) => state.recipeLikesByUser[k] = (state.recipeLikesByUser[k] || []).filter((x) => x !== payload.id));
      Object.keys(state.recipeFavoritesByUser).forEach((k) => state.recipeFavoritesByUser[k] = (state.recipeFavoritesByUser[k] || []).filter((x) => x !== payload.id));
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "toggleLike") {
      me = requireLoginUser(state, openid);
      const set = new Set(state.recipeLikesByUser[me.id] || []);
      if (set.has(payload.id)) set.delete(payload.id); else set.add(payload.id);
      state.recipeLikesByUser[me.id] = Array.from(set);
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "toggleFavorite") {
      me = requireLoginUser(state, openid);
      const set = new Set(state.recipeFavoritesByUser[me.id] || []);
      if (set.has(payload.id)) set.delete(payload.id); else set.add(payload.id);
      state.recipeFavoritesByUser[me.id] = Array.from(set);
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "addComment") {
      me = requireLoginUser(state, openid);
      const recipe = state.recipes.find((x) => x.id === payload.recipeId);
      if (!recipe) throw new Error("食谱不存在");
      recipe.comments.push({ id: uid("c"), userId: me.id, content: payload.content, createdAt: new Date().toISOString() });
      recipe.updatedAt = new Date().toISOString();
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "getFamily") {
      requireLoginUser(state, openid);
      return {
        ok: true,
        data: { ...state.family, members: state.users.filter((u) => state.family.memberIds.includes(u.id)) }
      };
    }
    if (action === "updateFamilyName") {
      requireLoginUser(state, openid);
      state.family.name = payload.name;
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "addUser") {
      requireLoginUser(state, openid);
      const user = { id: uid("u"), name: payload.name, role: payload.role || "成员" };
      state.users.push(user);
      if (payload.joinFamily && !state.family.memberIds.includes(user.id)) state.family.memberIds.push(user.id);
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "switchUser") {
      requireLoginUser(state, openid);
      const target = state.users.find((u) => u.id === payload.id);
      if (!target) throw new Error("用户不存在");
      if (!state.userOpenIdMap) state.userOpenIdMap = {};
      state.userOpenIdMap[openid] = target.id;
      state.currentUserId = target.id;
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "getUsers") {
      me = requireLoginUser(state, openid);
      return { ok: true, data: { users: state.users, currentUserId: me.id } };
    }
    if (action === "getTools") {
      requireLoginUser(state, openid);
      return { ok: true, data: state.tools || { shoppingList: [] } };
    }
    if (action === "addShoppingItem") {
      requireLoginUser(state, openid);
      state.tools.shoppingList.push(payload.text);
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "removeShoppingItem") {
      requireLoginUser(state, openid);
      state.tools.shoppingList.splice(Number(payload.index), 1);
      await persist(state);
      return { ok: true, data: { success: true } };
    }

    throw new Error("未知接口动作");
  } catch (error) {
    return { ok: false, message: error.message || "服务异常" };
  }
};
