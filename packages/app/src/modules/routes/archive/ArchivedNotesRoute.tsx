import ArchiveIcon from '@mui/icons-material/Archive';
import { Box, Typography } from '@mui/material';

import { NoteCategory } from '../../../__generated__/graphql';
import NotesConnectionList from '../../note/remote/components/NotesConnectionList';

export default function ArchivedNotesRoute() {
  return (
    <>
      <NotesConnectionList
        notesConnectionOptions={{
          category: NoteCategory.ARCHIVE,
        }}
        emptyRender={
          <Box
            color="grey.800"
            sx={{
              marginTop: '15vh',
              display: 'flex',
              flexFlow: 'column nowrap',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <ArchiveIcon
              sx={{
                fontSize: '80px',
              }}
            />
            <Typography color="grey.700" fontWeight="bold">
              You have no archived notes
            </Typography>
          </Box>
        }
      />
    </>
  );
}
