import { ColorMode } from '../../__generated__/graphql';
import {
  coerce,
  defaulted,
  enums,
  Infer,
  nullable,
  string,
  type,
  unknown,
} from 'superstruct';

const PreferencesStruct = defaulted(
  coerce(
    type({
      colorMode: coerce(enums(Object.values(ColorMode)), unknown(), (value) => {
        if (Object.values(ColorMode).includes(value as ColorMode)) {
          return value;
        }
        return ColorMode.SYSTEM;
      }),
    }),
    nullable(string()),
    (value) => {
      if (!value) return {};

      try {
        return JSON.parse(value);
      } catch (_err) {
        return {};
      }
    },
    (value) => JSON.stringify(value)
  ),
  () => ({})
);

/**
 * This is a temporary storage for device preferences until Apollo cache is restored.
 */
export class PreferencesStorage {
  private readonly key;
  private readonly storage;

  constructor({
    key,
    storage,
  }: {
    key: string;
    storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
  }) {
    this.key = key;
    this.storage = storage;
  }

  private read() {
    return PreferencesStruct.create(this.storage.getItem(this.key));
  }

  private write(data: Infer<typeof PreferencesStruct>) {
    const rawData = PreferencesStruct.createRaw(data);
    if (rawData) {
      this.storage.setItem(this.key, rawData);
    } else {
      this.storage.removeItem(this.key);
    }
  }

  getColorMode(): ColorMode {
    return this.read().colorMode;
  }

  setColorMode(colorMode: ColorMode) {
    const data = this.read();
    data.colorMode = colorMode;
    this.write(data);
  }
}
