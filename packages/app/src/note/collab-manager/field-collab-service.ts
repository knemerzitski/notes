import { CollabService, JsonTyperService } from '../../../../collab/src';

type CollabServiceOptions = NonNullable<ConstructorParameters<typeof CollabService>[0]>;
type JsonTyperOptions<TKey extends string> = Omit<
  ConstructorParameters<typeof JsonTyperService<TKey>>[0],
  'collabService'
>;

export interface FieldCollabServiceOptions<TFieldName extends string> {
  readonly service: CollabServiceOptions;
  readonly jsonTyper: Omit<JsonTyperOptions<TFieldName>, 'collabService'>;
}

export class FieldCollabService<TFieldName extends string> {
  readonly service: CollabService;

  private readonly jsonTyper;

  constructor(options: FieldCollabServiceOptions<TFieldName>) {
    this.service = new CollabService({
      ...options.service,
    });

    this.jsonTyper = new JsonTyperService({
      ...options.jsonTyper,
      collabService: this.service,
    });
  }

  getField(name: TFieldName) {
    return this.jsonTyper.getTyper(name);
  }
}
