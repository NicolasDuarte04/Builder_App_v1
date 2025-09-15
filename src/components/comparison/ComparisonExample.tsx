// Example of how to use the ComparisonView component
// This file demonstrates the integration but would not be included in production

import { ComparisonView } from "./ComparisonView";

export function ComparisonExample() {
  return (
    <div className="container mx-auto py-8">
      {/* The ComparisonView only renders when there are 2+ items in the compare store */}
      <ComparisonView />
      
      {/* In a real implementation, you might have other components here like:
        - A button to add items to comparison
        - A list of available plans to compare
        - Brief context display
      */}
    </div>
  );
}

// Usage in a page or parent component:
// 1. Import the ComparisonView component
// 2. Place it where you want the comparison grid to appear
// 3. It automatically subscribes to the compare store and renders when 2+ items are added
// 4. Telemetry events are automatically tracked on first render
