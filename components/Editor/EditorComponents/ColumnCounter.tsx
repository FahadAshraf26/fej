import React, { useState } from "react";
import { SegmentedControl } from "@mantine/core";
import { usePageStore } from "@Stores/MenuStore/Pages.store";

export const ColumnCounter = ({ count }: { count: number }) => {
  const [selectedColumn, setSelectedColumn] = useState<string>(
    count.toString() ?? "1"
  );
  const updatePageColumnCount = usePageStore(
    (state) => state.updatePageColumnCount
  );
  const handleColumn = (col: string) => {
    setSelectedColumn(col);
    updatePageColumnCount(Number(col));
  };
  return (
    <>
      <SegmentedControl
        value={selectedColumn}
        fullWidth
        onChange={(value) => handleColumn(value)}
        data={[
          { label: "1", value: "1" },
          { label: "2", value: "2" },
          { label: "3", value: "3" },
          { label: "4", value: "4" },
          { label: "5", value: "5" },
          { label: "6", value: "6" },
          { label: "7", value: "7" },
          { label: "8", value: "8" },
        ]}
      />
    </>
  );
};
