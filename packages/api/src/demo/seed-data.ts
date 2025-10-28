import { NoteCategory } from '../graphql/domains/types.generated';

export type SeedItem = DemoUser | DemoNote | DemoNoteUser;

export interface DemoUser {
  type: 'user';
  id: string;
  displayName: string;
  avatarColor: string;
}

export interface DemoNote {
  type: 'note';
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
}

export interface DemoNoteUser {
  type: 'demo-note-user';
  noteId: string;
  userId: string;
  isOwner: boolean;
}

export const SEED_DATA: readonly SeedItem[] = [
  {
    type: 'user',
    id: 'demo-user-1',
    displayName: 'Demo Account 1',
    avatarColor: '#63db00',
  },
  {
    type: 'user',
    id: 'demo-user-2',
    displayName: 'Demo Account 2',
    avatarColor: '#0045db',
  },
  {
    type: 'note',
    id: 'demo-note-1',
    title: 'Shopping List',
    content: '1. Milk\n2. Eggs\n3. Bread\n4. Butter\n5. Fruits',
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'demo-note-user',
    noteId: 'demo-note-1',
    userId: 'demo-user-1',
    isOwner: true,
  },
  {
    type: 'demo-note-user',
    noteId: 'demo-note-1',
    userId: 'demo-user-2',
    isOwner: false,
  },
];
