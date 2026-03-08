import type { Database } from "@/lib/supabase/types";
import type { TiptapContent } from "@/lib/db/memos";

export type Post = Database["public"]["Tables"]["posts"]["Row"] & {
  content: TiptapContent;
};
