import { useQuery } from '@apollo/client';
import { getFragmentData, gql } from '../../__generated__';
import { useUserId } from '../context/user-id';
import { DisplayNameTitle } from './DisplayNameTitle';
import {
  Box,
  ClickAwayListener,
  css,
  IconButton,
  styled,
  TextFieldProps,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { useState } from 'react';
import { useUpdateDisplayNameMutation } from '../hooks/useUpdateDisplayNameMutation';
import { useUndoAction } from '../../utils/context/undo-action';
import { EditableDisplayNameSignedInUserFragmentFragmentDoc } from '../../__generated__/graphql';
import CheckIcon from '@mui/icons-material/Check';
import { DisplayNameTitleTextField } from './DisplayNameTitleTextField';

const EditableDisplayName_Query = gql(`
  query EditableDisplayName_Query($id: ID!) {
    signedInUser(by: { id: $id }) @client {
      ...EditableDisplayName_SignedInUserFragment
    }
  }

  fragment EditableDisplayName_SignedInUserFragment on SignedInUser {
    id
    public {
      id
      profile {
        displayName
      }
    }
  }
`);

const MAX_LENGTH = 20;

export function EditableDisplayName() {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const updateDisplayNameMutation = useUpdateDisplayNameMutation();
  const undoAction = useUndoAction();

  const userId = useUserId();
  const { data } = useQuery(EditableDisplayName_Query, {
    variables: {
      id: userId,
    },
  });

  const _user = data?.signedInUser;
  if (!_user) return null;

  const user = getFragmentData(EditableDisplayNameSignedInUserFragmentFragmentDoc, _user);

  const name = user.public.profile.displayName;

  function validateEditName() {
    const s = editName.trim();
    if (s.length === 0) {
      return 'Name is empty';
    } else if (s.length > MAX_LENGTH) {
      return `Max length is ${MAX_LENGTH}`;
    }
    return;
  }

  const helperText = validateEditName();
  const hasError = helperText != null;

  function handleStartEditName() {
    setIsEditing(true);
    setEditName(name);
  }

  const handleNameChanged: TextFieldProps['onChange'] = (e) => {
    setEditName(e.target.value);
  };

  function handleCancelNameChange() {
    if (!isEditing) return;

    setIsEditing(false);

    if (name !== editName) {
      // TODO reappear popover for edit?
      undoAction('Name update cancelled', () => {
        setIsEditing(true);
        setEditName(editName);
      });
    }
  }

  function handleCommitNameChange() {
    if (hasError) {
      return;
    }

    // Prevent flicker while cache hasn't updated
    setTimeout(() => {
      setIsEditing(false);
    }, 0);

    if (name.trim() !== editName.trim()) {
      void updateDisplayNameMutation(editName.trim());
      undoAction('Name updated', () => {
        void updateDisplayNameMutation(name);
      });
    }
  }

  const handleKeyDown: TextFieldProps['onKeyDown'] = (e) => {
    if (e.key === 'Enter') {
      handleCommitNameChange();
    }
  };

  return (
    <ClickAwayListener
      onClickAway={handleCancelNameChange}
      touchEvent="onTouchStart"
      mouseEvent="onMouseDown"
    >
      <RootBoxStyled>
        {isEditing ? (
          <DisplayNameTitleTextField
            value={editName}
            onChange={handleNameChanged}
            onKeyDown={handleKeyDown}
            required
            autoFocus
            variant="standard"
            inputProps={{ maxLength: MAX_LENGTH }}
            helperText={helperText}
            error={hasError}
          />
        ) : (
          <DisplayNameTitle>{name}</DisplayNameTitle>
        )}
        <IconButton
          onClick={isEditing ? handleCommitNameChange : handleStartEditName}
          color="primary"
          size="small"
          aria-label={isEditing ? 'save name' : 'start editing name'}
          disabled={isEditing && hasError}
        >
          <Tooltip title={isEditing ? 'Save name' : 'Edit Name'}>
            <span>{isEditing ? <CheckIcon /> : <EditIcon />}</span>
          </Tooltip>
        </IconButton>
      </RootBoxStyled>
    </ClickAwayListener>
  );
}

const RootBoxStyled = styled(Box)(
  ({ theme }) => css`
    display: flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    min-width: 0;
    gap: ${theme.spacing(1)};
  `
);
