import { useState } from "react";
import { Box, Button, Card, Text, Alert, Loader } from "@mantine/core";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { useUserContext } from "@Context/UserContext";
import axios from "axios";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const UpdatePaymentMethod = () => {
  const { user } = useUserContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdatePaymentMethod = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Create a billing portal session through our API
      const { data } = await axios.post("/api/billing/portal");

      // Redirect to Stripe billing portal
      window.location.href = data.url;
    } catch (err) {
      console.error("Error updating payment method:", err);
      setError(err instanceof Error ? err.message : "Failed to update payment method");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card shadow="sm" p="lg">
      <Text size="lg" weight={500} mb="md">
        Current Payment Method
      </Text>

      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}

      {success && (
        <Alert color="green" mb="md">
          Payment method updated successfully!
        </Alert>
      )}

      <Box mt="md">
        <Button
          onClick={handleUpdatePaymentMethod}
          loading={loading}
          leftIcon={loading ? <Loader size="sm" /> : null}
        >
          {loading ? "Updating..." : "Update Payment Method"}
        </Button>
      </Box>
    </Card>
  );
};

export default UpdatePaymentMethod;
