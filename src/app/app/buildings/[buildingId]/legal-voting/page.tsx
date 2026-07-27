import { getCurrentAuth as getAuthContext } from "@/lib/auth/session";
export default async function LegalVotingPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = await params;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Официальные голосования</h1>
      <p>ID дома:{buildingId}</p>
    </div>
  );
}