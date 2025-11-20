import React, { useState, useEffect } from "react";
import { Modal, Button, Text, Group, Grid, Card, Image, ScrollArea } from "@mantine/core";
import { BorderLibraryItem, BorderSelectionModalProps } from "../../../interfaces/BorderLibrary";

export const BorderSelectionModal: React.FC<BorderSelectionModalProps> = ({
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
      const response = await fetch(`/api/border-library?template_id=${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setBorders(data);

        if (currentBorderId) {
          const currentBorder = data.find((b: BorderLibraryItem) => b.id === currentBorderId);
          setSelectedBorder(currentBorder || null);
        }
      } else {
        console.error("Failed to fetch borders:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch borders:", error);
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

  return (
    <Modal opened={isOpen} onClose={onClose} title="Select Section Border" size="lg" centered>
      <div style={{ padding: "10px" }}>
        {loading ? (
          <Text align="center" color="dimmed">
            Loading borders...
          </Text>
        ) : (
          <>
            {borders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <Text color="dimmed" size="lg" mb="md">
                  No borders available
                </Text>
                <Text color="dimmed" size="sm">
                  Upload borders in the Style tab to use them here.
                </Text>
              </div>
            ) : (
              <>
                <Text size="sm" color="dimmed" mb="md">
                  Choose a border from your library or remove the current border:
                </Text>

                <ScrollArea style={{ height: "400px" }} scrollbarSize={6}>
                  <Grid>
                    <Grid.Col span={6}>
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
                        onClick={() => handleSelectBorder(null)}
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
                      <Grid.Col span={6} key={border.id}>
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
                          onClick={() => handleSelectBorder(border)}
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

        <Group position="right" mt="lg">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          {borders.length > 0 && (
            <Button onClick={handleApply} disabled={loading}>
              Apply Border
            </Button>
          )}
        </Group>
      </div>
    </Modal>
  );
};
