import { Maybe } from '~utils/types';
import { PublicUserProfileMapper, SignedInUserMapper } from '../schema.mappers';
import type { SignedInUserResolvers } from './../../types.generated';
import { ObjectId } from 'mongodb';

export async function SignedInUser_id(
  queryFn: SignedInUserMapper['query']
): Promise<Maybe<ObjectId>> {
  console.log('call2');
  return (await queryFn({ _id: 1 }))?._id;
}

export function SignedInUser_publicProfile(
  queryFn: SignedInUserMapper['query']
): PublicUserProfileMapper {
  return {
    query: async (query) => (await queryFn({ profile: query }))?.profile,
  };
}

export const SignedInUser: SignedInUserResolvers = {
  id: (parent, _arg, _ctx) => {
    return SignedInUser_id(parent.query);
  },
  publicProfile: (parent, _arg, _ctx) => {
    return SignedInUser_publicProfile(parent.query);
  },
};
