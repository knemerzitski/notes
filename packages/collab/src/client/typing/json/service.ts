import mapObject from 'map-obj';

import { CollabService } from '../..';
import { Changeset, InsertStrip } from '../../../common/changeset';
import { Selection } from '../../../common/selection';
import { Typer } from '../types';

import { FieldTyper } from './field-typer';
import { FieldText, ParsedViewText, Properties } from './types';

export class Service<T extends string> {
  readonly on;
  readonly off;

  private readonly viewTextsCache = new WeakMap<Changeset, ParsedViewText<T>>();

  private readonly typerByName: Record<T, FieldTyper<T>>;

  private controlledTypingCounter = 0;

  private readonly disposeHandlers: () => void;

  constructor(readonly props: Properties<T>) {
    this.on = this.props.collabService.on;
    this.off = this.props.collabService.on;

    this.typerByName = Object.fromEntries(
      this.props.fieldNames.map((fieldName) => [
        fieldName,
        new FieldTyper({
          name: fieldName,
          service: this,
        }),
      ])
    ) as Record<T, FieldTyper<T>>;

    this.enforceStructure(true);

    const offList = [
      this.collabService.on('view:changed', () => {
        if (this.controlledTypingCounter === 0) {
          /**
           * View changed without calling {@link addLocalTyping}.
           * Ensure structure is valid.
           */
          this.enforceStructure();
        }
      }),
    ];

    this.disposeHandlers = () => {
      offList.forEach((off) => {
        off();
      });
    };
  }

  dispose() {
    this.disposeHandlers();
  }

  get textParser() {
    return this.ctx.parser;
  }

  private get ctx() {
    return this.props.context;
  }

  private get logger() {
    return this.ctx.logger;
  }

  private get collabService() {
    return this.props.collabService;
  }

  private get fieldNames() {
    return this.props.fieldNames;
  }

  addLocalTyping(...args: Parameters<CollabService['addLocalTyping']>) {
    try {
      this.controlledTypingCounter++;
      this.collabService.addLocalTyping(...args);
    } finally {
      this.controlledTypingCounter--;
    }
  }

  getTyper(fieldName: T): Typer {
    return this.typerByName[fieldName];
  }

  getFieldText(fieldName: T, viewRevision = this.collabService.viewRevision): FieldText {
    return this.parseViewTextMemoized(viewRevision)[fieldName];
  }

  getViewText(viewRevision = this.collabService.viewRevision): Changeset {
    return this.collabService.getViewTextAtRevision(viewRevision) ?? Changeset.EMPTY;
  }

  private getViewChange(viewRevision = this.collabService.viewRevision): Changeset {
    return this.collabService.getViewChangeAtRevision(viewRevision) ?? Changeset.EMPTY;
  }

  private parseViewTextMemoized(viewRevision: number): ParsedViewText<T> {
    const key = this.getViewChange(viewRevision);

    let parsedViewText = this.viewTextsCache.get(key);
    if (!parsedViewText) {
      parsedViewText = this.parseViewText(this.getViewText(viewRevision).getText());
      this.viewTextsCache.set(key, parsedViewText);
    }

    return parsedViewText;
  }

  private parseViewText(viewText: string): ParsedViewText<T> {
    const valueByName = this.textParser.parse(viewText);
    const metadataByName = this.textParser.parseMetadata(viewText);

    return {
      ...mapObject(valueByName, (key, value) => [
        key,
        {
          value,
          metadata: null,
        },
      ]),
      ...(Object.fromEntries(
        this.fieldNames.map((fieldName) => {
          const value = valueByName[fieldName];
          const metadata = metadataByName[fieldName];

          return [
            fieldName,
            {
              value: typeof value === 'string' ? value : '',
              metadata: metadata ?? null,
            },
          ];
        })
      ) as ParsedViewText<T>),
    };
  }

  private stringifyViewText(viewRevision: number): string {
    return this.textParser.stringify(
      mapObject(this.parseViewTextMemoized(viewRevision), (key, text) => [
        key,
        text.value,
      ])
    );
  }

  private enforceStructure(initializing = false) {
    const revision = this.collabService.viewRevision;

    const unknownStructure =
      this.collabService.getViewTextAtRevision(revision)?.getText() ?? '';
    const validStructure = this.stringifyViewText(revision);

    if (unknownStructure === validStructure) {
      return;
    } else {
      const skipLogError = initializing && unknownStructure === '';
      if (!skipLogError) {
        this.logger?.error('enforceStructure', {
          unknownStructure,
          validStructure,
        });
      }
    }

    this.addLocalTyping({
      history: 'no',
      changeset: Changeset.create(unknownStructure.length, [
        InsertStrip.create(validStructure),
      ]),
      selection: Selection.ZERO,
    });
  }
}
