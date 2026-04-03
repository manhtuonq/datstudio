const HowItWorks = () => {
  const studioSteps = [
    {
      num: 1,
      title: "Upload & lưu vào Google Drive",
      desc: "Kết nối drive và tạo Album upload trực tiếp vào Drive cá nhân của bạn, nhanh chóng, không mất dữ liệu.",
    },
    {
      num: 2,
      title: "Tạo link chia sẻ",
      desc: "Có thể bảo vệ bằng mật khẩu và kiểm soát quyền truy cập.",
    },
    {
      num: 3,
      title: "Gửi link cho khách hàng",
      desc: "Qua Zalo, Facebook, SMS hoặc bất kỳ kênh nào.",
    },
    {
      num: 4,
      title: "Nhận danh sách ảnh đã chọn",
      desc: "Xem ngay ảnh nào khách chọn, không cần hỏi lại!",
    },
  ];

  const clientSteps = [
    {
      num: 1,
      title: "Nhận link từ studio",
      desc: "Click vào link để mở album ảnh.",
    },
    {
      num: 2,
      title: "Xem ảnh to, rõ nét",
      desc: "Load nhanh, xem mượt trên mọi thiết bị.",
    },
    {
      num: 3,
      title: "Click chọn ảnh yêu thích",
      desc: "Dễ dàng chọn nhiều ảnh cùng lúc.",
    },
    {
      num: 4,
      title: "Để lại comment nếu cần",
      desc: "Ghi chú trực tiếp trên từng ảnh.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 px-6 md:px-12 bg-muted">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-2 gap-12">
          {/* Studio Column */}
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              <i className="fas fa-camera mr-2"></i>Dành cho Studio
            </h2>
            <div className="space-y-6 mt-8">
              {studioSteps.map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Client Column */}
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              <i className="fas fa-user mr-2"></i>Đối với Khách Hàng
            </h2>
            <div className="space-y-6 mt-8">
              {clientSteps.map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">{step.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
