import IsDesktop from '../../common/components/IsDesktop';
import IsMobile from '../../common/components/IsMobile';
import CreateNoteFab from '../../note/local/components/CreateNoteFab';
import CreateNoteWidget from '../../note/local/components/CreateNoteWidget';
import NotesConnectionList from '../../note/local/components/NotesConnectionList';

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
