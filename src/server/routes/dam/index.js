import { getController, postController } from "./dam-controller.js";

export const dam = {
  plugin: {
    name: "dam",
    register(server) {
      server.route([
        {
          method: "GET",
          path: "/dam",
          ...getController,
        },
        {
          method: "POST",
          path: "/dam",
          ...postController,
        },
      ]);
    },
  },
};
