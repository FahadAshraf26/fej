// Updated useTitleUIElementEffect function to handle UI updates through subscriptions

import { ReactNode, useEffect } from "react";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";
import { usePageStore } from "@Stores/MenuStore/Pages.store";
import useUploadStore from "@Stores/upload/upload.store";
import { ITemplateDetails } from "interfaces/ITemplate";

export const useTitleUIElementEffect = (
  input: any,
  template: ITemplateDetails | null
): void => {
  useEffect(() => {
    // Create pill container with progress indicator
    const createSpinnerWithPillProgress = (
      progress = 0,
      isFirstRender = false
    ) => {
      // Create pill container
      const pillContainer = document.createElement("div");
      pillContainer.style.display = "inline-flex";
      pillContainer.style.alignItems = "center";
      pillContainer.style.padding = "6px 12px";
      pillContainer.style.borderRadius = "16px";
      pillContainer.style.backgroundColor = "#f5f5f7";
      pillContainer.style.position = "relative";
      pillContainer.style.overflow = "hidden";
      pillContainer.setAttribute("data-pill-container", "true");

      // Create progress background
      const progressBg = document.createElement("div");
      progressBg.style.position = "absolute";
      progressBg.style.left = "0";
      progressBg.style.top = "0";
      progressBg.style.height = "100%";
      progressBg.style.width = `${progress}%`;
      progressBg.style.backgroundColor = "rgba(255, 165, 0, 0.1)";
      progressBg.style.transition = "width 0.3s ease";
      progressBg.setAttribute("data-progress-bg", "");
      pillContainer.appendChild(progressBg);

      // Only create the SVG spinner on first render
      // For updates, we'll just modify the progress
      if (isFirstRender) {
        // Create SVG spinner
        const svgSpinner = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        svgSpinner.setAttribute("width", "16");
        svgSpinner.setAttribute("height", "16");
        svgSpinner.setAttribute("viewBox", "0 0 24 24");
        svgSpinner.setAttribute("stroke-width", "1.5");
        svgSpinner.setAttribute("stroke", "orange");
        svgSpinner.setAttribute("fill", "none");
        svgSpinner.setAttribute("stroke-linecap", "round");
        svgSpinner.setAttribute("stroke-linejoin", "round");
        svgSpinner.style.marginRight = "8px";
        svgSpinner.style.zIndex = "2";
        svgSpinner.style.animation = "spin 1s linear infinite";
        svgSpinner.style.transformOrigin = "center";
        svgSpinner.setAttribute("data-upload-spinner", "");

        const pathElement = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        pathElement.setAttribute("stroke", "none");
        pathElement.setAttribute("d", "M0 0h24v24H0z");
        pathElement.setAttribute("fill", "none");
        svgSpinner.appendChild(pathElement);

        const rotatePath1 = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        rotatePath1.setAttribute("d", "M9 4.55a8 8 0 0 1 6 14.9m0 -4.45v5h5");
        svgSpinner.appendChild(rotatePath1);
        const rotatePath2 = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        rotatePath2.setAttribute("d", "M5.63 7.16l0 .01");
        svgSpinner.appendChild(rotatePath2);

        const rotatePath3 = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        rotatePath3.setAttribute("d", "M4.06 11l0 .01");
        svgSpinner.appendChild(rotatePath3);

        const rotatePath4 = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        rotatePath4.setAttribute("d", "M4.63 15.1l0 .01");
        svgSpinner.appendChild(rotatePath4);

        const rotatePath5 = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        rotatePath5.setAttribute("d", "M7.16 18.37l0 .01");
        svgSpinner.appendChild(rotatePath5);

        const rotatePath6 = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path"
        );
        rotatePath6.setAttribute("d", "M11 19.94l0 .01");
        svgSpinner.appendChild(rotatePath6);

        // Add text
        const textSpan = document.createElement("span");
        textSpan.innerText = "Uploading...";
        textSpan.style.fontSize = "13px";
        textSpan.style.color = "#333";
        textSpan.style.zIndex = "2";
        textSpan.style.marginRight = "4px";
        textSpan.setAttribute("data-text-content", "");

        // Add percentage
        const percentageSpan = document.createElement("span");
        percentageSpan.innerText = `${progress}%`;
        percentageSpan.style.fontSize = "12px";
        percentageSpan.style.fontWeight = "500";
        percentageSpan.style.color = progress >= 100 ? "#4caf50" : "orange";
        percentageSpan.style.zIndex = "2";
        percentageSpan.setAttribute("data-percentage", "");

        // Add elements to the container
        pillContainer.appendChild(svgSpinner);
        pillContainer.appendChild(textSpan);
        pillContainer.appendChild(percentageSpan);

        // Add keyframes for spinning animation
        const keyframesStyle = document.createElement("style");
        keyframesStyle.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        pillContainer.appendChild(keyframesStyle);
      }

      return pillContainer;
    };

    // Update the progress without recreating the entire UI
    const updatePillProgress = (
      container: HTMLElement,
      progress: number
    ): void => {
      if (!container) return;

      const progressBg = container.querySelector(
        "[data-progress-bg]"
      ) as HTMLElement | null;
      const percentageSpan = container.querySelector(
        "[data-percentage]"
      ) as HTMLElement | null;

      if (progressBg) {
        progressBg.style.width = `${progress}%`;
      }

      if (percentageSpan) {
        percentageSpan.innerText = `${progress}%`;

        if (progress >= 100) {
          percentageSpan.style.color = "#4caf50";
        } else {
          percentageSpan.style.color = "orange";
        }
      }
    };

    // Show success message without spinner
    const showSuccessStatus = (titleStatus: Element) => {
      if (!titleStatus) return;

      titleStatus.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="16" height="16" stroke="#32CD32" fill="#32CD32" stroke-width="0" viewBox="0 0 16 16">
          <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0"></path>
          <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z"></path>
        </svg>
        <span style="margin-left: 5px;">Upload Complete</span>
      `;
    };

    // Show error message
    const showErrorStatus = (titleStatus: Element) => {
      if (!titleStatus) return;

      titleStatus.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="red" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
        <span style="margin-left: 5px; color: red;">Upload failed</span>
      `;
    };

    // Create a flashing dot indicator
    const createFlashingDot = (color: string) => {
      const dot = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      dot.setAttribute("width", "16");
      dot.setAttribute("height", "16");
      dot.setAttribute("viewBox", "0 0 16 16");

      const circle = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle"
      );
      circle.setAttribute("cx", "9");
      circle.setAttribute("cy", "8");
      circle.setAttribute("r", "4");
      circle.setAttribute("fill", color);

      dot.appendChild(circle);
      dot.style.animation = "flashing 1s infinite alternate";

      if (useInitializeEditor.getState().canvasLoader === true) {
        const keyframes = `
          @keyframes flashing {
            0% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `;

        const styleElement = document.createElement("style");
        styleElement.type = "text/css";
        styleElement.innerHTML = keyframes;
        dot.appendChild(styleElement);
      }

      return dot;
    };

    // Handle left panel width updates
    const updateLeftPanelWidth = (
      leftPanel: HTMLElement | null,
      isExpanded: boolean
    ) => {
      if (!leftPanel) return;
      const viewportWidth = window.innerWidth;

      if (isExpanded) {
        if (viewportWidth < 1100) {
          leftPanel.style.width = 0.113 * viewportWidth + 187 * 3.5 + "px";
        } else if (viewportWidth >= 1100 && viewportWidth < 2000) {
          leftPanel.style.width = 0.113 * viewportWidth + 187 * 2.3 + "px";
        } else {
          leftPanel.style.width = 0.113 * viewportWidth + 187 * 2 + "px";
        }
      } else {
        leftPanel.style.width = "0vw";
      }
    };

    // Main function to inject UI elements
    const injectMenuAndTitleStatus = () => {
      const elementWithShadowRoot = document.querySelector(
        "#cesdkContainer #root-shadow "
      );
      const shadowRoot = elementWithShadowRoot?.shadowRoot;

      if (!shadowRoot) {
        console.log("ShadowRoot not found. Unable to inject elements.");
        return;
      }

      const addTitleElement = shadowRoot?.querySelector(
        `.UBQ_Editor-module__navigation--x2yHa div div h2`
      );

      const leftPanel = shadowRoot.querySelector(
        "#ubq-portal-container_panelLeft"
      ) as HTMLElement | null;

      if (!leftPanel) {
        return;
      }

      const { isContentOpen, isLayoutOpen, isStyleOpen } =
        useInitializeEditor.getState();

      const isPanelExpanded = isContentOpen || isLayoutOpen || isStyleOpen;

      const timeoutId = setTimeout(() => {
        updateLeftPanelWidth(leftPanel, isPanelExpanded);
      }, 300);

      if (addTitleElement && !shadowRoot?.querySelector(".title-status")) {
        const menuRenderStatus = document.createElement("div");
        menuRenderStatus.classList.add(".title-status");
        menuRenderStatus.style.display = "flex";
        menuRenderStatus.style.alignItems = "center";
        menuRenderStatus.style.fontFamily = "Satoshi-regular-400";
        menuRenderStatus.style.fontSize = "12px";
        menuRenderStatus.style.color = "#3B3B3B";

        const renderStatusText = document.createElement("span");
        renderStatusText.style.marginLeft = "5px";

        const titleStatus = document.createElement("div");
        titleStatus.classList.add("title-status");
        titleStatus.style.display = "flex";
        titleStatus.style.alignItems = "center";
        titleStatus.style.fontFamily = "Satoshi-regular-400";
        titleStatus.style.fontSize = "12px";
        titleStatus.style.color = "#3B3B3B";
        titleStatus.setAttribute("data-title-status", ""); // Add data attribute for easy selection

        addTitleElement?.parentNode?.insertBefore(
          menuRenderStatus,
          addTitleElement.nextSibling
        );

        menuRenderStatus?.parentNode?.insertBefore(
          titleStatus,
          menuRenderStatus.nextSibling
        );

        // Update title status based on editor state
        const updateTitleStatus = (
          isSaving: boolean,
          canvasLoader: boolean
        ) => {
          // Get active uploads from the store
          const uploads = useUploadStore.getState().uploads;
          const activeUploads = Object.values(uploads).filter(
            (upload) => upload.status === "uploading"
          );

          // If there's an active upload, show progress
          if (activeUploads.length > 0) {
            // Use the most recent upload's progress
            const latestUpload = activeUploads[activeUploads.length - 1];
            const progress = latestUpload.progress;

            // Check if we already have a pill container
            const existingPill = titleStatus.querySelector(
              "[data-pill-container]"
            ) as HTMLElement | null;

            if (existingPill) {
              // Just update the progress of existing container
              updatePillProgress(existingPill, progress);
            } else {
              // Create a new pill container with spinner
              titleStatus.innerHTML = "";
              const progressPill = createSpinnerWithPillProgress(
                progress,
                true
              );
              titleStatus.appendChild(progressPill);
            }

            // Store the upload ID as a data attribute for updates
            titleStatus.setAttribute(
              "data-active-upload-id",
              Object.keys(uploads).find(
                (key) => uploads[key] === latestUpload
              ) || ""
            );
          } else {
            // No active uploads - show saved state
            titleStatus.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" class="icon" width="16" height="16" stroke="#32CD32" fill="#32CD32" stroke-width="0" viewBox="0 0 16 16">
                <path d="M2.5 8a5.5 5.5 0 0 1 8.25-4.764.5.5 0 0 0 .5-.866A6.5 6.5 0 1 0 14.5 8a.5.5 0 0 0-1 0 5.5 5.5 0 1 1-11 0"></path>
                <path d="M15.354 3.354a.5.5 0 0 0-.708-.708L8 9.293 5.354 6.646a.5.5 0 1 0-.708.708l3 3a.5.5 0 0 0 .708 0z"></path>
              </svg>
              <span style="margin-left: 5px;">Menu Saved</span>
            `;
          }
        };

        // Update menu render status based on canvas state
        const updateMenuRenderStatus = (
          canvasLoader: boolean,
          changedPageIds: Set<number>,
          naci = false,
          isSaving = false
        ) => {
          menuRenderStatus.innerHTML = "";
          const hasOnlyDefaultPage =
            changedPageIds.size === 1 && changedPageIds.has(-1);
          const hasChanges =
            (changedPageIds.size > 0 && !hasOnlyDefaultPage) || naci;

          const flashingDot = createFlashingDot(
            canvasLoader === true
              ? "#c4461f"
              : !isSaving && hasChanges
              ? "#ffd43b"
              : "#32CD32"
          );

          menuRenderStatus.appendChild(flashingDot);
          renderStatusText.textContent =
            canvasLoader === true
              ? "Loading Menu..."
              : !isSaving && hasChanges
              ? "Changes Queued"
              : "Menu Loaded";

          menuRenderStatus.appendChild(renderStatusText);
        };

        // Subscribe to changes in editor state
        const unsubscribe = useInitializeEditor.subscribe((state) => {
          // Always update title status for uploads
          updateTitleStatus(state.isSaving, state.canvasLoader);

          // Only update menu render status for autolayout
          if (template?.isAutoLayout) {
            updateMenuRenderStatus(
              state.canvasLoader,
              usePageStore.getState().changedPageIds
            );
          }
        });

        // Subscribe to changes in page state
        const pageUnsubscribe = usePageStore.subscribe((state) => {
          const changedPageIds = state.changedPageIds;
          // Only update menu render status for autolayout
          if (template?.isAutoLayout) {
            updateMenuRenderStatus(
              useInitializeEditor.getState().canvasLoader,
              changedPageIds,
              state.naci,
              useInitializeEditor.getState().isSaving
            );
          }
        });

        // Subscribe to upload store
        const uploadUnsubscribe = useUploadStore.subscribe((state) => {
          // Get the active upload ID from the title status
          const activeUploadId = titleStatus.getAttribute(
            "data-active-upload-id"
          );

          // If there's an active upload ID and it exists in the store
          if (activeUploadId && state.uploads[activeUploadId]) {
            const upload = state.uploads[activeUploadId];
            const uploadStatus = titleStatus.getAttribute("data-upload-status");

            // Check for existing pill container
            const existingPill = titleStatus.querySelector(
              "[data-pill-container]"
            ) as HTMLElement | null;

            // Check completion status first (highest priority)
            if (upload.status === "completed") {
              // Show success message when upload is complete
              showSuccessStatus(titleStatus);
              titleStatus.removeAttribute("data-active-upload-id");
              titleStatus.removeAttribute("data-upload-status");

              // Clean up the upload from store after showing success
              setTimeout(() => {
                const { resetUpload } = useUploadStore.getState();
                resetUpload(activeUploadId);
              }, 1500); // Give time to show success message
            } else if (upload.status === "error") {
              // Show error message
              showErrorStatus(titleStatus);
              titleStatus.removeAttribute("data-active-upload-id");
              titleStatus.removeAttribute("data-upload-status");
            } else if (uploadStatus === "finalizing" || (upload.progress === 100 && upload.status === "uploading")) {
              // Handle finalization state (100% but not yet complete)
              if (existingPill) {
                // Update the progress to 100% if not already
                updatePillProgress(existingPill, 100);

                // Update the text content to show "Saving metadata"
                const textContent = existingPill.querySelector(
                  "[data-text-content]"
                );
                if (textContent) {
                  textContent.textContent = "Saving metadata...";
                }
              }
            } else if (upload.status === "uploading") {
              // Regular progress updates
              if (existingPill) {
                // Just update the progress without refreshing the spinner
                updatePillProgress(existingPill, upload.progress);

                // Make sure text shows "Uploading..." during regular upload
                const textContent = existingPill.querySelector(
                  "[data-text-content]"
                );
                if (textContent) {
                  textContent.textContent = "Uploading...";
                }
              }
            }
          }

          // If any upload is started or in progress, we should update the UI
          const hasActiveUploads = Object.values(state.uploads).some(
            (upload) => upload.status === "uploading"
          );

          if (hasActiveUploads) {
            const editorState = useInitializeEditor.getState();
            updateTitleStatus(editorState.isSaving, editorState.canvasLoader);
          }
        });

        return () => {
          clearTimeout(timeoutId);
          unsubscribe();
          pageUnsubscribe();
          uploadUnsubscribe();
          titleStatus.remove();
          menuRenderStatus.remove();
        };
      }
    };

    injectMenuAndTitleStatus();
  }, [input]);
};
