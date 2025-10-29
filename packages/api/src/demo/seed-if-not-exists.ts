import { MongoClient, ObjectId } from 'mongodb';

import {
  CollabService,
  JsonTyperService,
  Selection,
  spaceNewlineHook,
  TextParser,
} from '../../../collab/src';
import { CollectionName } from '../mongodb/collection-names';
import { MongoDBCollections } from '../mongodb/collections';

import { DBNoteSchema, NoteSchema } from '../mongodb/schema/note';
import { NoteUserSchema } from '../mongodb/schema/note-user';
import { DBUserSchema, UserSchema } from '../mongodb/schema/user';
import { TransactionContext } from '../mongodb/utils/with-transaction';

import { DemoNote, DemoNoteUser, DemoUser, SeedItem } from './seed-data';

type ConvertFieldsToText = (demoNote: Pick<DemoNote, 'title' | 'content'>) => string;

/**
 * Seed database with demo users and notes. Nothing is changed if data already exists in database.
 */
export async function seedIfNotExists(
  seedData: readonly SeedItem[],
  mongoContext: {
    runSingleOperation?: TransactionContext['runSingleOperation'];
    client: MongoClient;
    collections: Pick<MongoDBCollections, CollectionName.USERS | CollectionName.NOTES>;
  }
) {
  const runSingleOperation = mongoContext.runSingleOperation ?? ((run) => run());
  const convertFieldsToText = createConvertTextsToField();

  // Prepare data
  const users = seedData.filter(isDemoUser).map((demoUser) => demoUserToSchema(demoUser));
  const notes = seedData.filter(isDemoNote).map((demoNote) =>
    demoNoteToSchema(
      demoNote,
      seedData
        .filter(isDemoNoteUser)
        .filter((demoNoteUser) => demoNoteUser.noteId === demoNote.id),
      users,
      convertFieldsToText(demoNote)
    )
  );

  // Commit data to DB
  await Promise.all([
    runSingleOperation((session) =>
      mongoContext.collections.notes.bulkWrite(
        notes.map((note) => ({
          updateOne: {
            filter: {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              'demo.id': note.demo!.id,
            },
            update: {
              $setOnInsert: note,
            },
            upsert: true,
          },
        })),
        {
          session,
        }
      )
    ),
    runSingleOperation((session) =>
      mongoContext.collections.users.bulkWrite(
        users.map((user) => ({
          updateOne: {
            filter: {
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              'demo.id': user.demo!.id,
            },
            update: {
              $setOnInsert: user,
            },
            upsert: true,
          },
        })),
        {
          session,
        }
      )
    ),
  ]);
}

function demoUserToSchema(demoUser: DemoUser): DBUserSchema {
  return UserSchema.createRaw({
    _id: new ObjectId(),
    profile: {
      displayName: demoUser.displayName,
      avatarColor: demoUser.avatarColor,
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
  const noteId = new ObjectId();

  return NoteSchema.createRaw({
    _id: noteId,
    users: demoNoteUsers.map((demoNoteUser) => {
      const user = users.find((user) => user.demo?.id === demoNoteUser.userId);
      if (!user) {
        throw new Error(`Missing demo user '${demoNoteUser.userId}'`);
      }

      const category = demoNoteUser.category;
      user.note.categories[category] = user.note.categories[category] ?? {
        noteIds: [],
      };

      user.note.categories[category].noteIds.push(noteId);

      return {
        _id: user._id,
        createdAt: new Date(),
        isOwner: demoNoteUser.isOwner,
        categoryName: category,
        ...(demoNoteUser.trash && {
          trashed: {
            expireAt: new Date(
              Date.now() + demoNoteUser.trash.expireDays * 24 * 60 * 60 * 1000
            ),
            originalCategoryName: demoNoteUser.trash.originalCategory,
          },
        }),
      } satisfies NoteUserSchema;
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
    demo: {
      id: demoNote.id,
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
  return item.type === 'note-user';
}
