import useClientSyncDebouncedCallback from './useClientSyncDebouncedCallback';
import useCollaborativeInputEditor, {
  UseCollaborativeInputEditorProps,
} from './useCollaborativeInputEditor';

interface DebounceProps {
  wait?: number;
  maxWait?: number;
}

interface UseDebounceCollaborativeInputEditorProps {
  debounce?: DebounceProps;
  editorProps: UseCollaborativeInputEditorProps;
}

export default function useDebounceCollaborativeInputEditor({
  debounce,
  editorProps,
}: UseDebounceCollaborativeInputEditorProps) {
  const editor = useCollaborativeInputEditor({
    ...editorProps,
    onCanSubmitLocalChanges() {
      editorProps.onCanSubmitLocalChanges?.();
      void submitContentDebounce();
    },
  });

  const submitContentDebounce = useClientSyncDebouncedCallback(
    async () => {
      await editor.submitChanges();
      if (editor.haveLocalChanges()) {
        void submitContentDebounce();
      }
    },
    debounce?.wait,
    { maxWait: debounce?.maxWait }
  );

  return editor;
}
