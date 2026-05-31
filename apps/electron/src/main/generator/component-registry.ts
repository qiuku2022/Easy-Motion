import type { ClipType } from '@easymotion/shared';

export interface ComponentDefinition {
  name: string;
  importPath: string;
  sourceClipType: ClipType;
  propKeys: string[];
}

export class ComponentRegistry {
  private components: Map<ClipType, ComponentDefinition> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    this.register({
      name: 'TextLayer',
      importPath: './layers/TextLayer',
      sourceClipType: 'text',
      propKeys: ['clipId', 'source', 'transform', 'style', 'keyframes', 'inAnimation', 'outAnimation'],
    });
    this.register({
      name: 'ImageLayer',
      importPath: './layers/ImageLayer',
      sourceClipType: 'image',
      propKeys: ['clipId', 'source', 'transform', 'style', 'keyframes', 'inAnimation', 'outAnimation'],
    });
    this.register({
      name: 'ShapeLayer',
      importPath: './layers/ShapeLayer',
      sourceClipType: 'shape',
      propKeys: ['clipId', 'source', 'transform', 'style', 'keyframes', 'inAnimation', 'outAnimation'],
    });
    this.register({
      name: 'AudioLayer',
      importPath: './layers/AudioLayer',
      sourceClipType: 'audio',
      propKeys: ['clipId', 'source', 'transform', 'style', 'keyframes', 'inAnimation', 'outAnimation'],
    });
  }

  register(def: ComponentDefinition): void {
    this.components.set(def.sourceClipType, def);
  }

  getComponentName(clipType: ClipType): string {
    const def = this.components.get(clipType);
    if (!def) {
      throw new Error(`No component registered for clip type: ${clipType}`);
    }
    return def.name;
  }

  getImportPath(clipType: ClipType): string {
    const def = this.components.get(clipType);
    if (!def) {
      throw new Error(`No component registered for clip type: ${clipType}`);
    }
    return def.importPath;
  }

  getPropKeys(clipType: ClipType): string[] {
    const def = this.components.get(clipType);
    if (!def) {
      throw new Error(`No component registered for clip type: ${clipType}`);
    }
    return def.propKeys;
  }

  getAllDefinitions(): ComponentDefinition[] {
    return Array.from(this.components.values());
  }
}
