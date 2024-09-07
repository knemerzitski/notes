import { ObjectId } from 'mongodb';
import { instance, number, string } from 'superstruct';

export const STRUCT_STRING = string();
export const STRUCT_NUMBER = number();
export const STRUCT_OBJECTID = instance(ObjectId);
