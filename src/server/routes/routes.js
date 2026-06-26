import { listController } from "./controllers/home-controller.js";
import {
  createController,
  createSubmitController,
} from "./controllers/basic-controller.js";
import {
  cphsController,
  cphsSubmitController,
} from "./controllers/cphs-controller.js";
import {
  confirmController,
  confirmSubmitController,
} from "./controllers/confirm-controller.js";
import {
  deleteController,
  deleteSubmitController,
} from "./controllers/delete-controller.js";
import {
  manageController,
  manageUpdateController,
} from "./controllers/manage-controller.js";

const sessionAuth = {
  auth: {
    mode: "required",
    strategies: ["session"],
  },
};

export const routes = (options = {}) => {
  const { delegationPath = "/delegation", userService } = options;
  return [
    {
      method: "GET",
      path: delegationPath,
      options: sessionAuth,
      ...listController(userService),
    },
    ...createFlowRoutes(delegationPath, userService),
    ...managementRoutes(delegationPath, userService),
  ];
};

function createFlowRoutes(delegationPath, userService) {
  const createSubmit = createSubmitController(userService);
  const cphsSubmit = cphsSubmitController(userService);
  const confirmSubmit = confirmSubmitController();
  return [
    {
      method: "GET",
      path: `${delegationPath}/create`,
      options: sessionAuth,
      ...createController(),
    },
    {
      method: "POST",
      path: `${delegationPath}/create`,
      ...createSubmit,
      options: {
        ...createSubmit.options,
        ...sessionAuth,
      },
    },
    {
      method: "GET",
      path: `${delegationPath}/create/cphs`,
      options: sessionAuth,
      ...cphsController(userService),
    },
    {
      method: "POST",
      path: `${delegationPath}/create/cphs`,
      ...cphsSubmit,
      options: {
        ...cphsSubmit.options,
        ...sessionAuth,
      },
    },
    {
      method: "GET",
      path: `${delegationPath}/create/confirm`,
      options: sessionAuth,
      ...confirmController(userService),
    },
    {
      method: "POST",
      options: sessionAuth,
      path: `${delegationPath}/create/confirm`,
      ...confirmSubmit,
    },
  ];
}

function managementRoutes(delegationPath, userService) {
  const manageUpdate = manageUpdateController(userService);
  return [
    {
      method: "GET",
      options: sessionAuth,
      path: `${delegationPath}/{delegated_user_id}/manage`,
      ...manageController(userService),
    },
    {
      method: "POST",
      path: `${delegationPath}/{delegated_user_id}/manage`,
      ...manageUpdate,
      options: {
        ...manageUpdate.options,
        ...sessionAuth,
      },
    },
    {
      method: "GET",
      options: sessionAuth,
      path: `${delegationPath}/{delegated_user_id}/delete`,
      ...deleteController(userService),
    },
    {
      method: "POST",
      options: sessionAuth,
      path: `${delegationPath}/{delegated_user_id}/delete`,
      ...deleteSubmitController(userService),
    },
  ];
}
