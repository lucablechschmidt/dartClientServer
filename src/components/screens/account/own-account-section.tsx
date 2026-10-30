"use client";

import { useActionState, useState } from "react";
import { CardList, CardRow } from "@/components/ui/card-list";
import { Field, FormError, FormNote, TextButton, TextInput } from "@/components/ui/form-controls";
import type { PasswordFormState, PlayerError, PlayerResult, Session } from "@/domain/player";
import type { Texts } from "@/i18n/de";

type Props = {
  session: Session;
  texts: { account: Texts["account"]; auth: Texts["auth"] };
  onRename: (formData: FormData) => Promise<PlayerResult>;
  onChangePassword: (prev: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
  onLogout: () => Promise<void>;
};

/** Everyone: own name, own password, logout. */
export function OwnAccountSection({ session, texts, onRename, onChangePassword, onLogout }: Props) {
  const t = texts.account;
  const [renameError, setRenameError] = useState<PlayerError | null>(null);
  const [renamed, setRenamed] = useState(false);
  const [pwState, pwAction, pwPending] = useActionState(onChangePassword, { error: null, saved: false });
  const rename = async (fd: FormData) => {
    const r = await onRename(fd);
    setRenameError(r.ok ? null : r.reason);
    setRenamed(r.ok);
  };
  return (
    <CardList label={t.title}>
      <CardRow className="flex-col items-stretch">
        <span className="text-sm text-fg-muted">{texts.auth.signedInAs}</span>
        <form action={rename} className="flex w-full gap-2">
          <TextInput inline name="name" defaultValue={session.name} required maxLength={40} aria-label={texts.auth.name} />
          <TextButton type="submit">{t.rename}</TextButton>
        </form>
        {renameError && <FormError>{t.errors[renameError]}</FormError>}
        {renamed && !renameError && <FormNote>{t.saved}</FormNote>}
      </CardRow>
      <CardRow className="flex-col items-stretch">
        <form action={pwAction} className="flex w-full flex-col gap-2">
          <Field label={t.oldPassword}>
            <TextInput name="oldPassword" type="password" required autoComplete="current-password" />
          </Field>
          <Field label={t.newPassword}>
            <TextInput name="newPassword" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label={t.newPasswordRepeat}>
            <TextInput name="newPasswordRepeat" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          <TextButton type="submit" disabled={pwPending} className="self-end">
            {t.changePassword}
          </TextButton>
        </form>
        {pwState.error && <FormError>{t.errors[pwState.error]}</FormError>}
        {pwState.saved && <FormNote>{t.saved}</FormNote>}
      </CardRow>
      <CardRow className="justify-center">
        <form action={onLogout}>
          <TextButton type="submit" tone="danger">
            {texts.auth.logout}
          </TextButton>
        </form>
      </CardRow>
    </CardList>
  );
}
