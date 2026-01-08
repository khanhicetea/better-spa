import { defineTask } from "nitro/task";

export default defineTask({
  meta: {
    name: "hello",
    description: "Say hello.",
  },
  run({ payload, context }) {
    console.log("Hello from Scheduled Task");

    return { result: "Success" };
  },
});
