import {
  Modal,
  Grid,
  Stack,
  Text,
  Flex,
  TextInput,
  Button,
  Box,
  Loader,
  Paper,
  Transition,
  ActionIcon,
} from "@mantine/core";
import Image from "next/image";
import theme from "../config/theme";
import { useEffect, useRef, useState } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import OtpInput from "react-otp-input";
import { useRouter } from "next/router";
import { decryptData } from "@Helpers/enryption";
import { IconArrowLeft, IconAlertCircle } from "@tabler/icons";
import { toast, ToastContent, Id } from "react-toastify";
import OnboardingCard from "./CommonComponents/OnboardingCard";

interface IAuthDialogProps {
  opened: boolean;
  onClose: () => void;
}
type ValuePropProps = {
  number: number;
  title: string;
  description: string;
};
interface ILoginErrors {
  email?: string;
  phone?: string;
}

const ValueProp = ({ number, title, description }: ValuePropProps) => {
  return (
    <Flex align="flex-start" gap="lg">
      <div
        style={{
          width: "28px",
          height: "28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, rgba(255, 140, 0, 0.15), rgba(255, 140, 0, 0.08))",
            borderRadius: "4px",
            transform: "rotate(45deg)",
            boxShadow: "0 2px 12px rgba(255, 140, 0, 0.12)",
          }}
        />
        <Text
          color={theme.colors.orange[6]}
          weight={700}
          size="sm"
          style={{ position: "relative", zIndex: 1 }}
        >
          {number}
        </Text>
      </div>
      <div>
        <Text
          color={theme.colors.dark[8]}
          weight={500}
          size="sm"
          mb={2}
          style={{ letterSpacing: "-0.2px" }}
        >
          {title}
        </Text>
        <Text
          fz={theme.fontSizes.xs}
          color={theme.colors.dark[4]}
          lh={1.6}
          style={{ maxWidth: "280px" }}
        >
          {description}
        </Text>
      </div>
    </Flex>
  );
};

const SalesContent = () => {
  return (
    <Stack spacing="xl" style={{ marginTop: "-8px" }}>
      <div style={{ position: "relative" }}>
        <Image
          src="/upsell-image-small.png"
          width={500}
          height={300}
          alt="Menu Preview"
          placeholder="blur"
          blurDataURL="/upsell-image-blur.jpg"
          style={{
            borderRadius: "12px",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
            marginBottom: 0,
          }}
        />
      </div>
      <Text
        align="left"
        fz="xl"
        weight={600}
        color={theme.colors.dark[8]}
        style={{
          letterSpacing: "-0.4px",
          background: "linear-gradient(135deg, #2C2E33 0%, #1A1B1E 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          paddingLeft: "12px",
          marginBottom: 0,
        }}
      >
        Create Your Perfect Menu
      </Text>
      <Stack spacing="lg" style={{ padding: "0 12px" }}>
        <ValueProp
          number={1}
          title="Save & Update"
          description="Keep your menu current and ready to share with customers"
        />
        <ValueProp
          number={2}
          title="Premium Downloads"
          description="Download unlimited high-resolution, watermark-free menu files"
        />
        <ValueProp
          number={3}
          title="Design Library"
          description="Access our curated collection of professionally designed menu templates"
        />
      </Stack>
    </Stack>
  );
};

