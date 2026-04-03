import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="flex flex-col items-center justify-center text-center px-6 py-20 md:py-32 bg-background">
      <span className="inline-block bg-secondary text-secondary-foreground text-xs font-medium px-4 py-1.5 rounded-full mb-6">
        Dành cho studio ảnh chuyên nghiệp
      </span>
      <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground max-w-3xl leading-tight mb-6">
        Chia sẻ ảnh đẹp<br />tận tay khách hàng
      </h1>
      <p className="text-muted-foreground text-lg max-w-xl mb-10">
        Tạo album, gửi link, nhận lựa chọn — tất cả trong một quy trình đơn giản, nhanh chóng và chuyên nghiệp.
      </p>
      <div className="flex items-center gap-4">
        <Link
          to="/login"
          className="bg-primary text-primary-foreground px-7 py-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Bắt đầu miễn phí
        </Link>
        <a
          href="#how-it-works"
          className="border border-border text-foreground px-7 py-3 rounded-lg font-medium text-sm hover:bg-muted transition-colors"
        >
          Xem demo
        </a>
      </div>
    </section>
  );
};

export default Hero;
