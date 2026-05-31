import type { Timeline, Timeline as TimelineType } from '@easymotion/shared';
import type { ComponentRegistry } from './component-registry';
import type { TemplateEngine } from './template-engine';

export interface GeneratorResult {
  rootTsx: string;
  mainSequenceTsx: string;
  layerFiles: Map<string, string>;
}

export interface SequenceEntry {
  trackId: string;
  trackName: string;
  trackOrder: number;
  clip: TimelineType['tracks'][number]['clips'][number];
  componentName: string;
}

export interface Generator {
  generate(subprojectId: string): Promise<GeneratorResult>;
  generateFromTimeline(timeline: Timeline, subprojectId: string): Promise<GeneratorResult>;
}

export class TimelineGenerator implements Generator {
  constructor(
    private templateEngine: TemplateEngine,
    private registry: ComponentRegistry
  ) {}

  async generate(_subprojectId: string): Promise<GeneratorResult> {
    throw new Error('Not implemented: generate() requires loading timeline from disk');
  }

  async generateFromTimeline(timeline: Timeline, _subprojectId: string): Promise<GeneratorResult> {
    // Flatten group tracks and sort by order
    const flatTracks = this.flattenTracks(timeline.tracks);
    const sortedTracks = flatTracks.sort((a, b) => a.order - b.order);

    const usedComponents = new Set<string>();
    const sequences: SequenceEntry[] = [];

    for (const track of sortedTracks) {
      if (!track.visible) continue;
      for (const clip of track.clips) {
        const componentName = this.registry.getComponentName(clip.type);
        usedComponents.add(componentName);
        sequences.push({
          trackId: track.id,
          trackName: track.name,
          trackOrder: track.order,
          clip,
          componentName,
        });
      }
    }

    const rootTsx = this.templateEngine.renderRootTsx({
      durationInFrames: timeline.durationInFrames,
      fps: timeline.fps,
      width: timeline.width,
      height: timeline.height,
    });

    const mainSequenceTsx = this.templateEngine.renderMainSequenceTsx({
      sequences,
      imports: Array.from(usedComponents),
    });

    return { rootTsx, mainSequenceTsx, layerFiles: new Map() };
  }

  private flattenTracks(tracks: TimelineType['tracks']): TimelineType['tracks'] {
    const result: TimelineType['tracks'] = [];
    for (const track of tracks) {
      if (track.type === 'group' && track.children) {
        // Flatten children, inheriting visibility/locked from parent
        for (const child of track.children) {
          if (track.visible === false) child.visible = false;
          if (track.locked) child.locked = true;
          result.push(child);
        }
      } else {
        result.push(track);
      }
    }
    return result;
  }
}
