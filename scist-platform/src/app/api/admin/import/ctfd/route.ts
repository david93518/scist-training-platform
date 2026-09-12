import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { importCtfd } from "@/server/repo/transfer";
import { audit } from "@/server/repo/ops";

export const POST = route(async (req: Request) => {
  const user = await requireCap("content.import");
  const payload = await req.json().catch(() => null);
  const result = await importCtfd(payload, user.id);
  await audit(user.id, "import", "challenge", null, "CTFd 匯入 " + result.imported + " 題，略過 " + result.skipped + " 題");
  return json(result);
});
