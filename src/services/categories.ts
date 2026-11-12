import 'server-only';
import { repo } from '@/lib/db';
import type { Category } from '@/types/admin';

/** Default category templates (MongoDB `categories`). Starter categories are inserted by `npm run seed`. */
export const categories = repo<Category>('categories');
export const listCategories = () => categories.list({}, { kind: 1, name: 1 });
