import { useQuery } from '@apollo/client';

import { gql } from '../../__generated__';

import { FullWidthColumnBox } from '../../utils/components/FullWidthColumnBox';
import { UserIdProvider } from '../context/user-id';

import { EditableDisplayName } from './EditableDisplayName';
import { EmailSubtitle } from './EmailSubtitle';
import { UserAvatar } from './UserAvatar';

const CurrentUserInfo_Query = gql(`
  query CurrentUserInfo_Query {
    currentSignedInUser {
      id
      email
      localOnly
    }
  }
`);

export function CurrentUserInfo() {
  const { data } = useQuery(CurrentUserInfo_Query, {
    fetchPolicy: 'cache-only',
  });
  if (!data) return;

  const user = data.currentSignedInUser;
  return (
    <UserIdProvider userId={user.id}>
      <UserAvatar size="large" />
      <FullWidthColumnBox>
        <EditableDisplayName />
        {!user.localOnly && <EmailSubtitle>{user.email}</EmailSubtitle>}
      </FullWidthColumnBox>
    </UserIdProvider>
  );
}
