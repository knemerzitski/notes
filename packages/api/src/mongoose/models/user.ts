import { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

export interface DBUser {
  /**
   * Any third-party related information
   */
  thirdParty?: {
    google?: {
      /**
       * Google authentication JWT payload subject field.
       * In other words user ID returned by Google Sign-In.
       */
      id?: string;
    };
  };
  profile: {
    displayName: string;
  };
  notes: {
    category: {
      default: {
        order: Types.ObjectId[];
      };
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface DBUserMethods {}

export type UserModel = Model<DBUser, object, DBUserMethods>;
export type UserDocument = HydratedDocument<DBUser>;

export const userSchema = new Schema<DBUser, UserModel, DBUserMethods>({
  thirdParty: {
    google: {
      id: {
        type: Schema.Types.String,
        sparse: true,
        unique: true,
      },
    },
  },
  profile: {
    displayName: {
      type: Schema.Types.String,
      required: true,
    },
  },
  notes: {
    category: {
      default: {
        order: [
          {
            type: Schema.Types.ObjectId,
            index: true,
          },
        ],
      },
    },
  },
});
