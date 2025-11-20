import React, { useState, useRef, useEffect } from "react";
import {
  Button,
  Text,
  Group,
  Grid,
  Modal,
  TextInput,
  Textarea,
  Card,
  Image,
  ActionIcon,
} from "@mantine/core";
import NextImage from "next/image";
import PlusIcon from "@Public/icons/Plus.svg";
import { uploadFile } from "@Helpers/UploadFile";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { toast } from "react-toastify";
import { BorderLibraryItem, BorderUploadData } from "../../../interfaces/BorderLibrary";

interface BorderLibraryManagerProps {
  templateId: number;
}

export const BorderLibraryManager: React.FC<BorderLibraryManagerProps> = ({ templateId }) => {
  const [borders, setBorders] = useState<BorderLibraryItem[]>([]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState<Partial<BorderUploadData>>({
    template_id: templateId,
    name: "",
    description: "",
    file: undefined,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);

  const fetchBorders = async () => {
    try {
      const response = await fetch(`/api/border-library?template_id=${templateId}`);
      if (response.ok) {
        const data = await response.json();
        setBorders(data);
      } else {
        console.error("Failed to fetch borders:", response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch borders:", error);
    }
  };

  useEffect(() => {
    fetchBorders();
  }, [templateId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      const fileName = file.name.replace(/\.[^/.]+$/, "");
      setUploadData((prev) => ({ ...prev, file, name: fileName, description: "" }));
    }
  };

  const handleUpload = async () => {
    if (!uploadData.file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);
    try {
      const sanitizedFileName = uploadData.file.name
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .toLowerCase();

      const filePath = `border-library/${templateId}/${Date.now()}-${sanitizedFileName}`;

      const uploadResult = await uploadFile("inline-images", filePath, uploadData.file);
      if (uploadResult?.success) {
        const imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inline-images/${filePath}`;

        const borderData = {
          template_id: templateId,
          name: uploadData.name,
          description: uploadData.description,
          image_url: imageUrl,
          file_path: filePath,
          file_size: uploadData.file.size,
          mime_type: uploadData.file.type,
        };

        const saveResponse = await fetch("/api/border-library", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(borderData),
        });

        if (saveResponse.ok) {
          toast.success("Border uploaded successfully!");
          incrementActivityChangeId();
          setIsUploadModalOpen(false);
          setUploadData({ template_id: templateId, name: "", description: "", file: undefined });
          fetchBorders();
        } else {
          throw new Error("Failed to save border to database");
        }
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload border. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBorder = async (borderId: number) => {
    if (!confirm("Are you sure you want to delete this border?")) return;

    try {
      const response = await fetch(`/api/border-library?id=${borderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Border deleted successfully!");
        fetchBorders();
      } else {
        throw new Error("Failed to delete border");
      }
    } catch (error) {
      toast.error("Failed to delete border");
    }
  };

  return (
    <div style={{ padding: "10px" }}>
      <Text
        style={{
          fontFamily: "Satoshi-medium-500",
          fontSize: "14px",
          color: "#3B3B3B",
          marginBottom: "16px",
        }}
      >
        Borders
      </Text>

      <Grid>
        {borders.map((border) => (
          <Grid.Col span={6} key={border.id}>
            <Card shadow="sm" p="xs" radius="md" withBorder>
              <Card.Section>
                <Image
                  src={border.thumbnail_url || border.image_url}
                  height={80}
                  alt={border.name}
                  fit="contain"
                />
              </Card.Section>

              <Group position="apart" mt="xs">
                <Text size="xs" color="dimmed">
                  {new Date(border.created_at).toLocaleDateString()}
                </Text>
                <Button
                  color="red"
                  variant="light"
                  size="xs"
                  compact
                  onClick={() => handleDeleteBorder(border.id)}
                >
                  Delete
                </Button>
              </Group>
            </Card>
          </Grid.Col>
        ))}
      </Grid>

      {borders.length === 0 && (
        <Text color="dimmed" align="center" mt="xl">
          No borders uploaded yet. Upload your first border to get started!
        </Text>
      )}

      <Button
        leftIcon={<NextImage src={PlusIcon} alt="PlusIcon" />}
        variant="default"
        radius={8}
        fullWidth
        style={{
          borderColor: "#B9B9B9",
          height: "44px",
          marginTop: "16px",
        }}
        styles={{
          inner: {
            fontFamily: "Satoshi-regular-400",
            fontSize: "14px",
            color: "#3B3B3B",
            lineHeight: "18px",
          },
        }}
        onClick={() => setIsUploadModalOpen(true)}
      >
        Upload Border
      </Button>

      <Modal
        opened={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadData({ template_id: templateId, name: "", description: "", file: undefined });
        }}
        title="Upload New Border"
        size="md"
      >
        <div style={{ padding: "10px" }}>
          <Button variant="outline" fullWidth mb="md" onClick={() => fileInputRef.current?.click()}>
            {uploadData.file ? `Selected: ${uploadData.file.name}` : "Choose Image File"}
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileSelect}
          />

          {uploadData.file && (
            <div style={{ marginBottom: "16px", textAlign: "center" }}>
              <Image
                src={URL.createObjectURL(uploadData.file)}
                height={100}
                alt="Preview"
                fit="contain"
                style={{ border: "1px solid #eee", borderRadius: "8px" }}
              />
            </div>
          )}

          <Group position="right">
            <Button
              variant="subtle"
              onClick={() => {
                setIsUploadModalOpen(false);
                setUploadData({
                  template_id: templateId,
                  name: "",
                  description: "",
                  file: undefined,
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} loading={uploading} disabled={!uploadData.file}>
              Upload Border
            </Button>
          </Group>
        </div>
      </Modal>
    </div>
  );
};
