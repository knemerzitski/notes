export interface ApiOptions {
  collabText?: {
    /**
     * Records array max length. If not defined then array will keep growing.
     */
    maxRecordsCount?: number;
  };
}
