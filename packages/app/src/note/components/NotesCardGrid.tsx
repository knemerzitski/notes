import { Box, css, Skeleton, styled } from '@mui/material';

import { forwardRef, ReactNode } from 'react';

import { gql } from '../../__generated__';
import { Note } from '../../__generated__/graphql';
import { IsLoadingProvider } from '../../utils/context/is-loading';
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
    loadingCount = 0,
    loadingNoteIds = [],
  }: {
    noteCard?: ReactNode;
    /**
     * Display sketeton cards at the end
     * @default 0
     */
    loadingCount?: number;
    loadingNoteIds?: readonly string[];
  },
  ref
) {
  const noteIds = useNoteIds(true) ?? [];

  function noteCardElement(noteId: Note['id']) {
    const isLoading = loadingNoteIds.includes(noteId);
    return <IsLoadingProvider isLoading={isLoading}>{noteCard}</IsLoadingProvider>;
  }

  return (
    <BoxStyled ref={ref} aria-label="notes list" component="ol">
      {noteIds.map((renderNoteId) => (
        <NoteIdProvider key={renderNoteId} noteId={renderNoteId}>
          {noteCardElement(renderNoteId)}
        </NoteIdProvider>
      ))}
      {[...new Array<undefined>(loadingCount)].map((_value, index) => (
        <SkeletonStyled key={index} variant="rounded" animation="wave" />
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

const SkeletonStyled = styled(Skeleton)(
  ({ theme }) => css`
    ${theme.breakpoints.up('xs')} {
      height: 200px;
    }

    ${theme.breakpoints.up('sm')} {
      height: 256px;
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
