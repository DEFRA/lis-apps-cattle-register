import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from "@livestock/taxonomy-register";
import { species } from "@livestock/species-cattle";

export const getController = {
  handler(request, h) {
    const payload = {
      postBackUrl: `${buildMicrositePath(taxonomy.id, species.id)}/sire`,
    };

    return h.view("sire/index.njk", payload);
  },
};

export const postController = {
  handler(request, h) {
    return h.redirect(`${buildMicrositePath(taxonomy.id, species.id)}/summary`);
  },
};
