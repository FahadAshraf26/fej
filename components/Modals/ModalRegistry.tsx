// components/Modals/ModalRegistry.tsx
import React from "react";
import { useModal, ModalType } from "../../context/ModalContext";
import DeleteTemplateModal from "./TemplateModals/DeleteTemplateModal";
import RenameTemplateModal from "./TemplateModals/RenameTemplateModal";
import DuplicateTemplateModal from "./TemplateModals/DuplicateTemplateModal";
import TransferTemplateModal from "./TemplateModals/TransferTemplateModal";
import ChangeLocationModal from "./TemplateModals/ChangeLocationModal";
import CoverImageModal from "./TemplateModals/CoverImageModal";
import CreateMenuModal from "./TemplateModals/CreateMenuModal";
import PaymentUpdateModal from "./TemplateModals/PaymentUpdateModal";

/**
 * ModalRegistry renders the appropriate modal based on the current modal state
 * from the ModalContext. It centralizes all modal rendering logic.
 */
const ModalRegistry: React.FC = () => {
  const { modalState, closeModal } = useModal();
  const { isOpen, type, data } = modalState;

  // If modal is not open, don't render anything
  if (!isOpen) return null;

  // Render the appropriate modal based on type
  switch (type) {
    case "delete":
      return (
        <DeleteTemplateModal
          isOpen={isOpen}
          onClose={closeModal}
          template={data}
        />
      );
    case "rename":
      return (
        <RenameTemplateModal
          isOpen={isOpen}
          onClose={closeModal}
          template={data}
        />
      );
    case "duplicate":
      return (
        <DuplicateTemplateModal
          isOpen={isOpen}
          onClose={closeModal}
          template={data}
        />
      );
    case "transfer":
      return (
        <TransferTemplateModal
          isOpen={isOpen}
          onClose={closeModal}
          template={data}
        />
      );
    case "changeLocation":
      return (
        <ChangeLocationModal
          isOpen={isOpen}
          onClose={closeModal}
          template={data}
        />
      );
    case "coverImage":
      return (
        <CoverImageModal isOpen={isOpen} onClose={closeModal} template={data} />
      );
    case "createMenu":
      return (
        <CreateMenuModal
          isOpen={isOpen}
          onClose={closeModal}
          basicTemplate={data}
        />
      );
    case "paymentUpdate":
      return (
        <PaymentUpdateModal
          isOpen={isOpen}
          onClose={closeModal}
          returnUrl={data?.returnUrl}
        />
      );
    default:
      return null;
  }
};

export default ModalRegistry;
