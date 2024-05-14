import { FieldFunctionOptions, makeVar } from '@apollo/client';
import { CollabEditor } from '~collab/client/collab-editor';
import { RevisionChangeset, SerializedRevisionChangeset } from '~collab/records/record';

type EditorId = string;

/**
 * Editors by CollabText.id
 */
const editorsWithVarsMap = new Map<
  EditorId,
  { editor: CollabEditor; vars: ReturnType<typeof createEditorReactiveVars> }
>();

const all = () => {
  return editorsWithVarsMap;
};

const set = (id: EditorId, editor: CollabEditor) => {
  const existing = editorsWithVarsMap.get(id);
  if (existing && existing.editor !== editor) {
    existing.vars.cleanUp();
  }
  editorsWithVarsMap.set(id, { editor, vars: createEditorReactiveVars(editor) });
};

const get = (id: EditorId) => {
  return editorsWithVarsMap.get(id);
};

const getOrCreate = (
  id: EditorId,
  getHeadText: () => SerializedRevisionChangeset | RevisionChangeset | undefined
) => {
  const existingContext = editorsWithVarsMap.get(id);
  if (existingContext) return existingContext;

  const anyHeadText = getHeadText();
  if (!anyHeadText) {
    return;
  }

  const headText = RevisionChangeset.parseValue(anyHeadText);
  const editor = CollabEditor.newFromHeadText(headText);

  const result = {
    editor,
    vars: createEditorReactiveVars(editor),
  };
  editorsWithVarsMap.set(id, result);

  return result;
};

function getOrCreateOrFail(
  collabTextId: string,
  getHeadText: () => SerializedRevisionChangeset | undefined
) {
  const editorContext = getOrCreate(collabTextId, getHeadText);
  if (!editorContext) {
    throw new Error(`CollabText '${collabTextId}' is missing headText`);
  }
  return editorContext;
}

const _delete = (id: EditorId) => {
  const editorContext = editorsWithVarsMap.get(id);
  if (editorContext) {
    editorsWithVarsMap.delete(id);
  }
  return editorContext;
};

function getOrCreateOrFailInPolicy({
  readField,
}: Pick<FieldFunctionOptions, 'readField'>) {
  const read_id = readField('id');
  if (!read_id) {
    throw new Error('Expected CollabText.id to be defined.');
  }
  return getOrCreateOrFail(String(read_id), () => readField('headText'));
}

function createEditorReactiveVars(editor: CollabEditor) {
  const subscribedListeners: (() => void)[] = [];

  const viewTextVar = makeVar<string>(editor.viewText);
  subscribedListeners.push(
    editor.eventBus.on('viewChanged', () => {
      viewTextVar(editor.viewText);
    })
  );

  return {
    viewTextVar,
    /**
     * Removes event listeners from editor. Reactive vars become useless.
     */
    cleanUp: () => {
      subscribedListeners.forEach((unsub) => {
        unsub();
      });
    },
  };
}

export const editorsWithVars = {
  all,
  set,
  get,
  getOrCreate,
  getOrCreateOrFail,
  getOrCreateOrFailInPolicy,
  delete: _delete,
};
