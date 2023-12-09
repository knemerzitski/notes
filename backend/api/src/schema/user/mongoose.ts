import { HydratedDocument, Model, Schema } from 'mongoose';
import { nanoid } from 'nanoid';

export interface IUser {
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
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IUserMethods {}

export type UserModel = Model<IUser, object, IUserMethods>;
export type UserDocument = HydratedDocument<IUser>;

export const userSchema = new Schema<IUser, UserModel, IUserMethods>({
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
});
