"use client";

const CLOUD_NAME = "uwfxvszq";
const UPLOAD_PRESET = "graduation_unsigned";
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadGroupExcel(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls", "csv"].includes(extension ?? "")) {
    throw new Error("ارفق ملف Excel بصيغة .xlsx أو .xls أو .csv فقط.");
  }
  if (!file.size || file.size > MAX_BYTES) {
    throw new Error("يجب ألا يتجاوز حجم الملف 10 MB.");
  }

  const form = new FormData();
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("file", file);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
    { method: "POST", body: form },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const reason = data?.error?.message;
    throw new Error(reason ? `تعذر رفع ملف Excel: ${reason}` : "تعذر رفع الملف. حاول مرة أخرى.");
  }

  const url = String(data?.secure_url ?? "");
  if (!url.startsWith("https://")) throw new Error("لم ترجع خدمة الملفات رابطًا صالحًا.");
  return url;
}
