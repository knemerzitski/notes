import { css, styled } from '@mui/material';

import { Note } from '../../__generated__/graphql';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { NoteIdProvider } from '../context/note-id';

import { NoteCard } from './NoteCard';

export function DragOverlayNoteCard({ noteId }: { noteId: Note['id'] }) {
  return (
    <NoteIdProvider noteId={noteId}>
      <NoteCardStyled selected={true} hidden={false} lightweight={true} />
    </NoteIdProvider>
  );
}

const mobileBorderWidth = {
  style: ({ isMobile = false }: { isMobile?: boolean }) => {
    if (isMobile) {
      return css`
        border-width: 2px;
      `;
    }

    return;
  },
  props: ['isMobile'],
};

const NoteCardStyled = styled(NoteCard, {
  shouldForwardProp: mergeShouldForwardProp(mobileBorderWidth.props),
})(mobileBorderWidth.style);
