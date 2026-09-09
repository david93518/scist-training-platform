import { getCurrentUser } from "@/server/auth";
import { route, json } from "@/server/http";
import { getProfile } from "@/server/repo/learner";

/** The logged-in learner's profile and progress, shaped like the client store. */
export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) return json({ authenticated: false }, { status: 200 });
  return json({ authenticated: true, ...(await getProfile(user.id)) });
});
