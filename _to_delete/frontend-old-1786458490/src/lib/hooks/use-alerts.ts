import { useQuery } from "@tanstack/react-query";
import { fetchAllAlerts } from "@/lib/api/alerts";

export function useAllAlerts() {
  return useQuery({ queryKey: ["alerts", "all"], queryFn: fetchAllAlerts });
}
