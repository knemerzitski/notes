import { Box, BoxProps, Skeleton } from '@mui/material';

import { NoteCardItemProps, NoteCardItem } from './note-card-item';

const LOADING_SKELETON_COUNT = 6;

export interface NotesListProps extends BoxProps {
  notes: NoteCardItemProps['note'][];
  onStartEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export function NotesCardList({
  notes,
  onStartEdit,
  onDelete,
  loading = false,
  ...restProps
}: NotesListProps) {
  return (
    <Box
      {...restProps}
      sx={{
        width: '100%',
        display: 'grid',
        gridTemplateColumns: {
          xs: '100%',
          sm: 'repeat(auto-fit, 256px)',
        },
        justifyContent: 'center',
        gap: {
          xs: 1,
          md: 2,
        },
        mx: 1,
      }}
    >
      {loading
        ? [...Array(LOADING_SKELETON_COUNT).keys()].map((index) => (
            <Skeleton
              key={index}
              height={256}
              variant="rounded"
              animation="wave"
            ></Skeleton>
          ))
        : notes.map((note) => (
            <NoteCardItem
              key={note.id}
              note={note}
              onStartEdit={() => {
                onStartEdit?.(String(note.id));
              }}
              moreOptionsButtonProps={{
                onDelete() {
                  onDelete?.(String(note.id));
                },
              }}
              paperProps={{
                sx: {
                  height: {
                    xs: 'auto',
                    sm: '256px',
                  },
                },
              }}
            />
          ))}
    </Box>
  );
}
