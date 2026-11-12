import { Badge, type Tone } from '@/components/ui/Badge';
import type { UserStatus } from '@/types/users';

const MAP: Record<UserStatus, { tone: Tone; label: string }> = {
  invited: { tone: 'amber', label: 'Invited' },
  active: { tone: 'green', label: 'Active' },
  inactive: { tone: 'gray', label: 'Inactive' },
  suspended: { tone: 'red', label: 'Suspended' },
};

export const StatusBadge = ({ status }: { status: UserStatus }) => (
  <Badge tone={MAP[status].tone}>{MAP[status].label}</Badge>
);
