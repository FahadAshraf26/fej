import { forwardRef } from "react";
import {
  MultiSelect,
  MultiSelectProps,
  Box,
  CloseButton,
  SelectItemProps,
  MultiSelectValueProps,
} from "@mantine/core";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { useDishesStore } from "@Stores/MenuStore/Dishes.store";
interface DietaryIconInputProps extends Partial<MultiSelectProps> {
  sectionId: string;
  dishId: number;
  dietaryIcons: string[];
}

const onInputMouseUp = (e: React.MouseEvent) => {
  e.stopPropagation();
};

function Value({
  value,
  label,
  onRemove,
  classNames,
  ...others
}: MultiSelectValueProps & { value: string }) {
  return (
    <div {...others} onMouseUp={onInputMouseUp}>
      <Box
        sx={(theme) => ({
          display: "flex",
          cursor: "default",
          alignItems: "center",
          backgroundColor:
            theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
          border: `1px solid ${
            theme.colorScheme === "dark"
              ? theme.colors.dark[7]
              : theme.colors.gray[4]
          }`,
          paddingLeft: 10,
          borderRadius: 4,
        })}
      >
        <Box sx={{ lineHeight: 1, fontSize: 12 }}>{label}</Box>
        <CloseButton
          onMouseDown={onRemove}
          variant="transparent"
          size={22}
          iconSize={14}
          tabIndex={-1}
        />
      </Box>
    </div>
  );
}

const DropDownComponent = () => {
  return <></>;
};

const Item = forwardRef<HTMLDivElement, SelectItemProps>(
  ({ label, value, ...others }, ref) => {
    return (
      <div ref={ref} {...others} onMouseUp={onInputMouseUp}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box mr={10}></Box>
          <div>{label}</div>
        </Box>
      </div>
    );
  }
);

Item.displayName = "Item";

export const DietaryIconInput = (props: DietaryIconInputProps) => {
  const defaultDietaryIcons = useInitializeEditor.getState().dietaryIcons;
  const setDietaryIcons = useInitializeEditor.getState().setDietaryIcons;
  const updateDishContent = useDishesStore((state) => state.updateDishContent);

  return (
    <MultiSelect
      {...props}
      classNames={{
        root: "dietary-icon-input",
      }}
      creatable
      getCreateLabel={(query) => `+ Create ${query}`}
      onCreate={(query) => {
        if (query.trim().length !== 0) {
          const item = { value: query, label: query };
          setDietaryIcons([...defaultDietaryIcons, item]);
          return item;
        }
      }}
      onChange={(value) => {
        updateDishContent(props.sectionId, props.dishId, "dietaryIcons", value);
      }}
      onMouseDown={onInputMouseUp}
      onMouseUp={onInputMouseUp}
      onClick={onInputMouseUp}
      onDropdownOpen={() => {}}
      data={defaultDietaryIcons}
      limit={20}
      value={props.dietaryIcons ?? []}
      valueComponent={Value}
      itemComponent={Item}
      rightSection={<DropDownComponent />}
      rightSectionWidth={0}
      searchable
      placeholder="Dietary Icon"
      mt="xs"
      radius="md"
    />
  );
};
