import { notFound } from "next/navigation";
import { getAdminCustomerDetail } from "@/lib/customers/get-admin-customers";
import { getBusinessSettings } from "@/lib/settings/get-settings";
import { getMessageTemplates } from "@/lib/messages/get-templates";
import { CustomerDetailView } from "@/components/admin/customer-detail-view";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [detail, settings, templates] = await Promise.all([
    getAdminCustomerDetail(id),
    getBusinessSettings(),
    getMessageTemplates(),
  ]);
  if (!detail) notFound();

  return <CustomerDetailView detail={detail} settings={settings} templates={templates} />;
}
