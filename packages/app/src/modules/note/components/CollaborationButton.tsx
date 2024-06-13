import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  IconButtonProps,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import LinkIcon from '@mui/icons-material/Link';
import { useId, useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { gql } from '../../../__generated__/gql';
import { useApolloClient, useQuery } from '@apollo/client';
import { useNoteContentId } from '../context/NoteContentIdProvider';

const QUERY = gql(`
  query CollaborationNoteSharing($contentId: String!) {
    note(contentId: $contentId) {
      id
      contentId
      sharing {
        id
      }
    }
  }
`);

const MUTATION_CREATE = gql(`
 mutation CollaborationCreateNoteSharing($input: CreateNoteSharingInput!) {
  createNoteSharing(input: $input) {
    note {
      id
      contentId
      sharing {
        id
      }
    }
  }
 }
`);

const MUTATION_DELETE = gql(`
  mutation CollaborationDeleteNoteSharing($input: DeleteNoteSharingInput!) {
   deleteNoteSharing(input: $input) {
     note {
       id
       contentId
       sharing {
         id
       }
     }
   }
  }
`);

export interface CollaboratorButtonProps {
  iconButtonProps?: IconButtonProps;
}

const EMPTY_SHARING_LINK = 'https://...';

function getShareUrl(shareId?: string | number) {
  return shareId ? `${location.origin}?share=${shareId}` : EMPTY_SHARING_LINK;
}

export default function CollaborationButton({
  iconButtonProps,
}: CollaboratorButtonProps) {
  const noteContentId = useNoteContentId();
  const apolloClient = useApolloClient();

  const [isCreatingShareLink, setIsCreatingShareLink] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  const { data, loading: queryLoading } = useQuery(QUERY, {
    variables: {
      contentId: noteContentId,
    },
    fetchPolicy: 'cache-only',
  });

  const sharingLink = getShareUrl(
    !isCreatingShareLink ? data?.note.sharing?.id : undefined
  );
  // const sharingLink =
  //   !isCreatingShareLink && data?.note.sharing?.id != null
  //     ? `${location.origin}/share/${data.note.sharing.id}`
  //     : EMPTY_SHARING_LINK;

  const isSharingEnabled = !isCreatingShareLink && data?.note.sharing?.id != null;

  const loading = queryLoading || isCreatingShareLink;

  const buttonId = useId();
  const dialogId = useId();

  function handleClickOpenDialog() {
    setIsModalOpen(true);
  }

  function handleCloseDialog() {
    setIsModalOpen(false);
    setIsLinkCopied(false);
  }

  function handleToggleSharing() {
    if (!data?.note) return;

    if (isSharingEnabled) {
      void apolloClient.mutate({
        mutation: MUTATION_DELETE,
        variables: {
          input: {
            contentId: noteContentId,
          },
        },
        optimisticResponse: {
          deleteNoteSharing: {
            note: {
              __typename: 'Note',
              id: data.note.id,
              contentId: data.note.contentId,
              sharing: null,
            },
          },
        },
      });
    } else {
      setIsCreatingShareLink(true);
      void apolloClient
        .mutate({
          mutation: MUTATION_CREATE,
          variables: {
            input: {
              contentId: noteContentId,
            },
          },
          optimisticResponse: {
            createNoteSharing: {
              note: {
                __typename: 'Note',
                id: data.note.id,
                contentId: data.note.contentId,
                sharing: {
                  id: ':temp',
                },
              },
            },
          },
        })
        .finally(() => {
          setIsCreatingShareLink(false);
        });
    }
  }

  function handleCopyLink() {
    void navigator.clipboard.writeText(sharingLink).then(() => {
      setIsLinkCopied(true);
    });
  }

  function handleCloseLinkCopiedAlert() {
    setIsLinkCopied(false);
  }

  return (
    <>
      <Tooltip title="Collaboration">
        <span>
          <IconButton
            id={buttonId}
            onClick={handleClickOpenDialog}
            color="inherit"
            aria-label="note collaboration"
            aria-controls={isModalOpen ? dialogId : undefined}
            aria-haspopup={true}
            aria-expanded={isModalOpen ? true : undefined}
            size="medium"
            {...iconButtonProps}
          >
            <PersonAddAlt1Icon />
          </IconButton>
        </span>
      </Tooltip>

      <Dialog
        id={dialogId}
        open={isModalOpen}
        onClose={handleCloseDialog}
        fullWidth
        PaperProps={{
          variant: 'outlined',
          elevation: 0,
          sx: {
            m: 1,
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <LinkIcon />
            Share via link
          </Box>
        </DialogTitle>
        <IconButton
          aria-label="close"
          onClick={handleCloseDialog}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
        <DialogContent>
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center">
              <Switch
                disabled={loading}
                checked={isSharingEnabled || isCreatingShareLink}
                onChange={handleToggleSharing}
              />
              <Typography>
                Sharing is {isSharingEnabled ? 'enabled' : 'disabled'}
              </Typography>
            </Stack>

            <Box
              sx={(theme) => ({
                display: 'flex',
                flexDirection: 'row',
                gap: 1,
                [theme.breakpoints.down('sm')]: {
                  flexDirection: 'column',
                },
              })}
            >
              <Box
                sx={{
                  position: 'relative',
                  flexGrow: 1,
                }}
              >
                <TextField
                  variant="outlined"
                  disabled
                  value={loading ? '' : sharingLink}
                  fullWidth
                />
                {loading && (
                  <CircularProgress
                    size={30}
                    sx={{
                      position: 'absolute',
                      left: (theme) => theme.spacing(1),
                      top: '50%',
                      translate: '0 -50%',
                    }}
                  />
                )}
              </Box>
              <Button
                variant="contained"
                disabled={!isSharingEnabled}
                onClick={handleCopyLink}
              >
                Copy link
              </Button>
            </Box>

            <Snackbar
              open={isLinkCopied}
              autoHideDuration={5000}
              onClose={handleCloseLinkCopiedAlert}
            >
              <Alert severity="success" onClose={handleCloseLinkCopiedAlert}>
                Link copied
              </Alert>
            </Snackbar>

            <DialogContentText>
              Anyone with the link gains access to read and modify this note.
            </DialogContentText>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
