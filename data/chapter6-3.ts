import { ChapterData } from "@/types";

const chapter6_3: ChapterData = {
  id: "6-3",
  chapterNumber: "6.3",
  title: "Zoning Ordinances",
  subtitle: "Georgia Real Estate Salesperson Licensing Course",
  objectives: [
    "Define zoning and explain the purpose of zoning ordinances",
    "Identify the four components of a building envelope",
    "Understand the difference between area variances and use variances",
  ],
  summary: `Zoning ordinances are laws that define how a particular property can be used, protecting the health and safety of the public. A municipality is typically organized into three primary zoning districts: <strong>Residential (R), Commercial (C), and Industrial/Manufacturing (M)</strong>. The <strong>zoning resolution</strong> specifies bulk regulations — the four components that define a building envelope: <strong>yard setbacks, lot coverage, maximum height, and floor area ratio (FAR)</strong>. When zoning cannot be met, a municipality may grant a <strong>variance</strong> — either an area variance (dimensional relief) or a use variance (non-conforming use). Understanding zoning helps agents identify opportunities along the "path of progress."`,
  concepts: [
    {
      title: "What Are Zoning Ordinances?",
      icon: "📐",
      tag: "DEFINITION",
      tagColor: "gold",
      body: `<p>Zoning ordinances are the laws and regulations that define how a particular property can be used.</p>
<ul>
  <li>Zoning = the separation of a city or town into districts, regulating buildings and dedicating districts to particular uses for the general welfare</li>
  <li>Without zoning, property owners could build anything anywhere — industrial buildings next to homes, no consistent neighborhood character</li>
  <li>Zoning protects <strong>health and safety</strong> of the population</li>
  <li>Commonly regulate: permitted uses, minimum/maximum property size, development density, and maximum building size</li>
  <li>Found in <strong>public documents</strong> through the local planning department or department of buildings</li>
</ul>`,
    },
    {
      title: "The Three Primary Zoning Districts",
      icon: "🗺️",
      tag: "ZONING DISTRICTS",
      tagColor: "purple",
      body: `<p>Most municipalities organize land into three primary zoning types, each designated by a letter.</p>
<ul>
  <li><strong>R — Residential:</strong> Where residences are permitted — from single-family homes to high-rise condos/rentals. May be broken into sub-districts by density (e.g., R-1 for single-family only, R-6 for large apartment buildings)</li>
  <li><strong>C — Commercial:</strong> Where commercial uses are allowed — offices, retail space, restaurants</li>
  <li><strong>M — Industrial/Manufacturing:</strong> Where manufacturing uses are permitted — factories, warehouses</li>
</ul>
<div class="highlight-box"><strong>Exam tip:</strong> R = Residential, C = Commercial, M = Manufacturing. Each district can be subdivided by density. Zoning maps show which areas carry which designations.</div>`,
    },
    {
      title: "Zoning Maps vs. Zoning Resolution",
      icon: "📋",
      tag: "DOCUMENTS",
      tagColor: "green",
      body: `<p>Two documents work together to define zoning for any property.</p>
<ul>
  <li><strong>Zoning maps:</strong> Actual maps of a municipality with zoning districts overlaid. Show WHERE each zone is located. Tell you WHAT uses are permitted (R, C, or M)</li>
  <li><strong>Zoning resolution:</strong> The written document describing in detail WHAT can be built on a property based on its zone. Includes all bulk regulations. Derived from the municipality's master plan.</li>
</ul>
<div class="highlight-box"><strong>Maps = where. Resolution = what and how much.</strong> Both come from the local planning department and are public documents.</div>`,
    },
    {
      title: "The Building Envelope — Four Components",
      icon: "📦",
      tag: "BULK REGULATIONS",
      tagColor: "gold",
      body: `<p>The building envelope is the maximum 3D space within which a structure can be built on a property. It is defined by four requirements from the zoning resolution.</p>
<ul>
  <li><strong>1. Yard Setbacks:</strong> Required open space along property lines — front, side, and rear yards. Ensure light and air reach buildings. Example: 20' front yard, 10' each side yard, 30' rear yard.</li>
  <li><strong>2. Lot Coverage:</strong> The portion of the lot covered by the building footprint when viewed from above. Often expressed as a percentage (e.g., no more than 50% of total lot area).</li>
  <li><strong>3. Maximum Height:</strong> The tallest a building can be. Varies by zone — low-density residential may cap at 25–30 feet; larger zones may allow 100–120 feet.</li>
  <li><strong>4. Floor Area Ratio (FAR):</strong> Determines maximum total floor area. FAR × lot area = maximum buildable square footage.</li>
</ul>
<div class="highlight-box"><strong>Think of the building envelope as a box</strong> sitting on a table. The table = the lot. The box = the building. Zoning determines how big the box can be and how much of the table it can cover.</div>`,
    },
    {
      title: "Floor Area Ratio (FAR) Explained",
      icon: "📐",
      tag: "FAR",
      tagColor: "purple",
      body: `<p>FAR is the principal bulk regulation controlling overall building size.</p>
<ul>
  <li>FAR = ratio of total building floor area to the area of the zoning lot</li>
  <li>Formula: <strong>FAR × Lot Area = Maximum Buildable Square Footage</strong></li>
  <li>Example: 10,000 sq ft lot × FAR of 6.0 = max 60,000 sq ft of floor area</li>
  <li>If lot coverage is 100% with no setbacks and FAR is 6.0 → the building would be 6 stories</li>
  <li>With setbacks and lot coverage limits, the building must be <strong>taller and narrower</strong> to achieve the same total square footage</li>
</ul>
<div class="highlight-box"><strong>Upzoning opportunity:</strong> If a neighborhood is upzoned from FAR 5.0 to FAR 6.0, properties become 20% more valuable because 20% more square footage can be built.</div>`,
    },
    {
      title: "As-of-Right vs. Variances",
      icon: "⚖️",
      tag: "VARIANCES",
      tagColor: "green",
      body: `<p>When a property fully complies with zoning, it is built "as-of-right." When it can't comply, a variance may be needed.</p>
<ul>
  <li><strong>As-of-right:</strong> The property fully complies with the zoning resolution. Most properties are built this way.</li>
  <li><strong>Variance:</strong> Authorization to improve or develop a property in a manner NOT authorized by zoning. Granted in cases of hardship.</li>
  <li><strong>Area variance:</strong> Dimensional relief — allows a structure that doesn't comply with yard setbacks, height, etc. Example: irregularly shaped lot that can't meet setback requirements.</li>
  <li><strong>Use variance:</strong> Allows continued use of a property in a manner that no longer complies with the current zoning. Example: a commercial building now sitting in a residential zone (non-conforming use).</li>
</ul>
<div class="highlight-box"><strong>Use variance warning:</strong> A use variance often terminates when the building is significantly modified or demolished. <strong>Never assume a use variance transfers to a new owner</strong> — always verify with local zoning authorities.</div>`,
    },
    {
      title: "Zoning & the Path of Progress",
      icon: "🔭",
      tag: "AGENT PRACTICE",
      tagColor: "gold",
      body: `<p>Understanding zoning gives agents a competitive edge in identifying market opportunities.</p>
<ul>
  <li>Agents are NOT expected to conduct full zoning analyses — that is a licensed architect's job</li>
  <li>But knowing local zoning helps agents understand <strong>why neighborhoods are built the way they are</strong></li>
  <li>Upzoning (increasing FAR or density) makes properties more valuable — spot this before others do</li>
  <li>Many municipalities have rezoned historically industrial areas (abandoned warehouses/factories) into residential and commercial zones — creating trendy apartments and offices</li>
  <li>Following where municipalities are <strong>rezoning and investing public resources</strong> reveals the "path of progress"</li>
</ul>`,
    },
  ],
  keyTerms: [
    {
      term: "Zoning",
      definition:
        "The separation or division of a city or town into districts, the regulation of buildings and structures in such districts in accordance with their construction and the nature and extent of their use, and the dedication of such districts to particular uses designated to serve the general welfare.",
      official: true,
      examTip: "Zoning = dividing a municipality into districts + regulating what can be built and used in each district.",
    },
    {
      term: "Zoning District",
      definition:
        "A mapped residential, commercial, or manufacturing district with similar use, bulk, and density regulations.",
      official: true,
      examTip: "R = Residential, C = Commercial, M = Manufacturing/Industrial. Each can be subdivided by density.",
    },
    {
      term: "Zoning Maps",
      definition:
        "Maps that indicate the location and boundaries of zoning districts within a municipality.",
      official: true,
      examTip: "Maps show WHERE each zone is. The resolution shows WHAT can be built there.",
    },
    {
      term: "Zoning Ordinance",
      definition:
        "A statement setting forth the type of use permitted under each zoning classification and specific requirements for compliance.",
      official: true,
    },
    {
      term: "Building Envelope",
      definition:
        "The maximum three-dimensional space on a zoning lot within which a structure can be built, as permitted by applicable height, setback, and yard controls. Also referred to as the 'bulk' of a building.",
      official: true,
      examTip: "Building envelope = 3D box of maximum allowable space. Determined by setbacks, lot coverage, height, and FAR.",
    },
    {
      term: "Floor Area Ratio (FAR)",
      definition:
        "The ratio of total building floor area to the area of the zoning lot. FAR × lot area = maximum allowable floor area. The principal bulk regulation controlling building size.",
      official: true,
      examTip: "FAR × Lot Area = Max Floor Area. Example: 10,000 sq ft lot × FAR 6.0 = 60,000 sq ft max.",
    },
    {
      term: "Lot Area",
      definition:
        "The area (in square feet) of a zoning lot.",
      official: true,
    },
    {
      term: "Lot Coverage",
      definition:
        "That portion of a zoning lot which, when viewed from above, is covered by a building.",
      official: true,
      examTip: "Lot coverage = building footprint as seen from above. Often expressed as a percentage of total lot area.",
    },
    {
      term: "Yard Setbacks",
      definition:
        "Required open areas along the property lines of a zoning lot, which must be unobstructed from the lowest level to the sky. Ensure light and air between buildings.",
      official: true,
      examTip: "Setbacks = required open space between building and property lines. Front, side, and rear setbacks all apply in most residential zones.",
    },
    {
      term: "Variance",
      definition:
        "The authorization to improve or develop a particular property in a manner not authorized by zoning. Granted in cases of hardship.",
      official: true,
      examTip: "Two types: area variance (dimensional) and use variance (non-conforming use). Use variances may not transfer to new owners.",
    },
    {
      term: "Area Variance",
      definition:
        "A variance allowing a property owner to build a structure that does not fully comply with the dimensional requirements of the zoning resolution (setbacks, height, lot coverage, etc.).",
      examTip: "Area variance = dimensional relief. Example: irregularly shaped lot that can't meet required setbacks.",
    },
    {
      term: "Use Variance",
      definition:
        "A variance allowing a property owner to continue using a property in a manner that no longer complies with the current zoning resolution. Often applies to non-conforming uses. May terminate upon major modification or sale.",
      examTip: "Use variance = non-conforming use permission. NEVER assume it transfers to a new owner — always verify.",
    },
    {
      term: "As-of-Right",
      definition:
        "A property that fully complies with all applicable zoning regulations. No variance or special approval is required to build or use the property as proposed.",
    },
    {
      term: "Non-Conforming Use",
      definition:
        "A use of property that was lawful before a zoning change but no longer complies with current zoning regulations. May continue under a use variance.",
    },
    {
      term: "Upzoning",
      definition:
        "When a municipality increases the FAR or permitted density of a zoning district, allowing more square footage to be built. Makes properties in that zone more valuable.",
      examTip: "Upzoning from FAR 5.0 to 6.0 = 20% more buildable square footage = 20% increase in potential value.",
    },
  ],
  practiceQuestions: [
    {
      question:
        "A property in a zone with FAR of 4.0 sits on a 15,000 square foot lot. What is the maximum allowable floor area for a building on this property?",
      options: [
        "15,000 sq ft",
        "45,000 sq ft",
        "60,000 sq ft",
        "90,000 sq ft",
      ],
      answerIndex: 2,
      explanation:
        "FAR × Lot Area = Maximum Floor Area. 4.0 × 15,000 = 60,000 square feet. This is the maximum total floor area that can be built on the property, before applying setback and lot coverage restrictions.",
    },
    {
      question:
        "What does the letter 'M' represent in a standard zoning district designation?",
      options: [
        "Mixed-use",
        "Multi-family residential",
        "Manufacturing or industrial",
        "Municipal",
      ],
      answerIndex: 2,
      explanation:
        "In standard zoning designations, M stands for Manufacturing or Industrial. R = Residential and C = Commercial. Industrial zones are where factories and warehouses are permitted.",
    },
    {
      question:
        "Which of the following BEST describes the difference between zoning maps and the zoning resolution?",
      options: [
        "Zoning maps are created by architects; the resolution is created by the planning department",
        "Zoning maps show WHERE each zone is located; the zoning resolution describes WHAT can be built in each zone",
        "Zoning maps apply to commercial property; the resolution applies to residential",
        "There is no difference — they are the same document",
      ],
      answerIndex: 1,
      explanation:
        "Zoning maps graphically show the location and boundaries of zoning districts. The zoning resolution is the written document that specifies the bulk regulations, permitted uses, and dimensional requirements for each zone.",
    },
    {
      question:
        "An existing commercial building now sits in the middle of a residential zone after the area was rezoned. The owner wants to continue operating the business. What type of variance might the local authorities grant?",
      options: [
        "Area variance — for non-compliance with setback requirements",
        "Use variance — to allow continued non-conforming use",
        "FAR variance — to allow more floor area",
        "No variance is possible — the building must be converted or demolished",
      ],
      answerIndex: 1,
      explanation:
        "A use variance allows a property owner to continue using a property in a manner that no longer complies with the current zoning. A commercial building in a residential zone is a non-conforming use — the owner would seek a use variance to continue operating.",
    },
    {
      question:
        "A property owner's lot is irregularly shaped and cannot meet the required side yard setbacks. What type of variance should they apply for?",
      options: [
        "Use variance",
        "Area variance",
        "Non-conforming variance",
        "FAR variance",
      ],
      answerIndex: 1,
      explanation:
        "An area variance provides dimensional relief — it allows a structure that doesn't fully comply with the dimensional requirements of the zoning resolution, such as yard setbacks, height, or lot coverage. This is the appropriate variance for an irregularly shaped lot.",
    },
    {
      question:
        "A real estate agent learns that a neighborhood was recently upzoned from FAR 5.0 to FAR 6.0. What does this mean for property values?",
      options: [
        "Property values will decrease because more development is allowed",
        "Property values are unaffected — FAR only impacts architects",
        "Properties become more valuable because 20% more square footage can now be built",
        "Properties become less valuable because manufacturing is now permitted",
      ],
      answerIndex: 2,
      explanation:
        "Upzoning from FAR 5.0 to 6.0 means 20% more floor area can be built on each lot. More buildable square footage = more development potential = higher property value. Agents who track upzoning can spot opportunities before other agents and clients.",
    },
    {
      question:
        "A use variance is granted to a commercial property owner in a residential zone. The owner later sells the property. What should the new buyer assume?",
      options: [
        "The use variance automatically transfers to the new owner",
        "The use variance is permanent and will never expire",
        "Never assume the use variance transfers — always verify with local zoning authorities",
        "The use variance terminates immediately upon sale in all cases",
      ],
      answerIndex: 2,
      explanation:
        "A use variance may or may not transfer to a new owner — this varies by jurisdiction and circumstance. It is always good practice to verify with local zoning authorities whether the use variance will stay in effect after the property is sold. Never assume it transfers.",
    },
    {
      question:
        "Which of the following BEST describes yard setbacks?",
      options: [
        "The total square footage of a building's footprint",
        "Required open areas along property lines that must be unobstructed from the ground to the sky",
        "The maximum height a building can reach in a given zone",
        "The ratio of floor area to lot area",
      ],
      answerIndex: 1,
      explanation:
        "Yard setbacks are required open areas along property lines that must remain unobstructed. They ensure light and air can reach buildings and prevent structures from being built too close to property boundaries. Front, side, and rear setbacks all apply in most residential zones.",
    },
  ],
  quickRefTables: [
    {
      title: "THREE PRIMARY ZONING DISTRICTS",
      headers: ["Designation", "Name", "Permitted Uses", "Examples"],
      rows: [
        ["R", "Residential", "Housing of all types", "Single-family homes, apartments, condos, mobile home parks"],
        ["C", "Commercial", "For-profit business activity", "Offices, retail stores, restaurants, strip malls"],
        ["M", "Manufacturing / Industrial", "Manufacturing and industrial uses", "Factories, warehouses"],
      ],
    },
    {
      title: "THE FOUR BUILDING ENVELOPE COMPONENTS",
      headers: ["Component", "What It Controls", "Example"],
      rows: [
        ["Yard Setbacks", "Minimum distance from property lines", "20' front, 10' each side, 30' rear"],
        ["Lot Coverage", "Max % of lot covered by building footprint", "Cannot exceed 50% of total lot area"],
        ["Maximum Height", "Tallest the building can be", "25–30 ft (low-density) to 100–120 ft (large-scale)"],
        ["Floor Area Ratio (FAR)", "Max total floor area (FAR × lot area)", "10,000 sq ft lot × FAR 6.0 = 60,000 sq ft max"],
      ],
    },
    {
      title: "AREA VARIANCE vs. USE VARIANCE",
      headers: ["Type", "When Used", "Example", "Key Warning"],
      rows: [
        ["Area Variance", "Dimensional non-compliance", "Irregularly shaped lot can't meet setback requirements", "Limited to the dimensional issue only"],
        ["Use Variance", "Non-conforming use", "Commercial building now in a residential zone", "May not transfer to new owner — always verify"],
      ],
    },
  ],
  rules: [
    { text: "**R = Residential, C = Commercial, M = Manufacturing.** Each can be subdivided by density." },
    { text: "**Maps show WHERE. Resolution shows WHAT and HOW MUCH.** Both are public documents." },
    { text: "**FAR formula:** FAR × Lot Area = Maximum Allowable Floor Area." },
    { text: "**Building envelope = 4 components:** Yard setbacks + Lot coverage + Maximum height + FAR." },
    { text: "**Area variance = dimensional relief.** Use variance = non-conforming use permission." },
    { text: "**Use variance may NOT transfer to a new owner.** Always verify with local zoning authorities before closing." },
    { text: "**Upzoning = opportunity.** More FAR = more buildable square footage = higher property value." },
    { text: "**As-of-right = full compliance.** No variance needed. Most properties are built as-of-right." },
  ],
  courseContent: `Have you ever walked around a neighborhood and noticed that many of the houses have the same shape? Perhaps you've noticed a consistent number of characteristics such as the front yards being the same depth, or that the houses are all the same height.

If you have, you are most likely experiencing the rules and regulations imposed by the local zoning ordinances being played out.

It is these zoning ordinances that help shape the cities and towns we live in.

So, what are zoning ordinances? By its definition, zoning is the separation or division of a city or town into districts, the regulation of buildings and structures in such districts in accordance with their construction and the nature and extent of their use, and the dedication of such districts to particular uses designated to serve the general welfare.

In other words, zoning ordinances are a set of laws and regulations that define how a particular property can be used.

If zoning ordinances didn't exist, property owners would more or less be able to build whatever they liked on their property. Cities and towns would most likely consist of haphazard buildings that were built without a sense of planning. Industrial or high-rise commercial buildings may be built next to residential houses, resulting in non-cohesive neighborhoods and districts.

Zoning ordinances, at their essence, were implemented to protect the health and safety of the population. They commonly regulate what uses are allowed on a particular property, the minimum and maximum size of a property, how densely a property can be developed, and the maximum building size that can be built on a property.

A city or town's zoning ordinances will be spelled out in the local zoning resolution and zoning maps. These are public documents that can be found through the local planning department and/or department of buildings.

Zoning maps are actual maps of a municipality with the designated zoning districts overlaid on top of the map. A municipality is typically organized into three primary types of zoning districts; residential, commercial, and industrial or manufacturing.

Residential zones are commonly designated with the letter 'R' and serve as a zoning district in which residences are permitted. Commercial zones are commonly designated with the letter 'C'. Industrial or manufacturing zones are commonly designated with the letter 'M'.

The building envelope is the maximum three-dimensional space on a property within which a structure can be built, as permitted by applicable height, setback and yard controls.

The building envelope is determined by several fundamental requirements: required yard setbacks, the maximum lot coverage or building footprint allowed on a property, the maximum permitted height, and the floor area ratio.

The floor area ratio, as referred to as 'FAR', is a formula that determines the maximum allowed 'buildable' square footage on a property. It is expressed as a ratio of the total building floor area to the area of the zoning lot.

For example, a large scale residential zone may have a FAR of 6.0. If a property in this zone measures 10,000 square feet, the total floor area of a building on the property cannot exceed 60,000 square feet (10,000 multiplied by 6).

When a property fully complies with the zoning resolution, it is said that the property is built "as-of-right." Most properties you see will be built as-of-right.

There are two primary types of variances; area variances and use variances. Area variances allow the property owner to build a structure that does not fully comply with the dimensional requirements of the zoning resolution. A use variance allows the owner to continue using a property in a manner that no longer complies with the most recent zoning resolution.

You should never assume that the use variance will extend after the building is sold to a new owner. It is always good practice to verify with the local zoning authorities if the use variance will stay in effect after the property is sold.`,
};

export default chapter6_3;
