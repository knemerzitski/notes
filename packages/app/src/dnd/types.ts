import { Note, NoteCategory } from '../__generated__/graphql';

export enum DndType {
  NOTE = 'note',
  NOTE_CATEGORY = 'note-category',
}

export interface NoteDndData {
  type: DndType.NOTE;
  noteId: Note['id'];
}

export interface NoteCategoryDndData {
  type: DndType.NOTE_CATEGORY;
  category: NoteCategory;
}

export type DndData = NoteDndData | NoteCategoryDndData;
