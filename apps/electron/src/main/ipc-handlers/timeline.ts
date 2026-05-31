/**
 * IPC 时间线处理器
 * 处理 main:timeline:* 频道
 */

import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@easymotion/shared';
import type { Timeline } from '@easymotion/shared';
import { TimelineSchema } from '@easymotion/shared';
import { wrapHandler } from './types';
import type { TimelineGenerator } from '../generator';

interface TimelineHandlerDeps {
  generator: TimelineGenerator;
}

export function registerTimelineHandlers(deps: TimelineHandlerDeps): void {
  ipcMain.handle(
    IPC_CHANNELS.TIMELINE.UPDATE,
    wrapHandler(async (_event, timeline: Timeline) => {
      TimelineSchema.parse(timeline);
      return { success: true };
    })
  );

  ipcMain.handle(
    IPC_CHANNELS.TIMELINE.GENERATE,
    wrapHandler(async (_event, payload: { timeline: Timeline; subprojectId: string }) => {
      const result = await deps.generator.generateFromTimeline(payload.timeline, payload.subprojectId);
      return { success: true, data: result };
    })
  );
}
