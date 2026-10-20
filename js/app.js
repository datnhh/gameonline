(function (global) {
  'use strict';

  const ArcadeHub = (global.ArcadeHub = global.ArcadeHub || {});

  const GAME_CATALOG = [
    {
      id: 'typing',
      title: 'Bóng Bay Luyện Phím',
      subtitle: 'Tập Gõ Bàn Phím • Dễ & Khó',
      genre: 'Thiếu nhi • Luyện bàn phím',
      devices: '⌨ Bàn phím • 📱 Cảm ứng',
      unit: 'điểm',
      description:
        'Trò chơi luyện gõ 10 ngón vui nhộn cho trẻ: bàn phím mẫu trên màn hình tự động sáng phím cần bấm để bắn nổ bóng bay chữ cái và từ vựng.',
      gradient: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #db2777 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(225, 58)">
            <ellipse cx="0" cy="0" rx="22" ry="26" fill="#f43f5e" stroke="#090d16" stroke-width="2.5"/>
            <text x="0" y="7" fill="#ffffff" font-size="22" font-weight="900" text-anchor="middle">A</text>
          </g>
          <g transform="translate(295, 48)">
            <ellipse cx="0" cy="0" rx="22" ry="26" fill="#facc15" stroke="#090d16" stroke-width="2.5"/>
            <text x="0" y="7" fill="#090d16" font-size="22" font-weight="900" text-anchor="middle">B</text>
          </g>
          <rect x="200" y="102" width="120" height="32" rx="6" fill="rgba(15,23,42,0.8)" stroke="#38bdf8" stroke-width="2"/>
          <text x="260" y="123" fill="#facc15" font-size="14" font-weight="800" text-anchor="middle">Q W E R T Y</text>
        </svg>
      `
    },
    {
      id: 'maze',
      title: 'Mê Cung Siêu Nhân',
      subtitle: 'Giải Cứu Công Chúa • 4 Siêu Anh Hùng',
      genre: 'Thiếu nhi • Luyện chuột & phím',
      devices: '🖱 Kéo chuột • ⌨ Mũi tên',
      unit: 'điểm',
      description:
        'Hóa thân thành Người Nhện, The Flash, Batman hoặc Superman vượt mê cung giải cứu Công Chúa, hỗ trợ cả kéo chuột lẫn phím mũi tên (Dễ & Khó).',
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #dc2626 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g stroke="rgba(56,189,248,0.45)" stroke-width="3" fill="none">
            <rect x="190" y="25" width="150" height="100" rx="6"/>
            <line x1="235" y1="25" x2="235" y2="85"/>
            <line x1="285" y1="65" x2="285" y2="125"/>
            <line x1="235" y1="85" x2="310" y2="85"/>
          </g>
          <circle cx="212" cy="52" r="14" fill="#dc2626" stroke="#090d16" stroke-width="2.5"/>
          <ellipse cx="207" cy="50" rx="4" ry="2.5" fill="#ffffff"/>
          <ellipse cx="217" cy="50" rx="4" ry="2.5" fill="#ffffff"/>
          <circle cx="316" cy="104" r="14" fill="#ec4899" stroke="#090d16" stroke-width="2.5"/>
          <polygon points="308,90 312,82 316,88 320,82 324,90" fill="#facc15"/>
        </svg>
      `
    },
    {
      id: 'feedingfrenzy',
      title: 'Cá Lớn Nuốt Cá Bé',
      subtitle: 'Luyện Điều Khiển Chuột • 2 Chế Độ',
      genre: 'Thiếu nhi • Luyện chuột',
      devices: '🖱 Rê chuột • 📱 Chạm kéo',
      unit: 'điểm',
      description:
        'Giúp trẻ tập điều khiển chuột mượt mà dưới đại dương rực rỡ: ăn cá nhỏ hơn để tiến hóa thành Cá Mập Vua, có chế độ Dễ và Khó.',
      gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0d9488 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="195" cy="45" r="5" fill="rgba(255,255,255,0.35)"/>
          <circle cx="210" cy="30" r="8" fill="rgba(255,255,255,0.25)"/>
          <g transform="translate(245, 78)">
            <polygon points="-32,0 -54,-18 -54,18" fill="#ea580c" stroke="#090d16" stroke-width="2"/>
            <ellipse cx="0" cy="0" rx="34" ry="22" fill="#f97316" stroke="#090d16" stroke-width="2.5"/>
            <circle cx="16" cy="-5" r="6" fill="#ffffff" stroke="#090d16" stroke-width="2"/>
            <circle cx="18" cy="-5" r="3" fill="#090d16"/>
          </g>
          <g transform="translate(325, 82)">
            <ellipse cx="0" cy="0" rx="14" ry="9" fill="#4ade80" stroke="#090d16" stroke-width="2"/>
            <circle cx="-6" cy="-2" r="2.5" fill="#090d16"/>
          </g>
        </svg>
      `
    },
    {
      id: 'whackamole',
      title: 'Đập Chuột Vui Nhộn',
      subtitle: 'Luyện Phản Xạ Bấm Chuột • Dễ & Khó',
      genre: 'Thiếu nhi • Phản xạ chuột',
      devices: '🖱 Bấm chuột • 📱 Chạm',
      unit: 'điểm',
      description:
        'Rèn luyện phản xạ mắt và tay cho trẻ: cầm búa hoạt hình đập trúng Chuột Nâu và Chuột Vàng Vương Miện, khéo léo tránh các chú Thỏ Trắng.',
      gradient: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #ca8a04 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="265" cy="112" rx="46" ry="15" fill="#78350f" stroke="#090d16" stroke-width="2.5"/>
          <rect x="241" y="58" width="48" height="52" rx="22" fill="#b45309" stroke="#090d16" stroke-width="2.5"/>
          <circle cx="255" cy="76" r="4" fill="#090d16"/>
          <circle cx="275" cy="76" r="4" fill="#090d16"/>
          <ellipse cx="265" cy="84" rx="6" ry="4" fill="#f43f5e"/>
          <g transform="translate(315, 48) rotate(-25)">
            <rect x="-5" y="0" width="10" height="38" rx="4" fill="#f59e0b" stroke="#090d16" stroke-width="2"/>
            <rect x="-22" y="-18" width="44" height="22" rx="6" fill="#ef4444" stroke="#090d16" stroke-width="2"/>
          </g>
        </svg>
      `
    },
    {
      id: 'bubbleshooter',
      title: 'Khủng Long Bắn Trứng',
      subtitle: 'Ghép 3 Bóng Màu • Dễ & Khó',
      genre: 'Thiếu nhi • Giải đố Hành động',
      devices: '🖱 Ngắm bắn • 📱 Chạm',
      unit: 'điểm',
      description:
        'Cùng Khủng Long Con ngắm bắn các quả trứng phép thuật cùng màu để làm nổ tung cả chùm bóng, có tia laser dẫn đường cho bé ở chế độ Dễ.',
      gradient: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #7c3aed 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="220" cy="42" r="18" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
          <circle cx="256" cy="42" r="18" fill="#f43f5e" stroke="#ffffff" stroke-width="2"/>
          <circle cx="292" cy="42" r="18" fill="#38bdf8" stroke="#ffffff" stroke-width="2"/>
          <circle cx="238" cy="72" r="18" fill="#facc15" stroke="#ffffff" stroke-width="2"/>
          <circle cx="274" cy="72" r="18" fill="#22c55e" stroke="#ffffff" stroke-width="2"/>
          <line x1="256" y1="132" x2="238" y2="85" stroke="#f43f5e" stroke-width="3" stroke-dasharray="5 5"/>
          <circle cx="256" cy="128" r="16" fill="#f43f5e" stroke="#fef08a" stroke-width="2.5"/>
        </svg>
      `
    },
    {
      id: 'brickbreaker',
      title: 'Phá Gạch Vũ Trụ',
      subtitle: 'Giải Cứu Hành Tinh • Dễ & Khó',
      genre: 'Thiếu nhi • Phản xạ & Giải đố',
      devices: '🖱 Rê chuột • ⌨ Phím • 📱 Chạm',
      unit: 'điểm',
      description:
        'Điều khiển tàu đệm năng lượng hứng bóng phá vỡ pháo đài gạch vũ trụ, nhặt vật phẩm nhân 3 bóng, mở rộng ván trượt và súng đôi Laser.',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e40af 50%, #0891b2 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="190" y="28" width="44" height="18" rx="4" fill="#f43f5e"/>
          <rect x="240" y="28" width="44" height="18" rx="4" fill="#facc15"/>
          <rect x="290" y="28" width="44" height="18" rx="4" fill="#22c55e"/>
          <rect x="215" y="52" width="44" height="18" rx="4" fill="#38bdf8"/>
          <rect x="265" y="52" width="44" height="18" rx="4" fill="#a855f7"/>
          <circle cx="262" cy="92" r="9" fill="#fef08a" stroke="#f97316" stroke-width="2"/>
          <rect x="220" y="118" width="88" height="14" rx="7" fill="#38bdf8" stroke="#e0f2fe" stroke-width="2"/>
        </svg>
      `
    },
    {
      id: 'mathsnake',
      title: 'Rồng Con Săn Táo Toán Học',
      subtitle: 'Vừa Chơi Vừa Học Toán • Dễ & Khó',
      genre: 'Thiếu nhi • Toán học & Điều khiển',
      devices: '⌨ Mũi tên • 🖱 Chuột • 📱 Chạm',
      unit: 'điểm',
      description:
        'Tính nhẩm nhanh phép toán trên màn hình rồi dẫn Rồng Con đi ăn đúng quả táo mang số kết quả chính xác để Rồng lớn nhanh.',
      gradient: 'linear-gradient(135deg, #064e3b 0%, #16a34a 50%, #ca8a04 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="205" cy="82" r="15" fill="#16a34a"/>
          <circle cx="230" cy="82" r="17" fill="#4ade80"/>
          <circle cx="258" cy="82" r="20" fill="#22c55e" stroke="#fef08a" stroke-width="2.5"/>
          <circle cx="318" cy="78" r="18" fill="#ef4444" stroke="#fecaca" stroke-width="2"/>
          <text x="318" y="84" fill="#ffffff" font-size="16" font-weight="900" text-anchor="middle">8</text>
          <rect x="215" y="24" width="110" height="28" rx="8" fill="rgba(15,23,42,0.8)" stroke="#facc15" stroke-width="2"/>
          <text x="270" y="43" fill="#facc15" font-size="15" font-weight="900" text-anchor="middle">5 + 3 = ?</text>
        </svg>
      `
    },
    {
      id: 'sokoban',
      title: 'Hiệp Sĩ Đẩy Đá Mở Kho Báu',
      subtitle: 'Giải Đố Đẩy Đá • Có Nút Đi Lại',
      genre: 'Thiếu nhi • Tư duy Không gian',
      devices: '⌨ Mũi tên • 🖱 Bấm ô • 📱 Chạm',
      unit: 'điểm',
      description:
        'Giúp Hiệp Sĩ Nhí suy nghĩ đường đi thông minh để đẩy các viên đá phép thuật đè lên công tắc, mở khóa Rương Vàng Kho Báu.',
      gradient: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #2563eb 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="215" cy="78" r="20" fill="#38bdf8" stroke="#ffffff" stroke-width="2.5"/>
          <rect x="252" y="56" width="44" height="44" rx="8" fill="#f59e0b" stroke="#fef08a" stroke-width="2.5"/>
          <circle cx="328" cy="78" r="16" fill="rgba(56,189,248,0.3)" stroke="#38bdf8" stroke-width="3"/>
        </svg>
      `
    },
    {
      id: 'memorybattle',
      title: 'Lật Hình Siêu Nhân Đấu Boss',
      subtitle: 'Luyện Trí Nhớ • Tung Chưởng Diệt Boss',
      genre: 'Thiếu nhi • Luyện trí nhớ',
      devices: '🖱 Bấm chuột • 📱 Chạm',
      unit: 'điểm',
      description:
        'Lật mở các cặp thẻ bài Siêu Anh Hùng giống nhau để phóng tuyệt chiêu tấn công Quái Vật Vũ Trụ hoặc bật khiên hồi máu cho đội.',
      gradient: 'linear-gradient(135deg, #311042 0%, #7e22ce 50%, #e11d48 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="195" y="34" width="54" height="76" rx="8" fill="#1e293b" stroke="#facc15" stroke-width="2.5"/>
          <text x="222" y="78" font-size="28" text-anchor="middle">⚡</text>
          <rect x="262" y="34" width="54" height="76" rx="8" fill="#2563eb" stroke="#93c5fd" stroke-width="2.5"/>
          <text x="289" y="78" font-size="24" text-anchor="middle">⭐</text>
        </svg>
      `
    },
    {
      id: 'lasermirror',
      title: 'Nối Gương Dẫn Tia Sáng',
      subtitle: 'Xoay Gương 45° • Sạc Pin Cứu Robot',
      genre: 'Thiếu nhi • Khoa học & Logic',
      devices: '🖱 Bấm xoay gương • 📱 Chạm',
      unit: 'điểm',
      description:
        'Bấm chuột xoay các tấm gương phản xạ 45° để dẫn tia laser đi qua các ngôi sao và nạp đầy viên pin năng lượng cho chú Robot.',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #0284c7 50%, #10b981 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <polyline points="185,95 250,95 250,42 320,42" fill="none" stroke="#f43f5e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="236" y1="109" x2="264" y2="81" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
          <line x1="236" y1="56" x2="264" y2="28" stroke="#38bdf8" stroke-width="6" stroke-linecap="round"/>
          <circle cx="326" cy="42" r="18" fill="#16a34a" stroke="#bbf7d0" stroke-width="2.5"/>
        </svg>
      `
    },
    {
      id: 'caro',
      title: 'Cờ Caro Chiến Thuật',
      subtitle: 'Gomoku 15x15 • Đấu AI & 2 Người',
      genre: 'Trí tuệ • Đối kháng',
      devices: '💻 Chuột • 📱 Chạm',
      unit: 'điểm',
      description:
        'Bàn cờ 15x15 sắc nét với AI đánh giá thế cờ công-thủ 3 cấp độ hoặc chế độ 2 người chơi chung máy.',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0284c7 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g stroke="rgba(255,255,255,0.12)" stroke-width="1">
            <line x1="160" y1="0" x2="160" y2="150"/><line x1="200" y1="0" x2="200" y2="150"/>
            <line x1="240" y1="0" x2="240" y2="150"/><line x1="280" y1="0" x2="280" y2="150"/>
            <line x1="320" y1="0" x2="320" y2="150"/><line x1="120" y1="35" x2="380" y2="35"/>
            <line x1="120" y1="75" x2="380" y2="75"/><line x1="120" y1="115" x2="380" y2="115"/>
          </g>
          <g stroke="#38bdf8" stroke-width="4" stroke-linecap="round">
            <line x1="170" y1="45" x2="190" y2="65"/><line x1="190" y1="45" x2="170" y2="65"/>
            <line x1="210" y1="85" x2="230" y2="105"/><line x1="230" y1="85" x2="210" y2="105"/>
            <line x1="250" y1="45" x2="270" y2="65"/><line x1="270" y1="45" x2="250" y2="65"/>
          </g>
          <circle cx="220" cy="55" r="11" stroke="#f43f5e" stroke-width="4" fill="none"/>
          <circle cx="260" cy="95" r="11" stroke="#f43f5e" stroke-width="4" fill="none"/>
          <circle cx="300" cy="55" r="11" stroke="#f43f5e" stroke-width="4" fill="none"/>
          <line x1="162" y1="38" x2="278" y2="112" stroke="#fbbf24" stroke-width="4" stroke-dasharray="6 4"/>
        </svg>
      `
    },
    {
      id: 'sudoku',
      title: 'Sudoku Siêu Cấp',
      subtitle: 'Giải đố 9x9 • Ghi chú & Gợi ý',
      genre: 'Giải đố • Logic',
      devices: '⌨ Phím • 📱 Cảm ứng',
      unit: 'điểm',
      description:
        'Thử thách trí não với bộ sinh đề Sudoku tự động 3 độ khó, hỗ trợ chế độ ghi chú (Notes) và gợi ý thông minh.',
      gradient: 'linear-gradient(135deg, #1e1b4b 0%, #4f46e5 55%, #7c3aed 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect x="210" y="18" width="114" height="114" rx="8" fill="rgba(15,23,42,0.55)" stroke="#a855f7" stroke-width="2.5"/>
          <line x1="248" y1="18" x2="248" y2="132" stroke="#818cf8" stroke-width="2"/>
          <line x1="286" y1="18" x2="286" y2="132" stroke="#818cf8" stroke-width="2"/>
          <line x1="210" y1="56" x2="324" y2="56" stroke="#818cf8" stroke-width="2"/>
          <line x1="210" y1="94" x2="324" y2="94" stroke="#818cf8" stroke-width="2"/>
          <text x="229" y="44" fill="#38bdf8" font-size="20" font-weight="bold" text-anchor="middle">9</text>
          <text x="267" y="82" fill="#fbbf24" font-size="20" font-weight="bold" text-anchor="middle">5</text>
          <text x="305" y="120" fill="#22c55e" font-size="20" font-weight="bold" text-anchor="middle">1</text>
          <text x="229" y="120" fill="#e2e8f0" font-size="20" font-weight="bold" text-anchor="middle">7</text>
        </svg>
      `
    },
    {
      id: 'domino',
      title: 'Domino Đại Chiến',
      subtitle: 'Bộ 28 Quân • Đấu trí cùng AI',
      genre: 'Board Game • Chiến thuật',
      devices: '💻 Chuột • 📱 Chạm',
      unit: 'điểm',
      description:
        'Đánh bài Domino truyền thống 28 quân trên bàn nỉ sang trọng. Tính toán nước chặn hai đầu để giành chiến thắng.',
      gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 55%, #0d9488 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <g transform="translate(190, 32) rotate(-12)">
            <rect x="0" y="0" width="46" height="86" rx="7" fill="#f8fafc" stroke="#38bdf8" stroke-width="2.5"/>
            <line x1="4" y1="43" x2="42" y2="43" stroke="#64748b" stroke-width="2"/>
            <circle cx="14" cy="15" r="4" fill="#0f172a"/><circle cx="32" cy="29" r="4" fill="#0f172a"/>
            <circle cx="14" cy="56" r="4" fill="#0f172a"/><circle cx="23" cy="65" r="4" fill="#0f172a"/><circle cx="32" cy="74" r="4" fill="#0f172a"/>
          </g>
          <g transform="translate(260, 26) rotate(14)">
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
      genre: 'Bắn súng • Hành động',
      devices: '🖱 Ngắm bắn • 📱 Cảm ứng',
      unit: 'điểm',
      description:
        'Bảo vệ bờ biển trước các đợt đổ bộ của lính dù, trực thăng và xe tăng bọc thép bằng súng máy đôi và đại pháo.',
      gradient: 'linear-gradient(135deg, #451a03 0%, #b45309 50%, #dc2626 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <circle cx="275" cy="72" r="36" fill="rgba(251,191,36,0.28)"/>
          <circle cx="275" cy="72" r="24" stroke="#22c55e" stroke-width="2.5" fill="none"/>
          <line x1="242" y1="72" x2="308" y2="72" stroke="#22c55e" stroke-width="2"/>
          <line x1="275" y1="39" x2="275" y2="105" stroke="#22c55e" stroke-width="2"/>
          <path d="M195 45 A18 18 0 0 1 231 45 Z" fill="#e2e8f0"/>
          <line x1="198" y1="45" x2="213" y2="62" stroke="#cbd5e1"/><line x1="228" y1="45" x2="213" y2="62" stroke="#cbd5e1"/>
          <circle cx="213" cy="66" r="5" fill="#fbbf24"/>
        </svg>
      `
    },
    {
      id: 'roadrash',
      title: 'Đua Xe Road Rash',
      subtitle: 'Mô-tô Tốc Độ • Đá văng đối thủ',
      genre: 'Đua xe • Hành động',
      devices: '⌨ Phím • 📱 Cảm ứng',
      unit: 'điểm',
      description:
        'Vít ga siêu mô-tô trên đại lộ Pseudo-3D, bật Nitro bứt tốc, lạng lách qua dòng xe và tung cú đá hạ gục các tay đua đối thủ!',
      gradient: 'linear-gradient(135deg, #3b0764 0%, #be123c 55%, #ea580c 100%)',
      svgArt: `
        <svg viewBox="0 0 400 150" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <polygon points="245,35 285,35 365,150 165,150" fill="rgba(15,23,42,0.65)" stroke="#fbbf24" stroke-width="2"/>
          <line x1="265" y1="40" x2="265" y2="150" stroke="#38bdf8" stroke-width="3" stroke-dasharray="10 8"/>
          <rect x="251" y="75" width="28" height="44" rx="8" fill="#2563eb" stroke="#f8fafc" stroke-width="2"/>
          <circle cx="265" cy="68" r="10" fill="#fbbf24"/>
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

  const brandHomeBtn = document.getElementById('brandHomeBtn');
  const changeNameBtn = document.getElementById('changeNameBtn');
  const playerAvatar = document.getElementById('playerAvatar');
  const currentPlayerNameEl = document.getElementById('currentPlayerName');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIcon = document.getElementById('soundIcon');
  const globalFullscreenBtn = document.getElementById('globalFullscreenBtn');

  const totalRecordsCountEl = document.getElementById('totalRecordsCount');
  const topOneCountEl = document.getElementById('topOneCount');

  // Stage Header Elements
  const backToHomeBtn = document.getElementById('backToHomeBtn');
  const activeGameTitleEl = document.getElementById('activeGameTitle');
  const activeGameSubtitleEl = document.getElementById('activeGameSubtitle');
  const hudPlayerNameEl = document.getElementById('hudPlayerName');
  const hudCurrentScoreEl = document.getElementById('hudCurrentScore');
  const hudBestScoreEl = document.getElementById('hudBestScore');
  const restartGameBtn = document.getElementById('restartGameBtn');
  const stageLeaderboardBtn = document.getElementById('stageLeaderboardBtn');
  const stageFullscreenBtn = document.getElementById('stageFullscreenBtn');

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

  const toastContainer = document.getElementById('toastContainer');

  let activeGameId = null;
  let activeGameInstance = null;
  let pendingGameLaunchId = null;

  function showToast(message) {
    const item = document.createElement('div');
    item.className = 'toast-item';
    item.textContent = message;
    toastContainer.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, 3200);
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

  function renderHomeCatalog() {
    const stats = ArcadeHub.storage.getStatsSummary(GAME_CATALOG.map((g) => g.id));
    totalRecordsCountEl.textContent = String(stats.totalRecords);
    topOneCountEl.textContent = String(stats.topOneForCurrentPlayer);

    gamesGrid.innerHTML = '';

    GAME_CATALOG.forEach((game) => {
      const card = document.createElement('article');
      card.className = 'game-card';
      card.innerHTML = `
        <div class="card-banner" style="background: ${game.gradient};">
          <span class="game-genre-tag">${escapeHtml(game.genre)}</span>
          <span class="game-device-tag">${escapeHtml(game.devices)}</span>
          <div class="card-banner-art">${game.svgArt}</div>
        </div>
        <div class="card-body">
          <div class="card-title-row">
            <h3>${escapeHtml(game.title)}</h3>
            <span class="score-unit-badge">${escapeHtml(game.subtitle)}</span>
          </div>
          <p class="card-desc">${escapeHtml(game.description)}</p>
          <div class="card-actions">
            <button type="button" class="play-now-btn" data-launch="${game.id}">
              ▶ Chơi Ngay
            </button>
          </div>
        </div>
      `;

      const playBtn = card.querySelector('[data-launch]');
      playBtn.addEventListener('click', () => {
        ArcadeHub.sound.click();
        requestLaunchGame(game.id);
      });

      gamesGrid.appendChild(card);
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

  function mountGame(gameId) {
    const gameMeta = GAME_CATALOG.find((g) => g.id === gameId);
    const gameModule = ArcadeHub.games && ArcadeHub.games[gameId];
    if (!gameMeta || !gameModule) {
      showToast('Không tìm thấy module trò chơi!');
      return;
    }

    unmountActiveGame();
    activeGameId = gameId;
    pushGameHistoryLock(gameId);

    homeView.classList.remove('active-view');
    gameView.classList.add('active-view');
    gameView.setAttribute('aria-hidden', 'false');

    activeGameTitleEl.textContent = gameMeta.title;
    activeGameSubtitleEl.textContent = gameMeta.subtitle;
    hudPlayerNameEl.textContent = ArcadeHub.storage.getPlayerName() || 'Người chơi';
    hudCurrentScoreEl.textContent = '0';
    const best = ArcadeHub.storage.getBestScore(gameId);
    hudBestScoreEl.textContent = best > 0 ? formatNumber(best) : '---';
    renderInGameTop3(gameId);

    const gameContext = {
      getPlayerName() {
        return ArcadeHub.storage.getPlayerName() || 'Người chơi';
      },
      updateScore(scoreVal) {
        hudCurrentScoreEl.textContent = formatNumber(scoreVal);
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
    leaderboardModalOverlay.hidden = false;
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

  restartGameBtn.addEventListener('click', () => {
    ArcadeHub.sound.click();
    if (activeGameInstance && typeof activeGameInstance.restart === 'function') {
      hudCurrentScoreEl.textContent = '0';
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
    stageFullscreenBtn.textContent = isFull ? '🗗 Thoát Full' : '⛶ Full màn hình';
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
      if (!activeGameId || !evt.touches || evt.touches.length !== 1) return;
      const touchX = evt.touches[0].clientX;
      // Chặn thao tác vuốt từ sát mép trái/phải màn hình điện thoại (gesture back của iOS/Android)
      if (touchX < 28 || touchX > global.innerWidth - 28) {
        evt.preventDefault();
      }
    },
    { passive: false }
  );

  // Initial Boot
  function initApp() {
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
