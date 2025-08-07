import jsPDF from "jspdf";
import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

/**
 * Export patient encounter data as PDF or Word.
 * Only includes sections present in the data object.
 * Supports multiple SOAP notes (data.soapNotes: array).
 * @param {Object} data - Encounter data.
 * @param {string} data.patientEncounterName - Required.
 * @param {string} [data.transcript]
 * @param {Array<Object>} [data.soapNotes] - Each with subjective/objective/assessment/plan.
 * @param {Object} [data.billingSuggestion]
 * @param {"pdf"|"word"} type - Export type.
 */
export async function exportDataAsFile(data, type = "pdf") {
  if (!data?.patientEncounterName) {
    throw new Error("patientEncounterName is required");
  }

  if (type === "pdf") {
    const doc = new jsPDF();
    let y = 10;
    const addHeader = (text, size = 18, indent = 0) => {
      doc.setFontSize(size);
      doc.text(text, 10 + indent, y);
      y += size + 2;
    };
    const addBody = (text, size = 12, indent = 0) => {
      if (!text) return;
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, 180 - indent);
      doc.text(lines, 10 + indent, y);
      y += lines.length * (size + 2);
    };

    addHeader(data.patientEncounterName, 20);

    if (data.transcript) {
      addHeader("Transcript", 16);
      addBody(data.transcript);
    }

    if (Array.isArray(data.soapNotes) && data.soapNotes.length > 0) {
      data.soapNotes.forEach((note, idx) => {
        addHeader(`SOAP Note${data.soapNotes.length > 1 ? ` #${idx + 1}` : ""}`, 16);
        if (note.subjective) {
          addHeader("Subjective", 14, 8);
          addBody(note.subjective, 12, 16);
        }
        if (note.objective) {
          addHeader("Objective", 14, 8);
          addBody(note.objective, 12, 16);
        }
        if (note.assessment) {
          addHeader("Assessment", 14, 8);
          addBody(note.assessment, 12, 16);
        }
        if (note.plan) {
          addHeader("Plan", 14, 8);
          addBody(note.plan, 12, 16);
        }
      });
    }

    if (data.billingSuggestion && (
      data.billingSuggestion.icd10 ||
      data.billingSuggestion.cpt ||
      data.billingSuggestion.additional_inquiries
    )) {
      addHeader("Billing Suggestion", 16);
      if (data.billingSuggestion.icd10) {
        addHeader("ICD-10", 14, 8);
        addBody(data.billingSuggestion.icd10, 12, 16);
      }
      if (data.billingSuggestion.cpt) {
        addHeader("CPT", 14, 8);
        addBody(data.billingSuggestion.cpt, 12, 16);
      }
      if (data.billingSuggestion.additional_inquiries) {
        addHeader("Additional Inquiries", 14, 8);
        addBody(data.billingSuggestion.additional_inquiries, 12, 16);
      }
    }

    doc.save(`${data.patientEncounterName}.pdf`);
  } else if (type === "word") {
    const children = [
      new Paragraph({
        text: data.patientEncounterName,
        heading: HeadingLevel.TITLE,
      }),
    ];

    if (data.transcript) {
      children.push(
        new Paragraph({ text: "Transcript", heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ text: data.transcript })
      );
    }

    if (Array.isArray(data.soapNotes) && data.soapNotes.length > 0) {
      data.soapNotes.forEach((note, idx) => {
        children.push(
          new Paragraph({
            text: `SOAP Note${data.soapNotes.length > 1 ? ` #${idx + 1}` : ""}`,
            heading: HeadingLevel.HEADING_1,
          })
        );
        if (note.subjective) {
          children.push(
            new Paragraph({ text: "Subjective", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: note.subjective })
          );
        }
        if (note.objective) {
          children.push(
            new Paragraph({ text: "Objective", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: note.objective })
          );
        }
        if (note.assessment) {
          children.push(
            new Paragraph({ text: "Assessment", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: note.assessment })
          );
        }
        if (note.plan) {
          children.push(
            new Paragraph({ text: "Plan", heading: HeadingLevel.HEADING_2 }),
            new Paragraph({ text: note.plan })
          );
        }
      });
    }

    if (data.billingSuggestion && (
      data.billingSuggestion.icd10 ||
      data.billingSuggestion.cpt ||
      data.billingSuggestion.additional_inquiries
    )) {
      children.push(
        new Paragraph({ text: "Billing Suggestion", heading: HeadingLevel.HEADING_1 })
      );
      if (data.billingSuggestion.icd10) {
        children.push(
          new Paragraph({ text: "ICD-10", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: data.billingSuggestion.icd10 })
        );
      }
      if (data.billingSuggestion.cpt) {
        children.push(
          new Paragraph({ text: "CPT", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: data.billingSuggestion.cpt })
        );
      }
      if (data.billingSuggestion.additional_inquiries) {
        children.push(
          new Paragraph({ text: "Additional Inquiries", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({ text: data.billingSuggestion.additional_inquiries })
        );
      }
    }

    const doc = new Document({
      sections: [{ children }],
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${data.patientEncounterName}.docx`);
  } else {
    throw new Error("Unsupported export type");
  }
}