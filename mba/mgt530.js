window.wikiData.push({
  id: "mgt530",
  title: "MGT 530: Operation Management",
  tag: "MGT 530",
  description: "Comprehensive 10+ page digital textbook review covering process design, supply chain execution, quality control, and inventory management based on Stevenson (14th Ed).",
  chapters: [
    {
      title: "Chapter 1: Introduction to Operations and Supply Chain",
      content: `
        <p>Operations management (OM) is the management of systems or processes that create goods and/or provide services. It affects the entire organization's ability to compete and survive. The core of OM is the <strong>Transformation Process</strong>, where inputs (capital, labor, information) are converted into value-added outputs (goods and services).</p>
        <h4>Goods vs. Services</h4>
        <p>A critical distinction in OM is the difference between manufacturing goods and providing services. Goods are tangible output, whereas services are acts. Key differences include:</p>
        <ul>
          <li><strong>Customer Contact:</strong> Services typically involve much higher customer contact.</li>
          <li><strong>Uniformity of Input:</strong> Services are subject to higher variability in inputs.</li>
          <li><strong>Labor Content:</strong> Services are generally more labor-intensive, while manufacturing is more capital-intensive.</li>
          <li><strong>Uniformity of Output:</strong> Manufactured goods can be highly standardized; services vary with each delivery.</li>
          <li><strong>Inventory:</strong> Goods can be stored; services cannot be stockpiled.</li>
        </ul>
        <h4>The Supply Chain</h4>
        <p>A supply chain is the sequence of organizations—their facilities, functions, and activities—that are involved in producing and delivering a product or service. It extends from basic suppliers of raw materials all the way to the final customer. Modern operations must look beyond the four walls of their own facility and optimize the entire chain.</p>
      `
    },
    {
      title: "Chapter 2: Competitiveness, Strategy, and Productivity",
      content: `
        <p>Organizations compete through some combination of price, delivery time, product or service differentiation, and quality. Operations strategy must tightly align with the overarching corporate strategy.</p>
        <h4>Order Qualifiers vs. Order Winners</h4>
        <ul>
          <li><strong>Order Qualifiers:</strong> Minimum standards of acceptability for a product or service to be considered for purchase. (e.g., A smartphone must have a touch screen).</li>
          <li><strong>Order Winners:</strong> Characteristics that cause a product or service to be perceived as better than the competition. (e.g., A smartphone's superior camera or proprietary ecosystem).</li>
        </ul>
        <h4>Productivity</h4>
        <p>Productivity is an index that measures output relative to the input used to produce it. It is critical for determining a nation's standard of living and an organization's profitability.</p>
        <div class="formula-block">
          <div class="formula-label">Productivity Formulas</div>
          <div class="formula-body">
Single-Factor Productivity = Output / Single Input (e.g., Labor hours)
Multifactor Productivity = Output / (Labor + Material + Overhead)

Example: If a team produces 500 units in 50 hours, the labor productivity is 10 units per hour.
          </div>
        </div>
      `
    },
    {
      title: "Chapter 3: Forecasting",
      content: `
        <p>Forecasting is the basis for corporate planning and control. In OM, forecasts are required for predicting demand, which drives capacity, scheduling, and inventory decisions.</p>
        <h4>Qualitative vs. Quantitative Methods</h4>
        <ul>
          <li><strong>Qualitative:</strong> Based on subjective inputs such as executive opinions, sales force composites, consumer surveys, and the Delphi method. Best used when historical data is unavailable (e.g., launching a brand new product).</li>
          <li><strong>Quantitative:</strong> Based on historical data. Includes Time-Series models (moving averages, exponential smoothing) and Associative models (linear regression).</li>
        </ul>
        <h4>Measuring Forecast Accuracy</h4>
        <p>Because all forecasts are inherently wrong, measuring the degree of error is vital.</p>
        <div class="formula-block">
          <div class="formula-label">Forecast Error Metrics</div>
          <div class="formula-body">
Error (Et) = Actual (At) - Forecast (Ft)

1. Mean Absolute Deviation (MAD): Average absolute error.
2. Mean Squared Error (MSE): Penalizes large errors heavily.
3. Mean Absolute Percent Error (MAPE): Relates the error to the actual demand percentage.
          </div>
        </div>
      `
    },
    {
      title: "Chapter 4: Strategic Capacity Planning",
      content: `
        <p>Capacity is the upper limit or ceiling on the load that an operating unit can handle. Strategic capacity planning determines the overall level of capacity-intensive resources that best supports the company's long-range competitive strategy.</p>
        <h4>Defining and Measuring Capacity</h4>
        <ul>
          <li><strong>Design Capacity:</strong> The maximum output rate or service capacity an operation, process, or facility is designed for.</li>
          <li><strong>Effective Capacity:</strong> Design capacity minus allowances such as personal time, equipment maintenance, and scheduling delays.</li>
          <li><strong>Actual Output:</strong> The rate of output actually achieved. It cannot exceed effective capacity.</li>
        </ul>
        <div class="formula-block">
          <div class="formula-label">Efficiency and Utilization</div>
          <div class="formula-body">
Efficiency = (Actual Output / Effective Capacity) * 100%
Utilization = (Actual Output / Design Capacity) * 100%
          </div>
        </div>
        <h4>Bottleneck Analysis & Theory of Constraints (TOC)</h4>
        <p>A bottleneck is an operation that has the lowest effective capacity of any operation in the facility and thus limits the system's output. According to Eliyahu Goldratt's Theory of Constraints, management must focus obsessively on maximizing the flow through the bottleneck, as an hour lost at the bottleneck is an hour lost for the entire system.</p>
      `
    },
    {
      title: "Chapter 5: Process Selection and Facility Layout",
      content: `
        <p>Process selection refers to deciding on the way production of goods or services will be organized. It has major implications for capacity planning, layout, equipment, and design of work systems.</p>
        <h4>Process Types</h4>
        <ul>
          <li><strong>Job Shop:</strong> Customized goods or services. Able to handle a wide variety of work but is slow and has high unit cost (e.g., emergency room, custom tool maker).</li>
          <li><strong>Batch:</strong> Semi-standardized goods or services. Moderate volume and variety (e.g., commercial bakery, movie theater).</li>
          <li><strong>Repetitive/Assembly:</strong> Standardized goods or services. High volume, low variety (e.g., automobile assembly line, car wash).</li>
          <li><strong>Continuous:</strong> Highly standardized goods or services. Very high volume, no variety (e.g., oil refinery, water treatment plant).</li>
        </ul>
        <h4>Layout Types</h4>
        <p>The layout must match the process type. <strong>Product Layouts</strong> (assembly lines) are used for repetitive processing. <strong>Process Layouts</strong> (departments) group similar activities together and are used for job shops. <strong>Fixed-Position Layouts</strong> keep the product stationary while workers and equipment come to the product (e.g., constructing a commercial aircraft or a residential villa).</p>
      `
    },
    {
      title: "Chapter 6: Quality Management and Six Sigma",
      content: `
        <p>Quality management is foundational to modern operations. Poor quality leads to loss of business, liability, decreased productivity, and increased costs.</p>
        <h4>The Costs of Quality</h4>
        <ul>
          <li><strong>Appraisal Costs:</strong> Costs of activities designed to ensure quality or uncover defects (e.g., inspectors, testing equipment).</li>
          <li><strong>Prevention Costs:</strong> Costs of preventing defects from occurring (e.g., training, quality planning, supplier capability evaluations).</li>
          <li><strong>Internal Failure Costs:</strong> Costs incurred to fix problems that are detected *before* the product/service is delivered to the customer (e.g., rework, scrap).</li>
          <li><strong>External Failure Costs:</strong> Costs incurred to fix problems that are detected *after* delivery to the customer (e.g., warranty claims, recalls, loss of reputation). These are by far the most expensive.</li>
        </ul>
        <h4>Total Quality Management (TQM)</h4>
        <p>A philosophy that involves everyone in an organization in a continual effort to improve quality and achieve customer satisfaction. It requires a relentless pursuit of continuous improvement (Kaizen) and treating suppliers as partners.</p>
        <h4>Six Sigma (DMAIC)</h4>
        <p>A business process for improving quality, reducing costs, and increasing customer satisfaction. Statistically, it means having no more than 3.4 defects per million opportunities in any process. The methodology relies on DMAIC: Define, Measure, Analyze, Improve, and Control.</p>
      `
    },
    {
      title: "Chapter 7: Inventory Management",
      content: `
        <p>Inventory management is a core responsibility. Inventory represents a massive capital investment for a firm, and poor management leads to stockouts (lost sales) or excessive holding costs.</p>
        <h4>Types of Inventory</h4>
        <p>Raw materials, Work-in-Process (WIP), Finished goods, Tools and supplies, and Goods-in-transit (pipeline inventory).</p>
        <h4>The Economic Order Quantity (EOQ) Model</h4>
        <p>The EOQ model identifies the optimal order quantity by minimizing the sum of certain annual costs that vary with order size and order frequency.</p>
        <div class="formula-block">
          <div class="formula-label">EOQ and Total Cost</div>
          <div class="formula-body">
EOQ = √ [ (2 * D * S) / H ]

Where:
D = Annual Demand in units
S = Ordering cost per order
H = Holding (carrying) cost per unit per year

Total Cost (TC) = (Q/2)*H + (D/Q)*S
          </div>
        </div>
        <h4>Reorder Point (ROP)</h4>
        <p>While EOQ tells you *how much* to order, ROP tells you *when* to order. It is the inventory level at which a new order should be placed to avoid a stockout during the lead time.</p>
        <p><em>ROP = Expected Demand during Lead Time + Safety Stock</em></p>
      `
    },
    {
      title: "Chapter 8: JIT and Lean Operations",
      content: `
        <p>Lean operations represent a shift from traditional 'Push' manufacturing to 'Pull' manufacturing. The ultimate goal is a balanced system that achieves a smooth, rapid flow of materials and/or work through the system.</p>
        <h4>The Toyota Production System (TPS)</h4>
        <p>Lean principles originate from TPS. Key pillars include:</p>
        <ul>
          <li><strong>Elimination of Waste (Muda):</strong> Identifying and eliminating overproduction, waiting time, unnecessary transportation, over-processing, excess inventory, unnecessary motion, and product defects.</li>
          <li><strong>Just-in-Time (JIT):</strong> Producing and delivering the right items at the right time in the right amounts.</li>
          <li><strong>Autonomation (Jidoka):</strong> Quality at the source. Empowering workers to stop the production line (using an Andon cord) the moment a defect is spotted.</li>
          <li><strong>Kanban:</strong> A manual system that signals the need for parts or materials from the downstream process to the upstream process.</li>
        </ul>
        <p>Implementing Lean requires reducing setup times, utilizing small lot sizes, and establishing deeply integrated, highly reliable relationships with a small number of suppliers.</p>
      `
    },
    {
      title: "Classic Academic Case Study",
      type: "cases",
      content: [
        {
          tag: "Lean Supply Chain Execution",
          title: "Dell's Direct-to-Consumer Operations",
          body: "<p>Dell Computers completely bypassed traditional retail distribution networks by utilizing a highly optimized, Lean operations model. They operated on a strictly <strong>'Pull'</strong> basis—a computer was not manufactured until a customer order was placed and paid for. This generated negative working capital (Dell got paid before they paid their suppliers). By locating supplier warehouses within miles of their assembly plants and requiring JIT deliveries every two hours, Dell held less than 4 days of inventory, compared to weeks or months held by competitors like HP. This minimized holding costs and eliminated the risk of components becoming technologically obsolete while sitting in a warehouse, demonstrating the immense financial power of a synchronized, Lean supply chain.</p>"
        }
      ]
    }
  ]
});
