import { forwardRef } from 'react';

import { gql } from '../../__generated__';
import { useIsLocalOnlyUser } from '../hooks/useIsLocalOnlyUser';

import { LocalUserAvatar, LocalUserAvatarProps } from './LocalUserAvatar';
import { RemoteUserAvatar, RemoteUserAvatarProps } from './RemoteUserAvatar';

const _UserAvatar_UserFragment = gql(`
  fragment UserAvatar_UserFragment on User {
    ...RemoteUserAvatar_UserFragment
  }
`);

export type UserAvatarProps = LocalUserAvatarProps & RemoteUserAvatarProps;

export const UserAvatar = forwardRef<HTMLDivElement, UserAvatarProps>(
  function UserAvatar(props, ref) {
    const isLocalOnlyUser = useIsLocalOnlyUser();

    if (isLocalOnlyUser) {
      return <LocalUserAvatar ref={ref} {...props} />;
    } else {
      return <RemoteUserAvatar ref={ref} {...props} />;
    }
  }
);
