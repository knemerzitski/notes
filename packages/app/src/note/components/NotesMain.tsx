import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';
import { useIsMobile } from '../../theme/context/is-mobile';
import { CreateNoteFab } from './CreateNoteFab';

import { CreateNoteWidget } from './CreateNoteWidget';
import { DefaultNotesConnectionGrid } from './DefaultNotesConnectionGrid';

const _NoteMain_QueryFragment = gql(`
  fragment NoteMain_QueryFragment on Query {
    ...DefaultNotesConnectionGrid_QueryFragment
  }
`);

export function NotesMain() {
  const isMobile = useIsMobile();

  return (
    <>
      <FullWidthCenterMain>
        {!isMobile && (
          <FullWidthCenterRow justifyItems="center">
            <CreateNoteWidget />
          </FullWidthCenterRow>
        )}
        <FullWidthCenterRow>
          <DefaultNotesConnectionGrid />
        </FullWidthCenterRow>
      </FullWidthCenterMain>
      {isMobile && <CreateNoteFab />}
    </>
  );
}
