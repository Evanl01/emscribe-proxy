// Change from an async function that calls OpenAI directly,
// to a function that returns the request body for OpenAI API.

import de from "zod/v4/locales/de.cjs";

const SchemaType = {
    OBJECT: "object",
    STRING: "string"
};
/**
 * Generates a Gemini API request body for transcript generation.
 * @param {string} base64Audio - The base64-encoded audio data.
 * @returns {object} Gemini request body for transcript generation.
 */
export function getTranscriptReqBody(base64Audio) {
    return {
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "You are a medical transcription assistant. Return ONLY valid JSON matching the schema."
            },
            {
                role: "user",
                content: "Create transcription of this medical patient visit. For readability, add '\\n' breaks every 2-3 minutes where appropriate, or if sections become too long."
            }
        ],
        tools: [
            {
                type: "file",
                mime_type: "audio/mp3",
                data: base64Audio
            }
        ],
        max_tokens: 5000,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "transcript",
                schema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        transcript: {
                            type: SchemaType.STRING,
                            description: "Complete transcription of the audio recording"
                        }
                    },
                    required: ["transcript"],
                    additionalProperties: false
                }
            }
        }
    };
}


export function getSoapNoteAndBillingRequestBody(transcript) {
    return {
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: "You are a medical note assistant. Return ONLY valid JSON matching the schema."
            },
            {
                role: "user",
                content: `Here is a patient encounter transcript:\n\n${transcript}\n\nGenerate SOAP note and billing suggestions. Use bullet points and markdown formatting for clarity.`
            }
        ],
        max_tokens: 5000,
        response_format: {
            type: "json_schema",
            json_schema: {
                name: "soap_and_billing",
                schema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        soap_note: {
                            type: SchemaType.OBJECT,
                            properties: {
                                subjective: {
                                    type: SchemaType.OBJECT,
                                    description: "Subjective findings - what the patient reports (symptoms, concerns, history)",
                                    properties: {
                                        "Chief complaint": { type: SchemaType.STRING, description: "Chief complaint of the patient" },
                                        HPI: { type: SchemaType.STRING, description: "History of Present Illness" },
                                        History: { type: SchemaType.STRING, description: "Past medical, surgical, family, and social history" },
                                        ROS: { type: SchemaType.STRING, description: "Review of Systems" },
                                        Medications: { type: SchemaType.STRING, description: "Current medications" },
                                        Allergies: { type: SchemaType.STRING, description: "Known allergies" }
                                    },
                                    required: ["Chief complaint", "HPI", "History", "ROS", "Medications", "Allergies"],
                                    propertyOrdering: ["Chief complaint", "HPI", "History", "ROS", "Medications", "Allergies"],
                                },
                                objective: {
                                    type: SchemaType.OBJECT,
                                    description: "Objective clinical observations - measurable/observable findings (vitals, physical exam, lab results)",
                                    properties: {
                                        HEENT: { type: SchemaType.STRING, description: "HEENT (Head, Eyes, Ears, Nose, Throat) exam findings" },
                                        General: { type: SchemaType.STRING, description: "General exam findings" },
                                        Cardiovascular: { type: SchemaType.STRING, description: "Cardiovascular exam findings" },
                                        Musculoskeletal: { type: SchemaType.STRING, description: "Musculoskeletal exam findings" },
                                        Other: { type: SchemaType.STRING, description: "Other objective findings" }
                                    },
                                    required: ["HEENT", "General", "Cardiovascular", "Musculoskeletal", "Other"],
                                    propertyOrdering: ["HEENT", "General", "Cardiovascular", "Musculoskeletal", "Other"]
                                },
                                assessment: { type: SchemaType.STRING, description: "Clinical assessment and diagnosis based on subjective and objective findings" },
                                plan: { type: SchemaType.STRING, description: "Treatment plan, medications, follow-up instructions and next steps" }
                            },
                            required: ["subjective", "objective", "assessment", "plan"]
                        },
                        billing: {
                            type: SchemaType.OBJECT,
                            properties: {
                                icd10_codes: {
                                    type: "array",
                                    items: { type: SchemaType.STRING, description: "ICD-10 code followed by a brief description" },
                                    description: "ICD-10 codes for the diagnosis. Max 4, can have additional supporting codes"
                                },
                                billing_code: { type: SchemaType.STRING, description: "CPT codes for the services provided, with justification. Billing code for new (99202–99205) / established (99211–99215) patient." },
                                additional_inquiries: { type: SchemaType.STRING, description: "Doctor's additional areas of investigation for the patient to increase doctor's billing level" }
                            },
                            required: ["icd10_codes", "billing_code", "additional_inquiries"]
                        }
                    },
                    required: ["soap_note", "billing"],
                    additionalProperties: false
                }
            }
        }
    };
}