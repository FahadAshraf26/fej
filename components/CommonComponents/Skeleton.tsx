import { Skeleton } from "@mantine/core";

import { SimpleGrid } from "@mantine/core";

const SkeletonLoader = ({
  showRowSkeletons,
}: {
  showRowSkeletons: boolean;
}) => {
  return (
    <>
      {showRowSkeletons ? (
        <>
          {Array(10)
            .fill(0)
            .map((_, i) => (
              <Skeleton
                key={i}
                visible={true}
                height={70}
                mb={10}
                width="100%"
              />
            ))}
        </>
      ) : (
        // Default grid skeleton layout for templates view
        <SimpleGrid
          cols={3}
          breakpoints={[
            { maxWidth: 1120, cols: 3, spacing: "md" },
            { maxWidth: 991, cols: 2, spacing: "sm" },
            { maxWidth: 600, cols: 1, spacing: "sm" },
          ]}
        >
          {Array(10)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} visible={true} height={333} />
            ))}
        </SimpleGrid>
      )}
    </>
  );
};

export default SkeletonLoader;
