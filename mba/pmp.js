window.wikiData.push({
  id: "pmp",
  title: "PMP: Project Management",
  tag: "PMP",
  description: "An exhaustive, module-by-module breakdown of the PMBOK Guide. Covers the 10 Knowledge Areas, advanced Earned Value Management, and Agile methodologies.",
  chapters: [
    {
      title: "Module 1: Project Integration Management",
      content: `
        <p>Integration Management is the only Knowledge Area that cannot be delegated; it is the core responsibility of the Project Manager to coordinate all other areas into a unified whole.</p>
        <h4>The Project Charter</h4>
        <p>The foundational document that officially brings the project into existence. It links the project to the strategic objectives of the organization, documents high-level constraints, and formally grants the Project Manager the authority to apply organizational resources to project activities.</p>
        <h4>Perform Integrated Change Control</h4>
        <p>In predictive lifecycles, unauthorized changes lead to scope creep. Every requested change must be documented, analyzed for its impact across all constraints (time, cost, risk, quality), and formally approved or rejected by a Change Control Board (CCB) before any work is performed.</p>
      `
    },
    {
      title: "Module 2: Project Scope Management",
      content: `
        <p>Scope management ensures the project includes all the work required, and <em>only</em> the work required. It protects the project from <strong>Gold Plating</strong> (adding unrequested features to "delight" the customer) and <strong>Scope Creep</strong>.</p>
        <h4>The Work Breakdown Structure (WBS)</h4>
        <p>The WBS is a hierarchical, deliverable-oriented decomposition of the total scope of work. It breaks massive project deliverables down into highly manageable components.</p>
        <ul>
          <li><strong>Work Package:</strong> The lowest level of the WBS. A work package is granular enough that its duration and cost can be accurately estimated, and it can be assigned to a specific individual or team.</li>
          <li><strong>Scope Baseline:</strong> The approved version of a scope statement, WBS, and its associated WBS dictionary. It can only be changed through formal Integrated Change Control.</li>
        </ul>
      `
    },
    {
      title: "Module 3: Project Schedule Management",
      content: `
        <p>Schedule management dictates the timeline of the project. It relies heavily on Precedence Diagramming Methods (PDM) to map dependencies (Finish-to-Start, Start-to-Start, etc.).</p>
        <h4>The Critical Path Method (CPM)</h4>
        <p>The Critical Path is the sequence of activities that represents the longest path through a project, determining the shortest possible project duration. It has mathematically <strong>zero total float (slack)</strong>. A delay of one day on the critical path delays the entire project by one day.</p>
        <h4>Schedule Compression</h4>
        <ul>
          <li><strong>Crashing:</strong> Shortening the schedule duration for the least incremental cost by adding resources (e.g., approving overtime, paying for expedited shipping). <em>Rule: Crashing always increases project cost.</em></li>
          <li><strong>Fast-Tracking:</strong> Performing activities in parallel that would normally be done in sequence. <em>Rule: Fast-tracking always increases project risk and the likelihood of rework.</em></li>
        </ul>
      `
    },
    {
      title: "Module 4: Project Cost Management & EVM",
      content: `
        <p>Cost management involves planning, estimating, budgeting, and controlling costs. Project managers use estimating techniques like Analogous (historical, fast but less accurate), Parametric (statistical algorithms), and Bottom-Up (highly accurate but time-consuming).</p>
        <div style="background: var(--bg-hover); padding: 15px; border-left: 4px solid var(--accent); margin: 20px 0;">
          <h4 style="margin-top: 0; color: var(--text-primary);">Earned Value Management (EVM)</h4>
          <p>EVM integrates scope, schedule, and cost baselines to objectively measure project performance.</p>
          <ul style="font-family: var(--font-mono); font-size: 14px;">
            <li><strong>Cost Variance (CV) = EV - AC</strong> <em>(Negative means you are over budget)</em></li>
            <li><strong>Schedule Variance (SV) = EV - PV</strong> <em>(Negative means you are behind schedule)</em></li>
            <li><strong>Cost Performance Index (CPI) = EV / AC</strong> <em>(< 1.0 indicates a cost overrun for work completed)</em></li>
            <li><strong>Schedule Performance Index (SPI) = EV / PV</strong> <em>(< 1.0 indicates progress is slower than planned)</em></li>
            <li><strong>Estimate at Completion (EAC) = BAC / CPI</strong> <em>(Forecasts total final cost based on current efficiency)</em></li>
            <li><strong>To-Complete Performance Index (TCPI) = (BAC - EV) / (BAC - AC)</strong> <em>(The efficiency rate the team must maintain for the rest of the project to finish on budget)</em></li>
          </ul>
        </div>
      `
    },
    {
      title: "Module 5: Project Quality Management",
      content: `
        <p>Quality management ensures the project satisfies the needs for which it was undertaken, focusing heavily on prevention over inspection.</p>
        <h4>Cost of Quality (CoQ)</h4>
        <ul>
          <li><strong>Cost of Conformance:</strong> Money spent to avoid failures (Prevention costs like training and design validation; Appraisal costs like testing and destructive inspections).</li>
          <li><strong>Cost of Non-Conformance:</strong> Money spent because of failures (Internal failure costs like scrap and rework; External failure costs like warranty work, legal liabilities, and lost reputation).</li>
        </ul>
        <p><strong>Control Charts:</strong> Used to determine whether a process is stable or has predictable performance. If a data point falls outside the upper or lower control limits, or if seven consecutive points fall on one side of the mean (the Rule of Seven), the process is out of control and requires immediate investigation.</p>
      `
    },
    {
      title: "Module 6: Project Resource Management",
      content: `
        <p>Resource management involves identifying, acquiring, and managing the human and physical resources needed for the project.</p>
        <h4>Tuckman’s Ladder of Team Development</h4>
        <p>Teams predictably evolve through five stages: 1) <strong>Forming</strong> (polite, independent), 2) <strong>Storming</strong> (conflict, jockeying for position), 3) <strong>Norming</strong> (resolving conflict, establishing processes), 4) <strong>Performing</strong> (high efficiency, interdependence), and 5) <strong>Adjourning</strong>.</p>
        <h4>Conflict Resolution Techniques</h4>
        <ul>
          <li><strong>Collaborating/Problem Solving:</strong> Incorporating multiple viewpoints for a consensus (Win-Win).</li>
          <li><strong>Compromising/Reconciling:</strong> Finding solutions that bring some degree of satisfaction to all parties (Lose-Lose).</li>
          <li><strong>Forcing/Directing:</strong> Pushing one's viewpoint at the expense of others (Win-Lose).</li>
          <li><strong>Smoothing/Accommodating:</strong> Emphasizing areas of agreement rather than differences to maintain harmony.</li>
        </ul>
      `
    },
    {
      title: "Module 7: Project Communications Management",
      content: `
        <p>A Project Manager spends roughly 90% of their time communicating. Effective communication prevents misunderstandings that cause scope creep and stakeholder dissatisfaction.</p>
        <h4>Communication Channels Formula</h4>
        <p>As the number of stakeholders increases, the complexity of communication grows exponentially. The formula to calculate potential communication channels is: <strong>N(N-1) / 2</strong> (where N is the number of stakeholders).</p>
        <h4>Communication Methods</h4>
        <ul>
          <li><strong>Interactive:</strong> Multidirectional exchange (e.g., meetings, phone calls).</li>
          <li><strong>Push:</strong> Sent to specific recipients who need to receive the info (e.g., emails, memos, status reports). Ensures distribution but not comprehension.</li>
          <li><strong>Pull:</strong> Used for very large volumes of info or large audiences; requires recipients to access the content at their own discretion (e.g., intranet sites, e-learning).</li>
        </ul>
      `
    },
    {
      title: "Module 8: Project Risk Management",
      content: `
        <p>Risk is an uncertain event that can have a negative (Threat) or positive (Opportunity) impact on project objectives. Advanced risk analysis uses quantitative tools like <strong>Expected Monetary Value (EMV)</strong> (Probability × Financial Impact) and <strong>Monte Carlo Simulations</strong>.</p>
        <h4>Risk Response Strategies for Threats</h4>
        <ul>
          <li><strong>Avoid:</strong> Changing the project management plan to eliminate the threat entirely.</li>
          <li><strong>Transfer:</strong> Shifting the financial impact of a threat, along with ownership of the response, to a third party (e.g., buying insurance, using fixed-price contracts).</li>
          <li><strong>Mitigate:</strong> Acting to reduce the probability or impact of a risk.</li>
          <li><strong>Accept:</strong> Taking no action unless the risk occurs, but establishing a contingency reserve.</li>
        </ul>
      `
    },
    {
      title: "Module 9: Project Procurement Management",
      content: `
        <p>Procurement involves purchasing products or services from outside the project team. The contract type dictates which party holds the financial risk.</p>
        <ul>
          <li><strong>Firm-Fixed-Price (FFP):</strong> The price is legally set. The <em>Seller</em> holds maximum risk because they must absorb any cost overruns.</li>
          <li><strong>Time and Materials (T&M):</strong> Often used for staff augmentation where the exact scope is unknown. The <em>Buyer</em> holds moderate to high risk because total cost is undefined.</li>
          <li><strong>Cost-Plus-Fixed-Fee (CPFF):</strong> The seller is reimbursed for all allowable costs plus a fixed fee. The <em>Buyer</em> holds maximum risk because the seller lacks an incentive to control costs.</li>
        </ul>
      `
    },
    {
      title: "Module 10: Project Stakeholder Management",
      content: `
        <p>Stakeholders are individuals or groups that may affect or be affected by the project. A primary failure point in project management is failing to identify all stakeholders early.</p>
        <h4>The Power/Interest Grid</h4>
        <p>A tool used to group stakeholders based on their level of authority (Power) and concern (Interest):</p>
        <ul>
          <li><strong>High Power / High Interest:</strong> Manage Closely. These are the key players.</li>
          <li><strong>High Power / Low Interest:</strong> Keep Satisfied. Meet their needs, but do not overwhelm them with deep technical details.</li>
          <li><strong>Low Power / High Interest:</strong> Keep Informed. They can become allies or cause trouble by lobbying those with power.</li>
          <li><strong>Low Power / Low Interest:</strong> Monitor. Do not spend excessive energy here, but watch for shifts in their status.</li>
        </ul>
      `
    },
    {
      title: "Module 11: Agile and Adaptive Lifecycles",
      content: `
        <p>While Predictive (Waterfall) lifecycles manage risk through heavy upfront planning, Adaptive (Agile) lifecycles manage risk through frequent, incremental delivery of working software.</p>
        <h4>The Scrum Framework</h4>
        <ul>
          <li><strong>The Roles:</strong> The <em>Product Owner</em> maximizes business value and manages the Product Backlog. The <em>Scrum Master</em> is a servant-leader who removes impediments. The <em>Development Team</em> is cross-functional and self-organizing.</li>
          <li><strong>The Artifacts:</strong> The <em>Product Backlog</em> (a prioritized list of all desired features), the <em>Sprint Backlog</em> (items selected for the current iteration), and the <em>Increment</em> (working, shippable software).</li>
          <li><strong>The Events:</strong> The <em>Sprint</em> (a timebox of 1-4 weeks), <em>Sprint Planning</em>, <em>Daily Scrum</em> (a 15-minute synchronization), <em>Sprint Review</em> (demonstrating the product to stakeholders), and the <em>Sprint Retrospective</em> (team process improvement).</li>
        </ul>
      `
    },
    {
      title: "Module 12: Classic Academic Case Studies",
      type: "cases",
      content: [
        {
          tag: "Scope Creep & EVM Failures",
          title: "The Denver International Airport Baggage System",
          body: "<p>The catastrophic failure of DIA's automated baggage system illustrates the dangers of ignoring <strong>Scope Management</strong> and <strong>Earned Value (EVM)</strong>. Management ignored terrible Schedule Performance Index (SPI) numbers early on and failed to use a proper Work Breakdown Structure (WBS) to contain the changing requirements. The cascading failures ultimately delayed the $4.8 billion airport by 16 months.</p>"
        },
        {
          tag: "Lifecycle Selection & Agile",
          title: "The FBI Virtual Case File (VCF)",
          body: "<p>In the early 2000s, the FBI attempted to digitize its paper-based tracking system using a rigid <strong>Predictive (Waterfall)</strong> methodology. Because software requirements are inherently volatile, the FBI's needs changed repeatedly. Because Waterfall rigidly resists scope changes through formal Change Control, the contractor kept building to outdated specifications. After spending $170 million, the system was scrapped. This case proves that high-uncertainty projects require an <strong>Adaptive (Agile)</strong> lifecycle to accommodate rapid requirement pivots through iterative Sprints.</p>"
        }
      ]
    }
  ]
});
