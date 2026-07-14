import { IssueDetailClient } from "@/components/issues/IssueDetailClient";

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IssueDetailClient id={id} />;
}
