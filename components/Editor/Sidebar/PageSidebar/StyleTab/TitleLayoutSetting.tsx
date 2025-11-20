import { FC } from "react";
import { Text, Grid, Box, Paper, Stack } from "@mantine/core";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

interface LayoutSettings {
  isSectionTitleWithPrice: boolean;
  isSectionTitleTopOnPrice: boolean;
}

type LayoutOptionKey = keyof LayoutSettings;

const layoutOptions = [
  {
    key: "isSectionTitleWithPrice" as LayoutOptionKey,
    preview: ({ active }: { active: boolean }) => (
      <Box sx={{ padding: "6px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              width: "100%",
            }}
          >
            <Box
              sx={{
                width: "70%",
                height: "6px",
                backgroundColor: "#D9D9D9",
                borderRadius: "0px",
              }}
            />
            <Text
              sx={{
                color: "#FF9966",
                fontSize: "12px",
                fontWeight: 400,
                lineHeight: "6px",
              }}
            >
              $
            </Text>
          </Box>
        </Box>
      </Box>
    ),
  },
  {
    key: "isSectionTitleTopOnPrice" as LayoutOptionKey,
    preview: ({ active }: { active: boolean }) => (
      <Stack sx={{ padding: "8px 0 0 6px" }} justify="center">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Box
            sx={{
              width: "70%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
            }}
          />
          <Text
            sx={{
              color: "#FF9966",
              fontSize: "12px",
              fontWeight: 400,
            }}
          >
            $
          </Text>
        </Box>
      </Stack>
    ),
  },
] as const;

export const TitleLayoutSetting: FC = () => {
  const selectedSection = useSectionsStore((state) => state.selectedSection);
  const sectionId = selectedSection?.sectionId || "";

  const layoutSettings = useSectionsStore((state) => state.layoutSettings[sectionId] || {});

  const { incrementActivityChangeId } = useInitializeEditor();
  const { setLayoutSettings } = useSectionsStore();

  const handleLayoutChange = (key: keyof LayoutSettings) => {
    const newSettings: LayoutSettings = {
      isSectionTitleWithPrice: key === "isSectionTitleWithPrice",
      isSectionTitleTopOnPrice: key === "isSectionTitleTopOnPrice",
    };

    setLayoutSettings(sectionId, newSettings);
    incrementActivityChangeId();
  };

  // Determine which option is active - default to first option if none selected
  const getIsActive = (key: LayoutOptionKey): boolean => {
    if (layoutSettings.isSectionTitleWithPrice && key === "isSectionTitleWithPrice") {
      return true;
    }
    if (layoutSettings.isSectionTitleTopOnPrice && key === "isSectionTitleTopOnPrice") {
      return true;
    }
    // Default to first option if no settings are active
    if (
      !layoutSettings.isSectionTitleWithPrice &&
      !layoutSettings.isSectionTitleTopOnPrice &&
      key === "isSectionTitleWithPrice"
    ) {
      return true;
    }
    return false;
  };

  return (
    <Box
      sx={{
        width: "98%",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text
        sx={{
          fontSize: "12px",
          color: "#9DA3AE",
          marginBottom: "6px",
          padding: "0px 24px 0px 0px",
          fontWeight: 400,
        }}
      >
        Price Position
      </Text>
      <Grid columns={2} gutter="xs">
        {layoutOptions.map(({ key, preview: Preview }) => {
          const isActive = getIsActive(key);

          return (
            <Grid.Col key={key} span={1}>
              <Paper
                sx={{
                  cursor: "pointer",
                  border: `1px solid ${isActive ? "#FF9966" : "#EAECEF"}`,
                  borderRadius: "8px",
                  position: "relative",
                  height: "55px",
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    borderColor: "#FF9966",
                  },
                }}
                onClick={() => handleLayoutChange(key)}
              >
                <Preview active={isActive} />
              </Paper>
            </Grid.Col>
          );
        })}
      </Grid>
    </Box>
  );
};
