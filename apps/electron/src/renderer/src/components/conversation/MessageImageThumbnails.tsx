import { memo } from "react";
import { AiRefThumbnail } from "@/components/conversation/AiRefThumbnail";
import { cn } from "@/lib/utils";

interface MessageImageThumbnailsProps {
  paths: string[];
  variant?: "default" | "on-primary";
  className?: string;
}

function pathToImageRef(path: string) {
  const name = path.split(/[/\\]/).pop();
  const isAbsolute = /^[a-zA-Z]:[\\/]/.test(path) || path.startsWith("/");
  return isAbsolute ? { path, name } : { relativePath: path, path, name };
}

export const MessageImageThumbnails = memo(function MessageImageThumbnails({
  paths,
  variant = "default",
  className,
}: MessageImageThumbnailsProps) {
  if (!paths.length) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {paths.map((path, index) => (
        <AiRefThumbnail
          key={`${path}-${index}`}
          image={pathToImageRef(path)}
          variant={variant}
        />
      ))}
    </div>
  );
});
