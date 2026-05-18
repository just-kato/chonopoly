import { ChapterData } from "@/types";

const chapter6_6: ChapterData = {
  id: "6-6",
  chapterNumber: "6.6",
  title: "Environmental Protection Legislation",
  subtitle: "Georgia Real Estate Salesperson Licensing Course",
  objectives: [
    "Identify the major EPA environmental laws that impact real estate",
    "Understand the purpose and scope of CERCLA, SARA, RCRA, SDWA, CWA, and CAA",
    "Recognize the real estate agent's responsibility regarding environmental hazards",
  ],
  summary: `The EPA was created in <strong>1970</strong> to address environmental damage from industrialization and pollution. Several major laws directly impact real estate practice: <strong>CERCLA (Superfund, 1980)</strong> funds cleanup of hazardous waste sites; <strong>SARA (1986)</strong> expanded Superfund to $8.5 billion; <strong>RCRA</strong> governs underground storage tanks; <strong>SDWA (1974)</strong> protects drinking water; <strong>CWA</strong> regulates surface and navigable waters; and <strong>CAA (1970)</strong> governs air pollutant emissions. Real estate agents must research the environmental history of any property — both current AND past owners may face CERCLA liability.`,
  concepts: [
    {
      title: "The EPA — Creation & Purpose",
      icon: "🌿",
      tag: "OVERVIEW",
      tagColor: "gold",
      body: `<p>The Environmental Protection Agency was established to address the growing environmental crisis of the 20th century.</p>
<ul>
  <li>Created in <strong>1970 during the Nixon administration</strong></li>
  <li>Goal: stem the negative impact of industrialization, transportation, and unchecked hazardous chemical use on human health and the environment</li>
  <li>Consolidates federal research, monitoring, standards, regulations, and enforcement under one umbrella</li>
  <li>Some EPA laws protect water resources; others ban specific chemical compounds; others restrict building materials and where certain structures can be built</li>
</ul>`,
    },
    {
      title: "CERCLA — The Superfund (1980)",
      icon: "☢️",
      tag: "CERCLA",
      tagColor: "purple",
      body: `<p>CERCLA (Comprehensive Environmental Response, Compensation, and Liability Act) is one of the most important EPA laws for real estate professionals.</p>
<ul>
  <li>Became law in <strong>1980</strong></li>
  <li>Also known as the <strong>Superfund</strong></li>
  <li>Established a fund to clean up uncontrolled hazardous waste sites identified by the EPA as priority sites</li>
  <li>Special taxes on the oil and gas industry funded <strong>$1.6 billion</strong> in the first six years</li>
  <li>Covers hazardous materials and known contaminants — <strong>with the exception of oil and gas</strong> (governed by separate federal standards)</li>
  <li><strong>Liability applies to current AND past owners</strong> — both may face financial and other consequences for failure to remediate</li>
  <li>If a responsible party fails to act, the EPA may initiate removal using Superfund resources</li>
</ul>
<div class="highlight-box"><strong>Critical for agents:</strong> Past and present owners of contaminated sites may face liability. Research the full history of any industrial or commercial property before listing or selling.</div>`,
    },
    {
      title: "SARA — Superfund Amendments (1986)",
      icon: "📋",
      tag: "SARA",
      tagColor: "green",
      body: `<p>The Superfund Amendments and Reauthorization Act strengthened CERCLA based on lessons learned in its first six years.</p>
<ul>
  <li>Enacted in <strong>1986</strong></li>
  <li>Strengthened focus on <strong>human health problems</strong> associated with hazardous waste sites</li>
  <li>Encouraged <strong>public involvement</strong> in decision-making around site cleanup</li>
  <li>Provided new enforcement authority and gave <strong>states more involvement</strong> in standards development</li>
  <li>Required all remedies to consider existing state and federal environmental rules</li>
  <li>Most significant change: increased Superfund trust to <strong>$8.5 billion</strong></li>
</ul>
<div class="highlight-box"><strong>Key fact:</strong> CERCLA started with $1.6 billion (first 6 years). SARA raised the total to $8.5 billion.</div>`,
    },
    {
      title: "RCRA & Radon",
      icon: "⚗️",
      tag: "RCRA / RADON",
      tagColor: "gold",
      body: `<p>The Resource Conservation and Recovery Act (RCRA) and radon gas are two additional environmental issues agents must understand.</p>
<ul>
  <li><strong>RCRA</strong> governs underground storage tanks containing petroleum-based products, non-hazardous waste, medical waste, and toxic waste</li>
  <li>RCRA shares jurisdiction with CERCLA on types of controlled waste</li>
  <li><strong>Radon gas:</strong> A naturally occurring gas that is the <strong>second leading cause of cancer</strong> in the United States</li>
  <li>Radon appears in ground water and air as a byproduct of uranium breakdown</li>
  <li>Some building materials also emit radon: exotic granites, cement, basaltic rock, pumice, and gypsum waste</li>
  <li>EPA updated radon guidelines in <strong>2013</strong>: recommends testing as soon as possible after occupancy</li>
  <li>New construction: use radon-resistant materials and sub-foundation construction techniques</li>
</ul>
<div class="highlight-box"><strong>Exam tip:</strong> Radon = second leading cause of cancer. Test after occupancy. RCRA = underground storage tanks.</div>`,
    },
    {
      title: "Safe Drinking Water Act (SDWA, 1974)",
      icon: "💧",
      tag: "SDWA",
      tagColor: "purple",
      body: `<p>The SDWA established safety standards for public drinking water from source to tap.</p>
<ul>
  <li>Enacted by Congress in <strong>1974</strong>; amended in <strong>1986 and 1996</strong></li>
  <li>Covers water sources: lakes, rivers, springs, streams, and underground wells</li>
  <li>The EPA does <strong>NOT</strong> monitor or regulate private/commercial wells serving <strong>fewer than 25 people</strong></li>
  <li>The 1996 amendment took a broader "source to tap" approach — addressing improper chemical disposal, pesticides, and underground waste injection</li>
  <li>Focuses on: modernizing water systems, operator training, funding, public information, and source water treatment</li>
  <li>Partnership between the EPA, state regulators, and water systems to uphold health standards</li>
</ul>
<div class="highlight-box"><strong>Key distinction:</strong> SDWA = drinking water quality (source to faucet). CWA = surface and navigable bodies of water.</div>`,
    },
    {
      title: "Clean Water Act (CWA) & Clean Air Act (CAA)",
      icon: "🌊",
      tag: "CWA / CAA",
      tagColor: "green",
      body: `<p>Two foundational environmental laws that govern water bodies and air quality.</p>
<ul>
  <li><strong>Clean Water Act (CWA):</strong>
    <ul>
      <li>Grew from the 1948 Federal Water Pollution Control Act</li>
      <li>Regulates <strong>source water</strong> — rivers, lakes, reservoirs, ponds, navigable waters, sewer treatment plants, and surface waters</li>
      <li>Established EPA permit program for <strong>discharging pollutants into navigable waters</strong></li>
      <li>1987 amendment created the <strong>Clean Water State Revolving Fund</strong> — empowers states to manage water quality</li>
    </ul>
  </li>
  <li><strong>Clean Air Act (CAA):</strong>
    <ul>
      <li>Enacted in <strong>1970</strong></li>
      <li>Gave EPA authority to regulate hazardous air pollutants from buildings, vehicles, trains, planes, and industrial sources</li>
      <li>Directs states to implement plans to monitor industrial activity and reduce public health risks</li>
      <li>Amended in <strong>1977 and 1990</strong> (original 1975 deadlines were too aggressive for many states)</li>
      <li>Governs residential wood-burning stoves, hydronic heaters, and forced-air furnaces</li>
    </ul>
  </li>
</ul>`,
    },
  ],
  keyTerms: [
    {
      term: "EPA (Environmental Protection Agency)",
      definition:
        "Created in 1970 under the Nixon administration to consolidate federal environmental research, monitoring, standard-setting, and enforcement under one agency. Goal: protect human health and the natural environment.",
      examTip: "EPA created in 1970. Covers research, monitoring, standards, and enforcement.",
    },
    {
      term: "CERCLA (Superfund)",
      definition:
        "Comprehensive Environmental Response, Compensation, and Liability Act. Enacted in 1980. Established a fund to clean up uncontrolled hazardous waste sites. Both current AND past owners of contaminated sites may face liability. Oil and gas are excluded (covered by separate federal law).",
      examTip: "CERCLA = 1980 = Superfund. Past AND present owners liable. Oil and gas excluded. $1.6 billion in first 6 years.",
    },
    {
      term: "SARA (Superfund Amendments and Reauthorization Act)",
      definition:
        "1986 amendment to CERCLA. Strengthened focus on human health, increased public involvement, gave states more authority, and increased the Superfund trust from $1.6 billion to $8.5 billion total.",
      examTip: "SARA = 1986. Raised total Superfund trust to $8.5 billion. More state involvement. Human health focus.",
    },
    {
      term: "RCRA (Resource Conservation and Recovery Act)",
      definition:
        "Governs underground storage tanks containing petroleum products, non-hazardous waste, medical waste, and toxic waste. Shares jurisdiction with CERCLA on controlled waste types.",
      examTip: "RCRA = underground storage tanks. Shares jurisdiction with CERCLA.",
    },
    {
      term: "Radon",
      definition:
        "A naturally occurring radioactive gas — the second leading cause of cancer in the U.S. Produced during uranium breakdown. Found in ground water, soil, air, and some building materials (granite, cement, gypsum waste). EPA updated guidelines in 2013.",
      examTip: "Radon = second leading cause of cancer. Test after occupancy. Some building materials emit it.",
    },
    {
      term: "SDWA (Safe Drinking Water Act)",
      definition:
        "Enacted in 1974; amended 1986 and 1996. Establishes safety standards for public drinking water from source to tap. The EPA does NOT regulate private/commercial wells serving fewer than 25 people.",
      examTip: "SDWA = 1974. Drinking water from source to tap. Does NOT cover wells serving fewer than 25 people.",
    },
    {
      term: "CWA (Clean Water Act)",
      definition:
        "Regulates surface and navigable waters — rivers, lakes, ponds, reservoirs, sewer treatment plants. Established EPA permit program for discharging pollutants into navigable waters. 1987 amendment created the Clean Water State Revolving Fund.",
      examTip: "CWA = source water bodies (rivers, lakes). SDWA = drinking water quality. Don't confuse them.",
    },
    {
      term: "CAA (Clean Air Act)",
      definition:
        "Enacted in 1970. Gives EPA authority to establish nationwide air quality standards and regulate hazardous air pollutants from all sources. Amended in 1977 and 1990. Governs wood-burning appliances, industrial emissions, vehicles, and buildings.",
      examTip: "CAA = 1970, same year as EPA. Amended 1977 and 1990 when states couldn't meet 1975 deadlines.",
    },
    {
      term: "Clean Water State Revolving Fund",
      definition:
        "Created by the 1987 amendment to the Clean Water Act. Empowers states to proactively manage water quality within their own borders.",
    },
    {
      term: "National Priorities List",
      definition:
        "EPA's list of hazardous waste sites identified as priorities for cleanup under CERCLA (Superfund). Responsible parties who transport or own sites on this list face potential liability.",
    },
    {
      term: "Environmental Liability (Real Estate)",
      definition:
        "Under CERCLA, both current and past owners of contaminated properties may face financial liability for remediation. Agents must research the full environmental history of industrial and commercial properties.",
      examTip: "Past AND present owners = liable under CERCLA. Research history before listing any industrial/commercial property.",
    },
  ],
  practiceQuestions: [
    {
      question:
        "What year was the EPA created, and under which president?",
      options: [
        "1948, under President Truman",
        "1965, under President Johnson",
        "1970, under President Nixon",
        "1980, under President Carter",
      ],
      answerIndex: 2,
      explanation:
        "The Environmental Protection Agency was created in 1970 under President Nixon to consolidate federal environmental research, monitoring, standards, and enforcement under one umbrella agency.",
    },
    {
      question:
        "Under CERCLA, who may face liability for the cleanup of a contaminated site?",
      options: [
        "Only the current property owner",
        "Only the company that originally dumped the hazardous waste",
        "Both current AND past owners of the property",
        "Only the EPA, which bears all cleanup costs",
      ],
      answerIndex: 2,
      explanation:
        "CERCLA (the Superfund) holds both current and past owners of contaminated sites liable for remediation costs. This is a critical point for real estate agents — buyers and sellers of industrial or commercial properties need to research the full environmental history of a site.",
    },
    {
      question:
        "What was the most significant change brought about by SARA in 1986?",
      options: [
        "Creating the Superfund for the first time",
        "Banning the use of lead-based paint in residential buildings",
        "Increasing the total Superfund trust to $8.5 billion",
        "Establishing the Clean Water State Revolving Fund",
      ],
      answerIndex: 2,
      explanation:
        "The Superfund Amendments and Reauthorization Act (SARA) of 1986 strengthened CERCLA's focus on human health, increased state involvement, and most significantly raised the total Superfund trust to $8.5 billion. CERCLA had started with $1.6 billion in its first six years.",
    },
    {
      question:
        "Radon gas is described in this chapter as:",
      options: [
        "The leading cause of cancer in the United States",
        "The second leading cause of cancer in the United States",
        "A man-made chemical compound banned by the EPA in 1980",
        "Only found in industrial and manufacturing zones",
      ],
      answerIndex: 1,
      explanation:
        "Radon is a naturally occurring gas and the second leading cause of cancer in the U.S. It is produced during the breakdown of uranium and can be found in ground water, soil, air, and some building materials. The EPA updated radon guidelines in 2013.",
    },
    {
      question:
        "The Safe Drinking Water Act (SDWA) does NOT regulate which of the following?",
      options: [
        "Public water systems serving a large city",
        "Underground wells used by the public",
        "Private wells serving fewer than 25 people",
        "Municipal water treatment facilities",
      ],
      answerIndex: 2,
      explanation:
        "The EPA does not monitor or regulate private or commercial wells that serve fewer than 25 people. SDWA covers public water systems — lakes, rivers, springs, streams, and underground wells serving larger populations.",
    },
    {
      question:
        "What is the key difference between the Safe Drinking Water Act (SDWA) and the Clean Water Act (CWA)?",
      options: [
        "SDWA covers rivers and lakes; CWA covers tap water",
        "SDWA governs drinking water quality from source to tap; CWA regulates navigable surface water bodies",
        "SDWA and CWA both govern the same water sources",
        "CWA was passed in 1974; SDWA was passed in 1970",
      ],
      answerIndex: 1,
      explanation:
        "SDWA governs drinking water quality from the original source all the way to the faucet. CWA primarily regulates source water bodies — rivers, lakes, ponds, reservoirs, and navigable waters. They serve different but complementary functions.",
    },
    {
      question:
        "Which EPA law governs underground storage tanks containing petroleum products and toxic waste?",
      options: [
        "CERCLA",
        "SARA",
        "RCRA",
        "SDWA",
      ],
      answerIndex: 2,
      explanation:
        "The Resource Conservation and Recovery Act (RCRA) provides protocol and rules for underground storage tanks containing petroleum-based products, non-hazardous waste, medical waste, and toxic waste. RCRA shares jurisdiction with CERCLA on types of controlled waste.",
    },
    {
      question:
        "The Clean Air Act was enacted in 1970, with amendments in 1977 and 1990. Why were the amendments necessary?",
      options: [
        "Because the original act only covered industrial emissions, not vehicles",
        "Because many states could not meet the original 1975 deadlines due to the rigorous requirements",
        "Because radon gas was discovered to be a major air pollutant after 1975",
        "Because the Clean Water State Revolving Fund needed to be extended to air quality",
      ],
      answerIndex: 1,
      explanation:
        "The 1977 and 1990 amendments to the Clean Air Act revised achievement goals because many states were unable to meet the rigorous requirements by the original 1975 deadlines. The amendments provided more time and updated standards.",
    },
  ],
  quickRefTables: [
    {
      title: "MAJOR EPA LAWS AT A GLANCE",
      headers: ["Law", "Year", "Purpose", "Key Facts"],
      rows: [
        ["CERCLA (Superfund)", "1980", "Fund cleanup of hazardous waste sites", "Past AND present owners liable; oil/gas excluded; $1.6B in first 6 years"],
        ["SARA", "1986", "Strengthen and expand CERCLA", "Raised Superfund trust to $8.5B; more state involvement; human health focus"],
        ["RCRA", "N/A", "Govern underground storage tanks and waste", "Petroleum, non-hazardous, medical, and toxic waste; shares jurisdiction with CERCLA"],
        ["SDWA", "1974", "Protect public drinking water source to tap", "Amended 1986 and 1996; does NOT cover wells serving < 25 people"],
        ["CWA", "restructured from 1948 FWPC", "Regulate surface and navigable waters", "Permit program for pollutant discharge; Clean Water State Revolving Fund (1987)"],
        ["CAA", "1970", "Regulate air pollutants from all sources", "Amended 1977 and 1990; governs industrial, vehicle, and residential emissions"],
      ],
    },
    {
      title: "SDWA vs. CWA — KEY DISTINCTIONS",
      headers: ["Feature", "SDWA", "CWA"],
      rows: [
        ["Primary focus", "Drinking water quality", "Surface and navigable water bodies"],
        ["Scope", "Source to tap (faucet)", "Rivers, lakes, reservoirs, ponds, sewer plants"],
        ["Year enacted", "1974", "Restructured from 1948 law"],
        ["Well regulation", "Does NOT cover wells serving < 25 people", "Not applicable"],
        ["Notable feature", "1996 amendment: source to tap approach", "Clean Water State Revolving Fund (1987)"],
      ],
    },
    {
      title: "CERCLA vs. SARA",
      headers: ["Feature", "CERCLA", "SARA"],
      rows: [
        ["Year", "1980", "1986"],
        ["Purpose", "Create Superfund; establish cleanup liability", "Strengthen CERCLA; increase funding and state role"],
        ["Funding", "$1.6 billion (first 6 years)", "Raised total trust to $8.5 billion"],
        ["Liability", "Current and past owners", "Same — reinforced"],
        ["State role", "Limited", "Increased state involvement in standards"],
      ],
    },
  ],
  rules: [
    { text: "**EPA created in 1970** under Nixon. Consolidates federal environmental research, monitoring, standards, and enforcement." },
    { text: "**CERCLA (1980) = Superfund.** Past AND present owners can be liable. Oil and gas excluded." },
    { text: "**SARA (1986) raised Superfund to $8.5 billion.** More state involvement. Stronger human health focus." },
    { text: "**RCRA = underground storage tanks.** Petroleum, medical, toxic, and non-hazardous waste. Shares jurisdiction with CERCLA." },
    { text: "**Radon = second leading cause of cancer.** Naturally occurring. Test after occupancy. Some building materials emit it." },
    { text: "**SDWA (1974) = drinking water source to tap.** Does NOT cover private wells serving fewer than 25 people." },
    { text: "**SDWA ≠ CWA.** SDWA = drinking water quality. CWA = surface/navigable water bodies." },
    { text: "**CAA (1970) = air pollutants.** Amended 1977 and 1990. Governs industrial, vehicle, and residential emission sources." },
  ],
  courseContent: `The Environmental Protection Agency (EPA) was created in 1970 during the Nixon administration to deal with emerging environmental problems caused by excessive pollution from industrialization, transportation methods and unchecked hazardous chemical applications. The original goal was to stem the escalating negative impact on human health and the natural environment.

CERCLA (Comprehensive Environmental Response, Compensation, and Liability Act), also known as the Superfund, became law in 1980. CERCLA established a fund to clean up uncontrolled hazardous waste at sites identified by the EPA as priorities in need of immediate attention. Special taxes collected from the oil and gas industry funneled $1.6 billion into the fund in the first six years after ratification.

CERCLA covers hazardous materials and known contaminants, with the exception of oil and gas which fall under other federal standards. Both past and present site owners may face financial and other consequences if they fail to voluntarily clean up contamination.

Radon, a naturally occurring gas, is the second leading cause of cancer in our country. It appears in ground water and air as a byproduct during the breakdown of uranium. The EPA updated their radon exposure prevention guidelines in 2013 to recommend everyone who purchases a home test for radon as soon as possible after occupancy.

SARA (Superfund Amendments and Reauthorization Act) of 1986 strengthened the initial objectives and made changes based on knowledge gained. SARA strengthened the focus on human health, encouraged public involvement, provided new enforcement authority, gave states more involvement, and increased funding to bring the total Superfund trust to $8.5 billion.

The Resource Conservation and Recovery Act (RCRA) provides protocol and rules for underground storage tanks containing petroleum-based products, non-hazardous waste, medical waste and toxic waste. CERCLA and RCRA share jurisdiction on types of controlled waste.

The Safe Drinking Water Act (SDWA), approved by Congress in 1974 and amended in 1986 and 1996, established safety standards for public drinking water. The EPA does not monitor or regulate private or commercial wells that serve fewer than 25 people.

The Clean Water Act (CWA) primarily regulates source water — rivers, lakes, reservoirs, ponds, navigable waters, and sewer treatment plants. The 1987 amendment created the Clean Water State Revolving Fund.

The Clean Air Act (CAA) was enacted in 1970. It gave the EPA authority to establish nationwide standards to regulate hazardous air pollutants, and to direct states to implement plans to mitigate air pollution. Amendments in 1977 and 1990 revised achievement goals because many states could not meet the original 1975 deadlines.`,
};

export default chapter6_6;
