import Image from "next/image";
import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="orderSiteHeader">
      <Link className="orderBrand" href="/" aria-label="Graduation Morocco — الرئيسية">
        <Image src="/logo.png" width={188} height={62} alt="Graduation Morocco" priority />
      </Link>
      <nav className="orderHeaderNav" aria-label="التنقل الرئيسي">
        <Link href="/">الرئيسية</Link>
        <Link href="/order">طلب فردي</Link>
        <Link href="/group-orders">طلب جماعي</Link>
        <Link href="/track-order">تتبع الطلب</Link>
        <Link href="/contact">تواصل معنا</Link>
      </nav>
    </header>
  );
}
