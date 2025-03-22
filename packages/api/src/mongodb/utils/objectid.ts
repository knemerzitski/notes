import { ObjectId } from 'mongodb';

export function strToObjectId(value: ObjectId | string): ObjectId;
export function strToObjectId(value: ObjectId | string | undefined): ObjectId | undefined;
export function strToObjectId(value: ObjectId | string | undefined) {
  if (!value) {
    return;
  }

  if (value instanceof ObjectId) {
    return value;
  }

  return ObjectId.createFromBase64(value);
}

export function objectIdToStr(id: ObjectId | string): string;
export function objectIdToStr(id: ObjectId | string | undefined): string | undefined;
export function objectIdToStr(id: ObjectId | string | undefined) {
  if (typeof id === 'string') {
    return id;
  }

  return id?.toString('base64');
}

export function isObjectIdStr(value: string): boolean {
  if (value.length !== 16) return false;
  return /^[A-Za-z0-9+/=]{16}$/.test(value);
}
