import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  TextField,
  DialogActions,
} from '@mui/material';
import { useState, FormEvent } from 'react';

import { GoogleLoginProps } from './GoogleLoginButton';

export function MockGoogleLoginButton({
  idConfig,
  buttonConfig,
  onSuccess,
  onError,
}: GoogleLoginProps) {
  const [open, setOpen] = useState(false);

  function handleClickOpen() {
    setOpen(true);
    buttonConfig?.click_listener?.();
  }

  function handleClose() {
    setOpen(false);
  }

  function handleSendError() {
    onError?.();
    handleClose();
  }

  return (
    <>
      <Button size="small" onClick={handleClickOpen} aria-label="sign in with google">
        Sign in with Google
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        PaperProps={{
          'aria-label': 'sign in with google dialog',
          component: 'form',
          onSubmit: (e: FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const formObj = Object.fromEntries(formData.entries()) as {
              id: string;
              name: string;
              email: string;
            };
            formObj.name = formObj.name.trim().length > 0 ? formObj.name : 'Anonymous';
            formObj.email =
              formObj.email.trim().length > 0 ? formObj.email : 'anonymous@unknown';
            onSuccess({
              credential: JSON.stringify(formObj),
              select_by: 'btn',
            });
            handleClose();
          },
        }}
      >
        <DialogTitle>Mock sign in with Google</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This is only intended to be used during development. Never use it in
            production!
          </DialogContentText>
          <TextField
            autoFocus
            required
            margin="dense"
            fullWidth
            name="id"
            label="ID"
            defaultValue={idConfig?.login_hint}
          ></TextField>
          <TextField
            margin="dense"
            fullWidth
            name="name"
            label="Display name"
          ></TextField>
          <TextField margin="dense" fullWidth name="email" label="Email"></TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSendError}>Send error</Button>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" aria-label="sign in">
            Sign In
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
