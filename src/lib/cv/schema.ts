const STRING = { type: "string" as const };
const STRING_ARRAY = { type: "array" as const, items: STRING };

export const EXTRACT_JSON_SCHEMA = {
  name: "canonical_source_cv",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "name",
      "email",
      "phone",
      "location",
      "linkedin",
      "summary",
      "experience",
      "education",
      "certifications",
      "projects",
      "skills",
      "customSections",
    ],
    properties: {
      name: STRING,
      email: STRING,
      phone: STRING,
      location: STRING,
      linkedin: STRING,
      summary: STRING,
      experience: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "company", "dates", "bullets"],
          properties: {
            title: STRING,
            company: STRING,
            dates: STRING,
            bullets: STRING_ARRAY,
          },
        },
      },
      education: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["degree", "institution", "dates", "coursework"],
          properties: {
            degree: STRING,
            institution: STRING,
            dates: STRING,
            coursework: STRING_ARRAY,
          },
        },
      },
      certifications: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "issuer", "date"],
          properties: {
            name: STRING,
            issuer: STRING,
            date: STRING,
          },
        },
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "description", "technologies", "url", "dates"],
          properties: {
            name: STRING,
            description: STRING,
            technologies: STRING_ARRAY,
            url: STRING,
            dates: STRING,
          },
        },
      },
      skills: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["category", "skills"],
          properties: {
            category: STRING,
            skills: STRING_ARRAY,
          },
        },
      },
      customSections: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "items"],
          properties: {
            title: STRING,
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["text"],
                properties: { text: STRING },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const TAILOR_DELTA_JSON_SCHEMA = {
  name: "cv_tailor_delta",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "experience",
      "projects",
      "skillOrder",
      "keywordClassifications",
      "missingKeywords",
      "assumptions",
      "conflicts",
    ],
    properties: {
      summary: STRING,
      experience: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "bullets"],
          properties: {
            id: STRING,
            bullets: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["sourceBulletIds", "tailoredText", "matchedKeywords"],
                properties: {
                  sourceBulletIds: STRING_ARRAY,
                  tailoredText: STRING,
                  matchedKeywords: STRING_ARRAY,
                },
              },
            },
          },
        },
      },
      projects: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "description"],
          properties: {
            id: STRING,
            description: STRING,
          },
        },
      },
      skillOrder: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["categoryId", "skillIds"],
          properties: {
            categoryId: STRING,
            skillIds: STRING_ARRAY,
          },
        },
      },
      keywordClassifications: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["keyword", "status"],
          properties: {
            keyword: STRING,
            status: {
              type: "string",
              enum: [
                "evidenced_and_used",
                "evidenced_but_not_used",
                "related_but_not_equivalent",
                "not_evidenced",
              ],
            },
          },
        },
      },
      missingKeywords: STRING_ARRAY,
      assumptions: STRING_ARRAY,
      conflicts: STRING_ARRAY,
    },
  },
} as const;

export const REPAIR_DELTA_JSON_SCHEMA = TAILOR_DELTA_JSON_SCHEMA;

export const COVER_LETTER_JSON_SCHEMA = {
  name: "cover_letter",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["subject", "greeting", "paragraphs", "sign_off", "name"],
    properties: {
      subject: STRING,
      greeting: STRING,
      paragraphs: STRING_ARRAY,
      sign_off: STRING,
      name: STRING,
    },
  },
} as const;
