"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CircleAlert } from "lucide-react";
import { PlantForm } from "@/components/app/plant-form";
import { FadeIn } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import type { PlantDetailDto } from "@/lib/types";

export function PlantEdit() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const query = useQuery({
    queryKey: ["plant", id],
    queryFn: () => api<PlantDetailDto>(`/plants/${id}`),
  });

  if (query.isPending) return <Skeleton className="mx-auto h-96 max-w-xl" />;

  if (query.isError) {
    return (
      <FadeIn>
        <Card className="mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
          <CircleAlert className="size-10 text-destructive" />
          <p className="text-muted-foreground">{query.error.message}</p>
          <Button variant="outline" onClick={() => router.push("/plants")}>
            العودة للقائمة
          </Button>
        </Card>
      </FadeIn>
    );
  }

  return <PlantForm plant={query.data.plant} />;
}