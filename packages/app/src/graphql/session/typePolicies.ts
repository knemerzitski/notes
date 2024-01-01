import { TypePolicies } from '@apollo/client';
import { GraphQLError } from 'graphql';

import {
  CreateSavedSessionInput,
  CreateSavedSessionPayload,
  DeleteSavedSessionInput,
  DeleteSavedSessionPayload,
  SavedSession,
  SwitchToSavedSessionInput,
  SwitchToSavedSessionPayload,
  UpdateSavedSessionPatchInput,
  UpdateSavedSessionPayload,
} from '../__generated__/graphql';

import {
  deleteCurrentSessionIndex,
  readCurrentSession,
  readCurrentSessionIndex,
  readSessionProfiles,
  saveCurrentSessionIndex,
  saveSessionProfiles,
} from './persistence';

const typePolicies: TypePolicies = {
  Query: {
    fields: {
      savedSessions: {
        read(): SavedSession[] {
          return readSessionProfiles().map((profile, index) => ({ index, profile }));
        },
      },
      currentSavedSession: {
        read(): SavedSession | null {
          const session = readCurrentSession();
          if (!session) {
            return null;
          }
          return session;
        },
      },
    },
  },
  Mutation: {
    fields: {
      createSavedSession: {
        read(
          _,
          { variables }: { variables?: { input?: CreateSavedSessionInput } }
        ): CreateSavedSessionPayload {
          if (!variables?.input) {
            throw new GraphQLError('Missing input');
          }

          const { index, profile } = variables.input;

          const profiles = readSessionProfiles();
          profiles[index] = profile;

          saveSessionProfiles(profiles);

          return {
            savedSession: variables.input,
          };
        },
      },
      updateSavedSession: {
        read(
          _,
          { variables }: { variables?: { input?: UpdateSavedSessionPatchInput } }
        ): UpdateSavedSessionPayload {
          if (!variables?.input) {
            throw new GraphQLError('Missing input');
          }

          const { index, patch } = variables.input;

          const profiles = readSessionProfiles();
          const profile = profiles[index];
          profile.displayName = patch.displayName ?? profile.displayName;
          profile.email = patch.email ?? profile.email;
          saveSessionProfiles(profiles);

          return {
            savedSession: {
              index,
              profile,
            },
          };
        },
      },
      deleteSavedSession: {
        read(
          _,
          { variables }: { variables?: { input?: DeleteSavedSessionInput } }
        ): DeleteSavedSessionPayload {
          if (!variables?.input) {
            throw new GraphQLError('Missing input');
          }
          const { index } = variables.input;

          const profiles = readSessionProfiles();
          profiles.splice(index, 1);
          saveSessionProfiles(profiles);

          const currentIndex = readCurrentSessionIndex();
          if (currentIndex === index) {
            deleteCurrentSessionIndex();
          }

          return {
            deleted: true,
          };
        },
      },
      switchToSavedSession: {
        read(
          _,
          { variables }: { variables?: { input?: SwitchToSavedSessionInput } }
        ): SwitchToSavedSessionPayload {
          if (!variables?.input) {
            throw new GraphQLError('Missing input');
          }
          const { index } = variables.input;

          const profiles = readSessionProfiles();

          if (index < 0 || index >= profiles.length) {
            throw new GraphQLError('Invalid index');
          }

          saveCurrentSessionIndex(index);

          return {
            session: {
              index,
              profile: profiles[index],
            },
          };
        },
      },
    },
  },
};

export default typePolicies;
