import { clearSessionCookie, readSessionUser, refreshSessionIfStale, requireUser } from "@/server/auth";
import { route, json, readJson } from "@/server/http";
import { getProfile, updateOwnProfile } from "@/server/repo/learner";
import { profilePatchSchema } from "@/server/validators";

/** The logged-in learner's profile and progress, shaped like the client store. */
export const GET = route(async () => {
  const { user, banned } = await readSessionUser();
  if (!user) {
    // 用到一半被停權：把 cookie 收掉，順便讓前台知道不是自己登出的
    if (banned) await clearSessionCookie();
    return json({ authenticated: false, banned }, { status: 200 });
  }
  await refreshSessionIfStale({ id: user.id, handle: user.handle, role: user.role });
  return json({ authenticated: true, ...(await getProfile(user.id)) });
});

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  const input = await readJson(req, profilePatchSchema);
  await updateOwnProfile(user.id, input);
  return json({ authenticated: true, ...(await getProfile(user.id)) });
});
