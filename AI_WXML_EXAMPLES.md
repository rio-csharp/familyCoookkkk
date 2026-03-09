<!-- 食谱编辑页面: recipe-edit.wxml 示例集成 -->

<!-- 原有的标题、描述等输入框 -->

<!-- AI 优化按钮 (在保存按钮之前) -->
<view class="button-group">
  <button 
    class="btn btn-ai"
    bindtap="aiOptimizeRecipe"
    disabled="{{aiOptimizing}}"
  >
    ✨ {{aiOptimizing ? 'AI优化中...' : 'AI优化食谱'}}
  </button>
  
  <button 
    class="btn btn-save"
    bindtap="save"
    disabled="{{saving}}"
  >
    💾 {{saving ? '保存中...' : '保存食谱'}}
  </button>
</view>

<!-- 对应的 WXSS 样式 -->
<style>
.button-group {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #fff;
}

.btn {
  flex: 1;
  padding: 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  border: none;
}

.btn-ai {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-ai:active {
  opacity: 0.85;
}

.btn-save {
  background: #ff8a3d;
  color: white;
}

.btn-save:active {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
}
</style>

<!-- ================================== -->
<!-- 工具页面: tools.wxml 示例集成 -->

<view class="tools-container">
  <!-- 购物清单等原有功能 -->
  
  <!-- AI 冰箱推荐新功能 -->
  <view class="feature-section">
    <button 
      class="feature-btn ai-recommend-btn"
      bindtap="toggleRecommendPanel"
    >
      🤖 冰箱推荐菜谱
    </button>
    
    <!-- AI 推荐面板 (折叠/展开) -->
    <view 
      class="recommend-panel"
      wx:if="{{showRecommend}}"
      animation="{{panelAnimation}}"
    >
      <!-- 面板头部 -->
      <view class="panel-header">
        <text class="panel-title">输入你有的食材</text>
        <text 
          class="close-btn"
          bindtap="toggleRecommendPanel"
        >✕</text>
      </view>
      
      <!-- 食材输入框 -->
      <textarea
        class="recommend-input"
        placeholder="输入食材，用逗号或空格分隔&#10;例如：番茄,鸡蛋,洋葱"
        value="{{recommendIngredients}}"
        bindinput="onInput"
        data-f="recommendIngredients"
        auto-height
      />
      
      <!-- 提示文字 -->
      <view class="input-hint">
        <text>💡 提示：越多食材，推荐越准确</text>
      </view>
      
      <!-- 推荐按钮 -->
      <button
        class="recommend-btn"
        bindtap="aiRecommendRecipes"
        disabled="{{recommendLoading || !recommendIngredients.trim()}}"
      >
        {{recommendLoading ? '🔄 推荐中...' : '🚀 获取推荐'}}
      </button>
      
      <!-- 推荐结果列表 -->
      <view wx:if="{{recommendList.length > 0}}" class="recommend-result">
        <view class="result-header">
          <text>🎯 推荐菜谱 (共 {{recommendList.length}} 个)</text>
        </view>
        
        <view 
          class="recipe-card"
          wx:for="{{recommendList}}"
          wx:key="title"
        >
          <view class="recipe-badge">{{index + 1}}</view>
          
          <view class="recipe-content">
            <view class="recipe-title">{{item.title}}</view>
            <view class="recipe-desc">{{item.description}}</view>
            
            <view 
              class="recipe-extra"
              wx:if="{{item.additionalIngredients && item.additionalIngredients.length}}"
            >
              <text class="extra-label">还需要：</text>
              <text class="extra-items">{{item.additionalIngredients.join('、')}}</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view wx:if="{{showRecommend && !recommendList.length && !recommendLoading}}" class="empty-state">
        <text class="empty-icon">👇</text>
        <text class="empty-text">输入食材后点击"获取推荐"</text>
      </view>
    </view>
  </view>
</view>

<!-- 工具页 WXSS 样式 -->
<style>
.tools-container {
  padding: 12px;
  background: #f5f5f5;
}

.feature-section {
  background: #fff;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
}

.feature-btn {
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 12px;
  margin: 0;
}

.feature-btn:active {
  opacity: 0.85;
}

/* 推荐面板样式 */
.recommend-panel {
  padding: 16px;
  background: #fff;
  border-top: 1px solid #eee;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.close-btn {
  font-size: 24px;
  color: #999;
  padding: 4px 8px;
}

/* 输入框样式 */
.recommend-input {
  width: 100%;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.5;
  background: #fafafa;
  margin-bottom: 8px;
  min-height: 80px;
}

.input-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 12px;
  padding: 0 4px;
}

/* 推荐按钮样式 */
.recommend-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  margin: 0 0 12px 0;
}

.recommend-btn:disabled {
  opacity: 0.5;
}

.recommend-btn:active:not([disabled]) {
  opacity: 0.85;
}

/* 结果样式 */
.recommend-result {
  margin-top: 12px;
}

.result-header {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 6px;
}

.recipe-card {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.recipe-badge {
  width: 32px;
  height: 32px;
  background: #667eea;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

.recipe-content {
  flex: 1;
}

.recipe-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 6px;
}

.recipe-desc {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
  margin-bottom: 8px;
}

.recipe-extra {
  font-size: 12px;
  color: #999;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.extra-label {
  font-weight: 600;
  color: #666;
}

.extra-items {
  color: #ff8a3d;
}

/* 空状态样式 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #999;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-text {
  font-size: 14px;
  color: #ccc;
}
</style>
