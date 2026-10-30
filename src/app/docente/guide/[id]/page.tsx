import { notFound } from "next/navigation";
import { PageHeader } from "@/components/app/AppShell";
import { PostForm } from "../PostForm";
import { requireStaff } from "@/lib/auth";

export default async function ModificaGuida({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const { data: post } = await supabase.from("posts").select("id, title, slug, excerpt, body, published").eq("id", id).maybeSingle();
  if (!post) notFound();
  return (
    <>
      <PageHeader back={{ href: "/docente/guide", label: "Guide" }} title={post.title} />
      <div className="max-w-3xl">
        <PostForm post={post} />
      </div>
    </>
  );
}
