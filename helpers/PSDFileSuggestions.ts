/**
 * Suggests alternatives for files that are too large
 */
export const getLargeFileSuggestions = (fileSize: number): string[] => {
  const suggestions: string[] = [];

  if (fileSize > 50 * 1024 * 1024) {
    // > 50MB
    suggestions.push("File will be automatically split into smaller chunks for upload");
    suggestions.push("Consider compressing the PSD file in Photoshop first");
    suggestions.push("Remove unnecessary layers or merge similar layers");
    suggestions.push("Reduce image resolution if possible");
  }

  if (fileSize > 200 * 1024 * 1024) {
    // > 200MB
    suggestions.push("Very large files may take longer to process");
    suggestions.push("Consider splitting the design into multiple smaller PSD files");
  }

  if (fileSize > 500 * 1024 * 1024) {
    // > 500MB
    suggestions.push("This file is extremely large and may cause performance issues");
    suggestions.push("Consider using a desktop application for such large files");
  }

  return suggestions;
};
