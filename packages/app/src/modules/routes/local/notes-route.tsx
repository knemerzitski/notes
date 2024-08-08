import { IsDesktop } from '../../common/components/is-desktop';
import { IsMobile } from '../../common/components/is-mobile';
import { CreateNoteFab } from '../../note/local/components/create-note-fab';
import { CreateNoteWidget } from '../../note/local/components/create-note-widget';
import { NotesConnectionList } from '../../note/local/components/notes-connection-list';

export function NotesRoute() {
  return (
    <>
      <IsDesktop>
        <CreateNoteWidget />
      </IsDesktop>

      <NotesConnectionList />

      <IsMobile>
        <CreateNoteFab />
      </IsMobile>
    </>
  );
}
