## 腾讯混元 AI 集成指南

### 🎯 概述
本项目已集成腾讯混元 API 支持以下功能：
- **AI食谱优化**：优化食谱描述和烹饪步骤
- **AI食谱推荐**：基于食材推荐菜谱
- **AI问答**：回答烹饪相关问题

---

## 📋 前置准备

### 第1步：申请腾讯云账户和 API 密钥

1. 访问腾讯云官网：https://cloud.tencent.com/
2. 注册或登录账户
3. 进入 **腾讯混元 API 页面**：https://console.cloud.tencent.com/hunyuan
4. 开通服务（有免费额度）
5. 获取 **SecretID** 和 **SecretKey**

### 第2步：了解计费和免费额度

- **免费额度**：每月有一定免费Token数
- **价格示例**：约 0.01元/1000个Token（非常便宜）
- 查看详细定价：https://cloud.tencent.com/product/hunyuan/pricing

---

## 🔧 配置步骤

### 第3步：配置云函数环境变量

在微信开发者工具中：

1. 打开云函数目录：`cloudfunctions/api/`
2. **右键** → **云函数配置** → **编辑**

3. 添加以下环境变量：
```
HUNYUAN_SECRET_ID=你的SecretID
HUNYUAN_SECRET_KEY=你的SecretKey
```

**截图示例位置**：
- 开发者工具左侧 → 云函数 → api → 右键 → 云函数配置

4. 点击 **保存** 并 **重新上传**

### 第4步：重新上传云函数

1. 右键 `cloudfunctions/api` → **上传并部署：全量上传**
2. 等待部署完成（2-3分钟）
3. 在日志中查看是否有错误

---

## 📱 前端使用

### 食谱编辑页面集成

**文件**：`pages/recipe-edit/recipe-edit.wxml`

在保存按钮前添加 AI 优化按钮：

```wxml
<button 
  class="ai-optimize-btn" 
  bindtap="aiOptimizeRecipe"
  disabled="{{aiOptimizing}}"
>
  ✨ {{aiOptimizing ? 'AI优化中...' : 'AI优化食谱'}}
</button>
```

**JavaScript 已自动集成**，只需在 WXML 中添加按钮即可。

---

### 工具页面集成

**文件**：`pages/tools/tools.wxml`

在现有功能下添加 AI 推荐面板：

```wxml
<!-- AI推荐面板按钮 -->
<button bindtap="toggleRecommendPanel" class="feature-btn">
  🤖 冰箱推荐菜谱
</button>

<!-- AI推荐内容面板 -->
<view class="recommend-panel" wx:if="{{showRecommend}}">
  <view class="panel-header">
    <text>输入你有的食材，AI帮你推荐菜谱</text>
    <text class="close-btn" bindtap="toggleRecommendPanel">✕</text>
  </view>
  
  <textarea 
    placeholder="输入食材，用逗号或空格分隔，如：番茄 鸡蛋 洋葱"
    value="{{recommendIngredients}}"
    bindinput="onInput"
    data-f="recommendIngredients"
    class="recommend-input"
  />
  
  <button 
    bindtap="aiRecommendRecipes"
    disabled="{{recommendLoading}}"
    class="recommend-btn"
  >
    {{recommendLoading ? '推荐中...' : '获取推荐'}}
  </button>
  
  <!-- 推荐结果 -->
  <view class="recommend-result">
    <view class="recipe-item" wx:for="{{recommendList}}" wx:key="title">
      <view class="recipe-title">{{item.title}}</view>
      <view class="recipe-desc">{{item.description}}</view>
      <view class="recipe-extra" wx:if="{{item.additionalIngredients.length}}">
        需额外准备：{{item.additionalIngredients.join('、')}}
      </view>
    </view>
  </view>
</view>
```

**对应的 WXSS 样式**：

