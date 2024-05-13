import useMobile from '../../../hooks/useIsMobile';
import NoteTextFieldEditorsProvider, {
  NoteTextFieldEditorsProviderProps,
} from '../../context/NoteTextFieldEditorsProvider';
import CreateNoteFab, { CreateNoteFabProps } from '../create/CreateNoteFab';
import CreateNoteWidget, { CreateNoteWidgetProps } from '../create/CreateNoteWidget';
import NotesList, { NotesListProps } from '../view/NotesList';

interface NotesLayoutProps {
  notesList: NotesListProps;
  createNoteWidget: CreateNoteWidgetProps;
  createNoteWidgetEditor: Omit<NoteTextFieldEditorsProviderProps, 'children'>;
  createNoteFab: CreateNoteFabProps;
}

export default function WidgetListFabLayout(props: NotesLayoutProps) {
  const isMobile = useMobile();

  return (
    <>
      {!isMobile && (
        <NoteTextFieldEditorsProvider {...props.createNoteWidgetEditor}>
          <CreateNoteWidget
            {...props.createNoteWidget}
            sx={{
              width: 'min(100%, 600px)',
              ...props.createNoteWidget.sx,
            }}
          />
        </NoteTextFieldEditorsProvider>
      )}

      <NotesList {...props.notesList} />

      {isMobile && <CreateNoteFab {...props.createNoteFab} />}
    </>
  );
}
