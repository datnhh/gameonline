(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});

  const GAME_CATALOG = [
    {
      id: 'typing',
      title: 'Bóng Bay Luyện Phím',
      subtitle: 'Tập Gõ 10 Ngón • Dễ & Khó',
      category: 'kids',
      genre: 'Thiếu nhi • Luyện bàn phím',
      devices: '⌨ Bàn phím • 📱 Cảm ứng',
      unit: 'điểm',
      accentColor: '#EC4899',
      description:
        'Trò chơi luyện gõ 10 ngón vui nhộn cho trẻ: bàn phím mẫu trên màn hình tự động sáng phím cần bấm để bắn nổ bóng bay chữ cái và từ vựng.',
      gradient: 'linear-gradient(180deg, #FCE7F3 0%, #FBCFE8 100%)',
      helpSteps: [
        { icon: '⌨️', title: 'Thao tác', text: 'Gõ phím chữ cái trên bàn phím máy tính hoặc bấm trực tiếp vào bàn phím ảo trên màn hình.' },
        { icon: '🎈', title: 'Mục tiêu', text: 'Bắn nổ các quả bóng bay trước khi chúng rơi chạm vạch giới hạn phía dưới.' },
        { icon: '💡', title: 'Mẹo đạt điểm cao', text: 'Phím màu vàng phát sáng trên bàn phím mẫu chính là chữ cái tiếp theo cần gõ!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="75" cy="42" rx="34" ry="18" fill="#FFFFFF" opacity="0.85"/>
          <ellipse cx="330" cy="36" rx="38" ry="20" fill="#FFFFFF" opacity="0.85"/>
          <g transform="translate(122, 56)">
            <path d="M0,32 Q-6,48 4,60" stroke="#2B2D42" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <ellipse cx="0" cy="0" rx="28" ry="33" fill="#FF595E" stroke="#2B2D42" stroke-width="3"/>
            <ellipse cx="-9" cy="-11" rx="7" ry="11" transform="rotate(-25 -9 -11)" fill="#FFFFFF" opacity="0.6"/>
            <text x="0" y="9" fill="#FFFFFF" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" text-anchor="middle">A</text>
          </g>
          <g transform="translate(200, 42)">
            <path d="M0,34 Q6,50 -4,64" stroke="#2B2D42" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <ellipse cx="0" cy="0" rx="30" ry="35" fill="#FFCA3A" stroke="#2B2D42" stroke-width="3"/>
            <ellipse cx="-10" cy="-12" rx="7" ry="11" transform="rotate(-25 -10 -12)" fill="#FFFFFF" opacity="0.65"/>
            <text x="0" y="10" fill="#2B2D42" font-family="Baloo 2, sans-serif" font-size="28" font-weight="800" text-anchor="middle">B</text>
          </g>
          <g transform="translate(278, 56)">
            <path d="M0,32 Q-5,48 3,60" stroke="#2B2D42" stroke-width="2.5" fill="none" stroke-linecap="round"/>
            <ellipse cx="0" cy="0" rx="28" ry="33" fill="#38BDF8" stroke="#2B2D42" stroke-width="3"/>
            <ellipse cx="-9" cy="-11" rx="7" ry="11" transform="rotate(-25 -9 -11)" fill="#FFFFFF" opacity="0.6"/>
            <text x="0" y="9" fill="#FFFFFF" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" text-anchor="middle">C</text>
          </g>
          <rect x="106" y="114" width="188" height="40" rx="12" fill="#FFFFFF" stroke="#2B2D42" stroke-width="3"/>
          <rect x="116" y="121" width="36" height="26" rx="7" fill="#FFCA3A" stroke="#2B2D42" stroke-width="2.5"/>
          <text x="134" y="139" fill="#2B2D42" font-family="Baloo 2, sans-serif" font-size="16" font-weight="800" text-anchor="middle">A</text>
          <rect x="158" y="121" width="36" height="26" rx="7" fill="#F1F5F9" stroke="#2B2D42" stroke-width="2.5"/>
          <text x="176" y="139" fill="#2B2D42" font-family="Baloo 2, sans-serif" font-size="16" font-weight="800" text-anchor="middle">S</text>
          <rect x="200" y="121" width="36" height="26" rx="7" fill="#F1F5F9" stroke="#2B2D42" stroke-width="2.5"/>
          <text x="218" y="139" fill="#2B2D42" font-family="Baloo 2, sans-serif" font-size="16" font-weight="800" text-anchor="middle">D</text>
          <rect x="242" y="121" width="36" height="26" rx="7" fill="#F1F5F9" stroke="#2B2D42" stroke-width="2.5"/>
          <text x="260" y="139" fill="#2B2D42" font-family="Baloo 2, sans-serif" font-size="16" font-weight="800" text-anchor="middle">F</text>
        </svg>
      `
    },
    {
      id: 'maze',
      title: 'Mê Cung Siêu Nhân',
      subtitle: 'Giải Cứu Công Chúa • 4 Siêu Anh Hùng',
      category: 'kids',
      genre: 'Thiếu nhi • Luyện chuột & phím',
      devices: '🖱 Kéo chuột • ⌨ Mũi tên',
      unit: 'điểm',
      accentColor: '#2563EB',
      description:
        'Hóa thân thành Người Nhện, The Flash, Batman hoặc Superman vượt mê cung giải cứu Công Chúa, hỗ trợ cả kéo chuột lẫn phím mũi tên (Dễ & Khó).',
      gradient: 'linear-gradient(180deg, #DBEAFE 0%, #93C5FD 100%)',
      helpSteps: [
        { icon: '🦸', title: 'Chọn Siêu Nhân', text: 'Chọn Người Nhện, The Flash, Batman hoặc Superman trên thanh công cụ trước khi đi.' },
        { icon: '🖱️', title: 'Điều khiển', text: 'Nhấn giữ và kéo chuột theo đường mê cung hoặc bấm phím Mũi tên / WASD.' },
        { icon: '🧭', title: 'Trợ giúp', text: 'Bấm nút "Chỉ đường" nếu bé cần xem vệt sáng dẫn tới chỗ Công Chúa.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="86" y="20" width="228" height="128" rx="18" fill="#FFFFFF" stroke="#2B2D42" stroke-width="3"/>
          <g stroke="#60A5FA" stroke-width="5" stroke-linecap="round">
            <line x1="156" y1="20" x2="156" y2="96"/>
            <line x1="234" y1="68" x2="234" y2="148"/>
            <line x1="156" y1="96" x2="262" y2="96"/>
          </g>
          <path d="M122,56 L122,122 L196,122 L196,48 L274,48 L274,112" stroke="#F59E0B" stroke-width="5" stroke-dasharray="8 7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
          <g transform="translate(122, 56)">
            <circle cx="0" cy="0" r="22" fill="#EF4444" stroke="#2B2D42" stroke-width="3"/>
            <ellipse cx="-7" cy="-2" rx="6" ry="4" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2"/>
            <ellipse cx="7" cy="-2" rx="6" ry="4" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2"/>
          </g>
          <g transform="translate(274, 112)">
            <circle cx="0" cy="0" r="22" fill="#F472B6" stroke="#2B2D42" stroke-width="3"/>
            <polygon points="-14,-18 -7,-32 0,-22 7,-32 14,-18" fill="#FACC15" stroke="#2B2D42" stroke-width="2.5" stroke-linejoin="round"/>
            <circle cx="-6" cy="-2" r="2.8" fill="#2B2D42"/>
            <circle cx="6" cy="-2" r="2.8" fill="#2B2D42"/>
            <path d="M-5,6 Q0,11 5,6" stroke="#2B2D42" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          </g>
        </svg>
      `
    },
    {
      id: 'feedingfrenzy',
      title: 'Cá Lớn Nuốt Cá Bé',
      subtitle: 'Luyện Điều Khiển Chuột • 2 Chế Độ',
      category: 'kids',
      genre: 'Thiếu nhi • Luyện chuột',
      devices: '🖱 Rê chuột • 📱 Chạm kéo',
      unit: 'điểm',
      accentColor: '#0284C7',
      description:
        'Giúp trẻ tập điều khiển chuột mượt mà dưới đại dương rực rỡ: ăn cá nhỏ hơn để tiến hóa qua 5 cấp độ thành Cá Mập Vua.',
      gradient: 'linear-gradient(180deg, #CFFAFE 0%, #67E8F9 100%)',
      helpSteps: [
        { icon: '🖱️', title: 'Di chuyển mượt', text: 'Di chuyển chuột hoặc chạm kéo trên màn hình, chú cá sẽ bơi theo con trỏ của bạn.' },
        { icon: '🐟', title: 'Luật tiến hóa', text: 'Ăn các chú cá nhỏ hơn hoặc bằng cấp hiện tại để lớn lên; tránh cá săn mồi to hơn.' },
        { icon: '⚡', title: 'Tăng tốc & Ngọc trai', text: 'Bấm chuột trái để lướt nhanh và nhặt Ngọc Trai dưới đáy biển để nhận điểm thưởng lớn.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <path d="M0,145 Q100,130 200,145 T400,145 L400,168 L0,168 Z" fill="#FDE68A" opacity="0.75"/>
          <circle cx="115" cy="44" r="7" fill="#FFFFFF" stroke="#0284C7" stroke-width="2"/>
          <circle cx="132" cy="28" r="10" fill="#FFFFFF" stroke="#0284C7" stroke-width="2"/>
          <g transform="translate(178, 84)">
            <polygon points="-44,0 -74,-26 -70,0 -74,26" fill="#FB923C" stroke="#2B2D42" stroke-width="3" stroke-linejoin="round"/>
            <path d="M-12,-28 Q6,-48 20,-26" fill="#FFCA3A" stroke="#2B2D42" stroke-width="3" stroke-linejoin="round"/>
            <ellipse cx="0" cy="0" rx="48" ry="31" fill="#FF6B35" stroke="#2B2D42" stroke-width="3"/>
            <path d="M-8,-29 Q2,0 -8,29" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" fill="none"/>
            <path d="M-8,-29 Q2,0 -8,29" stroke="#2B2D42" stroke-width="2" stroke-linecap="round" fill="none"/>
            <circle cx="24" cy="-6" r="9" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2.5"/>
            <circle cx="27" cy="-6" r="4.5" fill="#2B2D42"/>
            <path d="M18,10 Q28,17 36,9" stroke="#2B2D42" stroke-width="3" fill="none" stroke-linecap="round"/>
          </g>
          <g transform="translate(292, 78)">
            <polygon points="20,0 35,-12 35,12" fill="#4ADE80" stroke="#2B2D42" stroke-width="2.5" stroke-linejoin="round"/>
            <ellipse cx="0" cy="0" rx="22" ry="15" fill="#22C55E" stroke="#2B2D42" stroke-width="2.5"/>
            <circle cx="-9" cy="-3" r="4" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2"/>
            <circle cx="-10" cy="-3" r="2" fill="#2B2D42"/>
          </g>
        </svg>
      `
    },
    {
      id: 'whackamole',
      title: 'Đập Chuột Vui Nhộn',
      subtitle: 'Luyện Phản Xạ Bấm Chuột • Dễ & Khó',
      category: 'kids',
      genre: 'Thiếu nhi • Phản xạ chuột',
      devices: '🖱 Bấm chuột • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#16A34A',
      description:
        'Rèn luyện phản xạ mắt và tay cho trẻ: cầm búa hoạt hình đập trúng Chuột Nâu và Chuột Vàng Vương Miện, khéo léo tránh các chú Thỏ Trắng.',
      gradient: 'linear-gradient(180deg, #DCFCE7 0%, #86EFAC 100%)',
      helpSteps: [
        { icon: '🔨', title: 'Cách chơi', text: 'Di chuyển búa và bấm chuột trái (hoặc chạm màn hình) vào đúng ô có chuột trồi lên.' },
        { icon: '👑', title: 'Chuột Vàng thưởng lớn', text: 'Chuột đội vương miện vàng mang lại điểm gấp gần 3 lần chuột thường!' },
        { icon: '🐰', title: 'Tránh Thỏ Trắng', text: 'Đừng đập nhầm các chú Thỏ Trắng đáng yêu kẻo bị trừ điểm và mất chuỗi Combo.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="200" cy="136" rx="74" ry="20" fill="#78350F" stroke="#2B2D42" stroke-width="3"/>
          <rect x="162" y="54" width="76" height="80" rx="38" fill="#B45309" stroke="#2B2D42" stroke-width="3"/>
          <polygon points="176,54 186,32 200,46 214,32 224,54" fill="#FACC15" stroke="#2B2D42" stroke-width="2.5" stroke-linejoin="round"/>
          <circle cx="184" cy="82" r="5.5" fill="#2B2D42"/>
          <circle cx="216" cy="82" r="5.5" fill="#2B2D42"/>
          <ellipse cx="174" cy="94" rx="7" ry="4" fill="#FB7185"/>
          <ellipse cx="226" cy="94" rx="7" ry="4" fill="#FB7185"/>
          <ellipse cx="200" cy="94" rx="11" ry="7" fill="#F43F5E" stroke="#2B2D42" stroke-width="2.5"/>
          <rect x="193" y="104" width="14" height="9" rx="3" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2"/>
          <g transform="translate(288, 56) rotate(-25)">
            <rect x="-7" y="0" width="14" height="54" rx="6" fill="#FACC15" stroke="#2B2D42" stroke-width="3"/>
            <rect x="-32" y="-26" width="64" height="32" rx="10" fill="#EF4444" stroke="#2B2D42" stroke-width="3"/>
            <circle cx="-32" cy="-10" r="6" fill="#FEF08A" stroke="#2B2D42" stroke-width="2"/>
          </g>
        </svg>
      `
    },
    {
      id: 'bubbleshooter',
      title: 'Khủng Long Bắn Trứng',
      subtitle: 'Ghép 3 Bóng Màu • Dễ & Khó',
      category: 'puzzle',
      genre: 'Thiếu nhi • Giải đố Hành động',
      devices: '🖱 Ngắm bắn • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#E11D48',
      description:
        'Cùng Khủng Long Con ngắm bắn các quả trứng phép thuật cùng màu để làm nổ tung cả chùm bóng, có tia laser dẫn đường cho bé ở chế độ Dễ.',
      gradient: 'linear-gradient(180deg, #FFE4E6 0%, #FBCFE8 100%)',
      helpSteps: [
        { icon: '🎯', title: 'Ngắm & Bắn', text: 'Rê chuột hoặc chạm kéo để chỉnh tia ngắm, sau đó bấm chuột (hoặc thả tay) để bắn trứng.' },
        { icon: '💥', title: 'Nổ cụm & Rơi tự do', text: 'Ghép từ 3 quả trứng cùng màu trở lên để làm nổ. Các quả trứng mất điểm bám phía trên sẽ rơi xuống cộng điểm lớn!' },
        { icon: '🔄', title: 'Đổi trứng dự bị', text: 'Nhấn phím Space hoặc nút "Đổi Trứng" để hoán đổi giữa quả trứng đang cầm và quả trứng tiếp theo.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="148" cy="38" r="22" fill="#FF595E" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="196" cy="38" r="22" fill="#FF595E" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="244" cy="38" r="22" fill="#38BDF8" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="172" cy="76" r="22" fill="#FFCA3A" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="220" cy="76" r="22" fill="#4ADE80" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="268" cy="76" r="22" fill="#A855F7" stroke="#2B2D42" stroke-width="3"/>
          <line x1="196" y1="138" x2="174" y2="96" stroke="#F59E0B" stroke-width="4.5" stroke-dasharray="6 6" stroke-linecap="round"/>
          <circle cx="196" cy="138" r="22" fill="#FF595E" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="189" cy="131" r="6" fill="#FFFFFF" opacity="0.65"/>
        </svg>
      `
    },
    {
      id: 'brickbreaker',
      title: 'Phá Gạch Vũ Trụ',
      subtitle: 'Giải Cứu Hành Tinh • Dễ & Khó',
      category: 'puzzle',
      genre: 'Thiếu nhi • Phản xạ & Giải đố',
      devices: '🖱 Rê chuột • ⌨ Phím • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#4F46E5',
      description:
        'Điều khiển tàu đệm năng lượng hứng bóng phá vỡ pháo đài gạch vũ trụ, nhặt vật phẩm nhân 3 bóng, mở rộng ván trượt và súng đôi Laser.',
      gradient: 'linear-gradient(180deg, #E0E7FF 0%, #C7D2FE 100%)',
      helpSteps: [
        { icon: '🛸', title: 'Điều khiển ván trượt', text: 'Di chuyển chuột ngang, kéo tay trên màn hình cảm ứng hoặc dùng phím Mũi tên Trái/Phải.' },
        { icon: '🔮', title: 'Săn vật phẩm rơi', text: 'Đón bắt các viên thuốc năng lượng rơi xuống để kích hoạt X3 Bóng, Ván Rộng, Súng Đôi Laser hoặc +1 Tim.' },
        { icon: '📐', title: 'Đổi góc nảy bóng', text: 'Đỡ bóng ở hai mép ván trượt để tạo góc bắn chéo xuyên vào các khe gạch hẹp.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="92" y="24" width="66" height="24" rx="7" fill="#FF595E" stroke="#2B2D42" stroke-width="2.8"/>
          <rect x="167" y="24" width="66" height="24" rx="7" fill="#FFCA3A" stroke="#2B2D42" stroke-width="2.8"/>
          <rect x="242" y="24" width="66" height="24" rx="7" fill="#4ADE80" stroke="#2B2D42" stroke-width="2.8"/>
          <rect x="128" y="56" width="66" height="24" rx="7" fill="#38BDF8" stroke="#2B2D42" stroke-width="2.8"/>
          <rect x="204" y="56" width="66" height="24" rx="7" fill="#A855F7" stroke="#2B2D42" stroke-width="2.8"/>
          <circle cx="190" cy="108" r="8" fill="#FDE047" opacity="0.6"/>
          <circle cx="204" cy="95" r="13" fill="#FFCA3A" stroke="#2B2D42" stroke-width="3"/>
          <rect x="136" y="130" width="128" height="20" rx="10" fill="#38BDF8" stroke="#2B2D42" stroke-width="3"/>
          <rect x="172" y="134" width="56" height="12" rx="6" fill="#FEF08A"/>
        </svg>
      `
    },
    {
      id: 'mathsnake',
      title: 'Rồng Con Săn Táo Toán Học',
      subtitle: 'Vừa Chơi Vừa Học Toán • Dễ & Khó',
      category: 'puzzle',
      genre: 'Thiếu nhi • Toán học & Điều khiển',
      devices: '⌨ Mũi tên • 🖱 Chuột • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#059669',
      description:
        'Tính nhẩm nhanh phép toán trên màn hình rồi dẫn Rồng Con đi ăn đúng quả táo mang số kết quả chính xác để Rồng lớn nhanh.',
      gradient: 'linear-gradient(180deg, #ECFCCB 0%, #A3E635 100%)',
      helpSteps: [
        { icon: '🧮', title: 'Đọc phép tính', text: 'Quan sát phép tính hiển thị ở bảng vàng phía trên sân cỏ.' },
        { icon: '🐉', title: 'Dẫn đường Rồng Con', text: 'Dùng phím Mũi tên / WASD hoặc bấm trực tiếp vào ô trên sân cỏ để Rồng Con rẽ hướng.' },
        { icon: '🍎', title: 'Ăn đúng táo kết quả', text: 'Ăn quả táo mang số đúng để ghi điểm và nối dài chuỗi Combo; tránh ăn nhầm quả táo số sai!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="120" y="18" width="160" height="38" rx="12" fill="#FEF08A" stroke="#2B2D42" stroke-width="3"/>
          <text x="200" y="44" fill="#2B2D42" font-family="Baloo 2, sans-serif" font-size="22" font-weight="800" text-anchor="middle">5 + 3 = ?</text>
          <circle cx="112" cy="112" r="18" fill="#16A34A" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="144" cy="108" r="21" fill="#22C55E" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="182" cy="104" r="26" fill="#4ADE80" stroke="#2B2D42" stroke-width="3"/>
          <circle cx="175" cy="96" r="5.5" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2"/>
          <circle cx="191" cy="96" r="5.5" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2"/>
          <circle cx="176" cy="96" r="2.5" fill="#2B2D42"/>
          <circle cx="192" cy="96" r="2.5" fill="#2B2D42"/>
          <path d="M175,112 Q183,118 191,112" stroke="#2B2D42" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <g transform="translate(274, 104)">
            <path d="M0,-24 Q8,-34 14,-26" stroke="#15803D" stroke-width="4" fill="none" stroke-linecap="round"/>
            <circle cx="0" cy="0" r="25" fill="#EF4444" stroke="#2B2D42" stroke-width="3"/>
            <text x="0" y="8" fill="#FFFFFF" font-family="Baloo 2, sans-serif" font-size="24" font-weight="800" text-anchor="middle">8</text>
          </g>
        </svg>
      `
    },
    {
      id: 'sokoban',
      title: 'Hiệp Sĩ Đẩy Đá Mở Kho Báu',
      subtitle: 'Giải Đố Đẩy Đá • Có Nút Đi Lại',
      category: 'puzzle',
      genre: 'Thiếu nhi • Tư duy Không gian',
      devices: '⌨ Mũi tên • 🖱 Bấm ô • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#D97706',
      description:
        'Giúp Hiệp Sĩ Nhí suy nghĩ đường đi thông minh để đẩy các viên đá phép thuật đè lên công tắc, mở khóa Rương Vàng Kho Báu.',
      gradient: 'linear-gradient(180deg, #FEF3C7 0%, #FCD34D 100%)',
      helpSteps: [
        { icon: '💎', title: 'Quy tắc đẩy đá', text: 'Hiệp Sĩ chỉ có thể ĐẨY từng viên đá về phía trước (không thể kéo ngược lại hoặc đẩy 2 viên cùng lúc).' },
        { icon: '✨', title: 'Kích hoạt công tắc', text: 'Đẩy tất cả các viên đá đè lên các vòng tròn năng lượng màu xanh để mở Rương Kho Báu.' },
        { icon: '↩', title: 'Đừng ngại thử nghiệm', text: 'Nếu lỡ đẩy đá vào góc tường, bấm nút "Đi Lại (Z)" hoặc "Xếp Lại Màn" bất cứ lúc nào!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(112, 92)">
            <circle cx="0" cy="0" r="26" fill="#38BDF8" stroke="#2B2D42" stroke-width="3"/>
            <rect x="-14" y="-8" width="28" height="10" rx="5" fill="#FFFFFF" stroke="#2B2D42" stroke-width="2.5"/>
            <circle cx="-6" cy="-3" r="2.5" fill="#2B2D42"/>
            <circle cx="6" cy="-3" r="2.5" fill="#2B2D42"/>
          </g>
          <g transform="translate(172, 58)">
            <rect x="0" y="0" width="64" height="64" rx="14" fill="#F59E0B" stroke="#2B2D42" stroke-width="3"/>
            <rect x="10" y="10" width="44" height="44" rx="8" fill="#FDE047" stroke="#2B2D42" stroke-width="2.5"/>
            <polygon points="32,18 44,32 32,46 20,32" fill="#FF6B35" stroke="#2B2D42" stroke-width="2"/>
          </g>
          <path d="M246,90 L268,90" stroke="#2B2D42" stroke-width="4" stroke-linecap="round"/>
          <polygon points="266,82 278,90 266,98" fill="#2B2D42"/>
          <circle cx="304" cy="90" r="24" fill="#BAE6FD" stroke="#2B2D42" stroke-width="3" stroke-dasharray="7 5"/>
          <circle cx="304" cy="90" r="10" fill="#0EA5E9"/>
        </svg>
      `
    },
    {
      id: 'memorybattle',
      title: 'Lật Hình Siêu Nhân Đấu Boss',
      subtitle: 'Luyện Trí Nhớ • Tung Chưởng Diệt Boss',
      category: 'puzzle',
      genre: 'Thiếu nhi • Luyện trí nhớ',
      devices: '🖱 Bấm chuột • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#7C3AED',
      description:
        'Lật mở các cặp thẻ bài Siêu Anh Hùng giống nhau để phóng tuyệt chiêu tấn công Quái Vật Vũ Trụ hoặc bật khiên hồi máu cho đội.',
      gradient: 'linear-gradient(180deg, #EDE9FE 0%, #C4B5FD 100%)',
      helpSteps: [
        { icon: '👁️', title: 'Ghi nhớ nhanh', text: 'Đầu mỗi màn chơi, các thẻ bài sẽ mở sẵn trong vài giây để bé ghi nhớ vị trí.' },
        { icon: '⚡', title: 'Ghép cặp tung chưởng', text: 'Lật trúng 2 thẻ giống nhau sẽ lập tức phóng đòn tấn công trừ máu Boss (thẻ Tim giúp hồi máu cho Đội Siêu Nhân).' },
        { icon: '💡', title: 'Trợ giúp Soi Thẻ', text: 'Mỗi màn chơi bạn có 1 quyền bấm nút "Soi Thẻ" để nhìn lại toàn bộ bàn.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(115, 30) rotate(-7)">
            <rect x="0" y="0" width="76" height="104" rx="14" fill="#FFFFFF" stroke="#2B2D42" stroke-width="3"/>
            <rect x="8" y="8" width="60" height="88" rx="9" fill="#FEF08A" stroke="#2B2D42" stroke-width="2"/>
            <text x="38" y="64" font-size="38" text-anchor="middle">⚡</text>
          </g>
          <g transform="translate(208, 28) rotate(7)">
            <rect x="0" y="0" width="76" height="104" rx="14" fill="#FFFFFF" stroke="#2B2D42" stroke-width="3"/>
            <rect x="8" y="8" width="60" height="88" rx="9" fill="#BAE6FD" stroke="#2B2D42" stroke-width="2"/>
            <text x="38" y="64" font-size="38" text-anchor="middle">⚡</text>
          </g>
        </svg>
      `
    },
    {
      id: 'lasermirror',
      title: 'Nối Gương Dẫn Tia Sáng',
      subtitle: 'Xoay Gương 45° • Sạc Pin Cứu Robot',
      category: 'puzzle',
      genre: 'Thiếu nhi • Khoa học & Logic',
      devices: '🖱 Bấm xoay gương • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#0D9488',
      description:
        'Bấm chuột xoay các tấm gương phản xạ 45° để dẫn tia laser đi qua các ngôi sao và nạp đầy viên pin năng lượng cho chú Robot.',
      gradient: 'linear-gradient(180deg, #CCFBF1 0%, #5EEAD4 100%)',
      helpSteps: [
        { icon: '🪞', title: 'Xoay gương 45°', text: 'Bấm chuột hoặc chạm vào bất kỳ ô gương nào trên lưới để lật hướng gương (/ hoặc \\).' },
        { icon: '🤖', title: 'Sạc pin cho Robot', text: 'Dẫn tia laser đỏ đi qua các ngôi sao vàng và chiếu trúng chú Robot để sạc đầy năng lượng.' },
        { icon: '💡', title: 'Gợi ý thông minh', text: 'Bấm nút "Gợi Ý Xoay 1 Gương" nếu bạn muốn hệ thống tự động chỉnh đúng 1 tấm gương trên đường đi.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="82" y="96" width="38" height="28" rx="8" fill="#FF595E" stroke="#2B2D42" stroke-width="3"/>
          <polyline points="120,110 196,110 196,48 282,48" fill="none" stroke="#FF595E" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="120,110 196,110 196,48 282,48" fill="none" stroke="#FEF08A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="178" y1="128" x2="214" y2="92" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
          <line x1="178" y1="128" x2="214" y2="92" stroke="#0284C7" stroke-width="5" stroke-linecap="round"/>
          <line x1="178" y1="66" x2="214" y2="30" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
          <line x1="178" y1="66" x2="214" y2="30" stroke="#0284C7" stroke-width="5" stroke-linecap="round"/>
          <g transform="translate(298, 48)">
            <rect x="-24" y="-24" width="48" height="48" rx="14" fill="#4ADE80" stroke="#2B2D42" stroke-width="3"/>
            <circle cx="-8" cy="-4" r="4.5" fill="#2B2D42"/>
            <circle cx="8" cy="-4" r="4.5" fill="#2B2D42"/>
            <path d="M-8,8 Q0,15 8,8" stroke="#2B2D42" stroke-width="3" fill="none" stroke-linecap="round"/>
          </g>
        </svg>
      `
    },
    {
      id: 'caro',
      title: 'Cờ Caro Chiến Thuật',
      subtitle: 'Gomoku 15x15 • Đấu AI & 2 Người',
      category: 'strategy',
      genre: 'Trí tuệ • Đối kháng',
      devices: '💻 Chuột • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#0284C7',
      description:
        'Bàn cờ 15x15 sắc nét với AI đánh giá thế cờ công-thủ 3 cấp độ hoặc chế độ 2 người chơi chung máy.',
      gradient: 'linear-gradient(180deg, #E0F2FE 0%, #7DD3FC 100%)',
      helpSteps: [
        { icon: '⭕', title: 'Luật thắng 5 quân', text: 'Người chơi xếp được 5 quân liên tiếp theo hàng ngang, dọc hoặc chéo trước sẽ giành chiến thắng.' },
        { icon: '🤖', title: '2 Chế độ chơi', text: 'Chơi với Máy (Dễ/Vừa/Khó) để tích lũy chuỗi thắng ghi danh Top 3, hoặc đấu 2 người trên cùng thiết bị.' },
        { icon: '↶', title: 'Đi lại nước cờ', text: 'Sử dụng nút "Đi lại" trên thanh công cụ nếu bạn bấm nhầm ô.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="116" y="16" width="168" height="136" rx="16" fill="#FFFDF7" stroke="#2B2D42" stroke-width="3"/>
          <g stroke="#CBD5E1" stroke-width="2.5">
            <line x1="172" y1="16" x2="172" y2="152"/>
            <line x1="228" y1="16" x2="228" y2="152"/>
            <line x1="116" y1="62" x2="284" y2="62"/>
            <line x1="116" y1="106" x2="284" y2="106"/>
          </g>
          <g stroke="#0284C7" stroke-width="6" stroke-linecap="round">
            <line x1="132" y1="28" x2="156" y2="50"/><line x1="156" y1="28" x2="132" y2="50"/>
            <line x1="188" y1="73" x2="212" y2="95"/><line x1="212" y1="73" x2="188" y2="95"/>
            <line x1="244" y1="118" x2="268" y2="140"/><line x1="268" y1="118" x2="244" y2="140"/>
          </g>
          <circle cx="200" cy="39" r="13" stroke="#FF595E" stroke-width="6" fill="none"/>
          <circle cx="144" cy="84" r="13" stroke="#FF595E" stroke-width="6" fill="none"/>
          <line x1="128" y1="24" x2="272" y2="144" stroke="#F59E0B" stroke-width="5" stroke-dasharray="8 6" stroke-linecap="round"/>
        </svg>
      `
    },
    {
      id: 'sudoku',
      title: 'Sudoku Siêu Cấp',
      subtitle: 'Giải đố 9x9 • Ghi chú & Gợi ý',
      category: 'strategy',
      genre: 'Giải đố • Logic',
      devices: '⌨ Phím • 📱 Cảm ứng',
      unit: 'điểm',
      accentColor: '#6366F1',
      description:
        'Thử thách trí não với bộ sinh đề Sudoku tự động 3 độ khó, hỗ trợ chế độ ghi chú (Notes) và gợi ý thông minh.',
      gradient: 'linear-gradient(180deg, #E0E7FF 0%, #A5B4FC 100%)',
      helpSteps: [
        { icon: '🔢', title: 'Quy tắc 1-9', text: 'Điền các số từ 1 đến 9 sao cho mỗi hàng ngang, mỗi cột dọc và mỗi vùng 3x3 không bị trùng số nào.' },
        { icon: '✏️', title: 'Chế độ Ghi chú', text: 'Bật nút "Ghi chú (Phím N)" để viết nháp các số có thể điền vào một ô.' },
        { icon: '💡', title: '3 Quyền Gợi ý', text: 'Khi gặp ô khó, bấm nút "Dùng Gợi Ý" để mở ngay con số chính xác.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="132" y="16" width="136" height="136" rx="16" fill="#FFFFFF" stroke="#2B2D42" stroke-width="3"/>
          <line x1="177" y1="16" x2="177" y2="152" stroke="#2B2D42" stroke-width="2.5"/>
          <line x1="223" y1="16" x2="223" y2="152" stroke="#2B2D42" stroke-width="2.5"/>
          <line x1="132" y1="61" x2="268" y2="61" stroke="#2B2D42" stroke-width="2.5"/>
          <line x1="132" y1="107" x2="268" y2="107" stroke="#2B2D42" stroke-width="2.5"/>
          <rect x="178" y="62" width="44" height="44" fill="#FEF08A"/>
          <text x="155" y="47" fill="#2563EB" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" text-anchor="middle">9</text>
          <text x="200" y="93" fill="#D9381E" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" text-anchor="middle">5</text>
          <text x="245" y="138" fill="#16A34A" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" text-anchor="middle">1</text>
          <text x="155" y="138" fill="#7C3AED" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" text-anchor="middle">7</text>
          <text x="245" y="47" fill="#0284C7" font-family="Baloo 2, sans-serif" font-size="26" font-weight="800" text-anchor="middle">3</text>
        </svg>
      `
    },
    {
      id: 'domino',
      title: 'Domino Đại Chiến',
      subtitle: 'Bộ 28 Quân • Đấu trí cùng AI',
      category: 'strategy',
      genre: 'Board Game • Chiến thuật',
      devices: '💻 Chuột • 📱 Chạm',
      unit: 'điểm',
      accentColor: '#059669',
      description:
        'Đánh bài Domino truyền thống 28 quân trên bàn nỉ sang trọng. Tính toán nước chặn hai đầu để giành chiến thắng.',
      gradient: 'linear-gradient(180deg, #D1FAE5 0%, #6EE7B7 100%)',
      helpSteps: [
        { icon: '🀫', title: 'Nối quân khớp chấm', text: 'Chọn các quân cờ có viền xanh lá trên tay bạn để nối vào một trong hai đầu của dây cờ trên bàn.' },
        { icon: '🔒', title: 'Luật rút cờ Nọc', text: 'Chỉ khi trên tay không còn quân nào đánh được, bạn mới được bấm rút thêm quân từ chồng cờ Nọc bên phải bàn.' },
        { icon: '🏆', title: 'Chiến thắng ván', text: 'Ai đánh hết bài trên tay trước hoặc có tổng số chấm còn lại ít hơn khi bàn bị khóa sẽ thắng ván!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(130, 32) rotate(-10)">
            <rect x="0" y="0" width="58" height="106" rx="12" fill="#FFFFFF" stroke="#2B2D42" stroke-width="3"/>
            <line x1="6" y1="53" x2="52" y2="53" stroke="#2B2D42" stroke-width="2.5"/>
            <circle cx="18" cy="20" r="5" fill="#2563EB"/><circle cx="40" cy="36" r="5" fill="#2563EB"/>
            <circle cx="18" cy="70" r="5" fill="#16A34A"/><circle cx="29" cy="80" r="5" fill="#16A34A"/><circle cx="40" cy="90" r="5" fill="#16A34A"/>
          </g>
          <g transform="translate(212, 26) rotate(12)">
            <rect x="0" y="0" width="58" height="106" rx="12" fill="#FEF9C3" stroke="#2B2D42" stroke-width="3"/>
            <line x1="6" y1="53" x2="52" y2="53" stroke="#2B2D42" stroke-width="2.5"/>
            <circle cx="18" cy="18" r="5" fill="#EF4444"/><circle cx="40" cy="18" r="5" fill="#EF4444"/>
            <circle cx="18" cy="36" r="5" fill="#EF4444"/><circle cx="40" cy="36" r="5" fill="#EF4444"/>
            <circle cx="29" cy="78" r="6.5" fill="#2B2D42"/>
          </g>
        </svg>
      `
    },
    {
      id: 'beachhead',
      title: 'Beach Head Phòng Thủ',
      subtitle: 'Bắn súng Lô Cốt • 60 FPS Action',
      category: 'action',
      genre: 'Bắn súng • Hành động',
      devices: '🖱 Ngắm bắn • 📱 Cảm ứng',
      unit: 'điểm',
      accentColor: '#EA580C',
      description:
        'Bảo vệ bờ biển trước các đợt đổ bộ của lính dù, trực thăng và xe tăng bọc thép bằng súng máy đôi và đại pháo.',
      gradient: 'linear-gradient(180deg, #FFEDD5 0%, #FDBA74 100%)',
      helpSteps: [
        { icon: '🎯', title: 'Ngắm bắn súng máy', text: 'Di chuyển chuột và giữ chuột trái (hoặc bật chế độ Tự động bắn) để xả đạn súng máy đôi.' },
        { icon: '🚀', title: 'Khai hỏa Đại Pháo', text: 'Bấm chuột phải hoặc nhấn phím Space để bắn đạn Đại Pháo tiêu diệt xe tăng hạng nặng.' },
        { icon: '📦', title: 'Bắn kiện hàng tiếp tế', text: 'Bắn hạ các thùng hàng thả dù màu xanh để hồi máu lô cốt và nhận thêm đạn Đại Pháo.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <path d="M92,48 A24,24 0 0,1 140,48 Z" fill="#FF595E" stroke="#2B2D42" stroke-width="2.5"/>
          <line x1="96" y1="48" x2="116" y2="70" stroke="#2B2D42" stroke-width="2"/>
          <line x1="136" y1="48" x2="116" y2="70" stroke="#2B2D42" stroke-width="2"/>
          <rect x="108" y="70" width="16" height="14" rx="4" fill="#FACC15" stroke="#2B2D42" stroke-width="2"/>
          <g transform="translate(215, 84)">
            <circle cx="0" cy="0" r="44" fill="#FFFFFF" opacity="0.65"/>
            <circle cx="0" cy="0" r="32" stroke="#16A34A" stroke-width="3.5" fill="none"/>
            <circle cx="0" cy="0" r="14" stroke="#16A34A" stroke-width="2.5" fill="none"/>
            <line x1="-40" y1="0" x2="40" y2="0" stroke="#16A34A" stroke-width="3" stroke-linecap="round"/>
            <line x1="0" y1="-40" x2="0" y2="40" stroke="#16A34A" stroke-width="3" stroke-linecap="round"/>
            <circle cx="0" cy="0" r="5" fill="#EF4444"/>
          </g>
        </svg>
      `
    },
    {
      id: 'roadrash',
      title: 'Đua Xe Road Rash',
      subtitle: 'Mô-tô Tốc Độ • Đá văng đối thủ',
      category: 'action',
      genre: 'Đua xe • Hành động',
      devices: '⌨ Phím • 📱 Cảm ứng',
      unit: 'điểm',
      accentColor: '#E11D48',
      description:
        'Vít ga siêu mô-tô trên đại lộ Pseudo-3D, bật Nitro bứt tốc, lạng lách qua dòng xe và tung cú đá hạ gục các tay đua đối thủ!',
      gradient: 'linear-gradient(180deg, #FFE4E6 0%, #FDA4AF 100%)',
      helpSteps: [
        { icon: '🏍️', title: 'Lái xe & Lạng lách', text: 'Dùng phím Mũi tên Trái/Phải (hoặc A/D) để chuyển làn tránh ô tô trên đại lộ.' },
        { icon: '🦵', title: 'Tung cú đá cận chiến', text: 'Nhấn phím Space khi chạy áp sát các tay đua đối thủ để đá văng họ và nhận điểm thưởng lớn!' },
        { icon: '⚡', title: 'Bứt tốc Nitro', text: 'Giữ phím Shift hoặc nút Nitro để phun lửa tăng tốc vượt mặt toàn bộ đoàn đua.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <polygon points="168,26 232,26 320,168 80,168" fill="#64748B" stroke="#2B2D42" stroke-width="3"/>
          <line x1="200" y1="32" x2="200" y2="168" stroke="#FEF08A" stroke-width="5" stroke-dasharray="14 10" stroke-linecap="round"/>
          <g transform="translate(200, 104)">
            <rect x="-20" y="-18" width="40" height="54" rx="14" fill="#EF4444" stroke="#2B2D42" stroke-width="3"/>
            <rect x="-28" y="-12" width="56" height="8" rx="4" fill="#2B2D42"/>
            <circle cx="0" cy="-24" r="15" fill="#FACC15" stroke="#2B2D42" stroke-width="3"/>
            <rect x="-10" y="-28" width="20" height="7" rx="3.5" fill="#38BDF8" stroke="#2B2D42" stroke-width="2"/>
          </g>
        </svg>
      `
    }
  ];

  // DOM References
  const homeView = document.getElementById('homeView');
  const gameView = document.getElementById('gameView');
  const gameStageWrapper = document.getElementById('gameStageWrapper');
  const gamesGrid = document.getElementById('gamesGrid');
  const gameMount = document.getElementById('gameMount');
  const inGameTop3Bar = document.getElementById('inGameTop3Bar');
  const heroFeaturedBar = document.getElementById('heroFeaturedBar');
  const heroShowcase = document.getElementById('heroShowcase');
  const heroGamesCountEl = document.getElementById('heroGamesCount');

  const categoryTabsEl = document.getElementById('categoryTabs');
  const gameSearchInput = document.getElementById('gameSearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  const brandHomeBtn = document.getElementById('brandHomeBtn');
  const changeNameBtn = document.getElementById('changeNameBtn');
  const playerAvatar = document.getElementById('playerAvatar');
  const currentPlayerNameEl = document.getElementById('currentPlayerName');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const globalFullscreenBtn = document.getElementById('globalFullscreenBtn');

  const totalGamesCountEl = document.getElementById('totalGamesCount');
  const totalRecordsCountEl = document.getElementById('totalRecordsCount');
  const topOneCountEl = document.getElementById('topOneCount');

  // Stage Header Elements
  const backToHomeBtn = document.getElementById('backToHomeBtn');
  const activeGameTitleEl = document.getElementById('activeGameTitle');
  const activeGameSubtitleEl = document.getElementById('activeGameSubtitle');
  const hudPlayerNameEl = document.getElementById('hudPlayerName');
  const hudScoreChipEl = document.getElementById('hudScoreChip');
  const hudCurrentScoreEl = document.getElementById('hudCurrentScore');
  const hudScoreDeltaEl = document.getElementById('hudScoreDelta');
  const hudBestScoreEl = document.getElementById('hudBestScore');
  const stageHelpBtn = document.getElementById('stageHelpBtn');
  const restartGameBtn = document.getElementById('restartGameBtn');
  const stageLeaderboardBtn = document.getElementById('stageLeaderboardBtn');
  const stageFullscreenBtn = document.getElementById('stageFullscreenBtn');
  const stageFullscreenIcon = document.getElementById('stageFullscreenIcon');
  const stageFullscreenText = document.getElementById('stageFullscreenText');

  // Name Modal Elements
  const nameModalOverlay = document.getElementById('nameModalOverlay');
  const nameModalTitle = document.getElementById('nameModalTitle');
  const nameModalDesc = document.getElementById('nameModalDesc');
  const playerNameForm = document.getElementById('playerNameForm');
  const playerNameInput = document.getElementById('playerNameInput');
  const nameInputError = document.getElementById('nameInputError');
  const cancelNameModalBtn = document.getElementById('cancelNameModalBtn');

  // Leaderboard Modal Elements
  const leaderboardModalOverlay = document.getElementById('leaderboardModalOverlay');
  const lbModalTitle = document.getElementById('lbModalTitle');
  const lbModalBanner = document.getElementById('lbModalBanner');
  const lbModalList = document.getElementById('lbModalList');
  const closeLbModalBtn = document.getElementById('closeLbModalBtn');

  // Help Modal Elements
  const helpModalOverlay = document.getElementById('helpModalOverlay');
  const helpModalTitle = document.getElementById('helpModalTitle');
  const helpModalSubtitle = document.getElementById('helpModalSubtitle');
  const helpModalBody = document.getElementById('helpModalBody');
  const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');

  const toastContainer = document.getElementById('toastContainer');

  let activeGameId = null;
  let activeGameInstance = null;
  let pendingGameLaunchId = null;
  let lastNumericScore = 0;
  let scoreDeltaTimer = null;
  let hostPausedGame = false;

  // Filter & Spotlight State
  let selectedCategory = 'all';
  let searchQuery = '';
  let featuredIndex = 0;
  let featuredAutoTimer = null;
  let isHoveringFeatured = false;
  const FEATURED_AUTO_MS = 5000;

  function restartFeaturedAutoSlide() {
    if (featuredAutoTimer) {
      clearInterval(featuredAutoTimer);
    }
    featuredAutoTimer = setInterval(() => {
      if (activeGameId || document.hidden || isHoveringFeatured) return;
      setFeaturedIndex(featuredIndex + 1, true);
    }, FEATURED_AUTO_MS);
  }

  function showToast(message) {
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.textContent = message;
    toastContainer.appendChild(item);
    // Keep at most 3 toasts on screen.
    while (toastContainer.children.length > 3) {
      toastContainer.firstElementChild.remove();
    }
    setTimeout(() => {
      item.classList.add('is-leaving');
      setTimeout(() => item.remove(), 260);
    }, 3000);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function formatNumber(n) {
    return Number(n || 0).toLocaleString('vi-VN');
  }

  function syncPlayerProfileUI() {
    const savedName = ArcadeHub.storage.getPlayerName();
    if (savedName) {
      currentPlayerNameEl.textContent = savedName;
      playerAvatar.textContent = savedName.charAt(0).toUpperCase();
      hudPlayerNameEl.textContent = savedName;
    } else {
      currentPlayerNameEl.textContent = 'Chưa đặt tên';
      playerAvatar.textContent = '?';
      hudPlayerNameEl.textContent = 'Khách';
    }
  }

  function buildTop3RowsHtml(gameId, unit) {
    const top3 = ArcadeHub.storage.getTop3(gameId);
    const medals = ['🥇', '🥈', '🥉'];
    let html = '';

    for (let i = 0; i < 3; i++) {
      const entry = top3[i];
      const rankClass = `rank-${i + 1}`;
      if (entry) {
        html += `
          <div class="lb-row ${rankClass}">
            <div class="lb-left">
              <span class="lb-medal">${medals[i]}</span>
              <span class="lb-player" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span>
            </div>
            <span class="lb-score">${formatNumber(entry.score)} ${escapeHtml(unit)}</span>
          </div>
        `;
      } else {
        html += `
          <div class="lb-row ${rankClass}">
            <div class="lb-left">
              <span class="lb-medal">${medals[i]}</span>
              <span class="lb-player is-empty">Chưa có kỷ lục</span>
            </div>
            <span class="lb-score">---</span>
          </div>
        `;
      }
    }
    return html;
  }

  function renderInGameTop3(gameId) {
    if (!inGameTop3Bar) return;
    const gameMeta = GAME_CATALOG.find((g) => g.id === gameId);
    if (!gameMeta) return;

    inGameTop3Bar.innerHTML = `
      <div class="ingame-top3-title">
        <span>🏆 TOP 3 CAO THỦ — ${escapeHtml(gameMeta.title)}</span>
      </div>
      <div class="ingame-top3-grid">
        ${buildTop3RowsHtml(gameId, gameMeta.unit)}
      </div>
    `;
  }

  function setFeaturedIndex(nextIndex, fromAuto) {
    const len = GAME_CATALOG.length;
    featuredIndex = ((nextIndex % len) + len) % len;
    renderFeaturedSpotlight(true);
    if (!fromAuto) restartFeaturedAutoSlide();
    syncFeaturedCardBadge();
  }

  // Card art is drawn for a wide 400x158 banner with the subject on the right;
  // the taller showcase frames just that subject instead of slicing it.
  function toShowcaseArt(svgArt) {
    return svgArt;
  }

  function renderShowcase(game, animate) {
    if (!heroShowcase) return;
    heroShowcase.innerHTML = `
      <div class="showcase-stage${animate ? ' is-entering' : ''}" role="button" tabindex="0"
        style="background: ${game.gradient}; --card-accent: ${game.accentColor || '#38bdf8'};">
        <div class="showcase-floor" aria-hidden="true"></div>
        <div class="showcase-light" aria-hidden="true"></div>
        <div class="showcase-art" aria-hidden="true">${toShowcaseArt(game.svgArt)}</div>
        <div class="showcase-caption">
          <span class="showcase-genre">${escapeHtml(game.genre)}</span>
          <strong>${escapeHtml(game.title)}</strong>
          <small>${escapeHtml(game.subtitle)}</small>
        </div>
      </div>
      <div class="showcase-dots" role="group" aria-label="Chọn game gợi ý">
        ${GAME_CATALOG.map(
          (g, idx) =>
            `<button type="button" class="showcase-dot" data-feature-index="${idx}" aria-label="${escapeHtml(g.title)}" aria-current="${idx === featuredIndex ? 'true' : 'false'}"></button>`
        ).join('')}
      </div>
    `;

    const stage = heroShowcase.querySelector('.showcase-stage');
    const launch = () => {
      ArcadeHub.sound.click();
      requestLaunchGame(game.id);
    };
    stage.addEventListener('click', launch);
    stage.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        launch();
      }
    });
    heroShowcase.querySelectorAll('[data-feature-index]').forEach((dot) => {
      dot.addEventListener('click', () => {
        ArcadeHub.sound.click();
        setFeaturedIndex(Number(dot.getAttribute('data-feature-index')));
      });
    });
  }

  function renderFeaturedSpotlight(animate) {
    if (!heroFeaturedBar) return;
    const game = GAME_CATALOG[featuredIndex % GAME_CATALOG.length];
    if (!game) return;

    const best = ArcadeHub.storage.getBestScore(game.id);
    const recordText = best > 0 ? ` • 🏅 Kỷ lục: ${formatNumber(best)} ${game.unit}` : '';

    heroFeaturedBar.innerHTML = `
      <div class="featured-left">
        <span class="featured-tag">🌟 Đang chiếu</span>
        <div class="featured-info">
          <strong>${escapeHtml(game.title)} — ${escapeHtml(game.subtitle)}</strong>
          <span>${escapeHtml(game.genre)} • ${escapeHtml(game.devices)}${escapeHtml(recordText)}</span>
        </div>
      </div>
      <div class="featured-actions">
        <button type="button" class="featured-switch-btn" id="featPrevBtn" title="Game trước" aria-label="Game gợi ý trước">◀</button>
        <button type="button" class="featured-switch-btn" id="featNextBtn" title="Game tiếp theo" aria-label="Game gợi ý tiếp theo">▶</button>
        <button type="button" class="featured-play-btn" id="featLaunchBtn">▶ Chơi Ngay</button>
      </div>
    `;

    heroFeaturedBar.querySelector('#featPrevBtn').addEventListener('click', () => {
      ArcadeHub.sound.click();
      setFeaturedIndex(featuredIndex - 1);
    });
    heroFeaturedBar.querySelector('#featNextBtn').addEventListener('click', () => {
      ArcadeHub.sound.click();
      setFeaturedIndex(featuredIndex + 1);
    });
    heroFeaturedBar.querySelector('#featLaunchBtn').addEventListener('click', () => {
      ArcadeHub.sound.click();
      requestLaunchGame(game.id);
    });

    renderShowcase(game, animate);
  }

  function syncFeaturedCardBadge() {
    const featuredId = GAME_CATALOG[featuredIndex] && GAME_CATALOG[featuredIndex].id;
    gamesGrid.querySelectorAll('.game-card').forEach((card) => {
      const isFeatured = card.getAttribute('data-game-id') === featuredId;
      card.classList.toggle('is-featured', isFeatured);
      const badge = card.querySelector('.card-featured-badge');
      if (badge) badge.hidden = !isFeatured;
    });
  }

  function getFilteredGames() {
    const q = searchQuery.trim().toLowerCase();
    return GAME_CATALOG.filter((game) => {
      if (selectedCategory !== 'all' && game.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const haystack = `${game.title} ${game.subtitle} ${game.genre} ${game.description}`.toLowerCase();
      return haystack.includes(q);
    });
  }

  function renderHomeCatalog() {
    const stats = ArcadeHub.storage.getStatsSummary(GAME_CATALOG.map((g) => g.id));
    if (totalGamesCountEl) totalGamesCountEl.textContent = String(GAME_CATALOG.length);
    if (heroGamesCountEl) heroGamesCountEl.textContent = String(GAME_CATALOG.length);
    totalRecordsCountEl.textContent = String(stats.totalRecords);
    topOneCountEl.textContent = String(stats.topOneForCurrentPlayer);

    renderFeaturedSpotlight();

    const filtered = getFilteredGames();
    gamesGrid.classList.toggle('is-filtered', selectedCategory !== 'all' || searchQuery.trim().length > 0);
    gamesGrid.innerHTML = '';

    if (filtered.length === 0) {
      gamesGrid.innerHTML = `
        <div class="catalog-empty-state">
          <h3>🔍 Không tìm thấy trò chơi phù hợp</h3>
          <p>Thử từ khóa khác hoặc bấm chọn mục "✨ Tất cả" để xem toàn bộ ${GAME_CATALOG.length} tựa game.</p>
        </div>
      `;
      return;
    }

    filtered.forEach((game, idx) => {
      const best = ArcadeHub.storage.getBestScore(game.id);
      const personalBestHtml =
        best > 0
          ? `<span class="card-personal-best">🏅 Kỷ lục: ${formatNumber(best)} ${escapeHtml(game.unit)}</span>`
          : '';

      const card = document.createElement('article');
      card.className = 'game-card';
      card.setAttribute('data-game-id', game.id);
      card.style.setProperty('--card-accent', game.accentColor || '#38bdf8');
      card.style.setProperty('--i', String(idx));
      card.innerHTML = `
        <div class="card-banner" style="background: ${game.gradient};">
          <div class="card-banner-art" aria-hidden="true">${game.svgArt}</div>
          <div class="card-badges">
            <span class="card-featured-badge" hidden>🌟 Đang chiếu</span>
            ${personalBestHtml}
          </div>
        </div>
        <div class="card-body">
          <div class="card-meta-row">
            <span class="card-genre-pill">${escapeHtml(game.genre)}</span>
            <span class="card-device-pill">${escapeHtml(game.devices)}</span>
          </div>
          <div class="card-title-row">
            <h3>${escapeHtml(game.title)}</h3>
            <span class="score-unit-badge">${escapeHtml(game.subtitle)}</span>
          </div>
          <p class="card-desc">${escapeHtml(game.description)}</p>
          <div class="card-actions">
            <button type="button" class="play-now-btn" data-launch="${game.id}" aria-label="Chơi ngay ${escapeHtml(game.title)}">
              ▶ Chơi Ngay
            </button>
          </div>
        </div>
      `;

      // Preload game module on hover/touch and launch on click
      card.addEventListener('pointerenter', () => { ensureGameModuleLoaded(game.id); }, { once: true, passive: true });
      card.addEventListener('touchstart', () => { ensureGameModuleLoaded(game.id); }, { once: true, passive: true });
      card.addEventListener('click', () => {
        ArcadeHub.sound.click();
        requestLaunchGame(game.id);
      });

      gamesGrid.appendChild(card);
    });
    syncFeaturedCardBadge();
  }

  // Subtle 3D tilt + spotlight that follows the pointer (mouse only, never on touch).
  let tiltCard = null;
  let tiltFrame = 0;
  let tiltEvt = null;

  function resetTilt(card) {
    if (!card) return;
    card.classList.remove('is-tilting');
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  }

  gamesGrid.addEventListener('pointermove', (evt) => {
    if (true) return; // Sticker cards use bouncy CSS hover instead of 3D tilt
    const card = evt.target.closest('.game-card');
    if (card !== tiltCard) {
      resetTilt(tiltCard);
      tiltCard = card;
    }
    if (!card) return;
    tiltEvt = evt;
    if (tiltFrame) return;
    tiltFrame = requestAnimationFrame(() => {
      tiltFrame = 0;
      if (!tiltCard || !tiltEvt) return;
      const rect = tiltCard.getBoundingClientRect();
      const px = (tiltEvt.clientX - rect.left) / rect.width;
      const py = (tiltEvt.clientY - rect.top) / rect.height;
      tiltCard.classList.add('is-tilting');
      tiltCard.style.setProperty('--ry', `${((px - 0.5) * 7).toFixed(2)}deg`);
      tiltCard.style.setProperty('--rx', `${((0.5 - py) * 6).toFixed(2)}deg`);
      tiltCard.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      tiltCard.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    });
  });

  gamesGrid.addEventListener('pointerleave', () => {
    resetTilt(tiltCard);
    tiltCard = null;
  });

  // Filter Tabs & Search Listeners
  if (categoryTabsEl) {
    categoryTabsEl.querySelectorAll('[data-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat') || 'all';
        if (cat === selectedCategory) return;
        selectedCategory = cat;
        categoryTabsEl.querySelectorAll('[data-cat]').forEach((b) => {
          const isCurrent = b === btn;
          b.classList.toggle('active', isCurrent);
          b.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
        });
        ArcadeHub.sound.click();
        renderHomeCatalog();
      });
    });
  }

  if (gameSearchInput) {
    gameSearchInput.addEventListener('input', () => {
      searchQuery = gameSearchInput.value || '';
      if (clearSearchBtn) {
        clearSearchBtn.hidden = searchQuery.length === 0;
      }
      renderHomeCatalog();
    });
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      searchQuery = '';
      if (gameSearchInput) {
        gameSearchInput.value = '';
        gameSearchInput.focus();
      }
      clearSearchBtn.hidden = true;
      ArcadeHub.sound.click();
      renderHomeCatalog();
    });
  }

  function openNameModal(isInitialPrompt) {
    const current = ArcadeHub.storage.getPlayerName();
    playerNameInput.value = current;
    nameInputError.hidden = true;

    if (isInitialPrompt && !current) {
      nameModalTitle.textContent = 'Nhập Tên Người Chơi';
      nameModalDesc.textContent =
        'Bạn chưa có tên! Hãy nhập tên để hệ thống ghi nhận điểm của bạn vào Top 3 mỗi trò chơi.';
      cancelNameModalBtn.hidden = true;
    } else {
      nameModalTitle.textContent = 'Đổi Tên Người Chơi';
      nameModalDesc.textContent =
        'Tên mới sẽ được dùng để lưu các kỷ lục tiếp theo của bạn trên thiết bị này.';
      cancelNameModalBtn.hidden = false;
    }

    nameModalOverlay.hidden = false;
    setTimeout(() => {
      playerNameInput.focus();
      playerNameInput.select();
    }, 40);
  }

  function closeNameModal() {
    nameModalOverlay.hidden = true;
  }

  playerNameForm.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const res = ArcadeHub.storage.setPlayerName(playerNameInput.value);
    if (!res.ok) {
      nameInputError.hidden = false;
      ArcadeHub.sound.error();
      return;
    }

    ArcadeHub.sound.click();
    closeNameModal();
    syncPlayerProfileUI();
    renderHomeCatalog();
    showToast(`Xin chào, ${res.name}! Chúc bạn lập nhiều kỷ lục mới.`);

    if (pendingGameLaunchId) {
      const targetId = pendingGameLaunchId;
      pendingGameLaunchId = null;
      mountGame(targetId);
    }
  });

  cancelNameModalBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    pendingGameLaunchId = null;
    closeNameModal();
  });

  document.querySelectorAll('.quick-name-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      playerNameInput.value = chip.getAttribute('data-name') || '';
      playerNameInput.focus();
    });
  });

  function requestLaunchGame(gameId) {
    const playerName = ArcadeHub.storage.getPlayerName();
    if (!playerName) {
      pendingGameLaunchId = gameId;
      openNameModal(true);
      return;
    }
    mountGame(gameId);
  }

  // Games may expose pause()/resume()/isPaused(); the host uses them for the Esc key,
  // tab switches and dialogs. Games without them simply ignore these calls.
  function gameSupportsPause() {
    return Boolean(
      activeGameInstance &&
        typeof activeGameInstance.pause === 'function' &&
        typeof activeGameInstance.resume === 'function' &&
        typeof activeGameInstance.isPaused === 'function'
    );
  }

  function hostPauseGame() {
    if (!gameSupportsPause() || activeGameInstance.isPaused()) return;
    activeGameInstance.pause();
    hostPausedGame = activeGameInstance.isPaused();
  }

  function hostResumeGame() {
    if (!hostPausedGame) return;
    hostPausedGame = false;
    if (gameSupportsPause() && activeGameInstance.isPaused()) {
      activeGameInstance.resume();
    }
  }

  function toggleGamePause() {
    if (!gameSupportsPause()) return false;
    hostPausedGame = false;
    if (activeGameInstance.isPaused()) activeGameInstance.resume();
    else activeGameInstance.pause();
    return true;
  }

  function unmountActiveGame() {
    if (activeGameInstance && typeof activeGameInstance.destroy === 'function') {
      try {
        activeGameInstance.destroy();
      } catch (_err) {
        // Ignore cleanup errors
      }
    }
    activeGameInstance = null;
    activeGameId = null;
    hostPausedGame = false;
    gameMount.innerHTML = '';
  }

  function pushGameHistoryLock(gameId) {
    try {
      global.history.pushState({ inGame: true, gameId }, '', global.location.href);
      global.history.pushState({ inGame: true, gameId }, '', global.location.href);
    } catch (_err) {
      // Ignore if running in restricted context
    }
  }

  function animateScoreHud(newScore) {
    const numeric = Math.max(0, Math.round(Number(newScore) || 0));
    const diff = numeric - lastNumericScore;
    lastNumericScore = numeric;
    hudCurrentScoreEl.textContent = formatNumber(numeric);

    if (diff > 0 && hudScoreChipEl && hudScoreDeltaEl) {
      hudScoreChipEl.classList.remove('score-bump');
      void hudScoreChipEl.offsetWidth;
      hudScoreChipEl.classList.add('score-bump');

      hudScoreDeltaEl.textContent = `+${formatNumber(diff)}`;
      hudScoreDeltaEl.classList.add('show');

      if (scoreDeltaTimer) clearTimeout(scoreDeltaTimer);
      scoreDeltaTimer = setTimeout(() => {
        hudScoreChipEl.classList.remove('score-bump');
        hudScoreDeltaEl.classList.remove('show');
      }, 650);
    }
  }

  const gameLoadPromises = Object.create(null);

  function ensureGameModuleLoaded(gameId) {
    if (!gameId) return Promise.resolve(null);
    if (ArcadeHub.games && ArcadeHub.games[gameId]) {
      return Promise.resolve(ArcadeHub.games[gameId]);
    }
    if (gameLoadPromises[gameId]) {
      return gameLoadPromises[gameId];
    }
    const validMeta = GAME_CATALOG.find((g) => g.id === gameId);
    if (!validMeta) return Promise.resolve(null);

    gameLoadPromises[gameId] = new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = `js/games/${encodeURIComponent(gameId)}.js`;
      script.async = true;
      script.onload = () => {
        resolve((ArcadeHub.games && ArcadeHub.games[gameId]) || null);
      };
      script.onerror = () => {
        delete gameLoadPromises[gameId];
        resolve(null);
      };
      document.head.appendChild(script);
    });
    return gameLoadPromises[gameId];
  }

  function mountGame(gameId) {
    const gameMeta = GAME_CATALOG.find((g) => g.id === gameId);
    if (!gameMeta) {
      showToast('Không tìm thấy module trò chơi!');
      return;
    }
    const gameModule = ArcadeHub.games && ArcadeHub.games[gameId];
    if (!gameModule) {
      ensureGameModuleLoaded(gameId).then((loadedMod) => {
        if (!loadedMod) {
          showToast('Không tìm thấy module trò chơi!');
          return;
        }
        mountGame(gameId);
      });
      return;
    }

    unmountActiveGame();
    activeGameId = gameId;
    lastNumericScore = 0;
    pushGameHistoryLock(gameId);

    document.documentElement.style.setProperty('--game-accent', gameMeta.accentColor || '#38bdf8');

    homeView.classList.remove('active-view');
    gameView.classList.add('active-view');
    gameView.setAttribute('aria-hidden', 'false');

    activeGameTitleEl.textContent = gameMeta.title;
    activeGameSubtitleEl.textContent = gameMeta.subtitle;
    hudPlayerNameEl.textContent = ArcadeHub.storage.getPlayerName() || 'Người chơi';
    hudCurrentScoreEl.textContent = '0';
    if (hudScoreDeltaEl) hudScoreDeltaEl.textContent = '';

    const best = ArcadeHub.storage.getBestScore(gameId);
    hudBestScoreEl.textContent = best > 0 ? formatNumber(best) : '---';
    renderInGameTop3(gameId);

    const gameContext = {
      getPlayerName() {
        return ArcadeHub.storage.getPlayerName() || 'Người chơi';
      },
      updateScore(scoreVal) {
        animateScoreHud(scoreVal);
      },
      submitHighScore(scoreVal, detailText) {
        const result = ArcadeHub.storage.submitScore(gameId, scoreVal, detailText);
        const newBest = ArcadeHub.storage.getBestScore(gameId);
        hudBestScoreEl.textContent = newBest > 0 ? formatNumber(newBest) : '---';
        renderInGameTop3(gameId);

        if (result.isTop3) {
          showLeaderboardModal(
            gameId,
            `🎉 Chúc mừng ${ArcadeHub.storage.getPlayerName()}! Bạn đã lọt vào TOP ${result.rank} với ${formatNumber(scoreVal)} điểm!`
          );
        }
      },
      showToast
    };

    activeGameInstance = gameModule.init(gameMount, gameContext);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function returnToHome() {
    if (ArcadeHub.fullscreen.isFullscreen()) {
      ArcadeHub.fullscreen.exitFullscreen();
    }
    unmountActiveGame();
    gameView.classList.remove('active-view');
    gameView.setAttribute('aria-hidden', 'true');
    homeView.classList.add('active-view');
    renderHomeCatalog();
  }

  function showLeaderboardModal(gameId, bannerText) {
    const gameMeta = GAME_CATALOG.find((g) => g.id === gameId);
    if (!gameMeta) return;
    lbModalTitle.textContent = `Top 3 — ${gameMeta.title}`;
    lbModalBanner.textContent = bannerText || 'Danh sách 3 kỷ lục cao nhất trên thiết bị này';
    lbModalList.innerHTML = buildTop3RowsHtml(gameId, gameMeta.unit);
    hostPauseGame();
    leaderboardModalOverlay.hidden = false;
    closeLbModalBtn.focus();
  }

  function showHelpModal(gameId) {
    const gameMeta = GAME_CATALOG.find((g) => g.id === gameId);
    if (!gameMeta || !helpModalOverlay) return;

    helpModalTitle.textContent = `Hướng dẫn — ${gameMeta.title}`;
    helpModalSubtitle.textContent = `${gameMeta.subtitle} • Thiết bị: ${gameMeta.devices}`;

    const steps = Array.isArray(gameMeta.helpSteps) ? gameMeta.helpSteps : [];
    helpModalBody.innerHTML = steps
      .map(
        (s) => `
        <div class="help-row">
          <span class="help-row-icon">${escapeHtml(s.icon)}</span>
          <div>
            <strong>${escapeHtml(s.title)}:</strong> ${escapeHtml(s.text)}
          </div>
        </div>
      `
      )
      .join('');

    hostPauseGame();
    helpModalOverlay.hidden = false;
    if (closeHelpModalBtn) closeHelpModalBtn.focus();
  }

  // Global Navbar & Stage Buttons
  brandHomeBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    returnToHome();
  });

  backToHomeBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    returnToHome();
  });

  changeNameBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    openNameModal(false);
  });

  if (stageHelpBtn) {
    stageHelpBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      if (activeGameId) {
        showHelpModal(activeGameId);
      }
    });
  }

  if (closeHelpModalBtn) {
    closeHelpModalBtn.addEventListener('click', () => {
      ArcadeHub.sound.click();
      helpModalOverlay.hidden = true;
      hostResumeGame();
    });
  }

  restartGameBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    if (activeGameInstance && typeof activeGameInstance.restart === 'function') {
      lastNumericScore = 0;
      hudCurrentScoreEl.textContent = '0';
      if (hudScoreDeltaEl) hudScoreDeltaEl.textContent = '';
      activeGameInstance.restart();
      showToast('Đã tạo ván mới!');
    }
  });

  stageLeaderboardBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    if (activeGameId) {
      showLeaderboardModal(activeGameId, '');
    }
  });

  closeLbModalBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    leaderboardModalOverlay.hidden = true;
    hostResumeGame();
  });

  function updateSoundButtonUI() {
    const on = ArcadeHub.sound.isEnabled();
    soundIcon.textContent = on ? '🔊' : '🔇';
  }

  soundToggleBtn.addEventListener('click', () => {
    const enabled = ArcadeHub.sound.toggle();
    updateSoundButtonUI();
    showToast(enabled ? 'Đã bật âm thanh 🔊' : 'Đã tắt âm thanh 🔇');
  });

  globalFullscreenBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    const target = activeGameId ? gameStageWrapper : document.documentElement;
    ArcadeHub.fullscreen.toggle(target);
  });

  stageFullscreenBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    ArcadeHub.fullscreen.toggle(gameStageWrapper);
  });

  ArcadeHub.fullscreen.onChange((isFull) => {
    if (stageFullscreenIcon) stageFullscreenIcon.textContent = isFull ? '🗗' : '⛶';
    if (stageFullscreenText) stageFullscreenText.textContent = isFull ? 'Thoát Full' : 'Full màn hình';
    stageFullscreenBtn.setAttribute('aria-label', isFull ? 'Thoát Full màn hình' : 'Phóng to toàn màn hình');
  });

  // Khóa nút Back của trình duyệt & thao tác vuốt cạnh màn hình trên điện thoại khi đang trong game
  global.addEventListener('popstate', () => {
    if (activeGameId) {
      pushGameHistoryLock(activeGameId);
      showToast('Đang khóa nút Back để tránh vuốt nhầm — Bấm "← Trang chủ" để thoát game!');
    }
  });

  document.addEventListener(
    'touchstart',
    (evt) => {
      if (!activeGameId || !evt.touches || !evt.touches.length || evt.touches.length !== 1) return;
      const touchX = evt.touches[0].clientX;
      // Chặn thao tác vuốt từ sát mép trái/phải màn hình điện thoại (gesture back của iOS/Android)
      if (touchX < 28 || touchX > global.innerWidth - 28) {
        evt.preventDefault();
      }
    },
    { passive: false }
  );

  function isAnyModalOpen() {
    return [nameModalOverlay, leaderboardModalOverlay, helpModalOverlay].some((el) => el && !el.hidden);
  }

  function isEditableTarget(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  // Games listen for keydown on window (bubble phase). This capture-phase guard stops
  // keystrokes meant for a text field or an open dialog from reaching them, so games
  // can neither react to nor preventDefault those keys. keyup is left alone so games
  // tracking held keys never miss a release.
  global.addEventListener(
    'keydown',
    (evt) => {
      if (evt.key === 'Escape') {
        if (!helpModalOverlay.hidden) {
          evt.stopPropagation();
          closeHelpModalBtn.click();
          return;
        }
        if (!leaderboardModalOverlay.hidden) {
          evt.stopPropagation();
          closeLbModalBtn.click();
          return;
        }
        if (!nameModalOverlay.hidden && !cancelNameModalBtn.hidden) {
          evt.stopPropagation();
          cancelNameModalBtn.click();
          return;
        }
      }
      if (!activeGameId) return;
      if (isEditableTarget(evt.target) || isAnyModalOpen()) {
        evt.stopPropagation();
        return;
      }
      if (evt.key === 'Escape' && !evt.repeat && toggleGamePause()) {
        evt.preventDefault();
        evt.stopPropagation();
      }
    },
    true
  );

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden || !activeGameId) return;
    hostPauseGame();
    // Stay paused after returning to the tab; the player resumes explicitly.
    hostPausedGame = false;
  });

  // Initial Boot
  function initApp() {
    [heroShowcase, heroFeaturedBar].forEach((el) => {
      if (!el) return;
      el.addEventListener('pointerenter', () => {
        isHoveringFeatured = true;
      });
      el.addEventListener('pointerleave', () => {
        isHoveringFeatured = false;
      });
    });
    restartFeaturedAutoSlide();
    updateSoundButtonUI();
    syncPlayerProfileUI();
    renderHomeCatalog();

    // Prompt for name on initial visit if no name saved yet
    if (!ArcadeHub.storage.getPlayerName()) {
      openNameModal(true);
    } else {
      closeNameModal();
    }
  }

  initApp();
})(window);
