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
    superAdminPhone: "15736521410",
    userOpenIdMap: {},
    users: [
      { id: "u1", name: "妈妈", role: "管理员", familyId: "f1", familyRole: "owner", phone: "15736521410", pin: "1234", openid: "", wxNickname: "" },
      { id: "u2", name: "爸爸", role: "成员", familyId: "f1", familyRole: "member", phone: "", pin: "", openid: "", wxNickname: "" },
      { id: "u3", name: "我", role: "成员", familyId: "f1", familyRole: "member", phone: "", pin: "", openid: "", wxNickname: "" }
    ],
    families: [
      { id: "f1", name: "幸福一家", inviteCode: "HOME88", ownerId: "u1", adminIds: [], memberIds: ["u1", "u2", "u3"] }
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
        visibility: "community",
        comments: [{ id: "c1", userId: "u2", content: "很好吃！", createdAt: now }],
        createdAt: now,
        updatedAt: now
      }
    ],
    updatedAt: now
  };
}

function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function normalizeState(state) {
  if (!state.superAdminPhone) state.superAdminPhone = "15736521410";
  if (!state.userOpenIdMap) state.userOpenIdMap = {};
  if (!Array.isArray(state.users)) state.users = [];
  if (!Array.isArray(state.families)) {
    if (state.family && state.family.id) {
      const ownerId = state.family.memberIds && state.family.memberIds[0] ? state.family.memberIds[0] : (state.currentUserId || "");
      state.families = [{
        id: state.family.id,
        name: state.family.name || "未命名家庭",
        inviteCode: state.family.inviteCode || inviteCode(),
        ownerId,
        adminIds: [],
        memberIds: (state.family.memberIds || []).slice()
      }];
    } else {
      state.families = [];
    }
  }
  state.families.forEach((f) => {
    if (!f.ownerId && f.memberIds && f.memberIds.length) f.ownerId = f.memberIds[0];
    if (!Array.isArray(f.adminIds)) f.adminIds = [];
    if (!Array.isArray(f.memberIds)) f.memberIds = [];
    if (!f.inviteCode) f.inviteCode = inviteCode();
    if (f.ownerId && !f.memberIds.includes(f.ownerId)) f.memberIds.unshift(f.ownerId);
  });
  state.users.forEach((u) => {
    if (!Object.prototype.hasOwnProperty.call(u, "phone")) u.phone = "";
    if (!Object.prototype.hasOwnProperty.call(u, "pin")) u.pin = "";
    if (!Object.prototype.hasOwnProperty.call(u, "openid")) u.openid = "";
    if (!Object.prototype.hasOwnProperty.call(u, "wxNickname")) u.wxNickname = "";
    if (!Object.prototype.hasOwnProperty.call(u, "activeFamilyId")) u.activeFamilyId = u.familyId || "";
    if (!u.familyId) {
      const f = state.families.find((x) => x.memberIds.includes(u.id));
      u.familyId = f ? f.id : "";
    }
    if (!u.familyRole) {
      const f = state.families.find((x) => x.id === u.familyId);
      if (f) {
        u.familyRole = f.ownerId === u.id ? "owner" : (f.adminIds.includes(u.id) ? "admin" : "member");
      } else {
        u.familyRole = "member";
      }
    }
    syncUserActiveContext(state, u);
  });
  // 兼容旧库：如果尚未存在默认超级管理员手机号，则把首个家庭创建者升级为默认超级管理员账号。
  if (!state.users.some((u) => u.phone === state.superAdminPhone)) {
    const ownerId = (state.families[0] && state.families[0].ownerId) || (state.users[0] && state.users[0].id) || "";
    const adminUser = state.users.find((u) => u.id === ownerId);
    if (adminUser) {
      adminUser.phone = state.superAdminPhone;
      adminUser.pin = adminUser.pin || "1234";
    }
  }
  if (!Array.isArray(state.recipes)) state.recipes = [];
  state.recipes.forEach((r) => {
    if (!r.visibility) r.visibility = "family";
  });
  return state;
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
    return normalizeState(r.data || {});
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) || "";
    if (msg.includes("collection not exists") || msg.includes("Db or Table not exist")) {
      await ensurePlatformCollection();
    }
    const init = defaults();
    await stateCol.doc(STATE_ID).set({ data: sanitizeForWrite(init) });
    return normalizeState(init);
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
function familyById(state, id) {
  return (state.families || []).find((f) => f.id === id);
}
function isSuperAdmin(state, user) {
  return !!(user && user.phone && user.phone === state.superAdminPhone);
}
function familyRoleOf(family, userId) {
  if (!family || !userId) return "member";
  if (family.ownerId === userId) return "owner";
  if ((family.adminIds || []).includes(userId)) return "admin";
  return "member";
}
function canManageFamily(state, family, userId, user) {
  if (!family) return false;
  if (isSuperAdmin(state, user)) return true;
  const role = familyRoleOf(family, userId);
  return role === "owner" || role === "admin";
}
function canDissolveFamily(state, family, userId, user) {
  if (!family) return false;
  if (isSuperAdmin(state, user)) return true;
  return family.ownerId === userId;
}
function familyWithMembers(state, family) {
  return {
    ...family,
    members: state.users
      .filter((u) => (family.memberIds || []).includes(u.id))
      .map((u) => ({ id: u.id, name: u.name, familyRole: familyRoleOf(family, u.id) }))
  };
}
function membershipsOfUser(state, userId) {
  return (state.families || [])
    .filter((f) => (f.memberIds || []).includes(userId))
    .map((f) => ({
      familyId: f.id,
      familyName: f.name,
      familyRole: familyRoleOf(f, userId),
      inviteCode: f.inviteCode
    }));
}
function syncUserActiveContext(state, user) {
  if (!user) return;
  const list = membershipsOfUser(state, user.id);
  if (!list.length) {
    user.activeFamilyId = "";
    user.familyId = "";
    user.familyRole = "member";
    return;
  }
  const activeId = user.activeFamilyId && list.some((x) => x.familyId === user.activeFamilyId)
    ? user.activeFamilyId
    : list[0].familyId;
  const active = list.find((x) => x.familyId === activeId) || list[0];
  user.activeFamilyId = active.familyId;
  user.familyId = active.familyId;
  user.familyRole = active.familyRole;
}
function validPhone(phone) {
  return /^\d{11}$/.test(phone || "");
}
function validPin(pin) {
  return /^\d{4}$/.test(pin || "");
}
function userByPhone(state, phone) {
  return state.users.find((u) => u.phone === phone);
}
function safeUser(user) {
  if (!user) return null;
  const { pin, ...rest } = user;
  return rest;
}

