import isDefined from '~utils/type-guards/isDefined';
import { Maybe } from '~utils/types';

import { DeepQueryPartial } from '../../../mongodb/query/query';
import { RevisionRecordSchema } from '../../../mongodb/schema/collab-text/collab-text';
import { CollabTextRecordQueryMapper } from '../../collab/mongo-query-mapper/revision-record';
import { CollabTextPatch, NoteTextField } from '../../types.generated';
import { NoteCollabTextQueryMapper } from '../mongo-query-mapper/note-collab-text';
import { NoteMapper, NotePatchMapper } from '../schema.mappers';

export interface MongoNotePatch {
  collabTexts: Record<
    string,
    {
      newRecord?: Maybe<RevisionRecordSchema>;
    } & Pick<CollabTextPatch, 'isExistingRecord'>
  >;
}

export class MongoNotePatchMapper implements NotePatchMapper {
  private readonly note: Pick<
    NoteMapper,
    | 'id'
    | 'noteId'
    | 'contentId'
    | 'readOnly'
    | 'isOwner'
    | 'categoryName'
    | 'preferences'
  >;
  private readonly notePatch: DeepQueryPartial<MongoNotePatch>;

  constructor(note: NoteMapper, notePatch: DeepQueryPartial<MongoNotePatch>) {
    this.note = note;
    this.notePatch = notePatch;
  }

  id() {
    return this.note.id();
  }

  contentId() {
    return this.note.contentId();
  }

  textFields() {
    if (!this.notePatch.collabTexts) return;

    const entries = Object.entries(this.notePatch.collabTexts);
    if (entries.length === 0) return;

    return entries
      .map(async ([fieldName, collabTextPatch]) => {
        if (!collabTextPatch) return null;

        const collabText = new NoteCollabTextQueryMapper(
          {
            id: () => this.note.noteId(),
          },
          fieldName,
          {
            query() {
              return null;
            },
          }
        );

        const collabTextId = await collabText.id();
        if (!collabTextId) return null;

        return {
          key: fieldName as NoteTextField,
          value: {
            id: collabTextId,
            newRecord: new CollabTextRecordQueryMapper(collabText, {
              query: () => {
                return collabTextPatch.newRecord;
              },
            }),
            isExistingRecord: collabTextPatch.isExistingRecord,
          },
        };
      })
      .filter(isDefined);
  }

  sharing() {
    // TODO never for note patch.. this is part of sharing
    return null;
  }

  readOnly() {
    return this.note.readOnly();
  }

  preferences() {
    return this.note.preferences();
  }

  isOwner() {
    return this.note.isOwner();
  }

  categoryName() {
    return this.note.categoryName();
  }
}
