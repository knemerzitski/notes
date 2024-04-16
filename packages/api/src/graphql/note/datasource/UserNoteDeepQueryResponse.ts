import { CollabTextRevisionRecordsPaginationOutput } from '../../../mongodb/operations/pagination/revisionRecordsPagination';
import { DeepQueryResponse } from '../../../mongodb/query-builder';
import { CollabTextQuery } from '../../collab/mongo-query-mapper/collab-text';
import { CollabTextRecordQuery } from '../../collab/mongo-query-mapper/revision-record';
import { NoteTextField } from '../../types.generated';
import { NoteQuery } from '../mongo-query-mapper/note';

export type UserNoteDeepQueryResponse<TCollabTextKey extends string = NoteTextField> =
  DeepQueryResponse<Omit<NoteQuery<TCollabTextKey>, 'note'>> & {
    note?: DeepQueryResponse<
      Omit<NoteQuery<TCollabTextKey>['note'], 'collabTexts'>
    > & {
      collabTexts?: Record<
        TCollabTextKey,
        DeepQueryResponse<Omit<CollabTextQuery, 'records'>> & {
          records?: CollabTextRevisionRecordsPaginationOutput<
            DeepQueryResponse<CollabTextRecordQuery>
          >;
        }
      >;
    };
  };
