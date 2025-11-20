import React, { useState } from "react";
import {
  Box,
  Text,
  createStyles,
  Title,
  Stack,
  SegmentedControl,
  TextInput,
  Group,
  MantineProvider,
  List,
  Alert,
  Center,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconPhone,
  IconCheck,
  IconMail,
  IconUsers,
  IconSettings,
  IconChartBar,
} from "@tabler/icons";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { IRestaurantList, IUserDetails } from "../../interfaces";
import CommonModal from "../../components/CommonComponents/Modal";
import { DATA_TEST_IDS } from "@Contants/dataTestIds";
import theme from "@Config/theme";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantDetail: IRestaurantList;
  allUsers: IUserDetails[];
  onUserInvited?: (contact: string, type: "email" | "phone") => void;
}

const useInviteUserStyles = createStyles((theme) => ({
  container: {
    padding: theme.spacing.xl,
    maxWidth: 500,
    margin: "0 auto",
  },

  header: {
    textAlign: "center",
    marginBottom: theme.spacing.xl,
  },

  title: {
    color: theme.colorScheme === "dark" ? theme.colors.gray[0] : theme.colors.gray[9],
    fontWeight: 800,
    fontSize: theme.fontSizes.xl,
    marginBottom: theme.spacing.xs,
  },

  subtitle: {
    color: theme.colorScheme === "dark" ? theme.colors.gray[4] : theme.colors.gray[6],
    fontSize: theme.fontSizes.sm,
    lineHeight: 1.5,
  },

  infoCard: {
    background:
      theme.colorScheme === "dark"
        ? `linear-gradient(135deg, ${theme.colors.blue[9]}, ${theme.colors.blue[8]})`
        : `linear-gradient(135deg, ${theme.colors.blue[0]}, ${theme.colors.blue[1]})`,
    borderColor: theme.colors.blue[3],
    position: "relative",
    overflow: "hidden",
    boxShadow: theme.shadows.sm,
  },

  infoIcon: {
    // position: "absolute",
    // top: theme.spacing.lg,
    // right: theme.spacing.lg,
    color: theme.colors.blue[4],
    opacity: 0.4,
  },

  benefitsList: {
    "& .mantine-List-item": {
      fontSize: theme.fontSizes.sm,
      color: theme.colorScheme === "dark" ? theme.colors.gray[2] : theme.colors.gray[7],
      display: "flex",
      alignItems: "center",
      gap: theme.spacing.sm,
      padding: `${theme.spacing.xs}px 0`,
    },
  },

  segmentedControl: {
    "& .mantine-SegmentedControl-root": {
      backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[8] : theme.colors.gray[1],
      padding: 4,
      borderRadius: theme.radius.md,
    },
    "& .mantine-SegmentedControl-control": {
      border: "none",
      borderRadius: theme.radius.sm,
      fontWeight: 500,
      transition: "all 150ms ease",
      "&:hover": {
        backgroundColor: theme.colorScheme === "dark" ? theme.colors.gray[7] : theme.colors.gray[2],
      },
      "&[data-active]": {
        backgroundColor: theme.colors.orange[5],
        color: `${theme.colors.grape[2]} !important`,
        fontWeight: 600,
        boxShadow: theme.shadows.sm,
        transform: "translateY(-1px)",
      },
    },
    "& .mantine-SegmentedControl-controlActive": {
      backgroundColor: `${theme.colors.orange[5]} !important`,
      color: `${theme.white} !important`,
      boxShadow: `${theme.shadows.sm} !important`,
    },
  },

  inputWrapper: {
    position: "relative",
  },

  textInput: {
    "& .mantine-TextInput-input": {
      height: 52,
      fontSize: theme.fontSizes.sm,
      borderColor: theme.colors.gray[3],
      borderWidth: 2,
      transition: "all 150ms ease",
      "&:focus": {
        borderColor: theme.colors.orange[5],
        boxShadow: `0 0 0 3px ${theme.fn.rgba(theme.colors.orange[5], 0.15)}`,
        transform: "translateY(-1px)",
      },
      "&:hover": {
        borderColor: theme.colors.gray[4],
      },
    },
    "& .mantine-TextInput-icon": {
      color: theme.colors.gray[5],
    },
  },

  phoneInputWrapper: {
    "& .PhoneInputInput": {
      height: "52px !important",
      padding: "0 16px !important",
      borderRadius: `${theme.radius.sm}px !important`,
      border: `2px solid ${theme.colors.gray[3]} !important`,
      fontSize: `${theme.fontSizes.sm}px !important`,
      fontFamily: theme.fontFamily,
      transition: "all 150ms ease !important",
      backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
      color: theme.colorScheme === "dark" ? theme.colors.gray[0] : theme.colors.gray[9],
      "&:focus": {
        outline: "none !important",
        borderColor: `${theme.colors.orange[5]} !important`,
        boxShadow: `0 0 0 3px ${theme.fn.rgba(theme.colors.orange[5], 0.15)} !important`,
        transform: "translateY(-1px) !important",
      },
      "&:hover": {
        borderColor: `${theme.colors.gray[4]} !important`,
      },
    },
    "& .PhoneInputCountrySelect": {
      border: `2px solid ${theme.colors.gray[3]} !important`,
      borderRadius: `${theme.radius.sm}px !important`,
      padding: "6px 10px !important",
      marginRight: `${theme.spacing.xs}px !important`,
      backgroundColor: theme.colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
      transition: "all 150ms ease !important",
      "&:focus": {
        borderColor: `${theme.colors.orange[5]} !important`,
        boxShadow: `0 0 0 3px ${theme.fn.rgba(theme.colors.orange[5], 0.15)} !important`,
      },
      "&:hover": {
        borderColor: `${theme.colors.gray[4]} !important`,
      },
    },
  },

  errorAlert: {
    marginTop: theme.spacing.xs,
  },

  successContainer: {
    textAlign: "center",
    padding: theme.spacing.xl,
  },

  successIcon: {
    width: 100,
    height: 100,
    background: `linear-gradient(135deg, ${theme.colors.green[5]}, ${theme.colors.green[7]})`,
    color: theme.white,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto",
    marginBottom: theme.spacing.xl,
    boxShadow: theme.shadows.lg,
    transform: "scale(1)",
    animation: "successPulse 0.6s ease-out",
  },

  successTitle: {
    color: theme.colors.green[7],
    fontWeight: 700,
    fontSize: theme.fontSizes.xl,
    marginBottom: theme.spacing.sm,
  },

  successText: {
    color: theme.colorScheme === "dark" ? theme.colors.gray[3] : theme.colors.gray[7],
    fontSize: theme.fontSizes.sm,
    lineHeight: 1.6,
  },

  highlightText: {
    color: theme.colors.orange[6],
    fontWeight: 600,
  },
}));

