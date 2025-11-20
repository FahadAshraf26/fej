import React, { useState, useEffect } from "react";
import { Modal, Button, Text, Group, Grid, Card, Image, ScrollArea } from "@mantine/core";
import { BorderLibraryItem } from "../../../interfaces/BorderLibrary";

interface DishBorderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBorder: (border: BorderLibraryItem | null) => void;
  currentBorderId?: number | null;
  templateId: number;
}

export const DishBorderSelectionModal: React.FC<DishBorderSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectBorder,
  currentBorderId,
  templateId,
}) => {
  const [borders, setBorders] = useState<BorderLibraryItem[]>([]);
  const [selectedBorder, setSelectedBorder] = useState<BorderLibraryItem | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBorders = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dish-border-library?template_id=${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setBorders(data);

        if (currentBorderId) {
          const currentBorder = data.find((b: BorderLibraryItem) => b.id === currentBorderId);
          setSelectedBorder(currentBorder || null);
        }
      } else {
        console.error("Failed to fetch dish borders:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch dish borders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBorders();
    }
  }, [isOpen, templateId, currentBorderId]);

  const handleSelectBorder = (border: BorderLibraryItem | null) => {
    setSelectedBorder(border);
  };

  const handleApply = () => {
    onSelectBorder(selectedBorder);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleModalClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if ("nativeEvent" in e) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  const preventAllEvents = (e: any) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title="Select Dish Border"
      size="lg"
      centered
      closeOnClickOutside={true}
      closeOnEscape={true}
      trapFocus={true}
      withCloseButton={true}
      zIndex={10000}
      styles={{
        body: {
          cursor: "default",
        },
        overlay: {
          cursor: "default",
          zIndex: 9999,
        },
        root: {
          isolation: "isolate",
          zIndex: 10000,
        },
        inner: {
          zIndex: 10000,
        },
      }}
      className="dish-border-modal"
    >
      <div
        style={{
          padding: "10px",
          position: "relative",
          zIndex: 10001,
        }}
        onClick={handleModalClick}
        onMouseDown={handleModalClick}
        onMouseUp={handleModalClick}
        onTouchStart={handleModalClick}
        onTouchEnd={handleModalClick}
        className="dish-content-col dish-border-modal-content"
      >
        {loading ? (
          <Text align="center" color="dimmed">
            Loading dish borders...
          </Text>
        ) : (
          <>
            {borders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <Text color="dimmed" size="lg" mb="md">
                  No dish borders available
                </Text>
                <Text color="dimmed" size="sm">
                  Upload dish borders in the Style tab to use them here.
                </Text>
              </div>
            ) : (
              <>
                <Text size="sm" color="dimmed" mb="md">
                  Choose a border from your dish border library or remove the current border:
                </Text>

                <ScrollArea
                  style={{ height: "400px" }}
                  scrollbarSize={6}
                  onClick={handleModalClick}
                  onMouseDown={handleModalClick}
                  onMouseUp={handleModalClick}
                  onTouchStart={handleModalClick}
                  onTouchEnd={handleModalClick}
                  className="dish-content-col"
                >
                  <Grid
                    onClick={handleModalClick}
                    onMouseDown={handleModalClick}
                    onMouseUp={handleModalClick}
                    onTouchStart={handleModalClick}
                    onTouchEnd={handleModalClick}
                    className="dish-content-col"
                  >
                    <Grid.Col span={6} className="dish-content-col">
                      <Card
                        shadow="sm"
                        p="md"
                        radius="md"
                        withBorder
                        style={{
                          cursor: "pointer",
                          border:
                            selectedBorder === null ? "2px solid #228be6" : "1px solid #dee2e6",
                          backgroundColor: selectedBorder === null ? "#f0f8ff" : "white",
                        }}
                        onClick={preventAllEvents}
                        onMouseDown={preventAllEvents}
                        onMouseUp={(e) => {
                          preventAllEvents(e);
                          handleSelectBorder(null);
                        }}
                        onTouchStart={preventAllEvents}
                        onTouchEnd={preventAllEvents}
                        className="dish-content-col dish-border-card"
                      >
                        <div
                          style={{
                            height: "80px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#f8f9fa",
                            borderRadius: "4px",
                            border: "2px dashed #dee2e6",
                          }}
                        >
                          <Text color="dimmed" size="sm">
                            No Border
                          </Text>
                        </div>
                      </Card>
                    </Grid.Col>

                    {borders.map((border) => (
                      <Grid.Col span={6} key={border.id} className="dish-content-col">
                        <Card
                          shadow="sm"
                          p="md"
                          radius="md"
                          withBorder
                          style={{
                            cursor: "pointer",
                            border:
                              selectedBorder?.id === border.id
                                ? "2px solid #228be6"
                                : "1px solid #dee2e6",
                            backgroundColor: selectedBorder?.id === border.id ? "#f0f8ff" : "white",
                          }}
                          onClick={preventAllEvents}
                          onMouseDown={preventAllEvents}
                          onMouseUp={(e) => {
                            preventAllEvents(e);
                            handleSelectBorder(border);
                          }}
                          onTouchStart={preventAllEvents}
                          onTouchEnd={preventAllEvents}
                          className="dish-content-col dish-border-card"
                        >
                          <Card.Section>
                            <Image
                              src={border.thumbnail_url || border.image_url}
                              height={80}
                              alt={border.name}
                              fit="contain"
                            />
                          </Card.Section>

                          <Text size="sm" weight={500} mt="xs" lineClamp={1} align="center">
                            {border.name}
                          </Text>

                          {border.description && (
                            <Text size="xs" color="dimmed" lineClamp={2} align="center">
                              {border.description}
                            </Text>
                          )}
                        </Card>
                      </Grid.Col>
                    ))}
                  </Grid>
                </ScrollArea>
              </>
            )}
          </>
        )}

        <Group
          position="right"
          mt="lg"
          onClick={handleModalClick}
          onMouseDown={handleModalClick}
          onMouseUp={handleModalClick}
          onTouchStart={handleModalClick}
          onTouchEnd={handleModalClick}
          className="dish-content-col"
        >
          <Button
            variant="subtle"
            onClick={preventAllEvents}
            onMouseDown={preventAllEvents}
            onMouseUp={(e) => {
              preventAllEvents(e);
              handleClose();
            }}
            onTouchStart={preventAllEvents}
            onTouchEnd={preventAllEvents}
            className="dish-content-col"
          >
            Cancel
          </Button>
          {borders.length > 0 && (
            <Button
              onClick={preventAllEvents}
              onMouseDown={preventAllEvents}
              onMouseUp={(e) => {
                preventAllEvents(e);
                handleApply();
              }}
              onTouchStart={preventAllEvents}
              onTouchEnd={preventAllEvents}
              disabled={loading}
              className="dish-content-col"
            >
              Apply Border
            </Button>
          )}
        </Group>
      </div>
    </Modal>
  );
};
