"use client";

import { useEffect, useState } from "react";
import AdminGuard from "../AdminGuard";
import { loadAdminProducts, saveAdminProduct, type AdminProduct } from "@/lib/admin-data";

export default function AdminProductsClient() {
  const [products,setProducts] = useState<AdminProduct[]>([]);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");
  const [saving,setSaving] = useState("");

  useEffect(() => {
    loadAdminProducts()
      .then(setProducts)
      .catch(() => setMessage("تعذر تحميل المنتجات."))
      .finally(() => setLoading(false));
  },[]);

  function patch(id:string,key:keyof AdminProduct,value:unknown){
    setProducts(items => items.map(item => item.id === id ? {...item,[key]:value} : item));
  }

  async function save(product:AdminProduct){
    setSaving(product.id);
    setMessage("");
    try{
      await saveAdminProduct(product);
      setMessage("تم حفظ المنتج.");
    }catch{
      setMessage("تعذر حفظ المنتج.");
    }finally{
      setSaving("");
    }
  }

  return (
    <AdminGuard>
      {() => (
        <main className="adminDetailPage">
          <div className="adminDetailTop">
            <a className="adminBackLink" href="/admin">العودة للوحة</a>
            <div>
              <p className="eyebrow">PRODUCTS</p>
              <h1>إدارة المنتجات والأسعار</h1>
            </div>
          </div>

          {loading && <p className="formNotice">جاري تحميل المنتجات…</p>}
          {message && <p className={message.startsWith("تم ") ? "formNotice" : "formError"}>{message}</p>}

          <div className="adminProductGrid">
            {products.map(product => (
              <article className="adminProductCard" key={product.id}>
                <div className="productCardHead">
                  <div>
                    <small dir="ltr">{product.id}</small>
                    <h2>{String(product.nameAr ?? product.id)}</h2>
                  </div>
                  <label className="switchLine">
                    <input type="checkbox" checked={product.active !== false}
                      onChange={e => patch(product.id,"active",e.target.checked)} />
                    نشط
                  </label>
                </div>

                <div className="fieldGrid">
                  <label>الاسم بالعربية
                    <input value={String(product.nameAr ?? "")}
                      onChange={e => patch(product.id,"nameAr",e.target.value)} />
                  </label>
                  <label>الاسم بالإنجليزية
                    <input value={String(product.nameEn ?? "")}
                      onChange={e => patch(product.id,"nameEn",e.target.value)} />
                  </label>
                  <label>شراء ساتان
                    <input type="number" min="0" value={Number(product.purchaseSatin ?? 0)}
                      onChange={e => patch(product.id,"purchaseSatin",Number(e.target.value))} />
                  </label>
                  <label>شراء موبرة
                    <input type="number" min="0" value={Number(product.purchaseMoubara ?? 0)}
                      onChange={e => patch(product.id,"purchaseMoubara",Number(e.target.value))} />
                  </label>
                  <label>كراء ساتان
                    <input type="number" min="0" value={Number(product.rentalSatin ?? 0)}
                      onChange={e => patch(product.id,"rentalSatin",Number(e.target.value))} />
                  </label>
                  <label>كراء موبرة
                    <input type="number" min="0" value={Number(product.rentalMoubara ?? 0)}
                      onChange={e => patch(product.id,"rentalMoubara",Number(e.target.value))} />
                  </label>
                </div>

                <button className="submitOrder" type="button" disabled={saving === product.id}
                  onClick={() => void save(product)}>
                  {saving === product.id ? "جارٍ الحفظ…" : "حفظ المنتج"}
                </button>
              </article>
            ))}
          </div>
        </main>
      )}
    </AdminGuard>
  );
}
