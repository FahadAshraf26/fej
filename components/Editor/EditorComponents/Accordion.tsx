import React from "react";
import Image from "next/image";
import { Accordion, Group, ActionIcon, Tooltip, Flex, Text } from "@mantine/core";
import duplicateIcon from "@Public/icons/duplicateIcon.svg";
import deleteIcon from "@Public/icons/deleteIcon.svg";
import dividerIcon from "@Public/icons/dividerIcon.svg";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

interface AccordionPanelProps {
  isActive: boolean;
  action?: {
    title: string;
    icon: string;
    onClick: () => void;
  };
  children: React.ReactNode;
  spacer?: boolean;
  spacerHandler?: () => void;
  dndRef?: any;
  providedProps?: any;
  snapshot?: any;
  isLoading?: boolean;
}

interface AccordionButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  updateLabel?: (value: string) => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  children?: any;
  fontSize?: string;
  fontFamily: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  isSection: boolean;
}
interface ActionButtonsProps {
  isActive: boolean;
  onDuplicate?: () => void;
  onDelete?: () => void;
  isSection: boolean;
  incrementActivityChangeId: () => void;
}
const ActionButtons: React.FC<ActionButtonsProps> = ({
  isActive,
  onDuplicate,
  onDelete,
  isSection,
  incrementActivityChangeId,
}) => {
  const pages = usePageStore((state) => state.pages);

  if (!isActive) return null;

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    incrementActivityChangeId();
  };

  return (
    <Group spacing={8} onClick={(e) => e.stopPropagation()}>
      <Tooltip label="Duplicate" position="top" withArrow>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => onDuplicate && handleAction(e, onDuplicate)}
          onKeyUp={(e) => e.key === "Enter" && onDuplicate && handleAction(e as any, onDuplicate)}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
          }}
        >
          <Image src={duplicateIcon} alt="duplicateIcon" width={18} height={18} />
        </div>
      </Tooltip>

      {(isSection || pages.length > 1) && (
        <Tooltip label="Delete" position="top" withArrow>
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => onDelete && handleAction(e, onDelete)}
            onKeyUp={(e) => e.key === "Enter" && onDelete && handleAction(e as any, onDelete)}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
            }}
          >
            <Image src={deleteIcon} alt="deleteIcon" width={18} height={18} />
          </div>
        </Tooltip>
      )}

      <span
        style={{
          display: "inline-block",
          marginLeft: "4px",
          opacity: 0.3,
          height: "24px",
          width: "1px",
        }}
      >
        <Image src={dividerIcon} alt="dividerIcon" width={1} height={24} />
      </span>
    </Group>
  );
};

const AccordionButton: React.FC<AccordionButtonProps> = ({
  label,
  isActive,
  onClick,
  onDuplicate,
  onDelete,
  children,
  fontSize,
  fontFamily,
  lineHeight,
  letterSpacing,
  color,
  isSection,
}) => {
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);

  return (
    <Accordion
      value={isActive ? label : null}
      onChange={onClick}
      transitionDuration={300}
      styles={{
        chevron: {
          marginLeft: "8px",
          transition: "transform 300ms ease",
          width: "24px",
          height: "24px",
        },
        control: {
          padding: isSection ? "20px 20px 20px 32px" : "20px 20px 20px 0px",
          minHeight: "56px",
          "&:hover": {
            backgroundColor: "#F8F9FA",
          },
          backgroundColor: isActive ? "#F8F9FA" : "transparent",
          borderRadius: "4px",
        },
      }}
    >
      <Accordion.Item value={label || ""}>
        <Accordion.Control>
          <Flex
            sx={{ width: "100%" }}
            justify="space-between"
            align="center"
            gap="md"
            wrap="nowrap"
          >
            <Text
              sx={{
                flex: 1,
                fontSize,
                fontFamily,
                lineHeight,
                letterSpacing,
                color,
              }}
              truncate
            >
              {label || ""}
            </Text>

            <ActionButtons
              isActive={isActive}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              isSection={isSection}
              incrementActivityChangeId={incrementActivityChangeId}
            />
          </Flex>
        </Accordion.Control>
        {children && <Accordion.Panel>{children}</Accordion.Panel>}
      </Accordion.Item>
    </Accordion>
  );
};

const AccordionPanel: React.FC<AccordionPanelProps> = ({
  children,
  isActive,
  action,
  spacer,
  spacerHandler,
  dndRef,
  providedProps,
  snapshot,
  isLoading,
}) => {
  return (
    <div
      className="fj-accordion-panel"
      style={{
        display: isActive ? "block" : "none",
        transition: "all 0.3s",
      }}
    >
      <div {...providedProps} ref={dndRef} className="fj-accordion-panel-content">
        {children}
      </div>
    </div>
  );
};

export { AccordionButton, AccordionPanel };
