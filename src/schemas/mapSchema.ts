import { z } from 'zod';
import { ScriptSchema } from './scriptSchema';

export const TileSchema = z.number().int().min(0);

export const ObjectEntitySchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number().optional(),
  height: z.number().optional(),
  properties: z.record(z.string(), z.any()).optional(),
  scripts: z.array(ScriptSchema).optional(),
});

export const MapDataSchema = z.object({
  app: z.literal('call-of-2d-zombies'),
  name: z.string(),
  version: z.string(),
  width: z.number().int().positive(), // in tiles
  height: z.number().int().positive(), // in tiles
  tileSize: z.number().int().positive(),
  layers: z.object({
    floor: z.array(z.array(TileSchema)),
    walls: z.array(z.array(TileSchema)),
  }),
  objects: z.array(ObjectEntitySchema).optional(),
  scripts: z.array(ScriptSchema).optional(),
  globalVariables: z.array(z.object({
    name: z.string(),
    type: z.enum(['string', 'number', 'boolean']),
    initialValue: z.any()
  })).optional(),
});

export type GlobalVariable = {
  name: string;
  type: 'string' | 'number' | 'boolean';
  initialValue: any;
};

export type MapData = z.infer<typeof MapDataSchema>;
export type MapObject = z.infer<typeof ObjectEntitySchema>;