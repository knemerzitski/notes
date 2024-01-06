import useMobile from '../../../hooks/useIsMobile';
import CreateNoteFab, { CreateNoteFabProps } from '../create/CreateNoteFab';
import CreateNoteWidget, { CreateNoteWidgetProps } from '../create/CreateNoteWidget';
import NotesList, { NotesListProps } from '../view/NotesList';

interface NotesLayoutProps {
  slotProps: {
    notesList: NotesListProps;
    createNoteWidget: CreateNoteWidgetProps;
    createNoteFab: CreateNoteFabProps;
  };
}

export default function WidgetListFabLayout(props: NotesLayoutProps) {
  const isMobile = useMobile();

  return (
    <>
      {!isMobile && (
        <CreateNoteWidget
          {...props.slotProps.createNoteWidget}
          sx={{
            width: 'min(100%, 600px)',
            ...props.slotProps.createNoteWidget.sx,
          }}
        />
      )}

      <NotesList {...props.slotProps.notesList} />

      {isMobile && <CreateNoteFab {...props.slotProps.createNoteFab} />}
    </>
  );
}
