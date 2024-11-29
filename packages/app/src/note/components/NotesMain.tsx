import { DefaultNotesConnectionGrid } from './DefaultNotesConnectionGrid';
import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';
import { CreateNoteWidget } from './CreateNoteWidget';

const _NoteMain_QueryFragment = gql(`
  fragment NoteMain_QueryFragment on Query {
    ...DefaultNotesConnectionGrid_QueryFragment
  }
`);

export function NotesMain() {
  return (
    <FullWidthCenterMain>
      <FullWidthCenterRow justifyItems="center">
        <CreateNoteWidget />
      </FullWidthCenterRow>
      <FullWidthCenterRow>
        <DefaultNotesConnectionGrid />
      </FullWidthCenterRow>
    </FullWidthCenterMain>
  );
}
