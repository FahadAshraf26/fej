// contexts/ModalContext.tsx
import React, { createContext, useContext, useReducer, ReactNode } from "react";
import { ITemplateDetails } from "../interfaces/ITemplate";

// Define modal types
export type ModalType =
  | "delete"
  | "rename"
  | "duplicate"
  | "transfer"
  | "changeLocation"
  | "coverImage"
  | "createMenu"
  | "paymentUpdate"
  | "none";

// Modal state interface
interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data?: any; // For passing data to the modal (like template details)
}

// Modal context interface
interface ModalContextType {
  modalState: ModalState;
  openModal: (type: ModalType, data?: any) => void;
  closeModal: () => void;
}

// Create the context
const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Actions for the reducer
type ModalAction =
  | { type: "OPEN_MODAL"; payload: { modalType: ModalType; data?: any } }
  | { type: "CLOSE_MODAL" };

// Reducer function
function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "OPEN_MODAL":
      return {
        isOpen: true,
        type: action.payload.modalType,
        data: action.payload.data,
      };
    case "CLOSE_MODAL":
      return {
        isOpen: false,
        type: "none",
        data: undefined,
      };
    default:
      return state;
  }
}

// Provider component
export const ModalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [modalState, dispatch] = useReducer(modalReducer, {
    isOpen: false,
    type: "none",
    data: undefined,
  });

  const openModal = (modalType: ModalType, data?: any) => {
    dispatch({
      type: "OPEN_MODAL",
      payload: { modalType, data },
    });
  };

  const closeModal = () => {
    dispatch({ type: "CLOSE_MODAL" });
  };

  return (
    <ModalContext.Provider value={{ modalState, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
};

// Custom hook for using the modal context
export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
