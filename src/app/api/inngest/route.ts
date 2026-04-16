import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { quintiaPipeline } from "@/lib/inngest/functions";

// Export the Inngest serve route
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    quintiaPipeline,
  ],
});
