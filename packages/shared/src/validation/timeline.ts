import { z } from 'zod';
import type { Track, Clip } from '../types/timeline';

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const TransformSchema = z.object({
  position: PositionSchema,
  scale: z.number().min(0),
  rotation: z.number(),
  opacity: z.number().min(0).max(1),
});

export const InlineSourceSchema = z.object({
  kind: z.literal('inline'),
  content: z.string(),
});

export const AssetSourceSchema = z.object({
  kind: z.literal('asset'),
  assetId: z.string(),
  path: z.string(),
});

export const DataSourceSchema = z.object({
  kind: z.literal('data'),
  file: z.string(),
  field: z.string().optional(),
});

export const ClipSourceSchema = z.discriminatedUnion('kind', [
  InlineSourceSchema,
  AssetSourceSchema,
  DataSourceSchema,
]);

export const AnimationConfigSchema = z.object({
  type: z.string(),
  durationInFrames: z.number().int().min(1),
});

export const KeyframeSchema = z.object({
  id: z.string(),
  property: z.string(),
  frame: z.number().int().min(0),
  value: z.union([z.number(), z.string()]),
  easing: z.enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring']),
  interpolation: z.enum(['linear', 'bezier', 'hold']),
});

export const TextStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  color: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  lineHeight: z.number().optional(),
  letterSpacing: z.number().optional(),
  fontWeight: z.union([z.enum(['normal', 'bold']), z.number()]).optional(),
  textShadow: z
    .object({
      color: z.string(),
      offsetX: z.number(),
      offsetY: z.number(),
      blur: z.number(),
    })
    .optional(),
});

export const ShapeStyleSchema = z.object({
  fillColor: z.string().optional(),
  strokeColor: z.string().optional(),
  strokeWidth: z.number().optional(),
  opacity: z.number().optional(),
  shapeType: z.enum(['rect', 'circle']).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const ImageStyleSchema = z.object({
  objectFit: z.enum(['cover', 'contain', 'fill']).optional(),
  borderRadius: z.number().optional(),
  filter: z.string().optional(),
});

export const ClipSchema: z.ZodType<Clip> = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['text', 'image', 'video', 'audio', 'shape', 'chart', 'animation', 'group']),
  startInFrames: z.number().int().min(0),
  durationInFrames: z.number().int().min(1),
  source: ClipSourceSchema,
  transform: TransformSchema,
  style: z.any().optional(),
  keyframes: z.array(KeyframeSchema),
  animations: z
    .object({
      in: AnimationConfigSchema.optional(),
      out: AnimationConfigSchema.optional(),
    })
    .optional(),
  lastModifiedBy: z.enum(['user', 'ai']).nullable().optional(),
});

export const TrackSchema: z.ZodType<Track> = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum([
    'text',
    'image',
    'video',
    'audio',
    'shape',
    'chart',
    'animation',
    'group',
    'visual',
    'audio-track',
  ]),
  order: z.number().int().min(0),
  visible: z.boolean(),
  locked: z.boolean(),
  muted: z.boolean().optional(),
  clips: z.lazy(() => z.array(ClipSchema)),
  children: z.lazy(() => z.array(TrackSchema)).optional(),
  collapsed: z.boolean().optional(),
});

export const SnapGridSchema = z.object({
  enabled: z.boolean(),
  intervalInFrames: z.number().int().min(1),
});

export const TimelineSchema = z.object({
  id: z.string(),
  version: z.string(),
  fps: z.number().int().min(1).max(120),
  durationInFrames: z.number().int().min(1),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  tracks: z.array(TrackSchema),
  snapGrid: SnapGridSchema.optional(),
});
