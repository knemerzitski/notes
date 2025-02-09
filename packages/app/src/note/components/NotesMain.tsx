import { gql } from '../../__generated__';
import { FullWidthCenterMain } from '../../layout/components/FullWidthCenterMain';
import { FullWidthCenterRow } from '../../layout/components/FullWidthCenterRow';
import { useIsMobile } from '../../theme/context/is-mobile';

import { CreateNoteFab } from './CreateNoteFab';

import { CreateNoteWidget } from './CreateNoteWidget';
import { DefaultNotesConnectionGrid } from './DefaultNotesConnectionGrid';

const _NoteMain_UserFragment = gql(`
  fragment NoteMain_UserFragment on User {
    ...DefaultNotesConnectionGrid_UserFragment
  }
`);

export function NotesMain() {
  const isMobile = useIsMobile();

  return (
    <>
      <FullWidthCenterMain>
        {!isMobile && (
          <FullWidthCenterRow display="flex" justifyContent="center">
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
