import React, { PureComponent } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import "react-resizable/css/styles.css";
import { SectionItem } from "@Components/Editor/EditorComponents/Section";
import { useSectionsStore } from "@Stores/MenuStore/Sections.store";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

const ReactGridLayout = WidthProvider(RGL);

let clientX = 0;
let clientY = 0;
export default class GridLayout extends PureComponent {
  static defaultProps = {
    className: "layout",
  };

  constructor(props) {
    super(props);

    this.state = {
      dndLayout: this.props.dndLayout,
      clickTimeout: null,
      clickedSectionId: null,
      lastClickTime: null,
      lastClickedId: null,
      dragStartX: null,
      dragStartY: null,
    };
  }

  onDragStartHandler = (layout, oldLayout, newLayout, placeholder, e) => {
    const section = useSectionsStore
      .getState()
      .oSections[this.props.pageId].find(
        (item) => item.sectionId === oldLayout.i
      );

    if (section) {
      // Set the selected section in the store
      useSectionsStore.getState().setSelectedSection({
        pageId: this.props.pageId,
        sectionId: section.sectionId,
      });
    }
    this.setState({
      dragStartX: e.clientX,
      dragStartY: e.clientY,
    });
  };

  onLayoutChangeHandler = (layout, oldLayout, newLayout, placeholder, e) => {
    // Check if there was actual drag movement
    const dragDistance = Math.sqrt(
      Math.pow(e.clientX - this.state.dragStartX, 2) +
        Math.pow(e.clientY - this.state.dragStartY, 2)
    );

    // If minimal movement (less than 5px), treat as a click
    if (dragDistance < 5) {
      const currentTime = new Date().getTime();
      const section = useSectionsStore
        .getState()
        .oSections[this.props.pageId].find(
          (item) => item.sectionId === oldLayout.i
        );

      // Select section on single click
      useSectionsStore.getState().setSelectedSection({
        pageId: this.props.pageId,
        sectionId: section.sectionId,
      });

      // Check for double click to open content editor
      if (
        this.state.lastClickTime &&
        currentTime - this.state.lastClickTime < 300 &&
        this.state.lastClickedId === section.sectionId
      ) {
        // On double click, open the content editor
        useInitializeEditor.getState().setIsContentOpen();

        this.setState({
          lastClickTime: null,
          lastClickedId: null,
        });
      } else {
        // Store click info for potential double click detection
        this.setState({
          lastClickTime: currentTime,
          lastClickedId: section.sectionId,
        });
      }
      return;
    }

    useInitializeEditor.getState().incrementActivityChangeId();
    const sections = this.props.sections.map((section) => {
      const newLayout = layout.find((item) => item.i === section.sectionId);
      const updatedSection = {
        ...section,
        order_position: newLayout?.y / 5,
        position_start: newLayout?.x,
        position_end: newLayout?.x + (newLayout?.w - 1),
        dndLayout: newLayout,
        topMargin: newLayout?.y > 0 ? 0 : section.topMargin,
      };
      return updatedSection;
    });
    useSectionsStore.getState().onLayoutChange(sections, this.props.pageId);
  };

  onResize = (layout, oldItem, newItem, placeholder, e, element) => {
    useInitializeEditor.getState().incrementActivityChangeId();
    const updatedSections = this.props.sections.map((section) => {
      if (section.sectionId === oldItem.i) {
        const updatedSection = {
          ...section,
          position_start: newItem?.x,
          position_end: newItem?.x + (newItem?.w - 1),
          dndLayout: newItem,
        };

        // Determine whether to increment or decrement based on the new width
        const type = newItem.w > oldItem.w ? "increment" : "decrement";
        this.props.allHandlerstype + "SectionColumn";

        return updatedSection;
      }
      return section;
    });

    useSectionsStore
      .getState()
      .onLayoutChange(updatedSections, this.props.pageId);
  };

  onDrop = (elemParams) => {
    alert(`Element parameters: ${JSON.stringify(elemParams)}`);
  };
  componentWillUnmount() {
    this.setState({ dndLayout: null });
  }

  render() {
    return (
      <ReactGridLayout
        rowHeight={20}
        margin={[10, 10]}
        layout={this.state.dndLayout}
        preventCollision={false}
        compactType={"vertical"}
        cols={this.props.columns}
        gridWidth={300}
        onDragStart={this.onDragStartHandler}
        onDragStop={this.onLayoutChangeHandler}
        onResizeStop={this.onResize}
        resizeHandles={["e", "w"]}
        isDraggable={true}
        isResizable={true}
        className="custom-grid-layout"
      >
        {this.props.sections?.map((section) => {
          return (
            <div
              key={section?.dndLayout?.i}
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              data-grid={section.dndLayout}
              className="grid-item-wrapper"
            >
              <SectionItem
                section={section}
                pageId={this.props.pageId}
                columns={section.columns}
                key={section.sectionId}
              />
              <>
                <div
                  className={`resize-handle resize-handle-e`}
                  ref={(ref) => ref && ref.setAttribute("data-resize", "e")}
                >
                  <span className="resize-icon"></span>
                </div>
                <div
                  className={`resize-handle resize-handle-w`}
                  ref={(ref) => ref && ref.setAttribute("data-resize", "w")}
                >
                  <span className="resize-icon"></span>
                </div>
              </>
            </div>
          );
        })}
      </ReactGridLayout>
    );
  }
}
