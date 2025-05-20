import { faker } from '@faker-js/faker';

import { Context } from '.';

type SubmissionFn = () => SubmissionFn | null;

declare module '.' {
  export interface Config {
    readonly submitStepWeights: Record<number, number>;
    readonly submitAcknowledgeFirstProbability: number;
  }

  export interface RuntimeClientContext {
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
      const client = ctx.getClient(clientName);
      const state = ctx.getClientState(clientName);
      if (!state.submission) {
        state.submission = () => {
          if (client.canSubmitChanges()) {
            const submit = client.submitChanges();
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
        if (state.submission !== null) {
          state.submission = state.submission();
        } else {
          break;
        }
      }
    },
  });
}
