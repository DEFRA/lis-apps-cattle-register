import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from "@livestock/taxonomy-register";
import { species } from "@livestock/species-cattle";

export const getController = {
  handler(request, h) {
    const payload = {
      nextUrl: `${buildMicrositePath(taxonomy.id, species.id)}/home`,
    };

    return h.view("result/index.njk", payload);
  },
}
