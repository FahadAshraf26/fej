import { FC } from "react";
import { Text, Grid, Box, Paper } from "@mantine/core";

interface AlignSettings {
  isLeft: boolean;
  isCenter: boolean;
  isRight: boolean;
}

const AlignLeftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="6" width="14" height="2" rx="1" fill="#9DA3AE" />
    <rect x="3" y="11" width="18" height="2" rx="1" fill="#9DA3AE" />
    <rect x="3" y="16" width="10" height="2" rx="1" fill="#9DA3AE" />
  </svg>
);

const AlignCenterIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="5" y="6" width="14" height="2" rx="1" fill="#9DA3AE" />
    <rect x="3" y="11" width="18" height="2" rx="1" fill="#9DA3AE" />
    <rect x="7" y="16" width="10" height="2" rx="1" fill="#9DA3AE" />
  </svg>
);

const AlignRightIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="7" y="6" width="14" height="2" rx="1" fill="#9DA3AE" />
    <rect x="3" y="11" width="18" height="2" rx="1" fill="#9DA3AE" />
    <rect x="11" y="16" width="10" height="2" rx="1" fill="#9DA3AE" />
  </svg>
);

const alignmentOptions = [
  { key: "isLeft", label: "Left", icon: AlignLeftIcon },
  { key: "isCenter", label: "Center", icon: AlignCenterIcon },
  { key: "isRight", label: "Right", icon: AlignRightIcon },
] as const;

export const AlignmentSettings: FC<{
  alignSettings: AlignSettings;
  handleAlignmentChange: (key: any) => void;
  isAlignmentDisabled: boolean;
}> = ({ alignSettings, handleAlignmentChange, isAlignmentDisabled }) => {
  return (
    <Box mt={24} sx={{ width: "100%" }}>
      <Text
        sx={{
          fontSize: "12px",
          color: "#9DA3AE",
          marginBottom: "8px",
          fontWeight: 400,
        }}
      >
        Text Alignment
      </Text>
      <Box
        sx={{
          backgroundColor: "#F8F9FA",
          padding: "8px",
          borderRadius: "8px",
        }}
      >
        <Grid columns={12} gutter="sm">
          {alignmentOptions.map(({ key, icon: Icon }) => {
            const isActive = !!alignSettings[key];
            const isDisabled = isAlignmentDisabled;

            return (
              <Grid.Col key={key} span={4}>
                <Paper
                  sx={{
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    border: `1px solid ${isActive ? "#FF9966" : "#EAECEF"}`,
                    borderRadius: "8px",
                    position: "relative",
                    height: "25px",
                    opacity: isDisabled ? 0.5 : 1,
                    backgroundColor: "white",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "&:hover": {
                      borderColor: isDisabled ? "#EAECEF" : "#FF9966",
                    },
                  }}
                  onClick={() => !isDisabled && handleAlignmentChange(key)}
                >
                  <Icon />
                </Paper>
              </Grid.Col>
            );
          })}
        </Grid>
      </Box>
    </Box>
  );
};
