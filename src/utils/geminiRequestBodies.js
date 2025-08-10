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
                            ICD10: { type: SchemaType.STRING, description: "ICD-10 codes for the diagnosis. Max 4, can have additional supporting codes" },
                            CPT: { type: SchemaType.STRING, description: "CPT codes for the services provided, with justification. Billing code for new (99202–99205) / established (99211–99215) patient." },
                            "Additional inquiries": { type: SchemaType.STRING, description: "Additional patient inquiries to pursue to increase doctor's billing level" }
                        },
                        required: ["ICD10", "CPT", "Additional inquiries"],
                        propertyOrdering: ["ICD10", "CPT", "Additional inquiries"]
                    }
                },
                required: ["soapNote", "billingSuggestion"]
            }
        }
    };
}
