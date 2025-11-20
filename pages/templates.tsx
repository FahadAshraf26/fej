// pages/templates.tsx
import React, { useEffect } from "react";
import { useUserContext } from "../context/UserContext";
import { useTemplateStore } from "../stores/Template/Template.store";
import {
  CustomerMenusView,
  DefaultUserView,
  TemplatesView,
} from "@Components/TemplateGallery/TemplateView";
import { ModalProvider } from "../context/ModalContext";
import ModalRegistry from "../components/Modals/ModalRegistry";

const Templates = () => {
  const { user } = useUserContext();
  const activeTab = useTemplateStore((state) => state.activeTab);
  const setLoading = useTemplateStore((state) => state.setLoading);
  const initializeData = useTemplateStore((state) => state.initializeData);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = localStorage.getItem("activeTab");
      if (savedTab) {
        useTemplateStore.setState({ activeTab: savedTab });
      }
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    initializeData(user);
  }, [user, setLoading, initializeData]);

  return (
    <ModalProvider>
      <ModalRegistry />
      {user?.role === "flapjack" && activeTab === "templates" ? (
        <TemplatesView />
      ) : user?.role === "flapjack" ? (
        <CustomerMenusView />
      ) : (
        <DefaultUserView />
      )}
    </ModalProvider>
  );
};

export default Templates;
