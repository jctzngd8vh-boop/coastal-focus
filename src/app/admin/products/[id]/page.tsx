import { notFound } from "next/navigation";
import { getAdminProduct } from "@/lib/products/get-admin-products";
import { ProductEditor } from "@/components/admin/product-editor";

export default async function ProductEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getAdminProduct(id);
  if (!product) notFound();

  return <ProductEditor product={product} />;
}
