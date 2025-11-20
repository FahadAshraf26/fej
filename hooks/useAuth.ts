import { useEffect } from "react";
import { useUser } from "@Hooks/useUser";
import { useDialog } from "@Hooks/useDialog";

export const useAuth = () => {
  const [isAuthDialogOpen, openAuthDialog, closeAuthDialog] = useDialog(false);
  const user = useUser();
  useEffect(() => {
    if (user) {
      closeAuthDialog();
    } else {
      openAuthDialog();
    }
  }, [user, openAuthDialog, closeAuthDialog]);

  return { user, isAuthDialogOpen, closeAuthDialog };
};
