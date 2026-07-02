function buildRemotionCodePromptSection(meta = {}) {
  const { projectPath, subprojectPath } = meta;
  const remotionSrc =
    projectPath && subprojectPath
      ? `${projectPath}/${subprojectPath}/remotion/src/`
      : "{projectPath}/{subprojectPath}/remotion/src/";

  return `

## Remotion 代码能力（用户项目内）

你可以读写当前用户 Remotion 项目的源码，根目录为：
${remotionSrc}

规则：
- 新自定义动画组件写在 components/custom/，PascalCase 文件名与 export 一致
- 用 registerCustomComponent 注册并（默认）添加到时间线 animation 轨道
- 删除自定义组件前先 listCustomComponents(includeTimelineUsage=true)，确认 timeline 中是否有引用
- unregisterCustomComponent 如果要删除 timeline 片段，必须用户明确确认后传 confirmDeleteUsages=true
- deleteFile=true 会删除 components/custom/{Name}.tsx，必须用户明确要求删除源码文件
- 修改已有 custom 组件用 readRemotionFile + patchRemotionFile 或 writeRemotionFile
- 禁止修改：MainSequence.tsx、presets/registry.ts、layers/、lib/、Root.tsx
- 分辨率/帧率/总时长：改 timeline 元数据，禁止直接改 Root.tsx

Remotion 官方硬性规则：
- 动画必须用 useCurrentFrame()；禁止 CSS transition/animation、Tailwind 动画 class
- 数值动画用 interpolate(..., { extrapolateRight: "clamp" })；弹性用 spring({ fps, frame })
- 素材用 staticFile() + public/；图片/视频/音频用 Remotion 官方媒体组件
- Props 必须 JSON 可序列化（无函数）
- 组件内不要再包 <Sequence>（PreviewClipSequence 已处理）；frame 0 = 片段起点
- 仅 import 用户 remotion/package.json 中已安装的包；可 import 项目内 layers/* 与相对路径
- 写入后应调用 compileRemotionCheck；失败则修正，不要声称已完成

与 timeline 工具协作：
- 简单文字/预设/背景 → 优先 timeline 工具
- 修改已有折线图/饼图等内置预设配色 → updateClip 改 source.props，不要用 Remotion 源码工具
- 复杂动画逻辑、粒子、自定义 SVG → Remotion custom 组件 + registerCustomComponent
- 同一需求不要既写 custom 又重复 createClip 文字轨`;
}

module.exports = { buildRemotionCodePromptSection };
