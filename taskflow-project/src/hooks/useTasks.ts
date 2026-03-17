import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

const PAGE_SIZE = 10;

interface UseTasksParams {
  page: number;
  statusFilter: TaskStatus | "all";
  search: string;
}

export const useTasks = ({ page, statusFilter, search }: UseTasksParams) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasks", page, statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from("tasks")
        .select("*", { count: "exact" })
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        query = query.ilike("title", `%${search.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { tasks: data as TaskRow[], total: count ?? 0, pageSize: PAGE_SIZE };
    },
    enabled: !!user,
  });
};

export const useCreateTask = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (task: { title: string; description: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").insert({
        ...task,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created");
    },
    onError: (e) => toast.error(e.message),
  });
};

export const useUpdateTask = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; status?: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task updated");
    },
    onError: (e) => toast.error(e.message),
  });
};

export const useDeleteTask = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
    },
    onError: (e) => toast.error(e.message),
  });
};
