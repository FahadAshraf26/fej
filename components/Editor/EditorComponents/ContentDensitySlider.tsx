import React, { FC } from "react";
import { Slider, Text, Box } from "@mantine/core";
import { useMantineTheme } from "@mantine/core";
import { usePageStore } from "@Stores/MenuStore/Pages.store";

export const ContentDensitySlider: FC = () => {
  const dishSpace = usePageStore((state) => state.dishSpace);
  const updateDishSpacing = usePageStore(
    (state) => state.updatePageDishSpacing
  );
  const theme = useMantineTheme();

  const handleSliderChange = (newValue: number) => {
    updateDishSpacing(newValue);
  };

  const sliderStyle = {
    position: "relative" as "relative",
    height: "10px",
    background: "transparent",
  };

  const markStyle = (index: number, position: "top" | "bottom") => ({
    position: "absolute" as "absolute",
    height: index === 0 || index === 9 ? "11px" : "5px",
    width: "2px",
    backgroundColor:
      index * 2 + 1 <= dishSpace ? theme.colors.gray[5] : theme.colors.gray[5],
    left: `calc(${(index / 9) * 100}% - 1px)`,
    [position]: position === "top" ? "-1px" : "13px",
    zIndex: 1,
  });

  const tooltipContainerStyle = {
    position: "relative" as "relative",
    height: "0",
  };

  const tooltipStyle = {
    position: "absolute" as "absolute",
    top: "-62px",
    left: `calc(${((dishSpace - 1) / 19) * 100}%)`,
    transform: "translateX(-50%)",
    backgroundColor: "#ffffff",
    color: theme.colors.gray[9],
    borderRadius: theme.radius.sm,
    padding: "4px 8px",
    fontSize: "14px",
    boxShadow: theme.shadows.sm,
    whiteSpace: "nowrap" as "nowrap",
    zIndex: 2,
  };

  const arrowStyle = {
    position: "absolute" as "absolute",
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "0",
    height: "0",
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderTop: "6px solid #ffffff",
    zIndex: 2,
  };

  return (
    <Box p="sm">
      <Box style={{ ...sliderStyle, height: "30px" }}>
        {Array.from({ length: 10 }).map((_, index) => (
          <React.Fragment key={index}>
            <Box style={markStyle(index, "top")} />
            <Box style={markStyle(index, "bottom")} />
          </React.Fragment>
        ))}
        <Slider
          min={1}
          max={20}
          value={dishSpace}
          onChange={handleSliderChange}
          label={null}
          marks={[]}
          styles={{
            track: {
              backgroundColor: "transparent",
              position: "relative",
              zIndex: 1,
            },
            bar: {
              backgroundColor: dishSpace ? "#989898" : "#E0E0E0",
              height: "6px",
            },
            thumb: {
              backgroundColor: "#ffffff",
              borderColor: "#ffffff",
              height: "24px",
              width: "24px",
              borderRadius: "8px",
              border: "1px solid #FFFFFF",
              boxShadow: theme.shadows.sm,
              position: "relative",
              zIndex: 3,
            },
          }}
        />
        <Box style={tooltipContainerStyle}>
          <Box style={tooltipStyle}>
            {dishSpace}
            <Box style={arrowStyle} />
          </Box>
        </Box>
      </Box>
      <Box style={{ position: "relative", height: "40px", marginTop: "5px" }}>
        <Box style={{ position: "absolute", left: 0 }}>
          <Text
            style={{
              fontFamily: "Satoshi-regular-400",
              fontSize: "14px",
              color: "#3B3B3B",
            }}
          >
            Roomy
          </Text>
          <Text
            style={{
              fontFamily: "Satoshi-regular-400",
              fontSize: "11px",
              color: "#737373",
            }}
          >
            Smaller fonts with more gap
          </Text>
        </Box>
        <Box style={{ position: "absolute", right: 0, textAlign: "right" }}>
          <Text
            style={{
              fontFamily: "Satoshi-regular-400",
              fontSize: "14px",
              color: "#3B3B3B",
            }}
          >
            Compact
          </Text>
          <Text
            style={{
              fontFamily: "Satoshi-regular-400",
              fontSize: "11px",
              color: "#737373",
            }}
          >
            Bigger fonts with less gap
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
