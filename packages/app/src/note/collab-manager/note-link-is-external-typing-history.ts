import { CollabService } from '../../../../collab/src';
import { parseUserNoteLinkId } from '../utils/id';

type CollabServiceOptions = NonNullable<ConstructorParameters<typeof CollabService>[0]>;

type IsExternalTypingHistoryFn = NonNullable<
  CollabServiceOptions['isExternalTypingHistory']
>;

export class NoteLinkIsExternalTypingHistory {
  private userId: string;

  readonly fn: IsExternalTypingHistoryFn = this._isExternalTypingHistory.bind(this);

  constructor(userNoteLinkId: string) {
    this.updateUserNoteLinkId(userNoteLinkId);
  }

  updateUserNoteLinkId(userNoteLinkId: string) {
    ({ userId: this.userId } = parseUserNoteLinkId(userNoteLinkId));
  }

  private _isExternalTypingHistory(
    record: Pick<Parameters<IsExternalTypingHistoryFn>[0], 'authorId'>
  ) {
    return record.authorId === this.userId;
  }
}
