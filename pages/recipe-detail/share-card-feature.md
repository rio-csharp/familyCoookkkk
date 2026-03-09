# 食谱分享卡片生成功能

## 功能说明

当用户点击"📤 分享"按钮时，将生成一张精美的食谱卡片图片，用户可以保存到相册后分享到朋友圈、微信群等。

## 实现步骤

### 1. 修改 recipe-detail.wxml

在文件末尾 `</view>` 之前添加：

```xml
<!-- 分享卡片弹窗 -->
<view wx:if="{{showShareCard}}" class="share-modal" catchtap="closeShareCard">
  <view class="share-modal-content" catchtap="stopPropagation">
    <view class="share-modal-header">
      <text class="share-modal-title">分享卡片</text>
      <text class="share-modal-close" bindtap="closeShareCard">✕</text>
    </view>
    
    <!-- Canvas 用于生成卡片 -->
    <canvas 
      class="share-canvas" 
      canvas-id="shareCanvas" 
      type="2d" 
      id="shareCanvas"
    ></canvas>
    
    <!-- 预览图 -->
    <image 
      wx:if="{{shareCardImage}}" 
      class="share-preview" 
      src="{{shareCardImage}}" 
      mode="widthFix"
    ></image>
    
    <view class="share-actions">
      <button 
        wx:if="{{!shareCardImage}}" 
        class="btn-primary share-btn" 
        loading="{{generatingCard}}"
        bindtap="generateCard"
      >
        生成卡片
      </button>
      <button 
        wx:if="{{shareCardImage}}" 
        class="btn-primary share-btn" 
        bindtap="saveShareCard"
      >
        💾 保存到相册
      </button>
    </view>
  </view>
</view>
```

### 2. 修改 recipe-detail.wxss

在文件末尾添加：

```css
/* 分享弹窗 */
.share-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.share-modal-content {
  width: 90%;
  max-width: 600rpx;
  background: #fff;
  border-radius: 32rpx;
  padding: 40rpx;
}

.share-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}

.share-modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--color-brown-900);
}

.share-modal-close {
  font-size: 48rpx;
  color: var(--color-brown-400);
  line-height: 1;
  padding: 0 12rpx;
}

.share-canvas {
  width: 600rpx;
  height: 800rpx;
  position: fixed;
  left: -9999rpx;
  top: -9999rpx;
}

.share-preview {
  width: 100%;
  border-radius: 24rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.1);
  margin-bottom: 32rpx;
}

.share-actions {
  display: flex;
  gap: 20rpx;
}

.share-btn {
  flex: 1;
  height: 88rpx;
  font-size: 32rpx;
  border-radius: 24rpx;
}
```

### 3. 修改 recipe-detail.js

#### 3.1 在 data 中添加字段：

```javascript
data: { 
  id: "", 
  recipe: null, 
  comment: "", 
  loading: false, 
  errorText: "", 
  submitting: false,
  // 新增：分享卡片相关
  showShareCard: false,
  generatingCard: false,
  shareCardImage: ""
},
```

#### 3.2 修改 shareRecipe 方法：

```javascript
shareRecipe() {
  this.setData({ 
    showShareCard: true,
    shareCardImage: ""  // 重置图片
  });
},

closeShareCard() {
  this.setData({ showShareCard: false });
},

stopPropagation() {
  // 阻止事件冒泡
},
```

#### 3.3 添加生成卡片方法（在 shareRecipe 后面）：

