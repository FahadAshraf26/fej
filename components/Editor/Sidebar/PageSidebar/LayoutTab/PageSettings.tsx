import React, { FC } from "react";
import { Text, Switch, Grid, Col } from "@mantine/core";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { PageMargin } from "@Components/Editor/EditorComponents/PageMargin";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { ColumnCounter } from "@Components/Editor/EditorComponents/ColumnCounter";

export const PageSettings: FC = () => {
  const FONT_FAMILY = "Satoshi-regular-400";
  const pageSettingsOptions = usePageStore((state) => state.moreOptions);
  const activePageId = usePageStore((state) => state.activePageId);
  const isPageSetting = pageSettingsOptions[activePageId] || { checked: false };
  const setPageSettingOptions = usePageStore((state) => state.setMoreOptions);
  const incrementActivityChangeId = useInitializeEditor(
    (state) => state.incrementActivityChangeId
  );
  return (
    <Grid gutter="sm">
      <Col span={2}>
        <Switch
          size="md"
          checked={isPageSetting.checked}
          onChange={(event) =>
            setPageSettingOptions(activePageId, event.currentTarget.checked)
          }
          style={{ paddingTop: "10px" }}
          styles={(theme) => ({
            root: {
              padding: "2px",
            },
            body: {
              padding: "2px",
            },
            track: {
              width: "55px",
              height: "15px",
              backgroundColor: isPageSetting.checked
                ? "#B9B9B9 !important"
                : "#ded8d8 !important",
              borderRadius: "10px",
              border: "none",
              position: "relative",
              transition: "background-color 0.2s ease",
              overflow: "visible",
            },
            thumb: {
              width: "28px",
              height: "28px",
              backgroundColor: "#3B3B3B",
              borderRadius: "50%",
              position: "absolute",
              top: "-7px",
              left: isPageSetting.checked ? "calc(100% - 28px)" : "0px",
              boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
              transition: "left 0.2s ease",
            },
            input: {
              cursor: "pointer",
            },
          })}
        />
      </Col>
      <Col span={4}>
        <Text
          style={{
            paddingTop: "6px",
            fontFamily: "Satoshi-regular-400",
            fontSize: "16px",
            color: "#3B3B3B",
            letterSpacing: "6%",
            lineHeight: "20px",
          }}
        >
          More options
        </Text>
      </Col>
      {isPageSetting.checked && (
        <>
          <Col span={12}>
          <Text
            style={{
              fontFamily: FONT_FAMILY,
              fontSize: "14px",
              color: "#3B3B3B",
              marginBottom: "1rem",
              marginTop: "1rem"
            }}
          >
            Page Columns
          </Text>
            <ColumnCounter
              count={usePageStore.getState().getPageColumnCount()}
            />
          </Col>
          <Col span={12}>
            <PageMargin />
          </Col>
        </>
      )}
    </Grid>
  );
};
