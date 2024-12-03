import { css, styled } from '@mui/material';

import { Note } from '../../__generated__/graphql';
import { useIsMobile } from '../../theme/context/is-mobile';
import { mergeShouldForwardProp } from '../../utils/merge-should-forward-prop';
import { NoteIdProvider } from '../context/note-id';

import { PureNoteCard } from './NoteCard';

export function DragOverlayNoteCard({ noteId }: { noteId: Note['id'] }) {
  const isMobile = useIsMobile();

  return (
    <NoteIdProvider noteId={noteId}>
      <PureNoteCardStyled isMobile={isMobile} active={true} />
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

const PureNoteCardStyled = styled(PureNoteCard, {
  shouldForwardProp: mergeShouldForwardProp(mobileBorderWidth.props),
})(mobileBorderWidth.style);
