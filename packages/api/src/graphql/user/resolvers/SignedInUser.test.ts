import { describe, it, expect, vi } from 'vitest';
import { SignedInUser_id, SignedInUser_publicProfile } from './SignedInUser';
import { ObjectId } from 'mongodb';
import { mock } from 'vitest-mock-extended';

describe('SignedInUser_id', () => {
  it('returns undefined without query', async () => {
    const result = await SignedInUser_id(() => ({}));
    expect(result).toBeUndefined();
  });

  it('returns provided _id', async () => {
    const _id = new ObjectId();
    const result = await SignedInUser_id(() => ({ _id }));
    expect(result).toStrictEqual(_id);
  });
});

describe('SignedInUser_publicProfile', () => {
  it('returns query for profile', async () => {
    const profileMock = mock();

    const queryFn = vi.fn();
    queryFn.mockReturnValueOnce({ profile: profileMock });

    const argMock = mock();
    const profileResult = await SignedInUser_publicProfile(queryFn).query(argMock);

    expect(queryFn).toHaveBeenCalledWith({ profile: argMock });
    expect(profileResult).toStrictEqual(profileMock);
  });
});
