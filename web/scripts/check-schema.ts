import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
async function main() {
  try {
    const columns = await db.$queryRaw<
      Array<{ table_name: string; column_name: string; is_nullable: string }>
    >`
    SELECT table_name, column_name, is_nullable FROM information_schema.columns WHERE table_schema = 'public'
  `;
    const present = new Set(columns.map((c) => `${c.table_name}.${c.column_name}`));
    const missing = Prisma.dmmf.datamodel.models.flatMap((model) =>
      model.fields
        .filter(
          (field) =>
            field.kind !== "object" &&
            !present.has(`${model.dbName ?? model.name}.${field.dbName ?? field.name}`),
        )
        .map((field) => `${model.dbName ?? model.name}.${field.dbName ?? field.name}`),
    );
    if (missing.length)
      throw new Error(
        `Missing database columns: ${missing.join(", ")}. Apply migrations before starting the server.`,
      );
    const nullability = Prisma.dmmf.datamodel.models.flatMap((model) =>
      model.fields
        .filter(
          (field) =>
            field.kind !== "object" &&
            !field.isList &&
            !field.isRequired &&
            columns.some(
              (c) =>
                c.table_name === (model.dbName ?? model.name) &&
                c.column_name === (field.dbName ?? field.name) &&
                c.is_nullable === "NO",
            ),
        )
        .map((field) => `${model.dbName ?? model.name}.${field.dbName ?? field.name}`),
    );
    if (nullability.length)
      throw new Error(
        `Database columns unexpectedly require values: ${nullability.join(", ")}. Apply reconciliation migration.`,
      );
    const tables = await db.$queryRaw<
      Array<{
        relname: string;
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
        has_policy: boolean;
      }>
    >`
    SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity,
      EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname AND p.policyname = 'tenant_iso') AS has_policy
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'
  `;
    // Reviews belong to the shared master directory; osiId is optional legacy metadata.
    const tenantModels = Prisma.dmmf.datamodel.models.filter(
      (model) =>
        model.fields.some((field) => field.name === "osiId") &&
        !["UserOsiRole", "OsiJoinRequest", "MasterReview"].includes(model.name),
    );
    const unprotected = tenantModels
      .filter((model) => {
        const table = tables.find((t) => t.relname === (model.dbName ?? model.name));
        return !table?.relrowsecurity || !table.relforcerowsecurity || !table.has_policy;
      })
      .map((model) => model.dbName ?? model.name);
    if (unprotected.length)
      throw new Error(`Tenant isolation disabled or missing: ${unprotected.join(", ")}`);
    const runtime = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
    try {
      const roles = await runtime.$queryRaw<
        Array<{ rolsuper: boolean; rolbypassrls: boolean }>
      >`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
      if (!roles[0] || roles[0].rolsuper || roles[0].rolbypassrls)
        throw new Error("Runtime database role bypasses tenant isolation");
      if ((await runtime.building.count()) !== 0)
        throw new Error("Buildings visible without tenant context");
    } finally {
      await runtime.$disconnect();
    }
    console.log(
      `Columns and optional-field nullability match ${Prisma.dmmf.datamodel.models.length} Prisma models.`,
    );
    console.log(
      `RLS enforced on ${tenantModels.length} tenant tables; runtime role cannot read buildings without context.`,
    );
  } finally {
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Schema check failed");
  process.exitCode = 1;
});
