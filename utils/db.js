function uid(prefix) {
  return prefix + "_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
}

const KEY = "family_recipe_platform_data";

function defaults() {
  const now = new Date().toISOString();
  return {
    currentUserId: "u1",
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
    ]
  };
}

function initData() {
  if (!wx.getStorageSync(KEY)) wx.setStorageSync(KEY, defaults());
}
function getData() { return wx.getStorageSync(KEY) || defaults(); }
function saveData(d) { wx.setStorageSync(KEY, d); }
function getCurrentUser(d) { const x = d || getData(); return x.users.find(u => u.id === x.currentUserId) || x.users[0]; }

function getFamily() {
  const d = getData();
  return { ...d.family, members: d.users.filter(u => d.family.memberIds.includes(u.id)) };
}

function updateFamilyName(name) {
  const d = getData();
  d.family.name = name;
  saveData(d);
}

function addUser(name, role, joinFamily) {
  const d = getData();
  const u = { id: uid("u"), name, role: role || "成员" };
  d.users.push(u);
  if (joinFamily && !d.family.memberIds.includes(u.id)) d.family.memberIds.push(u.id);
  saveData(d);
}

function switchUser(id) {
  const d = getData();
  d.currentUserId = id;
  saveData(d);
}

function likesCount(d, rid) {
  return Object.values(d.recipeLikesByUser).filter(ids => (ids || []).includes(rid)).length;
}
function favsCount(d, rid) {
  return Object.values(d.recipeFavoritesByUser).filter(ids => (ids || []).includes(rid)).length;
}
function userName(d, uid0) {
  const u = d.users.find(x => x.id === uid0);
  return u ? u.name : "未知";
}

function getRecipes(keyword) {
  const d = getData();
  const key = (keyword || "").trim().toLowerCase();
  return d.recipes.filter(r => {
    if (!key) return true;
    return r.title.toLowerCase().includes(key) || r.description.toLowerCase().includes(key) || r.tags.some(t => t.toLowerCase().includes(key));
  }).map(r => ({
    ...r,
    authorName: userName(d, r.authorId),
    likeCount: likesCount(d, r.id),
    favoriteCount: favsCount(d, r.id)
  }));
}

function getRecipeById(id) {
  const d = getData();
  const r = d.recipes.find(x => x.id === id);
  if (!r) return null;
  const cu = getCurrentUser(d);
  const liked = (d.recipeLikesByUser[cu.id] || []).includes(id);
  const favorited = (d.recipeFavoritesByUser[cu.id] || []).includes(id);
  return {
    ...r,
    authorName: userName(d, r.authorId),
    comments: r.comments.map(c => ({ ...c, userName: userName(d, c.userId) })),
    likeCount: likesCount(d, id),
    favoriteCount: favsCount(d, id),
    liked,
    favorited,
    isOwner: r.authorId === cu.id
  };
}

function saveRecipe(payload) {
  const d = getData();
  const now = new Date().toISOString();
  const cu = getCurrentUser(d);
  if (payload.id) {
    const i = d.recipes.findIndex(r => r.id === payload.id);
    d.recipes[i] = { ...d.recipes[i], ...payload, authorId: d.recipes[i].authorId, updatedAt: now };
  } else {
    d.recipes.unshift({ ...payload, id: uid("r"), authorId: cu.id, comments: [], createdAt: now, updatedAt: now });
  }
  saveData(d);
}

function deleteRecipe(id) {
  const d = getData();
  d.recipes = d.recipes.filter(r => r.id !== id);
  Object.keys(d.recipeLikesByUser).forEach(k => d.recipeLikesByUser[k] = (d.recipeLikesByUser[k] || []).filter(x => x !== id));
  Object.keys(d.recipeFavoritesByUser).forEach(k => d.recipeFavoritesByUser[k] = (d.recipeFavoritesByUser[k] || []).filter(x => x !== id));
  saveData(d);
}

function toggleLike(id) {
  const d = getData();
  const cu = getCurrentUser(d);
  const set = new Set(d.recipeLikesByUser[cu.id] || []);
  if (set.has(id)) set.delete(id); else set.add(id);
  d.recipeLikesByUser[cu.id] = Array.from(set);
  saveData(d);
}

function toggleFavorite(id) {
  const d = getData();
  const cu = getCurrentUser(d);
  const set = new Set(d.recipeFavoritesByUser[cu.id] || []);
  if (set.has(id)) set.delete(id); else set.add(id);
  d.recipeFavoritesByUser[cu.id] = Array.from(set);
  saveData(d);
}

function addComment(recipeId, content) {
  const d = getData();
  const cu = getCurrentUser(d);
  const r = d.recipes.find(x => x.id === recipeId);
  r.comments.push({ id: uid("c"), userId: cu.id, content, createdAt: new Date().toISOString() });
  r.updatedAt = new Date().toISOString();
  saveData(d);
}

function getTools() { return getData().tools; }
function addShoppingItem(text) { const d = getData(); d.tools.shoppingList.push(text); saveData(d); }
function removeShoppingItem(index) { const d = getData(); d.tools.shoppingList.splice(index, 1); saveData(d); }

module.exports = {
  initData, getData, getCurrentUser, getFamily, updateFamilyName, addUser, switchUser,
  getRecipes, getRecipeById, saveRecipe, deleteRecipe, toggleLike, toggleFavorite, addComment,
  getTools, addShoppingItem, removeShoppingItem
};
