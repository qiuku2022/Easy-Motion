import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectStore } from "@/stores/projectStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { getEasyMotion } from "@/types/easyMotion";

export const PREVIEW_LOADING_HINTS = [
  "正在准备 Remotion 预览环境…",
  "首次打开可能需要安装依赖（约 1–5 分钟），请耐心等待",
  "正在启动 Vite 开发服务器…",
  "正在编译 Remotion 组件，完成后将自动显示画面",
  "加载时间较长属于正常现象，应用没有卡住",
  "可查看下方日志了解当前进度",
] as const;

const MAX_LOG_LINES = 8;

export function usePreviewBootstrap() {
  const currentProject = useProjectStore((s) => s.current);
  const timelineLoading = useTimelineStore((s) => s.isLoading);
  const timeline = useTimelineStore((s) => s.timeline);
  const isGenerating = useTimelineStore((s) => s.isGenerating);
  const remotionDrift = useTimelineStore((s) => s.remotionDrift);
  const runGenerate = useTimelineStore((s) => s.runGenerate);
  const checkRemotionDrift = useTimelineStore((s) => s.checkRemotionDrift);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const bootstrappedFor = useRef<string | null>(null);
  const startingRef = useRef(false);

  const isLoading = isStarting || isGenerating;

  useEffect(() => {
    const api = getEasyMotion();
    if (!api?.preview.onLog) return;

    const onLog = ({ line }: { line?: string }) => {
      if (!line?.trim()) return;
      setLogs((prev) => [...prev.slice(-(MAX_LOG_LINES - 1)), line.trim()]);
    };

    api.preview.onLog(onLog);
  }, []);

  useEffect(() => {
    if (!isLoading) return;
    const id = window.setInterval(() => {
      setHintIndex((i) => (i + 1) % PREVIEW_LOADING_HINTS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [isLoading]);

  const startPreview = useCallback(async () => {
    const api = getEasyMotion();
    if (!api?.preview.start) {
      setError("预览 API 不可用（请在 Electron 中运行）");
      return false;
    }

    if (startingRef.current) return false;
    startingRef.current = true;
    setIsStarting(true);
    setError(null);
    setLogs([]);

    try {
      if (api.preview.getState) {
        const state = await api.preview.getState();
        if (state.success && state.data?.status === "running" && state.data.url) {
          setPreviewUrl(state.data.url);
          return true;
        }
      }

      const res = await api.preview.start({});
      if (!res.success) {
        setError(res.error?.message ?? "预览启动失败");
        return false;
      }
      if (res.data?.url) {
        setPreviewUrl(res.data.url);
      }

      const fingerprint = res.data?.remotionFingerprint;
      const currentTimeline = useTimelineStore.getState().timeline;
      if (fingerprint && currentTimeline) {
        useTimelineStore.setState({
          timeline: {
            ...currentTimeline,
            remotionFingerprint: fingerprint,
            remotionSyncedAt: Date.now(),
          },
          remotionDrift: null,
        });
      } else {
        await checkRemotionDrift({ autoSync: false });
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    } finally {
      setIsStarting(false);
      startingRef.current = false;
    }
  }, [checkRemotionDrift]);

  const bootstrapPreview = useCallback(async () => {
    // 仅在手写 Remotion 已排除时静默生成；漂移检测失败则跳过生成，避免覆盖自定义动画
    if (remotionDrift && !remotionDrift.hasCustomRemotionCode) {
      const generated = await runGenerate({ manual: false });
      if (!generated) {
        setError("生成预览代码失败，请检查时间线后重试");
        return;
      }
    }
    await startPreview();
  }, [remotionDrift, runGenerate, startPreview]);

  useEffect(() => {
    if (!currentProject?.path) {
      bootstrappedFor.current = null;
      setPreviewUrl(null);
      setError(null);
      setLogs([]);
      return;
    }

    if (timelineLoading || !timeline) return;
    if (bootstrappedFor.current === currentProject.path) return;

    bootstrappedFor.current = currentProject.path;
    void bootstrapPreview();
  }, [
    currentProject?.path,
    timelineLoading,
    timeline,
    bootstrapPreview,
  ]);

  const retry = useCallback(() => {
    if (!currentProject?.path) return;
    bootstrappedFor.current = null;
    void bootstrapPreview().then(() => {
      bootstrappedFor.current = currentProject.path;
    });
  }, [bootstrapPreview, currentProject?.path]);

  return {
    previewUrl,
    setPreviewUrl,
    isLoading,
    isStarting,
    isGenerating,
    error,
    hint: PREVIEW_LOADING_HINTS[hintIndex],
    logs,
    startPreview,
    retry,
    hasProject: Boolean(currentProject?.path),
  };
}
