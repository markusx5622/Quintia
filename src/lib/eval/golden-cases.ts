import { GoldenCase } from "./types";

export const GOLDEN_CASES: GoldenCase[] = [
  {
    id: "procurement-001",
    name: "Manual Procurement Approval Bottleneck",
    narrative: `The procurement department receives purchase requests via email. 
A procurement officer manually reviews each request for completeness. 
If the request is over $5000, it must be sent to the Finance Manager for manual approval.
The Finance Manager takes average 3 days to respond. 
Once approved, the procurement officer manually enters the data into the SAP ERP system.
The high volume of requests and manual handoffs cause significant delays and lacks real-time visibility.`,
    expected_entities: [
      "Procurement Officer",
      "Finance Manager",
      "SAP ERP",
      "Purchase Request",
      "Email"
    ],
    expected_bottleneck_keywords: [
      "manual approval",
      "Finance Manager",
      "delays",
      "handoff"
    ],
    expected_improvement_types: [
      "automation",
      "optimization"
    ]
  }
];
