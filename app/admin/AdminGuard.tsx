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

  useEffect(() => {
    return watchAuth(async (user) => {
      if (!user) {
        router.replace("/admin/login");
        setChecking(false);
        return;
      }
      try {
        const admin = await loadAdminProfile(user);
        if (!admin) {
          await signOutAdmin();
          router.replace("/admin/login");
          setChecking(false);
          return;
        }
        setProfile(admin);
      } finally {
        setChecking(false);
      }
    });
  }, [router]);

  if (checking) {
    return <main className="adminCenter"><p>جاري التحقق من صلاحية الإدارة…</p></main>;
  }

  if (!profile) return null;
  return <>{children(profile)}</>;
}
