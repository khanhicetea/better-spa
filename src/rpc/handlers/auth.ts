import { baseProcedure } from "../base";

export const getCurrentUser = baseProcedure.handler(async ({ context }) => {
  const sessionUser = context.session?.user;
  if (!sessionUser) {
    return null;
  }

  const user = await context.repos.user.findById(sessionUser.id);
  return user ?? null;
});
