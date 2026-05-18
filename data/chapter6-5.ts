import { ChapterData } from "@/types";

const chapter6_5: ChapterData = {
  id: "6-5",
  chapterNumber: "6.5",
  title: "Building Codes",
  subtitle: "Georgia Real Estate Salesperson Licensing Course",
  objectives: [
    "Define building codes and explain their purpose",
    "Identify the major components covered by building codes",
    "Understand the Certificate of Occupancy and ADA requirements",
  ],
  summary: `Building codes are systematic regulations governing the construction of buildings within a municipality, established to protect <strong>health, safety, and welfare</strong>. Codes cover construction type, occupancy limits, fire protection, egress requirements, and accessibility. Most municipalities adopt a state code — many states use the <strong>International Building Code (IBC)</strong> as a foundation. The process ends with a <strong>Certificate of Occupancy (CO)</strong>, issued after all inspections are passed, certifying a structure is safe for use. The <strong>Americans with Disabilities Act (ADA)</strong> sets minimum accessibility standards — when local code conflicts with ADA, the more stringent standard applies.`,
  concepts: [
    {
      title: "History & Purpose of Building Codes",
      icon: "🏛️",
      tag: "HISTORY",
      tagColor: "gold",
      body: `<p>Building codes in the U.S. did not begin as public safety measures — they grew out of insurance industry interests.</p>
<ul>
  <li>Major fires in San Francisco and Baltimore + the <strong>1906 San Francisco earthquake</strong> prompted insurance companies to develop early building guidelines</li>
  <li>The <strong>National Board of Fire Underwriters (NBFU)</strong> developed surveys covering topography, weather, civic affairs, and roadways</li>
  <li>Early codes addressed: doors, shutters, building materials, fire department equipment, and firehouse locations</li>
  <li>Original goal: encourage municipalities to adopt guidelines for <strong>favorable insurance rates</strong> — to protect property, not people</li>
  <li>Today: codes are law — driven by public safety, sustainability, and welfare</li>
  <li>Most municipalities now adopt a <strong>State code</strong> as the foundation, often building on the <strong>International Building Code (IBC)</strong></li>
</ul>
<div class="highlight-box"><strong>Key shift:</strong> Early codes were financial/insurance-driven. Modern codes are public safety-driven.</div>`,
    },
    {
      title: "Construction Type & Occupancy",
      icon: "🏗️",
      tag: "CONSTRUCTION",
      tagColor: "purple",
      body: `<p>Building codes establish rules about what can be built, how large it can be, and who can occupy it.</p>
<ul>
  <li><strong>Construction types:</strong> Most buildings use wood, concrete, or steel frames</li>
  <li><strong>Single-family residential:</strong> Only wood frame (stick-built) construction allowed</li>
  <li><strong>Commercial, multi-family, office, retail, industrial:</strong> Must use concrete or steel frames</li>
  <li>Wood frame structures are limited to <strong>two stories</strong> and smaller floor areas</li>
  <li>Steel and concrete structures may have no height or floor area limits in some codes</li>
  <li><strong>Occupancy limits:</strong> Based on floor area and use type
    <ul>
      <li>IBC: 15 sq ft per person in areas without concentrated seating</li>
      <li>Dance clubs/concentrated seating: 7 sq ft per person</li>
    </ul>
  </li>
  <li>Log home construction is governed by a separate standard: <strong>ICC 400-2012</strong></li>
</ul>
<div class="highlight-box"><strong>Exam tip:</strong> Single-family = wood frame only. Commercial/multi-family = concrete or steel. Wood frame = max 2 stories.</div>`,
    },
    {
      title: "Egress & Exit Requirements",
      icon: "🚪",
      tag: "EGRESS",
      tagColor: "green",
      body: `<p>Safe exit from a building in an emergency is a core focus of building codes — a lesson learned from historic tragedies.</p>
<ul>
  <li>The <strong>1946 Winecoff Hotel fire in Atlanta</strong> killed 41% of guests; the La Salle Hotel fire in Chicago killed 61 people — both prompted national reform</li>
  <li>President Truman ordered a national conference on fire safety in <strong>1947</strong></li>
  <li>Number and location of egress points determined per floor based on occupancy</li>
  <li>In multi-story buildings, exits are typically <strong>fire-rated stairs</strong> leading to ground level</li>
  <li>IBC stair exit standard: at least <strong>0.3 inches of doorway per person</strong></li>
  <li>Traditional doorways: <strong>0.2 inches per occupant</strong></li>
  <li><strong>Every sleeping room</strong> must have at least one operable window, door, or device for emergency egress</li>
  <li>IRC egress window requirements:
    <ul>
      <li>Minimum glass area = at least <strong>8% of room square footage</strong></li>
      <li>Minimum opening: <strong>20" × 24"</strong> (height × width)</li>
      <li>Minimum ventilation opening = at least <strong>4% of room square footage</strong></li>
    </ul>
  </li>
</ul>`,
    },
    {
      title: "Fire Protection Standards",
      icon: "🔥",
      tag: "FIRE SAFETY",
      tagColor: "gold",
      body: `<p>Fire protection is a major driver of building code requirements.</p>
<ul>
  <li>Spray-on fireproofing on steel members: provides at least a <strong>2-hour protection window</strong></li>
  <li>Sprinkler and fire suppression systems required in commercial, industrial, retail, and multi-family buildings</li>
  <li>Mixed-use buildings: minimum <strong>2-hour separation wall</strong> between residential and commercial spaces</li>
  <li>Gypsum separation walls between adjoining townhouses or condos: provide <strong>2-hour fire protection</strong>; built with steel studs, gypsum liner panels, and aluminum clips; used in 1–4 story buildings</li>
  <li>Lead-based paint is governed by multiple agencies (EPA, state health codes) — NYC banned it in residential dwellings since <strong>1960</strong></li>
</ul>`,
    },
    {
      title: "ADA Accessibility Requirements",
      icon: "♿",
      tag: "ADA",
      tagColor: "purple",
      body: `<p>The Americans with Disabilities Act (ADA) sets minimum accessibility standards for most public buildings and residential rental properties.</p>
<ul>
  <li><strong>Door width:</strong> 32–48 inches (many municipalities recommend minimum 36 inches)</li>
  <li><strong>Ramp slope:</strong> 1:12 ratio — 1 linear foot of ramp per inch of rise</li>
  <li><strong>Landing/turn platform:</strong> 5' × 5' minimum (California requires 6 ft in direction of travel)</li>
  <li><strong>Guardrails:</strong> 34–39 inches high; installed on both sides of ramp</li>
  <li><strong>Corridor/hallway width:</strong> Standard 36 inches (exceptions allowed for short architectural features if 48" is maintained between reduced widths)</li>
  <li><strong>Protruding objects:</strong> Must be positioned 27–80 inches above floor and extend no more than 4 inches into circulation path (handicap rails may extend 4.5 inches; pole/pylon-mounted objects may extend 12 inches)</li>
  <li><strong>When local code conflicts with ADA:</strong> The <strong>more stringent standard</strong> applies</li>
</ul>
<div class="highlight-box"><strong>Exam tip:</strong> ADA vs. local code → more stringent wins. Ramp ratio = 1:12. Minimum door width = 32 inches (36 recommended).</div>`,
    },
    {
      title: "Certificate of Occupancy (CO)",
      icon: "📄",
      tag: "CO",
      tagColor: "green",
      body: `<p>The Certificate of Occupancy is the final official document certifying a building is safe and legal to occupy.</p>
<ul>
  <li>Issued by the local governing body after all required inspections are completed and passed</li>
  <li>Certifies the building is safe for <strong>habitation or commercial use</strong></li>
  <li>Demonstrates the completed project <strong>follows the design from the original building permit application</strong></li>
  <li>Typical required inspections before CO is issued:
    <ul>
      <li>Plumbing inspection</li>
      <li>Fire marshal review</li>
      <li>Electrical inspection</li>
      <li>Health department certificate (when applicable)</li>
      <li>ADA compliance survey (for public buildings and rental properties serving disabled persons)</li>
    </ul>
  </li>
  <li>Special inspections may be required for: elevators, dedicated water systems, HVAC</li>
</ul>
<div class="highlight-box"><strong>Exam tip:</strong> No CO = building cannot legally be occupied. It is the final step after all inspections pass.</div>`,
    },
  ],
  keyTerms: [
    {
      term: "Building Code",
      definition:
        "A systematic regulation of construction of buildings within a municipality established by ordinance or law.",
      official: true,
      examTip: "Building codes protect health, safety, and welfare. Most municipalities use state codes, often based on the IBC.",
    },
    {
      term: "Certificate of Occupancy (CO)",
      definition:
        "A document issued by a local government agency after satisfactory inspection of a structure, authorizing that the structure can be occupied.",
      official: true,
      examTip: "CO = final step. Issued after all inspections pass. Certifies safe for habitation or commercial use.",
    },
    {
      term: "International Building Code (IBC)",
      definition:
        "A national model building code used as the foundation by many states and municipalities when developing local building regulations.",
    },
    {
      term: "Wood Frame (Stick-Built) Construction",
      definition:
        "A construction method using wood framing. Permitted only for single-family residences. Limited to two stories and smaller floor areas.",
      examTip: "Wood frame = single-family only, max 2 stories. Commercial/multi-family must use concrete or steel.",
    },
    {
      term: "Occupancy Limits",
      definition:
        "The maximum number of permitted occupants per floor or use, calculated using specific formulas based on floor area and activity type. IBC: 15 sq ft per person (no concentrated seating); 7 sq ft per person (concentrated seating).",
      examTip: "15 sq ft per person = areas without concentrated seating. 7 sq ft per person = dance clubs/concentrated use.",
    },
    {
      term: "Egress",
      definition:
        "A means of exit from a building in an emergency. Building codes specify the number, location, width, and type of egress points based on occupancy and building use.",
      examTip: "Every sleeping room must have at least one egress window or device. IBC stair exit = 0.3 inches per person.",
    },
    {
      term: "IRC Egress Window Requirements",
      definition:
        "International Residential Code standards for sleeping room windows: minimum glass area = 8% of room sq footage; minimum opening = 20\" × 24\" (H × W); minimum ventilation = 4% of room sq footage.",
      examTip: "Egress window: 8% glass area, 20×24 min opening, 4% ventilation. These numbers are tested.",
    },
    {
      term: "ADA (Americans with Disabilities Act)",
      definition:
        "Federal law detailing accessibility design requirements for most public buildings and residential rental properties. When ADA conflicts with local code, the more stringent standard applies.",
      examTip: "ADA vs. local code → more stringent standard wins. Door width: 32–48\" (36\" recommended). Ramp: 1:12 slope.",
    },
    {
      term: "Ramp Slope Ratio (ADA)",
      definition:
        "ADA requires a 1:12 slope ratio for ramps — 1 linear foot of ramp for every 1 inch of rise.",
      examTip: "1:12 ratio = 1 foot of ramp per 1 inch of rise. Required landing = 5' × 5' (6' in California).",
    },
    {
      term: "Gypsum Separation Wall",
      definition:
        "A fire-resistant wall constructed with steel studs, gypsum liner panels, and aluminum clips. Provides 2-hour fire protection. Used between adjoining townhouses or condos in 1–4 story buildings.",
      examTip: "Gypsum walls = 2-hour fire protection between adjoining units. Used in 1–4 story townhomes and condos.",
    },
    {
      term: "2-Hour Fire Separation",
      definition:
        "A required fire protection standard in specific building situations: between steel members (spray-on fireproofing), between residential and commercial floors in mixed-use buildings, and between adjoining townhouse/condo units (gypsum walls).",
    },
    {
      term: "ICC 400-2012",
      definition:
        "The building standard governing log home construction. Includes unique requirements for lumber grade, sustainability, fire resistance, shifting, energy conservation, and roof design.",
    },
    {
      term: "National Board of Fire Underwriters (NBFU)",
      definition:
        "The insurance industry body that developed early building code surveys and guidelines in the early 20th century. Their work formed the foundation of modern building codes in the U.S.",
    },
  ],
  practiceQuestions: [
    {
      question:
        "What type of frame construction is permitted for single-family residences under standard building codes?",
      options: [
        "Steel frame only",
        "Concrete frame only",
        "Wood frame (stick-built) only",
        "Any frame type is permitted for all residential construction",
      ],
      answerIndex: 2,
      explanation:
        "Building codes only allow single-family residences to be built using wood frame (stick-built) construction. Commercial buildings, multi-family homes, offices, retail, and industrial structures must use concrete or steel frames.",
    },
    {
      question:
        "A restaurant has 1,000 square feet with well-spaced tables and chairs (no concentrated seating). Using the IBC standard of 15 sq ft per person, what is the maximum occupancy?",
      options: ["50 people", "66 people", "100 people", "142 people"],
      answerIndex: 1,
      explanation:
        "IBC recommends 15 square feet of floor space per occupant in areas without concentrated seating. 1,000 ÷ 15 = approximately 66 patrons. For concentrated seating (like a dance club), the standard is 7 sq ft per person, allowing up to 142 people in the same space.",
    },
    {
      question:
        "What is the minimum opening size required for an egress window in a sleeping room under the International Residential Code (IRC)?",
      options: [
        "16\" × 20\"",
        "20\" × 24\"",
        "24\" × 30\"",
        "36\" × 36\"",
      ],
      answerIndex: 1,
      explanation:
        "The IRC requires egress windows in sleeping rooms to have a minimum opening of 20 inches (height) × 24 inches (width). Additionally, the glass area must be at least 8% of the room's square footage, and the ventilation opening must be at least 4%.",
    },
    {
      question:
        "Under ADA standards, what slope ratio is required for accessible ramps?",
      options: [
        "1:6 — one foot of ramp for every six inches of rise",
        "1:8 — one foot of ramp for every eight inches of rise",
        "1:12 — one foot of ramp for every inch of rise",
        "1:20 — one foot of ramp for every 20 inches of rise",
      ],
      answerIndex: 2,
      explanation:
        "ADA requires a 1:12 slope ratio for ramps — one linear foot of ramp for every one inch of rise. Ramps must also include a 5' × 5' turn/landing platform (6' minimum in California) and guardrails on both sides between 34 and 39 inches high.",
    },
    {
      question:
        "When local building code conflicts with ADA accessibility standards, which standard applies?",
      options: [
        "The local code always takes precedence",
        "The ADA standard always takes precedence",
        "The more stringent of the two standards applies",
        "The builder may choose which standard to follow",
      ],
      answerIndex: 2,
      explanation:
        "When state or local building code conflicts with ADA standards, the more stringent (stricter) regulations are adopted and enforced. This ensures maximum accessibility and safety regardless of local code variations.",
    },
    {
      question:
        "What document must be issued before a newly constructed building can legally be occupied?",
      options: [
        "A subdivision plat",
        "A building permit",
        "A Certificate of Occupancy (CO)",
        "A zoning variance",
      ],
      answerIndex: 2,
      explanation:
        "A Certificate of Occupancy (CO) is issued by the local government after all required inspections are completed and passed. It certifies the structure is safe for habitation or commercial use. Without a CO, a building cannot legally be occupied.",
    },
    {
      question:
        "A mixed-use building has a restaurant on the ground floor and apartments above. What fire protection standard typically applies between the floors?",
      options: [
        "A 1-hour fire wall",
        "A 2-hour separation wall between the residential and commercial spaces",
        "A gypsum partition that provides 30 minutes of protection",
        "No fire separation is required as long as sprinklers are installed",
      ],
      answerIndex: 1,
      explanation:
        "Building codes typically require a 2-hour fire separation (enhanced fire wall) between residential and commercial spaces in mixed-use buildings. This is in addition to any sprinkler requirements.",
    },
    {
      question:
        "Early building codes in the United States were primarily developed by which organization, and for what purpose?",
      options: [
        "The federal government, to protect public health after major epidemics",
        "The National Board of Fire Underwriters (NBFU), to help insurance companies manage risk and encourage favorable rates",
        "The IBC, to standardize construction practices nationwide",
        "Local municipalities, to control land use and property values",
      ],
      answerIndex: 1,
      explanation:
        "Early building codes were developed by the National Board of Fire Underwriters (NBFU) working with insurance companies. Their goal was to manage risk and encourage municipalities to adopt guidelines in exchange for favorable insurance rates — protecting property, not people. Modern codes evolved from this foundation into public safety law.",
    },
  ],
  quickRefTables: [
    {
      title: "CONSTRUCTION TYPE BY BUILDING USE",
      headers: ["Building Type", "Permitted Frame", "Height Limit"],
      rows: [
        ["Single-family residence", "Wood frame only", "2 stories max"],
        ["Commercial, office, retail", "Concrete or steel", "May have no limit (steel/concrete)"],
        ["Multi-family (5+ units)", "Concrete or steel", "May have no limit"],
        ["Industrial/manufacturing", "Concrete or steel", "May have no limit"],
        ["Log homes", "Log construction (ICC 400-2012)", "Varies by local code"],
      ],
    },
    {
      title: "IBC OCCUPANCY STANDARDS",
      headers: ["Use Type", "Sq Ft Per Person", "Example (1,000 sq ft)"],
      rows: [
        ["No concentrated seating (restaurant)", "15 sq ft", "66 people max"],
        ["Concentrated seating (dance club)", "7 sq ft", "142 people max"],
      ],
    },
    {
      title: "ADA ACCESSIBILITY QUICK REFERENCE",
      headers: ["Feature", "Standard"],
      rows: [
        ["Door width", "32–48 inches (36 inches recommended by many municipalities)"],
        ["Ramp slope", "1:12 ratio (1 ft of ramp per inch of rise)"],
        ["Landing/turn platform", "5' × 5' minimum (6' in California)"],
        ["Guardrail height", "34–39 inches; both sides of ramp"],
        ["Corridor/hallway width", "36 inches standard"],
        ["Protruding objects (circulation path)", "27–80 inches above floor; max 4 inches into path"],
        ["Handicap rails", "May extend up to 4.5 inches into path"],
        ["Pole/pylon-mounted objects", "May extend up to 12 inches into pathway"],
        ["ADA vs. local code conflict", "More stringent standard applies"],
      ],
    },
    {
      title: "CERTIFICATE OF OCCUPANCY — REQUIRED INSPECTIONS",
      headers: ["Inspection Type", "Required For"],
      rows: [
        ["Plumbing inspection", "All buildings"],
        ["Fire marshal review", "All buildings"],
        ["Electrical inspection", "All buildings"],
        ["Health department certificate", "When applicable"],
        ["ADA compliance survey", "Public buildings and rental properties serving disabled persons"],
        ["Elevator inspection", "Buildings with elevators"],
        ["HVAC mechanical inspection", "Buildings with dedicated HVAC systems"],
      ],
    },
  ],
  rules: [
    { text: "**Single-family = wood frame only, max 2 stories.** Commercial/multi-family = concrete or steel." },
    { text: "**IBC occupancy:** 15 sq ft/person (no concentrated seating), 7 sq ft/person (concentrated seating)." },
    { text: "**IRC egress window:** 8% glass area, 20×24 min opening, 4% ventilation. Every sleeping room must have one." },
    { text: "**ADA ramp = 1:12 slope.** 1 ft of ramp per 1 inch of rise. Landing = 5'×5' (6' in California)." },
    { text: "**ADA vs. local code → more stringent wins.**" },
    { text: "**2-hour fire separation** required: steel frame spray, mixed-use floors, gypsum walls between adjoining units." },
    { text: "**CO = final step.** Issued after all inspections pass. Building cannot be legally occupied without it." },
    { text: "**Building codes originated from insurance industry (NBFU)** — originally to protect property, not people." },
  ],
  courseContent: `Building codes established and enforced in municipalities today regulate the construction of buildings and other structures to protect the health, safety and welfare of the general public. Although some major cities in the United States still have their own building codes, most municipalities adopt a State code as the foundation for local building control, and modify the regulations through amendments based on their unique goals and resources. Some states build on the International Building Code (IBC), which serves as a national model in the United States.

Building codes in the US did not start out as government regulations designed to protect the public. Around the turn of the 20th century, huge conflagrations in San Francisco and Baltimore, and the 1906 San Francisco earthquake, compelled insurance companies to explore ways to manage risk more effectively. Working with the National Board of Fire Underwriters (NBFU), the industry developed a survey that considered every aspect of a municipality from topography and local weather to civic affairs and roadways. Early building codes were driven by financial motives, and developed to protect property, not people.

Construction Type: The type of building materials used often determines how the building may be used, the size, placement and number of fire exits in a building and the type of fire protection required. Most buildings are erected with a wood, concrete or steel frame.

Occupancy Type: The code only allows single-family residences to be built using wood frame (stick-built) construction. Commercial buildings, multi-family homes, office and retail space and industrial/manufacturing structures must be built using concrete or steel frames. Wood frame structures are limited to two stories.

IBC code recommends 15 square feet of floor space for each occupant in an area without concentrated seating. A dance club with more concentrated use only has to have 7 square feet of floor space per occupant.

Exit and entrance requirements depend on the type of construction and use. The IBC recommends stair exits have at least 0.3 inches of doorway per person to allow safe egress. Traditional doorways require 0.2 inches per occupant.

The International Residential Code (IRC) egress window requirements: minimum glass area = 8% of room square footage; minimum opening = 20" × 24" (height × width); minimum ventilation opening = 4% of room square footage.

Fire protection measures include: spray-on fireproofing on steel members (2-hour protection); sprinkler systems in commercial/industrial/retail/multi-family; 2-hour separation wall in mixed-use buildings; gypsum separation walls between adjoining townhouses or condos (2-hour fire protection, used in 1–4 story buildings).

The Americans with Disabilities Act (ADA) details design requirements for most public buildings and residential rental buildings. Door width: 32–48 inches. Ramp: 1:12 slope ratio. Landing: 5'×5' (6' in California). Guardrails: 34–39 inches, both sides. Corridor width: 36 inches standard. If State or local code conflicts with ADA standards, the more stringent regulations will typically be adopted and enforced.

Once all required inspections have been completed and successfully passed, a local governing body issues a Certificate of Occupancy (CO). This document certifies a house or building is safe for habitation or commercial use. Typical inspections: plumbing, fire marshal, electrical, health department, and ADA compliance survey.`,
};

export default chapter6_5;
