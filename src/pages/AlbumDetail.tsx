import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const FEEDBACKS_PER_PAGE = 10;

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [album, setAlbum] = useState<Tables<"albums"> | null>(null);
  const [clients, setClients] = useState<Tables<"clients">[]>([]);
  const [photos, setPhotos] = useState<Tables<"photos">[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingPhotos, setSyncingPhotos] = useState(false);

  // Feedback state: grouped by photo, with pagination
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoFeedbacks, setPhotoFeedbacks] = useState<(Tables<"feedbacks"> & { clients: Tables<"clients"> | null })[]>([]);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [totalFeedbackCount, setTotalFeedbackCount] = useState(0);

  // Per-photo feedback counts
  const [photeFeedbackCounts, setPhoteFeedbackCounts] = useState<Record<string, number>>({});

  const fetchAlbumData = useCallback(async () => {
    if (!id || !user) return;

    const { data: albumData } = await supabase.from("albums").select("*").eq("id", id).eq("user_id", user.id).single();
    setAlbum(albumData);

    const { data: photosData } = await supabase.from("photos").select("*").eq("album_id", id).order("position");
    setPhotos(photosData || []);

    const { data: clientsData } = await supabase.from("clients").select("*").eq("album_id", id).order("created_at", { ascending: false });
    setClients(clientsData || []);

    // Get feedback counts per photo
    const photoIds = (photosData || []).map((p) => p.id);
    if (photoIds.length > 0) {
      const { data: allFeedbacks } = await supabase
        .from("feedbacks")
        .select("photo_id")
        .in("photo_id", photoIds);
      
      const counts: Record<string, number> = {};
      let total = 0;
      (allFeedbacks || []).forEach((f) => {
        counts[f.photo_id] = (counts[f.photo_id] || 0) + 1;
        total++;
      });
      setPhoteFeedbackCounts(counts);
      setTotalFeedbackCount(total);
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    void fetchAlbumData();
  }, [fetchAlbumData]);

  const loadFeedbacksForPhoto = useCallback(async (photoId: string, page: number) => {
    setLoadingFeedbacks(true);
    const from = (page - 1) * FEEDBACKS_PER_PAGE;
    const to = from + FEEDBACKS_PER_PAGE - 1;

    const { data, count } = await supabase
      .from("feedbacks")
      .select("*, clients(*)", { count: "exact" })
      .eq("photo_id", photoId)
      .order("created_at", { ascending: false })
      .range(from, to);

    setPhotoFeedbacks((data as any) || []);
    setFeedbackTotal(count || 0);
    setLoadingFeedbacks(false);
  }, []);

  const handleSelectPhoto = (photoId: string) => {
    if (selectedPhotoId === photoId) {
      setSelectedPhotoId(null);
      return;
    }
    setSelectedPhotoId(photoId);
    setFeedbackPage(1);
    loadFeedbacksForPhoto(photoId, 1);
  };

  const handleFeedbackPageChange = (page: number) => {
    if (!selectedPhotoId) return;
    setFeedbackPage(page);
    loadFeedbacksForPhoto(selectedPhotoId, page);
  };

  const handleSyncPhotos = async () => {
    if (!album?.drive_folder_id) return;
    setSyncingPhotos(true);

    const { data, error } = await supabase.functions.invoke("fetch-drive-photos", {
      body: { folder_id: album.drive_folder_id, album_id: album.id },
    });

    if (error || data?.error) {
      toast({
        title: "Không thể đồng bộ ảnh",
        description: data?.error || error?.message || "Vui lòng kiểm tra lại quyền public của folder Google Drive.",
        variant: "destructive",
      });
      setSyncingPhotos(false);
      return;
    }

    toast({
      title: "Đồng bộ ảnh thành công",
      description: `Đã lấy ${data?.count || 0} ảnh từ Google Drive.`,
    });

    await fetchAlbumData();
    setSyncingPhotos(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Album không tồn tại</h2>
          <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            <i className="fas fa-arrow-left mr-1"></i>Quay lại Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const shareLink = `${window.location.origin}/view/${album.slug}`;
  const totalFeedbackPages = Math.ceil(feedbackTotal / FEEDBACKS_PER_PAGE);

  return (
    <div className="min-h-screen bg-muted">
      <nav className="bg-card border-b border-border px-6 md:px-12 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="font-display text-xl font-bold text-foreground">
          <i className="fas fa-arrow-left mr-2 text-sm"></i>DatPhoto
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Album header */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{album.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                <i className="fas fa-calendar-alt mr-1"></i>
                {new Date(album.created_at).toLocaleDateString("vi-VN")}
                {album.drive_folder_id && (
                  <span className="ml-3"><i className="fab fa-google-drive mr-1"></i>Drive đã kết nối</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {album.drive_folder_id && (
                <button
                  onClick={handleSyncPhotos}
                  disabled={syncingPhotos}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <i className={`fas ${syncingPhotos ? "fa-spinner fa-spin" : "fa-rotate"} mr-1.5`}></i>
                  {syncingPhotos ? "Đang đồng bộ..." : "Đồng bộ ảnh"}
                </button>
              )}
              <button
                onClick={() => { navigator.clipboard.writeText(shareLink); toast({ title: "Đã sao chép link!" }); }}
                className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              >
                <i className="fas fa-copy mr-1.5"></i>Sao chép link
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground font-display">{photos.length}</div>
            <div className="text-xs text-muted-foreground">Ảnh</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground font-display">{clients.length}</div>
            <div className="text-xs text-muted-foreground">Khách hàng</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground font-display">{totalFeedbackCount}</div>
            <div className="text-xs text-muted-foreground">Feedbacks</div>
          </div>
        </div>

        {/* Clients */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            <i className="fas fa-users mr-2"></i>Khách hàng ({clients.length})
          </h2>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có khách hàng nào xem album này.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Họ tên</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">SĐT</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Ngành nghề</th>
                    <th className="text-left py-2 text-muted-foreground font-medium">Ngày</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-b border-border/50">
                      <td className="py-2.5 text-foreground">{c.full_name}</td>
                      <td className="py-2.5 text-foreground">{c.phone}</td>
                      <td className="py-2.5 text-foreground">{c.profession || "—"}</td>
                      <td className="py-2.5 text-muted-foreground">{new Date(c.created_at).toLocaleDateString("vi-VN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Photos with Feedbacks */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            <i className="fas fa-images mr-2"></i>Ảnh & Feedbacks ({totalFeedbackCount} bình luận)
          </h2>
          {photos.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có ảnh nào.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {photos.map((photo) => {
                const count = photeFeedbackCounts[photo.id] || 0;
                const isSelected = selectedPhotoId === photo.id;
                return (
                  <div key={photo.id}>
                    <div
                      className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-colors ${isSelected ? "border-primary" : "border-transparent hover:border-primary/50"}`}
                      onClick={() => handleSelectPhoto(photo.id)}
                    >
                      <img
                        src={photo.thumbnail_url || photo.url}
                        alt=""
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                      {count > 0 && (
                        <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                          {count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Feedback panel for selected photo */}
          {selectedPhotoId && (
            <div className="mt-6 border-t border-border pt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="font-display text-base font-bold text-foreground">
                  <i className="fas fa-comments mr-2"></i>Bình luận ({feedbackTotal})
                </h3>
                <div className="flex items-center gap-2">
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-[250px]"
                    title={shareLink}
                  >
                    <i className="fas fa-external-link-alt mr-1"></i>{shareLink}
                  </a>
                  <button onClick={() => setSelectedPhotoId(null)} className="text-muted-foreground hover:text-foreground text-sm">
                    <i className="fas fa-times mr-1"></i>Đóng
                  </button>
                </div>
              </div>

              {loadingFeedbacks ? (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin text-muted-foreground"></i>
                </div>
              ) : photoFeedbacks.length === 0 ? (
                <p className="text-muted-foreground text-sm">Chưa có bình luận nào cho ảnh này.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {photoFeedbacks.map((f) => (
                      <div key={f.id} className="bg-muted rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground">
                            {f.clients?.full_name || "Khách hàng"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(f.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{f.comment}</p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalFeedbackPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button
                        onClick={() => handleFeedbackPageChange(feedbackPage - 1)}
                        disabled={feedbackPage <= 1}
                        className="px-3 py-1.5 rounded-lg text-sm border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-left"></i>
                      </button>
                      <span className="text-sm text-muted-foreground">
                        {feedbackPage} / {totalFeedbackPages}
                      </span>
                      <button
                        onClick={() => handleFeedbackPageChange(feedbackPage + 1)}
                        disabled={feedbackPage >= totalFeedbackPages}
                        className="px-3 py-1.5 rounded-lg text-sm border border-border text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <i className="fas fa-chevron-right"></i>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumDetail;
