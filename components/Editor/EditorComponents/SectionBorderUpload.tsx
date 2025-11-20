import React, { useState, useRef } from "react";
import { uploadFile } from "@Helpers/UploadFile";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { Button, Text } from "@mantine/core";
import { toast } from "react-toastify";

interface SectionBorderUploadProps {
  sectionId: string;
  pageId: number;
}

export const SectionBorderUpload: React.FC<SectionBorderUploadProps> = ({ sectionId, pageId }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSectionContent = useSectionsStore((state) => state.updateSectionContent);
  const sections = useSectionsStore((state) => state.oSections);
  const incrementActivityChangeId = useInitializeEditor((state) => state.incrementActivityChangeId);

  const currentSection = sections[pageId]?.find((s) => s.sectionId === sectionId);
  const hasBorderImage = currentSection?.borderImageUrl;

  const handleBorderImageUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const sanitizedFileName = file.name
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .toLowerCase();

      const filePath = `${Date.now()}-section-border-${sanitizedFileName}`;

      const uploadResult = await uploadFile("inline-images", filePath, file);
      if (uploadResult?.success) {
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/inline-images/${filePath}`;
        updateSectionContent(pageId, sectionId, "borderImageUrl", publicUrl);

        toast.success("Border image uploaded successfully!");
        incrementActivityChangeId();
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload border image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleBorderImageRemove = () => {
    updateSectionContent(pageId, sectionId, "borderImageUrl", null);
    updateSectionContent(pageId, sectionId, "sectionMarginLeft", null);
    updateSectionContent(pageId, sectionId, "sectionMarginRight", null);
    updateSectionContent(pageId, sectionId, "sectionMarginTop", null);
    updateSectionContent(pageId, sectionId, "sectionMarginBottom", null);
    incrementActivityChangeId();
    toast.success("Border image removed!");
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleBorderImageUpload(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div style={{ marginTop: "10px" }}>
      {hasBorderImage ? (
        <div>
          <Text
            size="sm"
            mb="xs"
            style={{
              color: "#22C55E",
              fontFamily: "Satoshi-regular-400",
              fontSize: "12px",
            }}
          >
            ✓ Border image uploaded
          </Text>

          <div style={{ marginBottom: "10px" }}>
            <img
              src={currentSection?.borderImageUrl || ""}
              alt="Section Border Preview"
              style={{
                width: "100%",
                maxHeight: "100px",
                objectFit: "contain",
                borderRadius: "8px",
                border: "2px solid #E5E7EB",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                background: "#C4461F",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Button
                size="xl"
                compact
                onClick={triggerFileInput}
                disabled={uploading}
                style={{
                  background: "transparent",
                  color: "#fff",
                  width: "100%",
                  borderRadius: 8,
                  boxShadow: "none",
                  border: "none",
                }}
                radius={0}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontFamily: "Satoshi-regular-400",
                    fontSize: "14px",
                    lineHeight: "18px",
                  }}
                >
                  {uploading ? "Uploading..." : "Change Border Image"}
                </Text>
              </Button>
            </div>

            <div
              style={{
                display: "flex",
                width: "100%",
                background: "#EF4444",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Button
                size="xl"
                compact
                onClick={handleBorderImageRemove}
                disabled={uploading}
                style={{
                  background: "transparent",
                  color: "#fff",
                  width: "100%",
                  borderRadius: 8,
                  boxShadow: "none",
                  border: "none",
                }}
                radius={0}
              >
                <Text
                  style={{
                    color: "#ffffff",
                    fontFamily: "Satoshi-regular-400",
                    fontSize: "14px",
                    lineHeight: "18px",
                  }}
                >
                  Remove Border
                </Text>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: "flex",
              width: "100%",
              background: "#C4461F",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <Button
              size="xl"
              compact
              onClick={triggerFileInput}
              disabled={uploading}
              style={{
                background: "transparent",
                color: "#fff",
                width: "100%",
                borderRadius: 8,
                boxShadow: "none",
                border: "none",
              }}
              radius={0}
            >
              <Text
                style={{
                  color: "#ffffff",
                  fontFamily: "Satoshi-regular-400",
                  fontSize: "14px",
                  lineHeight: "18px",
                }}
              >
                {uploading ? "Uploading..." : "Upload Section Border"}
              </Text>
            </Button>
          </div>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        ref={fileInputRef}
        style={{ display: "none" }}
        disabled={uploading}
      />
    </div>
  );
};
