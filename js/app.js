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
      accentColor: '#ec4899',
      description:
        'Trò chơi luyện gõ 10 ngón vui nhộn cho trẻ: bàn phím mẫu trên màn hình tự động sáng phím cần bấm để bắn nổ bóng bay chữ cái và từ vựng.',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #c026d3 52%, #f43f5e 100%)',
      helpSteps: [
        { icon: '⌨️', title: 'Thao tác', text: 'Gõ phím chữ cái trên bàn phím máy tính hoặc bấm trực tiếp vào bàn phím ảo trên màn hình.' },
        { icon: '🎈', title: 'Mục tiêu', text: 'Bắn nổ các quả bóng bay trước khi chúng rơi chạm vạch giới hạn phía dưới.' },
        { icon: '💡', title: 'Mẹo đạt điểm cao', text: 'Phím màu vàng phát sáng trên bàn phím mẫu chính là chữ cái tiếp theo cần gõ!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="80" cy="36" r="24" fill="rgba(255,255,255,0.08)"/>
          <circle cx="110" cy="40" r="18" fill="rgba(255,255,255,0.08)"/>
          <line x1="260" y1="112" x2="225" y2="62" stroke="#fde047" stroke-width="3" stroke-dasharray="4 4"/>
          <g transform="translate(225, 54)">
            <path d="M0,26 Q-5,38 3,46" stroke="rgba(255,255,255,0.6)" stroke-width="1.8" fill="none"/>
            <ellipse cx="0" cy="0" rx="24" ry="28" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
            <ellipse cx="-8" cy="-10" rx="6" ry="10" transform="rotate(-25 -8 -10)" fill="rgba(255,255,255,0.45)"/>
            <text x="0" y="8" fill="#ffffff" font-size="22" font-weight="900" text-anchor="middle">A</text>
          </g>
          <g transform="translate(302, 44)">
            <path d="M0,26 Q5,38 -3,46" stroke="rgba(255,255,255,0.6)" stroke-width="1.8" fill="none"/>
            <ellipse cx="0" cy="0" rx="24" ry="28" fill="#facc15" stroke="#ffffff" stroke-width="2"/>
            <ellipse cx="-8" cy="-10" rx="6" ry="10" transform="rotate(-25 -8 -10)" fill="rgba(255,255,255,0.55)"/>
            <text x="0" y="8" fill="#090d16" font-size="22" font-weight="900" text-anchor="middle">B</text>
          </g>
          <g transform="translate(356, 62)">
            <ellipse cx="0" cy="0" rx="20" ry="24" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
            <text x="0" y="7" fill="#090d16" font-size="18" font-weight="900" text-anchor="middle">C</text>
          </g>
          <rect x="190" y="108" width="150" height="36" rx="8" fill="rgba(9,14,28,0.88)" stroke="#38bdf8" stroke-width="2"/>
          <rect x="200" y="115" width="22" height="22" rx="5" fill="#facc15"/>
          <text x="211" y="131" fill="#090d16" font-size="13" font-weight="900" text-anchor="middle">A</text>
          <text x="282" y="131" fill="#e2e8f0" font-size="13" font-weight="800" text-anchor="middle">S D F G H</text>
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
      accentColor: '#3b82f6',
      description:
        'Hóa thân thành Người Nhện, The Flash, Batman hoặc Superman vượt mê cung giải cứu Công Chúa, hỗ trợ cả kéo chuột lẫn phím mũi tên (Dễ & Khó).',
      gradient: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 52%, #ef4444 100%)',
      helpSteps: [
        { icon: '🦸', title: 'Chọn Siêu Nhân', text: 'Chọn Người Nhện, The Flash, Batman hoặc Superman trên thanh công cụ trước khi đi.' },
        { icon: '🖱️', title: 'Điều khiển', text: 'Nhấn giữ và kéo chuột theo đường mê cung hoặc bấm phím Mũi tên / WASD.' },
        { icon: '🧭', title: 'Trợ giúp', text: 'Bấm nút "Chỉ đường" nếu bé cần xem vệt sáng dẫn tới chỗ Công Chúa.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g stroke="rgba(56,189,248,0.55)" stroke-width="4" stroke-linecap="round" fill="none">
            <rect x="182" y="22" width="176" height="114" rx="10" fill="rgba(9,14,28,0.45)"/>
            <line x1="236" y1="22" x2="236" y2="92"/>
            <line x1="292" y1="64" x2="292" y2="136"/>
            <line x1="236" y1="92" x2="318" y2="92"/>
          </g>
          <path d="M210,54 L210,114 L264,114 L264,44 L326,44 L326,106" stroke="#fde047" stroke-width="3" stroke-dasharray="5 5" fill="none"/>
          <circle cx="210" cy="54" r="16" fill="#dc2626" stroke="#ffffff" stroke-width="2.5"/>
          <ellipse cx="204" cy="52" rx="4.5" ry="3" fill="#ffffff"/>
          <ellipse cx="216" cy="52" rx="4.5" ry="3" fill="#ffffff"/>
          <circle cx="326" cy="106" r="16" fill="#ec4899" stroke="#ffffff" stroke-width="2.5"/>
          <polygon points="316,90 321,80 326,87 331,80 336,90" fill="#facc15" stroke="#090d16" stroke-width="1"/>
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
      accentColor: '#06b6d4',
      description:
        'Giúp trẻ tập điều khiển chuột mượt mà dưới đại dương rực rỡ: ăn cá nhỏ hơn để tiến hóa qua 5 cấp độ thành Cá Mập Vua.',
      gradient: 'linear-gradient(135deg, #0369a1 0%, #0ea5e9 52%, #14b8a6 100%)',
      helpSteps: [
        { icon: '🖱️', title: 'Di chuyển mượt', text: 'Di chuyển chuột hoặc chạm kéo trên màn hình, chú cá sẽ bơi theo con trỏ của bạn.' },
        { icon: '🐟', title: 'Luật tiến hóa', text: 'Ăn các chú cá nhỏ hơn hoặc bằng cấp hiện tại để lớn lên; tránh cá săn mồi to hơn.' },
        { icon: '⚡', title: 'Tăng tốc & Ngọc trai', text: 'Bấm chuột trái để lướt nhanh và nhặt Ngọc Trai dưới đáy biển để nhận điểm thưởng lớn.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <polygon points="150,0 190,0 240,158 120,158" fill="rgba(255,255,255,0.07)"/>
          <polygon points="260,0 295,0 340,158 230,158" fill="rgba(255,255,255,0.05)"/>
          <circle cx="195" cy="45" r="5" fill="rgba(255,255,255,0.45)"/>
          <circle cx="212" cy="28" r="8" fill="rgba(255,255,255,0.3)"/>
          <g transform="translate(248, 82)">
            <polygon points="-34,0 -58,-20 -58,20" fill="#ea580c" stroke="#ffffff" stroke-width="2"/>
            <ellipse cx="0" cy="0" rx="36" ry="23" fill="#f97316" stroke="#ffffff" stroke-width="2.5"/>
            <path d="M-8,-21 Q4,-34 14,-19" fill="#fb923c" stroke="#ffffff" stroke-width="2"/>
            <circle cx="18" cy="-5" r="6.5" fill="#ffffff"/>
            <circle cx="20" cy="-5" r="3.2" fill="#090d16"/>
          </g>
          <g transform="translate(332, 86)">
            <polygon points="14,0 25,-9 25,9" fill="#22c55e"/>
            <ellipse cx="0" cy="0" rx="15" ry="10" fill="#4ade80" stroke="#ffffff" stroke-width="2"/>
            <circle cx="-6" cy="-2" r="2.8" fill="#090d16"/>
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
      accentColor: '#eab308',
      description:
        'Rèn luyện phản xạ mắt và tay cho trẻ: cầm búa hoạt hình đập trúng Chuột Nâu và Chuột Vàng Vương Miện, khéo léo tránh các chú Thỏ Trắng.',
      gradient: 'linear-gradient(135deg, #15803d 0%, #22c55e 52%, #eab308 100%)',
      helpSteps: [
        { icon: '🔨', title: 'Cách chơi', text: 'Di chuyển búa và bấm chuột trái (hoặc chạm màn hình) vào đúng ô có chuột trồi lên.' },
        { icon: '👑', title: 'Chuột Vàng thưởng lớn', text: 'Chuột đội vương miện vàng mang lại điểm gấp gần 3 lần chuột thường!' },
        { icon: '🐰', title: 'Tránh Thỏ Trắng', text: 'Đừng đập nhầm các chú Thỏ Trắng đáng yêu kẻo bị trừ điểm và mất chuỗi Combo.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="262" cy="118" rx="50" ry="16" fill="#78350f" stroke="#fde047" stroke-width="2"/>
          <rect x="236" y="58" width="52" height="56" rx="24" fill="#b45309" stroke="#ffffff" stroke-width="2.5"/>
          <polygon points="248,58 254,44 262,54 270,44 276,58" fill="#facc15" stroke="#090d16" stroke-width="1.5"/>
          <circle cx="251" cy="78" r="4.2" fill="#090d16"/>
          <circle cx="273" cy="78" r="4.2" fill="#090d16"/>
          <ellipse cx="262" cy="87" rx="7" ry="4.5" fill="#f43f5e"/>
          <g transform="translate(324, 52) rotate(-28)">
            <rect x="-5" y="0" width="10" height="42" rx="4" fill="#fde047" stroke="#090d16" stroke-width="2"/>
            <rect x="-24" y="-20" width="48" height="24" rx="7" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
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
      accentColor: '#f43f5e',
      description:
        'Cùng Khủng Long Con ngắm bắn các quả trứng phép thuật cùng màu để làm nổ tung cả chùm bóng, có tia laser dẫn đường cho bé ở chế độ Dễ.',
      gradient: 'linear-gradient(135deg, #be185d 0%, #ec4899 52%, #8b5cf6 100%)',
      helpSteps: [
        { icon: '🎯', title: 'Ngắm & Bắn', text: 'Rê chuột hoặc chạm kéo để chỉnh tia ngắm, sau đó bấm chuột (hoặc thả tay) để bắn trứng.' },
        { icon: '💥', title: 'Nổ cụm & Rơi tự do', text: 'Ghép từ 3 quả trứng cùng màu trở lên để làm nổ. Các quả trứng mất điểm bám phía trên sẽ rơi xuống cộng điểm lớn!' },
        { icon: '🔄', title: 'Đổi trứng dự bị', text: 'Nhấn phím Space hoặc nút "Đổi Trứng" để hoán đổi giữa quả trứng đang cầm và quả trứng tiếp theo.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="216" cy="40" r="19" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
          <circle cx="254" cy="40" r="19" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
          <circle cx="292" cy="40" r="19" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
          <circle cx="235" cy="72" r="19" fill="#facc15" stroke="#ffffff" stroke-width="2"/>
          <circle cx="273" cy="72" r="19" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
          <circle cx="311" cy="72" r="19" fill="#a855f7" stroke="#ffffff" stroke-width="2"/>
          <line x1="254" y1="134" x2="235" y2="85" stroke="#fde047" stroke-width="3.5" stroke-dasharray="5 5"/>
          <circle cx="254" cy="132" r="17" fill="#f43f5e" stroke="#fef08a" stroke-width="2.5"/>
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
      accentColor: '#38bdf8',
      description:
        'Điều khiển tàu đệm năng lượng hứng bóng phá vỡ pháo đài gạch vũ trụ, nhặt vật phẩm nhân 3 bóng, mở rộng ván trượt và súng đôi Laser.',
      gradient: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #06b6d4 100%)',
      helpSteps: [
        { icon: '🛸', title: 'Điều khiển ván trượt', text: 'Di chuyển chuột ngang, kéo tay trên màn hình cảm ứng hoặc dùng phím Mũi tên Trái/Phải.' },
        { icon: '🔮', title: 'Săn vật phẩm rơi', text: 'Đón bắt các viên thuốc năng lượng rơi xuống để kích hoạt X3 Bóng, Ván Rộng, Súng Đôi Laser hoặc +1 Tim.' },
        { icon: '📐', title: 'Đổi góc nảy bóng', text: 'Đỡ bóng ở hai mép ván trượt để tạo góc bắn chéo xuyên vào các khe gạch hẹp.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="186" y="26" width="46" height="19" rx="5" fill="#f43f5e" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="238" y="26" width="46" height="19" rx="5" fill="#facc15" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="290" y="26" width="46" height="19" rx="5" fill="#22c55e" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="212" y="52" width="46" height="19" rx="5" fill="#38bdf8" stroke="#ffffff" stroke-width="1.5"/>
          <rect x="264" y="52" width="46" height="19" rx="5" fill="#a855f7" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="252" cy="102" r="6" fill="rgba(254,240,138,0.35)"/>
          <circle cx="258" cy="95" r="7.5" fill="rgba(254,240,138,0.6)"/>
          <circle cx="264" cy="88" r="9.5" fill="#fef08a" stroke="#f97316" stroke-width="2"/>
          <rect x="214" y="122" width="96" height="15" rx="7.5" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
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
      accentColor: '#22c55e',
      description:
        'Tính nhẩm nhanh phép toán trên màn hình rồi dẫn Rồng Con đi ăn đúng quả táo mang số kết quả chính xác để Rồng lớn nhanh.',
      gradient: 'linear-gradient(135deg, #15803d 0%, #16a34a 50%, #f59e0b 100%)',
      helpSteps: [
        { icon: '🧮', title: 'Đọc phép tính', text: 'Quan sát phép tính hiển thị ở bảng vàng phía trên sân cỏ.' },
        { icon: '🐉', title: 'Dẫn đường Rồng Con', text: 'Dùng phím Mũi tên / WASD hoặc bấm trực tiếp vào ô trên sân cỏ để Rồng Con rẽ hướng.' },
        { icon: '🍎', title: 'Ăn đúng táo kết quả', text: 'Ăn quả táo mang số đúng để ghi điểm và nối dài chuỗi Combo; tránh ăn nhầm quả táo số sai!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="202" cy="90" r="15" fill="#16a34a" stroke="#052e16" stroke-width="1.5"/>
          <circle cx="228" cy="88" r="17" fill="#4ade80" stroke="#052e16" stroke-width="1.5"/>
          <circle cx="258" cy="86" r="21" fill="#22c55e" stroke="#fef08a" stroke-width="2.5"/>
          <circle cx="253" cy="81" r="4" fill="#ffffff"/><circle cx="265" cy="81" r="4" fill="#ffffff"/>
          <circle cx="322" cy="84" r="19" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
          <text x="322" y="90" fill="#ffffff" font-size="17" font-weight="900" text-anchor="middle">8</text>
          <rect x="210" y="22" width="120" height="32" rx="9" fill="rgba(9,14,28,0.88)" stroke="#facc15" stroke-width="2"/>
          <text x="270" y="43" fill="#facc15" font-size="16" font-weight="900" text-anchor="middle">5 + 3 = ?</text>
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
      accentColor: '#f59e0b',
      description:
        'Giúp Hiệp Sĩ Nhí suy nghĩ đường đi thông minh để đẩy các viên đá phép thuật đè lên công tắc, mở khóa Rương Vàng Kho Báu.',
      gradient: 'linear-gradient(135deg, #b45309 0%, #f59e0b 52%, #3b82f6 100%)',
      helpSteps: [
        { icon: '💎', title: 'Quy tắc đẩy đá', text: 'Hiệp Sĩ chỉ có thể ĐẨY từng viên đá về phía trước (không thể kéo ngược lại hoặc đẩy 2 viên cùng lúc).' },
        { icon: '✨', title: 'Kích hoạt công tắc', text: 'Đẩy tất cả các viên đá đè lên các vòng tròn năng lượng màu xanh để mở Rương Kho Báu.' },
        { icon: '↩', title: 'Đừng ngại thử nghiệm', text: 'Nếu lỡ đẩy đá vào góc tường, bấm nút "Đi Lại (Z)" hoặc "Xếp Lại Màn" bất cứ lúc nào!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="212" cy="82" r="21" fill="#38bdf8" stroke="#ffffff" stroke-width="2.5"/>
          <rect x="204" y="76" width="16" height="6" fill="#090d16"/>
          <rect x="250" y="58" width="46" height="46" rx="9" fill="#f59e0b" stroke="#fef08a" stroke-width="2.5"/>
          <polygon points="273,68 283,81 273,94 263,81" fill="#fef08a"/>
          <circle cx="332" cy="82" r="18" fill="rgba(56,189,248,0.28)" stroke="#38bdf8" stroke-width="3" stroke-dasharray="5 3"/>
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
      accentColor: '#a855f7',
      description:
        'Lật mở các cặp thẻ bài Siêu Anh Hùng giống nhau để phóng tuyệt chiêu tấn công Quái Vật Vũ Trụ hoặc bật khiên hồi máu cho đội.',
      gradient: 'linear-gradient(135deg, #6d28d9 0%, #9333ea 50%, #f43f5e 100%)',
      helpSteps: [
        { icon: '👁️', title: 'Ghi nhớ nhanh', text: 'Đầu mỗi màn chơi, các thẻ bài sẽ mở sẵn trong vài giây để bé ghi nhớ vị trí.' },
        { icon: '⚡', title: 'Ghép cặp tung chưởng', text: 'Lật trúng 2 thẻ giống nhau sẽ lập tức phóng đòn tấn công trừ máu Boss (thẻ Tim giúp hồi máu cho Đội Siêu Nhân).' },
        { icon: '💡', title: 'Trợ giúp Soi Thẻ', text: 'Mỗi màn chơi bạn có 1 quyền bấm nút "Soi Thẻ" để nhìn lại toàn bộ bàn.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(192, 34) rotate(-5)">
            <rect x="0" y="0" width="58" height="82" rx="9" fill="#1e293b" stroke="#facc15" stroke-width="2.5"/>
            <text x="29" y="50" font-size="30" text-anchor="middle">⚡</text>
          </g>
          <g transform="translate(264, 32) rotate(6)">
            <rect x="0" y="0" width="58" height="82" rx="9" fill="#2563eb" stroke="#93c5fd" stroke-width="2.5"/>
            <text x="29" y="50" font-size="28" text-anchor="middle">⭐</text>
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
      accentColor: '#10b981',
      description:
        'Bấm chuột xoay các tấm gương phản xạ 45° để dẫn tia laser đi qua các ngôi sao và nạp đầy viên pin năng lượng cho chú Robot.',
      gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #10b981 100%)',
      helpSteps: [
        { icon: '🪞', title: 'Xoay gương 45°', text: 'Bấm chuột hoặc chạm vào bất kỳ ô gương nào trên lưới để lật hướng gương (/ hoặc \\).' },
        { icon: '🤖', title: 'Sạc pin cho Robot', text: 'Dẫn tia laser đỏ đi qua các ngôi sao vàng và chiếu trúng chú Robot để sạc đầy năng lượng.' },
        { icon: '💡', title: 'Gợi ý thông minh', text: 'Bấm nút "Gợi Ý Xoay 1 Gương" nếu bạn muốn hệ thống tự động chỉnh đúng 1 tấm gương trên đường đi.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <polyline points="180,98 250,98 250,42 324,42" fill="none" stroke="#f43f5e" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="180,98 250,98 250,42 324,42" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="236" y1="112" x2="264" y2="84" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
          <line x1="236" y1="56" x2="264" y2="28" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
          <circle cx="328" cy="42" r="19" fill="#16a34a" stroke="#ffffff" stroke-width="2.5"/>
          <text x="328" y="48" font-size="18" text-anchor="middle">🤖</text>
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
      accentColor: '#38bdf8',
      description:
        'Bàn cờ 15x15 sắc nét với AI đánh giá thế cờ công-thủ 3 cấp độ hoặc chế độ 2 người chơi chung máy.',
      gradient: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 52%, #0ea5e9 100%)',
      helpSteps: [
        { icon: '⭕', title: 'Luật thắng 5 quân', text: 'Người chơi xếp được 5 quân liên tiếp theo hàng ngang, dọc hoặc chéo trước sẽ giành chiến thắng.' },
        { icon: '🤖', title: '2 Chế độ chơi', text: 'Chơi với Máy (Dễ/Vừa/Khó) để tích lũy chuỗi thắng ghi danh Top 3, hoặc đấu 2 người trên cùng thiết bị.' },
        { icon: '↶', title: 'Đi lại nước cờ', text: 'Sử dụng nút "Đi lại" trên thanh công cụ nếu bạn bấm nhầm ô.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g stroke="rgba(255,255,255,0.14)" stroke-width="1">
            <line x1="160" y1="0" x2="160" y2="158"/><line x1="200" y1="0" x2="200" y2="158"/>
            <line x1="240" y1="0" x2="240" y2="158"/><line x1="280" y1="0" x2="280" y2="158"/>
            <line x1="320" y1="0" x2="320" y2="158"/><line x1="120" y1="35" x2="380" y2="35"/>
            <line x1="120" y1="75" x2="380" y2="75"/><line x1="120" y1="115" x2="380" y2="115"/>
          </g>
          <g stroke="#38bdf8" stroke-width="4.5" stroke-linecap="round">
            <line x1="170" y1="45" x2="190" y2="65"/><line x1="190" y1="45" x2="170" y2="65"/>
            <line x1="210" y1="85" x2="230" y2="105"/><line x1="230" y1="85" x2="210" y2="105"/>
            <line x1="250" y1="45" x2="270" y2="65"/><line x1="270" y1="45" x2="250" y2="65"/>
          </g>
          <circle cx="220" cy="55" r="11" stroke="#f43f5e" stroke-width="4.5" fill="none"/>
          <circle cx="260" cy="95" r="11" stroke="#f43f5e" stroke-width="4.5" fill="none"/>
          <circle cx="300" cy="55" r="11" stroke="#f43f5e" stroke-width="4.5" fill="none"/>
          <line x1="162" y1="38" x2="278" y2="112" stroke="#fbbf24" stroke-width="4" stroke-dasharray="6 4"/>
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
      accentColor: '#818cf8',
      description:
        'Thử thách trí não với bộ sinh đề Sudoku tự động 3 độ khó, hỗ trợ chế độ ghi chú (Notes) và gợi ý thông minh.',
      gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 55%, #8b5cf6 100%)',
      helpSteps: [
        { icon: '🔢', title: 'Quy tắc 1-9', text: 'Điền các số từ 1 đến 9 sao cho mỗi hàng ngang, mỗi cột dọc và mỗi vùng 3x3 không bị trùng số nào.' },
        { icon: '✏️', title: 'Chế độ Ghi chú', text: 'Bật nút "Ghi chú (Phím N)" để viết nháp các số có thể điền vào một ô.' },
        { icon: '💡', title: '3 Quyền Gợi ý', text: 'Khi gặp ô khó, bấm nút "Dùng Gợi Ý" để mở ngay con số chính xác.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="210" y="20" width="114" height="114" rx="10" fill="rgba(9,14,28,0.68)" stroke="#a855f7" stroke-width="2.5"/>
          <line x1="248" y1="20" x2="248" y2="134" stroke="#818cf8" stroke-width="2"/>
          <line x1="286" y1="20" x2="286" y2="134" stroke="#818cf8" stroke-width="2"/>
          <line x1="210" y1="58" x2="324" y2="58" stroke="#818cf8" stroke-width="2"/>
          <line x1="210" y1="96" x2="324" y2="96" stroke="#818cf8" stroke-width="2"/>
          <text x="229" y="46" fill="#38bdf8" font-size="21" font-weight="900" text-anchor="middle">9</text>
          <text x="267" y="84" fill="#fbbf24" font-size="21" font-weight="900" text-anchor="middle">5</text>
          <text x="305" y="122" fill="#22c55e" font-size="21" font-weight="900" text-anchor="middle">1</text>
          <text x="229" y="122" fill="#e2e8f0" font-size="21" font-weight="900" text-anchor="middle">7</text>
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
      accentColor: '#10b981',
      description:
        'Đánh bài Domino truyền thống 28 quân trên bàn nỉ sang trọng. Tính toán nước chặn hai đầu để giành chiến thắng.',
      gradient: 'linear-gradient(135deg, #047857 0%, #10b981 55%, #14b8a6 100%)',
      helpSteps: [
        { icon: '🀫', title: 'Nối quân khớp chấm', text: 'Chọn các quân cờ có viền xanh lá trên tay bạn để nối vào một trong hai đầu của dây cờ trên bàn.' },
        { icon: '🔒', title: 'Luật rút cờ Nọc', text: 'Chỉ khi trên tay không còn quân nào đánh được, bạn mới được bấm rút thêm quân từ chồng cờ Nọc bên phải bàn.' },
        { icon: '🏆', title: 'Chiến thắng ván', text: 'Ai đánh hết bài trên tay trước hoặc có tổng số chấm còn lại ít hơn khi bàn bị khóa sẽ thắng ván!' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(190, 34) rotate(-12)">
            <rect x="0" y="0" width="46" height="86" rx="7" fill="#f8fafc" stroke="#38bdf8" stroke-width="2.5"/>
            <line x1="4" y1="43" x2="42" y2="43" stroke="#64748b" stroke-width="2"/>
            <circle cx="14" cy="15" r="4" fill="#0f172a"/><circle cx="32" cy="29" r="4" fill="#0f172a"/>
            <circle cx="14" cy="56" r="4" fill="#0f172a"/><circle cx="23" cy="65" r="4" fill="#0f172a"/><circle cx="32" cy="74" r="4" fill="#0f172a"/>
          </g>
          <g transform="translate(262, 28) rotate(14)">
            <rect x="0" y="0" width="46" height="86" rx="7" fill="#f8fafc" stroke="#fbbf24" stroke-width="2.5"/>
            <line x1="4" y1="43" x2="42" y2="43" stroke="#64748b" stroke-width="2"/>
            <circle cx="14" cy="14" r="4" fill="#dc2626"/><circle cx="32" cy="14" r="4" fill="#dc2626"/>
            <circle cx="14" cy="30" r="4" fill="#dc2626"/><circle cx="32" cy="30" r="4" fill="#dc2626"/>
            <circle cx="23" cy="64" r="5" fill="#0f172a"/>
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
      accentColor: '#f59e0b',
      description:
        'Bảo vệ bờ biển trước các đợt đổ bộ của lính dù, trực thăng và xe tăng bọc thép bằng súng máy đôi và đại pháo.',
      gradient: 'linear-gradient(135deg, #b45309 0%, #ea580c 50%, #ef4444 100%)',
      helpSteps: [
        { icon: '🎯', title: 'Ngắm bắn súng máy', text: 'Di chuyển chuột và giữ chuột trái (hoặc bật chế độ Tự động bắn) để xả đạn súng máy đôi.' },
        { icon: '🚀', title: 'Khai hỏa Đại Pháo', text: 'Bấm chuột phải hoặc nhấn phím Space để bắn đạn Đại Pháo tiêu diệt xe tăng hạng nặng.' },
        { icon: '📦', title: 'Bắn kiện hàng tiếp tế', text: 'Bắn hạ các thùng hàng thả dù màu xanh để hồi máu lô cốt và nhận thêm đạn Đại Pháo.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="275" cy="76" r="38" fill="rgba(251,191,36,0.28)"/>
          <circle cx="275" cy="76" r="25" stroke="#22c55e" stroke-width="2.5" fill="none"/>
          <line x1="242" y1="76" x2="308" y2="76" stroke="#22c55e" stroke-width="2"/>
          <line x1="275" y1="43" x2="275" y2="109" stroke="#22c55e" stroke-width="2"/>
          <path d="M195 48 A18 18 0 0 1 231 48 Z" fill="#e2e8f0"/>
          <line x1="198" y1="48" x2="213" y2="65" stroke="#cbd5e1"/><line x1="228" y1="48" x2="213" y2="65" stroke="#cbd5e1"/>
          <circle cx="213" cy="69" r="5" fill="#fbbf24"/>
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
      accentColor: '#f43f5e',
      description:
        'Vít ga siêu mô-tô trên đại lộ Pseudo-3D, bật Nitro bứt tốc, lạng lách qua dòng xe và tung cú đá hạ gục các tay đua đối thủ!',
      gradient: 'linear-gradient(135deg, #7e22ce 0%, #e11d48 55%, #f97316 100%)',
      helpSteps: [
        { icon: '🏍️', title: 'Lái xe & Lạng lách', text: 'Dùng phím Mũi tên Trái/Phải (hoặc A/D) để chuyển làn tránh ô tô trên đại lộ.' },
        { icon: '🦵', title: 'Tung cú đá cận chiến', text: 'Nhấn phím Space khi chạy áp sát các tay đua đối thủ để đá văng họ và nhận điểm thưởng lớn!' },
        { icon: '⚡', title: 'Bứt tốc Nitro', text: 'Giữ phím Shift hoặc nút Nitro để phun lửa tăng tốc vượt mặt toàn bộ đoàn đua.' }
      ],
      svgArt: `
        <svg viewBox="0 0 400 158" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <polygon points="245,35 285,35 365,158 165,158" fill="rgba(15,23,42,0.72)" stroke="#fbbf24" stroke-width="2"/>
          <line x1="265" y1="40" x2="265" y2="158" stroke="#38bdf8" stroke-width="3" stroke-dasharray="10 8"/>
          <rect x="251" y="78" width="28" height="46" rx="8" fill="#2563eb" stroke="#f8fafc" stroke-width="2"/>
          <circle cx="265" cy="70" r="10" fill="#fbbf24"/>
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
    return svgArt
      .replace('viewBox="0 0 400 158"', 'viewBox="150 0 240 158"')
      .replace('preserveAspectRatio="xMidYMid slice"', 'preserveAspectRatio="xMidYMid meet"');
  }

  function renderShowcase(game, animate) {
    if (!heroShowcase) return;
    heroShowcase.innerHTML = `
      <div class="showcase-stage${animate ? ' is-entering' : ''}" role="button" tabindex="0"
        aria-label="Chơi ngay ${escapeHtml(game.title)}"
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
          <span class="game-genre-tag">${escapeHtml(game.genre)}</span>
          <span class="game-device-tag">${escapeHtml(game.devices)}</span>
          <div class="card-banner-art" aria-hidden="true">${game.svgArt}</div>
          <div class="card-badges">
            <span class="card-featured-badge" hidden>🌟 Đang chiếu</span>
            ${personalBestHtml}
          </div>
        </div>
        <div class="card-body">
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

      // The whole card is a launch target; the button stays the keyboard/AT entry point.
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

  function mountGame(gameId) {
    const gameMeta = GAME_CATALOG.find((g) => g.id === gameId);
    const gameModule = ArcadeHub.games && ArcadeHub.games[gameId];
    if (!gameMeta || !gameModule) {
      showToast('Không tìm thấy module trò chơi!');
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
    stageFullscreenBtn.setAttribute('aria-label', isFull ? 'Thoát toàn màn hình' : 'Toàn màn hình');
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
