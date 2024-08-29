import { ObjectId } from 'mongodb';

export function strToObjectId(value: string | undefined): ObjectId | undefined;
export function strToObjectId(value: string): ObjectId;
export function strToObjectId(value: string | undefined) {
  if (!value) return;
  return ObjectId.createFromBase64(value);
}

export function objectIdToStr(id: ObjectId): string;
export function objectIdToStr(id: ObjectId | undefined): string | undefined;
export function objectIdToStr(id: ObjectId | undefined) {
  return id?.toString('base64');
}

export function isObjectIdStr(value: string): boolean {
  if (value.length !== 16) return false;
  return /^[A-Za-z0-9+/=]{16}$/.test(value);
}
