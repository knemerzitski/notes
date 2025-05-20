import { assert, beforeEach, expect, it } from 'vitest';

import { createLogger } from '../../../../utils/src/logging';

import { Changeset } from '../../common/changeset';

import { Selection } from '../../common/selection';

import { MutableComputedState } from './computed-state';
import { Service } from './service';

const cs = Changeset.parse;
const s = Selection.parse;

let nextSubmitId = 0;
function stableGenerateSubmitId(): string {
  return String(nextSubmitId++);
}

beforeEach(() => {
  nextSubmitId = 0;
});

it('haveLocalChanges=false when submit would make no visual difference', () => {
  const service = new Service();

  expect(service.haveLocalChanges()).toBeFalsy();

  service.addLocalTyping({
    changeset: cs('0:"ab"'),
    selection: s('2'),
  });

  expect(service.haveLocalChanges()).toBeTruthy();

  const record = service.submitChanges();
  assert(record != null);

  service.submittedChangesAcknowledged({
    ...record,
    revision: record.targetRevision + 1,
  });
  expect(service.haveLocalChanges()).toBeFalsy();

  service.addLocalTyping({
    changeset: cs('2:0-1,"c"'),
    selection: s('2'),
  });
  expect(service.haveLocalChanges()).toBeTruthy();

  service.addLocalTyping({
    changeset: cs('3:0-1'),
    selection: s('2'),
  });
  expect(service.haveLocalChanges()).toBeFalsy();

  service.addLocalTyping({
    changeset: cs('2:"ab"'),
    selection: s('2'),
  });
  expect(service.haveLocalChanges()).toBeFalsy();

  service.addLocalTyping({
    changeset: cs('2:0,"b"'),
    selection: s('2'),
  });
  expect(service.haveLocalChanges()).toBeFalsy();
  service.addLocalTyping({
    changeset: cs('2:"a",1'),
    selection: s('2'),
  });
  expect(service.haveLocalChanges()).toBeFalsy();
});

it('handles simple local and external typings', () => {
  const computedState = new MutableComputedState();

  const service = new Service({
    context: {
      logger: createLogger('service', {
        format: 'object',
      }),
      generateSubmitId: stableGenerateSubmitId,
    },
    state: computedState,
  });

  service.addLocalTyping({
    changeset: cs('0:"foo"'),
    selectionInverse: s('0'),
    selection: s('3'),
  });

  const record1 = service.submitChanges();
  assert(record1 != null);
  service.submittedChangesAcknowledged({
    ...record1,
    revision: record1.targetRevision + 1,
  });

  service.addExternalTyping({
    authorId: '',
    revision: 2,
    //fooBAR
    // changeset: cs([[0, 2], 'BAR']),
    changeset: cs('3:0-2,"BAR"'),
    selectionInverse: s('3'),
    selection: s('6'),
  });

  service.addLocalTyping({
    //fooBARbar
    changeset: cs('6:0-5,"bar"'),
    selectionInverse: s('6'),
    selection: s('9'),
  });

  const record2 = service.submitChanges();
  if (record2) {
    service.submittedChangesAcknowledged({
      ...record2,
      revision: record2.targetRevision + 1,
    });
  }

  service.addExternalTyping({
    authorId: '',
    revision: 4,
    //FOOfooBARbar
    changeset: cs('9:"FOO",0-8'),
    selectionInverse: s('0'),
    selection: s('3'),
  });

  expect(computedState.state).toMatchInlineSnapshot(`
    {
      "localRecord": null,
      "messagesQueue": [],
      "missingMessageRevisions": null,
      "redoStack": [],
      "serverRevision": 4,
      "serverText": "0:"FOOfooBARbar"",
      "submittedRecord": null,
      "tmpRecipeResults": {
        "externalTypings": [],
        "localTypings": [],
      },
      "undoStack": [
        {
          "changeset": "0:"foo"",
          "externalChanges": [
            "3:0-2,"BAR"",
          ],
          "inverse": "3:",
          "selection": "3",
          "selectionInverse": "0",
          "type": "view",
          "viewIndex": 0,
        },
        {
          "changeset": "6:0-5,"bar"",
          "externalChanges": [
            "9:"FOO",0-8",
          ],
          "inverse": "9:0-5",
          "selection": "9",
          "selectionInverse": "6",
          "type": "view",
          "viewIndex": 2,
        },
      ],
      "undoStackTypeServerIndexes": [],
      "viewChanges": [
        {
          "changeset": "0:"foo"",
          "inverse": "3:",
          "viewRevision": 1,
        },
        {
          "changeset": "3:0-2,"BAR"",
          "inverse": "6:0-2",
          "viewRevision": 2,
        },
        {
          "changeset": "6:0-5,"bar"",
          "inverse": "9:0-5",
          "viewRevision": 3,
        },
        {
          "changeset": "9:"FOO",0-8",
          "inverse": "12:3-11",
          "viewRevision": 4,
        },
      ],
      "viewIndexOffset": 0,
      "viewRevision": 4,
      "viewText": "0:"FOOfooBARbar"",
    }
  `);
});

