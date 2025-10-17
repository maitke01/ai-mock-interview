import React, { useRef, useState, useEffect } from "react";
import modernImg from "./assets/modern-preview.jpg";
import classicImg from "./assets/classic-preview.jpg";

type Template = { id: string; name: string; image: string };
type TemplateCarouselProps = { onSelect: (id: string) => void };

const templates: Template[] = [
  { id: "modern", name: "Modern Template", image: modernImg },
  { id: "classic", name: "Classic Template", image: classicImg },
  { id: "creative", name: "Creative Template", image: modernImg },
];

const TemplateCarousel: React.FC<TemplateCarouselProps> = ({ onSelect }) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [centerIndex, setCenterIndex] = useState<number>(0);

  const cardWidth = 300;
  const gap = 20;

  useEffect(() => {
    const handleScroll = () => {
      if (!carouselRef.current) return;
      const index = Math.round(carouselRef.current.scrollLeft / (cardWidth + gap));
      setCenterIndex(index);
    };
    carouselRef.current?.addEventListener("scroll", handleScroll);
    return () => carouselRef.current?.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="w-full py-10">
      <h2 className="text-2xl font-semibold text-center mb-6">Choose a Resume Template</h2>
      <div ref={carouselRef} className="flex overflow-x-auto gap-5 px-10" style={{ scrollSnapType: "x mandatory", scrollBehavior: "smooth" }}>
        {templates.map((t, i) => {
          const isCenter = i === centerIndex;
          return (
            <div
              key={t.id}
              onClick={() => isCenter && onSelect(t.id)}
              className={`flex-shrink-0 w-[300px] h-[400px] rounded-xl overflow-hidden shadow-lg cursor-pointer transition-transform duration-300`}
              style={{ transform: isCenter ? "scale(1.1)" : "scale(0.9)", opacity: isCenter ? 1 : 0.6, scrollSnapAlign: "center" }}
            >
              <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
              <p className="text-center mt-2 font-medium">{t.name}</p>
            </div>
          );
        })}
      </div>
      <p className="text-center mt-4 text-gray-500 text-sm">Scroll left/right and click the center template</p>
    </div>
  );
};

export default TemplateCarousel;
