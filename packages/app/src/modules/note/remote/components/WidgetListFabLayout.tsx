import useIsMobile from '../../../common/hooks/useIsMobile';
import NoteTextFieldEditorsProvider, {
  NoteTextFieldEditorsProviderProps,
} from '../context/NoteTextFieldEditorsProvider';

import CreateNoteFab, { CreateNoteFabProps } from './CreateNoteFab';
import CreateNoteWidget, { CreateNoteWidgetProps } from './CreateNoteWidget';
import NotesList, { NotesListProps } from './NotesList';

interface NotesLayoutProps {
  notesList: NotesListProps;
  createNoteWidget: CreateNoteWidgetProps;
  createNoteWidgetEditor: Omit<NoteTextFieldEditorsProviderProps, 'children'>;
  createNoteFab: CreateNoteFabProps;
}

export default function WidgetListFabLayout(props: NotesLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <>
      {!isMobile && (
        <NoteTextFieldEditorsProvider {...props.createNoteWidgetEditor}>
          <CreateNoteWidget
            {...props.createNoteWidget}
            paperProps={{
              ...props.createNoteWidget.paperProps,
              sx: {
                width: 'min(100%, 600px)',
                ...props.createNoteWidget.paperProps?.sx,
              },
            }}
          />
        </NoteTextFieldEditorsProvider>
      )}

      <NotesList {...props.notesList} />

      {isMobile && <CreateNoteFab {...props.createNoteFab} />}
    </>
  );
}
