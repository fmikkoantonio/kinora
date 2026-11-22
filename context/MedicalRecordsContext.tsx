import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { MAX_MEDICAL_ATTACHMENT_SIZE, MEDICAL_ATTACHMENT_BUCKET } from "@/lib/medicalAttachments";
import { parseMedicalVisitData } from "@/lib/medicalRecordValidation";
import { MedicalAttachment, MedicalExamination, MedicalVisit } from "@/types/medical";

const allowedAttachmentTypes = ["application/pdf", "image/jpeg", "image/png"];
const medicalRecordPageSize = 200;

function getAttachmentContentType(attachment: MedicalAttachment, blob: Blob): string {
  const knownType = [attachment.mimeType?.toLowerCase(), blob.type.toLowerCase()]
    .find((type) => allowedAttachmentTypes.includes(type ?? ""));
  if (knownType) return knownType;

  const extension = attachment.name.toLowerCase().split(".").pop();
  if (extension === "pdf") return "application/pdf";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  throw new Error("Choose a PDF, JPG, or PNG attachment.");
}

interface MedicalRecordsContextValue {
  visits: MedicalVisit[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addVisit: (visit: MedicalVisit) => Promise<void>;
  removeVisit: (visitId: string) => Promise<void>;
  getVisit: (visitId: string) => MedicalVisit | undefined;
}

const MedicalRecordsContext = createContext<MedicalRecordsContextValue | null>(null);

export function MedicalRecordsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [visits, setVisits] = useState<MedicalVisit[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setVisits([]);
      setError(null);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setVisits([]);
      setError("Medical records are unavailable because Supabase is not configured.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows: { id: string; patient_id: string; record_data: unknown; created_at: string }[] = [];
      for (let offset = 0; ; offset += medicalRecordPageSize) {
        const { data, error: loadError } = await supabase
          .from("medical_records")
          .select("id, patient_id, record_data, created_at")
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + medicalRecordPageSize - 1);
        if (loadError) throw loadError;
        const page = data ?? [];
        rows.push(...page);
        if (page.length < medicalRecordPageSize) break;
      }

      const loadedVisits: MedicalVisit[] = [];
      const invalidRecords: string[] = [];
      rows.forEach((row) => {
        try {
          if (!row.id || !row.patient_id) throw new Error("The record is missing its ID or patient.");
          loadedVisits.push({
            ...parseMedicalVisitData(row.record_data),
            id: row.id,
            patientId: row.patient_id,
            createdAt: row.created_at,
          });
        } catch (validationError) {
          const message = validationError instanceof Error ? validationError.message : "The record data is invalid.";
          invalidRecords.push(`${row.id}: ${message}`);
        }
      });
      setVisits(loadedVisits);
      if (invalidRecords.length) {
        setError(`${invalidRecords.length} medical record${invalidRecords.length === 1 ? "" : "s"} could not be loaded. First issue: ${invalidRecords[0]}`);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load medical records.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addVisit = useCallback(async (visit: MedicalVisit) => {
    const client = supabase;
    if (!user || !client) throw new Error("Sign in before saving a medical record.");
    const ownVisit = {
      ...visit,
      patientId: user.id,
      createdAt: new Date().toISOString(),
    };
    const uploadedPaths: string[] = [];

    try {
      const examinations: MedicalExamination[] = [];
      for (const examination of ownVisit.examinations) {
        const attachments = examination.attachments ?? [];
        const uploadedAttachments: MedicalAttachment[] = [];
        for (let index = 0; index < attachments.length; index += 1) {
          const attachment = attachments[index];
          const response = await fetch(attachment.uri);
          if (!response.ok) throw new Error(`Could not read the attachment "${attachment.name}".`);
          const blob = await response.blob();
          if (blob.size > MAX_MEDICAL_ATTACHMENT_SIZE) {
            throw new Error(`The attachment "${attachment.name}" exceeds 10 MB.`);
          }
          const contentType = getAttachmentContentType(attachment, blob);
          const safeFileName = attachment.name.replace(/[^A-Za-z0-9._-]/g, "_") || "report";
          const storagePath = `${user.id}/${ownVisit.id}/${examination.id}/${Date.now()}-${index}-${safeFileName}`;
          const { error: uploadError } = await client.storage
            .from(MEDICAL_ATTACHMENT_BUCKET)
            .upload(storagePath, blob, { contentType, upsert: false });
          if (uploadError) throw uploadError;

          uploadedPaths.push(storagePath);
          uploadedAttachments.push({
            name: attachment.name,
            mimeType: contentType,
            uri: "",
            storagePath,
          });
        }

        examinations.push({
          ...examination,
          attachments: uploadedAttachments,
        });
      }

      const savedVisit = { ...ownVisit, examinations };
      const recordData = {
        ...savedVisit,
        id: undefined,
        patientId: undefined,
        createdAt: undefined,
      };
      const { data: recordId, error: saveError } = await client.rpc("create_medical_record", {
        target_record_data: recordData,
      });
      if (saveError) throw saveError;
      if (!recordId) throw new Error("The medical record could not be saved.");

      setVisits((current) => [{ ...savedVisit, id: recordId }, ...current]);
    } catch (saveError) {
      if (uploadedPaths.length) {
        const { error: cleanupError } = await client.storage
          .from(MEDICAL_ATTACHMENT_BUCKET)
          .remove(uploadedPaths);
        if (cleanupError) {
          const message = saveError instanceof Error ? saveError.message : "The medical record could not be saved.";
          throw new Error(`${message} Uploaded attachments could not be cleaned up: ${cleanupError.message}`);
        }
      }
      throw saveError;
    }
  }, [user?.id]);

  const removeVisit = useCallback(async (visitId: string) => {
    const client = supabase;
    if (!client) throw new Error("Supabase is not configured.");
    const visit = visits.find((record) => record.id === visitId);
    const attachmentPaths = [
      ...(visit?.attachment?.storagePath ? [visit.attachment.storagePath] : []),
      ...(visit?.examinations.flatMap((examination) => [
        ...(examination.attachments ?? [])
          .flatMap((attachment) => attachment.storagePath ? [attachment.storagePath] : []),
      ]) ?? []),
    ];
    const { error: removeError } = await client.rpc("delete_medical_record", {
      target_record_id: visitId,
    });
    if (removeError) throw removeError;
    setVisits((current) => current.filter((visit) => visit.id !== visitId));
    if (attachmentPaths.length) {
      const { error: attachmentError } = await client.storage
        .from(MEDICAL_ATTACHMENT_BUCKET)
        .remove(attachmentPaths);
      if (attachmentError) {
        throw new Error(`The record was removed, but its attachments could not be deleted: ${attachmentError.message}`);
      }
    }
  }, [visits]);

  const value = useMemo<MedicalRecordsContextValue>(() => ({
    visits,
    loading,
    error,
    refresh,
    addVisit,
    removeVisit,
    getVisit: (visitId) => visits.find((visit) => visit.id === visitId),
  }), [visits, loading, error, refresh, addVisit, removeVisit]);

  return (
    <MedicalRecordsContext.Provider value={value}>
      {children}
    </MedicalRecordsContext.Provider>
  );
}

export function useMedicalRecords(): MedicalRecordsContextValue {
  const context = useContext(MedicalRecordsContext);
  if (!context) throw new Error("useMedicalRecords must be used within MedicalRecordsProvider");
  return context;
}
