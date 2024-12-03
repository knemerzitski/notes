import { Box, css, Skeleton, styled } from '@mui/material';

import { forwardRef, ReactNode } from 'react';

import { gql } from '../../__generated__';
import { NoteIdProvider } from '../context/note-id';

import { useNoteIds } from '../context/note-ids';

import { NoteCard } from './NoteCard';

const _NotesCardGrid_UserNoteLinkFragment = gql(`
  fragment NotesCardGrid_UserNoteLinkFragment on UserNoteLink {
    ...NoteCard_UserNoteLinkFragment
  }
`);

export const NotesCardGrid = forwardRef(function NotesCardGrid(
  {
    noteCard = <NoteCard />,
    defaultLoadingCount = 5,
  }: {
    noteCard?: ReactNode;
    /**
     * Display skeleton cards instead of actual content.
     * @default 5
     */
    defaultLoadingCount?: number;
  },
  ref
) {
  const noteIds = useNoteIds(true);

  if (!noteIds) {
    return (
      <BoxStyled>
        {[...new Array<undefined>(defaultLoadingCount)].map((_value, index) => (
          <Skeleton key={index} height={256} variant="rounded" animation="wave" />
        ))}
      </BoxStyled>
    );
  }

  return (
    <BoxStyled ref={ref}>
      {noteIds.map((renderNoteId) => (
        <NoteIdProvider key={renderNoteId} noteId={renderNoteId}>
          {noteCard}
        </NoteIdProvider>
      ))}
    </BoxStyled>
  );
});

const BoxStyled = styled(Box)(
  ({ theme }) => css`
    display: grid;

    ${theme.breakpoints.up('xs')} {
      grid-template-columns: 100%;
      grid-auto-rows: 200px;
      gap: ${theme.spacing(1)};
    }

    ${theme.breakpoints.up('sm')} {
      grid-auto-rows: 256px;
      grid-template-columns: repeat(auto-fill, minmax(256px, 1fr));
      gap: ${theme.spacing(2)};
    }
  `
);

// Card size is managed by parent layout `BoxStyled`
// const NoteCardWrapper = styled(Box)(
//   ({ theme }) => css`
//     ${theme.breakpoints.up('xs')} {
//       height: 200px;
//     }

//     ${theme.breakpoints.up('sm')} {
//       width: 100%;
//       height: 100%;
//       height: 256px;
//       max-width: 384px;
//       justify-self: center;
//     }
//   `
// );
