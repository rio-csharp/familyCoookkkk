# 后端 API 更新说明 - 支持头像上传

## 文件：cloudfunctions/api/index.js

### 修改位置：updateProfile action（约第588-601行）

**原代码：**
```javascript
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
```

**修改为：**
```javascript
if (action === "updateProfile") {
  me = requireLoginUser(state, openid);
  const name = (payload.nickname || "").trim();
  const phone = (payload.phone || "").trim();
  const avatar = (payload.avatar || "").trim();  // 新增：获取头像参数
  
  if (name) me.name = name;
  if (phone) {
    if (!validPhone(phone)) throw new Error("手机号需为11位数字");
    const existed = userByPhone(state, phone);
    if (existed && existed.id !== me.id) throw new Error("手机号已被占用");
    me.phone = phone;
  }
  if (avatar) me.avatar = avatar;  // 新增：保存头像URL
  
  await persist(state);
  return { ok: true, data: { user: safeUser(me), isSuperAdmin: isSuperAdmin(state, me) } };
}
```

## 修改说明

添加了对 `avatar` 字段的支持：
1. 从 payload 中获取 avatar 参数
2. 如果提供了 avatar，则保存到用户对象的 avatar 字段
3. 头像 URL 是云存储的 fileID，由前端上传后传递过来

## 测试建议

测试流程：
1. 在小程序中上传头像
2. 检查云存储是否成功保存图片到 `avatars/` 目录
3. 检查数据库中的用户对象是否包含 avatar 字段
4. 刷新页面后头像是否正常显示
