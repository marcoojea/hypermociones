export interface ProductNotice {
  id: string;
  message: string;
  tone: "success" | "info" | "warning" | "error";
}

export const productNoticeEvent = "hypermociones:notice";

export function notifyProduct(message: string, tone: ProductNotice["tone"] = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ProductNotice>(productNoticeEvent, { detail: { id: crypto.randomUUID(), message, tone } }));
}
