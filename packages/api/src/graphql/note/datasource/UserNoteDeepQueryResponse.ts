import { CollabTextRevisionRecordsPaginationOutput } from '../../../mongodb/operations/pagination/revisionRecordsPagination';
import { DeepQueryResponse } from '../../../mongodb/query-builder';
import { CollaborativeDocumentQueryType } from '../../collab/mongo-query-mapper/collaborative-document';
import { RevisionRecordQueryType } from '../../collab/mongo-query-mapper/revision-record';
import { NoteTextField } from '../../types.generated';
import { NoteQueryType } from '../mongo-query-mapper/note';

export type UserNoteDeepQueryResponse<TCollabTextKey extends string = NoteTextField> =
  DeepQueryResponse<Omit<NoteQueryType<TCollabTextKey>, 'note'>> & {
    note?: DeepQueryResponse<
      Omit<NoteQueryType<TCollabTextKey>['note'], 'collabText'>
    > & {
      collabText?: Record<
        TCollabTextKey,
        DeepQueryResponse<Omit<CollaborativeDocumentQueryType, 'records'>> & {
          records?: CollabTextRevisionRecordsPaginationOutput<
            DeepQueryResponse<RevisionRecordQueryType>
          >;
        }
      >;
    };
  };
