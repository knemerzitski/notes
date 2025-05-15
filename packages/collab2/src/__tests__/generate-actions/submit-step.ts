import { faker } from '@faker-js/faker';
import { Context } from '.';

type SubmissionFn = () => SubmissionFn | null;

declare module '.' {
  export interface Config {
    readonly submitStepWeights: Record<number, number>;
    readonly submitAcknowledgeFirstProbability: number;
  }

  export interface ClientContext {
    submission: SubmissionFn | null;
  }

  export interface Context {
    readonly submitStepWeights: WeightValue<number>[];
  }
}

export function submitStep(ctx: Context) {
  return ctx.createAction({
    name: 'submitStep',
    generateArgs: () => {
      return [
        faker.helpers.weightedArrayElement(ctx.clientWeights),
        faker.helpers.weightedArrayElement(ctx.submitStepWeights),
        faker.helpers.maybe(() => true, {
          probability: ctx.config.submitAcknowledgeFirstProbability,
        }) ?? false,
      ] as const;
    },
    invoke(clientName, stepsCount, acknowledgeFirst) {
      const clientContext = ctx.clientContext[clientName];
      if (!clientContext.submission) {
        clientContext.submission = () => {
          if (clientContext.client.canSubmitChanges()) {
            const submit = clientContext.client.submitChanges();
            return () => {
              const received = submit.serverReceive();
              if (acknowledgeFirst) {
                return () => {
                  received.clientAcknowledge();
                  return () => {
                    received.sendToOtherClients();
                    return null;
                  };
                };
              } else {
                return () => {
                  received.sendToOtherClients();
                  return () => {
                    received.clientAcknowledge();
                    return null;
                  };
                };
              }
            };
          } else {
            return null;
          }
        };
      }

      for (let i = 0; i < stepsCount; i++) {
        if (clientContext.submission !== null) {
          clientContext.submission = clientContext.submission();
        } else {
          break;
        }
      }
    },
  });
}
