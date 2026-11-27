"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadAdminProfile, signOutAdmin, watchAuth, type AdminProfile } from "@/lib/admin-auth";

export default function AdminGuard({
  children,
}: {
  children: (profile: AdminProfile) => ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = watchAuth(async (user) => {
      if (!mounted) return;

      setChecking(true);
      setError("");
      setAccessDenied(false);
      setProfile(null);

      if (!user) {
        router.replace("/admin/login");
        setChecking(false);
        return;
      }

      try {
        const admin = await loadAdminProfile(user);
        if (!mounted) return;

        if (!admin) {
          setAccessDenied(true);
          return;
        }

        setProfile(admin);
      } catch (cause) {
        if (mounted) {
          const code = cause instanceof Error && "code" in cause
            ? String((cause as Error & { code?: unknown }).code ?? "")
            : "";
          setError(code === "permission-denied"
            ? "تم تسجيل الدخول، لكن Firestore رفض قراءة صلاحيات هذا الحساب. تأكد من وجود وثيقة users/{uid} وأن الحساب يحمل role=admin و active=true، ثم تحقق من قواعد Firestore المنشورة."
            : "تعذر التحقق من صلاحية الحساب الإداري. تحقق من إعدادات Firebase والاتصال بالإنترنت، ثم أعد المحاولة.");
        }
      } finally {
        if (mounted) setChecking(false);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  if (checking) {
    return <main className="adminCenter" role="status"><p>جاري التحقق من صلاحية الإدارة…</p></main>;
  }

  if (accessDenied) {
    return (
      <main className="adminCenter" role="alert">
        <section className="adminLoginCard">
          <h1>الحساب غير مفعّل للإدارة</h1>
          <p className="formError">تم تسجيل الخروج لأن الحساب لا يملك صلاحية الإدارة المطلوبة. يجب أن تحتوي وثيقة المستخدم في Firestore على role بقيمة admin و active بقيمة true.</p>
          <button type="button" className="submitOrder" onClick={async () => {
            await signOutAdmin();
            router.replace("/admin/login");
          }}>العودة إلى تسجيل الدخول</button>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="adminCenter" role="alert">
        <section className="adminLoginCard">
          <h1>تعذر فتح لوحة الإدارة</h1>
          <p className="formError">{error}</p>
          <button type="button" className="submitOrder" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </button>
          <a href="/admin/login">العودة إلى تسجيل الدخول</a>
        </section>
      </main>
    );
  }

  if (!profile) return null;
  return <>{children(profile)}</>;
}
