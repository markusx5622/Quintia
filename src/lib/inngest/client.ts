import { Inngest } from "inngest";

// Initialize the Inngest client
export const inngest = new Inngest({ 
  id: "quintia-app",
  // In production, Inngest uses INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY from env
});
