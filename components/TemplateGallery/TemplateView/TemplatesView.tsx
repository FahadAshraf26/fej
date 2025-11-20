// components/TemplateGallery/TemplateView/TemplatesView.tsx
import React, { useCallback, useMemo, useEffect } from "react";
import { Button, Container, SimpleGrid, Stack } from "@mantine/core";
import TemplateHeader from "@Components/Header";
import { CollapsibleTemplatesInfo } from "@Components/TemplateGallery/TemplateInfoPanel";
import TemplateCard from "@Components/TemplateGallery/TemplateCard";
import { useTemplateStore } from "../../../stores/Template/Template.store";
import { ITemplateDetails } from "../../../interfaces/ITemplate";
import { useModal } from "../../../context/ModalContext";
import { useSubscriptionContext } from "../../../context/SubscriptionContext";

const TemplatesView = React.memo(() => {
  // Get state and actions from the store with selective subscription
  const activeTab = useTemplateStore((state) => state.activeTab);
  const setActiveTab = useTemplateStore((state) => state.setActiveTab);
  const globalTemplates = useTemplateStore((state) => state.globalTemplates);
  const fetchGlobalTemplates = useTemplateStore((state) => state.fetchGlobalTemplates);
  const getThumbnailUrl = useTemplateStore((state) => state.getThumbnailUrl);
  const hasMoreGlobalTemplates = useTemplateStore((state) => state.hasMoreGlobalTemplates);
  const isLoadingGlobalTemplates = useTemplateStore((state) => state.isLoadingGlobalTemplates);

  // Get modal functions
  const { openModal } = useModal();
  const { handleAction } = useSubscriptionContext();

  // Fetch global templates on mount
  useEffect(() => {
    fetchGlobalTemplates();
  }, [fetchGlobalTemplates]);

  // Memoize the filtered templates to prevent unnecessary recalculations
  const filteredTemplates = useMemo(
    () => globalTemplates.filter((item) => !!!item?.restaurant_id || item?.restaurant_id === "2"),
    [globalTemplates]
  );

  // Generate a timestamp for cache-busting image URLs
  const timestamp = useMemo(() => Date.now(), []);

  // Handler for opening the edit thumbnail modal
  const handleEditThumbnail = useCallback(
    (template: ITemplateDetails) => {
      openModal("coverImage", template);
    },
    [openModal]
  );

  // Handler for template card actions
  const handleTemplateAction = useCallback(
    (action: string, template: ITemplateDetails) => {
      switch (action) {
        case "edit":
          // Navigate to template editor with subscription check
          handleAction(() => {
            window.location.href = `/menu/${template.id}`;
          });
          break;
        case "delete":
          openModal("delete", template);
          break;
        case "rename":
          openModal("rename", template);
          break;
        case "duplicate":
          openModal("duplicate", template);
          break;
        case "transfer":
          openModal("transfer", template);
          break;
        case "changeLocation":
          openModal("changeLocation", template);
          break;
        default:
          break;
      }
    },
    [openModal, handleAction]
  );

  return (
    <>
      <TemplateHeader setNavMenu={setActiveTab} navMenu={activeTab} />

      <Container size="xl" px="xl" pt={16} pb={16}>
        <CollapsibleTemplatesInfo />

        <SimpleGrid
          cols={3}
          breakpoints={[
            { maxWidth: 1120, cols: 3, spacing: "md" },
            { maxWidth: 991, cols: 2, spacing: "sm" },
            { maxWidth: 600, cols: 1, spacing: "sm" },
          ]}
        >
          {filteredTemplates.map((template: ITemplateDetails, i: number) => {
            return (
              <TemplateCard
                key={i}
                template={template}
                thumbnail={
                  template.hasThumbnail ? getThumbnailUrl(template.id) ?? undefined : undefined
                }
                onAction={(action) => handleTemplateAction(action, template)}
                onEditThumbnail={() => handleEditThumbnail(template)}
              />
            );
          })}
        </SimpleGrid>
        {hasMoreGlobalTemplates && filteredTemplates.length > 0 && (
          <Stack align="center" mt="xl" mb="xl">
            <Button
              onClick={fetchGlobalTemplates}
              variant="outline"
              size="md"
              radius="sm"
              loading={isLoadingGlobalTemplates}
              loaderPosition="right"
              styles={{
                root: {
                  paddingInline: "24px",
                  fontWeight: 600,
                },
              }}
            >
              Load More
            </Button>
          </Stack>
        )}
      </Container>
    </>
  );
});

TemplatesView.displayName = "TemplatesView";

export default TemplatesView;
