import { v1 } from '@/lib/v1';
import * as support from '@/services/support';

/** Is anyone available for live chat? `{ online, count, agents: [{ name }] }` (first names, at most 3). */
export const GET = v1({ service: true }, async () => support.availability());
