window.wikiData.push({
  id: "fin500",
  title: "FIN 500: Principles of Finance",
  tag: "FIN 500",
  description: "Deep-dive analysis of corporate valuation, capital budgeting, the Time Value of Money (TVM), and risk assessment based on Keown, Martin, & Petty.",
  chapters: [
    {
      title: "Chapter 1: The Financial Environment and Goal of the Firm",
      content: `
        <p>The fundamental objective of corporate financial management is to maximize shareholder wealth. This is distinctly different from simply 'maximizing profits' because accounting profits do not account for cash flow timing or the risk associated with those cash flows.</p>
        <h4>The Five Axioms of Finance</h4>
        <ol>
          <li><strong>The Risk-Return Trade-off:</strong> Investors will not take on additional risk unless they expect to be compensated with additional return.</li>
          <li><strong>The Time Value of Money (TVM):</strong> A dollar received today is worth more than a dollar received in the future because it can be invested to earn interest immediately.</li>
          <li><strong>Cash—Not Profits—Is King:</strong> Accounting profits are calculated using accrual accounting. Finance focuses strictly on actual cash flows because only cash can be reinvested or paid out as dividends.</li>
          <li><strong>Incremental Cash Flows:</strong> The only cash flows that matter in an investment decision are the <em>incremental</em> changes—the cash flows that occur <em>only if</em> the project is accepted.</li>
          <li><strong>The Curse of Competitive Markets:</strong> It is difficult to find exceptionally profitable projects in highly competitive markets. Abnormal returns attract new entrants, driving returns down to the baseline required rate.</li>
        </ol>
      `
    },
    {
      title: "Chapter 2: The Time Value of Money (TVM) and Complex Cash Flows",
      content: `
        <p>TVM is the mathematical foundation of all financial valuation. While basic Present Value (PV) and Future Value (FV) calculate single sums, corporate finance frequently deals with complex cash flow streams.</p>
        <h4>Annuities and Perpetuities</h4>
        <ul>
          <li><strong>Ordinary Annuity vs. Annuity Due:</strong> An annuity is a series of equal cash flows occurring at regular intervals. In an <em>Ordinary Annuity</em>, payments occur at the end of the period (e.g., typical corporate bonds). In an <em>Annuity Due</em>, payments occur at the beginning of the period (e.g., commercial leases). An Annuity Due will always have a higher present and future value because the money earns interest for an extra period.</li>
          <li><strong>Perpetuities:</strong> An annuity that continues forever (infinite life). The Present Value of a perpetuity is calculated simply as: <strong>PV = C / r</strong> (where C is the cash flow and r is the discount rate). Preferred stock is often valued as a perpetuity.</li>
        </ul>
        <h4>Compounding Frequency (APR vs. EAR)</h4>
        <p>The Annual Percentage Rate (APR) is the stated, nominal rate. However, if interest compounds more frequently than annually (e.g., monthly or daily), the <strong>Effective Annual Rate (EAR)</strong> must be used to find the true economic cost or return. EAR will always be higher than APR when compounding occurs more than once a year.</p>
      `
    },
    {
      title: "Chapter 3: Risk, Return, and the Capital Asset Pricing Model (CAPM)",
      content: `
        <p>In finance, risk refers to the variability of returns. Total risk is divided into <em>Unsystematic Risk</em> (diversifiable, company-specific risk) and <em>Systematic Risk</em> (non-diversifiable, market-wide risk). Investors are only compensated for bearing Systematic Risk.</p>
        <h4>The Capital Asset Pricing Model (CAPM) and the SML</h4>
        <p>CAPM determines the required rate of return for an asset based exclusively on its systematic risk, measured by <strong>Beta (β)</strong>.</p>
        <p><strong>The Security Market Line (SML):</strong> The graphical representation of CAPM. It plots expected return against Beta. Any asset priced fairly will fall exactly on the SML. Assets above the line are undervalued (offering higher expected returns for their risk); assets below are overvalued.</p>
        <h4>Assumptions and Limitations of CAPM</h4>
        <ul>
          <li><strong>Assumptions:</strong> CAPM assumes highly efficient markets, that all investors are rational and risk-averse, that there are no taxes or transaction costs, and that investors can borrow and lend unlimited amounts at the risk-free rate.</li>
          <li><strong>Empirical Limitations:</strong> In reality, Beta is highly unstable and changes over time. Furthermore, empirical challenges (like the Fama-French three-factor model) have proven that Beta alone does not fully explain the cross-section of expected stock returns; factors like firm size and value-growth ratios also matter.</li>
        </ul>
      `
    },
    {
      title: "Chapter 4: Capital Budgeting & WACC",
      content: `
        <p>Capital budgeting is the process of planning and managing a firm's long-term investments.</p>
        <h4>NPV vs. IRR: Advanced Conflicts</h4>
        <p>While Net Present Value (NPV) and Internal Rate of Return (IRR) generally lead to the same accept/reject decisions for independent projects, they conflict when projects are mutually exclusive. This occurs due to:</p>
        <ul>
          <li><strong>Scale and Timing Problems:</strong> IRR ignores the scale of the project. A 50% return on a $10 investment is worse than a 10% return on a $1,000,000 investment. Always rely on NPV, as it measures absolute wealth creation.</li>
          <li><strong>The Multiple IRR Issue:</strong> If a project has non-conventional cash flows (e.g., negative cash flows occurring in the middle or end of the project life, such as environmental cleanup costs), the math generates multiple IRRs, rendering the metric useless.</li>
        </ul>
        
        <div style="background: var(--bg-hover); padding: 15px; border-left: 4px solid var(--accent); margin: 20px 0;">
          <h4 style="margin-top: 0; color: var(--text-primary);">Expanded Academic Framework: Weighted Average Cost of Capital (WACC)</h4>
          <p>The Weighted Average Cost of Capital (WACC) represents the firm’s overall required return on its existing assets and serves as the primary discount rate in capital budgeting decisions. In Keown’s Foundations of Finance, WACC is a central concept because it integrates financing decisions with investment evaluation.</p>
          <p>WACC is calculated as the weighted average of the cost of each component of capital, typically debt and equity, based on their proportion in the firm’s capital structure. The formula is:</p>
          <p style="font-family: var(--font-mono); font-size: 14px; text-align: center; margin: 10px 0;"><strong>WACC = (E / V) × Re + (D / V) × Rd × (1 − Tc)</strong></p>
          <p>Where E represents the market value of equity, D represents the market value of debt, V is the total firm value (E + D), Re is the cost of equity, Rd is the cost of debt, and Tc is the corporate tax rate.</p>
          <p>The cost of equity (Re) is usually estimated using the Capital Asset Pricing Model (CAPM), which reflects the return required by shareholders based on systematic risk. This creates a direct link between market risk and corporate investment decisions. In contrast, the cost of debt (Rd) is based on the firm’s borrowing rate, adjusted for taxes because interest payments are tax-deductible. This tax shield lowers the effective cost of debt and is a key reason firms use leverage.</p>
          <p>The weighting in WACC must be based on market values, not book values, because market values reflect the true economic cost of financing. This distinction is critical at the MBA level and often tested.</p>
          <p>WACC is used as the discount rate in Net Present Value (NPV) analysis for projects with risk similar to the firm’s existing operations. If a project’s expected return exceeds WACC, it creates value and should be accepted. If it falls below WACC, it destroys shareholder value.</p>
          <p>However, Keown emphasizes that WACC is not static. It changes with:</p>
          <ul>
            <li>Capital structure decisions (more debt vs equity)</li>
            <li>Market conditions (interest rates, risk premiums)</li>
            <li>Firm risk profile (beta changes)</li>
          </ul>
          <p>An important extension is the concept of an optimal capital structure, where WACC is minimized and firm value is maximized. While increasing debt initially lowers WACC due to the tax shield, excessive leverage increases financial risk and raises both the cost of equity and debt, eventually increasing WACC.</p>
          <p>Therefore, WACC is not just a calculation—it is a strategic tool that connects financing, risk, and investment decisions. Misestimating WACC can lead to systematic overinvestment or underinvestment, making it one of the most critical concepts in corporate finance. Additionally, for projects that carry significantly higher or lower risk than the firm's baseline operations, managers must use <em>Risk-Adjusted Discount Rates</em> rather than the firm-wide WACC.</p>
        </div>
      `
    },
    {
      title: "Classic Academic Case Studies",
      type: "cases",
      content: [
        {
          tag: "Capital Budgeting & WACC",
          title: "Boeing's 777 Aircraft Investment",
          body: "<p>The development of the Boeing 777 is a classic textbook study in massive-scale capital budgeting and the sensitivity of NPV to the discount rate. Boeing executives had to project cash outflows (engineering, tooling, testing) and inflows (projected airline orders) over decades. Applying <strong>Time Value of Money (TVM)</strong> principles, cash inflows expected 15 years in the future were heavily discounted back to Present Value. Because the aerospace industry has a high Beta (Systematic Risk), Boeing's Cost of Equity was high, driving up their WACC. However, the use of debt financing (benefiting from the tax shield) helped optimize their WACC. The NPV remained highly positive when discounted at this rate, justifying the massive capital expenditure and proving that disciplined WACC and NPV analysis is vital for corporate survival.</p>"
        }
      ]
    }
  ]
});
