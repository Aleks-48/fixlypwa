import { forTenant } from "@/lib/db/tenant";
import { prisma } from "@/lib/db/prisma";

export type SearchResultGroup = {
  category: string;
  items: {
    id: string;
    title: string;
    subtitle?: string;
    href: string;
    type: "request" | "document" | "master" | "announcement" | "nav";
  }[];
};

export async function globalSearch(
  osiId: string,
  buildingId: string | null,
  query: string,
): Promise<SearchResultGroup[]> {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) return [];

  const results: SearchResultGroup[] = [];

  // 1. Поиск по Документам дома
  if (buildingId) {
    const docs = await forTenant(osiId, (tx) =>
      tx.document.findMany({
        where: {
          buildingId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
      }),
    );

    if (docs.length > 0) {
      results.push({
        category: "Документы",
        items: docs.map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: d.description || d.category,
          href: `/app/documents`,
          type: "document",
        })),
      });
    }
  }

  // 2. Поиск по Заявкам
  const requests = await forTenant(osiId, (tx) =>
    tx.request.findMany({
      where: {
        ...(buildingId ? { buildingId } : {}),
        text: { contains: q, mode: "insensitive" },
      },
      take: 5,
    }),
  );

  if (requests.length > 0) {
    results.push({
      category: "Заявки",
      items: requests.map((r) => ({
        id: r.id,
        title: r.text,
        subtitle: `Статус: ${r.status}`,
        href: `/app/requests`,
        type: "request",
      })),
    });
  }

  // 3. Поиск по Объявлениям
  if (buildingId) {
    const announcements = await forTenant(osiId, (tx) =>
      tx.announcement.findMany({
        where: {
          buildingId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
      }),
    );

    if (announcements.length > 0) {
      results.push({
        category: "Объявления",
        items: announcements.map((a) => ({
          id: a.id,
          title: a.title,
          subtitle: a.body.slice(0, 60),
          href: `/app/news`,
          type: "announcement",
        })),
      });
    }
  }

  // 4. Поиск по Мастерам (Identity)
  const masters = await prisma.master.findMany({
    where: {
      status: "APPROVED",
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 4,
  });

  if (masters.length > 0) {
    results.push({
      category: "Мастера",
      items: masters.map((m) => ({
        id: m.id,
        title: m.fullName,
        subtitle: `${m.city} · ${m.categories.join(", ")}`,
        href: `/app/masters`,
        type: "master",
      })),
    });
  }

  return results;
}
