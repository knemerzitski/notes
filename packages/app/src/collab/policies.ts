import { TypePolicies } from '@apollo/client';
import { Changeset } from '~collab/changeset/changeset';
import { RevisionChangeset } from '../__generated__/graphql';

const collabTextPolicies: TypePolicies = {
  CollabText: {
    fields: {
      viewText: {
        read(existing, { readField }): string | null {
          if (typeof existing === 'string') {
            return existing;
          }

          const headText = readField('headText') as Partial<RevisionChangeset>;
          
          return Changeset.parseValue(headText.changeset).joinInsertions();
        },
      },
    },
  },
};

export default collabTextPolicies;
