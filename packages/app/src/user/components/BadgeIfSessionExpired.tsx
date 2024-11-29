import { ReactElement } from 'react';
import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import { WarningBadge } from './WarningBadge';
import { useUserId } from '../context/user-id';

const BadgeIfSessionExpired_Query = gql(`
  query BadgeIfSessionExpired_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      id
      local {
        id
        sessionExpired
      }
      localOnly
    }
  }
`);

export function BadgeIfSessionExpired({ children }: { children: ReactElement }) {
  const userId = useUserId();
  const { data } = useQuery(BadgeIfSessionExpired_Query, {
    variables: {
      id: userId,
    },
  });

  if (!data?.signedInUser?.local.sessionExpired) return children;

  return <WarningBadge>{children}</WarningBadge>;
}
