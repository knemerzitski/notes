import { gql } from '../../../__generated__/gql';
import useSubmitChanges from '../../../collab/hooks/useSubmitChanges';
import useClientSyncDebouncedCallback from '../../../hooks/useClientSyncDebouncedCallback';
import { useSuspenseNoteEditors } from '../context/NoteEditorsProvider';
import { useNoteId } from '../context/NoteIdProvider';

const MUTATION = gql(`
  mutation NoteUseSubmitLocalChanges($input: UpdateNoteInput!)  {
    updateNote(input: $input) {
      contentId
      patch {
        textFields {
          key
          value {
            newRecord {
              id
              change {
                changeset
                revision
              }
            }
          }
        }
      }
    }
  }
`);

export interface DebounceOptions {
  wait?: number;
  maxWait?: number;
}

export interface SubmitChangesOnLocalChangeDebouncedOptions {
  /**
   * After done submitting, start another debounce if new changes exist.
   * @default false
   */
  autoContinueSubmit?: boolean;
  debounce?: DebounceOptions;
}

export default function useSubmitChangesDebounce({
  autoContinueSubmit = false,
  debounce = {
    //TODO reset debounce
    wait: 500,
    maxWait: 500,
    // wait: 250,
    // maxWait: 600,
  },
}: SubmitChangesOnLocalChangeDebouncedOptions) {
  const noteId = useNoteId();
  const editors = useSuspenseNoteEditors();

  const submitChanges = useSubmitChanges({
    mutation: MUTATION,
    editors,
    mapVariables(variables) {
      return {
        input: {
          id: noteId,
          patch: {
            textFields: variables,
          },
        },
      };
    },
    mapData(data) {
      return data.updateNote.patch?.textFields;
    },
  });

  const submitDebounce = useClientSyncDebouncedCallback(
    async () => {
      const result = await submitChanges();

      if (autoContinueSubmit) {
        const canSubmitChanges = editors.some(({ value: editor }) =>
          editor.canSubmitChanges()
        );
        if (canSubmitChanges) {
          void submitDebounce();
        }
      }

      return result;
    },
    debounce.wait,
    { maxWait: debounce.maxWait }
  );

  return submitDebounce;
}
