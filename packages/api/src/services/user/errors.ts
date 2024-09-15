import { ServiceError } from '../errors';

export type UserServiceErrorCode = never;

export class UserServiceError extends ServiceError<UserServiceErrorCode> {}
