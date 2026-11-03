import { redirect } from "next/navigation";
export default async function LegacyPollPage({ params }: { params: Promise<{ buildingId: string }> }) {
  const { buildingId } = await params;
  redirect("/app/buildings/" + encodeURIComponent(buildingId) + "/polls");
}
