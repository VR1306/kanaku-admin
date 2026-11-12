import { z, type ZodType } from 'zod';

/** Tiny OpenAPI 3.1 builder shared by the three specs. Request bodies come straight from the zod schemas the routes use. */
type Json = Record<string, unknown>;
export const js = (s: ZodType): Json =>
  z.toJSONSchema(s, { io: 'input', unrepresentable: 'any' }) as Json;

export interface Op {
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  path: string;
  tag: string;
  summary: string;
  description?: string;
  /** Admin permission required (documented as x-permission). */
  perm?: string;
  /** Security scheme names; [] = public. Defaults to the spec's default. */
  auth?: string[];
  body?: Json | ZodType;
  query?: Array<{
    name: string;
    type?: string;
    description?: string;
    required?: boolean;
    enum?: string[];
  }>;
  res?: Json | string;
  /** Extra status codes: { 404: 'Not found' } */
  codes?: Record<number, string>;
}

const ERR = { $ref: '#/components/schemas/Error' };
const STD: Record<number, string> = {
  400: 'Validation failed',
  401: 'Not authenticated',
  403: 'Missing permission',
  429: 'Rate limited',
};

const isZod = (v: unknown): v is ZodType => typeof v === 'object' && v !== null && '_zod' in v;

export function buildSpec(o: {
  title: string;
  version?: string;
  description: string;
  servers: Array<{ url: string; description: string }>;
  securitySchemes: Json;
  defaultAuth: string[];
  tags: Array<{ name: string; description: string }>;
  ops: Op[];
  schemas?: Json;
}) {
  const paths: Record<string, Json> = {};
  for (const op of o.ops) {
    const auth = op.auth ?? o.defaultAuth;
    const params = [...op.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    const codes: Record<string, Json> = {
      '200': {
        description: 'Success',
        content: {
          'application/json': {
            schema:
              typeof op.res === 'string'
                ? { $ref: `#/components/schemas/${op.res}` }
                : (op.res ?? { type: 'object', properties: { data: {} } }),
          },
        },
      },
    };
    const std = { ...STD, ...(op.codes ?? {}) };
    for (const [c, d] of Object.entries(std)) {
      if (!auth.length && (c === '401' || c === '403')) continue;
      if (!op.body && !op.query && c === '400' && !op.codes?.[400]) continue;
      codes[c] = { description: d, content: { 'application/json': { schema: ERR } } };
    }
    (paths[op.path] ??= {})[op.method] = {
      tags: [op.tag],
      summary: op.summary,
      ...(op.description || op.perm
        ? {
            description: [op.description, op.perm ? `Requires permission \`${op.perm}\`.` : '']
              .filter(Boolean)
              .join('\n\n'),
          }
        : {}),
      ...(op.perm ? { 'x-permission': op.perm } : {}),
      security: auth.length ? auth.map((a) => ({ [a]: [] })) : [],
      ...(params.length || op.query
        ? {
            parameters: [
              ...params.map((name) => ({
                name,
                in: 'path',
                required: true,
                schema: { type: 'string' },
              })),
              ...(op.query ?? []).map((q) => ({
                name: q.name,
                in: 'query',
                required: !!q.required,
                description: q.description,
                schema: { type: q.type ?? 'string', ...(q.enum ? { enum: q.enum } : {}) },
              })),
            ],
          }
        : {}),
      ...(op.body
        ? {
            requestBody: {
              required: true,
              content: {
                'application/json': { schema: isZod(op.body) ? js(op.body) : op.body },
              },
            },
          }
        : {}),
      responses: codes,
    };
  }
  return {
    openapi: '3.1.0',
    info: { title: o.title, version: o.version ?? '1.0.0', description: o.description },
    servers: o.servers,
    tags: o.tags,
    paths,
    components: {
      securitySchemes: o.securitySchemes,
      schemas: {
        Error: {
          type: 'object',
          required: ['error'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: {
                code: { type: 'string', example: 'validation' },
                message: { type: 'string' },
                requestId: { type: 'string' },
              },
            },
          },
        },
        ...(o.schemas ?? {}),
      },
    },
  };
}
