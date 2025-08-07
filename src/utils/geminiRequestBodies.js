const SchemaType = {
    OBJECT: "object",
    STRING: "string"
};

export function getTranscriptReqBody(base64Audio) {
    return {
        contents: [
            {
                parts: [
                    {
                        text: "Create transcription of this medical patient visit. For readability, Add '\n' breaks every 2-3 minutes where appropriate, or if sections becomes too long."
                    },
                    {
                        inline_data: {
                            mime_type: "audio/mp3",
                            data: base64Audio
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    transcript: {
                        type: SchemaType.STRING,
                        description: "Complete transcription of the audio recording"
                    },
                },
                required: ["transcript"]
            }
        }
    };
}

export function getSoapNoteAndBillingRequestBody(transcript) {
    return {
        contents: [
            {
                parts: [
                    {
                        text: `Create SOAP Note and billing suggestions based on this medical patient visit transcript: ${transcript}\nUse bullet points and markdown formatting for clarity.`
                    },
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    soapNote: {
                        type: SchemaType.OBJECT,
                        properties: {
                            subjective: {
                                type: SchemaType.OBJECT,
                                description: "Subjective findings - what the patient reports (symptoms, concerns, history)",
                                properties: {
                                    "chief complaint": { type: SchemaType.STRING, description: "Chief complaint of the patient" },
                                    hpi: { type: SchemaType.STRING, description: "History of Present Illness" },
                                    history: { type: SchemaType.STRING, description: "Past medical, surgical, family, and social history" },
                                    ros: { type: SchemaType.STRING, description: "Review of Systems" },
                                    medications: { type: SchemaType.STRING, description: "Current medications" },
                                    allergies: { type: SchemaType.STRING, description: "Known allergies" }
                                },
                                required: ["chief complaint", "hpi", "history", "ros", "medications", "allergies"],
                                propertyOrdering: ["chief complaint", "hpi", "history", "ros", "medications", "allergies"],
                            },
                            objective: {
                                type: SchemaType.OBJECT,
                                description: "Objective clinical observations - measurable/observable findings (vitals, physical exam, lab results)",
                                properties: {
                                    heent: { type: SchemaType.STRING, description: "HEENT (Head, Eyes, Ears, Nose, Throat) exam findings" },
                                    general: { type: SchemaType.STRING, description: "General exam findings" },
                                    cardiovascular: { type: SchemaType.STRING, description: "Cardiovascular exam findings" },
                                    musculoskeletal: { type: SchemaType.STRING, description: "Musculoskeletal exam findings" },
                                    other: { type: SchemaType.STRING, description: "Other objective findings" }
                                },
                                required: ["heent", "general", "cardiovascular", "musculoskeletal", "other"],
                                propertyOrdering: ["heent", "general", "cardiovascular", "musculoskeletal", "other"]
                            },
                            assessment: {
                                type: SchemaType.STRING,
                                description: "Clinical assessment and diagnosis based on subjective and objective findings"
                            },
                            plan: {
                                type: SchemaType.STRING,
                                description: "Treatment plan, medications, follow-up instructions and next steps"
                            }
                        },
                        required: ["subjective", "objective", "assessment", "plan"],
                        propertyOrdering: ["subjective", "objective", "assessment", "plan"]

                    },
                    billingSuggestion: {
                        type: SchemaType.OBJECT,
                        description: "Billing suggestions (CPT, ICD-10) for the encounter",
                        properties: {
                            icd10: { type: SchemaType.STRING, description: "ICD-10 codes for the diagnosis. Max 4, can have additional supporting codes" },
                            cpt: { type: SchemaType.STRING, description: "CPT codes for the services provided, with justification. Also note if new/established patient, etc." },
                            additional_inquiries: { type: SchemaType.STRING, description: "Additional patient inquiries to pursue to increase billing level" }
                        },
                        required: ["icd10", "cpt", "additional_inquiries"],
                        propertyOrdering: ["icd10", "cpt", "additional_inquiries"]
                    }
                },
                required: ["soapNote", "billingSuggestion"]
            }
        }
    };
}
