import { PageGuard } from '@/lib/PageGuard';
import { CategoriesView } from '@/features/categories/components/CategoriesView';

export default function Page() {
  return <PageGuard permission="categories.write">{() => <CategoriesView />}</PageGuard>;
}
