import React, { useRef, useState, useEffect } from "react";
import { Text, Tooltip, MantineNumberSize } from "@mantine/core";

interface ClampedTextWithTooltipProps {
  children: React.ReactNode;
  lines?: number;
  size?: MantineNumberSize;
  color?: string;
}

export const ClampedTextWithTooltip: React.FC<ClampedTextWithTooltipProps> = ({
  children,
  lines = 2,
  size = "xs",
  color = "dimmed",
  ...props
}) => {
  const textRef = useRef<HTMLDivElement>(null);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setClamped(el.scrollHeight > el.clientHeight + 1);
    }
  }, [children]);

  return (
    <Tooltip
      label={<span style={{ whiteSpace: "pre-line", wordBreak: "break-word" }}>{children}</span>}
      disabled={!clamped}
      withArrow
      withinPortal
      sx={{ maxWidth: 320, textAlign: "left" }}
    >
      <Text
        component="div"
        ref={textRef}
        size={size}
        color={color}
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: lines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minHeight: lines * 16, // Approximation based on line height
          maxHeight: lines * 16,
        }}
        {...props}
      >
        {children}
      </Text>
    </Tooltip>
  );
};
