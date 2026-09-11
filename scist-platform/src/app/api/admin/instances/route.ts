import { requireCap } from "@/server/auth";
import { route, json } from "@/server/http";
import { audit, killAllInstances, listInstancesAdmin } from "@/server/repo/ops";

export const GET = route(async () => {
  await requireCap("instances.read");
  return json(await listInstancesAdmin());
});

/** Stop every running instance (maintenance window, or the VPS is on fire). */
export const DELETE = route(async () => {
  const user = await requireCap("instances.killAll");
  const stopped = await killAllInstances();
  await audit(user.id, "kill", "instance", null, "全部關閉，共 " + stopped + " 個");
  return json({ stopped });
});
