import { route } from '@/lib/bff';
import { proPrices } from '@/services/billing';

// Read-only prices for any signed-in admin (e.g. the change-plan drawer), without exposing the plans editor.
export const GET = route({}, async () => proPrices());
