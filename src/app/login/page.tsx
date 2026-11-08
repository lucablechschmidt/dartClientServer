import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginScreen } from "@/components/screens/login-screen";
import { de } from "@/i18n/de";
import { loginAction } from "@/server/auth-actions";
import { currentSession } from "@/server/request";
import { Skeleton } from "@/components/ui/skeleton";

type Props = { searchParams: Promise<{ next?: string }> };

async function Login({ searchParams }: Props) {
  if (await currentSession()) redirect("/");
  const { next } = await searchParams;
  return <LoginScreen texts={de.auth} next={next ?? "/"} onLogin={loginAction} />;
}

/** Login (M3). Without a session the only page besides the invite. */
export default function LoginPage(props: Props) {
  return (
    <main className="flex min-h-dvh flex-col pt-safe pb-safe">
      <Suspense fallback={<Skeleton label={de.ui.loading} rows={2} />}>
        <Login {...props} />
      </Suspense>
    </main>
  );
}
