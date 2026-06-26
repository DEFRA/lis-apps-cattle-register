import { buildMicrositePath } from '@livestock/ui-services'
import { taxonomy } from "@livestock/taxonomy-register";
import { species } from "@livestock/species-cattle";

export const getController = {
  handler(request, h) {

    const data = {
      tag: '123',
      calfName: 'bob',
      dob: '01/01/2002',
      breed: 'moo',
      sex: 'male',
      surrogate: `No`,
      genetic_dam:'12341243',
      dam_breed: 'moo2',
      assistance: 'jack',
      identifySire: '12341243'
    }

    const payload = {
      rows: createSummaryItems(data),
      postBackUrl: `${buildMicrositePath(taxonomy.id, species.id)}/summary`,
    };

    return h.view("summary/index.njk", payload);
  }
}

export const postController = {
  handler(request, h) {
    return h.redirect(`${buildMicrositePath(taxonomy.id, species.id)}/result`);
  }
}

function createSummaryItems(data){
  const rootUrl = `${buildMicrositePath(taxonomy.id, species.id)}`

  const basicDetails = [data.tag, data.calfName, data.dob, data.breed, data.sex]
    .filter(x=>x.length > 0)
    .join('<BR/>')

  const transfer =
    data.transfer === "yes" ? `Yes - surrogate ${data.surrogate}` : `No`;
  const damDetails = [transfer, data.genetic_dam, data.dam_breed, data.assistance]
    .filter((x) => x.length > 0)
    .join("<BR/>");

  const sireDetails = [data.identifySire]
    .filter((x) => x.length > 0)
    .join("<BR/>");

  return [
    createSummaryItem("Basic details", basicDetails, `${rootUrl}/basic`),
    createSummaryItem("Dam details", damDetails, `${rootUrl}/dam`),
    createSummaryItem("Sire details", sireDetails, `${rootUrl}/sire`)
  ];
}

function createSummaryItem(key, value, url, actionText = 'Change')
{
  return {
    key: {
      text: key
    },
    value: {
      html: value
    },
    actions: {
      items: [
        {
          href: url,
          text: actionText
        }
      ]
    }
  }
}
