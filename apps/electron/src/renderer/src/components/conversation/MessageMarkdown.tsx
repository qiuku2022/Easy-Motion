import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { HorizontalScrollRegion } from "@/components/conversation/HorizontalScrollRegion";
import { cn } from "@/lib/utils";

type MessageMarkdownVariant = "assistant" | "user" | "muted";

interface MessageMarkdownProps {
  content: string;
  variant?: MessageMarkdownVariant;
  className?: string;
}

function buildComponents(variant: MessageMarkdownVariant): Components {
  const isUser = variant === "user";
  const isMuted = variant === "muted";

  const codeBg = isUser
    ? "bg-primary-foreground/15"
    : isMuted
      ? "bg-background/40"
      : "bg-background/60";
  const preBg = isUser
    ? "border-primary-foreground/20 bg-primary-foreground/10"
    : isMuted
      ? "border-border/50 bg-background/40"
      : "border-border/60 bg-background/50";
  const borderColor = isUser ? "border-primary-foreground/20" : "border-border/60";

  return {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => (
      <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0">{children}</ol>
    ),
    li: ({ children }) => <li className="[overflow-wrap:anywhere]">{children}</li>,
    h1: ({ children }) => (
      <h1 className="mb-2 text-base font-semibold last:mb-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-2 text-sm font-semibold last:mb-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-1.5 text-sm font-medium last:mb-0">{children}</h3>
    ),
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    a: ({ href, children }) => (
      <a
        href={href}
        className={cn(
          "underline underline-offset-2",
          isUser ? "text-primary-foreground" : "text-foreground"
        )}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    blockquote: ({ children }) => (
      <blockquote
        className={cn(
          "mb-2 border-l-2 pl-3 last:mb-0",
          isUser
            ? "border-primary-foreground/40 text-primary-foreground/90"
            : "border-border text-muted-foreground"
        )}
      >
        {children}
      </blockquote>
    ),
    code: ({ className, children, ...props }) => {
      const isBlock = Boolean(className?.includes("language-"));
      if (isBlock) {
        return (
          <code className={cn(className, "font-mono")} {...props}>
            {children}
          </code>
        );
      }
      return (
        <code
          className={cn("rounded px-1 py-0.5 font-mono text-[0.85em]", codeBg)}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <HorizontalScrollRegion
        as="pre"
        className={cn(
          "mb-2 max-w-full overflow-x-auto rounded-md border p-2 font-mono text-xs leading-relaxed last:mb-0",
          preBg
        )}
      >
        {children}
      </HorizontalScrollRegion>
    ),
    table: ({ children }) => (
      <HorizontalScrollRegion
        className={cn(
          "mb-2 max-w-full overflow-x-auto rounded-md border last:mb-0",
          borderColor
        )}
      >
        <table className="w-full min-w-max border-collapse text-xs">{children}</table>
      </HorizontalScrollRegion>
    ),
    thead: ({ children }) => (
      <thead className={cn("bg-background/30", !isUser && "")}>{children}</thead>
    ),
    th: ({ children }) => (
      <th className={cn("border px-2 py-1 text-left font-medium", borderColor)}>
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td
        className={cn(
          "border px-2 py-1 align-top [overflow-wrap:anywhere]",
          borderColor
        )}
      >
        {children}
      </td>
    ),
    hr: () => <hr className={cn("my-2", borderColor)} />,
  };
}

const MARKDOWN_COMPONENTS: Record<MessageMarkdownVariant, Components> = {
  assistant: buildComponents("assistant"),
  user: buildComponents("user"),
  muted: buildComponents("muted"),
};

export function MessageMarkdown({
  content,
  variant = "assistant",
  className,
}: MessageMarkdownProps) {
  return (
    <div
      className={cn(
        "max-w-full [overflow-wrap:anywhere]",
        variant === "muted" && "text-xs text-muted-foreground",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MARKDOWN_COMPONENTS[variant]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
