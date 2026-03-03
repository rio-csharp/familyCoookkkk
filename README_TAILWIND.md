# Tailwind CSS 已配置完成！

## 使用方法

### 1. 安装依赖
在项目根目录打开终端，执行：
```bash
npm install
```

### 2. 编译 Tailwind CSS
```bash
# 单次编译
npm run build:tailwind

# 监听模式（自动编译）
npm run watch:tailwind
```

### 3. 在小程序中使用

编译完成后，`tailwind-built.css` 会自动生成，并在 `app.wxss` 中引入。

## 使用示例

在 WXML 中直接使用 Tailwind 类名：

```html
<!-- Flex 布局 -->
<view class="flex items-center justify-between gap-2">
  <text>左边</text>
  <text>右边</text>
</view>

<!-- 间距 -->
<view class="p-4 mt-2 mb-4">
  <text>内容</text>
</view>

<!-- 文字样式 -->
<text class="text-lg font-bold text-gray-800">标题</text>

<!-- 按钮 -->
<button class="bg-orange-500 text-white rounded px-4 py-2 hover:bg-orange-600">
  点击我
</button>
```

## 注意事项

1. **rpx 单位**：小程序使用 rpx，Tailwind 默认使用 rem。部分工具类可能需要调整。
2. **编译**：每次修改 WXML 后，需要重新编译 Tailwind CSS。
3. **大小写敏感**：WXML 中的类名区分大小写，建议使用 kebab-case。

## 常用类名映射

- Flex: `flex` `flex-row` `flex-col` `items-center` `justify-between`
- 间距: `p-2` `m-2` `mt-4` `mb-4` `px-4` `py-2` `gap-2`
- 文字: `text-sm` `text-lg` `font-bold` `text-gray-600`
- 颜色: `bg-white` `bg-orange-500` `text-black` `text-white`
- 圆角: `rounded` `rounded-lg` `rounded-full`
- 尺寸: `w-full` `h-10` `w-1/2`

## 和原有样式共存

原有的 WXSS 样式和 Tailwind 可以共存使用：
```html
<view class="card flex items-center">
  <text class="title">标题</text>
</view>
```
