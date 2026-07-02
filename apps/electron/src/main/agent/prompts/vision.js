const VISION_ANALYSIS_PROMPT = `分析用户提供的参考图片，提取视觉布局信息。

用户描述："{userText}"

请识别并输出以下 JSON 格式（只输出 JSON，不要 markdown 代码块）：
{
  "layout": {
    "type": "horizontal|vertical|grid|free",
    "elements": [
      {
        "type": "text|image|shape|chart",
        "position": { "x": "left|center|right|百分比", "y": "top|center|bottom|百分比" },
        "size": { "width": "像素或百分比", "height": "像素或百分比" },
        "style": {
          "color": "主色调十六进制",
          "fontFamily": "字体（如有）",
          "fontSize": "字号估计数字",
          "backgroundColor": "背景色十六进制"
        },
        "content": "文字内容（如有）",
        "zIndex": 0
      }
    ]
  },
  "animationHints": ["观察到的动画特征"],
  "styleTheme": {
    "colorPalette": ["#hex"],
    "typography": "整体字体风格",
    "mood": "整体氛围"
  }
}

注意事项：
- 位置估计使用相对坐标（百分比）优先于绝对像素
- 颜色提取为十六进制格式
- 如无法识别某元素，type 设为 "unknown"`;

function buildVisionAnalysisPrompt(userText = "") {
  return VISION_ANALYSIS_PROMPT.replace("{userText}", userText);
}

function buildVisionContextSection({ visualAnalysis, toolHints, layoutPlan }) {
  if (!visualAnalysis && !toolHints?.length && !layoutPlan?.operations?.length) return "";

  let section = "\n\n参考图片视觉分析结果：\n";
  if (visualAnalysis) {
    section += JSON.stringify(visualAnalysis, null, 2);
  }
  if (toolHints?.length) {
    section += `\n\n建议 createTrack/createClip 参数（按 zIndex 从低到高创建）：\n${JSON.stringify(toolHints, null, 2)}`;
    section +=
      "\n请根据以上分析创建轨道和片段，位置使用 transform.position，文字用 source.content，样式用 style。";
  }
  if (layoutPlan?.operations?.length) {
    section += `\n\n可执行视觉布局计划（优先使用 applyVisualLayout 落盘）：\n${JSON.stringify(layoutPlan, null, 2)}`;
    section +=
      "\n如果用户要求照着参考图生成布局，优先调用 applyVisualLayout；需要先预览影响时设置 dryRun=true。";
  }
  return section;
}

module.exports = {
  VISION_ANALYSIS_PROMPT,
  buildVisionAnalysisPrompt,
  buildVisionContextSection,
};
