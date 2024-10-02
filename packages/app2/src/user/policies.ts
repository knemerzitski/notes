import { CreateTypePoliciesFn } from '../apollo-client/types';
import { Query } from './policies/query';
import { SignedInUser } from './policies/signed-in-user';

export const userPolicies: CreateTypePoliciesFn = function (ctx) {
  return {
    Query: Query(ctx),
    SignedInUser: SignedInUser(ctx),
  };
};
