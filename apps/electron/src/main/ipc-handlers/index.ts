/**
 * 注册所有 IPC 处理器
 * 在主进程启动时调用
 */
import { registerProjectHandlers } from './project';
import { registerTimelineHandlers } from './timeline';
import type { ProjectService } from '../project-service';
import type { TimelineGenerator } from '../generator';

interface HandlerDeps {
  projectService: ProjectService;
  generator: TimelineGenerator;
}

export function registerAllIpcHandlers(deps: HandlerDeps): void {
  registerProjectHandlers(deps);
  registerTimelineHandlers(deps);
}
