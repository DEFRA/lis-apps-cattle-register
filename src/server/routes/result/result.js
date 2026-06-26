import { getController } from "./result-controller.js";

export const result = {
  plugin: {
    name: "result",
    register(server) {
      server.route([
        {
          method: "GET",
          path: "/result",
          ...getController,
        }
      ])
    },
  }
}
