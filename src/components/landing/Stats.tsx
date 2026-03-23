const Stats = () => {
  const stats = [
    { value: "5,000+", label: "Studio tin dùng" },
    { value: "1.2M", label: "Ảnh đã chia sẻ" },
    { value: "98%", label: "Khách hài lòng" },
    { value: "Miễn phí", label: "Bắt đầu ngay hôm nay" },
  ];

  return (
    <section className="bg-primary py-16 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">{stat.value}</div>
            <div className="text-primary-foreground/70 text-sm mt-2">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Stats;
