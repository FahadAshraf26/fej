import { useEffect, SetStateAction, Dispatch } from "react";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

interface fontsErrorsType {
  title?: string;
  file?: string;
  submit?: string;
}

export const useCustomUIElementsEffect = (
  input: any,
  setFontsError: Dispatch<SetStateAction<fontsErrorsType | undefined>>,
  setIsUploadFontModal: Dispatch<SetStateAction<boolean>>,
  fontListTrigger?: number
): void => {
  const libraryLoading = useInitializeEditor.getState().libraryLoading;
  const fonts = useInitializeEditor.getState().fonts;

  useEffect(() => {
    const removeDelayedItems = () => {
      const elementWithShadowRoot = document.querySelector("#cesdkContainer #root-shadow");
      const shadowRoot = elementWithShadowRoot?.shadowRoot;

      if (!shadowRoot) {
        return;
      }

      const fontList = shadowRoot.querySelector(
        ".UBQ_ListBox-module__options--QXJ8g.UBQ_Select-module__block--jJ2Mf"
      ) as HTMLElement;

      if (!fontList) {
        return;
      }

      const hasFontItems =
        fontList.querySelector("li[class*='UBQ_ListBox-module__option']") !== null;
      if (!hasFontItems) {
        return;
      }

      const firstFontItem = fontList.querySelector("li[class*='UBQ_ListBox-module__option']");
      if (firstFontItem) {
        const itemText = firstFontItem.textContent?.trim() || "";

        const isFontSizePopover =
          /^\d+$/.test(itemText) ||
          /^\d+px$/.test(itemText) ||
          /^\d+pt$/.test(itemText) ||
          /^(small|medium|large|x-small|x-large|xx-small|xx-large)$/i.test(itemText);

        if (isFontSizePopover) {
          return;
        }

        const hasTypicalFontNames = Array.from(
          fontList.querySelectorAll("li[class*='UBQ_ListBox-module__option']")
        ).some((item) => {
          const text = item.textContent?.trim() || "";
          return /[a-zA-Z]/.test(text) && text.length > 2;
        });

        if (!hasTypicalFontNames) {
          return;
        }
      }

      const existingHeader = fontList.querySelector(".font-search-header");
      if (existingHeader) {
        return;
      }

      const popover = fontList.closest(".UBQ_Popover-module__popover--TDOA-") as HTMLElement;

      const isTypefacePopover =
        popover?.classList.contains("UBQ_TypefaceSelect-module__block---i9F3") ||
        popover?.querySelector("[class*='TypefaceSelect']") !== null ||
        fontList.querySelector("[class*='TypefaceSelectItem']") !== null;

      if (popover && isTypefacePopover) {
        popover.style.setProperty("width", "600px", "important");
        popover.style.setProperty("max-width", "600px", "important");
        popover.style.setProperty("min-width", "600px", "important");
      }

      if (isTypefacePopover) {
        fontList.style.setProperty("width", "100%", "important");
        fontList.style.setProperty("max-width", "568px", "important");
        fontList.style.setProperty("min-width", "568px", "important");
        fontList.style.setProperty("box-sizing", "border-box", "important");
        fontList.style.setProperty("min-height", "200px", "important");
        fontList.style.setProperty("overflow-x", "hidden", "important");
      }

      if (isTypefacePopover) {
        const fontItems = fontList.querySelectorAll("li[class*='UBQ_ListBox-module__option']");
        fontItems.forEach((item) => {
          (item as HTMLElement).style.setProperty("width", "568px", "important");
          (item as HTMLElement).style.setProperty("max-width", "568px", "important");
          (item as HTMLElement).style.setProperty("box-sizing", "border-box", "important");
        });
      }

      if (!isTypefacePopover) {
        return;
      }

      const headerContainer = document.createElement("div");
      headerContainer.className = "font-search-header";
      headerContainer.style.setProperty("position", "sticky", "important");
      headerContainer.style.setProperty("top", "0", "important");
      headerContainer.style.setProperty("z-index", "1000", "important");
      headerContainer.style.setProperty("background-color", "#eeeef0", "important");
      headerContainer.style.setProperty("border-bottom", "1px solid #ccc", "important");
      headerContainer.style.setProperty("padding", "8px", "important");
      headerContainer.style.setProperty("display", "flex", "important");
      headerContainer.style.setProperty("gap", "8px", "important");
      headerContainer.style.setProperty("align-items", "center", "important");
      headerContainer.style.setProperty("flex-shrink", "0", "important");
      headerContainer.style.setProperty("width", "100%", "important");
      headerContainer.style.setProperty("box-sizing", "border-box", "important");

      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = "Search fonts...";
      searchInput.style.setProperty("flex", "1", "important");
      searchInput.style.setProperty("min-width", "200px", "important");
      searchInput.style.setProperty("max-width", "400px", "important");
      searchInput.style.setProperty("padding", "4px 8px", "important");
      searchInput.style.setProperty("border-radius", "4px", "important");
      searchInput.style.setProperty("border", "1px solid #ccc", "important");
      searchInput.style.setProperty("font-size", "14px", "important");
      searchInput.style.setProperty("font-family", "'Roboto', sans-serif", "important");
      searchInput.style.setProperty("box-sizing", "border-box", "important");

      const uploadButton = document.createElement("button");
      uploadButton.textContent = "Upload custom font";
      uploadButton.style.setProperty("white-space", "nowrap", "important");
      uploadButton.style.setProperty("min-width", "140px", "important");
      uploadButton.style.setProperty("max-width", "160px", "important");
      uploadButton.style.setProperty("width", "150px", "important");
      uploadButton.style.setProperty("padding", "4px 8px", "important");
      uploadButton.style.setProperty("border-radius", "4px", "important");
      uploadButton.style.setProperty("border", "1px solid #ccc", "important");
      uploadButton.style.setProperty("background-color", "#ffffff", "important");
      uploadButton.style.setProperty("cursor", "pointer", "important");
      uploadButton.style.setProperty("font-size", "14px", "important");
      uploadButton.style.setProperty("font-family", "'Roboto', sans-serif", "important");
      uploadButton.style.setProperty("font-weight", "500", "important");
      uploadButton.style.setProperty("box-sizing", "border-box", "important");

      let searchTimeout: number;
      const performSearch = (searchTerm: string) => {
        const allFontItems = fontList.querySelectorAll("li[class*='UBQ_ListBox-module__option']");
        let hasResults = false;

        if (searchTerm === "") {
          allFontItems.forEach((item) => {
            (item as HTMLElement).style.display = "block";
          });
          const noResultsMsg = fontList.querySelector(".no-results-message");
          if (noResultsMsg) {
            noResultsMsg.remove();
          }
          return;
        }

        allFontItems.forEach((item) => {
          const fontName = (item as HTMLElement).textContent?.toLowerCase() || "";
          const shouldShow = fontName.includes(searchTerm.toLowerCase());
          (item as HTMLElement).style.display = shouldShow ? "block" : "none";
          if (shouldShow) {
            hasResults = true;
          }
        });

        const existingNoResults = fontList.querySelector(".no-results-message");
        if (!hasResults && !existingNoResults) {
          const noResultsElement = document.createElement("li");
          noResultsElement.className = "no-results-message";
          noResultsElement.style.setProperty("padding", "12px 16px", "important");
          noResultsElement.style.setProperty("color", "#666", "important");
          noResultsElement.style.setProperty("font-style", "italic", "important");
          noResultsElement.style.setProperty("text-align", "center", "important");
          noResultsElement.style.setProperty("font-size", "14px", "important");
          noResultsElement.style.setProperty("width", "568px", "important");
          noResultsElement.style.setProperty("max-width", "568px", "important");
          noResultsElement.style.setProperty("box-sizing", "border-box", "important");
          noResultsElement.style.setProperty("list-style", "none", "important");
          noResultsElement.style.setProperty("margin", "0", "important");
          noResultsElement.textContent = `No fonts found matching "${searchTerm}"`;
          fontList.appendChild(noResultsElement);
        } else if (hasResults && existingNoResults) {
          existingNoResults.remove();
        }
      };

      searchInput.addEventListener("input", (e) => {
        e.stopPropagation();
        clearTimeout(searchTimeout);
        const searchTerm = (e.target as HTMLInputElement).value;
        searchTimeout = window.setTimeout(() => {
          performSearch(searchTerm);
        }, 150);
      });

      uploadButton.addEventListener("click", (e) => {
        e.stopPropagation();
        setIsUploadFontModal(true);
        setFontsError({});
      });

      uploadButton.addEventListener("mouseover", () => {
        uploadButton.style.backgroundColor = "#f5f5f5";
      });
      uploadButton.addEventListener("mouseout", () => {
        uploadButton.style.backgroundColor = "#ffffff";
      });

      headerContainer.appendChild(searchInput);
      headerContainer.appendChild(uploadButton);

      fontList.insertBefore(headerContainer, fontList.firstChild);
    };

    setTimeout(() => {
      removeDelayedItems();
    }, 150);
  }, [input, libraryLoading, fontListTrigger, fonts]);
};
