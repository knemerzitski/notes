export interface ApiOptions {
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
