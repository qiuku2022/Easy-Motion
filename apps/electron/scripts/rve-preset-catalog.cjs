/** @file Metadata for reactvideoeditor/remotion-templates (81 components, MIT) */

function entry(file, name, description, category, durationInFrames = 90) {
  const base = file.replace(/\.tsx$/, "");
  const parts = base.split("-");
  const pascal = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
  return {
    file: `${base}.tsx`,
    component: `Rve${pascal}`,
    id: `rve-${base}`,
    name,
    description,
    category,
    durationInFrames,
  };
}

/** @type {ReturnType<typeof entry>[]} */
const RVE_PRESET_CATALOG = [
  // Charts & Data
  entry("chart-animation", "柱状图动画", "SVG 柱状图错峰生长", "data-chart"),
  entry("line-chart", "折线图", "折线从左向右绘制", "data-chart"),
  entry("pie-chart", "饼图", "扇区依次显现", "data-chart"),
  entry("donut-chart", "环形图", "圆环分段动画", "data-chart"),
  entry("area-chart", "面积图", "渐变面积揭示", "data-chart"),
  entry("progress-bars", "进度条组", "多组水平进度条", "data-chart"),
  entry("stat-counter", "数字统计", "大数字递增计数", "data-chart"),
  entry("comparison-chart", "对比图表", "前后指标对比", "data-chart"),
  entry("circular-progress", "环形进度", "圆环进度百分比", "data-chart"),

  // Text
  entry("animated-text", "逐字动画", "字符依次弹入", "title"),
  entry("bounce-text", "弹跳文字", "弹簧弹跳标题", "title"),
  entry("bubble-pop-text", "气泡文字", "字符气泡弹出", "title"),
  entry("floating-bubble-text", "浮动标签", "正弦波漂浮文字", "title"),
  entry("glitch-text", "故障文字", "RGB 分离故障效果", "title"),
  entry("popping-text", "缩放弹出", "弹簧缩放标题", "title"),
  entry("pulsing-text", "脉冲文字", "持续缩放脉冲", "title"),
  entry("slide-text", "滑入文字", "方向滑入标题", "title"),
  entry("typewriter-subtitle", "打字机字幕", "逐字打字光标", "title"),

  // Content Animation
  entry("animated-list", "列表入场", "列表项错峰出现", "content"),
  entry("card-flip", "卡片翻转", "3D 正反面翻转", "content"),
  entry("countdown-timer", "倒计时", "5-4-3-2-1-GO", "content"),
  entry("notification-pop", "通知弹出", "堆叠通知气泡", "content"),
  entry("particle-explosion", "粒子爆炸", "中心粒子爆发", "content"),
  entry("progress-steps", "步骤进度", "步骤指示器填充", "content"),
  entry("rotating-carousel", "旋转走马灯", "3D 卡片旋转", "content"),
  entry("sound-wave", "声波可视化", "音频波形条", "content"),
  entry("text-highlight", "文字高亮", "逐词高亮强调", "content"),

  // Background
  entry("bokeh-circles", "景深光斑", "漂浮柔焦光斑", "background"),
  entry("geometric-patterns", "几何图案", "旋转缩放几何形", "background"),
  entry("gradient-shift", "渐变漂移", "环境渐变缓变", "background"),
  entry("grid-pulse", "网格脉冲", "点阵涟漪波", "background"),
  entry("liquid-wave", "液体波浪", "流动 SVG 波浪", "background"),
  entry("matrix-rain", "矩阵雨", "代码雨下落", "background"),
  entry("noise-grain", "胶片颗粒", "细微噪点覆盖", "background"),
  entry("pixel-transition", "像素过渡", "像素网格揭示", "background"),
  entry("starfield", "星空穿梭", "飞行星空效果", "background"),

  // Cinematic
  entry("camera-shake", "镜头抖动", "衰减冲击抖动", "content"),
  entry("film-burn", "胶片灼烧", "暖色光晕叠加", "content"),
  entry("ken-burns", "肯伯恩斯", "图片平移缩放", "content"),
  entry("letterbox-reveal", "宽银幕揭示", "黑边收拢揭示", "content"),
  entry("parallax-pan", "视差平移", "多层视差滚动", "content"),
  entry("spotlight-reveal", "聚光灯揭示", "圆形遮罩扩展", "content"),
  entry("vignette-pulse", "暗角脉冲", "边缘暗化脉冲", "content"),
  entry("whip-pan", "甩镜平移", "快速水平甩镜", "content"),
  entry("zoom-pulse", "缩放脉冲", "节奏性缩放", "content"),

  // Transition
  entry("blinds-transition", "百叶窗转场", "水平百叶窗", "transition", 75),
  entry("clock-wipe", "时钟擦除", "径向时钟扫过", "transition", 75),
  entry("cross-dissolve", "交叉溶解", "经典叠化转场", "transition", 75),
  entry("fade-through-black", "黑场过渡", "经黑场切换", "transition", 75),
  entry("iris-transition", "光圈转场", "圆形光圈开合", "transition", 75),
  entry("morph-transition", "形变转场", "缩放淡入形变", "transition", 75),
  entry("push-transition", "推挤转场", "新场景推走旧场景", "transition", 75),
  entry("slide-wipe", "滑动擦除", "弹簧面板滑动", "transition", 75),
  entry("zoom-through", "穿越缩放", "缩放穿越揭示", "transition", 75),

  // Logo & Branding
  entry("logo-blur-reveal", "Logo 模糊揭示", "对焦式清晰化", "intro-outro"),
  entry("logo-bounce-drop", "Logo 弹跳落下", "自上落下弹跳", "intro-outro"),
  entry("logo-fade-reveal", "Logo 淡入", "淡入微缩放", "intro-outro"),
  entry("logo-glitch-reveal", "Logo 故障揭示", "故障衰减至清晰", "intro-outro"),
  entry("logo-scale-rotate", "Logo 旋转缩放", "旋转缩放入场", "intro-outro"),
  entry("logo-spin-reveal", "Logo 3D 旋转", "Y 轴旋转揭示", "intro-outro"),
  entry("logo-split-reveal", "Logo 分裂揭示", "左右两半展开", "intro-outro"),
  entry("logo-stroke-draw", "Logo 描边绘制", "SVG 描边动画", "intro-outro"),
  entry("logo-typewriter", "Logo 打字机", "图标 + 打字名称", "intro-outro"),

  // Intro & Outro
  entry("chapter-title", "章节标题", "章节号与延伸线", "intro-outro"),
  entry("cinematic-title-intro", "电影感标题", "标题弹入下划线", "intro-outro"),
  entry("countdown-intro", "开场倒计时", "圆环 3-2-1-GO", "intro-outro"),
  entry("credits-roll", "演职员表", "滚动片尾字幕", "intro-outro"),
  entry("end-card", "片尾卡片", "订阅 CTA 片尾", "intro-outro"),
  entry("lower-third", "下三分之一", "新闻风格姓名条", "intro-outro"),
  entry("quote-card", "引用卡片", "名言引用动画", "intro-outro"),
  entry("subscribe-reminder", "订阅提醒", "浮动订阅提示", "intro-outro"),
  entry("title-split", "标题汇合", "分裂文字汇合", "intro-outro"),

  // Image & Media
  entry("gallery-grid", "画廊网格", "2×3 网格错峰", "social-media"),
  entry("image-carousel", "图片轮播", "水平滑动聚焦", "social-media"),
  entry("image-comparison-slider", "对比滑块", "前后对比滑杆", "social-media"),
  entry("image-zoom-reveal", "图片缩放揭示", "拉焦缩放揭示", "social-media"),
  entry("masonry-gallery", "瀑布流画廊", "瀑布流错峰", "social-media"),
  entry("photo-stack", "照片堆叠", "重叠旋转相框", "social-media"),
  entry("picture-in-picture", "画中画", "PiP 布局", "social-media"),
  entry("polaroid-frame", "拍立得相框", "拍立得落下", "social-media"),
  entry("split-screen", "分屏", "双画面拼合", "social-media"),
];

if (RVE_PRESET_CATALOG.length !== 81) {
  throw new Error(`Expected 81 presets, got ${RVE_PRESET_CATALOG.length}`);
}

module.exports = { RVE_PRESET_CATALOG };
