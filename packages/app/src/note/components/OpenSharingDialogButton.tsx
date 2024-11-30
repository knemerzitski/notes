import { IconButton, IconButtonProps, Tooltip } from '@mui/material';
import { useIsLocalOnlyNote } from '../hooks/useIsLocalOnlyNote';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import { useIsLocalOnlyUser } from '../../user/hooks/useIsLocalOnlyUser';
import { useNavigate } from '@tanstack/react-router';
import { useNoteId } from '../context/note-id';
import { useIsNoteSharingOpen } from '../hooks/useIsNoteSharingOpen';
import { noteSharingDialogId } from '../../utils/element-id';
import { useIsNoteEditable } from '../hooks/useIsNoteEditable';

// TODO fix when clicking it CreateNoteWidget then widget closes, ClickAwayListener issue?

export function OpenSharingDialogButton() {
  const isLocalOnlyNote = useIsLocalOnlyNote();
  const isLocalOnlyUser = useIsLocalOnlyUser();
  const isNoteEditable = useIsNoteEditable();

  if (!isNoteEditable) {
    return null;
  }

  if (isLocalOnlyNote) {
    if (isLocalOnlyUser) {
      return null;
    } else {
      return <BaseButton disabled />;
    }
  }

  return <Remote />;
}

function Remote() {
  const noteId = useNoteId();
  const navigate = useNavigate();

  const isNoteSharingOpen = useIsNoteSharingOpen(noteId);

  function handleClickNavigate() {
    void navigate({
      to: '.',
      search: (prev) => ({
        ...prev,
        sharingNoteId: noteId,
      }),
      mask: {
        to: '/note/sharing/$noteId',
        params: {
          noteId,
        },
      },
    });
  }

  return (
    <BaseButton
      aria-label="open note sharing dialog"
      aria-controls={isNoteSharingOpen ? noteSharingDialogId(noteId) : undefined}
      aria-expanded={isNoteSharingOpen}
      aria-haspopup={true}
      onClick={handleClickNavigate}
    />
  );
}

function BaseButton(props?: IconButtonProps) {
  const handleClick: IconButtonProps['onClick'] = (e) => {
    e.stopPropagation();
    props?.onClick?.(e);
  };

  return (
    <IconButton {...props} onClick={handleClick}>
      <Tooltip title="Collaboration">
        <PersonAddAlt1Icon />
      </Tooltip>
    </IconButton>
  );
}
