import { z } from 'zod';
import { insertLayerSchema, insertTabSchema, insertSettingsSchema, layers, tabs, settings } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  layers: {
    list: {
      method: 'GET' as const,
      path: '/api/layers',
      responses: {
        200: z.array(z.custom<typeof layers.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/layers',
      input: insertLayerSchema,
      responses: {
        201: z.custom<typeof layers.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/layers/:id',
      input: insertLayerSchema.partial().extend({
        autoRunBackground: z.boolean().optional(),
        autoRunOnLoad: z.boolean().optional(),
        autoRunOnUrlChange: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof layers.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/layers/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  tabs: {
    list: {
      method: 'GET' as const,
      path: '/api/tabs',
      responses: {
        200: z.array(z.custom<typeof tabs.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/tabs',
      input: insertTabSchema.extend({
        splitOrientation: z.enum(['vertical', 'horizontal']).optional(),
      }),
      responses: {
        201: z.custom<typeof tabs.$inferSelect>(),
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
