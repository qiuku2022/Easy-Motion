/**
 * Vendored from av/remotion-bits (MIT)
 * https://github.com/av/remotion-bits
 * Source: docs/src/bits/examples/code-block/TypingCodeBlock.tsx
 */

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { CodeBlock, useViewportRect } from "remotion-bits";

export function BitsTypingCodeBlock(_props: Record<string, unknown> = {}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rect = useViewportRect();

  const fullCode = `const App = () => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        document.title = \`Count: \${count}\`;
    }, [count]);

    return (
        <button onClick={() => setCount(c => c + 1)}>
             Clicked {count} times
        </button>
    );
};`;

  const typingSpeed = 0.3; // frames per char
  const charIndex = Math.floor(frame / typingSpeed);
  const currentCode = fullCode.slice(0, charIndex);

  // Blink cursor
  const showCursor = Math.floor(frame / 15) % 2 === 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#1e1e1e', alignItems: 'center', justifyContent: 'center' }}>
      <CodeBlock
        code={currentCode + (showCursor ? "|" : " ")}
        language="typescript"
        showLineNumbers
        theme="dark"
        fontSize={rect.width * 0.02}
        style={{ width: '80%' }}
      />
    </AbsoluteFill>
  );
};
