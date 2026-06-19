"use client";

import { useState, useEffect } from "react";
import { formatDateSafe } from "@/utils/formatDate";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
  Save,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { DBBlogPost } from "@/types/database";
import { PageHeader } from "@/components/admin/PageHeader";
import { AdminCard, AdminCardContent } from "@/components/admin/AdminCard";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

interface BlogFormData {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  status: "draft" | "published";
  meta_title: string;
  meta_description: string;
}

const defaultFormData = (): BlogFormData => ({
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  featured_image_url: "",
  status: "draft",
  meta_title: "",
  meta_description: "",
});

export default function AdminBlogPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<DBBlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<DBBlogPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<DBBlogPost | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<BlogFormData>(defaultFormData());

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("blog-posts-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_posts" },
        () => {
          fetchPosts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setPosts((data as DBBlogPost[]) || []);
    } catch (err) {
      console.error("Error fetching blog posts:", err);
      toast({
        title: "Error",
        description: "Failed to load blog posts",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (post?: DBBlogPost) => {
    if (post) {
      setEditingPost(post);
      setFormData({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || "",
        content: post.content || "",
        featured_image_url: post.featured_image_url || "",
        status: post.status === "published" ? "published" : "draft",
        meta_title: post.meta_title || "",
        meta_description: post.meta_description || "",
      });
    } else {
      setEditingPost(null);
      setFormData(defaultFormData());
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPost(null);
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: editingPost ? prev.slug : generateSlug(title),
      meta_title: prev.meta_title || title,
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a blog title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a URL slug",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const payload = {
      title: formData.title.trim(),
      slug: formData.slug.trim(),
      excerpt: formData.excerpt.trim() || null,
      content: formData.content.trim() || null,
      featured_image_url: formData.featured_image_url.trim() || null,
      status: formData.status,
      meta_title: formData.meta_title.trim() || formData.title.trim(),
      meta_description: formData.meta_description.trim() || formData.excerpt.trim() || null,
      published_at:
        formData.status === "published"
          ? editingPost?.published_at || new Date().toISOString()
          : null,
    };

    try {
      if (editingPost) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", editingPost.id);

        if (error) throw error;

        toast({
          title: "Blog Updated",
          description: `"${formData.title}" has been updated`,
        });
      } else {
        const { error } = await supabase.from("blog_posts").insert({
          ...payload,
          created_by: user?.id || null,
        });

        if (error) throw error;

        toast({
          title: "Blog Created",
          description: `"${formData.title}" has been added`,
        });
      }

      handleCloseModal();
      fetchPosts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save blog post";
      console.error("Error saving blog post:", err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      const { error } = await supabase
        .from("blog_posts")
        .delete()
        .eq("id", postToDelete.id);

      if (error) throw error;

      toast({
        title: "Blog Deleted",
        description: `"${postToDelete.title}" has been removed`,
      });

      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
      fetchPosts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete blog post";
      console.error("Error deleting blog post:", err);
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    }
  };

  const filteredPosts = posts.filter(
    (post) =>
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.excerpt || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const publishedCount = posts.filter((p) => p.status === "published").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-10 w-10 text-accent" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog Posts"
        description="Create and manage blog articles shown on the public website"
        actions={
          <Button onClick={() => handleOpenModal()} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Blog Post
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-xl p-4 border"
        >
          <p className="text-muted-foreground text-sm">Total Posts</p>
          <p className="text-2xl font-bold text-foreground">{posts.length}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-4 border"
        >
          <p className="text-muted-foreground text-sm">Published</p>
          <p className="text-2xl font-bold text-accent">{publishedCount}</p>
        </motion.div>
      </div>

      <AdminCard delay={0.1}>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </AdminCard>

      {filteredPosts.length === 0 ? (
        <AdminCard>
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">No blog posts found</h3>
            <p className="text-muted-foreground mb-4">
              {posts.length === 0
                ? "Start by adding your first blog article"
                : "Try adjusting your search"}
            </p>
            {posts.length === 0 && (
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Blog Post
              </Button>
            )}
          </div>
        </AdminCard>
      ) : (
        <AdminCard delay={0.2}>
          <AdminCardContent className="p-0">
            <div className="divide-y divide-border">
              <AnimatePresence>
                {filteredPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-6 w-6 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {post.title}
                          </h3>
                          <Badge
                            variant={post.status === "published" ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            {post.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.excerpt || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground font-mono">
                          /blog/{post.slug}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateSafe(new Date(post.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {post.status === "published" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/blog/${post.slug}`} target="_blank">
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenModal(post)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPostToDelete(post);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </AdminCardContent>
        </AdminCard>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? "Edit Blog Post" : "Add New Blog Post"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="e.g., Portable Cabin Buying Guide 2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="portable-cabin-buying-guide-2026"
              />
              <p className="text-xs text-muted-foreground">
                Public URL: /blog/{formData.slug || "..."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="excerpt">Description</Label>
              <Textarea
                id="excerpt"
                value={formData.excerpt}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                }
                placeholder="Short summary shown on the blog listing page..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                value={formData.content}
                onChange={(content) =>
                  setFormData((prev) => ({ ...prev, content }))
                }
                placeholder="Write the full blog article here..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="featured_image_url">Featured Image URL</Label>
              <Input
                id="featured_image_url"
                value={formData.featured_image_url}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    featured_image_url: e.target.value,
                  }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "draft" | "published") =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_title">SEO Title</Label>
              <Input
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, meta_title: e.target.value }))
                }
                placeholder="Optional — defaults to post title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meta_description">SEO Description</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    meta_description: e.target.value,
                  }))
                }
                placeholder="Optional — defaults to description above"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {editingPost ? "Update Post" : "Create Post"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete blog post?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{postToDelete?.title}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
