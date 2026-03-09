# 用户头像功能更新说明

## 需要修改的文件

### 1. profile.wxml 修改

#### 修改位置1：头像显示区域（约第11-18行）
**原代码：**
```xml
<view class="header-content">
  <open-data class="user-avatar" type="userAvatarUrl"></open-data>
  <view class="user-info">
    <open-data class="user-nick" type="userNickName"></open-data>
    <view class="user-role">...</view>
  </view>
```

**修改为：**
```xml
<view class="header-content">
  <view class="avatar-wrapper" bindtap="chooseAvatar">
    <image wx:if="{{userAvatar}}" class="user-avatar" src="{{userAvatar}}" mode="aspectFill"></image>
    <open-data wx:else class="user-avatar" type="userAvatarUrl"></open-data>
    <view class="avatar-edit-icon">
      <text>📷</text>
    </view>
  </view>
  <view class="user-info">
    <view class="user-nick">{{editNickname || '未设置昵称'}}</view>
    <view class="user-role">...</view>
  </view>
```

#### 修改位置2：编辑资料弹窗（约第94行后）
在 modal-body 的第一个 form-group 之前添加：

```xml
<view class="form-group avatar-group">
  <text class="form-label">头像</text>
  <view class="avatar-edit-section" bindtap="chooseAvatar">
    <image wx:if="{{userAvatar}}" class="avatar-preview" src="{{userAvatar}}" mode="aspectFill"></image>
    <open-data wx:else class="avatar-preview" type="userAvatarUrl"></open-data>
    <view class="avatar-change-btn">
      <text>📷 更换头像</text>
    </view>
  </view>
</view>
```

---

### 2. profile.wxss 修改

#### 修改位置1：user-avatar 样式（约第29行）
**原代码：**
```css
.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 4rpx solid #fff;
  margin-right: 20rpx;
  background: #fff;
}
```

**修改为：**
```css
.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 20rpx;  /* 改为圆角矩形 */
  border: 4rpx solid #fff;
  background: #fff;
}

.avatar-wrapper {
  position: relative;
  margin-right: 20rpx;
}

.avatar-edit-icon {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 40rpx;
  height: 40rpx;
  background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  border: 3rpx solid #fff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.15);
}
```

#### 修改位置2：user-nick 样式（约第48行）
**原代码：**
```css
.user-nick {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-brown-50);
  margin-bottom: 8rpx;
}
```

**修改为：**
```css
.user-nick {
  font-size: 36rpx;
  font-weight: 700;
  color: #fff;  /* 改为白色 */
  margin-bottom: 8rpx;
}
```

#### 修改位置3：member-avatar 样式（约第121行）
**原代码：**
```css
.member-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 2rpx solid var(--color-orange-300);
  background: #fff;
}
```

**修改为：**
```css
.member-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 12rpx;  /* 改为圆角矩形 */
  border: 2rpx solid var(--color-orange-300);
  background: #fff;
  overflow: hidden;
}

.member-avatar open-data {
  width: 100%;
  height: 100%;
}
```

#### 在文件末尾添加新样式：
```css
/* 头像编辑区 */
.avatar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-edit-section {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx;
}

.avatar-preview {
  width: 160rpx;
  height: 160rpx;
  border-radius: 24rpx;
  border: 3rpx solid #FFE8D6;
  background: #FFF8F3;
}

.avatar-change-btn {
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #F59E0B 0%, #F97316 100%);
  color: #fff;
  font-size: 24rpx;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(245, 158, 11, 0.3);
}
```

---

### 3. profile.js 修改

#### 修改位置1：data 添加字段（约第7行）
在 data 中添加：
```javascript
userAvatar: "",
```

#### 修改位置2：reload 方法（约第42行）
在 setData 中添加：
```javascript
userAvatar: (session.user && session.user.avatar) || "",
```

#### 修改位置3：添加选择头像方法（约第57行，onInput 下方）
```javascript
// 选择头像
async chooseAvatar() {
  try {
    const res = await wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera']
    });
    
    const tempFilePath = res.tempFilePaths[0];
    
    wx.showLoading({ title: '上传中...', mask: true });
    
    // 上传到云存储
    const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath
    });
    
    wx.hideLoading();
    
    // 保存头像URL
    this.setData({ userAvatar: uploadRes.fileID });
    wx.showToast({ title: '上传成功', icon: 'success' });
    
  } catch (error) {
    wx.hideLoading();
    console.error('上传头像失败:', error);
    wx.showToast({ title: '上传失败，请重试', icon: 'none' });
  }
},
```

#### 修改位置4：saveProfile 方法（约第70行）
**原代码：**
```javascript
await api.updateProfile(this.data.editNickname.trim(), this.data.editPhone.trim());
```

**修改为：**
```javascript
await api.updateProfile(this.data.editNickname.trim(), this.data.editPhone.trim(), this.data.userAvatar);
```

---

## 修改完成后效果

1. **用户页头像**：圆角正方形，右下角有相机图标
2. **点击头像**：可以选择图片并上传
3. **编辑资料弹窗**：包含头像编辑区域
4. **家庭成员头像**：也改为圆角正方形

---

## 注意事项

1. 需要确保小程序已开通云存储
2. 需要修改 `utils/api.js` 中的 `updateProfile` 方法，添加 avatar 参数支持
3. 后端 API 也需要支持保存 avatar 字段
