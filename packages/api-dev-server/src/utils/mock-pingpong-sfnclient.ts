import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';

import { Logger } from '~common/logger';
import { PingPongMachineInput } from '~lambda-graphql/context/pingpong';
import { PingPongHandler } from '~lambda-graphql/ping-pong-handler';

import { createLambdaContext } from './lambda-context';

export class MockPingPongSFNClient extends SFNClient {
  handler: PingPongHandler;
  logger: Logger;

  constructor(handler: PingPongHandler, logger: Logger) {
    super();

    this.handler = handler;
    this.logger = logger;
  }

  async asyncSelfRunHandler(input: PingPongMachineInput) {
    if (input.state === 'ABORT') return;

    try {
      const nextInput = await this.handler(input, createLambdaContext(), () => {
        return;
      });

      if (nextInput) {
        setTimeout(() => {
          this.selfRunHandler(nextInput);
        }, input.seconds * 1000);
      }
    } catch (err) {
      this.logger.error('mock:pingpong:sfnclient:err', err as Error);
    }
  }

  selfRunHandler(input: PingPongMachineInput) {
    this.asyncSelfRunHandler(input).catch((err) => {
      this.logger.error('mock:pingpong:sfnclient:err', err as Error);
    });
  }

  send(command: unknown): Promise<void> {
    if (command instanceof StartExecutionCommand) {
      const { input } = command;

      if (!input.input) {
        throw new Error('MockPingPongSFNClient StartExecutionCommand expecting input');
      }

      const initialInput = JSON.parse(input.input) as PingPongMachineInput;

      this.selfRunHandler(initialInput);
    } else {
      throw new Error(`Unsupported command "${command?.constructor.name}"`);
    }

    return Promise.resolve();
  }
}
