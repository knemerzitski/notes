import { FieldFunctionOptions, ReactiveVar, makeVar } from '@apollo/client';
import { CollabEditor } from '~collab/client/collab-editor';
import { RevisionChangeset, SerializedRevisionChangeset } from '~collab/records/record';

/**
 * Editors by CollabText.id
 */
const editorsContextById = new Map<string, CollabEditorContext>();

export class CollabEditorContext {
  readonly editor: CollabEditor;
  readonly viewTextVar: ReactiveVar<string>;

  private unsubscribeFromEvents: () => void;

  constructor(editor: CollabEditor) {
    this.editor = editor;

    const subscribedListeners: (() => void)[] = [];
    this.unsubscribeFromEvents = () => {
      subscribedListeners.forEach((unsub) => {
        unsub();
      });
    };

    this.viewTextVar = makeVar<string>(editor.viewText);
    subscribedListeners.push(
      editor.eventBus.on('viewChanged', () => {
        this.viewTextVar(editor.viewText);
      })
    );
  }

  /**
   * Removes event listeners from editor. This instance becomes useless.
   */
  cleanUp() {
    this.unsubscribeFromEvents();
  }
}

export function getEditorContext(
  collabTextId: string,
  getHeadText: () => SerializedRevisionChangeset | undefined
) {
  const editorContext = getEditorContextMaybe(collabTextId, getHeadText);
  if (!editorContext) {
    throw new Error(`CollabText '${collabTextId}' is missing headText`);
  }
  return editorContext;
}

export function getEditorContextMaybe(
  collabTextId: string,
  getHeadText: () => SerializedRevisionChangeset | undefined
) {
  const existingContext = editorsContextById.get(collabTextId);
  if (existingContext) return existingContext;

  const serializedHeadText = getHeadText();
  if (!serializedHeadText) {
    return;
  }
  const headText = RevisionChangeset.parseValue(serializedHeadText);

  const editor = CollabEditor.newFromHeadText(headText);

  const newContext = new CollabEditorContext(editor);
  editorsContextById.set(collabTextId, newContext);

  return newContext;
}

export function getEditorContextInPolicy({
  readField,
}: Pick<FieldFunctionOptions, 'readField'>) {
  const read_id = readField('id');
  if (!read_id) {
    throw new Error('Expected CollabText.id to be defined.');
  }
  return getEditorContext(String(read_id), () => readField('headText'));
}
