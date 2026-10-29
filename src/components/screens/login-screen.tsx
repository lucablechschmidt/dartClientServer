"use client";

import { useActionState } from "react";
import { CardList, CardRow, GroupedSection } from "@/components/ui/card-list";
import { Field, FormError, PrimaryButton, TextInput } from "@/components/ui/form-controls";
import { ScreenHeader } from "@/components/ui/screen-header";
import type { LoginFormState } from "@/domain/player";
import type { Texts } from "@/i18n/de";

type Props = {
  texts: Texts["auth"];
  next: string;
  onLogin: (prev: LoginFormState, formData: FormData) => Promise<LoginFormState>;
};


/** Name and password, styled like the list screens. The error stays in the card, the form stays open. */
export function LoginScreen({ texts, next, onLogin }: Props) {
  const [state, action, pending] = useActionState(onLogin, { error: null });
  return (
    <>
      <ScreenHeader title={<h1 className="fluid-text-lg">{texts.title}</h1>} />
      <GroupedSection>
        <form action={action}>
          <input type="hidden" name="next" value={next} />
          <CardList>
            <CardRow>
              <Field label={texts.name}>
                <TextInput name="name" required autoComplete="username" autoCapitalize="none" />
              </Field>
            </CardRow>
            <CardRow>
              <Field label={texts.password}>
                <TextInput name="password" type="password" required autoComplete="current-password" />
              </Field>
            </CardRow>
            <CardRow className="flex-col items-stretch">
              <PrimaryButton disabled={pending}>
                {texts.submit}
              </PrimaryButton>
              {state.error && <FormError centered>{texts.errors[state.error]}</FormError>}
            </CardRow>
          </CardList>
        </form>
      </GroupedSection>
    </>
  );
}
