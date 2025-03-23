import { useFragment } from '@apollo/client';

import { AvatarGroup, AvatarGroupProps, css, styled, Theme } from '@mui/material';

import { forwardRef } from 'react';

import { gql } from '../../__generated__';
import { UserAvatar, UserAvatarProps } from '../../user/components/UserAvatar';
import { UserIdProvider, useUserId } from '../../user/context/user-id';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { largeAvatarStyle } from '../../utils/styles/large-avatar';
import { smallAvatarStyle } from '../../utils/styles/small-avatar';
import { useNoteId } from '../context/note-id';

const OpenedNoteUserAvatars_NoteFragment = gql(`
  fragment OpenedNoteUserAvatars_NoteFragment on Note {
    id
    users {
      id
      open {
        active @client
        closedAt
      }
      user {
        id
        ...UserAvatar_UserFragment
      }
    }
  }
`);

export type OpenedNoteUserAvatarsProps = Parameters<typeof OpenedNoteUserAvatars>[0];

export const OpenedNoteUserAvatars = forwardRef<
  HTMLDivElement,
  { UserAvatarProps?: Pick<UserAvatarProps, 'size'> } & AvatarGroupProps
>(function OpenedNoteUserAvatars({ UserAvatarProps, ...restProps }, ref) {
  const userId = useUserId();

  const noteId = useNoteId();
  const { complete, data: note } = useFragment({
    fragment: OpenedNoteUserAvatars_NoteFragment,
    fragmentName: 'OpenedNoteUserAvatars_NoteFragment',
    from: {
      __typename: 'Note',
      id: noteId,
    },
  });

  if (!complete) {
    return null;
  }

  const userLinks = note.users.filter(
    (userLink) => userLink.open?.active && userLink.user.id !== userId
  );

  if (userLinks.length === 0) {
    return null;
  }

  return (
    <AvatarGroupStyled
      ref={ref}
      {...restProps}
      size={UserAvatarProps?.size}
      aria-label="active users"
    >
      {userLinks.map((userLink) => (
        <UserIdProvider key={userLink.id} userId={userLink.user.id}>
          <UserAvatar {...UserAvatarProps} />
        </UserIdProvider>
      ))}
    </AvatarGroupStyled>
  );
});

const margin = {
  style: ({
    size = 'normal',
    theme,
  }: { size?: UserAvatarProps['size'] } & { theme: Theme }) => {
    if (size === 'small') {
      return css`
        margin-left: ${theme.spacing(-1)};
      `;
    }
    return;
  },
  props: ['size'],
};

const size = {
  style: ({
    size = 'normal',
    theme,
  }: { size?: UserAvatarProps['size'] } & { theme: Theme }) => {
    if (size === 'small') {
      return smallAvatarStyle({ theme });
    } else if (size == 'large') {
      return largeAvatarStyle({ theme });
    }

    return;
  },
  props: ['size'],
};

const AvatarGroupStyled = styled(AvatarGroup, {
  shouldForwardProp: mergeShouldForwardProp(margin.props, size.props),
})<{ size?: UserAvatarProps['size'] }>(
  (props) => css`
    & > .MuiAvatarGroup-avatar {
      ${margin.style(props)}
      ${size.style(props)}
    }
  `
);
