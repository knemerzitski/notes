import { useQuery } from '@apollo/client';
import { gql } from '../../../__generated__';
import { useNoteId } from '../../../note/context/note-id';
import {
  TableContainer,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import { Changeset } from '~collab/changeset';
import { PartialDeep } from '~utils/types';
import { DevNoteRecordsTableQueryQuery } from '../../../__generated__/graphql';
import { isDefined } from '~utils/type-guards/is-defined';

const DevNoteRecordsTable_Query = gql(`
  query DevNoteRecordsTable_Query($by: UserNoteLinkByInput!) {
    userNoteLink(by: $by){
      id
      note {
        id
        collabText {
          id
          recordConnection {
            edges {
              node {
                id
                change {
                  revision
                  changeset
                }
                createdAt
              }
            }
          }
        }
      }
    }
  }
`);

export function DevNoteRecordsTable() {
  const noteId = useNoteId();
  const { data } = useQuery(DevNoteRecordsTable_Query, {
    fetchPolicy: 'cache-only',
    variables: {
      by: {
        noteId,
      },
    },
    returnPartialData: true,
  });

  const partialData: PartialDeep<DevNoteRecordsTableQueryQuery, Changeset> | undefined =
    data;
  if (!partialData) {
    return null;
  }

  const collabText = partialData.userNoteLink?.note?.collabText;

  return (
    <TableContainer
      component={Paper}
      sx={{
        width: 'fit-content',
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Revision</TableCell>
            <TableCell>Changeset</TableCell>
            <TableCell>Created At</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {collabText?.recordConnection?.edges
            ?.map((edge) => edge?.node)
            .filter(isDefined)
            .map((node, index) => (
              <TableRow key={node.id ?? index}>
                <TableCell>{node.change?.revision ?? <RemoveIcon />}</TableCell>
                <TableCell>
                  {node.change?.changeset?.toString() ?? <RemoveIcon />}
                </TableCell>
                <TableCell>{node.createdAt?.toString() ?? <RemoveIcon />}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
