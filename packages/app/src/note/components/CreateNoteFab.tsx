import AddIcon from '@mui/icons-material/Add';
import { css, Fab, FabProps, styled } from '@mui/material';
import { forwardRef, MouseEvent } from 'react';

import { GlobalCountIncrement } from '../../utils/context/global-count';
import { useCreateNote } from '../hooks/useCreateNote';
import { useNavigateToNote } from '../hooks/useNavigateToNote';

export const CreateNoteFab = forwardRef<HTMLButtonElement, FabProps>(
  function CreateNoteFab(props, ref) {
    const { noteId } = useCreateNote();
    const navigateToNote = useNavigateToNote();

    function handleCreateNote(e: MouseEvent<HTMLButtonElement>): void {
      props.onClick?.(e);
      void navigateToNote(noteId, {
        focus: true,
      });
    }

    return (
      <>
        <GlobalCountIncrement id={Fab} />
        <FabStyled
          ref={ref}
          color="primary"
          size="large"
          aria-label="new note"
          onClick={handleCreateNote}
          {...props}
        >
          <AddIcon />
        </FabStyled>
      </>
    );
  }
);

const FabStyled = styled(Fab)(
  ({ theme }) => css`
    position: fixed;
    bottom: ${theme.spacing(2)};
    right: ${theme.spacing(2)};
  `
);
