const Footer = () => {
  return (
    <footer className="bg-background py-16 px-6 md:px-12 border-t border-border">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12">
        <div>
          <h3 className="font-display text-xl font-bold text-foreground mb-4">DatPhoto</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Giải pháp quản lý và chia sẻ ảnh chuyên nghiệp dành cho studio ảnh Việt Nam.
          </p>
        </div>
        <div>
          <h4 className="font-display text-lg font-semibold text-foreground mb-4">Liên Kết</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><a href="#" className="hover:text-foreground transition-colors">Hướng dẫn sử dụng</a></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display text-lg font-semibold text-foreground mb-4">Liên Hệ</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><i className="fas fa-envelope mr-2"></i>updating@StudioBase.vn</li>
            <li><i className="fab fa-facebook mr-2"></i>DatPhoto</li>
            <li><i className="fas fa-phone mr-2"></i>0938803824</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-border text-center text-xs text-muted-foreground">
        © 2025 DatPhoto. Tất cả quyền được bảo lưu. · Điều khoản sử dụng · Chính sách bảo mật
      </div>
    </footer>
  );
};

export default Footer;
