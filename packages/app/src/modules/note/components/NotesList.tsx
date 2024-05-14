import { Skeleton } from '@mui/material';
import Grid, { GridProps } from '@mui/material/Grid';

import NoteItem, { NoteItemProps } from './NoteItem';

const LOADING_SKELETON_COUNT = 15;

export interface NotesListProps extends GridProps {
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
    <Grid container justifyContent="center" spacing={{ xs: 1, md: 2 }} {...restProps}>
      {loading
        ? [...Array(LOADING_SKELETON_COUNT).keys()].map((index) => (
            <Grid
              item
              key={index}
              sx={{
                width: {
                  xs: '100%',
                  sm: 'min(256px,100%)',
                },
              }}
            >
              <Skeleton
                width="inherit"
                height={384}
                variant="rounded"
                animation="wave"
              ></Skeleton>
            </Grid>
          ))
        : notes.map((note) => (
            <Grid
              item
              key={note.id}
              sx={{
                width: {
                  xs: '100%',
                  sm: 'min(256px,100%)',
                },
              }}
            >
              <NoteItem
                note={note}
                onStartEdit={() => {
                  onStartEdit(String(note.id));
                }}
                onDelete={() => onDelete(String(note.id))}
                sx={{
                  width: 'inherit',
                  height: '100%',
                }}
              />
            </Grid>
          ))}
    </Grid>
  );
}