it('handles out of order server messages', () => {
  const computedState = new MutableComputedState();

  const service = new Service({
    context: {
      logger: createLogger('service', {
        format: 'object',
      }),
      generateSubmitId: stableGenerateSubmitId,
    },
    state: computedState,
  });

  service.addLocalTyping({
    // foo
    changeset: cs('0:"foo"'),
    selectionInverse: s('0'),
    selection: s('3'),
  });

  const submittedRecord = service.submitChanges();
  assert(submittedRecord != null);
  service.submittedChangesAcknowledged({
    ...submittedRecord,
    revision: submittedRecord.targetRevision + 1,
  });

  service.addExternalTyping({
    authorId: '',
    revision: 4,
    //foo123
    changeset: cs('5:0-4,"3"'),
    selectionInverse: s('5'),
    selection: s('6'),
  });

  service.addExternalTyping({
    authorId: '',
    revision: 3,
    //foo12
    changeset: cs('4:0-3,"2"'),
    selectionInverse: s('4'),
    selection: s('5'),
  });

  service.addExternalTyping({
    authorId: '',
    revision: 2,
    //foo1
    // changeset: cs([[0, 2], '1']),
    changeset: cs('3:0-2,"1"'),
    selectionInverse: s('3'),
    selection: s('4'),
  });

  expect(computedState.state).toMatchInlineSnapshot(`
    {
      "localRecord": null,
      "messagesQueue": [],
      "missingMessageRevisions": null,
      "redoStack": [],
      "serverRevision": 4,
      "serverText": "0:"foo123"",
      "submittedRecord": null,
      "tmpRecipeResults": {
        "externalTypings": [],
        "localTypings": [],
      },
      "undoStack": [
        {
          "changeset": "0:"foo"",
          "externalChanges": [
            "3:0-2,"1"",
            "4:0-3,"2"",
            "5:0-4,"3"",
          ],
          "inverse": "3:",
          "selection": "3",
          "selectionInverse": "0",
          "type": "view",
          "viewIndex": 0,
        },
      ],
      "undoStackTypeServerIndexes": [],
      "viewChanges": [
        {
          "changeset": "0:"foo"",
          "inverse": "3:",
          "viewRevision": 1,
        },
        {
          "changeset": "3:0-2,"1"",
          "inverse": "4:0-2",
          "viewRevision": 2,
        },
        {
          "changeset": "4:0-3,"2"",
          "inverse": "5:0-3",
          "viewRevision": 3,
        },
        {
          "changeset": "5:0-4,"3"",
          "inverse": "6:0-4",
          "viewRevision": 4,
        },
      ],
      "viewIndexOffset": 0,
      "viewRevision": 4,
      "viewText": "0:"foo123"",
    }
  `);
});

