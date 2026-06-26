import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from '@livestock/taxonomy-register'
import { comboBreeds, species } from "@livestock/species-cattle";

export const getController = {
  handler(request, h) {

    const payload = {
      breeds: comboBreeds,
      postBackUrl: `${buildMicrositePath(taxonomy.id, species.id)}/basic`,
    };

    return h.view("basic/index.njk", payload);
  },
};


export const postController = {
  handler(request, h) {

    return h.redirect(`${buildMicrositePath(taxonomy.id, species.id)}/dam`);
  },
};
