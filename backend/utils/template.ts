import { ITemplateDetails } from "interfaces/ITemplate";

export const prepareTemplateForArchive = (
  template: ITemplateDetails,
  newArchiveEntry: any
) => {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    content: [newArchiveEntry],
    restaurant_id: template.restaurant_id,
    location: template.location,
    isGlobal: template.isGlobal,
    createdBy: template.createdBy,
    menuSize: template.menuSize,
    templateOrder: template.templateOrder,
    tags: template.tags,
    updatedAt: template.updatedAt,
    printPreview: template.printPreview,
  };
};
