import React from "react";
import Image from "next/image";
import { Loader } from "@mantine/core";
import GridActive from "@Public/icons/GridActive.svg";
import Grid from "@Public/icons/Grid.svg";
import ListActive from "@Public/icons/ListActive.svg";
import List from "@Public/icons/List.svg";

export default function FJButton({
  title,
  icon,
  onClick,
  isLoading,
}: {
  title: string;
  icon?: string;
  onClick?: () => void;
  isLoading?: boolean;
}) {
  return (
    <button
      onClick={(e) => {
        onClick && onClick();
        e.stopPropagation();
      }}
      className="fj-button-action"
    >
      {icon && <Image src={icon} alt="icon" width={"20px"} height={"20px"} />}
      <span className="fj-button-action-title">{title}</span>
      {isLoading && (
        <Loader
          color="white"
          size={20}
          style={{
            position: "absolute",
            top: 10,
            right: 20,
          }}
        />
      )}
    </button>
  );
}

export const LayoutButton = ({
  activeLayout = "grid",
  setActiveLayout,
}: {
  activeLayout: string | "grid" | "list";
  setActiveLayout: (layout: string) => void;
}) => {
  return (
    <div className="fj-layout-button-container">
      <button
        style={{
          borderRadius: "6px 0px 0px 6px",
          borderRight: "none",
          background: activeLayout === "grid" ? "#14324D" : "#FFFFFF",
        }}
        onClick={() => setActiveLayout("grid")}
        className="fj-layout-button-tab"
        title="Grid"
      >
        <Image
          height={20}
          width={20}
          src={activeLayout === "grid" ? GridActive : Grid}
          alt="icon"
        />
      </button>
      <button
        style={{
          borderRadius: "0px 6px 6px 0px",
          borderLeft: "none",
          background: activeLayout === "list" ? "#14324D" : "#FFFFFF",
        }}
        onClick={() => setActiveLayout("list")}
        className="fj-layout-button-tab"
        title="List"
      >
        <Image
          height={25}
          width={25}
          src={activeLayout === "list" ? ListActive : List}
          alt="icon"
        />
      </button>
    </div>
  );
};
