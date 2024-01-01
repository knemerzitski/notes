import { HydratedDocument, Model, Schema, Types } from 'mongoose';
import { nanoid } from 'nanoid';

export interface DBUser {
  publicId: string;
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
  offline: {
    /**
     * ID used to identify users notes stored locally on the device.
     * @default nanoid()
     */
    id: string;
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
  publicId: {
    type: Schema.Types.String,
    required: true,
    unique: true,
    default: () => nanoid(),
  },
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
  offline: {
    id: {
      type: Schema.Types.String,
      required: true,
      default: () => nanoid(),
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
