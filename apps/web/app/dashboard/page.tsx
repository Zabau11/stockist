import { DiscoveryApp } from "@/components/discovery-app";

type DashboardPageProps = {
  searchParams: Promise<{
    query?: string | string[];
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
    <DiscoveryApp initialQuery={firstValue(params.query)} />
  );
}
