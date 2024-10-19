import { ReactElement } from 'react';
import { gql } from '../../__generated__';
import { useQuery } from '@apollo/client';
import { WarningBadge } from './WarningBadge';
import { useUserId } from '../context/user-id';

const BadgeIfSessionExpired_Query = gql(`
  query BadgeIfSessionExpired_Query($id: ID!) {
    signedInUserById(id: $id) @client {
      local {
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

  if (!data?.signedInUserById?.local.sessionExpired) return children;

  return <WarningBadge>{children}</WarningBadge>;
}
