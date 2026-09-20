"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminGuard from "./AdminGuard";
import { signOutAdmin } from "@/lib/admin-auth";
import {
  loadAdminGroupOrders,
  loadAdminOrders,
  updateGroupOrderStatus,
  updateOrderStatus,
  type AdminGroupOrder,
  type AdminOrder,
} from "@/lib/admin-data";

const statusLabels: Record<string, string> = {
  received: "تم الاستلام",
  review: "قيد المراجعة",
  working: "جاري التنفيذ",
  printing: "جاري الطباعة",
  ready: "جاهز",
  delivery: "في التوصيل",
  completed: "تم التسليم",
  cancelled: "ملغي",
};

const statuses = Object.keys(statusLabels);

export default function AdminDashboardClient() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [groups, setGroups] = useState<AdminGroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const [o, g] = await Promise.all([loadAdminOrders(), loadAdminGroupOrders()]);
      setOrders(o);
      setGroups(g);
    } catch {
      setMessage("تعذر تحميل بيانات لوحة الإدارة.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([loadAdminOrders(), loadAdminGroupOrders()])
      .then(([o, g]) => {
        setOrders(o);
        setGroups(g);
      })
      .catch(() => setMessage("تعذر تحميل بيانات لوحة الإدارة."))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) =>
      [order.orderNumber, order.fullName, order.phoneNumber]
        .some((value) => String(value ?? "").toLowerCase().includes(q)),
    );
  }, [orders, search]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((order) =>
      [order.groupOrderNumber, order.responsibleName, order.phoneNumber]
        .some((value) => String(value ?? "").toLowerCase().includes(q)),
    );
  }, [groups, search]);

  const collected = orders
    .filter((x) => x.status !== "cancelled")
    .reduce((sum, x) => sum + Number(x.totalPrice ?? 0), 0);

  return (
    <AdminGuard>
      {(profile) => (
        <div className="adminShell">
          <aside className="adminSidebar">
            <div>
              <p className="eyebrow">MOROCCO GRADUATION</p>
              <h2>الإدارة</h2>
            </div>
            <nav>
              <a href="#overview">نظرة عامة</a>
              <a href="#orders">الطلبات</a>
              <a href="#groups">الطلبات الجماعية</a>
              <a href="/admin/products">المنتجات</a>
              <a href="/admin/delivery">التوصيل</a>
              <a href="/admin/settings">الإعدادات</a>
            </nav>
            <div className="adminProfile">
              <strong>{profile.fullName || "Admin"}</strong>
              <small>{profile.email}</small>
              <button type="button" onClick={async () => {
                await signOutAdmin();
                router.replace("/admin/login");
              }}>تسجيل الخروج</button>
            </div>
          </aside>

          <main className="adminMain">
            <header className="adminTopbar">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h1>لوحة إدارة الطلبات</h1>
              </div>
              <button type="button" onClick={() => void refresh()}>تحديث</button>
            </header>

            {message && <p className="formError">{message}</p>}
            {loading && <p className="formNotice">جاري تحميل البيانات…</p>}

            <section id="overview" className="adminStats">
              <article><span>إجمالي الطلبات</span><strong>{orders.length}</strong></article>
              <article><span>طلبات جماعية</span><strong>{groups.length}</strong></article>
              <article><span>قيد التنفيذ</span><strong>{orders.filter((x) => !["completed","cancelled"].includes(String(x.status))).length}</strong></article>
              <article><span>قيمة الطلبات</span><strong>{collected.toFixed(0)} درهم</strong></article>
            </section>

            <div className="adminSearch">
              <input
                type="search"
                placeholder="ابحث برقم الطلب، الاسم أو الهاتف"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <section id="orders" className="adminSection">
              <div className="adminSectionHead">
                <h2>الطلبات الفردية</h2>
                <span>{filteredOrders.length}</span>
              </div>
              <div className="adminTableWrap">
                <table className="adminTable">
                  <thead>
                    <tr><th>الطلب</th><th>العميل</th><th>الهاتف</th><th>النوع</th><th>المبلغ</th><th>الحالة</th></tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td dir="ltr"><a className="adminOrderLink" href={`/admin/orders/${encodeURIComponent(String(order.orderNumber ?? order.id))}`}>{String(order.orderNumber ?? order.id)}</a></td>
                        <td>{String(order.fullName ?? "—")}</td>
                        <td dir="ltr">{String(order.phoneNumber ?? "—")}</td>
                        <td>{String(order.orderType ?? "—")}</td>
                        <td>{Number(order.totalPrice ?? 0).toFixed(0)} درهم</td>
                        <td>
                          <select
                            value={String(order.status ?? "received")}
                            onChange={async (e) => {
                              const status = e.target.value;
                              await updateOrderStatus(String(order.orderNumber ?? order.id), status);
                              setOrders((items) => items.map((item) =>
                                item.id === order.id ? { ...item, status } : item
                              ));
                            }}
                          >
                            {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="groups" className="adminSection">
              <div className="adminSectionHead">
                <h2>الطلبات الجماعية</h2>
                <span>{filteredGroups.length}</span>
              </div>
              <div className="adminTableWrap">
                <table className="adminTable">
                  <thead>
                    <tr><th>الطلب</th><th>المسؤول</th><th>الهاتف</th><th>النوع</th><th>العدد</th><th>الحالة</th></tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((order) => (
                      <tr key={order.id}>
                        <td dir="ltr"><a className="adminOrderLink" href={`/admin/group-orders/${encodeURIComponent(String(order.groupOrderNumber ?? order.id))}`}>{String(order.groupOrderNumber ?? order.id)}</a></td>
                        <td>{String(order.responsibleName ?? "—")}</td>
                        <td dir="ltr">{String(order.phoneNumber ?? "—")}</td>
                        <td>{String(order.orderType ?? "—")}</td>
                        <td>{Number(order.quantity ?? 0)}</td>
                        <td>
                          <select
                            value={String(order.status ?? "received")}
                            onChange={async (e) => {
                              const status = e.target.value;
                              await updateGroupOrderStatus(String(order.groupOrderNumber ?? order.id), status);
                              setGroups((items) => items.map((item) =>
                                item.id === order.id ? { ...item, status } : item
                              ));
                            }}
                          >
                            {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </div>
      )}
    </AdminGuard>
  );
}
