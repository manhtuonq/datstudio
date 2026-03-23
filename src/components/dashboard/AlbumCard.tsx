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
    <div className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">{album.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            <i className="fas fa-calendar-alt mr-1"></i>{date}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              toast({ title: "Đã sao chép link!" });
            }}
            className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground hover:opacity-80 transition-opacity"
            title="Sao chép link"
          >
            <i className="fas fa-link text-xs"></i>
          </button>
          <button
            onClick={handleDelete}
            className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center text-destructive hover:opacity-80 transition-opacity"
            title="Xóa album"
          >
            <i className="fas fa-trash text-xs"></i>
          </button>
        </div>
      </div>

      {album.drive_folder_id && (
        <p className="text-xs text-muted-foreground mb-3">
          <i className="fab fa-google-drive mr-1"></i>Google Drive đã kết nối
        </p>
      )}

      <div className="flex items-center gap-2">
        <Link
          to={`/dashboard/album/${album.id}`}
          className="flex-1 text-center bg-secondary text-secondary-foreground px-3 py-2 rounded-lg text-xs font-medium hover:opacity-80 transition-opacity"
        >
          <i className="fas fa-eye mr-1"></i>Chi tiết
        </Link>
      </div>
    </div>
  );
};

export default AlbumCard;
