import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import { EmailSubtitle } from '../styled-components/EmailSubtitle';
import { UserAvatar } from './UserAvatar';
import { UserIdProvider } from '../context/user-id';
import { EditableDisplayName } from './EditableDisplayName';
import { FullWidthColumnBox } from '../../utils/styled-components/FullWidthColumnBox';

const CurrentUserInfo_Query = gql(`
  query CurrentUserInfo_Query {
    currentSignedInUser @client {
      id
      email
      localOnly
    }
  }
`);

export function CurrentUserInfo() {
  const { data } = useQuery(CurrentUserInfo_Query);
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
