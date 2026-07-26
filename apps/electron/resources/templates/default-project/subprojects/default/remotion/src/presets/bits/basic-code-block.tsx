/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/code-block/BasicCodeBlock.tsx
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import { CodeBlock, useViewportRect } from "remotion-bits";

export function BitsBasicCodeBlock(_props: Record<string, unknown> = {}) {
  const rect = useViewportRect();
  const code = `function hello() {
  console.log("Hello World");
  return true;
}`;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1e1e1e",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CodeBlock
        code={code}
        language="typescript"
        showLineNumbers
        transition={{
          duration: 30,
          lineStagger: 5,
          opacity: [0, 1],
          y: [10, 0],
        }}
        fontSize={rect.width * 0.025}
      />
    </AbsoluteFill>
  );
}
