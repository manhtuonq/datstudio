import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FeedbackItem {
  id: string;
  comment: string;
  created_at: string;
  photo_id: string;
  client_name: string;
  album_id: string;
  album_title: string;
  album_slug: string;
}

const ITEMS_PER_PAGE = 5;

const FeedbackNotifications = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);

  // Load last seen timestamp from localStorage
  useEffect(() => {
    if (!user) return;
    const key = `datphoto_fb_seen_${user.id}`;
    const saved = localStorage.getItem(key);
    setLastSeenAt(saved);
  }, [user]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("feedbacks")
      .select("id, photos!inner(album_id, albums!inner(user_id))", { count: "exact", head: true })
      .eq("photos.albums.user_id", user.id);

    if (lastSeenAt) {
      query = query.gt("created_at", lastSeenAt);
    }

    const { count } = await query;
    setUnreadCount(count || 0);
  }, [user, lastSeenAt]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Fetch feedbacks with details
  const fetchFeedbacks = useCallback(async (p: number) => {
    if (!user) return;
    setLoading(true);
    const from = (p - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    const { data, count } = await supabase
      .from("feedbacks")
      .select("id, comment, created_at, photo_id, clients(full_name), photos!inner(album_id, albums!inner(id, title, slug, user_id))", { count: "exact" })
      .eq("photos.albums.user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    const items: FeedbackItem[] = (data || []).map((d: any) => ({
      id: d.id,
      comment: d.comment,
      created_at: d.created_at,
      photo_id: d.photo_id,
      client_name: d.clients?.full_name || "Khách",
      album_id: d.photos?.albums?.id || d.photos?.album_id,
      album_title: d.photos?.albums?.title || "Album",
      album_slug: d.photos?.albums?.slug || "",
    }));

    setFeedbacks(items);
    setTotal(count || 0);
    setLoading(false);
  }, [user]);

  const handleOpen = () => {
    setOpen(!open);
    if (!open) {
      fetchFeedbacks(1);
      setPage(1);
      // Mark as seen
      if (user) {
        const now = new Date().toISOString();
        localStorage.setItem(`datphoto_fb_seen_${user.id}`, now);
        setLastSeenAt(now);
        setUnreadCount(0);
      }
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  const handlePage = (p: number) => {
    setPage(p);
    fetchFeedbacks(p);
  };

  // Realtime subscription for new feedbacks
  useEffect(() => {
    const channel = supabase
      .channel("feedback-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "feedbacks" }, () => {
        fetchUnreadCount();
        if (open) fetchFeedbacks(page);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUnreadCount, open, page, fetchFeedbacks]);

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground hover:opacity-80 transition-opacity"
        title="Thông báo feedback"
      >
        <i className="fas fa-bell text-sm"></i>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 w-96 max-h-[500px] bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-display text-sm font-bold text-foreground">
                <i className="fas fa-bell mr-2"></i>Thông báo Feedback ({total})
              </h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="overflow-y-auto max-h-[380px]">
              {loading ? (
                <div className="text-center py-8">
                  <i className="fas fa-spinner fa-spin text-muted-foreground"></i>
                </div>
              ) : feedbacks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Chưa có feedback nào
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {feedbacks.map((fb) => (
                    <Link
                      key={fb.id}
                      to={`/dashboard/album/${fb.album_id}`}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="fas fa-comment text-primary text-xs"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">
                            <span className="font-semibold">{fb.client_name}</span> đã bình luận
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">"{fb.comment}"</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-primary font-medium">
                              <i className="fas fa-images mr-1"></i>{fb.album_title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(fb.created_at).toLocaleString("vi-VN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-2 border-t border-border flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePage(page - 1)}
                  disabled={page <= 1}
                  className="px-2 py-1 text-xs rounded border border-border text-foreground disabled:opacity-50"
                >
                  <i className="fas fa-chevron-left"></i>
                </button>
                <span className="text-xs text-muted-foreground">{page}/{totalPages}</span>
                <button
                  onClick={() => handlePage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-2 py-1 text-xs rounded border border-border text-foreground disabled:opacity-50"
                >
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FeedbackNotifications;
