import PersonIcon from '@mui/icons-material/Person';
import { Avatar } from '@mui/material';

import { forwardRef } from 'react';

import { LargeAvatar } from '../../utils/components/LargeAvatar';
import { LargePersonIcon } from '../../utils/components/LargePersionIcon';
import { SmallAvatar } from '../../utils/components/SmallAvatar';
import { SmallPersonIcon } from '../../utils/components/SmallPersonIcon';

export interface LocalUserAvatarProps {
  /**
   * @default "normal"
   */
  size?: 'small' | 'normal' | 'large';
}

export const LocalUserAvatar = forwardRef<HTMLDivElement, LocalUserAvatarProps>(
  function LocalUserAvatar({ size = 'normal' }, ref) {
    switch (size) {
      case 'large':
        return (
          <LargeAvatar ref={ref}>
            <LargePersonIcon />
          </LargeAvatar>
        );
      case 'small':
        return (
          <SmallAvatar ref={ref}>
            <SmallPersonIcon />
          </SmallAvatar>
        );
      default:
        return (
          <Avatar ref={ref}>
            <PersonIcon />
          </Avatar>
        );
    }
  }
);
