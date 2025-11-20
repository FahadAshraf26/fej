// @ts-nocheck
import React, { FC, memo } from "react";
import { Dish } from "@Interfaces/*";
import { Draggable } from "react-beautiful-dnd";
import { DishItem } from "@Components/Editor/EditorComponents/Dish";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";

import { SectionDivider } from "@Components/Editor/EditorComponents/SectionDivider";

export const RenderDishes: FC<{ dishes: Dish[] }> = memo(({ dishes }) => {
  const selectedDish = useDishesStore((state) => state.selectedDish);
  return (
    <>
      {dishes.map((dish, index) => {
        const isSelected = selectedDish === dish.id;

        if (dish.type === "inlineSectionDivider") {
          return <SectionDivider dish={dish} key={dish.id} />;
        }

        if (dish.type !== "sectionTitle") {
          // @ts-ignore
          return (
            <Draggable key={dish.id} draggableId={dish.id!.toString()} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  style={{
                    ...provided.draggableProps.style,
                    ...(snapshot.isDragging && {
                      minHeight: isSelected
                        ? dish.isSpacer
                          ? "92px"
                          : "220px"
                        : dish.isSpacer
                        ? "75px"
                        : "116px",
                      height: "auto",
                    }),
                  }}
                >
                  <DishItem dish={dish} provided={provided} snapshot={snapshot} key={dish.id} />
                </div>
              )}
            </Draggable>
          );
        }
      })}
    </>
  );
});

RenderDishes.displayName = "RenderDishes";
