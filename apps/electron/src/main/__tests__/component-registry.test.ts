import { describe, it, expect } from 'vitest';
import { ComponentRegistry } from '../generator/component-registry';

describe('ComponentRegistry', () => {
  const registry = new ComponentRegistry();

  it('maps text type to TextLayer', () => {
    expect(registry.getComponentName('text')).toBe('TextLayer');
    expect(registry.getImportPath('text')).toBe('./layers/TextLayer');
  });

  it('maps image type to ImageLayer', () => {
    expect(registry.getComponentName('image')).toBe('ImageLayer');
    expect(registry.getImportPath('image')).toBe('./layers/ImageLayer');
  });

  it('maps shape type to ShapeLayer', () => {
    expect(registry.getComponentName('shape')).toBe('ShapeLayer');
    expect(registry.getImportPath('shape')).toBe('./layers/ShapeLayer');
  });

  it('maps audio type to AudioLayer', () => {
    expect(registry.getComponentName('audio')).toBe('AudioLayer');
    expect(registry.getImportPath('audio')).toBe('./layers/AudioLayer');
  });

  it('throws for unregistered clip type', () => {
    expect(() => registry.getComponentName('chart')).toThrow('No component registered');
  });

  it('returns all registered definitions', () => {
    const defs = registry.getAllDefinitions();
    expect(defs).toHaveLength(4);
    const names = defs.map((d) => d.name).sort();
    expect(names).toEqual(['AudioLayer', 'ImageLayer', 'ShapeLayer', 'TextLayer']);
  });
});
