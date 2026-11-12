import { v1 } from '@/lib/v1';
import { tick } from '@/services/delivery';

/** Driven by the realtime service every ~30 s (or any scheduler): publishes due announcements and sends pending deliveries. */
export const POST = v1({ service: true }, async () => tick());
