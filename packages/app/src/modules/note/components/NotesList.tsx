import { Box, BoxProps, Skeleton } from '@mui/material';

import NoteItem, { NoteItemProps } from './NoteItem';

const LOADING_SKELETON_COUNT = 15;

export interface NotesListProps extends BoxProps {
  notes: NoteItemProps['note'][];
  onStartEdit: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  loading?: boolean;
}

export default function NotesList({
  notes,
  onStartEdit,
  onDelete,
  loading = false,
  ...restProps
}: NotesListProps) {
  return (
    <Box
      {...restProps}
      sx={(theme) => ({
        width: '100%',
        display: 'grid',
        gridTemplateColumns: {
          xs: `calc(100% - ${theme.spacing(1)})`,
          sm: 'repeat(auto-fit, 256px)',
        },
        justifyContent: 'center',
        gap: {
          xs: 1,
          md: 2,
        },
        mx: 1,
      })}
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
            <NoteItem
              key={note.id}
              note={note}
              onStartEdit={() => {
                onStartEdit(String(note.id));
              }}
              onDelete={() => onDelete(String(note.id))}
              sx={{
                height: {
                  xs: 'auto',
                  sm: '256px',
                },
              }}
            />
          ))}
    </Box>
  );
}