function getOpenId() {
  const ctx = cloud.getWXContext();
  return ctx.OPENID || "";
}

function currentUserByOpenId(state, openid) {
  if (!openid) return null;
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
function recipesWithMeta(state, list, keyword) {
  const key = (keyword || "").trim().toLowerCase();
  return (list || [])
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
    const action = event.action || (event.data && event.data.action) || event.$url || "";
    const payload = event.action
      ? (event.data || {})
      : ((event.data && event.data.data) || event.payload || event.data || {});
    const state = await loadState();
    const openid = getOpenId();
    let me = currentUserByOpenId(state, openid);

    if (action === "init") return { ok: true, data: { ready: true } };
    if (action === "getSession") {
      if (me) syncUserActiveContext(state, me);
      const memberships = me ? membershipsOfUser(state, me.id) : [];
      return {
        ok: true,
        data: {
          isLoggedIn: !!me,
          user: safeUser(me),
          isSuperAdmin: isSuperAdmin(state, me),
          familyId: me ? (me.activeFamilyId || me.familyId || "") : "",
          familyRole: me ? (me.familyRole || "member") : "member",
          memberships
        }
      };
    }
    if (action === "registerByPhone") {
      if (!openid) throw new Error("当前微信环境不可用");
      if (me) return { ok: true, data: { user: safeUser(me) } };
      if (!state.userOpenIdMap) state.userOpenIdMap = {};
      const phone = (payload.phone || "").trim();
      const pin = (payload.pin || "").trim();
      if (!validPhone(phone)) throw new Error("手机号需为11位数字");
      if (!validPin(pin)) throw new Error("密码需为4位数字");
      if (userByPhone(state, phone)) throw new Error("手机号已注册");
      const user = {
        id: uid("u"),
        name: (payload.nickname || "").trim() || ("用户" + (state.users.length + 1)),
        role: "成员",
        familyId: "",
        familyRole: "member",
        activeFamilyId: "",
        phone,
        pin,
        openid: "",
        wxNickname: (payload.nickname || "").trim()
      };
      state.users.push(user);
      state.userOpenIdMap[openid] = user.id;
      const code = (payload.inviteCode || "").trim();
      if (code) {
        const target = (state.families || []).find((f) => f.inviteCode === code);
        if (!target) throw new Error("邀请码错误");
        if (!target.memberIds.includes(user.id)) target.memberIds.push(user.id);
        user.activeFamilyId = target.id;
      }
      syncUserActiveContext(state, user);
      state.currentUserId = user.id;
      await persist(state);
      return { ok: true, data: { user: safeUser(user) } };
    }
    if (action === "loginByPhone") {
      if (!openid) throw new Error("当前微信环境不可用");
      const phone = (payload.phone || "").trim();
      const pin = (payload.pin || "").trim();
      if (!validPhone(phone)) throw new Error("手机号需为11位数字");
      if (!validPin(pin)) throw new Error("密码需为4位数字");
      const u = userByPhone(state, phone);
      if (!u || u.pin !== pin) throw new Error("手机号或密码错误");
      if (payload.nickname) u.wxNickname = (payload.nickname || "").trim();
      state.userOpenIdMap[openid] = u.id;
      syncUserActiveContext(state, u);
      state.currentUserId = u.id;
      await persist(state);
      return { ok: true, data: { user: safeUser(u) } };
    }
    if (action === "logout") {
      if (state.userOpenIdMap && openid && state.userOpenIdMap[openid]) {
        delete state.userOpenIdMap[openid];
      }
      await persist(state);
      return { ok: true, data: { success: true } };
    }

    if (action === "getHomeData") {
      me = requireLoginUser(state, openid);
      syncUserActiveContext(state, me);
      const activeFamilyId = me.activeFamilyId || me.familyId || "";
      const ownFamilyRecipes = state.recipes.filter((r) => {
        const author = state.users.find((u) => u.id === r.authorId);
        return author && activeFamilyId && author.familyId && author.familyId === activeFamilyId;
      });
      return { ok: true, data: { currentUser: safeUser(me), recipes: recipesWithMeta(state, ownFamilyRecipes, payload.keyword) } };
    }
    if (action === "getCommunityData") {
      requireLoginUser(state, openid);
      const community = state.recipes.filter((r) => r.visibility === "community");
      return { ok: true, data: { recipes: recipesWithMeta(state, community, payload.keyword) } };
    }
    if (action === "getRecipeDetail") {
      me = requireLoginUser(state, openid);
      syncUserActiveContext(state, me);
      const recipe = state.recipes.find((x) => x.id === payload.id);
      if (!recipe) return { ok: true, data: null };
      const author = state.users.find((u) => u.id === recipe.authorId);
      const activeFamilyId = me.activeFamilyId || me.familyId || "";
      const sameFamily = !!author && !!activeFamilyId && author.familyId === activeFamilyId;
      if (recipe.visibility !== "community" && !sameFamily && !isSuperAdmin(state, me)) throw new Error("无权限查看该食谱");
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
          isOwner: recipe.authorId === me.id,
          visibility: recipe.visibility || "family"
        }
      };
    }
    if (action === "saveRecipe") {
      me = requireLoginUser(state, openid);
      syncUserActiveContext(state, me);
      if (!me.activeFamilyId) throw new Error("请先加入家庭后再创建食谱");
      const now = new Date().toISOString();
      const visibility = payload.visibility === "community" ? "community" : "family";
      if (payload.id) {
        const i = state.recipes.findIndex((r) => r.id === payload.id);
        if (i < 0) throw new Error("食谱不存在");
        state.recipes[i] = {
          ...state.recipes[i],
          ...payload,
          visibility,
          authorId: state.recipes[i].authorId,
          familyId: state.recipes[i].familyId || me.activeFamilyId,
          updatedAt: now
        };
      } else {
        state.recipes.unshift({ ...payload, visibility, familyId: me.activeFamilyId, id: uid("r"), authorId: me.id, comments: [], createdAt: now, updatedAt: now });
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
      me = requireLoginUser(state, openid);
      syncUserActiveContext(state, me);
      const superAdmin = isSuperAdmin(state, me);
      if (superAdmin) {
        return {
          ok: true,
          data: {
            isSuperAdmin: true,
            currentUserId: me.id,
            myMemberships: membershipsOfUser(state, me.id),
            families: (state.families || []).map((f) => familyWithMembers(state, f))
          }
        };
      }
      const family = familyById(state, me.activeFamilyId || me.familyId);
      if (!family) {
        return {
          ok: true, data: {
            isSuperAdmin: false, currentUserId: me.id, family: null, myRole: "member", canManage: false, canDissolve: false, myMemberships: []
          }
        };
      }
      const myRole = familyRoleOf(family, me.id);
      return {
        ok: true,
        data: {
          isSuperAdmin: false,
          currentUserId: me.id,
          family: familyWithMembers(state, family),
          myRole,
          myMemberships: membershipsOfUser(state, me.id),
          canManage: canManageFamily(state, family, me.id, me),
          canDissolve: canDissolveFamily(state, family, me.id, me)
        }
      };
    }
    if (action === "createFamily") {
      me = requireLoginUser(state, openid);
      const name = (payload.name || "").trim();
      if (!name) throw new Error("请输入家庭名称");
      const f = { id: uid("f"), name, inviteCode: inviteCode(), ownerId: me.id, adminIds: [], memberIds: [me.id] };
      state.families.push(f);
      me.activeFamilyId = f.id;
      syncUserActiveContext(state, me);
      await persist(state);
      return { ok: true, data: { success: true, familyId: f.id } };
    }
    if (action === "joinFamilyByInvite") {
      me = requireLoginUser(state, openid);
      const code = (payload.code || "").trim();
      if (!code) throw new Error("请输入邀请码");
      const target = (state.families || []).find((f) => f.inviteCode === code);
      if (!target) throw new Error("邀请码错误");
      if ((target.memberIds || []).includes(me.id)) {
        me.activeFamilyId = target.id;
        syncUserActiveContext(state, me);
        await persist(state);
        return { ok: true, data: { success: true } };
      }
      if (!target.memberIds.includes(me.id)) target.memberIds.push(me.id);
      me.activeFamilyId = target.id;
      syncUserActiveContext(state, me);
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "switchActiveFamily") {
      me = requireLoginUser(state, openid);
      const family = familyById(state, payload.familyId);
      if (!family) throw new Error("家庭不存在");
      if (!(family.memberIds || []).includes(me.id)) throw new Error("你不在该家庭中");
      me.activeFamilyId = family.id;
      syncUserActiveContext(state, me);
      await persist(state);
      return { ok: true, data: { success: true, familyId: family.id, familyRole: me.familyRole } };
    }
    if (action === "updateFamilyName") {
      me = requireLoginUser(state, openid);
      const family = familyById(state, payload.familyId || me.activeFamilyId || me.familyId);
      if (!family) throw new Error("家庭不存在");
      if (!canManageFamily(state, family, me.id, me)) throw new Error("无权限");
      family.name = (payload.name || "").trim();
      if (!family.name) throw new Error("家庭名称不能为空");
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "updateProfile") {
      me = requireLoginUser(state, openid);
      const name = (payload.nickname || "").trim();
      const phone = (payload.phone || "").trim();
      if (name) me.name = name;
      if (phone) {
        if (!validPhone(phone)) throw new Error("手机号需为11位数字");
        const existed = userByPhone(state, phone);
        if (existed && existed.id !== me.id) throw new Error("手机号已被占用");
        me.phone = phone;
      }
      await persist(state);
      return { ok: true, data: { user: safeUser(me), isSuperAdmin: isSuperAdmin(state, me) } };
    }
    if (action === "setFamilyAdmin") {
      me = requireLoginUser(state, openid);
      const family = familyById(state, payload.familyId || me.activeFamilyId || me.familyId);
      if (!family) throw new Error("家庭不存在");
      if (!(isSuperAdmin(state, me) || family.ownerId === me.id)) throw new Error("无权限");
      if (payload.userId === family.ownerId) return { ok: true, data: { success: true } };
      if (!(family.memberIds || []).includes(payload.userId)) throw new Error("成员不存在");
      family.adminIds = (family.adminIds || []).filter((id) => id !== payload.userId);
      if (payload.isAdmin) family.adminIds.push(payload.userId);
      const target = state.users.find((u) => u.id === payload.userId);
      if (target) syncUserActiveContext(state, target);
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "removeFamilyMember") {
      me = requireLoginUser(state, openid);
      const family = familyById(state, payload.familyId || me.activeFamilyId || me.familyId);
      if (!family) throw new Error("家庭不存在");
      if (!canManageFamily(state, family, me.id, me)) throw new Error("无权限");
      if (payload.userId === family.ownerId) throw new Error("不能移除家庭创建者");
      family.memberIds = (family.memberIds || []).filter((id) => id !== payload.userId);
      family.adminIds = (family.adminIds || []).filter((id) => id !== payload.userId);
      const target = state.users.find((u) => u.id === payload.userId);
      if (target) {
        syncUserActiveContext(state, target);
      }
      await persist(state);
      return { ok: true, data: { success: true } };
    }
    if (action === "dissolveFamily") {
      me = requireLoginUser(state, openid);
      const family = familyById(state, payload.familyId || me.activeFamilyId || me.familyId);
      if (!family) throw new Error("家庭不存在");
      if (!canDissolveFamily(state, family, me.id, me)) throw new Error("无权限");
      state.families = (state.families || []).filter((f) => f.id !== family.id);
      state.users.forEach((u) => {
        syncUserActiveContext(state, u);
      });
      if (state.family && state.family.id === family.id) state.family = null;
      await persist(state);
      return { ok: true, data: { success: true } };
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

    throw new Error("未知接口动作: " + action);
  } catch (error) {
    return { ok: false, message: error.message || "服务异常" };
  }
};
