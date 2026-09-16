import { getBusinessSettings } from "@/lib/settings/get-settings";
import { BusinessSettingsForm } from "@/components/admin/business-settings-form";

export default async function SetupWizardPage() {
  const settings = await getBusinessSettings();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Welcome! Let&apos;s set up your store.</h1>
        <p className="text-muted-foreground">
          Fill in what you know now — everything here can be changed later from Settings.
        </p>
      </div>
      <BusinessSettingsForm settings={settings} mode="setup" />
    </div>
  );
}
