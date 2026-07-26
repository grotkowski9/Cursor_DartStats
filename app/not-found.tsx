import type { Metadata } from "next";
import { ErrorScreen } from "@/components/error-screen";
import { siteDocumentTitle } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <ErrorScreen
      code="404"
      title="O kurde, co to się stanęło!"
      subtitle="Nic tu nie ma. Albo lotka wyleciała poza tarczę, albo ten link nigdy nie istniał. Wróć na stronę główną — tam jest bezpiecznie."
      redirectSeconds={10}
    />
  );
}
