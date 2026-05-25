window.wikiData.push({
  id: "ecom500",
  title: "ECOM 500: Business and IT",
  tag: "ECOM 500",
  description: "An extensive review of Turban's Information Technology for Management, focusing on enterprise architectures, cloud computing, and digital transformation.",
  chapters: [
    {
      title: "Chapter 1: Digital Transformation and Enterprise Systems",
      content: `
        <p>Information Technology (IT) is no longer a support function; it is the primary driver of corporate strategy, enabling digital transformation—the profound altering of business processes, competencies, and models to fully leverage digital technologies.</p>
        <h4>Enterprise Resource Planning (ERP)</h4>
        <p>ERP systems act as the central nervous system of an enterprise. Historically, organizations suffered from "data silos" (e.g., HR, Finance, and Manufacturing all using different, disconnected software). ERP integrates all internal and external management information across an entire organization into a single, unified database. When a customer order is placed, inventory is automatically reserved, accounting ledgers are updated, and manufacturing schedules are adjusted in real-time.</p>
        <h4>CRM and SCM</h4>
        <ul>
          <li><strong>Customer Relationship Management (CRM):</strong> Systems designed to manage all interactions with current and prospective customers, utilizing data analytics to increase retention and drive sales (e.g., Salesforce).</li>
          <li><strong>Supply Chain Management (SCM):</strong> Software that oversees the flow of materials, information, and finances as they move from supplier to manufacturer to wholesaler to retailer to consumer.</li>
        </ul>
      `
    },
    {
      title: "Chapter 2: Cloud Computing and IT Architecture",
      content: `
        <p>Cloud computing represents a paradigm shift from a Capital Expenditure (CapEx) model—where firms buy and maintain their own expensive servers—to an Operating Expenditure (OpEx) model, where computing power is rented as a utility on demand.</p>
        <h4>The Three Primary Cloud Service Models</h4>
        <ul>
          <li><strong>Infrastructure as a Service (IaaS):</strong> The provider offers raw computing resources over the internet (virtual machines, networking, storage). The client manages the operating systems and applications. Example: Amazon Web Services (AWS) EC2.</li>
          <li><strong>Platform as a Service (PaaS):</strong> The provider delivers a framework and environment for developers to build, test, and deploy applications without worrying about the underlying infrastructure. Example: Google App Engine, Heroku.</li>
          <li><strong>Software as a Service (SaaS):</strong> The provider hosts and delivers a fully functional software application accessed via a web browser. The client manages nothing but their own user data. Example: Microsoft 365, Workday.</li>
        </ul>
      `
    },
    {
      title: "Chapter 3: Business Intelligence and Data Analytics",
      content: `
        <p>Modern enterprises generate massive volumes of data. Business Intelligence (BI) comprises the strategies and technologies used by enterprises for the data analysis of business information.</p>
        <h4>The Analytics Continuum</h4>
        <ol>
          <li><strong>Descriptive Analytics:</strong> Answers <em>"What happened?"</em> Uses historical data, standard reporting, and dashboards to track KPIs.</li>
          <li><strong>Predictive Analytics:</strong> Answers <em>"What could happen?"</em> Uses statistical models, forecasting, and machine learning to predict future trends based on historical patterns.</li>
          <li><strong>Prescriptive Analytics:</strong> Answers <em>"What should we do?"</em> Uses optimization and simulation algorithms to advise on possible outcomes and recommend optimal actions.</li>
        </ol>
        <h4>Big Data Characteristics (The 4 V's)</h4>
        <p>Big Data is defined by its <strong>Volume</strong> (massive amounts of data), <strong>Velocity</strong> (generated at incredible speed), <strong>Variety</strong> (structured numbers, unstructured text, video, sensors), and <strong>Veracity</strong> (the uncertainty or reliability of the data).</p>
      `
    },
    {
      title: "Chapter 4: Cybersecurity and Risk Management",
      content: `
        <p>As businesses digitize, cyber risk becomes a primary boardroom concern. Information security is built around the <strong>CIA Triad</strong>:</p>
        <ul>
          <li><strong>Confidentiality:</strong> Ensuring that data is accessed only by authorized individuals (e.g., via encryption and multi-factor authentication).</li>
          <li><strong>Integrity:</strong> Ensuring that data is accurate and has not been tampered with by unauthorized parties.</li>
          <li><strong>Availability:</strong> Ensuring that systems and data are available to authorized users when needed (e.g., mitigating Distributed Denial of Service - DDoS - attacks).</li>
        </ul>
        <p>The weakest link in any IT security architecture is human behavior, making Social Engineering (e.g., Phishing) a greater threat than brute-force hacking.</p>
      `
    },
    {
      title: "Classic Academic Case Study",
      content: `
        <div class="case-block" style="background: var(--bg-hover); padding: 20px; border-radius: 8px; border-left: 5px solid var(--accent);">
          <span style="font-family: var(--font-mono); font-size: 11px; color: var(--accent); text-transform: uppercase;">Enterprise Systems Failure</span>
          <h3 style="margin: 5px 0 10px; font-family: var(--font-serif);">Hershey's ERP Implementation Disaster</h3>
          <p>The 1999 Hershey Foods implementation of SAP’s ERP system is one of the most studied IT failures in business history. Hershey attempted a "Big Bang" implementation—switching on multiple complex modules (ERP, CRM, and SCM) simultaneously, right before their busiest season (Halloween).</p>
          <p>The academic takeaway is that IT implementation is fundamentally an <em>Organizational Change</em> issue, not just a technical one. Because they rushed the timeline, employees were inadequately trained on the new system, and massive amounts of data were improperly migrated. As a result, the system could not process orders properly; Hershey had the candy sitting in warehouses but the ERP system could not tell the trucks where to deliver it. The IT failure resulted in a $100 million shortfall in sales and a 19% drop in third-quarter profits, proving that technology must be perfectly aligned with human processes and realistic rollout timelines.</p>
        </div>
      `
    }
  ]
});