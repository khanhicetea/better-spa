import * as z from "zod";
import { baseProcedure } from "../base";

export const hello = baseProcedure
  .input(
    z.object({
      name: z.string().min(2).max(100),
      email: z.email(),
    }),
  )
  .handler(async ({ input, context }) => {
    context.waitUntil(
      fetch("https://myip.wtf/json")
        .then((r) => r.json())
        .then((json) => console.log(json)),
    );

    return {
      message: `Hello ${input.name}, your email is ${input.email}!`,
    };
  });
