import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface CreateAlbumModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreateAlbumModal = ({ onClose, onCreated }: CreateAlbumModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [driveLink, setDriveLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [step, setStep] = useState<"form" | "fetching" | "done">("form");

  const extractFolderId = (link: string): string | null => {
    const match = link.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    const idMatch = link.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return idMatch ? idMatch[1] : null;
  };

  const generateSlug = (title: string): string => {
    const base = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const suffix = Math.random().toString(36).substring(2, 8);
    return `${base}-${suffix}`;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({ title: "Lỗi", description: "Vui lòng nhập tên album", variant: "destructive" });
      return;
    }

    const folderId = driveLink ? extractFolderId(driveLink) : null;
    if (driveLink && !folderId) {
      toast({ title: "Lỗi", description: "Link Google Drive không hợp lệ", variant: "destructive" });
      return;
    }

    setLoading(true);
    const slug = generateSlug(title);

    // 1. Create album in DB
    const { data: albumData, error } = await supabase.from("albums").insert({
      title: title.trim(),
      drive_folder_id: folderId,
      slug,
      user_id: user!.id,
    }).select().single();

    if (error || !albumData) {
      toast({ title: "Lỗi", description: "Không thể tạo album", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2. If Drive link provided, fetch photos via edge function
    if (folderId) {
      setStep("fetching");

      const { data: fetchData, error: fetchError } = await supabase.functions.invoke(
        "fetch-drive-photos",
        {
          body: { folder_id: folderId, album_id: albumData.id },
        }
      );

      if (fetchError) {
        console.error("Edge function error:", fetchError);
        toast({
          title: "Cảnh báo",
          description: "Album đã tạo nhưng không thể lấy ảnh từ Google Drive. Kiểm tra lại link và quyền chia sẻ folder.",
          variant: "destructive",
        });
      } else if (fetchData?.error) {
        toast({
          title: "Cảnh báo",
          description: fetchData.error,
          variant: "destructive",
        });
      } else {
        setPhotoCount(fetchData?.count || 0);
      }
    }

    setCreatedSlug(slug);
    setStep("done");
    setLoading(false);
    toast({ title: "Thành công", description: "Album đã được tạo!" });
  };

  const shareLink = createdSlug ? `${window.location.origin}/view/${createdSlug}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 px-4">
      <div className="bg-card rounded-2xl shadow-xl border border-border w-full max-w-md p-6">
        {step === "done" && createdSlug ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-check text-2xl text-secondary-foreground"></i>
            </div>
            <h3 className="font-display text-xl font-bold text-foreground mb-2">Album đã tạo thành công!</h3>
            {photoCount > 0 && (
              <p className="text-sm text-muted-foreground mb-2">
                <i className="fas fa-images mr-1"></i>Đã lấy {photoCount} ảnh từ Google Drive
              </p>
            )}
            <p className="text-muted-foreground text-sm mb-4">Gửi link bên dưới cho khách hàng:</p>
            <div className="bg-muted rounded-lg p-3 flex items-center gap-2 mb-6">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="flex-1 bg-transparent text-foreground text-sm outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast({ title: "Đã sao chép link!" });
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <i className="fas fa-copy"></i>
              </button>
            </div>
            <button
              onClick={onCreated}
              className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity w-full"
            >
              Hoàn tất
            </button>
          </div>
        ) : step === "fetching" ? (
          <div className="text-center py-8">
            <i className="fas fa-spinner fa-spin text-3xl text-primary mb-4"></i>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Đang lấy ảnh từ Google Drive...</h3>
            <p className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-foreground">
                <i className="fas fa-plus-circle mr-2"></i>Tạo Album Mới
              </h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Tên Album</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Wedding Minh & Trang"
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <i className="fab fa-google-drive mr-1.5"></i>Link Google Drive (tùy chọn)
                </label>
                <input
                  type="text"
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Folder phải được chia sẻ với quyền "Mọi người có link đều xem được"
                </p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Đang tạo...</>
                ) : (
                  <><i className="fas fa-check mr-2"></i>Tạo Album</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CreateAlbumModal;
