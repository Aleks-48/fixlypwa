import { PageHeader, PageBody } from "@/app/app/_components/PageHeader";
import { getTranslation } from "@/lib/i18n/server";
import { ComplaintsClient } from "./ComplaintsClient";

export const dynamic = "force-dynamic";

export default async function ComplaintsPage() {
  const { t } = await getTranslation();

  return (
    <>
      <PageHeader title={t("title_complaints")} subtitle={t("subtitle_complaints")} />
      <PageBody>
        <ComplaintsClient />
      </PageBody>
    </>
  );
}
