import React, { useState, FormEvent, FocusEvent, useEffect } from "react";
import { useStripe, useElements, PaymentElement, AddressElement } from "@stripe/react-stripe-js";
import { Divider, Text, Button, Checkbox, Grid, Card, TextInput, Tooltip } from "@mantine/core";
import { useRouter } from "next/router";
import { handleError } from "../../helpers/CommonFunctions";

const CustomCheckoutForm: React.FC<{
  price: number;
  trialDays?: string | string[];
}> = (plan) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [restaurant, setRestaurant] = useState("");
  const [restaurantError, setRestaurantError] = useState("");
  const [termsAndService, setTermsAndService] = useState(false);
  const [termsAndServicesError, setTermsAndServicesError] = useState("");
  const [cardError, setCardError] = useState("");
  const router = useRouter();

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>): void => {
    const { name, value } = event.target;
    switch (name) {
      case "email":
        if (!validateEmail(value)) {
          setEmailError("Invalid email address");
        } else {
          setEmailError("");
        }
        break;
      case "restaurantName":
        if (!value) {
          setRestaurantError("Please enter your restaurant's name");
        } else {
          setRestaurantError("");
        }
        break;
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    if (!email) {
      const emailErrorMessage = "Please enter valid email";
      setEmailError(emailErrorMessage);
      handleError(emailErrorMessage, setIsLoading);
      return;
    }
    if (!restaurant) {
      setRestaurantError("Please enter restaurant name");
      handleError(restaurantError, setIsLoading);
      return;
    }

    if (!termsAndService) {
      const termsAndServiceMessage = "Agree to Flapjack Inc's terms to complete your transaction.";
      setTermsAndServicesError(termsAndServiceMessage);
      handleError(termsAndServiceMessage, setIsLoading);
      return;
    }

    const address = await elements.getElement("address")?.getValue();
    const { error: submitError } = await elements.submit();

    if (submitError) {
      handleError(`${submitError.code}: ${submitError.message}`, setIsLoading);
      return;
    }
    let timeout1: ReturnType<typeof setTimeout> | undefined;
    let timeout2: ReturnType<typeof setTimeout> | undefined;
    try {
      timeout1 = setTimeout(() => {
        handleError("Your network is slow, please give us a little more time");
      }, 3000);
      timeout2 = setTimeout(() => {
        handleError(
          "This is taking longer than expected. You can keep waiting or try to resubmit the form when your connection is better"
        );
      }, 18000);
      const response = await fetch("/api/create_payment", {
        method: "POST",
        body: JSON.stringify({
          email: email.toLowerCase(),
          name: address?.value.name,
          restaurantName: restaurant,
          plan,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        handleError(errorData.message);
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        throw new Error(`${errorData.error}`);
      } else {
        clearTimeout(timeout1);
        clearTimeout(timeout2);
        const data = await response.json();
        if (data.clientSecret) {
          const { error } = await stripe.confirmPayment({
            elements,
            clientSecret: data.clientSecret,
            confirmParams: {
              return_url: process.env.NEXT_PUBLIC_BASE_URL!,
              payment_method_data: {
                billing_details: {
                  email: email,
                },
              },
            },
            redirect: "if_required",
          });
          if (error) {
            let errorMessage = error.message ? error.message : "";
            const message =
              "We're having trouble connecting to our payment provider. You have not been charged. Please check your internet connection and try again.";
            const knownErrors = ["Unknown error reading your request.", message];

            if (knownErrors.includes(errorMessage)) {
              errorMessage = message;
            } else {
              setCardError(errorMessage);
            }
            handleError(errorMessage, setIsLoading);
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            return;
          }
        }
        router.push("/status?s=complete");
      }
    } catch (error: any) {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      handleError(error, setIsLoading);
      setIsLoading(false);
    }
  };

  return (
    <Card shadow="xs" radius="lg" withBorder className="fJ-stripe-subscription-container">
      <form onSubmit={handleSubmit}>
        <div
          style={{
            marginBottom: "2%",
          }}
        >
          <label style={{ color: "#5e5e5e", fontSize: 12, fontWeight: 500 }}>Email</label>
          <TextInput
            name="email"
            placeholder="email@email.com"
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            onBlur={handleBlur}
            error={emailError}
          />
        </div>
        <div
          style={{
            marginBottom: "5%",
          }}
        >
          <label style={{ color: "#5e5e5e", fontSize: 12, fontWeight: 500 }}>Restaurant Name</label>
          <TextInput
            name="restaurantName"
            placeholder="Restaurant Name"
            onChange={(e) => {
              setRestaurant(e.target.value), setRestaurantError("");
            }}
            onBlur={handleBlur}
            error={restaurantError}
          />
        </div>
        <label
          style={{
            marginBottom: "5%",
            color: "#5E5E5E",
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          Save payment information
        </label>
        <div style={{ marginTop: "2.5%" }}>
          <label style={{ color: "#5e5e5e", fontSize: 12, fontWeight: 500 }}>
            Card Information
          </label>
          <PaymentElement onFocus={() => setCardError("")} />
        </div>
        <div
          style={{
            marginTop: "3%",
          }}
        >
          <label
            style={{
              color: "#5e5e5e",
              fontSize: 12,
              fontWeight: 500,
              marginTop: "5%",
            }}
          >
            Cardholder name
          </label>
        </div>
        <AddressElement options={{ mode: "billing" }} />
        <Grid style={{ marginTop: "4%" }}>
          <Grid.Col span={1}>
            <Checkbox
              color="orange"
              onChange={(e) => {
                setTermsAndService(!termsAndService);
                setTermsAndServicesError("");
                setCardError("");
              }}
            />
          </Grid.Col>
          <Grid.Col span={11}>
            <Text size="sm" color="#5e5e5e">
              I agree to Flapjack Inc&rsquo;s{" "}
              <a
                style={{
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                }}
                target="blank"
                href="https://www.flapjack.co/terms-of-service"
              >
                Terms of Service
              </a>{" "}
              and{" "}
              <a
                style={{
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                }}
                target="blank"
                href="https://www.flapjack.co/privacy-policy"
              >
                Privacy Policy
              </a>
            </Text>
          </Grid.Col>
        </Grid>{" "}
        <Divider style={{ margin: "5% 0" }} />
        <Text size="xs" c="dimmed">
          If you decide to cancel your trial, you will not be charged. If you choose to keep your
          plan after the trial, the 2-week period will be considered part of your first
          month&rsquo;s service.
        </Text>
        <div
          style={{
            marginTop: "6%",
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            width: "100%",
          }}
        >
          {!stripe || !!cardError || !!emailError || !!termsAndServicesError ? (
            <Tooltip
              label={
                cardError.length
                  ? cardError
                  : !emailError.length
                  ? emailError
                  : termsAndServicesError
              }
            >
              <Button
                type="submit"
                data-disabled
                onClick={(event) => event.preventDefault()}
                style={{
                  width: "100%",
                }}
              >
                Save Card
              </Button>
            </Tooltip>
          ) : (
            <Button
              type="submit"
              loading={isLoading}
              style={{
                backgroundColor: "#FC6D20",
                width: "100%",
                color: "#652C10",
              }}
            >
              Save Card
            </Button>
          )}
        </div>
        <Text size="xs" c="dimmed" style={{ marginTop: "5%" }}>
          By saving your payment information, you allow Flapjack Inc to charge you for future
          payments in accordance with their terms.
        </Text>
        <div
          style={{
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            marginTop: "5%",
          }}
        >
          <Text size="xs" c="dimmed">
            Powered by <b>stripe</b>
          </Text>
        </div>
        <div
          style={{
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            display: "flex",
            marginTop: "2%",
          }}
        >
          <Text size="xs" c="dimmed">
            <a target="blank" href="https://www.flapjack.co/terms-of-service">
              Terms
            </a>
            &nbsp; &nbsp; &nbsp;
            <a target="blank" href="https://www.flapjack.co/privacy-policy">
              Policy
            </a>
          </Text>
        </div>
      </form>
    </Card>
  );
};

export default CustomCheckoutForm;
