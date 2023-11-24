import { Resolvers } from '@apollo/client';

import { ColorMode, Note, Preferences, Session } from '../__generated__/graphql';

async function throttle() {
  await new Promise((res) => {
    setTimeout(res, 100);
  });
}

const DEFAULT_SESSIONS: Session[] = [
  {
    __typename: 'LocalSession',
    id: 'test_1',
    displayName: 'Local Account',
  },
  {
    __typename: 'LocalSession',
    id: 'test_2',
    displayName: 'Local Account 2',
  },
];

function getSessions(): Session[] {
  const sessionsStr = localStorage.getItem('sessions');
  const sessions = sessionsStr
    ? (JSON.parse(sessionsStr) as Session[])
    : DEFAULT_SESSIONS;
  if (sessions.length === 0) {
    sessions.push(...DEFAULT_SESSIONS);
    setSessions(sessions);
    setActiveSessionIndex(0);
  }
  return sessions;
}

function setSessions(session: Session[]) {
  localStorage.setItem('sessions', JSON.stringify(session));
}

function setActiveSessionIndex(index: number) {
  localStorage.setItem('activeSessionIndex', JSON.stringify(index));
}

function getActiveSessionIndex(): number {
  const currentUserIndexStr = localStorage.getItem('activeSessionIndex');

  if (!currentUserIndexStr) return 0;

  const index = Number.parseInt(currentUserIndexStr);
  return Number.isNaN(index) ? 0 : index;
}

function getActiveSession(): Session {
  const sessions = getSessions();
  const index = getActiveSessionIndex();

  if (0 <= index && index < sessions.length) {
    return sessions[index];
  } else {
    return sessions[0];
  }
}

function getNextNoteId(): string {
  return localStorage.getItem('nextNoteId') ?? '1';
}

function setNextNoteId(nextNoteId: string) {
  localStorage.setItem('nextNoteId', nextNoteId);
}

function getSessionNotes(session: Session): Note[] {
  const notesStr = localStorage.getItem(`notes:${session.id}`);
  return notesStr ? (JSON.parse(notesStr) as Note[]) : [];
}

function setSessionNotes(session: Session, notes: Note[]) {
  localStorage.setItem(`notes:${session.id}`, JSON.stringify(notes));
}

function getActiveSessionNotes(): Note[] {
  return getSessionNotes(getActiveSession());
}

function setActiveSessionNotes(notes: Note[]) {
  setSessionNotes(getActiveSession(), notes);
}

function getPreferences() {
  const prefStr = localStorage.getItem('preferences');
  return prefStr ? (JSON.parse(prefStr) as Preferences) : null;
}

function setPreferences(preferences: Preferences) {
  localStorage.setItem('preferences', JSON.stringify(preferences));
}

const resolvers: Resolvers = {
  Query: {
    preferences() {
      console.log('resolvers:Query:preferences');
      return getPreferences();
    },
    async sessions() {
      await throttle();
      console.log('resolvers:Query:sessions');

      return getSessions();
    },
    async activeSessionIndex() {
      await throttle();
      console.log('resolvers:Query:activeSessionIndex');

      return getActiveSessionIndex();
    },
    async notes() {
      await throttle();
      console.log('resolvers:Query:notes');

      return getActiveSessionNotes().map((note) => ({
        __typename: 'Note',
        ...note,
      }));
    },
    async note(_root, { id }: { id: string }) {
      await throttle();
      console.log('resolvers:Query:note', id);
      const notes = getActiveSessionNotes();
      const note = notes.find((note) => note.id === id);
      if (!note) return null;

      return {
        __typename: 'Note',
        ...note,
      };
    },
  },
  Mutation: {
    updateColorMode(_root, { colorMode }: { colorMode: ColorMode }) {
      console.log('resolvers:Mutation:updateColorMode', colorMode);
      const preferences = getPreferences() ?? {};

      setPreferences({
        ...preferences,
        colorMode,
      });

      return true;
    },
    async switchToSession(_root, { index }: { index: number }) {
      await throttle();
      console.log('resolvers:Mutation:switchToSession', index);

      if (index < 0) return false;

      const sessions = getSessions();
      if (index >= sessions.length) return false;

      setActiveSessionIndex(index);

      return true;
    },
    async insertNote(_root, { title, content }: { title: string; content: string }) {
      await throttle();
      console.log('resolvers:Mutation:insertNote', title, content);
      const noteId = getNextNoteId();
      setNextNoteId(String(Number.parseInt(noteId) + 1));

      const newNote: Note = {
        id: noteId,
        title: title.trim(),
        content: content.trim(),
      };

      const notes = getActiveSessionNotes();
      setActiveSessionNotes([newNote, ...notes]);

      return {
        __typename: 'Note',
        ...newNote,
      };
    },
    async updateNote(_root, { note }: { note: Note }) {
      await throttle();
      console.log('resolvers:Mutation:updateNote', note);
      const notes = getActiveSessionNotes();

      setActiveSessionNotes(
        notes.map((existingNote) => (existingNote.id === note.id ? note : existingNote))
      );

      return true;
    },
    async deleteNote(_root, { id }: { id: string }) {
      await throttle();
      console.log('resolvers:Mutation:deleteNote', id);

      const notes = getActiveSessionNotes();
      setActiveSessionNotes(notes.filter((note) => note.id !== id));

      return true;
    },
  },
};

export default resolvers;
