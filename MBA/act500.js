window.wikiData.push({
  id: "act500",
  title: "ACT 500: Managerial Accounting",
  tag: "ACT 500",
  description: "An intensive, highly detailed review of internal accounting principles, cost behavior, CVP analysis, and performance evaluation based on Warren & Tayler (15th Ed).",
  chapters: [
    {
      title: "Chapter 1: Managerial Accounting and Cost Concepts",
      content: `
        <p>Unlike financial accounting, which provides historical data to external stakeholders (investors, creditors, SEC) under strict GAAP rules, managerial accounting is strictly forward-looking and internal. It provides executives with the specific, segmented data required to plan, direct, and control operations.</p>
        <h4>The Classification of Costs</h4>
        <p>To make accurate decisions, managers must understand how costs behave and how they are assigned to products.</p>
        <ul>
          <li><strong>Direct vs. Indirect Costs:</strong> <em>Direct costs</em> can be easily and cost-effectively traced to a specific cost object (e.g., the steel used in a car). <em>Indirect costs</em> cannot be easily traced and must be allocated (e.g., the factory manager's salary, factory lubrication oil).</li>
          <li><strong>Manufacturing Costs (Product Costs):</strong> Costs incurred in the factory. These are capitalized as inventory on the balance sheet until sold. They consist of:
            <ul>
              <li><em>Direct Materials:</em> Raw materials that become an integral part of the product.</li>
              <li><em>Direct Labor:</em> Touch labor directly involved in manufacturing.</li>
              <li><em>Manufacturing Overhead:</em> All indirect manufacturing costs (indirect materials, indirect labor, factory rent, factory depreciation, factory utilities).</li>
            </ul>
          </li>
          <li><strong>Nonmanufacturing Costs (Period Costs):</strong> Costs incurred outside the factory (Selling and Administrative expenses). These are expensed immediately on the income statement in the period they are incurred (e.g., CEO salary, advertising, sales commissions).</li>
        </ul>
        <p><em>Prime Costs = Direct Materials + Direct Labor.</em><br>
        <em>Conversion Costs = Direct Labor + Manufacturing Overhead.</em></p>
      `
    },
    {
      title: "Chapter 2: Cost Behavior and Cost-Volume-Profit (CVP) Analysis",
      content: `
        <p>Understanding how costs react to changes in the level of activity is the foundation of CVP analysis. Managers use this to predict how changes in costs and sales volume affect profit.</p>
        <h4>Cost Behavior Patterns</h4>
        <ul>
          <li><strong>Variable Costs:</strong> Change in total directly and proportionately with changes in activity. However, variable cost <em>per unit</em> remains constant (e.g., a $10 battery for every car produced).</li>
          <li><strong>Fixed Costs:</strong> Remain constant in total regardless of activity level within the relevant range. However, fixed cost <em>per unit</em> decreases as volume increases (e.g., a $10,000 factory lease spread over 1,000 vs. 10,000 units).</li>
          <li><strong>Mixed Costs:</strong> Contain both fixed and variable elements (e.g., a utility bill with a base flat fee plus a charge per kilowatt-hour). Managers separate these using the High-Low Method or Regression Analysis.</li>
        </ul>
        <h4>The Contribution Margin Income Statement</h4>
        <p>Traditional income statements group costs by function (COGS vs. Operating Expenses). Managerial accounting regroups them by behavior (Variable vs. Fixed) to isolate the Contribution Margin (CM).</p>
        <div class="formula-block" style="background: var(--bg-card); padding: 15px; border-left: 4px solid var(--accent); margin: 15px 0;">
          <h4 style="margin-top:0;">CVP Analytical Formulas</h4>
          <p style="font-family: var(--font-mono); font-size: 14px;">
            <strong>Contribution Margin (CM) =</strong> Sales - Total Variable Costs<br>
            <strong>CM Ratio =</strong> Total CM / Total Sales (or Unit CM / Unit Selling Price)<br><br>
            <strong>Break-Even Point (in Units) =</strong> Total Fixed Costs / Unit Contribution Margin<br>
            <strong>Break-Even Point (in Dollars) =</strong> Total Fixed Costs / CM Ratio<br><br>
            <strong>Target Profit (Units) =</strong> (Total Fixed Costs + Target Profit) / Unit CM<br>
            <strong>Margin of Safety =</strong> Actual (or Expected) Sales - Break-Even Sales
          </p>
        </div>
      `
    },
    {
      title: "Chapter 3: Job Order and Process Costing Systems",
      content: `
        <p>Companies must assign the costs of direct materials, direct labor, and overhead to products to determine profitability and value inventory.</p>
        <h4>Job Order Costing</h4>
        <p>Used in situations where many different products, jobs, or services are produced each period (e.g., custom home building, consulting firms, commercial printing). Costs are accumulated by the specific job. Because manufacturing overhead consists of indirect costs (like factory electricity), it cannot be traced directly to a job. It must be applied using a <strong>Predetermined Overhead Rate (POHR)</strong>.</p>
        <p><em>POHR = Estimated Total Manufacturing Overhead Cost / Estimated Total Amount of the Allocation Base (e.g., Direct Labor Hours).</em></p>
        <p>If a company applies more overhead to jobs than it actually incurs, overhead is <em>Overapplied</em> (increasing net operating income). If it applies less, it is <em>Underapplied</em> (decreasing net operating income).</p>
        <h4>Process Costing</h4>
        <p>Used when a company produces a continuous flow of identical units (e.g., oil refining, paper manufacturing, Coca-Cola bottling). Costs are accumulated by department rather than by job, and average unit costs are computed using <em>Equivalent Units of Production</em> to account for partially completed goods in work-in-process (WIP) inventory.</p>
      `
    },
    {
      title: "Chapter 4: Activity-Based Costing (ABC)",
      content: `
        <p>Traditional costing systems often use a single plantwide overhead rate (usually based on direct labor hours). In modern manufacturing, direct labor is shrinking while overhead (automation, engineering, IT) is exploding. Using a single rate causes systematic product cost distortion.</p>
        <h4>The ABC Framework</h4>
        <p>Activity-Based Costing solves this by recognizing that <em>products do not consume costs; products consume activities, and activities consume costs.</em></p>
        <ol>
          <li>Identify the major activities that consume resources (e.g., Machine Setups, Quality Inspections, Material Handling).</li>
          <li>Assign costs to activity cost pools.</li>
          <li>Identify the Activity Measure (Cost Driver) for each pool (e.g., Number of Setups, Number of Inspections).</li>
          <li>Calculate the Activity Rate (Total Cost in Pool / Total Activity).</li>
          <li>Assign overhead costs to products based on how much of each activity they actually consume.</li>
        </ol>
        <h4>The Hierarchy of Activities</h4>
        <p>ABC categorizes activities to prevent arbitrary allocation:</p>
        <ul>
          <li><strong>Unit-Level:</strong> Performed each time a unit is produced (e.g., machine power).</li>
          <li><strong>Batch-Level:</strong> Performed each time a batch is handled, regardless of how many units are in the batch (e.g., placing purchase orders, setting up equipment).</li>
          <li><strong>Product-Level:</strong> Relate to specific products regardless of batches or units (e.g., designing a product, marketing a product).</li>
          <li><strong>Facility-Level:</strong> Sustain the general manufacturing process (e.g., factory management, factory security).</li>
        </ul>
      `
    },
    {
      title: "Classic Academic Case Study",
      content: `
        <div class="case-block" style="background: var(--bg-hover); padding: 20px; border-radius: 8px; border-left: 5px solid var(--accent);">
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent); text-transform: uppercase;">Cost System Distortion</span>
          <h3 style="margin: 5px 0 10px; font-family: var(--font-serif);">The Classic ABC Manufacturing Shift</h3>
          <p>A classic managerial accounting scenario involves a company producing two products: a standard, high-volume product (Product A) and a complex, low-volume custom product (Product B). Under a traditional system using direct labor hours to allocate overhead, Product A absorbs the vast majority of the overhead costs because it uses the most labor hours.</p>
          <p>However, when the company implements <strong>Activity-Based Costing (ABC)</strong>, management discovers that Product B requires 10 times as many engineering redesigns, machine setups, and quality inspections per unit as Product A. Because these are <em>Batch-Level</em> and <em>Product-Level</em> activities, the traditional system was blinding management to reality. ABC reveals that the high-volume Product A was wildly profitable and actually subsidizing the custom Product B, which was secretly operating at a massive loss. This textbook realization completely alters the firm's pricing and product-mix strategy.</p>
        </div>
      `
    }
  ]
});