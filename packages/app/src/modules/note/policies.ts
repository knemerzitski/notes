import { NormalizedCacheObject, TypePolicies } from '@apollo/client';
import { relayStylePagination } from '@apollo/client/utilities';
import { allActiveNotes as Query_allActiveNotes } from './policies/Query/allActiveNotes';
import { note as Query_note } from './policies/Query/note';
import { id as Note_id } from './policies/Note/id';
import { isOwner as Note_isOwner } from './policies/Note/isOwner';
import { fieldArrayToMap } from '../apollo-client/utils/fieldArrayToMap';
import customKeyArgsFn from '../apollo-client/utils/customKeyArgsFn';
import { EvictTag, EvictTypePolicies } from '../apollo-client/policy/evict';
import { getCurrentUserIdInStorage } from '../auth/user';
import { KeyArguments } from '../apollo-client/key-args';
import { LinkTypePolicies } from '../apollo-client/links/type-link';
import { link as Note_link } from './policies/Note/link';

const notePolicies: TypePolicies &
  EvictTypePolicies &
  LinkTypePolicies<NormalizedCacheObject> = {
  Query: {
    fields: {
      allActiveNotes: Query_allActiveNotes,
      note: Query_note,
      notesConnection: {
        evict: {
          tag: EvictTag.UserSpecific,
        },
        ...relayStylePagination(
          customKeyArgsFn({
            customArgsFnMap: {
              [KeyArguments.UserId]: () => getCurrentUserIdInStorage(),
            },
          })
        ),
      },
    },
  },
  UserNoteMapping: {
    keyFields: ['user', ['id'], 'note', ['contentId']],
  },
  Note: {
    fields: {
      id: Note_id,
      textFields: fieldArrayToMap('key', {
        argName: 'name',
      }),
      isOwner: Note_isOwner,
    },
    link: Note_link,
  },
  NotePatch: {
    keyFields: false,
  },
};

export default notePolicies;
