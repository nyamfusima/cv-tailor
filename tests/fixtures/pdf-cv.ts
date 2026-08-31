import { canonicalizeCv } from "../../src/lib/cv/canonical";
import { mergeProtectedFromSource } from "../../src/lib/cv/mergeProtected";
import { scoreJobAlignment } from "../../src/lib/cv/matchScore";
import { toTailoredWire } from "../../src/lib/cv/wire";

export function representativeTailoredCv() {
  const source = canonicalizeCv({
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "+27 82 000 0000",
    location: "Cape Town",
    linkedin: "linkedin.com/in/alex-rivera-example",
    summary: "Operations coordinator with 4 years supporting multi-site retail teams.",
    experience: [
      {
        title: "Operations Coordinator",
        company: "BrightMart Retail",
        dates: "Jan 2022 – Present",
        bullets: [
          "Coordinated weekly stock counts across 6 stores and reduced shrinkage by 12%",
          "Trained 15 new hires on the inventory checklist",
        ],
      },
      {
        title: "Sales Associate",
        company: "Harbour Market",
        dates: "2019 – 2021",
        bullets: ["Served customers on the shop floor and restocked shelves"],
      },
    ],
    education: [
      {
        degree: "Bachelor of Commerce in Management",
        institution: "University of the Western Cape",
        dates: "2018 – 2021",
        coursework: [
          "Business Statistics",
          "Supply Chain Management",
          "Organisational Behaviour",
          "Financial Accounting",
          "Retail Operations",
        ],
      },
      {
        degree: "National Senior Certificate",
        institution: "Example High School",
        dates: "2017",
        coursework: [],
      },
    ],
    certifications: [{ name: "First Aid Level 1", issuer: "Red Cross", date: "2023" }],
    projects: [
      {
        name: "Store Launch Tracker",
        description: "Built a tracker used by 3 regional managers during two new-store openings.",
        technologies: ["Excel"],
        url: "",
        dates: "",
      },
    ],
    skills: [{ category: "Operations", skills: ["Stock counts", "Training"] }],
    customSections: [
      { title: "Languages", items: [{ text: "English — fluent" }, { text: "isiXhosa — conversational" }] },
      { title: "Volunteer Experience", items: [{ text: "Weekend stock help at a community shop" }] },
    ],
  });
  const { tailored } = mergeProtectedFromSource(source, { summary: source.summary });
  return toTailoredWire(tailored, source, scoreJobAlignment(source, tailored, "Retail operations"));
}
