import { Badge, BadgeProps } from '@mui/material';

export function WarningBadge(props: BadgeProps) {
  return <Badge badgeContent="!" color="warning" {...props} />;
}
