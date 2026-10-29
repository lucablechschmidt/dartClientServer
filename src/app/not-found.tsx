import { ErrorScreen } from "@/components/screens/error-screen";
import { de } from "@/i18n/de";

/** 404 for unknown routes and for notFound() (e.g. a deleted guest match). */
export default function NotFound() {
  const t = de.errorPage;
  return <ErrorScreen title={t.notFoundTitle} text={t.notFoundText} homeLabel={t.home} />;
}
