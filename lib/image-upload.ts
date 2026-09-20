"use client";

const CLOUD_NAME = "uwfxvszq";
const UPLOAD_PRESET = "graduation_unsigned";
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadGraduationImage(file: File): Promise<string> {
  if (!file || file.size <= 0) throw new Error("الصورة المختارة غير صالحة.");
  if (file.size > MAX_BYTES) throw new Error("يجب أن يكون حجم الصورة أقل من 10 MB.");
  if (!file.type.startsWith("image/")) throw new Error("الملف المختار يجب أن يكون صورة.");

  const form = new FormData();
  form.append("upload_preset", UPLOAD_PRESET);
  form.append("file", file);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message;
    throw new Error(message ? `تعذر رفع الصورة: ${message}` : "تعذر رفع الصورة. حاول مرة أخرى.");
  }

  const url = String(data?.secure_url ?? "");
  if (!url.startsWith("https://")) throw new Error("لم ترجع خدمة الصور رابطًا صالحًا.");
  return url;
}
