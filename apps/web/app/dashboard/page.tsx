import { DiscoveryApp } from "@/components/discovery-app";

type DashboardPageProps = {
  searchParams: Promise<{
    website?: string | string[];
    prompt?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;

  return (
    <DiscoveryApp
      initialWebsite={firstValue(params.website)}
      initialPrompt={firstValue(params.prompt)}
    />
  );
}
