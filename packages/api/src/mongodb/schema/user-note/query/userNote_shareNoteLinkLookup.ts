import { ShareNoteLinkSchema } from '../../share-note-link/share-note-link';

export interface UserNote_ShareNoteLinkLookupParams {
  /**
   * ShareNoteLink collection name
   */
  collectionName: string;
  /**
   * Pipeline to be applied on ShareNoteLink
   */
  pipeline?: Document[];
}

export interface UserNote_ShareNoteLinksLookup<T = ShareNoteLinkSchema> {
  shareNoteLinks: T[];
}

/**
 * Adds UserNote.shareNoteLinks = [...]
 */
export default function userNote_shareNoteLinkLookup({
  collectionName,
  pipeline = [],
}: UserNote_ShareNoteLinkLookupParams) {
  return [
    {
      $lookup: {
        from: collectionName,
        foreignField: 'sourceUserNote._id',
        localField: '_id',
        as: 'shareNoteLinks',
        pipeline,
      },
    },
  ];
}
