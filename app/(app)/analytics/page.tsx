import { ModulePlaceholder } from "@/components/patterns/module-placeholder";
import { PageHeader } from "@/components/patterns/page-header";
import { MODULE_PLACEHOLDER_COPY } from "@/src/config/app-config";

export const metadata = { title: MODULE_PLACEHOLDER_COPY["analytics"]!.title };

export default function Page() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={MODULE_PLACEHOLDER_COPY["analytics"]!.title}
        description="This module is specified in the approved architecture and scheduled for Phase 2."
      />
      <ModulePlaceholder moduleKey="analytics" />
    </div>
  );
}
