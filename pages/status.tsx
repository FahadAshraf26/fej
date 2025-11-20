import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

const getStatusMessage = (status?: string) => {
  switch (status) {
    case "loading":
      return "Your request is being processed. Please wait...";
    case "complete":
      return "Credit card added successfully.";
    case "failed":
      return "Unfortunately, adding your bank details failed. Please try again or contact <a href='mailto:jessica@flapjack.co' style='color: #0000EE; '>jessica@flapjack.co</a>.";
    case "invalid":
      return "Session not found.";
    case "expired":
      return "Your session has expired.";
    default:
      return "Something went wrong. Please try again or contact <a href='mailto:jessica@flapjack.co' style='color: #0000EE; '>jessica@flapjack.co</a>.";
  }
};

export default function Return() {
  const router = useRouter();
  const status = router.query.s?.toString()
  
  return (
    <section>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <h4 dangerouslySetInnerHTML={{ __html: getStatusMessage(status) }}></h4>
      </div>
    </section>
  );
}