```wxss
/* AI推荐面板样式 */
.recommend-panel {
  background: #fff;
  border-top: 1px solid #eee;
  padding: 16px;
  gap: 12px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
}

.close-btn {
  font-size: 24px;
  color: #999;
}

.recommend-input {
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  height: 80px;
}

.recommend-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 12px;
  font-weight: 600;
}

.recommend-btn:disabled {
  opacity: 0.7;
}

.recommend-result {
  max-height: 300px;
  overflow-y: auto;
  gap: 10px;
  display: flex;
  flex-direction: column;
}

.recipe-item {
  background: #f9f9f9;
  border-radius: 6px;
  padding: 12px;
}

.recipe-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 6px;
  color: #333;
}

.recipe-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 6px;
}

.recipe-extra {
  font-size: 12px;
  color: #999;
}
```

---

## 🧪 测试方法

### 测试 AI 优化功能

1. 打开小程序
2. 在 **功能** → **菜单** 或首页点击 **创建菜谱** 或 **编辑菜谱**
3. 填写：
   - 标题：番茄炒蛋
   - 食材：番茄|2个、鸡蛋|3个
   - 步骤：
     - 番茄切块
     - 鸡蛋打散炒香
     - 加入番茄继续炒
4. 点击 **✨ AI优化食谱** 按钮
5. 等待结果（通常 2-5 秒）
6. 查看优化后的描述和步骤

### 测试 AI 推荐功能

1. 打开小程序进入 **功能** 页面
2. 点击 **🤖 冰箱推荐菜谱**
3. 输入食材：`番茄 鸡蛋 洋葱`
4. 点击 **获取推荐**
5. 查看 AI 推荐的菜谱

---

## 🐛 故障排查

### 问题1：调用 AI 时报错"API密钥无效"

**解决方案**：
1. 检查环境变量是否正确输入（无空格）
2. 确认密钥来自腾讯混元 API
3. 重新上传云函数

### 问题2：超时错误

**解决方案**：
1. API 首次调用较慢，等待 5-10 秒再试
2. 检查云函数超时时间（建议设置 60 秒以上）
3. 检查网络连接

### 问题3：令牌过期或额度不足

**解决方案**：
1. 进入 https://console.cloud.tencent.com/hunyuan 查看剩余额度
2. 充值或等待下月免费额度重置

### 问题4：云函数日志中看不到错误

**查看日志步骤**：
1. 微信开发者工具 → **云函数** → **api** 
2. 选择 **日志** 选项卡
3. 触发调用后查看实时日志

---

## 💡 使用建议

### 最佳实践

1. **在 UI 中提供反馈**：显示"AI优化中..."
2. **处理错误**：添加 try-catch 和用户友好的错误提示
3. **限制调用频率**：防止用户频繁点击导致超额费用
4. **缓存结果**：如果相同输入，可以缓存 AI 结果

### 成本控制

- 一条食谱优化通常消耗 100-200 Token
- 推荐食谱通常消耗 150-300 Token
- 月活 100 用户，每人月均调用 5 次 = 费用约 2-5 元

---

## 📚 相关资源

- [腾讯混元文档](https://cloud.tencent.com/document/product/1729)
- [API 参考](https://cloud.tencent.com/document/api/1729/104754)
- [微信云拓展文档](https://cloud.weixin.qq.com/)

---

## ✅ 集成完成清单

- [ ] 注册腾讯云账户
- [ ] 申请腾讯混元 API 并通过审核
- [ ] 获取 SecretID 和 SecretKey
- [ ] 配置云函数环境变量
- [ ] 重新上传云函数（api 目录）
- [ ] 在食谱编辑页 WXML 中添加 AI 优化按钮
- [ ] 在工具页 WXML 中添加 AI 推荐面板
- [ ] 测试 AI 功能（优化 + 推荐）
- [ ] 在云函数中打包并发布

---

**预计集成时间**：30 分钟

需要帮助？可以参考云函数代码注释或提交问题。
