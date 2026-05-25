window.wikiData.push({
  id: "ecn500",
  title: "ECN 500: Global Economics",
  tag: "ECN 500",
  description: "Comprehensive review of macroeconomic principles governing global trade, commercial policy, tariffs, and exchange rate environments (Carbaugh, 18th Ed).",
  chapters: [
    {
      title: "Chapter 1: Foundations of International Trade",
      content: `
        <p>The foundation of global economics is understanding why nations trade and how trade affects domestic and global welfare. Trade allows nations to consume beyond their domestic Production Possibility Frontier (PPF).</p>
        <h4>Absolute vs. Comparative Advantage</h4>
        <ul>
          <li><strong>Absolute Advantage (Adam Smith):</strong> A country has an absolute advantage if it can produce a good using fewer resources than another country.</li>
          <li><strong>Comparative Advantage (David Ricardo):</strong> A nation should specialize in the good where its <em>opportunity cost</em> is lowest. By comparing cost ratios, even if a country is absolutely less efficient in producing all goods, trade remains mutually beneficial by expanding the consumption possibilities for both nations.</li>
        </ul>
        <h4>Modern Trade Theories: The Heckscher-Ohlin Framework</h4>
        <p>While Ricardo focused on labor productivity, the <strong>Heckscher-Ohlin (Factor Endowment) Theory</strong> asserts that comparative advantage is determined by a nation's relative endowments of labor, capital, and land. A country exports goods that make intensive use of its relatively abundant factors of production.</p>
        <p>Carbaugh highlights three critical extensions of this framework:</p>
        <ul>
          <li><strong>Factor Price Equalization Theorem:</strong> Free trade will eventually equalize the prices of the factors of production (wages and rents) across trading nations.</li>
          <li><strong>Stolper-Samuelson Theorem:</strong> Trade alters income distribution. Free trade benefits the owners of a country's relatively abundant factor (who see their real incomes rise) and harms the owners of the relatively scarce factor (who face increased competition and lower incomes).</li>
          <li><strong>The Leontief Paradox:</strong> An empirical contradiction to Heckscher-Ohlin. Wassily Leontief found that the US (the most capital-abundant nation in the world) actually exported less capital-intensive goods and imported more capital-intensive goods than expected. This paradox is often explained by factoring in human capital (highly skilled labor) and technology.</li>
        </ul>
      `
    },
    {
      title: "Chapter 2: Trade Restrictions and Commercial Policy",
      content: `
        <p>Despite the mathematical proofs of free trade's benefits, governments frequently intervene to protect domestic industries, manage balance of payments, or achieve political goals through tariffs and Nontariff Trade Barriers (NTBs) like quotas and subsidies.</p>
        
        <div style="background: var(--bg-hover); padding: 15px; border-left: 4px solid var(--accent); margin: 20px 0;">
          <h4 style="margin-top: 0; color: var(--text-primary);">Expanded Academic Framework: Welfare Effects of Tariffs</h4>
          <p>The economic impact of tariffs is best understood through welfare analysis using consumer surplus, producer surplus, and government revenue. In Carbaugh (18th ed.), this is a central multi-page framework that explains why tariffs create inefficiencies despite benefiting certain domestic groups.</p>
          <p>In a <strong>small country case</strong>, the nation is a price taker in world markets, meaning it cannot influence global prices. When a tariff is imposed, the domestic price rises by the full amount of the tariff. This creates four key effects. First, consumer surplus declines significantly, as consumers pay higher prices and reduce consumption. Second, producer surplus increases, since domestic firms expand output under protection. Third, the government gains tariff revenue, calculated as the tariff rate multiplied by the volume of imports. However, the critical insight is the emergence of <strong>deadweight loss</strong>, which represents net welfare loss to society.</p>
          <p>Deadweight loss consists of two inefficiencies. The <em>production distortion loss</em> occurs because higher-cost domestic producers replace more efficient foreign producers. The <em>consumption distortion loss</em> arises because some consumers who value the good above world price but below the tariff-inclusive price are excluded from the market. These losses indicate that total societal welfare declines, even though producers and government gain.</p>
          <p>In contrast, a <strong>large country</strong> can influence world prices. When it imposes a tariff, global demand for imports decreases, causing the world price to fall. This creates a <em>terms-of-trade gain</em>, meaning the country effectively forces foreign exporters to bear part of the tariff burden. Under certain conditions, this gain can exceed the deadweight loss, leading to a net national welfare increase. This is the basis of the <strong>optimal tariff argument</strong>, where a country sets a tariff rate that maximizes its welfare.</p>
          <p>However, Carbaugh emphasizes that this theoretical gain is rarely realized in practice due to retaliation from trading partners, leading to trade wars that reduce global welfare. Therefore, while tariffs may appear beneficial from a national strategic perspective, they are generally discouraged under international agreements such as those governed by the WTO.</p>
          <p>This framework is essential because it demonstrates that trade policy is not purely economic but also political, involving trade-offs between efficiency, equity, and national interest.</p>
        </div>
      `
    },
    {
      title: "Chapter 3: The Balance of Payments",
      content: `
        <p>The Balance of Payments (BOP) is a statistical record of all economic transactions between the residents of a reporting country and the rest of the world. It must theoretically balance to zero.</p>
        <ul>
          <li><strong>The Current Account:</strong> Records transactions in goods, services, and primary/secondary income. A current account deficit implies a nation is consuming more than it produces.</li>
          <li><strong>The Financial Account:</strong> Records transactions involving financial assets and liabilities, including Foreign Direct Investment (FDI) and portfolio investment. A Current Account deficit must be sustainably financed by a Financial Account surplus (borrowing from foreigners or selling assets).</li>
        </ul>
      `
    },
    {
      title: "Chapter 4: Foreign Exchange and the Monetary System",
      content: `
        <p>The International Monetary System dictates how exchange rates are determined. Carbaugh contrasts different exchange rate regimes:</p>
        <ul>
          <li><strong>Floating Exchange Rates:</strong> The currency value is determined purely by market supply and demand. It allows central banks the autonomy to use monetary policy for domestic goals (e.g., controlling inflation) rather than defending a peg.</li>
          <li><strong>Fixed (Pegged) Exchange Rates:</strong> The currency's value is tied to another currency (like the US Dollar) or a basket of currencies. This eliminates exchange rate risk for trade but requires the central bank to hold massive foreign reserves to defend the peg and sacrifices independent monetary policy.</li>
          <li><strong>Managed Float ("Dirty Float"):</strong> Market forces dictate the general trend, but central banks actively intervene to smooth out severe short-term volatility.</li>
        </ul>
        
        <div class="formula-block" style="background: var(--bg-card); padding: 15px; border-left: 4px solid var(--accent); margin: 15px 0;">
          <h4 style="margin-top:0;">Purchasing Power Parity (PPP) & Its Limitations</h4>
          <p style="font-family: var(--font-mono); font-size: 14px;">
            Absolute PPP: Exchange Rate (A/B) = Cost of Good in A / Cost of Good in B.
          </p>
          <p style="margin-top: 10px; font-size: 14px;"><strong>Limitations of PPP:</strong> While conceptually sound, PPP rarely holds perfectly in reality due to: 1) <em>Transport Costs and Trade Barriers</em> (tariffs disrupt price equalization), 2) <em>Non-tradable Goods</em> (services like haircuts or real estate cannot be arbitraged across borders), and 3) <em>Market Imperfections</em> and capital flows that drive demand for currencies independent of trade.</p>
        </div>
      `
    },
    {
      title: "Classic Academic Case Studies",
      type: "cases",
      content: [
        {
          tag: "Strategic Trade Theory & Subsidies",
          title: "The Airbus vs. Boeing WTO Dispute",
          body: "<p>The longest-running dispute in the WTO illustrates <strong>Commercial Policy</strong> in an oligopoly. For decades, the US accused European governments of providing illegal 'launch aid' to Airbus, allowing them to absorb development risks. The EU accused the US of subsidizing Boeing through military R&D contracts. This highlights how Nontariff Trade Barriers (NTBs) are used to artificially engineer comparative advantage in strategically vital industries.</p>"
        },
        {
          tag: "Optimal Tariffs & Retaliation",
          title: "The US-China Trade War",
          body: "<p>The recent US-China trade war perfectly illustrates Carbaugh’s warnings regarding the <strong>Large Country Optimal Tariff</strong>. The US, acting as a large country, imposed sweeping tariffs on Chinese goods, theoretically aiming for a terms-of-trade gain. However, the subsequent <em>Retaliation</em> by China via reciprocal tariffs on US agriculture destroyed the theoretical welfare gains. The resulting deadweight loss reduced global economic efficiency, proving that while optimal tariffs work in isolation, the political reality of retaliation almost always leads to a net reduction in global welfare and exposes the vulnerability of domestic consumers and producers (Stolper-Samuelson effects).</p>"
        }
      ]
    }
  ]
});