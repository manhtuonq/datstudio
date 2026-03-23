import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";

const AlbumDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [album, setAlbum] = useState<Tables<"albums"> | null>(null);
  const [clients, setClients] = useState<Tables<"clients">[]>([]);
  const [feedbacks, setFeedbacks] = useState<(Tables<"feedbacks"> & { clients: Tables<"clients"> | null; photos: Tables<"photos"> | null })[]>([]);
  const [photos, setPhotos] = useState<Tables<"photos">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;

    const fetchData = async () => {
      const { data: albumData } = await supabase.from("albums").select("*").eq("id", id).eq("user_id", user.id).single();
      setAlbum(albumData);

      const { data: photosData } = await supabase.from("photos").select("*").eq("album_id", id).order("position");
      setPhotos(photosData || []);

      const { data: clientsData } = await supabase.from("clients").select("*").eq("album_id", id).order("created_at", { ascending: false });
      setClients(clientsData || []);

      const { data: feedbacksData } = await supabase.from("feedbacks").select("*, clients(*), photos(*)").in(
        "photo_id",
        (photosData || []).map((p) => p.id)
      );
      setFeedbacks(feedbacksData as any || []);

      setLoading(false);
    };

    fetchData();
  }, [id, user]);

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
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                }}
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
            <div className="text-2xl font-bold text-foreground font-display">{feedbacks.length}</div>
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

        {/* Feedbacks */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">
            <i className="fas fa-comments mr-2"></i>Feedbacks ({feedbacks.length})
          </h2>
          {feedbacks.length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có feedback nào.</p>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((f) => (
                <div key={f.id} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
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
          )}
        </div>
      </div>
    </div>
  );
};

export default AlbumDetail;