const InviteUserModal: React.FC<InviteUserModalProps> = ({
  isOpen,
  onClose,
  restaurantDetail,
  allUsers,
  onUserInvited,
}) => {
  const { supabaseClient: supabase } = useSessionContext();
  const { classes } = useInviteUserStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [contactType, setContactType] = useState<"email" | "phone">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string>("");
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    setEmail("");
    setPhone("");
    setError("");
    setSuccess(false);
    setContactType("phone");
    onClose();
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    if (contactType === "email") {
      if (!email) {
        setError("Email address is required");
        return false;
      }
      // Check for leading/trailing spaces
      const trimmedEmail = email.trim();
      if (email !== trimmedEmail) {
        setError("Email cannot have leading or trailing spaces");
        return false;
      }
      if (!validateEmail(trimmedEmail)) {
        setError("Please enter a valid email address");
        return false;
      }

      const userAlreadyMember = allUsers?.find((user) => user?.email === trimmedEmail);
      if (userAlreadyMember) {
        setError("This user is already a member of your restaurant");
        return false;
      }
    } else {
      if (!phone) {
        setError("Phone number is required");
        return false;
      }
      // Check for leading/trailing spaces
      const trimmedPhone = phone.trim();
      if (phone !== trimmedPhone) {
        setError("Phone number cannot have leading or trailing spaces");
        return false;
      }
      if (!isValidPhoneNumber(trimmedPhone)) {
        setError("Please enter a valid phone number");
        return false;
      }

      const userAlreadyMember = allUsers?.find((user) => user?.phone === trimmedPhone?.slice(1));
      if (userAlreadyMember) {
        setError("This user is already a member of your restaurant");
        return false;
      }
    }

    return true;
  };

  const handleInviteUser = async () => {
    if (!validateForm()) return;

    setError("");
    setIsLoading(true);

    try {
      // Trim values before sending to API
      const contactValue = contactType === "email" ? email.trim() : phone.trim();

      const response = await fetch("/api/inviteuser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contact: contactValue,
          contactType,
          restaurantName: restaurantDetail?.name,
          restaurantId: restaurantDetail?.id,
        }),
      });

      if (response.ok) {
        setSuccess(true);
        if (onUserInvited) {
          onUserInvited(contactValue, contactType);
        }

        setTimeout(() => {
          handleClose();
        }, 3000);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invitation");
      }
    } catch (error: any) {
      setError(error?.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const modalTitle = (
    <Box className={classes.header}>
      <Title className={classes.title}>Invite Team Member</Title>
      <Text className={classes.subtitle}>
        Send an invitation to collaborate on your restaurant&quot;s menus and dashboard
      </Text>
    </Box>
  );

  return (
    <MantineProvider>
      <CommonModal
        title={modalTitle}
        isOpen={isOpen}
        onClose={handleClose}
        onSubmit={success ? undefined : handleInviteUser}
        loading={isLoading}
        submitLabel="Send Invitation"
        dataTestId={DATA_TEST_IDS.ID.BUTTON_2}
        submitLabelColor="orange"
        hideFooter={success}
        size="lg"
        withCloseButton={false}
      >
        {!success ? (
          <Box className={classes.container}>
            <Alert icon={<IconAlertCircle size={16} />} mb={"xl"}>
              Choose your preferred invitation method. The team member will receive access to:
              <List
                className={classes.benefitsList}
                spacing="sm"
                // icon={<IconCheck size={18} color={theme.colors.blue[6]} />}
              >
                <List.Item>
                  <Group spacing="sm">
                    <IconSettings size={18} color={theme.colors.green[6]} />
                    <Text weight={500}>Menu editing and management tools</Text>
                  </Group>
                </List.Item>
                <List.Item>
                  <Group spacing="sm">
                    <IconChartBar size={18} color={theme.colors.green[6]} />
                    <Text weight={500}>Restaurant dashboard and analytics</Text>
                  </Group>
                </List.Item>
                <List.Item>
                  <Group spacing="sm">
                    <IconUsers size={18} color={theme.colors.green[6]} />
                    <Text weight={500}>Team collaboration features</Text>
                  </Group>
                </List.Item>
              </List>
            </Alert>

            <Stack spacing="lg">
              <SegmentedControl
                className={classes.segmentedControl}
                value={contactType}
                onChange={(value: "email" | "phone") => {
                  setContactType(value);
                  setError("");
                }}
                data={[
                  {
                    label: (
                      <Group spacing="sm" noWrap>
                        <IconPhone size={18} />
                        <Text size="sm" weight={500}>
                          Phone
                        </Text>
                      </Group>
                    ),
                    value: "phone",
                  },
                  {
                    label: (
                      <Group spacing="sm" noWrap>
                        <IconMail size={18} />
                        <Text size="sm" weight={500}>
                          Email
                        </Text>
                      </Group>
                    ),
                    value: "email",
                  },
                ]}
                fullWidth
              />

              <Box className={classes.inputWrapper}>
                {contactType === "email" ? (
                  <TextInput
                    className={classes.textInput}
                    placeholder='Enter team member"s email address'
                    value={email}
                    onChange={(e) => {
                      // Trim leading and trailing spaces as user types
                      const trimmedValue = e.target.value.trim();
                      setEmail(trimmedValue);
                      if (error) setError("");
                    }}
                    icon={<IconMail size={18} />}
                    data-test-id={DATA_TEST_IDS.ID.FIELD_1}
                    size="md"
                  />
                ) : (
                  <Box className={classes.phoneInputWrapper}>
                    <PhoneInput
                      placeholder='Enter team member"s phone number'
                      value={phone}
                      onChange={(value: any) => {
                        // Trim leading and trailing spaces as user types
                        const trimmedValue = value ? value.trim() : "";
                        setPhone(trimmedValue);
                        if (error) setError("");
                      }}
                      defaultCountry="US"
                      international
                      withCountryCallingCode
                      data-test-id={DATA_TEST_IDS.ID.FIELD_1}
                    />
                  </Box>
                )}

                {error && (
                  <Alert
                    className={classes.errorAlert}
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    variant="light"
                  >
                    {error}
                  </Alert>
                )}
              </Box>
            </Stack>
          </Box>
        ) : (
          <Box className={classes.successContainer}>
            <Center className={classes.successIcon}>
              <IconCheck size={40} />
            </Center>
            <Title className={classes.successTitle} order={3}>
              Invitation Sent!
            </Title>
            <Text className={classes.successText}>
              Your invitation has been sent successfully to{" "}
              <Text component="span" className={classes.highlightText}>
                {contactType === "email" ? email : phone}
              </Text>
              <br />
              They&quot;ll receive a {contactType === "email"
                ? "magic link email"
                : "SMS message"}{" "}
              to join your team.
            </Text>
          </Box>
        )}
      </CommonModal>
    </MantineProvider>
  );
};

export default InviteUserModal;
