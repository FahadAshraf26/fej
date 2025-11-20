import { toast } from "react-toastify";
export const removeSpecialCharacters = (inputString: string | undefined) => {
  if (!inputString) {
    return "";
  }
  // Updated regular expression to remove single quotes and dots
  const cleanedString = inputString.replace(/['"]/g, "");
  return cleanedString;
};

export function addDays(days: number) {
  const day = new Date();
  day.setDate(day.getDate() + days);
  return day;
}

export const handleError = (
  errorMessage: string,
  updateLoaderState?: (input: boolean) => void,
  suppressNotification?: boolean
): void => {
  console.error("An error has occurred:", errorMessage);
  if (!suppressNotification) {
    toast(errorMessage, { type: "error" });
  }
  if (updateLoaderState) {
    updateLoaderState(false);
  }
};
