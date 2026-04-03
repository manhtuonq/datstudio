import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

interface AlbumCardProps {
  album: Tables<"albums">;
  onRefresh: () => void;
}

const AlbumCard = ({ album, onRefresh }: AlbumCardProps) => {
  const { toast } = useToast();
  const shareLink = `${window.location.origin}/view/${album.slug}`;
  const date = new Date(album.created_at).toLocaleDateString("vi-VN");

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc muốn xóa album này?")) return;
    const { error } = await supabase.from("albums").delete().eq("id", album.id);
    if (error) {
      toast({ title: "Lỗi", description: "Không thể xóa album", variant: "destructive" });
    } else {
      toast({ title: "Đã xóa album" });
      onRefresh();
    }
  };

  return (
    <div className="group bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/20 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold text-foreground truncate">{album.title}</h3>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">
              <i className="fas fa-calendar-alt mr-1"></i>{date}
            </span>
            {album.drive_folder_id && (
              <span className="text-xs text-muted-foreground">
                <i className="fab fa-google-drive mr-1 text-primary/70"></i>Drive
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Share link preview */}
      <div className="bg-muted/50 rounded-xl px-3 py-2 mb-4">
        <p className="text-[11px] text-muted-foreground truncate font-mono">
          <i className="fas fa-link mr-1.5"></i>{shareLink}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Link
          to={`/dashboard/album/${album.id}`}
          className="flex-1 text-center bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          <i className="fas fa-eye mr-1.5"></i>Chi tiết
        </Link>
        <button
          onClick={() => {
            navigator.clipboard.writeText(shareLink);
            toast({ title: "Đã sao chép link!" });
          }}
          className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground hover:opacity-80 transition-opacity"
          title="Sao chép link"
        >
          <i className="fas fa-copy text-xs"></i>
        </button>
        <button
          onClick={handleDelete}
          className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors"
          title="Xóa album"
        >
          <i className="fas fa-trash text-xs"></i>
        </button>
      </div>
    </div>
  );
};

export default AlbumCard;
