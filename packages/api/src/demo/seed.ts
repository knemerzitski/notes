import { MongoClient, ObjectId } from 'mongodb';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';
import { DemoNote, DemoNoteUser, DemoUser, SEED_DATA, SeedItem } from './seed-data';
import {
  CollabService,
  JsonTyperService,
  Selection,
  spaceNewlineHook,
  TextParser,
} from '../../../collab/src';
import { DBUserSchema, UserSchema } from '../mongodb/schema/user';
import { isDefined } from '../../../utils/src/type-guards/is-defined';
import { DBNoteSchema, NoteSchema } from '../mongodb/schema/note';
import { TransactionContext, withTransaction } from '../mongodb/utils/with-transaction';

type ConvertFieldsToText = (demoNote: Pick<DemoNote, 'title' | 'content'>) => string;

/**
 * Insert demo seed users and notes to database only if missing. Nothing is changed if data is already in database.
 */
export async function seedIfNotExists(
  seedData: readonly SeedItem[],
  mongoDB: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.USERS | CollectionName.NOTES>;
  }
) {
  const runSingleOperation = mongoDB.runSingleOperation ?? ((run) => run());

  const convertFieldsToText = createConvertTextsToField();

  // Users
  const users = (
    await Promise.all(
      seedData.filter(isDemoUser).map((demoUser) =>
        runSingleOperation((session) =>
          mongoDB.collections.users.findOneAndUpdate(
            {
              'demo.id': demoUser.id,
            },
            {
              $setOnInsert: demoUserToSchema(demoUser),
            },
            {
              upsert: true,
              returnDocument: 'after',
              session,
            }
          )
        )
      )
    )
  ).filter(isDefined);

  // Notes
  await runSingleOperation((session) =>
    mongoDB.collections.notes.bulkWrite(
      seedData.filter(isDemoNote).map(
        (demoNote) => ({
          updateOne: {
            filter: {
              'demo.id': demoNote.id,
            },
            update: {
              $setOnInsert: demoNoteToSchema(
                demoNote,
                seedData
                  .filter(isDemoNoteUser)
                  .filter((demoNoteUser) => demoNoteUser.noteId === demoNote.id),
                users,
                convertFieldsToText(demoNote)
              ),
            },
            upsert: true,
          },
        }),
        {
          session,
        }
      )
    )
  );
}

function demoUserToSchema(demoUser: DemoUser): DBUserSchema {
  return UserSchema.createRaw({
    _id: new ObjectId(),
    profile: {
      displayName: demoUser.displayName,
    },
    demo: {
      id: demoUser.id,
    },
  });
}

function demoNoteToSchema(
  demoNote: DemoNote,
  demoNoteUsers: readonly DemoNoteUser[],
  users: readonly DBUserSchema[],
  collabText: string
): DBNoteSchema {
  return NoteSchema.createRaw({
    _id: new ObjectId(),
    users: demoNoteUsers.map((demoNoteUser) => {
      const user = users.find((user) => user.demo?.id === demoNoteUser.userId);
      if (!user) {
        throw new Error(`Missing demo user '${demoNoteUser.userId}'`);
      }

      return {
        _id: user._id,
        createdAt: new Date(),
        isOwner: demoNoteUser.isOwner,
        categoryName: demoNote.category,
      };
    }),
    collabText: {
      updatedAt: new Date(),
      headRecord: {
        revision: 1,
        text: collabText,
      },
      tailRecord: {
        revision: 1,
        text: collabText,
      },
    },
  });
}

function createConvertTextsToField(): ConvertFieldsToText {
  const fieldMapping: Record<keyof Pick<DemoNote, 'title' | 'content'>, string> = {
    title: 't',
    content: 'c',
  };

  const fieldNames = Object.values(fieldMapping);

  const collabService = new CollabService();

  const jsonTyper = new JsonTyperService({
    context: {
      parser: new TextParser({
        hook: spaceNewlineHook,
        keys: fieldNames,
        fallbackKey: fieldMapping.content,
      }),
    },
    fieldNames,
    collabService,
  });

  return (demoNote: Pick<DemoNote, 'title' | 'content'>) => {
    for (const [demoField, typerField] of Object.entries(fieldMapping)) {
      const typer = jsonTyper.getTyper(typerField);
      typer.insert(
        demoNote[demoField as keyof typeof demoNote],
        Selection.create(0, typer.value.length)
      );
    }

    return collabService.viewText;
  };
}

function isDemoUser(item: SeedItem): item is DemoUser {
  return item.type === 'user';
}

function isDemoNote(item: SeedItem): item is DemoNote {
  return item.type === 'note';
}

function isDemoNoteUser(item: SeedItem): item is DemoNoteUser {
  return item.type === 'demo-note-user';
}