it('undo/redo with external changes', () => {
  const service = new Service();

  service.addLocalTyping({
    changeset: cs('0:"a"'),
    selection: s('1'),
  });
  //a

  service.addLocalTyping({
    changeset: cs('1:0,"b"'),
    selection: s('2'),
  });
  //ab

  service.addLocalTyping({
    changeset: cs('2:0-1,"c"'),
    selection: s('3'),
  });
  //abc
  expect(service.viewText).toMatchInlineSnapshot(`"abc"`);

  service.addExternalTyping({
    revision: 1,
    changeset: cs('0:"X"'),
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
    authorId: '',
  });
  //Xabc
  expect(service.viewText).toMatchInlineSnapshot(`"Xabc"`);

  const submitted = service.submitChanges();
  assert(submitted != null);
  service.submittedChangesAcknowledged({
    ...submitted,
    revision: submitted.targetRevision + 1,
  });

  service.addExternalTyping({
    revision: 3,
    changeset: cs('4:0,"Y",1-3'),
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
    authorId: '',
  });
  //XYabc
  expect(service.viewText).toMatchInlineSnapshot(`"XYabc"`);

  service.addExternalTyping({
    revision: 4,
    changeset: cs('5:0-4,"2"'),
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
    authorId: '',
  });
  //XYabc2
  expect(service.viewText).toMatchInlineSnapshot(`"XYabc2"`);

  service.addLocalTyping({
    changeset: cs('6:0-4,"d",5'),
    selection: Selection.create(6),
  });
  //XYabcd2
  expect(service.viewText).toMatchInlineSnapshot(`"XYabcd2"`);

  service.addExternalTyping({
    revision: 5,
    changeset: cs('6:0-4,"1",5'),
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
    authorId: '',
  });
  //XYabc1d2
  expect(service.viewText).toMatchInlineSnapshot(`"XYabc1d2"`);

  service.undo();
  //XYabc12
  expect(service.viewText).toMatchInlineSnapshot(`"XYabc12"`);

  service.undo();
  //XYab12
  expect(service.viewText).toMatchInlineSnapshot(`"XYab12"`);

  service.undo();
  //XYa12
  expect(service.viewText).toMatchInlineSnapshot(`"XYa12"`);

  service.undo();
  //XY12
  expect(service.viewText).toMatchInlineSnapshot(`"XY12"`);

  service.undo();
  //XY12
  expect(service.viewText).toMatchInlineSnapshot(`"XY12"`);

  service.redo();
  //XYa12
  expect(service.viewText).toMatchInlineSnapshot(`"XYa12"`);

  service.redo();
  //XYab12
  expect(service.viewText).toMatchInlineSnapshot(`"XYab12"`);

  service.redo();
  //XYabc12
  expect(service.viewText).toMatchInlineSnapshot(`"XYabc12"`);

  service.redo();
  //XYabc1d2
  expect(service.viewText).toMatchInlineSnapshot(`"XYabc1d2"`);

  service.redo();
  //XYabc1d2
  expect(service.viewText).toMatchInlineSnapshot(`"XYabc1d2"`);
});

it('undo changes', () => {
  const service = new Service();

  service.addLocalTyping({
    changeset: cs('0:"a"'),
    selection: s('1'),
  });
  expect(service.viewText).toStrictEqual('a');
  service.addLocalTyping({
    changeset: cs('1:0,"b"'),
    selection: s('2'),
  });
  expect(service.viewText).toStrictEqual('ab');
  service.addLocalTyping({
    changeset: cs('2:0-1,"c"'),
    selection: s('3'),
  });
  expect(service.viewText).toStrictEqual('abc');

  service.undo();
  expect(service.viewText).toStrictEqual('ab');
  service.undo();
  expect(service.viewText).toStrictEqual('a');
  service.undo();
  expect(service.viewText).toStrictEqual('');
  service.undo();
  expect(service.viewText).toStrictEqual('');
});

it('runs events once and in order when mutating state inside event handler', () => {
  const service = new Service();

  const viewChangedRevisions: number[] = [];
  const localTypingRevisions: number[] = [];
  const externalTypingRevisions: number[] = [];

  service.on('view:changed', ({ change }) => {
    viewChangedRevisions.push(change.viewRevision);
  });
  service.on('localTyping:applied', ({ typing }) => {
    localTypingRevisions.push(typing.viewRevision);
  });
  service.on('externalTyping:applied', ({ typing }) => {
    externalTypingRevisions.push(typing.viewRevision);
  });

  let externalRun = true;
  service.on('externalTyping:applied', () => {
    if (!externalRun) {
      return;
    }
    externalRun = false;

    service.addLocalTyping({
      changeset: cs('1:0,"a"'),
      selection: Selection.ZERO,
    });

    service.addLocalTyping({
      changeset: cs('2:0-1,"b"'),
      selection: Selection.ZERO,
    });
  });

  let localRun = true;
  service.on('localTyping:applied', () => {
    if (!localRun) {
      return;
    }
    localRun = false;

    service.addLocalTyping({
      changeset: cs('3:0-2,"c"'),
      selection: Selection.ZERO,
    });
  });

  service.addExternalTyping({
    authorId: '',
    changeset: cs('0:"A"'),
    selectionInverse: Selection.ZERO,
    selection: Selection.ZERO,
    revision: service.serverRevision + 1,
  });

  expect(viewChangedRevisions).toStrictEqual([1, 2, 3, 4]);
  expect(localTypingRevisions).toStrictEqual([2, 3, 4]);
  expect(externalTypingRevisions).toStrictEqual([1]);
});
