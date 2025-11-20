import { useLayoutEffect } from "react";
import { useInitializeEditor } from "@Stores/InitializeEditor/InitializeEditor.store";

export const useTabsActive = () => {
  useLayoutEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        const elementWithShadowRoot = document.querySelector(
          "#cesdkContainer #root-shadow "
        );
        const shadowRoot = elementWithShadowRoot?.shadowRoot;

        //Acces the Content Button after its added to the DOM
        // const contentButton = shadowRoot?.querySelector(
        //   '[data-cy="librarydock-content-id"]'
        // );

        // if (contentButton && !contentButton.hasAttribute("data-listened")) {
        //   contentButton.setAttribute("data-listened", "true");
        //   contentButton.addEventListener("click", () => {
        //     useInitializeEditor.getState().setIsContentOpen();
        //   });
        // }

        // //Access the Layout Button after its added to the DOM
        // const layoutButton = shadowRoot?.querySelector(
        //   '[data-cy="librarydock-layout-id"]'
        // );

        // if (layoutButton && !layoutButton.hasAttribute("data-listened")) {
        //   layoutButton.setAttribute("data-listened", "true");
        //   layoutButton.addEventListener("click", () => {
        //     useInitializeEditor.getState().setIsLayoutOpen();
        //   });
        // }

        // //Access the Style Button after its added to the DOM
        // const styleButton = shadowRoot?.querySelector(
        //   '[data-cy="librarydock-style-id"]'
        // );

        // if (styleButton && !styleButton.hasAttribute("data-listened")) {
        //   styleButton.setAttribute("data-listened", "true");
        //   styleButton.addEventListener("click", () => {
        //     useInitializeEditor.getState().setIsStyleOpen();
        //   });
        // }

        // Access the "Images" button after it's added to the DOM
        const imagesButton = shadowRoot?.querySelector(
          '[data-cy="DockBuilder-Button-Images"]'
        );

        if (imagesButton && !imagesButton.hasAttribute("data-listened")) {
          imagesButton.setAttribute("data-listened", "true");
          imagesButton.addEventListener("click", () => {
            if (useInitializeEditor.getState().isContentOpen) {
              useInitializeEditor.getState().setIsContentOpen();
            } else if (useInitializeEditor.getState().isLayoutOpen) {
              useInitializeEditor.getState().setIsLayoutOpen();
            } else if (useInitializeEditor.getState().isStyleOpen) {
              useInitializeEditor.getState().setIsStyleOpen();
            }
          });
        }

        const textButton = shadowRoot?.querySelector(
          '[data-cy="DockBuilder-Button-ly.img.text"]'
        );
        if (textButton && !textButton.hasAttribute("data-listened")) {
          textButton.setAttribute("data-listened", "true");
          textButton.addEventListener("click", () => {
            if (useInitializeEditor.getState().isContentOpen) {
              useInitializeEditor.getState().setIsContentOpen();
            } else if (useInitializeEditor.getState().isLayoutOpen) {
              useInitializeEditor.getState().setIsLayoutOpen();
            } else if (useInitializeEditor.getState().isStyleOpen) {
              useInitializeEditor.getState().setIsStyleOpen();
            }
          });
        }

        const shapesButton = shadowRoot?.querySelector(
          '[data-cy="DockBuilder-Button-ly.img.vectorpath"]'
        );
        if (shapesButton && !shapesButton.hasAttribute("data-listened")) {
          shapesButton.setAttribute("data-listened", "true");
          shapesButton.addEventListener("click", () => {
            if (useInitializeEditor.getState().isContentOpen) {
              useInitializeEditor.getState().setIsContentOpen();
            } else if (useInitializeEditor.getState().isLayoutOpen) {
              useInitializeEditor.getState().setIsLayoutOpen();
            } else if (useInitializeEditor.getState().isStyleOpen) {
              useInitializeEditor.getState().setIsStyleOpen();
            }
          });
        }
      });
    });

    const config = { childList: true, subtree: true };

    observer.observe(document.body, config);

    return () => {
      observer.disconnect();
    };
  }, []);
};
