import { makeReference, makeVar } from '@apollo/client';
import { CollabEditor, CollabEditorOptions } from '~collab/client/collab-editor';

import {
  IdentifiedStoreObject,
  CompactStorageObject,
  identify,
  inverseIdentify,
} from '../apollo-client/utils/identify';

interface CacheEditor {
  object: IdentifiedStoreObject;
  editor: CollabEditor;
  vars: ReturnType<typeof createEditorReactiveVars>;
}

const mapByCacheId = new Map<string, CacheEditor>();
const mapByTypenameById = new Map<string, Map<string, CacheEditor>>();

function getAllByTypename(__typename: string) {
  let map = mapByTypenameById.get(__typename);
  if (!map) {
    map = new Map();
    mapByTypenameById.set(__typename, map);
  }
  return map;
}

const allByTypename = (__typename: string) => {
  return getAllByTypename(__typename).values();
};

const set = (objectOrId: string | CompactStorageObject, editor: CollabEditor) => {
  const ref =
    typeof objectOrId === 'string' ? makeReference(objectOrId) : identify(objectOrId);
  const object = inverseIdentify(objectOrId);

  const existing = mapByCacheId.get(ref.__ref);
  if (existing && existing.editor !== editor) {
    existing.vars.cleanUp();
  }

  const cacheEditor: CacheEditor = {
    object,
    editor,
    vars: createEditorReactiveVars(editor),
  };

  mapByCacheId.set(ref.__ref, cacheEditor);
  getAllByTypename(object.__typename).set(object.id, cacheEditor);

  return cacheEditor;
};

const get = (objectOrId: string | CompactStorageObject) => {
  return mapByCacheId.get(
    (typeof objectOrId === 'string' ? makeReference(objectOrId) : identify(objectOrId))
      .__ref
  );
};

const getOrCreate = (
  objectOrId: string | CompactStorageObject,
  getOptions?: () => CollabEditorOptions
) => {
  const existing = get(objectOrId);
  if (existing) return existing;
  return set(objectOrId, new CollabEditor(getOptions?.()));
};

const getOrCreateMaybe = (
  objectOrId: string | CompactStorageObject,
  getOptions?: () => CollabEditorOptions
) => {
  const existing = get(objectOrId);
  if (existing) return existing;
  const options = getOptions?.();
  if (!options) return;
  return set(objectOrId, new CollabEditor(options));
};

const _delete = (objectOrId: string | CompactStorageObject) => {
  const ref =
    typeof objectOrId === 'string' ? makeReference(objectOrId) : identify(objectOrId);
  const object =
    typeof objectOrId === 'string' ? inverseIdentify(objectOrId) : objectOrId;

  mapByCacheId.delete(ref.__ref);
  getAllByTypename(object.__typename).delete(object.id);
};

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

export const editorsInCache = {
  allByTypename,
  set,
  get,
  getOrCreate,
  getOrCreateMaybe,
  delete: _delete,
};
