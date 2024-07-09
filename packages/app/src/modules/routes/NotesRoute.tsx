import IsDesktop from '../common/components/IsDesktop';
import IsMobile from '../common/components/IsMobile';
import CreateNoteFab from '../note/remote/components/CreateNoteFab';
import CreateNoteWidget from '../note/remote/components/CreateNoteWidget';
import NotesConnectionList from '../note/remote/components/NotesConnectionList';

export default function NotesRoute() {
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
