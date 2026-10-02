import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const schemaPath = path.join(process.cwd(), "supabase", "ats_schema.sql");
  const schema = await readFile(schemaPath, "utf8");

  return new Response(schema, {
    headers: {
      "Content-Disposition": "attachment; filename=ats_schema.sql",
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
