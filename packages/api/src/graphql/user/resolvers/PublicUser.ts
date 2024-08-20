import type { PublicUserResolvers } from './../../types.generated';
import { SignedInUser_id, SignedInUser_publicProfile } from './SignedInUser';

export const PublicUser: PublicUserResolvers = {
  id: (parent, _arg, _ctx) => {
    return SignedInUser_id(parent.query);
  },
  profile: (parent, _arg, _ctx) => {
    return SignedInUser_publicProfile(parent.query);
  },
};
