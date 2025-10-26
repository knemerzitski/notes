import { NoteCategory } from '../graphql/domains/types.generated';

export type SeedItem = DemoUser | DemoNote | DemoShare;

export interface DemoUser {
  type: 'user';
  id: string;
  displayName: string;
}

export interface DemoNote {
  type: 'note';
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
}

export interface DemoShare {
  type: 'share';
  id: string;
  noteId: string;
  usersIds: string[];
  ownderIds: string[];
}

export const SEED_DATA: readonly SeedItem[] = [
  {
    type: 'user',
    id: 'demo-user-1',
    displayName: 'Demo Account 1',
  },
  {
    type: 'user',
    id: 'demo-user-2',
    displayName: 'Demo Account 2',
  },
  {
    type: 'note',
    id: 'demo-note-1',
    title: 'Shopping List',
    content: '1. Milk\n2. Eggs\n3. Bread\n4. Butter\n5. Fruits',
    category: NoteCategory.DEFAULT,
  },
  {
    type: 'share',
    id: 'demo-share-1',
    noteId: 'demo-note-1',
    usersIds: ['demo-user-1', 'demo-user-2'],
    ownderIds: ['demo-user-1'],
  },
];
