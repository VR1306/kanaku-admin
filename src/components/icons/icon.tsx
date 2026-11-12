import type { SVGProps } from 'react';
import { ICON_PATHS, type IconName } from '@/constants/icons';

export type { IconName };

type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & {
  name: IconName;
  size?: number;
  strokeWidth?: number;
};

export function Icon({ name, size = 19, strokeWidth = 1.8, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
