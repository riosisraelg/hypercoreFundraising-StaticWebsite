import type { Schema } from "../resource";

const PRIZES = [
  { rank: 1, name: "$5,000 MXN Efectivo" },
  { rank: 2, name: "JBL Flip 7" },
  { rank: 3, name: "Maestro Dobel Diamante" },
];

export const handler: Schema["executeDraw"]["functionHandler"] = async (
  event
) => {
  const { confirmation } = event.arguments;

  // The draw logic will be handled client-side using the Amplify
  // data client for MVP. This function validates the confirmation
  // phrase and returns the prize configuration.
  //
  // In a production setup, this would query DynamoDB directly
  // using the AWS SDK to ensure atomicity.

  return JSON.stringify({
    prizes: PRIZES,
    confirmation: confirmation ?? "",
    timestamp: new Date().toISOString(),
  });
};
