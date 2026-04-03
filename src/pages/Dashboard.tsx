import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";
import CreateAlbumModal from "@/components/dashboard/CreateAlbumModal";
import AlbumCard from "@/components/dashboard/AlbumCard";
import FeedbackNotifications from "@/components/dashboard/FeedbackNotifications";

const ALBUMS_PER_PAGE = 9;

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
  const [currentPage, setCurrentPage] = useState(1);

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
    const { count: clients } = await supabase
      .from("clients")
      .select("*, albums!inner(*)", { count: "exact", head: true })
      .eq("albums.user_id", user!.id);
    setClientCount(clients || 0);

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

  // Pagination
  const totalPages = Math.ceil(filteredAlbums.length / ALBUMS_PER_PAGE);
  const paginatedAlbums = filteredAlbums.slice(
    (currentPage - 1) * ALBUMS_PER_PAGE,
    currentPage * ALBUMS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-muted">
      {/* Top banner */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center py-2.5 text-xs font-medium tracking-wide">
        <i className="fas fa-camera-retro mr-2"></i>
        Chào mừng đến với DatPhoto Studio — Quản lý album chuyên nghiệp
      </div>

      {/* Navbar */}
      <nav className="bg-card border-b border-border px-6 md:px-12 py-4 sticky top-0 z-30 backdrop-blur-sm bg-card/95">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/dashboard" className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <i className="fas fa-camera text-primary-foreground text-xs"></i>
            </div>
            DatPhoto
          </Link>
          <div className="flex items-center gap-3">
            <FeedbackNotifications />
            <span className="text-sm text-muted-foreground hidden md:block">
              <i className="fas fa-user-circle mr-1.5"></i>{user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
            >
              <i className="fas fa-sign-out-alt mr-1.5"></i>Đăng xuất
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: "fa-images", label: "Tổng Album", value: albums.length, color: "from-blue-500/10 to-blue-600/5" },
            { icon: "fa-clock", label: "Tuần này", value: albums.filter(a => {
              const d = new Date(a.created_at);
              const now = new Date();
              return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
            }).length, color: "from-emerald-500/10 to-emerald-600/5" },
            { icon: "fa-users", label: "Khách hàng", value: clientCount, color: "from-amber-500/10 to-amber-600/5" },
            { icon: "fa-comments", label: "Feedbacks", value: feedbackCount, color: "from-rose-500/10 to-rose-600/5" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-all bg-gradient-to-br ${stat.color}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                  <i className={`fas ${stat.icon} text-secondary-foreground text-sm`}></i>
                </div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold text-foreground font-display">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></i>
            <input
              type="text"
              placeholder="Tìm kiếm album..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            <i className="fas fa-plus mr-2"></i>Tạo Album Mới
          </button>
        </div>

        {/* Album list */}
        {loading ? (
          <div className="text-center py-20">
            <i className="fas fa-spinner fa-spin text-2xl text-muted-foreground"></i>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="text-center py-20 bg-card border border-border rounded-2xl">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-images text-3xl text-muted-foreground"></i>
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">
              {searchTerm ? "Không tìm thấy album" : "Chưa có album nào"}
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              {searchTerm ? "Thử tìm kiếm với từ khóa khác" : "Bắt đầu bằng cách tạo album ảnh đầu tiên của bạn"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <i className="fas fa-plus mr-2"></i>Tạo Album Đầu Tiên
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedAlbums.map((album) => (
                <AlbumCard key={album.id} album={album} onRefresh={fetchAlbums} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="w-10 h-10 rounded-xl border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-10 h-10 rounded-xl text-sm font-medium transition-colors ${
                      p === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="w-10 h-10 rounded-xl border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-chevron-right text-xs"></i>
                </button>
              </div>
            )}

            {/* Album count info */}
            <div className="text-center mt-4 text-xs text-muted-foreground">
              Hiển thị {(currentPage - 1) * ALBUMS_PER_PAGE + 1}–{Math.min(currentPage * ALBUMS_PER_PAGE, filteredAlbums.length)} / {filteredAlbums.length} album
            </div>
          </>
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
