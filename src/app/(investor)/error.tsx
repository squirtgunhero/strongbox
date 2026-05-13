"use client";
import { ErrorCard } from "@/components/system/error-card";

export default function InvestorError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorCard {...props} title="Couldn't load this page" />;
}
