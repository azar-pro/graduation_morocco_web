import type { Metadata } from "next";
import AdminLoginClient from "./AdminLoginClient";

export const metadata: Metadata = {
  title: "دخول الإدارة",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="adminLoginPage">
      <AdminLoginClient />
    </main>
  );
}
