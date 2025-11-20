import { FC } from "react";
import { Text, Grid, Box, Paper, Stack } from "@mantine/core";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { AlignmentSettings } from "./AlignmentSettings";

interface LayoutSettings {
  isDishTitleAndPrice: boolean;
  isDishDescriptionAndPrice: boolean;
  isDishTitleAndDescriptionAndPrice: boolean;
  isJustifyPriceCenter: boolean;
  isJustifyPriceTop: boolean;
  isDefaultLayout: boolean;
}

interface HorizontalSettings {
  isLeft: boolean;
  isCenter: boolean;
  isRight: boolean;
}

type LayoutOptionKey = keyof LayoutSettings;

const layoutOptions = [
  {
    key: "isDefaultLayout" as LayoutOptionKey,
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
              width: "60%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
            }}
          />
          <Box
            sx={{
              width: "85%",
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
  {
    key: "isDishTitleAndPrice" as LayoutOptionKey,
    preview: ({ active }: { active: boolean }) => (
      <Box sx={{ padding: "6px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "1px",
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
                lineHeight: "0px",
              }}
            >
              $
            </Text>
          </Box>
          <Box
            sx={{
              width: "85%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
              marginTop: "4px",
            }}
          />
        </Box>
      </Box>
    ),
  },
  {
    key: "isDishDescriptionAndPrice" as LayoutOptionKey,
    preview: ({ active }: { active: boolean }) => (
      <Box sx={{ padding: "6px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "0px",
          }}
        >
          <Box
            sx={{
              width: "50%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
              marginBottom: "4px",
            }}
          />
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
                width: "80%",
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
                lineHeight: "0px",
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
    key: "isDishTitleAndDescriptionAndPrice" as LayoutOptionKey,
    preview: ({ active }: { active: boolean }) => (
      <Box sx={{ padding: "6px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "0px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Box
              sx={{
                width: "35%",
                height: "6px",
                backgroundColor: "#D9D9D9",
                borderRadius: "0px",
              }}
            />
            <Box
              sx={{
                width: "50%",
                height: "6px",
                backgroundColor: "#D9D9D9",
                borderRadius: "0px",
              }}
            />
            <Text sx={{ color: "#FF9966", fontSize: "12px", fontWeight: 400 }}>
              $
            </Text>
          </Box>
        </Box>
      </Box>
    ),
  },
  {
    key: "isJustifyPriceTop" as LayoutOptionKey,
    preview: ({ active }: { active: boolean }) => (
      <Box sx={{ padding: "6px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Box
            sx={{
              width: "40%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
            }}
          />
          <Box
            sx={{
              width: "60%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
            }}
          />
        </Box>
        <Text
          sx={{
            position: "absolute",
            right: "4px",
            top: "9px",
            color: "#FF9966",
            fontSize: "12px",
            fontWeight: 400,
          }}
        >
          $
        </Text>
        <Text
          sx={{
            position: "absolute",
            right: "16px",
            top: "9px",
            color: "#FF9966",
            fontSize: "12px",
            fontWeight: 400,
          }}
        >
          $
        </Text>
      </Box>
    ),
  },
  {
    key: "isJustifyPriceCenter" as LayoutOptionKey,
    preview: ({ active }: { active: boolean }) => (
      <Box sx={{ padding: "6px" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Box
            sx={{
              width: "40%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
            }}
          />
          <Box
            sx={{
              width: "60%",
              height: "6px",
              backgroundColor: "#D9D9D9",
              borderRadius: "0px",
            }}
          />
        </Box>
        <Text
          sx={{
            position: "absolute",
            right: "4px",
            top: "15px",
            color: "#FF9966",
            fontSize: "12px",
            fontWeight: 400,
          }}
        >
          $
        </Text>
        <Text
          sx={{
            position: "absolute",
            right: "16px",
            top: "15px",
            color: "#FF9966",
            fontSize: "12px",
            fontWeight: 400,
          }}
        >
          $
        </Text>
      </Box>
    ),
  },
] as const;

export const DishLayoutSetting: FC = () => {
  const selectedSection = useSectionsStore((state) => state.selectedSection);
  const sectionId = selectedSection?.sectionId || "";

  const layoutSettings = useDishesStore(
    (state) => state.layoutSettings[sectionId] || {}
  );
  const horizontalAlignSettings = useDishesStore(
    (state) => state.horizontalAlignSettings[sectionId] || {}
  );

  const { incrementActivityChangeId } = useInitializeEditor();
  const { setLayoutSettings, setHorizontalSettings } = useDishesStore();

  const handleLayoutChange = (key: keyof LayoutSettings) => {
    const newSettings: LayoutSettings = {
      isDishTitleAndPrice: false,
      isDishDescriptionAndPrice: false,
      isDishTitleAndDescriptionAndPrice: false,
      isJustifyPriceCenter: false,
      isJustifyPriceTop: false,
      isDefaultLayout: false,
      [key]: !layoutSettings[key],
    };

    setLayoutSettings(sectionId, newSettings);
    incrementActivityChangeId();
  };

  const handleAlignmentChange = (key: keyof HorizontalSettings) => {
    const newSettings: HorizontalSettings = {
      isLeft: false,
      isCenter: false,
      isRight: false,
      [key]: !horizontalAlignSettings[key],
    };

    setHorizontalSettings(sectionId, newSettings);
    incrementActivityChangeId();
  };

  const isAlignmentDisabled =
    layoutSettings.isJustifyPriceCenter || layoutSettings.isJustifyPriceTop;

  return (
    <Grid gutter="xs">
      <Box
        sx={{
          width: "98%",
          justifyContent: "center",
          alignItems: "center",
          paddingLeft: "10px",
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
        <Grid columns={3} gutter="xs">
          {layoutOptions.map(({ key, preview: Preview }) => {
            const hasOtherActiveSettings = Object.entries(layoutSettings).some(
              ([settingKey, value]) => settingKey !== "isDefaultLayout" && value
            );

            const isActive =
              key === "isDefaultLayout"
                ? !hasOtherActiveSettings
                : !!layoutSettings[key];

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
      <AlignmentSettings
        alignSettings={horizontalAlignSettings}
        handleAlignmentChange={(e) => handleAlignmentChange(e)}
        isAlignmentDisabled={isAlignmentDisabled}
      />
    </Grid>
  );
};
