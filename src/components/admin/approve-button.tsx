"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  userId: string;
};

export default function ApproveButton({ userId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleApprove = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "PUT" });
    const { error } = await res.json();
    setLoading(false);

    if (error) {
      toast.error("承認に失敗しました");
      return;
    }

    toast.success("承認しました");
    router.refresh();
  };

  return (
    <Button size="sm" onClick={handleApprove} disabled={loading}>
      {loading ? "処理中..." : "承認する"}
    </Button>
  );
}
