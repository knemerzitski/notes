import { Box, css, Skeleton, styled } from '@mui/material';
import { NoteIdProvider } from '../context/note-id';
import { gql } from '../../__generated__';
import { NoteCard } from './NoteCard';
import { forwardRef, ReactNode } from 'react';
import { useNoteIds } from '../context/note-ids';

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
          <NoteCardWrapper>{noteCard}</NoteCardWrapper>
        </NoteIdProvider>
      ))}
    </BoxStyled>
  );
});

const BoxStyled = styled(Box)(
  ({ theme }) => css`
    display: grid;
    justify-content: center;

    ${theme.breakpoints.up('xs')} {
      grid-template-columns: 100%;
      gap: ${theme.spacing(1)};
    }

    ${theme.breakpoints.up('sm')} {
      grid-template-columns: repeat(auto-fit, 256px);
      gap: ${theme.spacing(2)};
    }
  `
);

const NoteCardWrapper = styled(Box)(
  ({ theme }) => css`
    ${theme.breakpoints.up('xs')} {
      height: auto;
    }

    ${theme.breakpoints.up('sm')} {
      width: 256px;
      height: 256px;
    }
  `
);
