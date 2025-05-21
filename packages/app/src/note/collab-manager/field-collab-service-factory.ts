import { Logger } from '../../../../utils/src/logging';

import {
  CollabService,
  CollabServiceSerializer,
  JsonTyperService,
  spaceNewlineHook,
  TextParser,
} from '../../../../collab/src';

import { FieldCollabService } from './field-collab-service';

type CollabServiceOptions = NonNullable<ConstructorParameters<typeof CollabService>[0]>;

export class FieldCollabServiceFactory<TFieldName extends string> {
  private readonly serviceContext: CollabServiceOptions['context'];

  private readonly jsonTyperContext: ConstructorParameters<
    typeof JsonTyperService<TFieldName>
  >[0]['context'];

  private readonly parser;

  private readonly fieldNames: readonly TFieldName[];

  constructor({
    logger,
    fieldNames,
    fallbackFieldName,
  }: {
    readonly fieldNames: readonly TFieldName[];
    readonly fallbackFieldName: TFieldName;
    readonly logger?: Logger;
  }) {
    const collabServiceSerializer = new CollabServiceSerializer();

    this.serviceContext = {
      historySizeLimit: 200,
      logger: logger?.extend('service'),
      serializer: collabServiceSerializer,
    };

    this.parser = new TextParser({
      logger: logger?.extend('parser'),
      hook: spaceNewlineHook,
      keys: fieldNames,
      fallbackKey: fallbackFieldName,
    });

    this.jsonTyperContext = {
      logger: logger?.extend('json'),
      parser: this.parser,
    };

    this.fieldNames = fieldNames;
  }

  create(options?: {
    service?: Pick<
      CollabServiceOptions,
      'isExternalTypingHistory' | 'serverFacade' | 'state'
    >;
  }) {
    return new FieldCollabService({
      ...options,
      service: {
        ...options?.service,
        context: this.serviceContext,
      },
      jsonTyper: {
        fieldNames: this.fieldNames,
        context: this.jsonTyperContext,
      },
    });
  }

  parseText(value: string) {
    return this.parser.parse(value);
  }
}
