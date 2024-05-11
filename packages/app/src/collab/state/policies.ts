import { allActiveCollabTexts as Query_allActiveCollabTexts } from './policies/Query/allActiveCollabTexts';
import { id as CollabText_id } from './policies/CollabText/id';
import { viewText as CollabText_viewText } from './policies/CollabText/viewText';
import { TypePolicies } from '@apollo/client';

const collabTextPolicies: TypePolicies = {
  Query: {
    fields: {
      allActiveCollabTexts: Query_allActiveCollabTexts,
    },
  },
  CollabText: {
    fields: {
      id: CollabText_id,
      viewText: CollabText_viewText,
    },
  },
};

export default collabTextPolicies;
