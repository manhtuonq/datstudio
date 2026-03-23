import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

const ClientAlbumView = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [album, setAlbum] = useState<Tables<"albums"> | null>(null);
  const [photos, setPhotos] = useState<Tables<"photos">[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<Tables<"photos"> | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [photoFeedbacks, setPhotoFeedbacks] = useState<Tables<"feedbacks">[]>([]);

  useEffect(() => {
    if (!slug) return;
    const fetch = async () => {
      const { data: albumData } = await supabase.from("albums").select("*").eq("slug", slug).single();
      if (!albumData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setAlbum(albumData);

      const { data: photosData } = await supabase
        .from("photos")
        .select("*")
        .eq("album_id", albumData.id)
        .order("position")
        .limit(50);
      setPhotos(photosData || []);
      setLoading(false);
    };
    fetch();
  }, [slug]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      toast({ title: "Vui lòng nhập đầy đủ họ tên và số điện thoại", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("clients")
      .insert({
        album_id: album!.id,
        full_name: fullName.trim(),
        phone: phone.trim(),
        profession: profession.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Lỗi", description: "Không thể đăng ký", variant: "destructive" });
      return;
    }

    setClientId(data.id);
    setFormSubmitted(true);
  };

  const openLightbox = async (photo: Tables<"photos">) => {
    setLightboxPhoto(photo);
    setFeedbackText("");
    // Load feedbacks for this photo
    const { data } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("photo_id", photo.id)
      .order("created_at", { ascending: false });
    setPhotoFeedbacks(data || []);
  };

  const submitFeedback = async () => {
    if (!feedbackText.trim() || !clientId || !lightboxPhoto) return;

    const { error } = await supabase.from("feedbacks").insert({
      photo_id: lightboxPhoto.id,
      client_id: clientId,
      comment: feedbackText.trim(),
    });

    if (error) {
      toast({ title: "Lỗi", description: "Không thể gửi feedback", variant: "destructive" });
      return;
    }

    toast({ title: "Cảm ơn bạn đã góp ý!" });
    setFeedbackText("");
    // Reload feedbacks
    const { data } = await supabase
      .from("feedbacks")
      .select("*")
      .eq("photo_id", lightboxPhoto.id)
      .order("created_at", { ascending: false });
    setPhotoFeedbacks(data || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-muted-foreground mb-4"></i>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Album không tồn tại</h2>
          <p className="text-muted-foreground text-sm">Link có thể đã hết hạn hoặc không hợp lệ.</p>
        </div>
      </div>
    );
  }

  // Gate screen - lead capture form
  if (!formSubmitted) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <span className="font-display text-2xl font-bold text-foreground">DatPhoto</span>
          </div>
          <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-images text-2xl text-secondary-foreground"></i>
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">{album?.title}</h2>
              <p className="text-muted-foreground text-sm mt-2">Nhập thông tin để xem album ảnh</p>
            </div>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <i className="fas fa-user mr-1.5"></i>Họ và tên *
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <i className="fas fa-phone mr-1.5"></i>Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0912345678"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <i className="fas fa-briefcase mr-1.5"></i>Ngành nghề
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="VD: Kiến trúc sư, Giáo viên..."
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-eye mr-2"></i>Xem Album
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Gallery view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <span className="font-display text-lg font-bold text-foreground">DatPhoto</span>
            <span className="text-muted-foreground text-sm ml-3">/ {album?.title}</span>
          </div>
          <span className="text-xs text-muted-foreground">{photos.length} ảnh</span>
        </div>
      </div>

      {/* Photo Grid */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {photos.length === 0 ? (
          <div className="text-center py-20">
            <i className="fas fa-images text-4xl text-muted-foreground mb-4"></i>
            <h3 className="font-display text-xl font-semibold text-foreground">Album chưa có ảnh</h3>
            <p className="text-muted-foreground text-sm mt-2">Studio đang chuẩn bị ảnh cho bạn.</p>
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="break-inside-avoid cursor-pointer group relative rounded-xl overflow-hidden"
                onClick={() => openLightbox(photo)}
              >
                <img
                  src={photo.thumbnail_url || photo.url}
                  alt=""
                  loading="lazy"
                  className="w-full rounded-xl hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors rounded-xl flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <span className="bg-card/90 text-foreground px-3 py-1.5 rounded-lg text-xs font-medium">
                      <i className="fas fa-expand mr-1"></i>Xem
                    </span>
                    <a
                      href={photo.url}
                      download
                      onClick={(e) => e.stopPropagation()}
                      className="bg-card/90 text-foreground px-3 py-1.5 rounded-lg text-xs font-medium"
                    >
                      <i className="fas fa-download mr-1"></i>Tải
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center px-4" onClick={() => setLightboxPhoto(null)}>
          <div className="max-w-4xl w-full max-h-[90vh] flex flex-col md:flex-row gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex-1 flex items-center justify-center">
              <img
                src={lightboxPhoto.url}
                alt=""
                className="max-w-full max-h-[80vh] object-contain rounded-xl"
              />
            </div>
            <div className="w-full md:w-80 bg-card rounded-xl p-4 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">Feedback</h3>
                <button onClick={() => setLightboxPhoto(null)} className="text-muted-foreground hover:text-foreground">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Existing feedbacks */}
              <div className="space-y-3 mb-4">
                {photoFeedbacks.map((fb) => (
                  <div key={fb.id} className="bg-muted rounded-lg p-3">
                    <p className="text-sm text-foreground">{fb.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(fb.created_at).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                ))}
                {photoFeedbacks.length === 0 && (
                  <p className="text-sm text-muted-foreground">Chưa có feedback nào.</p>
                )}
              </div>

              {/* Submit feedback */}
              <div className="border-t border-border pt-4">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Để lại nhận xét..."
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={3}
                />
                <button
                  onClick={submitFeedback}
                  disabled={!feedbackText.trim()}
                  className="mt-2 w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <i className="fas fa-paper-plane mr-1.5"></i>Gửi feedback
                </button>
              </div>

              {/* Download */}
              <a
                href={lightboxPhoto.url}
                download
                className="mt-3 w-full block text-center border border-border text-foreground py-2 rounded-lg text-sm font-medium hover:bg-muted transition-colors"
              >
                <i className="fas fa-download mr-1.5"></i>Tải ảnh này
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientAlbumView;
