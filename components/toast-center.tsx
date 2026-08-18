"use client";

import { useEffect, useState } from "react";

import { productNoticeEvent, type ProductNotice } from "@/domain/product-events";

export function ToastCenter() {
  const [notices, setNotices] = useState<ProductNotice[]>([]);
  useEffect(() => {
    const receive = (event: Event) => {
      const notice = (event as CustomEvent<ProductNotice>).detail;
      setNotices((current) => [...current.slice(-2), notice]);
      window.setTimeout(() => setNotices((current) => current.filter((item) => item.id !== notice.id)), 4500);
    };
    window.addEventListener(productNoticeEvent, receive);
    return () => window.removeEventListener(productNoticeEvent, receive);
  }, []);
  return <div className="toast-stack" aria-live="polite" aria-atomic="false">{notices.map((notice) => <div className={`product-toast toast-${notice.tone}`} key={notice.id}><span>{notice.message}</span><button aria-label="Cerrar aviso" onClick={() => setNotices((current) => current.filter((item) => item.id !== notice.id))} type="button">×</button></div>)}</div>;
}
