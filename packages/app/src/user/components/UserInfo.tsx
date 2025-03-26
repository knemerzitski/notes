import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';

import { FullWidthColumnBox } from '../../utils/components/FullWidthColumnBox';
import { useUserId } from '../context/user-id';

import { EditableDisplayName } from './EditableDisplayName';
import { EmailSubtitle } from './EmailSubtitle';
import { UserAvatar } from './UserAvatar';

const UserInfo_Query = gql(`
  query UserInfo_Query($userBy: UserByInput!) {
    signedInUser(by: $userBy) {
      id
      email
      localOnly
    }
  }
`);

const _UserInfo_UserFragment = gql(`
  fragment UserInfo_UserFragment on User {
    ...EditableDisplayName_UserFragment
  }
`);

export function UserInfo() {
  const userId = useUserId();
  const { data } = useQuery(UserInfo_Query, {
    variables: {
      userBy: {
        id: userId,
      },
    },
    fetchPolicy: 'cache-only',
  });
  if (!data) return;

  const user = data.signedInUser;

  return (
    <>
      <UserAvatar size="large" />
      <FullWidthColumnBox>
        <EditableDisplayName />
        {!user.localOnly && <EmailSubtitle>{user.email}</EmailSubtitle>}
      </FullWidthColumnBox>
    </>
  );
}
