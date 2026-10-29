"use client";

import { useActionState } from "react";
import { CardList, CardRow, GroupedSection } from "@/components/ui/card-list";
import { Field, FormError, PrimaryButton, TextInput } from "@/components/ui/form-controls";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { InviteFormState } from "@/domain/player";
import type { Texts } from "@/i18n/de";

export type InviteInfo = { kind: "register" } | { kind: "password"; playerName: string; reset: boolean };

type Props = {
  info: InviteInfo | null;
  texts: Texts["invite"];
  onRedeem: (prev: InviteFormState, formData: FormData) => Promise<InviteFormState>;
};


/** Case A (name + password), case F/reset (password only, name is fixed), case E (notice only). */
export function InviteScreen({ info, texts, onRedeem }: Props) {
  const [state, action, pending] = useActionState(onRedeem, { error: null });
  return (
    <>
      <ScreenHeader title={<h1 className="fluid-text-lg">{texts.title}</h1>} />
      <GroupedSection>
        {info === null ? (
          <CardList>
            <CardRow className="justify-center text-center text-fg-muted">{texts.invalid}</CardRow>
          </CardList>
        ) : (
          <form action={action}>
            <CardList>
              {info.kind === "register" ? (
                <CardRow>
                  <Field label={texts.name}>
                    <TextInput name="name" required maxLength={40} autoComplete="username" autoCapitalize="words" />
                  </Field>
                </CardRow>
              ) : (
                <CardRow className="justify-center fluid-text-lg">{texts.forPlayer.replace("{name}", info.playerName)}</CardRow>
              )}
              <CardRow>
                <Field label={texts.password}>
                  <TextInput name="password" type="password" required minLength={8} autoComplete="new-password" />
                </Field>
              </CardRow>
              <CardRow>
                <Field label={texts.passwordRepeat}>
                  <TextInput name="passwordRepeat" type="password" required minLength={8} autoComplete="new-password" />
                </Field>
              </CardRow>
              <CardRow className="flex-col items-stretch">
                <PrimaryButton disabled={pending}>
                  {info.kind === "register" ? texts.register : texts.setPassword}
                </PrimaryButton>
                {state.error && <FormError centered>{texts.errors[state.error]}</FormError>}
              </CardRow>
            </CardList>
          </form>
        )}
      </GroupedSection>
    </>
  );
}
