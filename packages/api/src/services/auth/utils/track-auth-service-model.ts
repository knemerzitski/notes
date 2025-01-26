import { AuthenticatedContextsModel } from '../../../models/auth/authenticated-contexts';
import { objectIdToStr } from '../../../mongodb/utils/objectid';

export function trackAuthServiceModel({
  sourceModel,
  getTargetModel,
}: {
  sourceModel: AuthenticatedContextsModel;
  getTargetModel: () => Promise<AuthenticatedContextsModel | undefined>;
}) {
  const promises: Promise<unknown>[] = [];

  return {
    cleanUp: sourceModel.eventBus.on('*', (type, event) => {
      const auth = event.auth;

      promises.push(
        getTargetModel().then((model) => {
          if (!model) {
            return;
          }

          const key = objectIdToStr(auth.session.userId);

          if (type === 'set') {
            model.set(key, auth);
          } else {
            // deleted
            model.delete(key);
          }

          return;
        })
      );
    }),
    promises: () => Promise.all(promises),
  };
}