```javascript
async generateCard() {
  const recipe = this.data.recipe;
  if (!recipe) return;
  
  this.setData({ generatingCard: true });
  
  try {
    // 获取 Canvas 上下文
    const query = wx.createSelectorQuery();
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        if (!res[0]) {
          wx.showToast({ title: 'Canvas初始化失败', icon: 'none' });
          this.setData({ generatingCard: false });
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getSystemInfoSync().pixelRatio;
        
        // 设置 Canvas 尺寸
        const width = 600;
        const height = 800;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
        
        // 绘制背景
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#FFF8F3');
        gradient.addColorStop(1, '#FFE8D6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 绘制顶部装饰条
        ctx.fillStyle = '#F97316';
        ctx.fillRect(0, 0, width, 120);
        
        // 绘制标题
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('家庭食谱分享', width / 2, 70);
        
        // 绘制封面图（如果有）
        let yOffset = 150;
        if (recipe.coverUrl) {
          try {
            const coverImage = canvas.createImage();
            await new Promise((resolve, reject) => {
              coverImage.onload = resolve;
              coverImage.onerror = reject;
              coverImage.src = recipe.coverUrl;
            });
            
            const imgWidth = width - 80;
            const imgHeight = 300;
            const x = 40;
            const y = yOffset;
            
            // 绘制圆角矩形背景
            this.drawRoundRect(ctx, x, y, imgWidth, imgHeight, 20);
            ctx.clip();
            ctx.drawImage(coverImage, x, y, imgWidth, imgHeight);
            ctx.restore();
            
            yOffset += imgHeight + 30;
          } catch (e) {
            console.error('封面图加载失败', e);
            yOffset += 0;
          }
        }
        
        // 绘制食谱标题
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 42px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(this.truncateText(recipe.title, 20), width / 2, yOffset);
        yOffset += 50;
        
        // 绘制作者
        ctx.fillStyle = '#92400E';
        ctx.font = '24px sans-serif';
        ctx.fillText(`👨‍🍳 ${recipe.authorName}`, width / 2, yOffset);
        yOffset += 60;
        
        // 绘制统计信息
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#A16207';
        const stats = `❤️ ${recipe.likeCount}  ⭐ ${recipe.favoriteCount}  💬 ${recipe.comments.length}`;
        ctx.fillText(stats, width / 2, yOffset);
        yOffset += 60;
        
        // 绘制食材（最多5个）
        ctx.textAlign = 'left';
        ctx.fillStyle = '#78350F';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('🥘 主要食材', 40, yOffset);
        yOffset += 40;
        
        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#92400E';
        const ingredients = recipe.ingredients.slice(0, 5);
        ingredients.forEach((ing, i) => {
          ctx.fillText(`• ${ing.name}：${ing.amount}`, 60, yOffset);
          yOffset += 36;
        });
        
        if (recipe.ingredients.length > 5) {
          ctx.fillStyle = '#A16207';
          ctx.fillText(`... 还有${recipe.ingredients.length - 5}种食材`, 60, yOffset);
          yOffset += 40;
        }
        
        // 绘制底部二维码提示
        yOffset = height - 80;
        ctx.textAlign = 'center';
        ctx.fillStyle = '#A16207';
        ctx.font = '22px sans-serif';
        ctx.fillText('长按保存图片，分享给家人朋友 💕', width / 2, yOffset);
        
        // 转换为图片
        wx.canvasToTempFilePath({
          canvas,
          success: (res) => {
            this.setData({ 
              shareCardImage: res.tempFilePath,
              generatingCard: false
            });
          },
          fail: (err) => {
            console.error('生成图片失败', err);
            wx.showToast({ title: '生成失败，请重试', icon: 'none' });
            this.setData({ generatingCard: false });
          }
        });
      });
  } catch (error) {
    console.error('生成卡片失败', error);
    wx.showToast({ title: '生成失败', icon: 'none' });
    this.setData({ generatingCard: false });
  }
},

// 辅助方法：绘制圆角矩形
drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2);
  ctx.lineTo(x + radius, y + height);
  ctx.arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI);
  ctx.lineTo(x, y + radius);
  ctx.arc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5);
  ctx.closePath();
},

// 辅助方法：截断文本
truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
},

// 保存到相册
saveShareCard() {
  wx.getSetting({
    success: (res) => {
      if (!res.authSetting['scope.writePhotosAlbum']) {
        wx.authorize({
          scope: 'scope.writePhotosAlbum',
          success: () => {
            this.doSaveImage();
          },
          fail: () => {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中开启相册权限',
              confirmText: '去设置',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting();
                }
              }
            });
          }
        });
      } else {
        this.doSaveImage();
      }
    }
  });
},

doSaveImage() {
  wx.saveImageToPhotosAlbum({
    filePath: this.data.shareCardImage,
    success: () => {
      wx.showToast({ title: '已保存到相册', icon: 'success' });
      this.setData({ showShareCard: false });
    },
    fail: (err) => {
      console.error('保存失败', err);
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  });
},
```

### 4. 功能说明

**卡片内容包括：**
1. 顶部橙色装饰条 + "家庭食谱分享"标题
2. 渐变背景（奶油色）
3. 食谱封面图（如果有）
4. 食谱标题 + 作者
5. 点赞/收藏/评论数统计
6. 主要食材列表（最多5个）
7. 底部分享提示文字

**用户操作流程：**
1. 点击"📤 分享"按钮
2. 弹出分享卡片弹窗
3. 点击"生成卡片"按钮
4. 显示生成的精美卡片预览
5. 点击"💾 保存到相册"
6. 保存成功后可以分享到朋友圈等

### 5. 技术要点

- 使用 Canvas 2D API 绘制卡片
- 支持封面图异步加载
- 使用渐变背景和圆角矩形美化
- 实现相册权限申请
- 响应式字体大小和布局

### 6. 后续优化建议

1. 可以添加小程序码，扫码直接打开食谱
2. 可以让用户选择不同的卡片模板
3. 可以添加更多装饰元素（图案、边框等）
4. 可以支持自定义卡片颜色主题