const AuthDialog = ({ opened, onClose }: IAuthDialogProps) => {
  const router = useRouter();
  const secretKey = router?.query?.key;
  const decryptedData = decryptData(secretKey);
  const restaurantId = decryptedData?.restaurantId;
  const userPhoneByUrl = decryptedData?.phone;
  const [value, setValue] = useState(userPhoneByUrl ? `+${userPhoneByUrl}` : "");
  const [isSendLoginEmail, setIsSendLoginEmail] = useState("");
  const [loginWithEmail, setLoginWithEmail] = useState(false);
  const [otpScreen, setOtpScreen] = useState(false);
  const [otpArr, setOtpArr] = useState(Array(6).fill(""));
  const [error, setError] = useState<ILoginErrors>({});
  const inventoryTime = 60;
  const [inventoryTimer, setInventoryTimer] = useState<number>(0);
  const [urlAuthLoading, seturlAuthLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inventoryTimerRef = useRef<number | null>(null);
  const { supabaseClient } = useSessionContext();
  const otpLength = 6;
  const [otpCursor, setOtpCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [resendDisabled, setResendDisabled] = useState<{
    type: "email" | "phone" | null;
    until: number;
  }>({ type: null, until: 0 });
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Compose OTP string for submission
  const otp = otpArr.join("");

  useEffect(() => {
    if (!opened) {
      setOtpScreen(false);
      setOtpArr(Array(otpLength).fill(""));
      setShowSuccess(false);
      handleTimerStop();
    }
    return () => {
      handleTimerStop();
    };
  }, [opened]);

  const handleTimerStart = () => {
    const startTime = Date.now();
    const targetTime = inventoryTime * 1000;

    const tick = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(targetTime - elapsedTime, 0);

      setInventoryTimer(Math.ceil(remainingTime / 1000));

      if (remainingTime > 0) {
        inventoryTimerRef.current = requestAnimationFrame(tick);
      } else {
        handleTimerStop();
      }
    };

    inventoryTimerRef.current = requestAnimationFrame(tick);
  };

  const handleTimerStop = () => {
    if (inventoryTimerRef.current) {
      cancelAnimationFrame(inventoryTimerRef.current);
      inventoryTimerRef.current = null;
    }
  };

  const handleError = (error: any, type: "email" | "phone") => {
    let errorMessage = "Something went wrong";

    if (error?.message) {
      if (error.message.includes("Permission to send an SMS has not been enabled")) {
        errorMessage =
          "SMS verification is not available for your region. Please try email login instead.";
      } else {
        errorMessage = error.message;
      }
    }

    setError({ [type]: errorMessage });
  };

  const clearForm = () => {
    setValue("");
    setError({});
    setOtpArr(Array(otpLength).fill(""));
    setIsSendLoginEmail("");
  };

  const handleLoginTypeChange = (isEmail: boolean) => {
    clearForm();
    setLoginWithEmail(isEmail);
  };

  // Custom toast component for resend timer
  const ResendTimerToast = ({
    seconds,
    type,
    onDone,
  }: {
    seconds: number;
    type: "phone" | "email";
    onDone: () => void;
  }) => {
    const [remaining, setRemaining] = useState(seconds);
    useEffect(() => {
      if (remaining <= 0) {
        onDone();
        return;
      }
      const timer = setTimeout(() => setRemaining((r) => r - 1), 1000);
      return () => clearTimeout(timer);
    }, [remaining, onDone]);
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          minWidth: 0,
          width: "100%",
          maxWidth: 480,
          background: "#fff",
          // border: `1.5px solid ${theme.colors.red[3]}`,
          borderRadius: 8,
          padding: "4px 8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* <IconAlertCircle
          size={28}
          color={theme.colors.red[6]}
          style={{ flexShrink: 0 }}
        /> */}
        <span
          style={{
            fontSize: 16,
            color: theme.colors.red[7],
            lineHeight: 1.5,
            wordBreak: "break-word",
            whiteSpace: "normal",
            flex: 1,
          }}
        >
          {type === "phone"
            ? `For security, you can request a new code in ${remaining} second${
                remaining !== 1 ? "s" : ""
              }.`
            : `For security, you can request a new magic link in ${remaining} second${
                remaining !== 1 ? "s" : ""
              }.`}
        </span>
      </div>
    );
  };

  // Custom toast for resend timer
  const showResendTimerToast = (
    seconds: number,
    type: "phone" | "email",
    setResendDisabled: any
  ) => {
    let toastId: Id | null = null;
    const handleDone = () => {
      if (toastId) toast.dismiss(toastId);
      setResendDisabled({ type: null, until: 0 });
    };
    setResendDisabled({ type, until: Date.now() + seconds * 1000 });

    toastId = toast.error(<ResendTimerToast seconds={seconds} type={type} onDone={handleDone} />, {
      toastId: "resend-timer",
      autoClose: false,
      closeOnClick: false,
      closeButton: false,
      draggable: false,
      pauseOnHover: false,
    });
  };

  async function handleLogin(value: string) {
    try {
      setIsLoading(true);
      let errorOnSubmit = {};

      const trimmedValue = value.trim();

      if (loginWithEmail) {
        if (!trimmedValue) {
          toast.error("Email required", {
            autoClose: false,
            closeOnClick: false,
            closeButton: false,
          });
          return;
        }
        if (value !== trimmedValue) {
          toast.error("Email cannot have leading or trailing spaces", {
            autoClose: false,
            closeOnClick: false,
            closeButton: false,
          });
          return;
        }
        if (!validateEmail(trimmedValue)) {
          toast.error("Invalid email", {
            autoClose: false,
            closeOnClick: false,
            closeButton: false,
          });
          return;
        }

        // Check if user exists in profiles table
        const { data: userProfile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("*")
          .ilike("email", trimmedValue)
          .single();
        if (!userProfile || profileError) {
          setShowOnboarding(true);
          return;
        }

        const { data: whiteListUser, error: errorOnGetting } = await supabaseClient
          .from("whitelist_users")
          .select("*")
          .ilike("email", trimmedValue)
          .single();

        if (whiteListUser && !errorOnGetting) {
          window.location.href = "https://app.flapjack.co";
          return;
        }

        const { data, error } = await supabaseClient.auth.signInWithOtp({
          email: trimmedValue,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          if (
            error.message &&
            error.message.includes("For security purposes, you can only request this after")
          ) {
            // Extract seconds from the error message
            const match = error.message.match(/after (\d+) seconds?/);
            const seconds = match ? parseInt(match[1], 10) : 15;
            showResendTimerToast(seconds, "email", setResendDisabled);
            return;
          }
          toast.error(error.message || "Something went wrong", {
            autoClose: false,
            closeOnClick: false,
            closeButton: true,
          });
          return;
        }

        setShowSuccess(true);
        setIsSendLoginEmail("Please check your email");
      } else {
        if (!trimmedValue) {
          toast.error("Phone required", {
            autoClose: false,
            closeOnClick: false,
            closeButton: false,
          });
          return;
        }
        if (value !== trimmedValue) {
          toast.error("Phone number cannot have leading or trailing spaces", {
            autoClose: false,
            closeOnClick: false,
            closeButton: false,
          });
          return;
        }
        if (!isValidPhoneNumber(trimmedValue)) {
          toast.error("Invalid phone number", {
            autoClose: false,
            closeOnClick: false,
            closeButton: false,
          });
          return;
        }

        // Check if user exists in profiles table
        const { data: userProfile, error: profileError } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("phone", trimmedValue.replace("+", ""))
          .single();
        if (!userProfile || profileError) {
          setShowOnboarding(true);
          return;
        }

        if (inventoryTimer > 0) {
          showResendTimerToast(inventoryTimer, "phone", setResendDisabled);
          return;
        }

        const { data, error } = await supabaseClient.auth.signInWithOtp({
          phone: trimmedValue,
        });

        if (error) {
          if (
            error.message &&
            error.message.includes("For security purposes, you can only request this after")
          ) {
            // Extract seconds from the error message
            const match = error.message.match(/after (\d+) seconds?/);
            const seconds = match ? parseInt(match[1], 10) : 15;
            showResendTimerToast(seconds, "phone", setResendDisabled);
            return;
          }
          toast.error(error.message || "Something went wrong", {
            autoClose: false,
            closeOnClick: false,
            closeButton: true,
          });
          return;
        }

        handleTimerStart();
        setOtpScreen(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong", {
        autoClose: false,
        closeOnClick: false,
        closeButton: true,
      });
    } finally {
      setIsLoading(false);
      seturlAuthLoading(false);
    }
  }

  useEffect(() => {
    if (decryptedData) {
      setValue(decryptedData?.phone);
      seturlAuthLoading(true);
      handleLogin(decryptedData?.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verifyOtp() {
    try {
      setIsLoading(true);
      if (otp.length !== 6) {
        toast.error("Please enter a valid 6-digit OTP", {
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
          toastId: "incomplete-otp",
        });
        return;
      }

      const { data, error } = await supabaseClient.auth.verifyOtp({
        phone: value,
        token: otp,
        type: "sms",
      });

      if (error) {
        toast.error("Invalid OTP. Please try again.", {
          autoClose: false,
          closeOnClick: false,
          closeButton: false,
          toastId: "invalid-otp",
        });
        return;
      }

      if (restaurantId) {
        await supabaseClient
          .from("profiles")
          .update({
            restaurant_id: restaurantId,
          })
          .eq("id", data?.user?.id);
        router.push("/templates");
      }

      onClose();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong", {
        autoClose: false,
        closeOnClick: false,
        closeButton: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  // OTP input handlers
  const handleOtpSlotClick = (idx: number) => {
    setOtpCursor(idx);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleOtpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) return;
    const chars = val.split("");
    setOtpArr((prev) => {
      const arr = [...prev];
      let cursor = otpCursor;
      for (let i = 0; i < chars.length && cursor < otpLength; i++, cursor++) {
        arr[cursor] = chars[i];
      }
      setOtpCursor(Math.min(cursor, otpLength - 1));
      return arr;
    });
    // Dismiss OTP-related error toasts when input changes
    toast.dismiss("invalid-otp");
    toast.dismiss("incomplete-otp");
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft") {
      setOtpCursor((c) => Math.max(0, c - 1));
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      setOtpCursor((c) => Math.min(otpLength - 1, c + 1));
      e.preventDefault();
    } else if (e.key === "Backspace") {
      setOtpArr((prev) => {
        const arr = [...prev];
        if (arr[otpCursor]) {
          arr[otpCursor] = "";
        } else if (otpCursor > 0) {
          arr[otpCursor - 1] = "";
          setOtpCursor(otpCursor - 1);
        }
        return arr;
      });
      // Dismiss OTP-related error toasts when backspace is pressed
      toast.dismiss("invalid-otp");
      toast.dismiss("incomplete-otp");
      e.preventDefault();
    }
  };

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [otpCursor]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, [otpArr]);

  // Dismiss toast on input change
  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Trim leading and trailing spaces
    const trimmedValue = e.target.value.trim();
    setValue(trimmedValue);
    toast.dismiss();
  };
  const handlePhoneInputChange = (phone?: string) => {
    // Trim leading and trailing spaces
    const trimmedValue = phone ? phone.trim() : "";
    setValue(trimmedValue);
    toast.dismiss();
  };

  const renderAuthContent = () => {
    if (isLoading) {
      return (
        <Transition mounted={isLoading} transition="fade" duration={200}>
          {(styles) => (
            <div
              style={{
                ...styles,
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                zIndex: 1000,
              }}
            >
              <Stack align="center" spacing="md">
                <Loader color="orange" size="lg" variant="dots" />
                <Text color="dimmed" size="sm">
                  {otpScreen ? "Verifying..." : "Authenticating"}
                </Text>
              </Stack>
            </div>
          )}
        </Transition>
      );
    }

    if (showSuccess) {
      return (
        <div style={{ position: "relative", width: "100%", minHeight: 320 }}>
          <ActionIcon
            variant="subtle"
            color="gray"
            onClick={() => {
              setShowSuccess(false);
              handleLoginTypeChange(false);
            }}
            style={{
              position: "absolute",
              top: -65,
              left: "10%",
              transform: "translateX(-50%)",
              zIndex: 3,
              // backgroundColor: "rgba(0, 0, 0, 0.03)",
              width: 36,
              height: 36,
            }}
            styles={{
              root: {
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "translate(-2px, 0)",
                  backgroundColor: "rgba(0, 0, 0, 0.06)",
                },
              },
            }}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Transition mounted={showSuccess} transition="slide-up" duration={400}>
            {(styles) => (
              <Paper
                p="xl"
                radius="md"
                withBorder
                style={{
                  ...styles,
                  marginTop: 40,
                  marginBottom: 20,
                  position: "relative",
                  left: "50%",
                  transform: `translateX(-50%)`,
                  width: "90%",
                  maxWidth: "400px",
                  backgroundColor: "white",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  zIndex: 2,
                }}
              >
                <Stack align="center" spacing="xl">
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      backgroundColor: "rgba(255, 140, 0, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM19.6 8.25L12.53 12.67C12.21 12.87 11.79 12.87 11.47 12.67L4.4 8.25C4.15 8.09 4 7.82 4 7.53C4 6.86 4.73 6.46 5.3 6.81L12 11L18.7 6.81C19.27 6.46 20 6.86 20 7.53C20 7.82 19.85 8.09 19.6 8.25Z"
                        fill="#FF8C00"
                      />
                    </svg>
                  </div>
                  <Stack align="center" spacing="xs">
                    <Text size="xl" weight={600} align="center" color="dark.7">
                      Check Your Email
                    </Text>
                    <Text size="sm" color="dimmed" align="center" style={{ maxWidth: "280px" }}>
                      We&apos;ve sent you a login link. Please check your email to continue.
                    </Text>
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Transition>
        </div>
      );
    }

    if (otpScreen) {
      return (
        <Stack align="center" spacing="lg" style={{ width: "100%" }}>
          <Flex align="center" gap="md" style={{ width: "100%", position: "relative" }}>
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={() => {
                setOtpScreen(false);
                setOtpArr(Array(otpLength).fill(""));
                handleTimerStop();
              }}
              style={{
                position: "absolute",
                left: 0,
                transform: "translateX(-50%)",
              }}
              styles={{
                root: {
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translate(-2px, 0)",
                    backgroundColor: "rgba(0, 0, 0, 0.06)",
                  },
                },
              }}
            >
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Text size="xl" weight={600} align="center" color="dark.7" style={{ flex: 1 }}>
              Enter OTP
            </Text>
          </Flex>
          <Text size="sm" color="dimmed" align="center" style={{ maxWidth: 260 }}>
            We&apos;ve sent a 6-digit code to your phone. Please enter it below to verify your
            number.
          </Text>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              margin: "12px 0",
              position: "relative",
              cursor: "text",
            }}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              const otpContainer = target.closest("[data-otp-container]");
              if (otpContainer) {
                const rect = otpContainer.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const slotWidth = 36; // Width of each OTP slot
                const gap = 10; // Gap between slots
                const idx = Math.floor(clickX / (slotWidth + gap));
                if (idx >= 0 && idx < otpLength) {
                  handleOtpSlotClick(idx);
                }
              }
            }}
            data-otp-container
          >
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={1}
              style={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
                width: 0,
                height: 0,
              }}
              onChange={handleOtpInputChange}
              onKeyDown={handleOtpKeyDown}
              autoFocus
              aria-label="OTP input"
            />
            {Array.from({ length: otpLength }).map((_, idx) => (
              <div
                key={idx}
                style={{
                  width: 36,
                  height: 44,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: otpArr[idx] ? theme.colors.dark[7] : "#bbb",
                    minHeight: 20,
                    letterSpacing: 2,
                    transition: "color 0.2s",
                    userSelect: "none",
                  }}
                >
                  {otpArr[idx] ? otpArr[idx] : ""}
                </span>
                <div
                  style={{
                    position: "relative",
                    width: 20,
                    height: 1.5,
                    marginTop: 4,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      borderRadius: 1,
                      background: "#bbb",
                      position: "absolute",
                      left: 0,
                      top: 0,
                    }}
                  />
                  <span
                    style={{
                      display: "block",
                      width: "100%",
                      height: "100%",
                      borderRadius: 1,
                      background: theme.colors.orange[6],
                      position: "absolute",
                      left: 0,
                      top: 0,
                      transform: idx === otpCursor ? "translateX(0)" : "translateX(-100%)",
                      transition: "transform 0.3s ease-out",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <Stack spacing="xs" style={{ width: "100%" }} mb={"sm"}>
            <Button
              color="orange"
              fullWidth
              onClick={verifyOtp}
              radius="md"
              size="md"
              loading={isLoading}
              styles={{
                root: {
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  },
                },
              }}
            >
              Verify OTP
            </Button>
          </Stack>
        </Stack>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          // gap: "8px",
          width: "100%",
          position: "relative",
        }}
      >
        <div style={{ position: "relative", width: "100%", minHeight: "90px" }}>
          <Transition
            mounted={loginWithEmail}
            transition={{
              in: { transform: "perspective(1000px) rotateX(0deg)" },
              out: { transform: "perspective(1000px) rotateX(90deg)" },
              common: {
                transformOrigin: "top",
                transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              },
              transitionProperty: "transform",
            }}
            duration={400}
          >
            {(styles) => (
              <div
                style={{
                  ...styles,
                  position: "absolute",
                  width: "100%",
                  margin: 0,
                  padding: 0,
                  backfaceVisibility: "hidden",
                }}
              >
                <TextInput
                  className="email-input"
                  label="Email address"
                  placeholder="Enter your email address"
                  value={value}
                  onChange={handleEmailInputChange}
                  labelProps={{
                    style: { color: "grey", marginBottom: "10px" },
                  }}
                  disabled={isLoading}
                  style={{ margin: 0, padding: 0 }}
                />
              </div>
            )}
          </Transition>

          <Transition
            mounted={!loginWithEmail && !otpScreen}
            transition={{
              in: { transform: "perspective(1000px) rotateX(0deg)" },
              out: { transform: "perspective(1000px) rotateX(-90deg)" },
              common: {
                transformOrigin: "bottom",
                transition: "transform 400ms cubic-bezier(0.4, 0, 0.2, 1)",
              },
              transitionProperty: "transform",
            }}
            duration={400}
          >
            {(styles) => (
              <div
                style={{
                  ...styles,
                  position: "absolute",
                  width: "100%",
                  margin: 0,
                  padding: 0,
                  backfaceVisibility: "hidden",
                }}
              >
                <label
                  style={{
                    color: "gray",
                    marginBottom: "10px",
                    display: "block",
                  }}
                >
                  Phone
                </label>
                <PhoneInput
                  placeholder="Enter your phone number"
                  value={value}
                  onChange={handlePhoneInputChange}
                  className="input-phone"
                  defaultCountry="US"
                  disabled={isLoading}
                  style={{ margin: 0, padding: 0 }}
                />
              </div>
            )}
          </Transition>
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            // marginTop: "16px",
            padding: 0,
          }}
        >
          <Button
            color="orange"
            fullWidth
            onClick={() => handleLogin(value)}
            radius="md"
            size="md"
            styles={{
              root: {
                transition: "all 0.2s ease",
                height: "40px",
                fontSize: "14px",
                fontWeight: 600,
                letterSpacing: "0.3px",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(255, 140, 0, 0.15)",
                },
                marginBottom: 0,
                marginTop: 0,
                paddingTop: 0,
                paddingBottom: 0,
              },
            }}
            disabled={
              (loginWithEmail &&
                resendDisabled.type === "email" &&
                resendDisabled.until > Date.now()) ||
              (!loginWithEmail &&
                resendDisabled.type === "phone" &&
                resendDisabled.until > Date.now())
            }
          >
            {loginWithEmail ? "Send Magic Link" : "Send Verification Code"}
          </Button>

          <Button
            color="gray"
            variant="subtle"
            fullWidth
            onClick={() => handleLoginTypeChange(!loginWithEmail)}
            radius="md"
            size="md"
            styles={{
              root: {
                transition: "all 0.2s ease",
                height: "40px",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "0.2px",
                color: theme.colors.gray[7],
                backgroundColor: "transparent",
                "&:hover": {
                  transform: "translateY(-1px)",
                  backgroundColor: "rgba(0, 0, 0, 0.02)",
                  color: theme.colors.gray[8],
                },
                marginTop: 0,
                paddingTop: 0,
                paddingBottom: 0,
              },
            }}
          >
            {loginWithEmail ? "Login with Phone" : "Login with Email"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      radius="md"
      withCloseButton={false}
      padding={8}
      centered={true}
      styles={{
        modal: {
          maxHeight: "90vh",
        },
      }}
    >
      {showOnboarding ? (
        <OnboardingCard
          onTalkToSales={() => {
            window.open("mailto:howdy@flapjack.co?subject=Talk%20to%20Sales", "_blank");
          }}
          onLinkRestaurant={() => {
            window.open("mailto:howdy@flapjack.co?subject=Link%20Existing%20Restaurant", "_blank");
          }}
        />
      ) : (
        <Grid>
          <Grid.Col span={6} bg={theme.colors.gray[1]} sx={{ borderRadius: "8px 0 0 8px" }} p="xl">
            <SalesContent />
          </Grid.Col>
          <Grid.Col
            span={6}
            bg={"#fff"}
            p="xl"
            sx={{
              borderRadius: "0 8px 8px 0",
              display: "flex",
              flexDirection: "column",
              alignSelf: "center",
              position: "relative",
              minHeight: "380px",
            }}
          >
            <Flex align="center" style={{ cursor: "pointer", margin: "20px auto" }}>
              <Image src="/logo.svg" alt="Flapjack Logo" width={61} height={59} priority />
              <Text fw={700} ml={8} fz={"xl"}>
                flapjack
              </Text>
            </Flex>
            <Box style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              {urlAuthLoading ? (
                <Flex justify="center" align="center" style={{ flex: 1 }}>
                  <Stack align="center" spacing="md">
                    <Loader color="orange" size="lg" />
                    <Text color="dimmed" size="sm">
                      Loading...
                    </Text>
                  </Stack>
                </Flex>
              ) : (
                renderAuthContent()
              )}
            </Box>

            <div
              style={{
                marginTop: "auto",
                paddingLeft: 32,
                paddingRight: 32,
                paddingBottom: 32,
                background: "transparent",
                boxSizing: "border-box",
              }}
            >
              <Text
                fz="7pt"
                ta="left"
                color={theme.colors.dark[3]}
                lh="12px"
                style={{ maxWidth: "280px" }}
              >
                By providing us with your information you are consenting to the collection and use
                of your information in accordance with our{" "}
                <a href="https://www.flapjack.co/terms-of-use">Terms of Service</a> and{" "}
                <a href="https://www.flapjack.co/privacy-policy">Privacy Policy</a>.
              </Text>
            </div>
          </Grid.Col>
        </Grid>
      )}
    </Modal>
  );
};

export default AuthDialog;
