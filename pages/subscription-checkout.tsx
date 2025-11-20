import React from "react";
import { Appearance, loadStripe, StripeElementsOptionsMode } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import SubscriptionCheckoutForm from "../components/SubscriptionCheckout/SubscriptionCheckout";
import { Space } from "@mantine/core";
import { useRouter } from "next/router";
import { TRIAL_DAYS } from "@Config/app-settings";

const pub_key: string = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
const stripePromise = loadStripe(pub_key);
const appearance: Appearance = {
  rules: {
    ".Label": {
      fontSize: "0",
    },
  },
};
const SubscriptionCheckout: React.FC = () => {
  const router = useRouter();
  const { query } = router;
  const plan = query.plan;
  const trialDays = query.td;

  let price: number;

  switch (plan) {
    case "349":
      price = 34900;
      break;
    case "399":
      price = 39900;
      break;
    default:
      price = 29900;
  }

  const options: StripeElementsOptionsMode = {
    mode: "payment",
    amount: price,
    capture_method: "manual",
    payment_method_types: ["card"],
    setup_future_usage: "off_session",
    currency: "usd",
    appearance,
  };

  return (
    <div
      className="fj-stripe-container"
      style={{
        paddingTop: 20,
        display: "flex",
        justifyContent: "center",
      }}
      id="checkout"
    >
      <div className="fj-stripe-info">
        <p
          className="fj-stripe-text"
          style={{
            fontSize: 13,
            marginBottom: 2,
          }}
        >
          $0 Upfront, Custom Menu Design, Optimization, and Management
        </p>
        <h1
          className="fj-stripe-text"
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 2,
            color: "black",
          }}
        >
          {`${
            price === 29900 && trialDays !== TRIAL_DAYS.toString()
              ? "2 week"
              : `${TRIAL_DAYS}-day free`
          } trial`}
        </h1>
        <p
          className="fj-stripe-text"
          style={{
            fontSize: 12,
            marginBottom: 12,
          }}
        >
          Then ${(price / 100).toFixed(2)} per month
        </p>
        <p
          className="fj-stripe-text"
          style={{
            fontSize: 13,
          }}
        >
          <span>
            Fully custom, eye-catching menu design, expertly crafted for your restaurant. Includes
            unlimited menu designs, unlimited menu revisions, unlimited menu optimizations, and an
            easy to use online menu editor on
          </span>{" "}
          <a
            style={{
              color: "#0070f3",
              textDecoration: "underline",
            }}
            href="https://flapjack.co"
            target="_blank"
            rel="noreferrer"
          >
            flapjack.co
          </a>
          . <span>Cancellable anytime.</span>
        </p>
      </div>
      <Space w={"xl"} />
      <Elements stripe={stripePromise} options={options}>
        <SubscriptionCheckoutForm price={price} trialDays={trialDays} />
      </Elements>
    </div>
  );
};
export default SubscriptionCheckout;
