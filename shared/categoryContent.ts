/**
 * Search-facing copy for category pages, keyed by category slug.
 *
 * Titles and descriptions target the phrases US shoppers actually type (from
 * Google autocomplete research, 2026-10: e.g. "used engines for sale",
 * "tonneau cover", "leveling kit", "dash cam", "led headlight bulbs"). FAQ
 * answers are general, well-established buying facts; anything about the
 * store itself is limited to what the site's policies state.
 */

export type CategoryFaq = { question: string; answer: string };

export type CategoryContent = {
  /** <title>, kept within ~60 characters. */
  seoTitle: string;
  /** Meta description, ~120-160 characters. */
  metaDescription: string;
  /** One or two sentences shown under the heading. */
  intro: string;
  /** Questions shoppers search for, answered below the product grid. */
  faqs: CategoryFaq[];
};

const FITMENT_HELP =
  "Use our free VIN decoder to confirm your vehicle's details, or send us your VIN on WhatsApp or by email before you order and we will check the part against it.";

export const CATEGORY_CONTENT: Record<string, CategoryContent> = {
  engine: {
    seoTitle: "Used Engines for Sale | OEM Car Engines | MotorVault",
    metaDescription:
      "Used and remanufactured car engines for sale, listed with make, model, engine code and photos. Check fitment by VIN before you order.",
    intro:
      "Used OEM engines and engine assemblies, listed with the make, model and engine code from the original vehicle. Match the engine code to your car before ordering.",
    faqs: [
      {
        question: "How do I make sure a used engine fits my car?",
        answer: `Match the engine code, not just the make and model: the same model is often built with several engines. The code is on the engine block or in your vehicle's documents, and your VIN identifies it. ${FITMENT_HELP}`,
      },
      {
        question: "What should I check when buying a used engine?",
        answer:
          "Look for the engine code, the donor vehicle's mileage where listed, clear photos of the block and ancillaries, and exactly which components are included (turbo, injectors, wiring, ECU). Ask us if anything you need is not stated in the listing.",
      },
      {
        question: "Is a used engine worth it compared to a new one?",
        answer:
          "A good used OEM engine usually costs a fraction of a new crate engine and fits exactly like the original. It makes most sense when the rest of the vehicle is sound and the engine code matches; budget for fitting, fluids, gaskets and a timing service at installation.",
      },
    ],
  },
  transmission: {
    seoTitle: "Used Transmissions & Gearboxes for Sale | MotorVault",
    metaDescription:
      "Used transmissions and gearboxes for sale, listed with gearbox codes and photos. Confirm the code and fitment by VIN before ordering.",
    intro:
      "Used manual and automatic transmissions and gearboxes from identified donor vehicles. Match the gearbox code and drivetrain (FWD, RWD, AWD) to your car.",
    faqs: [
      {
        question: "How do I find the right transmission for my car?",
        answer: `Match the gearbox code and the drivetrain, not just the model year: one model can use several transmissions. The code is on a plate or stamping on the casing. ${FITMENT_HELP}`,
      },
      {
        question: "What should I do when installing a used transmission?",
        answer:
          "Fill it with the fluid type the manufacturer specifies, replace seals and the clutch (on manual gearboxes) as needed, and have automatic units adapted or reset by a workshop where the vehicle requires it.",
      },
    ],
  },
  seats: {
    seoTitle: "Used Car Seats & Recaro Seats for Sale | MotorVault",
    metaDescription:
      "Used OEM car seats, seat sets and Recaro sport seats for sale, with photos and condition notes. Check airbag and connector compatibility first.",
    intro:
      "Used OEM front and rear seats, complete seat sets and Recaro sport seats, photographed and described as they are. Check airbag, heating and connector compatibility before you buy.",
    faqs: [
      {
        question: "Will seats from another model fit my car?",
        answer:
          "Only when the seat mounts, wiring connectors and airbag system match. Seats with side airbags or occupancy sensors must be compatible with your car's airbag control unit, or a warning light will stay on. Compare the model generation and connector layout before ordering.",
      },
      {
        question: "Can seats with built-in airbags be swapped?",
        answer:
          "Yes, when the replacement seat's airbag and sensors are compatible with your vehicle. Disconnect the battery before working on airbag wiring, and have the airbag system checked afterwards. Our guide on replacing car seats with airbags covers the details.",
      },
      {
        question: "Are Recaro seats worth it?",
        answer:
          "Recaro seats are known for strong side support and durable construction, which is why many manufacturers fit them as factory options. Used factory Recaros are a cost-effective way to get that seat, provided the mounts and wiring suit your car.",
      },
    ],
  },
  "truck-bed": {
    seoTitle: "Tonneau Covers & Truck Bed Accessories | MotorVault",
    metaDescription:
      "Tonneau covers, bed racks, bed slides and truck bed accessories for F-150, Silverado, Ram, Tacoma and more. Check bed length and model year before ordering.",
    intro:
      "Tonneau covers, bed racks, bed slides and storage for full-size and mid-size pickups. Every cover is specific to the truck's bed length and model years, so check both.",
    faqs: [
      {
        question: "Is a tonneau cover worth it?",
        answer:
          "For most owners, yes: it keeps cargo dry and out of sight, and locking hard covers add security. Soft roll-up and tri-fold covers cost less; hard folding and retractable covers are more secure and weather-resistant.",
      },
      {
        question:
          "What is the difference between a tonneau cover and a camper shell?",
        answer:
          "A tonneau cover sits flat over the bed rails and keeps the truck's profile; a camper shell (topper) encloses the bed with a raised canopy for taller cargo or camping, but is heavier and harder to remove.",
      },
      {
        question: "How do I choose the right size?",
        answer:
          "Measure the inside length of the bed at the rails and confirm the cab style and model year generation; covers are made for specific bed lengths (for example 5.5 ft or 6.5 ft on an F-150) and are not interchangeable.",
      },
    ],
  },
  suspension: {
    seoTitle: "Leveling Kits & Lift Kits for Trucks | MotorVault",
    metaDescription:
      "Leveling kits, lift kits, shocks and control arms for F-150, Ram 1500, Silverado, Tundra and Tacoma. Check model year, 2WD/4WD and trim before ordering.",
    intro:
      "Leveling kits, lift kits, shocks and control arms for popular pickups and SUVs. Kits are specific to model year, 2WD or 4WD, and suspension type, so check all three.",
    faqs: [
      {
        question: "Is a leveling kit bad for a truck?",
        answer:
          "A quality kit installed correctly is safe for most trucks. It raises the front to remove the factory rake, which slightly changes suspension geometry: get an alignment afterwards, and expect some change in ride feel. On independent front suspension, larger lifts increase CV-joint angles.",
      },
      {
        question:
          "What is the difference between a leveling kit and a lift kit?",
        answer:
          "A leveling kit raises only the front, typically 1.5–2.5 inches, so the truck sits level. A lift kit raises the whole vehicle, often with new shocks, springs or knuckles, and is a bigger, more expensive job.",
      },
      {
        question: "Will a leveling kit fit my truck?",
        answer:
          "Check the model year range, 2WD or 4WD, and whether your truck has factory air suspension or an off-road package, which many kits exclude. The product listing states its compatibility.",
      },
    ],
  },
  "exterior-accessories": {
    seoTitle: "Truck & Car Exterior Accessories | MotorVault",
    metaDescription:
      "Exterior accessories for F-150, Ram 1500, Silverado, Tacoma, Wrangler and Tesla Model Y: running boards, rain guards, mud flaps, tow hook covers and more.",
    intro:
      "Running boards, rain guards, mud flaps, tow hook covers, grilles and trim for popular trucks, Jeeps and EVs. Most parts are made for specific model years.",
    faqs: [
      {
        question: "What are tow hook covers for?",
        answer:
          "Tow hook covers are silicone or rubber sleeves that slip over the front tow hooks to protect them from rust and scratches and add a splash of color. They do not affect the hook's strength; remove them before towing.",
      },
      {
        question: "Do window rain guards work with automatic windows?",
        answer:
          "Yes. Tape-on (outside mount) guards stay clear of the window channel; in-channel guards may need a few days of the window closed so the auto-reverse adjusts. Check the listing for which type you are buying.",
      },
    ],
  },
  "interior-accessories": {
    seoTitle: "All-Weather Floor Mats & Seat Covers | MotorVault",
    metaDescription:
      "All-weather floor mats, cargo liners, seat covers, steering wheel covers and organizers for trucks, SUVs and Tesla Model Y. Check fitment by model year.",
    intro:
      "All-weather floor mats and liners, seat covers, steering wheel covers and organizers. Custom-fit mats are made for specific models and years; universal items say so.",
    faqs: [
      {
        question: "Are all-weather floor mats better than carpet mats?",
        answer:
          "For wet, muddy or snowy conditions, yes: raised edges hold water and dirt, and rubber or TPE rinses clean. Carpet mats look plusher and are quieter, but stain and hold moisture.",
      },
      {
        question: "Can I use seat covers on seats with side airbags?",
        answer:
          "Only use covers marked as side-airbag compatible, which have seams designed to tear when the airbag deploys. Covers without that design can block or delay deployment.",
      },
    ],
  },
  electronics: {
    seoTitle: "Dash Cams, OBD2 Scanners & Car Electronics | MotorVault",
    metaDescription:
      "Front and rear dash cams, OBD2 scanners, phone mounts and car electronics. Compare features and check vehicle compatibility before you buy.",
    intro:
      "Dash cams, OBD2 diagnostic scanners, phone mounts and in-car electronics from established brands.",
    faqs: [
      {
        question: "Is a dash cam worth it?",
        answer:
          "For many drivers, yes: footage helps settle accident and insurance disputes and records hit-and-runs and parking incidents. A front-and-rear camera with parking mode gives the most coverage.",
      },
      {
        question: "Can dash cam footage be used as evidence?",
        answer:
          "Dash cam video is commonly used by insurers and can be submitted as evidence, subject to the court's rules. Recording audio may require everyone's consent in some US states, so check your state's law if your camera records sound.",
      },
      {
        question: "Is an OBD2 scanner universal?",
        answer:
          "Cars and light trucks sold in the US since 1996 use the OBD-II port, so any OBD2 scanner reads standard engine codes. Reading airbag, ABS or manufacturer-specific systems, or running bi-directional tests, needs a more advanced scanner.",
      },
    ],
  },
  lights: {
    seoTitle: "LED Headlight Bulbs, Light Bars & Truck Lights | MotorVault",
    metaDescription:
      "LED headlight bulbs, fog lights, light bars, cab lights and tail lights for trucks, Jeeps and cars, plus OEM lighting. Check bulb size and fitment first.",
    intro:
      "LED bulbs, fog lights, light bars, cab and tail lights, plus OEM headlight units. Check your bulb size (for example H11 or 9005) or the model year before ordering.",
    faqs: [
      {
        question: "Are LED headlight bulbs street legal?",
        answer:
          "In the US, LED replacement bulbs fitted in headlights designed for halogen bulbs are generally not certified to the federal headlamp standard (FMVSS 108), and many are sold for off-road use. Complete headlight assemblies designed for LEDs can be compliant. Check the listing and your state's rules.",
      },
      {
        question: "How do I find my headlight bulb size?",
        answer:
          "It is in your owner's manual, printed on the old bulb's base, or found by year, make and model. Low beam, high beam and fog lights often use different sizes.",
      },
    ],
  },
  "tools-emergency": {
    seoTitle: "Jump Starters, Tire Inflators & Car Tools | MotorVault",
    metaDescription:
      "Portable jump starters, tire inflators, battery testers, OBD2 tools and roadside emergency gear for cars and trucks.",
    intro:
      "Portable jump starters, tire inflators, battery testers and roadside emergency gear to keep in the car.",
    faqs: [
      {
        question:
          "What is the difference between a jump starter and a battery charger?",
        answer:
          "A jump starter delivers a short, powerful burst to start a car with a flat battery, with no second vehicle needed. A battery charger slowly recharges or maintains a battery over hours. Many owners keep a jump starter in the car and a charger or maintainer at home.",
      },
      {
        question: "What size jump starter do I need?",
        answer:
          "Larger engines and diesels need more starting current: check the jump starter's rating for your engine size and fuel type, which manufacturers list on the product.",
      },
    ],
  },
  "car-care": {
    seoTitle: "Car Detailing Kits & Car Care Products | MotorVault",
    metaDescription:
      "Car detailing kits, ceramic sprays, cleaners, polishes, microfiber towels and car vacuums from Chemical Guys, Adam's Polishes and more.",
    intro:
      "Detailing kits, wash and wax, ceramic sprays, interior cleaners, microfiber and car vacuums from established car care brands.",
    faqs: [
      {
        question: "What should a basic car detailing kit include?",
        answer:
          "A pH-neutral car wash soap, a wash mitt, microfiber drying towels, wheel cleaner, an interior cleaner and a paint protectant (wax, sealant or ceramic spray). Two buckets help keep grit off the paint.",
      },
      {
        question: "Is a ceramic spray the same as a ceramic coating?",
        answer:
          "No. Spray ceramics are easy to apply and last weeks to months; professional ceramic coatings are harder, thicker and last years but need careful preparation and application.",
      },
    ],
  },
  towing: {
    seoTitle: "Trailer Hitches & Towing Accessories | MotorVault",
    metaDescription:
      "Trailer hitches, ball mounts, hitch locks, straps and towing accessories for trucks and SUVs. Match the hitch class and receiver size to your load.",
    intro:
      "Hitches, ball mounts, locks, straps and towing gear. Match the hitch class and receiver size to your vehicle and what you tow.",
    faqs: [
      {
        question:
          "What is the difference between a trailer hitch and a receiver?",
        answer:
          "A receiver hitch is the most common type of trailer hitch: a square tube (usually 1.25, 2 or 2.5 inches) that accepts a ball mount, bike rack or other insert. Hitches are rated by class (I to V) for the weight they can tow.",
      },
      {
        question: "How do I know how much my truck can tow?",
        answer:
          "Your owner's manual and the door-jamb label give the towing capacity and weight limits. The lowest rating among the vehicle, hitch, ball mount and ball applies.",
      },
    ],
  },
  wipers: {
    seoTitle: "Wiper Blades for Cars & Trucks | MotorVault",
    metaDescription:
      "Wiper blades from Bosch, Clix and more for cars, trucks and SUVs. Find the right sizes for your vehicle and replace them every 6 to 12 months.",
    intro:
      "Beam and conventional wiper blades from established brands. Driver and passenger sides are often different lengths, so check both sizes.",
    faqs: [
      {
        question: "How often should I replace wiper blades?",
        answer:
          "Most manufacturers recommend every 6 to 12 months, or sooner if they streak, chatter or skip. Sun and ice wear the rubber faster.",
      },
      {
        question: "Beam blades or conventional blades?",
        answer:
          "Beam blades have no exposed frame, press more evenly on curved windshields and resist ice build-up; conventional framed blades cost less. Both work well when sized correctly.",
      },
    ],
  },
  "air-intake-filters": {
    seoTitle: "Cold Air Intakes & Air Filters | MotorVault",
    metaDescription:
      "Cold air intakes and performance air filters for trucks and cars, including CARB-legal options. Check model year, engine and emissions rules first.",
    intro:
      "Cold air intakes and replacement filters for popular trucks and cars. Check your engine, model year and your state's emissions rules before ordering.",
    faqs: [
      {
        question: "Is a cold air intake worth it?",
        answer:
          "Expect a sharper intake sound and modest gains; real-world horsepower increases are usually small on stock engines. Many owners fit one for the sound, a reusable filter and as part of other upgrades.",
      },
      {
        question: "Is a cold air intake legal in California?",
        answer:
          "Only intakes with a CARB Executive Order (EO) number are legal for street use in California and states that follow its rules; others are sold for off-road or racing use. The listing or manufacturer states whether a kit has an EO number.",
      },
    ],
  },
  "batteries-charging": {
    seoTitle: "Car Battery Chargers & Maintainers | MotorVault",
    metaDescription:
      "Car and truck battery chargers, maintainers and charging accessories from Battery Tender and more. Keep stored vehicles ready to start.",
    intro:
      "Smart battery chargers, maintainers and charging accessories for cars, trucks, motorcycles and stored vehicles.",
    faqs: [
      {
        question: "Can I leave a battery charger connected?",
        answer:
          "Only a smart charger or battery maintainer that switches to float mode should stay connected long-term. Older manual chargers can overcharge a battery.",
      },
      {
        question: "Which charger suits my battery type?",
        answer:
          "Check that the charger supports your battery chemistry (flooded, AGM, gel or lithium) and voltage (6V or 12V); using the wrong mode can shorten battery life.",
      },
    ],
  },
  wheels: {
    seoTitle: "Wheels, Wheel Spacers & Lug Nuts | MotorVault",
    metaDescription:
      "Truck and car wheels, wheel spacers, lug nuts and locks. Match bolt pattern, center bore and offset to your vehicle before ordering.",
    intro:
      "Wheels, spacers, lug nuts and locks. Bolt pattern, center bore, offset and thread size must all match your vehicle.",
    faqs: [
      {
        question: "How do I know which wheels fit my vehicle?",
        answer:
          "Match the bolt pattern (for example 6x135 on many F-150s), center bore, offset and load rating. The listing states the fitment; ask us with your VIN if unsure.",
      },
    ],
  },
  "car-audio": {
    seoTitle: "Car Audio: Speakers, Amplifiers & Subwoofers | MotorVault",
    metaDescription:
      "Car speakers, amplifiers and subwoofers for upgrading a factory sound system. Check speaker size and power handling before ordering.",
    intro:
      "Speakers, amplifiers and subwoofers for upgrading factory audio. Check speaker sizes and power ratings against your system.",
    faqs: [
      {
        question: "Do I need an amplifier for new speakers?",
        answer:
          "Not always: efficient speakers can run from a factory head unit. An amplifier is worth it for component speakers, subwoofers and higher volume without distortion.",
      },
    ],
  },
};

export function getCategoryContent(
  slug: string | null | undefined
): CategoryContent | null {
  if (!slug) return null;
  return CATEGORY_CONTENT[slug.trim().toLowerCase()] ?? null;
}
