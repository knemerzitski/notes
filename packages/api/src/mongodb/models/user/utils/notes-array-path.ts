/**
 * @param category Enum value NoteCategory
 * @returns MongoDB field path to notes array of ObjectIds
 */
export function notesArrayPath(category: string) {
  return `note.categories.${category}.noteIds`;
}
