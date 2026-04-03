import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="w-full py-5 px-6 md:px-12 flex items-center justify-between bg-background">
      <Link to="/" className="font-display text-2xl font-bold tracking-tight text-foreground">
        DatPhoto
      </Link>
      <div className="flex items-center gap-6">
        <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <i className="fas fa-book mr-1.5"></i>Hướng dẫn
        </Link>
        <Link
          to="/login"
          className="text-sm font-medium bg-primary text-primary-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          <i className="fas fa-sign-in-alt mr-1.5"></i>Đăng nhập
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
