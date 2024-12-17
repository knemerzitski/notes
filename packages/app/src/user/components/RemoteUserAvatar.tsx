import { useFragment } from '@apollo/client';

import { forwardRef } from 'react';

import { gql } from '../../__generated__';
import { FirstLetter } from '../../utils/components/FirstLetter';
import { LargeTextBackgroundAvatar } from '../../utils/components/LargeTextBackgroundAvatar';
import { SmallTextBackgroundAvatar } from '../../utils/components/SmallTextBackgroundAvatar';
import { TextBackgroundAvatar } from '../../utils/components/TextBackgroundAvatar';
import { useUserId } from '../context/user-id';

const RemoteUserAvatar_PublicUserFragment = gql(`
  fragment RemoteUserAvatar_PublicUserFragment on PublicUser {
    id
    profile {
      displayName
    }
  }
`);

export interface RemoteUserAvatarProps {
  /**
   * @default "normal"
   */
  size?: 'small' | 'normal' | 'large';
}

export const RemoteUserAvatar = forwardRef<HTMLDivElement, RemoteUserAvatarProps>(
  function RemoteUserAvatar({ size = 'normal' }, ref) {
    const userId = useUserId();

    const { complete, data: user } = useFragment({
      fragment: RemoteUserAvatar_PublicUserFragment,
      fragmentName: 'RemoteUserAvatar_PublicUserFragment',
      from: {
        __typename: 'PublicUser',
        id: userId,
      },
    });

    if (!complete) {
      return null;
    }

    const name = user.profile.displayName;

    const SizeTextBackgroundAvatar =
      size == 'large'
        ? LargeTextBackgroundAvatar
        : size === 'small'
          ? SmallTextBackgroundAvatar
          : TextBackgroundAvatar;

    return (
      <SizeTextBackgroundAvatar ref={ref} bgColorText={name}>
        <FirstLetter text={name} />
      </SizeTextBackgroundAvatar>
    );
  }
);