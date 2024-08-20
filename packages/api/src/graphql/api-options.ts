import { SessionDurationConfig } from '../services/auth/session-duration';

export interface ApiOptions {
  sessions?: {
    /**
     * User sessions stored in MongoDB Sessions collection
     */
    user?: SessionDurationConfig;
    /**
     * Subscriptions stored in DynamoDB tables
     */
    webSocket?: SessionDurationConfig;
  };
  note?: {
    /**
     * How long note is kept in trash in milliseconds.
     * @default 1000 * 60 * 60 * 24 * 30 // 30 days
     */
    trashDuration?: number;
  };
  collabText?: {
    /**
     * Records array max length. If not defined then array will keep growing.
     * @default 500
     */
    maxRecordsCount?: number;
  };
}
