import React from "react";
import Image from "next/image";

export const IconButton = ({
  icon,
  alt,
  onClick,
  disabled,
  style,
}: {
  icon: string;
  alt: string;
  onClick: (e: any) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}) => {
  return (
    <button
      disabled={disabled}
      onClick={(e) => {
        onClick && onClick(e);
        // e.stopPropagation();
      }}
      style={style ? style : {}}
      className={`icon-button ${disabled && "icon-btn-disabled"}`}
    >
      <Image src={icon} width={16} height={16} alt={alt} />
    </button>
  );
};
