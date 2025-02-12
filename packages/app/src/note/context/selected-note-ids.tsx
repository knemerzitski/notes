import mitt, { Emitter } from 'mitt';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

import { Note } from '../../__generated__/graphql';

interface SelectedNodeIdsEvents {
  added: {
    id: Note['id'];
  };
  removed: {
    id: Note['id'];
  };
}

interface SelectedNoteIdsModel {
  add: (id: Note['id']) => void;
  remove: (id: Note['id']) => void;
  has: (id: Note['id']) => boolean;
  clear: () => void;
  getAll: () => readonly Note['id'][];
  eventBus: Pick<Emitter<SelectedNodeIdsEvents>, 'on' | 'off'>;
}

const SelectedNoteIdsModelContext = createContext<SelectedNoteIdsModel | null>(null);

export function useSelectedNoteIdsModel(): SelectedNoteIdsModel {
  const ctx = useContext(SelectedNoteIdsModelContext);
  if (ctx === null) {
    throw new Error(
      'useSelectedNoteIdsModel() requires context <SelectedNoteIdsProvider>'
    );
  }
  return ctx;
}

export function SelectedNoteIdsProvider({ children }: { children: ReactNode }) {
  const noteIdsRef = useRef<readonly Note['id'][]>([]);

  const eventBusRef = useRef<Emitter<SelectedNodeIdsEvents>>(mitt());

  const add: SelectedNoteIdsModel['add'] = useCallback((id) => {
    const prev = noteIdsRef.current;
    if (!prev.includes(id)) {
      noteIdsRef.current = [...prev, id];
    }

    eventBusRef.current.emit('added', { id });
  }, []);

  const remove: SelectedNoteIdsModel['remove'] = useCallback((id) => {
    const prev = noteIdsRef.current;
    if (prev.includes(id)) {
      noteIdsRef.current = prev.filter((prevId) => prevId !== id);
    }

    eventBusRef.current.emit('removed', { id });
  }, []);

  const has: SelectedNoteIdsModel['has'] = useCallback(
    (id) => noteIdsRef.current.includes(id),
    []
  );

  const getAll: SelectedNoteIdsModel['getAll'] = useCallback(
    () => noteIdsRef.current,
    []
  );

  const clear: SelectedNoteIdsModel['clear'] = useCallback(() => {
    const beforeClearNoteIds = noteIdsRef.current;
    noteIdsRef.current = [];

    beforeClearNoteIds.forEach((id) => {
      eventBusRef.current.emit('removed', { id });
    });
  }, []);

  const model: SelectedNoteIdsModel = useMemo(
    () => ({
      add,
      remove,
      has,
      getAll,
      clear,
      eventBus: eventBusRef.current,
    }),
    [add, remove, has, getAll, clear]
  );

  return (
    <SelectedNoteIdsModelContext.Provider value={model}>
      {children}
    </SelectedNoteIdsModelContext.Provider>
  );
}
