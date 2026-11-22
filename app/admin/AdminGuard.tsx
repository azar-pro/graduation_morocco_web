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

  useEffect(() => {
    let mounted = true;

    const unsubscribe = watchAuth(async (user) => {
      if (!mounted) return;

      setChecking(true);
      setError("");
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
          await signOutAdmin();
          if (!mounted) return;
          router.replace("/admin/login");
          return;
        }

        setProfile(admin);
      } catch {
        if (mounted) {
          setError("تعذر التحقق من صلاحية الحساب الإداري. تحقق من اتصال Firebase وصلاحيات قراءة ملف المستخدم، ثم أعد المحاولة.");
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
    return <main className="adminCenter"><p>جاري التحقق من صلاحية الإدارة…</p></main>;
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
