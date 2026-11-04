export type WordCategory =
  | 'العلوم والتكنولوجيا'
  | 'الجغرافيا والتاريخ'
  | 'الأدوات والأشياء اليومية'
  | 'الرياضة'
  | 'الطبيعة'
  | 'التفكير والمنطق'
  | 'المهن والمجتمع'
  | 'الفضاء'
  | 'الثقافة العربية'
  | 'المفاهيم المجردة';

export interface WordEntry {
  id: string;
  ar: string;
  en: string;
  category: WordCategory;
}

/**
 * Strips Arabic diacritics (Tashkeel), Tatweel, extra spaces, and normalizes
 * Alef/Hamza variants for strict duplicate detection.
 */
export function normalizeArabicWord(word: string): string {
  return word
    .trim()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Remove Tashkeel and Tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ');
}

const RAW_WORDS: Array<{ ar: string; en: string; category: WordCategory }> = [
  // 1. العلوم والتكنولوجيا (Science & Technology) - 55 words
  { ar: 'شيفرة', en: 'Cipher', category: 'العلوم والتكنولوجيا' },
  { ar: 'تردد', en: 'Frequency', category: 'العلوم والتكنولوجيا' },
  { ar: 'طاقة', en: 'Energy', category: 'العلوم والتكنولوجيا' },
  { ar: 'عدسة', en: 'Lens', category: 'العلوم والتكنولوجيا' },
  { ar: 'شبكة', en: 'Network', category: 'العلوم والتكنولوجيا' },
  { ar: 'طيف', en: 'Spectrum', category: 'العلوم والتكنولوجيا' },
  { ar: 'موجة', en: 'Wave', category: 'العلوم والتكنولوجيا' },
  { ar: 'جاذبية', en: 'Gravity', category: 'العلوم والتكنولوجيا' },
  { ar: 'إشارة', en: 'Signal', category: 'العلوم والتكنولوجيا' },
  { ar: 'خوارزمية', en: 'Algorithm', category: 'العلوم والتكنولوجيا' },
  { ar: 'معالج', en: 'Processor', category: 'العلوم والتكنولوجيا' },
  { ar: 'مغناطيس', en: 'Magnet', category: 'العلوم والتكنولوجيا' },
  { ar: 'ذرّة', en: 'Atom', category: 'العلوم والتكنولوجيا' },
  { ar: 'نواة', en: 'Nucleus', category: 'العلوم والتكنولوجيا' },
  { ar: 'ليزر', en: 'Laser', category: 'العلوم والتكنولوجيا' },
  { ar: 'روبوت', en: 'Robot', category: 'العلوم والتكنولوجيا' },
  { ar: 'بطارية', en: 'Battery', category: 'العلوم والتكنولوجيا' },
  { ar: 'محرك', en: 'Engine', category: 'العلوم والتكنولوجيا' },
  { ar: 'رادار', en: 'Radar', category: 'العلوم والتكنولوجيا' },
  { ar: 'ألياف', en: 'Fiber', category: 'العلوم والتكنولوجيا' },
  { ar: 'شريحة', en: 'Microchip', category: 'العلوم والتكنولوجيا' },
  { ar: 'مختبر', en: 'Laboratory', category: 'العلوم والتكنولوجيا' },
  { ar: 'تفاعل', en: 'Reaction', category: 'العلوم والتكنولوجيا' },
  { ar: 'معدن', en: 'Metal', category: 'العلوم والتكنولوجيا' },
  { ar: 'بلورة', en: 'Crystal', category: 'العلوم والتكنولوجيا' },
  { ar: 'تيار', en: 'Current', category: 'العلوم والتكنولوجيا' },
  { ar: 'ضغط', en: 'Pressure', category: 'العلوم والتكنولوجيا' },
  { ar: 'كثافة', en: 'Density', category: 'العلوم والتكنولوجيا' },
  { ar: 'انصهار', en: 'Fusion', category: 'العلوم والتكنولوجيا' },
  { ar: 'تبخر', en: 'Evaporation', category: 'العلوم والتكنولوجيا' },
  { ar: 'صدى', en: 'Echo', category: 'العلوم والتكنولوجيا' },
  { ar: 'مجهر', en: 'Microscope', category: 'العلوم والتكنولوجيا' },
  { ar: 'لقاح', en: 'Vaccine', category: 'العلوم والتكنولوجيا' },
  { ar: 'جينات', en: 'Genes', category: 'العلوم والتكنولوجيا' },
  { ar: 'خلية', en: 'Cell', category: 'العلوم والتكنولوجيا' },
  { ar: 'هرمون', en: 'Hormone', category: 'العلوم والتكنولوجيا' },
  { ar: 'مناعة', en: 'Immunity', category: 'العلوم والتكنولوجيا' },
  { ar: 'أكسجين', en: 'Oxygen', category: 'العلوم والتكنولوجيا' },
  { ar: 'كربون', en: 'Carbon', category: 'العلوم والتكنولوجيا' },
  { ar: 'زئبق', en: 'Mercury', category: 'العلوم والتكنولوجيا' },
  { ar: 'تيتانيوم', en: 'Titanium', category: 'العلوم والتكنولوجيا' },
  { ar: 'بندول', en: 'Pendulum', category: 'العلوم والتكنولوجيا' },
  { ar: 'توربين', en: 'Turbine', category: 'العلوم والتكنولوجيا' },
  { ar: 'مكبس', en: 'Piston', category: 'العلوم والتكنولوجيا' },
  { ar: 'بوصلة', en: 'Compass', category: 'العلوم والتكنولوجيا' },
  { ar: 'حساس', en: 'Sensor', category: 'العلوم والتكنولوجيا' },
  { ar: 'برمجة', en: 'Programming', category: 'العلوم والتكنولوجيا' },
  { ar: 'خادم', en: 'Server', category: 'العلوم والتكنولوجيا' },
  { ar: 'بيانات', en: 'Data', category: 'العلوم والتكنولوجيا' },
  { ar: 'تشفير', en: 'Encryption', category: 'العلوم والتكنولوجيا' },
  { ar: 'طيفور', en: 'Spectrometer', category: 'العلوم والتكنولوجيا' },
  { ar: 'مفاعل', en: 'Reactor', category: 'العلوم والتكنولوجيا' },
  { ar: 'شعاع', en: 'Beam', category: 'العلوم والتكنولوجيا' },
  { ar: 'انكسار', en: 'Refraction', category: 'العلوم والتكنولوجيا' },
  { ar: 'توازن', en: 'Equilibrium', category: 'العلوم والتكنولوجيا' },

  // 2. الجغرافيا والتاريخ (Geography & History) - 55 words
  { ar: 'أطلس', en: 'Atlas', category: 'الجغرافيا والتاريخ' },
  { ar: 'ميناء', en: 'Port', category: 'الجغرافيا والتاريخ' },
  { ar: 'حصار', en: 'Siege', category: 'الجغرافيا والتاريخ' },
  { ar: 'أسطورة', en: 'Legend', category: 'الجغرافيا والتاريخ' },
  { ar: 'منارة', en: 'Lighthouse', category: 'الجغرافيا والتاريخ' },
  { ar: 'خريطة', en: 'Map', category: 'الجغرافيا والتاريخ' },
  { ar: 'قارة', en: 'Continent', category: 'الجغرافيا والتاريخ' },
  { ar: 'أرشيف', en: 'Archive', category: 'الجغرافيا والتاريخ' },
  { ar: 'ميثاق', en: 'Charter', category: 'الجغرافيا والتاريخ' },
  { ar: 'قلعة', en: 'Fortress', category: 'الجغرافيا والتاريخ' },
  { ar: 'إمبراطورية', en: 'Empire', category: 'الجغرافيا والتاريخ' },
  { ar: 'حضارة', en: 'Civilization', category: 'الجغرافيا والتاريخ' },
  { ar: 'آثار', en: 'Ruins', category: 'الجغرافيا والتاريخ' },
  { ar: 'مضيق', en: 'Strait', category: 'الجغرافيا والتاريخ' },
  { ar: 'أرخبيل', en: 'Archipelago', category: 'الجغرافيا والتاريخ' },
  { ar: 'شبه جزيرة', en: 'Peninsula', category: 'الجغرافيا والتاريخ' },
  { ar: 'واحة', en: 'Oasis', category: 'الجغرافيا والتاريخ' },
  { ar: 'خليج', en: 'Gulf', category: 'الجغرافيا والتاريخ' },
  { ar: 'محيط', en: 'Ocean', category: 'الجغرافيا والتاريخ' },
  { ar: 'نهر', en: 'River', category: 'الجغرافيا والتاريخ' },
  { ar: 'دلتا', en: 'Delta', category: 'الجغرافيا والتاريخ' },
  { ar: 'هضبة', en: 'Plateau', category: 'الجغرافيا والتاريخ' },
  { ar: 'وادي', en: 'Valley', category: 'الجغرافيا والتاريخ' },
  { ar: 'سافانا', en: 'Savanna', category: 'الجغرافيا والتاريخ' },
  { ar: 'قطب', en: 'Pole', category: 'الجغرافيا والتاريخ' },
  { ar: 'استواء', en: 'Equator', category: 'الجغرافيا والتاريخ' },
  { ar: 'حدود', en: 'Border', category: 'الجغرافيا والتاريخ' },
  { ar: 'عاصمة', en: 'Capital', category: 'الجغرافيا والتاريخ' },
  { ar: 'معاهدة', en: 'Treaty', category: 'الجغرافيا والتاريخ' },
  { ar: 'ثورة', en: 'Revolution', category: 'الجغرافيا والتاريخ' },
  { ar: 'سلالة', en: 'Dynasty', category: 'الجغرافيا والتاريخ' },
  { ar: 'قافلة', en: 'Caravan', category: 'الجغرافيا والتاريخ' },
  { ar: 'طريق الحرير', en: 'Silk Road', category: 'الجغرافيا والتاريخ' },
  { ar: 'الأندلس', en: 'Andalusia', category: 'الجغرافيا والتاريخ' },
  { ar: 'القدس', en: 'Jerusalem', category: 'الجغرافيا والتاريخ' },
  { ar: 'بغداد', en: 'Baghdad', category: 'الجغرافيا والتاريخ' },
  { ar: 'دمشق', en: 'Damascus', category: 'الجغرافيا والتاريخ' },
  { ar: 'قرطاج', en: 'Carthage', category: 'الجغرافيا والتاريخ' },
  { ar: 'بتراء', en: 'Petra', category: 'الجغرافيا والتاريخ' },
  { ar: 'أهرامات', en: 'Pyramids', category: 'الجغرافيا والتاريخ' },
  { ar: 'سور', en: 'Wall', category: 'الجغرافيا والتاريخ' },
  { ar: 'خندق', en: 'Trench', category: 'الجغرافيا والتاريخ' },
  { ar: 'أسطول', en: 'Fleet', category: 'الجغرافيا والتاريخ' },
  { ar: 'منجنيق', en: 'Catapult', category: 'الجغرافيا والتاريخ' },
  { ar: 'درع', en: 'Shield', category: 'الجغرافيا والتاريخ' },
  { ar: 'تاج', en: 'Crown', category: 'الجغرافيا والتاريخ' },
  { ar: 'عرش', en: 'Throne', category: 'الجغرافيا والتاريخ' },
  { ar: 'مخطوطة', en: 'Manuscript', category: 'الجغرافيا والتاريخ' },
  { ar: 'كتيبة', en: 'Battalion', category: 'الجغرافيا والتاريخ' },
  { ar: 'هدنة', en: 'Truce', category: 'الجغرافيا والتاريخ' },
  { ar: 'فتح', en: 'Conquest', category: 'الجغرافيا والتاريخ' },
  { ar: 'رحالة', en: 'Explorer', category: 'الجغرافيا والتاريخ' },
  { ar: 'مستعمرة', en: 'Colony', category: 'الجغرافيا والتاريخ' },
  { ar: 'مرسى', en: 'Harbor', category: 'الجغرافيا والتاريخ' },
  { ar: 'معبر', en: 'Crossing', category: 'الجغرافيا والتاريخ' },

  // 3. الأدوات والأشياء اليومية (Tools & Everyday Objects) - 55 words
  { ar: 'مرآة', en: 'Mirror', category: 'الأدوات والأشياء اليومية' },
  { ar: 'قناع', en: 'Mask', category: 'الأدوات والأشياء اليومية' },
  { ar: 'خزنة', en: 'Safe', category: 'الأدوات والأشياء اليومية' },
  { ar: 'طائرة', en: 'Airplane', category: 'الأدوات والأشياء اليومية' },
  { ar: 'جسر', en: 'Bridge', category: 'الأدوات والأشياء اليومية' },
  { ar: 'نفق', en: 'Tunnel', category: 'الأدوات والأشياء اليومية' },
  { ar: 'سفينة', en: 'Ship', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مفتاح', en: 'Key', category: 'الأدوات والأشياء اليومية' },
  { ar: 'قفل', en: 'Lock', category: 'الأدوات والأشياء اليومية' },
  { ar: 'ساعة', en: 'Clock', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مصباح', en: 'Lamp', category: 'الأدوات والأشياء اليومية' },
  { ar: 'شمعة', en: 'Candle', category: 'الأدوات والأشياء اليومية' },
  { ar: 'حقيبة', en: 'Bag', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مظلة', en: 'Umbrella', category: 'الأدوات والأشياء اليومية' },
  { ar: 'سلم', en: 'Ladder', category: 'الأدوات والأشياء اليومية' },
  { ar: 'حبل', en: 'Rope', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مرساة', en: 'Anchor', category: 'الأدوات والأشياء اليومية' },
  { ar: 'عجلة', en: 'Wheel', category: 'الأدوات والأشياء اليومية' },
  { ar: 'قطار', en: 'Train', category: 'الأدوات والأشياء اليومية' },
  { ar: 'غواصة', en: 'Submarine', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مروحية', en: 'Helicopter', category: 'الأدوات والأشياء اليومية' },
  { ar: 'شراع', en: 'Sail', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مطرقة', en: 'Hammer', category: 'الأدوات والأشياء اليومية' },
  { ar: 'سندان', en: 'Anvil', category: 'الأدوات والأشياء اليومية' },
  { ar: 'منشار', en: 'Saw', category: 'الأدوات والأشياء اليومية' },
  { ar: 'إبرة', en: 'Needle', category: 'الأدوات والأشياء اليومية' },
  { ar: 'خيط', en: 'Thread', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مقص', en: 'Scissors', category: 'الأدوات والأشياء اليومية' },
  { ar: 'ريشة', en: 'Feather', category: 'الأدوات والأشياء اليومية' },
  { ar: 'محبرة', en: 'Inkwell', category: 'الأدوات والأشياء اليومية' },
  { ar: 'دفتر', en: 'Notebook', category: 'الأدوات والأشياء اليومية' },
  { ar: 'ختم', en: 'Seal', category: 'الأدوات والأشياء اليومية' },
  { ar: 'ظرف', en: 'Envelope', category: 'الأدوات والأشياء اليومية' },
  { ar: 'طابع', en: 'Stamp', category: 'الأدوات والأشياء اليومية' },
  { ar: 'جرس', en: 'Bell', category: 'الأدوات والأشياء اليومية' },
  { ar: 'صفارة', en: 'Whistle', category: 'الأدوات والأشياء اليومية' },
  { ar: 'منظار', en: 'Binoculars', category: 'الأدوات والأشياء اليومية' },
  { ar: 'كاميرا', en: 'Camera', category: 'الأدوات والأشياء اليومية' },
  { ar: 'شاشة', en: 'Screen', category: 'الأدوات والأشياء اليومية' },
  { ar: 'لوحة مفاتيح', en: 'Keyboard', category: 'الأدوات والأشياء اليومية' },
  { ar: 'سماعة', en: 'Headphones', category: 'الأدوات والأشياء اليومية' },
  { ar: 'ميكروفون', en: 'Microphone', category: 'الأدوات والأشياء اليومية' },
  { ar: 'كأس', en: 'Trophy', category: 'الأدوات والأشياء اليومية' },
  { ar: 'وسادة', en: 'Pillow', category: 'الأدوات والأشياء اليومية' },
  { ar: 'ستارة', en: 'Curtain', category: 'الأدوات والأشياء اليومية' },
  { ar: 'سجادة', en: 'Carpet', category: 'الأدوات والأشياء اليومية' },
  { ar: 'فانوس', en: 'Lantern', category: 'الأدوات والأشياء اليومية' },
  { ar: 'ميزان', en: 'Scale', category: 'الأدوات والأشياء اليومية' },
  { ar: 'صندوق', en: 'Box', category: 'الأدوات والأشياء اليومية' },
  { ar: 'سلسلة', en: 'Chain', category: 'الأدوات والأشياء اليومية' },
  { ar: 'نافذة', en: 'Window', category: 'الأدوات والأشياء اليومية' },
  { ar: 'بوابة', en: 'Gate', category: 'الأدوات والأشياء اليومية' },
  { ar: 'عمود', en: 'Pillar', category: 'الأدوات والأشياء اليومية' },
  { ar: 'قبة', en: 'Dome', category: 'الأدوات والأشياء اليومية' },
  { ar: 'مئذنة', en: 'Minaret', category: 'الأدوات والأشياء اليومية' },

  // 4. الرياضة (Sports) - 50 words
  { ar: 'ملعب', en: 'Stadium', category: 'الرياضة' },
  { ar: 'شوط', en: 'Half', category: 'الرياضة' },
  { ar: 'مرمى', en: 'Goal', category: 'الرياضة' },
  { ar: 'ركلة', en: 'Kick', category: 'الرياضة' },
  { ar: 'تسلل', en: 'Offside', category: 'الرياضة' },
  { ar: 'مدرب', en: 'Coach', category: 'الرياضة' },
  { ar: 'حكم', en: 'Referee', category: 'الرياضة' },
  { ar: 'بطولة', en: 'Tournament', category: 'الرياضة' },
  { ar: 'ميدالية', en: 'Medal', category: 'الرياضة' },
  { ar: 'سباق', en: 'Race', category: 'الرياضة' },
  { ar: 'ماراثون', en: 'Marathon', category: 'الرياضة' },
  { ar: 'عدّاء', en: 'Sprinter', category: 'الرياضة' },
  { ar: 'حلبة', en: 'Arena', category: 'الرياضة' },
  { ar: 'مبارزة', en: 'Fencing', category: 'الرياضة' },
  { ar: 'رماية', en: 'Archery', category: 'الرياضة' },
  { ar: 'سهم', en: 'Arrow', category: 'الرياضة' },
  { ar: 'قوس', en: 'Bow', category: 'الرياضة' },
  { ar: 'فروسية', en: 'Equestrian', category: 'الرياضة' },
  { ar: 'مضمار', en: 'Track', category: 'الرياضة' },
  { ar: 'حاجز', en: 'Hurdle', category: 'الرياضة' },
  { ar: 'وثب', en: 'Jump', category: 'الرياضة' },
  { ar: 'سباحة', en: 'Swimming', category: 'الرياضة' },
  { ar: 'غوص', en: 'Diving', category: 'الرياضة' },
  { ar: 'تجديف', en: 'Rowing', category: 'الرياضة' },
  { ar: 'مجداف', en: 'Oar', category: 'الرياضة' },
  { ar: 'تسلق', en: 'Climbing', category: 'الرياضة' },
  { ar: 'تزلج', en: 'Skiing', category: 'الرياضة' },
  { ar: 'مضرب', en: 'Racket', category: 'الرياضة' },
  { ar: 'طاولة', en: 'Table', category: 'الرياضة' },
  { ar: 'شطرنج', en: 'Chess', category: 'الرياضة' },
  { ar: 'كش ملك', en: 'Checkmate', category: 'الرياضة' },
  { ar: 'بيدق', en: 'Pawn', category: 'الرياضة' },
  { ar: 'وزن', en: 'Weight', category: 'الرياضة' },
  { ar: 'لياقة', en: 'Fitness', category: 'الرياضة' },
  { ar: 'تمريرة', en: 'Pass', category: 'الرياضة' },
  { ar: 'مراوغة', en: 'Dribble', category: 'الرياضة' },
  { ar: 'تتويج', en: 'Coronation', category: 'الرياضة' },
  { ar: 'نهائي', en: 'Final', category: 'الرياضة' },
  { ar: 'تحدي', en: 'Challenge', category: 'الرياضة' },
  { ar: 'خصم', en: 'Opponent', category: 'الرياضة' },
  { ar: 'تعادل', en: 'Draw', category: 'الرياضة' },
  { ar: 'شباك', en: 'Net', category: 'الرياضة' },
  { ar: 'مدرج', en: 'Grandstand', category: 'الرياضة' },
  { ar: 'شعلة', en: 'Torch', category: 'الرياضة' },
  { ar: 'أولمبياد', en: 'Olympics', category: 'الرياضة' },
  { ar: 'جولة', en: 'Round', category: 'الرياضة' },
  { ar: 'نقطة', en: 'Point', category: 'الرياضة' },
  { ar: 'دفاع', en: 'Defense', category: 'الرياضة' },
  { ar: 'هجوم', en: 'Attack', category: 'الرياضة' },
  { ar: 'تكتيك', en: 'Tactic', category: 'الرياضة' },

  // 5. الطبيعة (Nature) - 55 words
  { ar: 'سراب', en: 'Mirage', category: 'الطبيعة' },
  { ar: 'بركان', en: 'Volcano', category: 'الطبيعة' },
  { ar: 'منجم', en: 'Mine', category: 'الطبيعة' },
  { ar: 'زمرد', en: 'Emerald', category: 'الطبيعة' },
  { ar: 'ظلال', en: 'Shadows', category: 'الطبيعة' },
  { ar: 'غابة', en: 'Forest', category: 'الطبيعة' },
  { ar: 'صحراء', en: 'Desert', category: 'الطبيعة' },
  { ar: 'كثبان', en: 'Dunes', category: 'الطبيعة' },
  { ar: 'شلال', en: 'Waterfall', category: 'الطبيعة' },
  { ar: 'ينبوع', en: 'Spring', category: 'الطبيعة' },
  { ar: 'كهف', en: 'Cave', category: 'الطبيعة' },
  { ar: 'جبل', en: 'Mountain', category: 'الطبيعة' },
  { ar: 'قمة', en: 'Summit', category: 'الطبيعة' },
  { ar: 'سفح', en: 'Slope', category: 'الطبيعة' },
  { ar: 'هاوية', en: 'Abyss', category: 'الطبيعة' },
  { ar: 'مرجان', en: 'Coral', category: 'الطبيعة' },
  { ar: 'لؤلؤ', en: 'Pearl', category: 'الطبيعة' },
  { ar: 'صدفة', en: 'Shell', category: 'الطبيعة' },
  { ar: 'ياقوت', en: 'Ruby', category: 'الطبيعة' },
  { ar: 'ألماس', en: 'Diamond', category: 'الطبيعة' },
  { ar: 'عاصفة', en: 'Storm', category: 'الطبيعة' },
  { ar: 'إعصار', en: 'Hurricane', category: 'الطبيعة' },
  { ar: 'برق', en: 'Lightning', category: 'الطبيعة' },
  { ar: 'رعد', en: 'Thunder', category: 'الطبيعة' },
  { ar: 'ضباب', en: 'Fog', category: 'الطبيعة' },
  { ar: 'ندى', en: 'Dew', category: 'الطبيعة' },
  { ar: 'جليد', en: 'Ice', category: 'الطبيعة' },
  { ar: 'صقيع', en: 'Frost', category: 'الطبيعة' },
  { ar: 'زلزال', en: 'Earthquake', category: 'الطبيعة' },
  { ar: 'حمم', en: 'Lava', category: 'الطبيعة' },
  { ar: 'رماد', en: 'Ash', category: 'الطبيعة' },
  { ar: 'صقر', en: 'Falcon', category: 'الطبيعة' },
  { ar: 'نسر', en: 'Eagle', category: 'الطبيعة' },
  { ar: 'ذئب', en: 'Wolf', category: 'الطبيعة' },
  { ar: 'أسد', en: 'Lion', category: 'الطبيعة' },
  { ar: 'فهد', en: 'Leopard', category: 'الطبيعة' },
  { ar: 'غزال', en: 'Gazelle', category: 'الطبيعة' },
  { ar: 'حصان', en: 'Horse', category: 'الطبيعة' },
  { ar: 'جمل', en: 'Camel', category: 'الطبيعة' },
  { ar: 'حوت', en: 'Whale', category: 'الطبيعة' },
  { ar: 'دلفين', en: 'Dolphin', category: 'الطبيعة' },
  { ar: 'قرش', en: 'Shark', category: 'الطبيعة' },
  { ar: 'أخطبوط', en: 'Octopus', category: 'الطبيعة' },
  { ar: 'نخلة', en: 'Palm', category: 'الطبيعة' },
  { ar: 'زيتون', en: 'Olive', category: 'الطبيعة' },
  { ar: 'سنديان', en: 'Oak', category: 'الطبيعة' },
  { ar: 'صنوبر', en: 'Pine', category: 'الطبيعة' },
  { ar: 'جذور', en: 'Roots', category: 'الطبيعة' },
  { ar: 'سنبلة', en: 'Ear of Wheat', category: 'الطبيعة' },
  { ar: 'رحيق', en: 'Nectar', category: 'الطبيعة' },
  { ar: 'عنبر', en: 'Amber', category: 'الطبيعة' },
  { ar: 'مسك', en: 'Musk', category: 'الطبيعة' },
  { ar: 'شفق', en: 'Aurora', category: 'الطبيعة' },
  { ar: 'أفق', en: 'Horizon', category: 'الطبيعة' },
  { ar: 'مد وجزر', en: 'Tide', category: 'الطبيعة' },

  // 6. التفكير والمنطق (Thinking & Logic) - 55 words
  { ar: 'متاهة', en: 'Labyrinth', category: 'التفكير والمنطق' },
  { ar: 'لغز', en: 'Riddle', category: 'التفكير والمنطق' },
  { ar: 'ذاكرة', en: 'Memory', category: 'التفكير والمنطق' },
  { ar: 'مفترق', en: 'Crossroads', category: 'التفكير والمنطق' },
  { ar: 'دليل', en: 'Clue', category: 'التفكير والمنطق' },
  { ar: 'برهان', en: 'Proof', category: 'التفكير والمنطق' },
  { ar: 'فرضية', en: 'Hypothesis', category: 'التفكير والمنطق' },
  { ar: 'نظرية', en: 'Theory', category: 'التفكير والمنطق' },
  { ar: 'استنتاج', en: 'Deduction', category: 'التفكير والمنطق' },
  { ar: 'تحليل', en: 'Analysis', category: 'التفكير والمنطق' },
  { ar: 'احتمال', en: 'Probability', category: 'التفكير والمنطق' },
  { ar: 'معادلة', en: 'Equation', category: 'التفكير والمنطق' },
  { ar: 'مفارقة', en: 'Paradox', category: 'التفكير والمنطق' },
  { ar: 'استراتيجية', en: 'Strategy', category: 'التفكير والمنطق' },
  { ar: 'خطة', en: 'Plan', category: 'التفكير والمنطق' },
  { ar: 'بصيرة', en: 'Insight', category: 'التفكير والمنطق' },
  { ar: 'حدس', en: 'Intuition', category: 'التفكير والمنطق' },
  { ar: 'تركيز', en: 'Focus', category: 'التفكير والمنطق' },
  { ar: 'انتباه', en: 'Attention', category: 'التفكير والمنطق' },
  { ar: 'إدراك', en: 'Perception', category: 'التفكير والمنطق' },
  { ar: 'منطق', en: 'Logic', category: 'التفكير والمنطق' },
  { ar: 'حجة', en: 'Argument', category: 'التفكير والمنطق' },
  { ar: 'مناظرة', en: 'Debate', category: 'التفكير والمنطق' },
  { ar: 'حوار', en: 'Dialogue', category: 'التفكير والمنطق' },
  { ar: 'سؤال', en: 'Question', category: 'التفكير والمنطق' },
  { ar: 'جواب', en: 'Answer', category: 'التفكير والمنطق' },
  { ar: 'احتمالات', en: 'Odds', category: 'التفكير والمنطق' },
  { ar: 'بديل', en: 'Alternative', category: 'التفكير والمنطق' },
  { ar: 'خيار', en: 'Option', category: 'التفكير والمنطق' },
  { ar: 'قرار', en: 'Decision', category: 'التفكير والمنطق' },
  { ar: 'أولوية', en: 'Priority', category: 'التفكير والمنطق' },
  { ar: 'معيار', en: 'Standard', category: 'التفكير والمنطق' },
  { ar: 'مقياس', en: 'Measure', category: 'التفكير والمنطق' },
  { ar: 'نمط', en: 'Pattern', category: 'التفكير والمنطق' },
  { ar: 'تسلسل', en: 'Sequence', category: 'التفكير والمنطق' },
  { ar: 'تقاطع', en: 'Intersection', category: 'التفكير والمنطق' },
  { ar: 'توازي', en: 'Parallel', category: 'التفكير والمنطق' },
  { ar: 'زاوية', en: 'Angle', category: 'التفكير والمنطق' },
  { ar: 'محور', en: 'Axis', category: 'التفكير والمنطق' },
  { ar: 'مركز', en: 'Center', category: 'التفكير والمنطق' },
  { ar: 'محيط دائرة', en: 'Perimeter', category: 'التفكير والمنطق' },
  { ar: 'هرم', en: 'Pyramid', category: 'التفكير والمنطق' },
  { ar: 'مكعب', en: 'Cube', category: 'التفكير والمنطق' },
  { ar: 'مصفوفة', en: 'Matrix', category: 'التفكير والمنطق' },
  { ar: 'رمز', en: 'Symbol', category: 'التفكير والمنطق' },
  { ar: 'تلميح', en: 'Hint', category: 'التفكير والمنطق' },
  { ar: 'قرينة', en: 'Evidence', category: 'التفكير والمنطق' },
  { ar: 'شاهد', en: 'Witness', category: 'التفكير والمنطق' },
  { ar: 'قضية', en: 'Case', category: 'التفكير والمنطق' },
  { ar: 'حل', en: 'Solution', category: 'التفكير والمنطق' },
  { ar: 'فكرة', en: 'Idea', category: 'التفكير والمنطق' },
  { ar: 'ابتكار', en: 'Innovation', category: 'التفكير والمنطق' },
  { ar: 'عبقرية', en: 'Genius', category: 'التفكير والمنطق' },
  { ar: 'مقارنة', en: 'Comparison', category: 'التفكير والمنطق' },
  { ar: 'تصنيف', en: 'Classification', category: 'التفكير والمنطق' },

  // 7. المهن والمجتمع (Professions & Society) - 55 words
  { ar: 'قائد', en: 'Leader', category: 'المهن والمجتمع' },
  { ar: 'قاضي', en: 'Judge', category: 'المهن والمجتمع' },
  { ar: 'محامي', en: 'Lawyer', category: 'المهن والمجتمع' },
  { ar: 'طبيب', en: 'Doctor', category: 'المهن والمجتمع' },
  { ar: 'جراح', en: 'Surgeon', category: 'المهن والمجتمع' },
  { ar: 'مهندس', en: 'Engineer', category: 'المهن والمجتمع' },
  { ar: 'معماري', en: 'Architect', category: 'المهن والمجتمع' },
  { ar: 'طيار', en: 'Pilot', category: 'المهن والمجتمع' },
  { ar: 'قبطان', en: 'Captain', category: 'المهن والمجتمع' },
  { ar: 'بحار', en: 'Sailor', category: 'المهن والمجتمع' },
  { ar: 'رائد', en: 'Pioneer', category: 'المهن والمجتمع' },
  { ar: 'عالم', en: 'Scientist', category: 'المهن والمجتمع' },
  { ar: 'باحث', en: 'Researcher', category: 'المهن والمجتمع' },
  { ar: 'مؤرخ', en: 'Historian', category: 'المهن والمجتمع' },
  { ar: 'كاتب', en: 'Writer', category: 'المهن والمجتمع' },
  { ar: 'شاعر', en: 'Poet', category: 'المهن والمجتمع' },
  { ar: 'صحفي', en: 'Journalist', category: 'المهن والمجتمع' },
  { ar: 'مراسل', en: 'Reporter', category: 'المهن والمجتمع' },
  { ar: 'مترجم', en: 'Translator', category: 'المهن والمجتمع' },
  { ar: 'معلم', en: 'Teacher', category: 'المهن والمجتمع' },
  { ar: 'أستاذ', en: 'Professor', category: 'المهن والمجتمع' },
  { ar: 'طالب', en: 'Student', category: 'المهن والمجتمع' },
  { ar: 'تاجر', en: 'Merchant', category: 'المهن والمجتمع' },
  { ar: 'صائغ', en: 'Jeweler', category: 'المهن والمجتمع' },
  { ar: 'حداد', en: 'Blacksmith', category: 'المهن والمجتمع' },
  { ar: 'نجار', en: 'Carpenter', category: 'المهن والمجتمع' },
  { ar: 'نساج', en: 'Weaver', category: 'المهن والمجتمع' },
  { ar: 'خطاط', en: 'Calligrapher', category: 'المهن والمجتمع' },
  { ar: 'حارس', en: 'Guard', category: 'المهن والمجتمع' },
  { ar: 'محقق', en: 'Detective', category: 'المهن والمجتمع' },
  { ar: 'سفير', en: 'Ambassador', category: 'المهن والمجتمع' },
  { ar: 'وزير', en: 'Minister', category: 'المهن والمجتمع' },
  { ar: 'مجلس', en: 'Council', category: 'المهن والمجتمع' },
  { ar: 'برلمان', en: 'Parliament', category: 'المهن والمجتمع' },
  { ar: 'محكمة', en: 'Court', category: 'المهن والمجتمع' },
  { ar: 'جامعة', en: 'University', category: 'المهن والمجتمع' },
  { ar: 'مدرسة', en: 'School', category: 'المهن والمجتمع' },
  { ar: 'مكتبة', en: 'Library', category: 'المهن والمجتمع' },
  { ar: 'متحف', en: 'Museum', category: 'المهن والمجتمع' },
  { ar: 'مستشفى', en: 'Hospital', category: 'المهن والمجتمع' },
  { ar: 'مصنع', en: 'Factory', category: 'المهن والمجتمع' },
  { ar: 'سوق', en: 'Market', category: 'المهن والمجتمع' },
  { ar: 'بورصة', en: 'Exchange', category: 'المهن والمجتمع' },
  { ar: 'مصرف', en: 'Bank', category: 'المهن والمجتمع' },
  { ar: 'عملة', en: 'Currency', category: 'المهن والمجتمع' },
  { ar: 'رصيد', en: 'Balance', category: 'المهن والمجتمع' },
  { ar: 'استثمار', en: 'Investment', category: 'المهن والمجتمع' },
  { ar: 'تجارة', en: 'Trade', category: 'المهن والمجتمع' },
  { ar: 'جمارك', en: 'Customs', category: 'المهن والمجتمع' },
  { ar: 'بريد', en: 'Mail', category: 'المهن والمجتمع' },
  { ar: 'مؤتمر', en: 'Conference', category: 'المهن والمجتمع' },
  { ar: 'ندوة', en: 'Symposium', category: 'المهن والمجتمع' },
  { ar: 'جمهور', en: 'Audience', category: 'المهن والمجتمع' },
  { ar: 'فريق', en: 'Team', category: 'المهن والمجتمع' },
  { ar: 'نقابة', en: 'Guild', category: 'المهن والمجتمع' },

  // 8. الفضاء (Space) - 50 words
  { ar: 'مدار', en: 'Orbit', category: 'الفضاء' },
  { ar: 'مجرة', en: 'Galaxy', category: 'الفضاء' },
  { ar: 'نيزك', en: 'Meteor', category: 'الفضاء' },
  { ar: 'مرصد', en: 'Observatory', category: 'الفضاء' },
  { ar: 'كوكب', en: 'Planet', category: 'الفضاء' },
  { ar: 'نجم', en: 'Star', category: 'الفضاء' },
  { ar: 'شمس', en: 'Sun', category: 'الفضاء' },
  { ar: 'قمر', en: 'Moon', category: 'الفضاء' },
  { ar: 'هلال', en: 'Crescent', category: 'الفضاء' },
  { ar: 'بدر', en: 'Full Moon', category: 'الفضاء' },
  { ar: 'كسوف', en: 'Solar Eclipse', category: 'الفضاء' },
  { ar: 'خسوف', en: 'Lunar Eclipse', category: 'الفضاء' },
  { ar: 'مذنب', en: 'Comet', category: 'الفضاء' },
  { ar: 'شهاب', en: 'Shooting Star', category: 'الفضاء' },
  { ar: 'سديم', en: 'Nebula', category: 'الفضاء' },
  { ar: 'ثقب أسود', en: 'Black Hole', category: 'الفضاء' },
  { ar: 'كويكب', en: 'Asteroid', category: 'الفضاء' },
  { ar: 'مجموعة شمسية', en: 'Solar System', category: 'الفضاء' },
  { ar: 'درب التبانة', en: 'Milky Way', category: 'الفضاء' },
  { ar: 'زحل', en: 'Saturn', category: 'الفضاء' },
  { ar: 'المريخ', en: 'Mars', category: 'الفضاء' },
  { ar: 'المشتري', en: 'Jupiter', category: 'الفضاء' },
  { ar: 'عطارد', en: 'Mercury Planet', category: 'الفضاء' },
  { ar: 'الزهرة', en: 'Venus', category: 'الفضاء' },
  { ar: 'نبتون', en: 'Neptune', category: 'الفضاء' },
  { ar: 'أورانوس', en: 'Uranus', category: 'الفضاء' },
  { ar: 'سهيل', en: 'Canopus', category: 'الفضاء' },
  { ar: 'الثريا', en: 'Pleiades', category: 'الفضاء' },
  { ar: 'الجوزاء', en: 'Orion', category: 'الفضاء' },
  { ar: 'قطب شمالي', en: 'North Star', category: 'الفضاء' },
  { ar: 'تلسكوب', en: 'Telescope', category: 'الفضاء' },
  { ar: 'مسبار', en: 'Probe', category: 'الفضاء' },
  { ar: 'قمر صناعي', en: 'Satellite', category: 'الفضاء' },
  { ar: 'محطة فضاء', en: 'Space Station', category: 'الفضاء' },
  { ar: 'مكوك', en: 'Shuttle', category: 'الفضاء' },
  { ar: 'صاروخ', en: 'Rocket', category: 'الفضاء' },
  { ar: 'منصة إطلاق', en: 'Launchpad', category: 'الفضاء' },
  { ar: 'انعدام وزن', en: 'Zero Gravity', category: 'الفضاء' },
  { ar: 'غلاف جوي', en: 'Atmosphere', category: 'الفضاء' },
  { ar: 'فوهة', en: 'Crater', category: 'الفضاء' },
  { ar: 'سنة ضوئية', en: 'Light Year', category: 'الفضاء' },
  { ar: 'كون', en: 'Universe', category: 'الفضاء' },
  { ar: 'فضاء', en: 'Cosmos', category: 'الفضاء' },
  { ar: 'كوكبة', en: 'Constellation', category: 'الفضاء' },
  { ar: 'إشعاع', en: 'Radiation', category: 'الفضاء' },
  { ar: 'أوزون', en: 'Ozone', category: 'الفضاء' },
  { ar: 'موجات راديو', en: 'Radio Waves', category: 'الفضاء' },
  { ar: 'كبسولة', en: 'Capsule', category: 'الفضاء' },
  { ar: 'هبوط', en: 'Landing', category: 'الفضاء' },
  { ar: 'فلك', en: 'Astronomy', category: 'الفضاء' },

  // 9. الثقافة العربية (Arabic Culture & Heritage) - 55 words
  { ar: 'ديوان', en: 'Diwan', category: 'الثقافة العربية' },
  { ar: 'قصيدة', en: 'Poem', category: 'الثقافة العربية' },
  { ar: 'قافية', en: 'Rhyme', category: 'الثقافة العربية' },
  { ar: 'بلاغة', en: 'Eloquence', category: 'الثقافة العربية' },
  { ar: 'فصاحة', en: 'Fluency', category: 'الثقافة العربية' },
  { ar: 'معجم', en: 'Lexicon', category: 'الثقافة العربية' },
  { ar: 'نحو', en: 'Grammar', category: 'الثقافة العربية' },
  { ar: 'بيان', en: 'Rhetoric', category: 'الثقافة العربية' },
  { ar: 'أمثال', en: 'Proverbs', category: 'الثقافة العربية' },
  { ar: 'حكمة', en: 'Wisdom', category: 'الثقافة العربية' },
  { ar: 'سمر', en: 'Evening Talk', category: 'الثقافة العربية' },
  { ar: 'بادية', en: 'Desert Steppe', category: 'الثقافة العربية' },
  { ar: 'خيمة', en: 'Tent', category: 'الثقافة العربية' },
  { ar: 'وتد', en: 'Peg', category: 'الثقافة العربية' },
  { ar: 'صهيل', en: 'Neigh', category: 'الثقافة العربية' },
  { ar: 'مضارب', en: 'Encampment', category: 'الثقافة العربية' },
  { ar: 'ضيافة', en: 'Hospitality', category: 'الثقافة العربية' },
  { ar: 'قهوة', en: 'Coffee', category: 'الثقافة العربية' },
  { ar: 'دلة', en: 'Dallah', category: 'الثقافة العربية' },
  { ar: 'فنجان', en: 'Cup', category: 'الثقافة العربية' },
  { ar: 'تمر', en: 'Dates', category: 'الثقافة العربية' },
  { ar: 'زعفران', en: 'Saffron', category: 'الثقافة العربية' },
  { ar: 'هيل', en: 'Cardamom', category: 'الثقافة العربية' },
  { ar: 'عود', en: 'Agarwood', category: 'الثقافة العربية' },
  { ar: 'بخور', en: 'Incense', category: 'الثقافة العربية' },
  { ar: 'محراب', en: 'Mihrab', category: 'الثقافة العربية' },
  { ar: 'منبر', en: 'Pulpit', category: 'الثقافة العربية' },
  { ar: 'فسيفساء', en: 'Mosaic', category: 'الثقافة العربية' },
  { ar: 'زخرفة', en: 'Ornament', category: 'الثقافة العربية' },
  { ar: 'أرابيسك', en: 'Arabesque', category: 'الثقافة العربية' },
  { ar: 'مشربية', en: 'Mashrabiya', category: 'الثقافة العربية' },
  { ar: 'إيوان', en: 'Iwan', category: 'الثقافة العربية' },
  { ar: 'فناء', en: 'Courtyard', category: 'الثقافة العربية' },
  { ar: 'نافورة', en: 'Fountain', category: 'الثقافة العربية' },
  { ar: 'سبيل', en: 'Water Kiosk', category: 'الثقافة العربية' },
  { ar: 'وقـف', en: 'Endowment', category: 'الثقافة العربية' },
  { ar: 'كتّاب', en: 'Kuttab', category: 'الثقافة العربية' },
  { ar: 'حكاية', en: 'Tale', category: 'الثقافة العربية' },
  { ar: 'راوي', en: 'Narrator', category: 'الثقافة العربية' },
  { ar: 'مقامات', en: 'Maqamat', category: 'الثقافة العربية' },
  { ar: 'معلقات', en: 'Muallaqat', category: 'الثقافة العربية' },
  { ar: 'كرم', en: 'Generosity', category: 'الثقافة العربية' },
  { ar: 'مروءة', en: 'Chivalry', category: 'الثقافة العربية' },
  { ar: 'نخوة', en: 'Gallantry', category: 'الثقافة العربية' },
  { ar: 'وفاء', en: 'Loyalty', category: 'الثقافة العربية' },
  { ar: 'عهد', en: 'Covenant', category: 'الثقافة العربية' },
  { ar: 'شورى', en: 'Consultation', category: 'الثقافة العربية' },
  { ar: 'تراث', en: 'Heritage', category: 'الثقافة العربية' },
  { ar: 'أصالة', en: 'Authenticity', category: 'الثقافة العربية' },
  { ar: 'عمامة', en: 'Turban', category: 'الثقافة العربية' },
  { ar: 'عباءة', en: 'Cloak', category: 'الثقافة العربية' },
  { ar: 'سيف', en: 'Sword', category: 'الثقافة العربية' },
  { ar: 'غمد', en: 'Scabbard', category: 'الثقافة العربية' },
  { ar: 'درهم', en: 'Dirham', category: 'الثقافة العربية' },
  { ar: 'دينار', en: 'Dinar', category: 'الثقافة العربية' },

  // 10. المفاهيم المجردة (Abstract Concepts) - 55 words
  { ar: 'عدالة', en: 'Justice', category: 'المفاهيم المجردة' },
  { ar: 'حرية', en: 'Freedom', category: 'المفاهيم المجردة' },
  { ar: 'سلام', en: 'Peace', category: 'المفاهيم المجردة' },
  { ar: 'أمل', en: 'Hope', category: 'المفاهيم المجردة' },
  { ar: 'طموح', en: 'Ambition', category: 'المفاهيم المجردة' },
  { ar: 'إرادة', en: 'Willpower', category: 'المفاهيم المجردة' },
  { ar: 'عزيمة', en: 'Determination', category: 'المفاهيم المجردة' },
  { ar: 'شجاعة', en: 'Courage', category: 'المفاهيم المجردة' },
  { ar: 'صبر', en: 'Patience', category: 'المفاهيم المجردة' },
  { ar: 'ثقة', en: 'Trust', category: 'المفاهيم المجردة' },
  { ar: 'صدق', en: 'Truth', category: 'المفاهيم المجردة' },
  { ar: 'أمانة', en: 'Honesty', category: 'المفاهيم المجردة' },
  { ar: 'مسؤولية', en: 'Responsibility', category: 'المفاهيم المجردة' },
  { ar: 'واجب', en: 'Duty', category: 'المفاهيم المجردة' },
  { ar: 'حق', en: 'Right', category: 'المفاهيم المجردة' },
  { ar: 'كرامة', en: 'Dignity', category: 'المفاهيم المجردة' },
  { ar: 'شرف', en: 'Honor', category: 'المفاهيم المجردة' },
  { ar: 'مجد', en: 'Glory', category: 'المفاهيم المجردة' },
  { ar: 'نصر', en: 'Victory', category: 'المفاهيم المجردة' },
  { ar: 'تفوق', en: 'Excellence', category: 'المفاهيم المجردة' },
  { ar: 'نجاح', en: 'Success', category: 'المفاهيم المجردة' },
  { ar: 'خبرة', en: 'Experience', category: 'المفاهيم المجردة' },
  { ar: 'معرفة', en: 'Knowledge', category: 'المفاهيم المجردة' },
  { ar: 'وعي', en: 'Awareness', category: 'المفاهيم المجردة' },
  { ar: 'خيال', en: 'Imagination', category: 'المفاهيم المجردة' },
  { ar: 'حلم', en: 'Dream', category: 'المفاهيم المجردة' },
  { ar: 'رؤية', en: 'Vision', category: 'المفاهيم المجردة' },
  { ar: 'رسالة', en: 'Mission', category: 'المفاهيم المجردة' },
  { ar: 'هدف', en: 'Objective', category: 'المفاهيم المجردة' },
  { ar: 'غاية', en: 'Purpose', category: 'المفاهيم المجردة' },
  { ar: 'وسيلة', en: 'Means', category: 'المفاهيم المجردة' },
  { ar: 'فرصة', en: 'Opportunity', category: 'المفاهيم المجردة' },
  { ar: 'مخاطرة', en: 'Risk', category: 'المفاهيم المجردة' },
  { ar: 'مصير', en: 'Destiny', category: 'المفاهيم المجردة' },
  { ar: 'زمن', en: 'Time', category: 'المفاهيم المجردة' },
  { ar: 'لحظة', en: 'Moment', category: 'المفاهيم المجردة' },
  { ar: 'أبد', en: 'Eternity', category: 'المفاهيم المجردة' },
  { ar: 'ماضي', en: 'Past', category: 'المفاهيم المجردة' },
  { ar: 'حاضر', en: 'Present', category: 'المفاهيم المجردة' },
  { ar: 'مستقبل', en: 'Future', category: 'المفاهيم المجردة' },
  { ar: 'بداية', en: 'Beginning', category: 'المفاهيم المجردة' },
  { ar: 'نهاية', en: 'End', category: 'المفاهيم المجردة' },
  { ar: 'تحول', en: 'Transformation', category: 'المفاهيم المجردة' },
  { ar: 'تطور', en: 'Evolution', category: 'المفاهيم المجردة' },
  { ar: 'نهضة', en: 'Renaissance', category: 'المفاهيم المجردة' },
  { ar: 'وحدة', en: 'Unity', category: 'المفاهيم المجردة' },
  { ar: 'تعاون', en: 'Cooperation', category: 'المفاهيم المجردة' },
  { ar: 'تحالف', en: 'Alliance', category: 'المفاهيم المجردة' },
  { ar: 'سيادة', en: 'Sovereignty', category: 'المفاهيم المجردة' },
  { ar: 'هيبة', en: 'Prestige', category: 'المفاهيم المجردة' },
  { ar: 'تأثير', en: 'Influence', category: 'المفاهيم المجردة' },
  { ar: 'قوة', en: 'Strength', category: 'المفاهيم المجردة' },
  { ar: 'صمت', en: 'Silence', category: 'المفاهيم المجردة' },
  { ar: 'غموض', en: 'Mystery', category: 'المفاهيم المجردة' },
  { ar: 'سر', en: 'Secret', category: 'المفاهيم المجردة' },
];

/**
 * Deduplicates and validates a list of word entries using normalized Arabic comparison.
 */
export function buildValidatedWordBank(
  rawEntries: Array<{ ar: string; en?: string; category?: WordCategory }>
): {
  words: WordEntry[];
  duplicatesRemoved: string[];
  invalidRemoved: string[];
} {
  const seenNormalized = new Set<string>();
  const words: WordEntry[] = [];
  const duplicatesRemoved: string[] = [];
  const invalidRemoved: string[] = [];

  for (const item of rawEntries) {
    const cleanedAr = item.ar ? item.ar.trim().replace(/[\u0640]/g, '').replace(/\s+/g, ' ') : '';
    if (!cleanedAr || cleanedAr.length < 2) {
      invalidRemoved.push(item.ar || '');
      continue;
    }

    const norm = normalizeArabicWord(cleanedAr);
    if (seenNormalized.has(norm)) {
      duplicatesRemoved.push(cleanedAr);
      continue;
    }

    seenNormalized.add(norm);
    words.push({
      id: `w_${words.length + 1}_${norm.replace(/\s+/g, '_')}`,
      ar: cleanedAr,
      en: (item.en || '').trim(),
      category: item.category || 'المفاهيم المجردة',
    });
  }

  return { words, duplicatesRemoved, invalidRemoved };
}

const VALIDATED_BANK = buildValidatedWordBank(RAW_WORDS);

export const OFFICIAL_WORD_BANK: WordEntry[] = VALIDATED_BANK.words;

export const WORD_CATEGORIES: WordCategory[] = [
  'العلوم والتكنولوجيا',
  'الجغرافيا والتاريخ',
  'الأدوات والأشياء اليومية',
  'الرياضة',
  'الطبيعة',
  'التفكير والمنطق',
  'المهن والمجتمع',
  'الفضاء',
  'الثقافة العربية',
  'المفاهيم المجردة',
];

/**
 * Parses custom JSON or plain array of strings/objects imported by Referee.
 */
export function parseImportedWordsJson(jsonString: string): {
  entries: WordEntry[];
  duplicatesRemoved: string[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    const rawList: Array<{ ar: string; en?: string; category?: WordCategory }> = [];

    const sourceArray = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.words)
      ? parsed.words
      : null;

    if (!sourceArray) {
      return {
        entries: [],
        duplicatesRemoved: [],
        error: 'يجب أن يحتوي ملف JSON على مصفوفة كلمات أو خاصية "words".',
      };
    }

    for (const item of sourceArray) {
      if (typeof item === 'string') {
        rawList.push({ ar: item, en: '', category: 'المفاهيم المجردة' });
      } else if (item && typeof item === 'object' && typeof item.ar === 'string') {
        rawList.push({
          ar: item.ar,
          en: typeof item.en === 'string' ? item.en : '',
          category: WORD_CATEGORIES.includes(item.category) ? item.category : 'المفاهيم المجردة',
        });
      } else if (item && typeof item === 'object' && typeof item.word === 'string') {
        rawList.push({
          ar: item.word,
          en: typeof item.en === 'string' ? item.en : '',
          category: 'المفاهيم المجردة',
        });
      }
    }

    const result = buildValidatedWordBank(rawList);
    if (result.words.length === 0) {
      return {
        entries: [],
        duplicatesRemoved: result.duplicatesRemoved,
        error: 'لم يتم العثور على كلمات عربية صالحة في الملف.',
      };
    }

    return {
      entries: result.words,
      duplicatesRemoved: result.duplicatesRemoved,
    };
  } catch {
    return {
      entries: [],
      duplicatesRemoved: [],
      error: 'صيغة ملف JSON غير صالحة.',
    };
  }
}
