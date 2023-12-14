import type { MutationResolvers } from '../../../../graphql/types.generated';

export const createUserNote: NonNullable<MutationResolvers['createUserNote']> = () =>
  // _parent,
  // { input },
  // ctx
  {
    throw new Error('Not implemented');
    // const {
    //   auth,
    //   mongoose: { model, connection },
    // } = ctx;
    // assertAuthenticated(auth);

    // // TODO fetch first note in list???

    // const newNote = new model.Note({
    //   ownerId: auth.session.user._id,
    //   title: input.newNote?.title,
    //   textContent: input.newNote?.textContent,
    // });
    // const newUserNote = new model.UserNote({
    //   userId: auth.session.user._id,
    //   noteId: newNote._id,
    //   list: {
    //     order: 'todo create order???, must be smallest of existing ones???',
    //   },
    // });

    // await connection.transaction(() => Promise.all([newNote.save(), newUserNote.save()]));

    // const savedUserNote: UserNote = {
    //   id: newNote.publicId,
    //   note: {
    //     id: newNote.publicId,
    //     title: newNote.title ?? '',
    //     textContent: newNote.textContent ?? '',
    //   },
    //   preferences: {
    //     list: {
    //       order: newUserNote.list.order,
    //     },
    //   },
    // };

    // // TODO publish savedUserNote??

    // return {
    //   note: savedUserNote,
    // };
  };
