import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import CreateAlbumModal from "@/components/dashboard/CreateAlbumModal";
import AlbumCard from "@/components/dashboard/AlbumCard";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [albums, setAlbums] = useState<Tables<"albums">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [clientCount, setClientCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  const fetchAlbums = async () => {
    const { data, error } = await supabase
      .from("albums")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Lỗi", description: "Không thể tải danh sách album", variant: "destructive" });
    } else {
      setAlbums(data || []);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    // Get client count across all user's albums
    const { count: clients } = await supabase
      .from("clients")
      .select("*, albums!inner(*)", { count: "exact", head: true })
      .eq("albums.user_id", user!.id);
    setClientCount(clients || 0);

    // Get feedback count
    const { count: feedbacks } = await supabase
      .from("feedbacks")
      .select("*, photos!inner(*, albums!inner(*))", { count: "exact", head: true })
      .eq("photos.albums.user_id", user!.id);
    setFeedbackCount(feedbacks || 0);
  };

  useEffect(() => {
    if (user) {
      fetchAlbums();
      fetchStats();
    }
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const filteredAlbums = albums.filter((a) =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted">
      {/* Top banner */}
      <div className="bg-primary text-primary-foreground text-center py-2 text-xs">
        <i className="fas fa-info-circle mr-1.5"></i>
        Chào mừng bạn đến với DatPhoto Dashboard! Quản lý album ảnh dễ dàng.
      </div>

      {/* Navbar */}
      <nav className="bg-card border-b border-border px-6 md:px-12 py-4 flex items-center justify-between">
        <Link to="/dashboard" className="font-display text-xl font-bold text-foreground">
          DatPhoto
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden md:block">
            <i className="fas fa-user-circle mr-1.5"></i>{user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-1.5"></i>Đăng xuất
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: "fa-images", label: "Tổng Album", value: albums.length },
            { icon: "fa-clock", label: "Mới tạo", value: albums.filter(a => {
              const d = new Date(a.created_at);
              const now = new Date();
              return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
            }).length },
            { icon: "fa-users", label: "Khách hàng", value: clientCount },
            { icon: "fa-comments", label: "Feedbacks", value: feedbackCount },
          ].map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                  <i className={`fas ${stat.icon} text-secondary-foreground text-sm`}></i>
                </div>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-foreground font-display">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></i>
            <input
              type="text"
              placeholder="Tìm kiếm album..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <i className="fas fa-plus mr-2"></i>Tạo Album
          </button>
        </div>

        {/* Album list */}
        {loading ? (
          <div className="text-center py-20">
            <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-xl">
            <i className="fas fa-images text-4xl text-muted-foreground mb-4"></i>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              {searchTerm ? "Không tìm thấy album" : "Chưa có album nào"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {searchTerm ? "Thử tìm kiếm với từ khóa khác" : "Bắt đầu bằng cách tạo album ảnh đầu tiên của bạn"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-plus mr-2"></i>Tạo Album Đầu Tiên
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} onRefresh={fetchAlbums} />
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateAlbumModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchAlbums();
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
