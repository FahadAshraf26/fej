import { usePageStore } from "@Stores/MenuStore/Pages.store";

export const getMenuTitle = () => {
  return `${usePageStore.getState().menuName}`;
};
