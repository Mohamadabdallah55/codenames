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
  | 'المفاهيم المجردة'
  | 'الغذاء والطب'
  | 'العمارة والفنون';

export type WordAgeGroup = 'junior' | 'youth' | 'adult' | 'all';
export type WordDifficulty = 'easy' | 'medium' | 'hard';
export type WordStatus = 'approved' | 'review' | 'disabled';

export type WordPackId =
  | 'elite_classic'
  | 'junior_kids'
  | 'family_masjid'
  | 'science_space'
  | 'history_heritage'
  | 'nature_creatures'
  | 'sports_action'
  | 'logic_abstract';

export interface WordPackMeta {
  id: WordPackId;
  nameAr: string;
  descriptionAr: string;
  recommendedAge: WordAgeGroup;
  difficulty: WordDifficulty;
  categories: WordCategory[];
  badgeColor: string;
}

export const WORD_PACKS_CATALOG: WordPackMeta[] = [
  {
    id: 'elite_classic',
    nameAr: 'حزمة صراع النخبة الرسمية',
    descriptionAr: 'مزيج متوازن من الكلمات العربية الفصيحة الغنية بالروابط الذهنية للمسابقات الرسمية.',
    recommendedAge: 'youth',
    difficulty: 'medium',
    categories: [
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
    ],
    badgeColor: '#F59E0B',
  },
  {
    id: 'junior_kids',
    nameAr: 'حزمة الأشبال والناشئين (Junior)',
    descriptionAr: 'كلمات يومية سهلة وملموسة للحيوانات والطبيعة والأدوات، مناسبة للأشبال (8–13 سنة).',
    recommendedAge: 'junior',
    difficulty: 'easy',
    categories: ['الطبيعة', 'الأدوات والأشياء اليومية', 'الرياضة', 'الغذاء والطب', 'الفضاء'],
    badgeColor: '#10B981',
  },
  {
    id: 'family_masjid',
    nameAr: 'حزمة الأسرة ومسجد ابن تيمية',
    descriptionAr: 'كلمات ثقافية وقيمية وحياتية واضحة تناسب جميع الأعمار في اللقاءات العائلية والمسجدية.',
    recommendedAge: 'all',
    difficulty: 'easy',
    categories: [
      'الثقافة العربية',
      'الأدوات والأشياء اليومية',
      'المهن والمجتمع',
      'الطبيعة',
      'الغذاء والطب',
      'العمارة والفنون',
    ],
    badgeColor: '#3B82F6',
  },
  {
    id: 'science_space',
    nameAr: 'حزمة العلوم والفضاء والتقنية',
    descriptionAr: 'مصطلحات علمية وفلكية وتقنية دقيقة لطلاب المرحلة الثانوية والجامعية.',
    recommendedAge: 'youth',
    difficulty: 'hard',
    categories: ['العلوم والتكنولوجيا', 'الفضاء', 'الغذاء والطب'],
    badgeColor: '#8B5CF6',
  },
  {
    id: 'history_heritage',
    nameAr: 'حزمة التاريخ والحضارة الإسلامية',
    descriptionAr: 'حواضر إسلامية، معالم تاريخية، تراث عربي أصيل، وعمارة مساجد.',
    recommendedAge: 'all',
    difficulty: 'medium',
    categories: ['الجغرافيا والتاريخ', 'الثقافة العربية', 'العمارة والفنون'],
    badgeColor: '#EC4899',
  },
  {
    id: 'nature_creatures',
    nameAr: 'حزمة الطبيعة والمخلوقات',
    descriptionAr: 'تضاريس، ظواهر جوية، طيور، كائنات بحرية، نباتات وأحجار كريمة.',
    recommendedAge: 'all',
    difficulty: 'easy',
    categories: ['الطبيعة', 'الجغرافيا والتاريخ', 'الغذاء والطب'],
    badgeColor: '#14B8A6',
  },
  {
    id: 'sports_action',
    nameAr: 'حزمة الرياضة والحركة والمنافسة',
    descriptionAr: 'ألعاب رياضية، فروسية، شطرنج، خطط، وتحديات جماعية.',
    recommendedAge: 'all',
    difficulty: 'easy',
    categories: ['الرياضة', 'المهن والمجتمع'],
    badgeColor: '#EF4444',
  },
  {
    id: 'logic_abstract',
    nameAr: 'حزمة التفكير والمنطق والمفاهيم',
    descriptionAr: 'مفاهيم ذهنية، استنتاج، قيم عليا، وتحديات فلسفية للمحترفين.',
    recommendedAge: 'adult',
    difficulty: 'hard',
    categories: ['التفكير والمنطق', 'المفاهيم المجردة'],
    badgeColor: '#F97316',
  },
];

export const ALL_WORD_CATEGORIES: WordCategory[] = [
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
  'الغذاء والطب',
  'العمارة والفنون',
];

export interface WordEntry {
  id: string;
  ar: string;
  en: string;
  category: WordCategory;
  subCategory?: string;
  ageGroup?: WordAgeGroup;
  difficulty?: WordDifficulty;
  language?: 'ar' | 'ar_en';
  status?: WordStatus;
  packIds?: WordPackId[];
  semanticCluster?: string;
  relatedWords?: string[];
  iconType?: 'star' | 'nature' | 'tool' | 'sport' | 'science' | 'history' | 'culture' | 'mind' | 'food' | 'arch';
}

export interface WordFilterCriteria {
  packIds?: WordPackId[];
  categories?: WordCategory[];
  ageGroup?: WordAgeGroup | 'any';
  difficulty?: WordDifficulty | 'any';
  onlyApproved?: boolean;
  searchQuery?: string;
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

interface RawSeedCluster {
  category: WordCategory;
  subCategory: string;
  semanticCluster: string;
  ageGroup: WordAgeGroup;
  difficulty: WordDifficulty;
  packIds: WordPackId[];
  iconType: NonNullable<WordEntry['iconType']>;
  items: Array<[string, string]>;
}

const CURATED_CLUSTERS: RawSeedCluster[] = [
  // 1. العلوم والتكنولوجيا — فيزياء وبصريات
  {
    category: 'العلوم والتكنولوجيا',
    subCategory: 'الفيزياء والبصريات',
    semanticCluster: 'physics_waves',
    ageGroup: 'youth',
    difficulty: 'medium',
    packIds: ['elite_classic', 'science_space'],
    iconType: 'science',
    items: [
      ['شيفرة', 'Cipher'], ['تردد', 'Frequency'], ['طاقة', 'Energy'], ['عدسة', 'Lens'],
      ['طيف', 'Spectrum'], ['موجة', 'Wave'], ['جاذبية', 'Gravity'], ['إشارة', 'Signal'],
      ['مغناطيس', 'Magnet'], ['ذرّة', 'Atom'], ['نواة', 'Nucleus'], ['ليزر', 'Laser'],
      ['بلورة', 'Crystal'], ['تيار', 'Current'], ['ضغط', 'Pressure'], ['كثافة', 'Density'],
      ['انصهار', 'Fusion'], ['تبخر', 'Evaporation'], ['صدى', 'Echo'], ['بندول', 'Pendulum'],
      ['شعاع', 'Beam'], ['انكسار', 'Refraction'], ['توازن', 'Equilibrium'], ['منشور', 'Prism'],
      ['احتكاك', 'Friction'], ['سرعة', 'Velocity'], ['تسارع', 'Acceleration'], ['كتلة', 'Mass'],
      ['حرارة', 'Heat'], ['كهرباء', 'Electricity'], ['شحنة', 'Charge'], ['ملف', 'Coil'],
    ],
  },
  // 2. العلوم والتكنولوجيا — الحاسوب والهندسة
  {
    category: 'العلوم والتكنولوجيا',
    subCategory: 'الحاسوب والهندسة',
    semanticCluster: 'computing_machines',
    ageGroup: 'youth',
    difficulty: 'medium',
    packIds: ['elite_classic', 'science_space'],
    iconType: 'science',
    items: [
      ['شبكة', 'Network'], ['خوارزمية', 'Algorithm'], ['معالج', 'Processor'], ['روبوت', 'Robot'],
      ['بطارية', 'Battery'], ['محرك', 'Engine'], ['رادار', 'Radar'], ['ألياف', 'Fiber'],
      ['شريحة', 'Microchip'], ['توربين', 'Turbine'], ['مكبس', 'Piston'], ['بوصلة', 'Compass'],
      ['حساس', 'Sensor'], ['برمجة', 'Programming'], ['خادم', 'Server'], ['بيانات', 'Data'],
      ['تشفير', 'Encryption'], ['مفاعل', 'Reactor'], ['مولد', 'Generator'], ['صمام', 'Valve'],
      ['ترس', 'Gear'], ['رافعة', 'Crane'], ['مكثف', 'Capacitor'], ['ترانزستور', 'Transistor'],
      ['ذاكرة عشوائية', 'RAM'], ['قرص', 'Disk'], ['بروتوكول', 'Protocol'], ['جدار ناري', 'Firewall'],
      ['مستشعر', 'Detector'], ['أسلاك', 'Wires'], ['كابل', 'Cable'], ['تطبيق', 'Application'],
    ],
  },
  // 3. العلوم والتكنولوجيا — الكيمياء والمختبر
  {
    category: 'العلوم والتكنولوجيا',
    subCategory: 'الكيمياء والعناصر',
    semanticCluster: 'chemistry_elements',
    ageGroup: 'youth',
    difficulty: 'medium',
    packIds: ['elite_classic', 'science_space'],
    iconType: 'science',
    items: [
      ['مختبر', 'Laboratory'], ['تفاعل', 'Reaction'], ['معدن', 'Metal'], ['مجهر', 'Microscope'],
      ['أكسجين', 'Oxygen'], ['كربون', 'Carbon'], ['زئبق', 'Mercury'], ['تيتانيوم', 'Titanium'],
      ['طيفور', 'Spectrometer'], ['ذهب', 'Gold'], ['فضة', 'Silver'], ['نحاس', 'Copper'],
      ['حديد', 'Iron'], ['فولاذ', 'Steel'], ['نيتروجين', 'Nitrogen'], ['هيدروجين', 'Hydrogen'],
      ['هيليوم', 'Helium'], ['كبريت', 'Sulfur'], ['فوسفور', 'Phosphorus'], ['ألومنيوم', 'Aluminum'],
      ['بلاتين', 'Platinum'], ['يورانيوم', 'Uranium'], ['محلول', 'Solution'], ['حمض', 'Acid'],
      ['قطر', 'Distillate'], ['أنبوب', 'Tube'], ['قارورة', 'Flask'], ['سبيكة', 'Alloy'],
    ],
  },
  // 4. الجغرافيا والتاريخ — التضاريس والبحار
  {
    category: 'الجغرافيا والتاريخ',
    subCategory: 'المعالم الجغرافية',
    semanticCluster: 'geography_landforms',
    ageGroup: 'all',
    difficulty: 'easy',
    packIds: ['elite_classic', 'family_masjid', 'nature_creatures', 'junior_kids'],
    iconType: 'history',
    items: [
      ['أطلس', 'Atlas'], ['ميناء', 'Port'], ['منارة', 'Lighthouse'], ['خريطة', 'Map'],
      ['قارة', 'Continent'], ['مضيق', 'Strait'], ['أرخبيل', 'Archipelago'], ['شبه جزيرة', 'Peninsula'],
      ['واحة', 'Oasis'], ['خليج', 'Gulf'], ['محيط', 'Ocean'], ['نهر', 'River'],
      ['دلتا', 'Delta'], ['هضبة', 'Plateau'], ['وادي', 'Valley'], ['سافانا', 'Savanna'],
      ['قطب', 'Pole'], ['استواء', 'Equator'], ['حدود', 'Border'], ['عاصمة', 'Capital'],
      ['مرسى', 'Harbor'], ['معبر', 'Crossing'], ['جزيرة', 'Island'], ['شاطئ', 'Beach'],
      ['ساحل', 'Coast'], ['بحيرة', 'Lake'], ['مضيق بحري', 'Channel'], ['تلال', 'Hills'],
      ['سهل', 'Plain'], ['مرتفعات', 'Highlands'], ['ربوة', 'Mound'], ['جدول', 'Stream'],
    ],
  },
  // 5. الجغرافيا والتاريخ — الحضارة والتاريخ الإسلامي
  {
    category: 'الجغرافيا والتاريخ',
    subCategory: 'الحضارة والمدن التاريخية',
    semanticCluster: 'islamic_history_cities',
    ageGroup: 'all',
    difficulty: 'medium',
    packIds: ['elite_classic', 'history_heritage', 'family_masjid'],
    iconType: 'history',
    items: [
      ['حصار', 'Siege'], ['أسطورة', 'Legend'], ['أرشيف', 'Archive'], ['ميثاق', 'Charter'],
      ['قلعة', 'Fortress'], ['إمبراطورية', 'Empire'], ['حضارة', 'Civilization'], ['آثار', 'Ruins'],
      ['معاهدة', 'Treaty'], ['ثورة', 'Revolution'], ['سلالة', 'Dynasty'], ['قافلة', 'Caravan'],
      ['طريق الحرير', 'Silk Road'], ['الأندلس', 'Andalusia'], ['القدس', 'Jerusalem'], ['بغداد', 'Baghdad'],
      ['دمشق', 'Damascus'], ['قرطاج', 'Carthage'], ['بتراء', 'Petra'], ['أهرامات', 'Pyramids'],
      ['سور', 'Wall'], ['خندق', 'Trench'], ['أسطول', 'Fleet'], ['منجنيق', 'Catapult'],
      ['درع', 'Shield'], ['تاج', 'Crown'], ['عرش', 'Throne'], ['مخطوطة', 'Manuscript'],
      ['كتيبة', 'Battalion'], ['هدنة', 'Truce'], ['فتح', 'Conquest'], ['رحالة', 'Explorer'],
      ['مستعمرة', 'Colony'], ['مكة', 'Mecca'], ['المدينة', 'Medina'], ['قرطبة', 'Cordoba'],
      ['غرناطة', 'Granada'], ['القاهرة', 'Cairo'], ['القيروان', 'Kairouan'], ['سمرقند', 'Samarkand'],
      ['بخارى', 'Bukhara'], ['إسطنبول', 'Istanbul'], ['حطين', 'Hattin'], ['اليرموك', 'Yarmouk'],
      ['القادسية', 'Qadisiyyah'], ['عين جالوت', 'Ain Jalut'], ['رباط', 'Garrison'], ['برج', 'Tower'],
    ],
  },
  // 6. الأدوات والأشياء اليومية — البيت والمقتنيات (ممتازة للأشبال والعائلة)
  {
    category: 'الأدوات والأشياء اليومية',
    subCategory: 'مقتنيات المنزل والحياة',
    semanticCluster: 'everyday_household',
    ageGroup: 'junior',
    difficulty: 'easy',
    packIds: ['elite_classic', 'junior_kids', 'family_masjid'],
    iconType: 'tool',
    items: [
      ['مرآة', 'Mirror'], ['قناع', 'Mask'], ['خزنة', 'Safe'], ['مفتاح', 'Key'],
      ['قفل', 'Lock'], ['ساعة', 'Clock'], ['مصباح', 'Lamp'], ['شمعة', 'Candle'],
      ['حقيبة', 'Bag'], ['مظلة', 'Umbrella'], ['سلم', 'Ladder'], ['حبل', 'Rope'],
      ['إبرة', 'Needle'], ['خيط', 'Thread'], ['مقص', 'Scissors'], ['ريشة', 'Feather'],
      ['محبرة', 'Inkwell'], ['دفتر', 'Notebook'], ['ختم', 'Seal'], ['ظرف', 'Envelope'],
      ['طابع', 'Stamp'], ['جرس', 'Bell'], ['صفارة', 'Whistle'], ['منظار', 'Binoculars'],
      ['كاميرا', 'Camera'], ['شاشة', 'Screen'], ['لوحة مفاتيح', 'Keyboard'], ['سماعة', 'Headphones'],
      ['ميكروفون', 'Microphone'], ['كأس', 'Trophy'], ['وسادة', 'Pillow'], ['ستارة', 'Curtain'],
      ['سجادة', 'Carpet'], ['فانوس', 'Lantern'], ['ميزان', 'Scale'], ['صندوق', 'Box'],
      ['سلسلة', 'Chain'], ['نافذة', 'Window'], ['بوابة', 'Gate'], ['قلم', 'Pen'],
      ['كتاب', 'Book'], ['نظارة', 'Glasses'], ['خاتم', 'Ring'], ['قلادة', 'Necklace'],
      ['إبريق', 'Pitcher'], ['كوب', 'Mug'], ['طبق', 'Plate'], ['ملعقة', 'Spoon'],
    ],
  },
  // 7. الأدوات والأشياء اليومية — المواصلات والورش
  {
    category: 'الأدوات والأشياء اليومية',
    subCategory: 'المركبات والعدد',
    semanticCluster: 'vehicles_tools',
    ageGroup: 'all',
    difficulty: 'easy',
    packIds: ['elite_classic', 'junior_kids', 'family_masjid'],
    iconType: 'tool',
    items: [
      ['طائرة', 'Airplane'], ['جسر', 'Bridge'], ['نفق', 'Tunnel'], ['سفينة', 'Ship'],
      ['مرساة', 'Anchor'], ['عجلة', 'Wheel'], ['قطار', 'Train'], ['غواصة', 'Submarine'],
      ['مروحية', 'Helicopter'], ['شراع', 'Sail'], ['مطرقة', 'Hammer'], ['سندان', 'Anvil'],
      ['منشار', 'Saw'], ['عمود', 'Pillar'], ['قبة', 'Dome'], ['مئذنة', 'Minaret'],
      ['سيارة', 'Car'], ['دراجة', 'Bicycle'], ['قارب', 'Boat'], ['زورق', 'Canoe'],
      ['منطاد', 'Balloon'], ['عربة', 'Cart'], ['شاحنة', 'Truck'], ['حافلة', 'Bus'],
      ['مفك', 'Screwdriver'], ['كماشة', 'Pliers'], ['فأس', 'Axe'], ['مجرفة', 'Shovel'],
      ['مسطرة', 'Ruler'], ['فرجار', 'Dividers'], ['إزميل', 'Chisel'], ['قفل رقمي', 'Padlock'],
    ],
  },
  // 8. الرياضة — المنافسات والألعاب
  {
    category: 'الرياضة',
    subCategory: 'الألعاب الرياضية والبطولات',
    semanticCluster: 'sports_competition',
    ageGroup: 'all',
    difficulty: 'easy',
    packIds: ['elite_classic', 'sports_action', 'junior_kids', 'family_masjid'],
    iconType: 'sport',
    items: [
      ['ملعب', 'Stadium'], ['شوط', 'Half'], ['مرمى', 'Goal'], ['ركلة', 'Kick'],
      ['تسلل', 'Offside'], ['مدرب', 'Coach'], ['حكم', 'Referee'], ['بطولة', 'Tournament'],
      ['ميدالية', 'Medal'], ['سباق', 'Race'], ['ماراثون', 'Marathon'], ['عدّاء', 'Sprinter'],
      ['حلبة', 'Arena'], ['مبارزة', 'Fencing'], ['رماية', 'Archery'], ['سهم', 'Arrow'],
      ['قوس', 'Bow'], ['فروسية', 'Equestrian'], ['مضمار', 'Track'], ['حاجز', 'Hurdle'],
      ['وثب', 'Jump'], ['سباحة', 'Swimming'], ['غوص', 'Diving'], ['تجديف', 'Rowing'],
      ['مجداف', 'Oar'], ['تسلق', 'Climbing'], ['تزلج', 'Skiing'], ['مضرب', 'Racket'],
      ['طاولة', 'Table'], ['شطرنج', 'Chess'], ['كش ملك', 'Checkmate'], ['بيدق', 'Pawn'],
      ['وزن', 'Weight'], ['لياقة', 'Fitness'], ['تمريرة', 'Pass'], ['مراوغة', 'Dribble'],
      ['تتويج', 'Coronation'], ['نهائي', 'Final'], ['تحدي', 'Challenge'], ['خصم', 'Opponent'],
      ['تعادل', 'Draw'], ['شباك', 'Net'], ['مدرج', 'Grandstand'], ['شعلة', 'Torch'],
      ['أولمبياد', 'Olympics'], ['جولة', 'Round'], ['نقطة', 'Point'], ['دفاع', 'Defense'],
      ['هجوم', 'Attack'], ['تكتيك', 'Tactic'], ['كرة', 'Ball'], ['بطل', 'Champion'],
      ['درع البطولة', 'Trophy Shield'], ['ركلة جزاء', 'Penalty'], ['حارس مرمى', 'Goalkeeper'], ['تتابع', 'Relay'],
      ['رمح', 'Javelin'], ['قرص رياضي', 'Discus'], ['مصارعة', 'Wrestling'], ['كاراتيه', 'Karate'],
    ],
  },
  // 9. الطبيعة — الحيوانات والطيور والبحار (ممتازة للأشبال والعائلة)
  {
    category: 'الطبيعة',
    subCategory: 'الحيوانات والطيور',
    semanticCluster: 'animals_wildlife',
    ageGroup: 'junior',
    difficulty: 'easy',
    packIds: ['elite_classic', 'junior_kids', 'nature_creatures', 'family_masjid'],
    iconType: 'nature',
    items: [
      ['صقر', 'Falcon'], ['نسر', 'Eagle'], ['ذئب', 'Wolf'], ['أسد', 'Lion'],
      ['فهد', 'Leopard'], ['غزال', 'Gazelle'], ['حصان', 'Horse'], ['جمل', 'Camel'],
      ['حوت', 'Whale'], ['دلفين', 'Dolphin'], ['قرش', 'Shark'], ['أخطبوط', 'Octopus'],
      ['نمر', 'Tiger'], ['فيل', 'Elephant'], ['زرافة', 'Giraffe'], ['دب', 'Bear'],
      ['ثعلب', 'Fox'], ['أرنب', 'Rabbit'], ['سنجاب', 'Squirrel'], ['قنفذ', 'Hedgehog'],
      ['سلحفاة', 'Turtle'], ['تمساح', 'Crocodile'], ['طاووس', 'Peacock'], ['حمامة', 'Dove'],
      ['ببغاء', 'Parrot'], ['بومة', 'Owl'], ['نورس', 'Seagull'], ['سنونو', 'Swallow'],
      ['نحلة', 'Bee'], ['فراشة', 'Butterfly'], ['نملة', 'Ant'], ['فرس النهر', 'Hippo'],
      ['بطريق', 'Penguin'], ['نعامة', 'Ostrich'], ['كركدن', 'Rhino'], ['أيل', 'Deer'],
      ['قندس', 'Beaver'], ['كنغر', 'Kangaroo'], ['مرجان بحري', 'Sea Coral'], ['نجم البحر', 'Starfish'],
    ],
  },
  // 10. الطبيعة — النباتات والظواهر والأحجار الكريمة
  {
    category: 'الطبيعة',
    subCategory: 'الظواهر الطبيعية والنباتات',
    semanticCluster: 'nature_phenomena_gems',
    ageGroup: 'all',
    difficulty: 'easy',
    packIds: ['elite_classic', 'nature_creatures', 'family_masjid', 'junior_kids'],
    iconType: 'nature',
    items: [
      ['سراب', 'Mirage'], ['بركان', 'Volcano'], ['منجم', 'Mine'], ['زمرد', 'Emerald'],
      ['ظلال', 'Shadows'], ['غابة', 'Forest'], ['صحراء', 'Desert'], ['كثبان', 'Dunes'],
      ['شلال', 'Waterfall'], ['ينبوع', 'Spring'], ['كهف', 'Cave'], ['جبل', 'Mountain'],
      ['قمة', 'Summit'], ['سفح', 'Slope'], ['هاوية', 'Abyss'], ['مرجان', 'Coral'],
      ['لؤلؤ', 'Pearl'], ['صدفة', 'Shell'], ['ياقوت', 'Ruby'], ['ألماس', 'Diamond'],
      ['عاصفة', 'Storm'], ['إعصار', 'Hurricane'], ['برق', 'Lightning'], ['رعد', 'Thunder'],
      ['ضباب', 'Fog'], ['ندى', 'Dew'], ['جليد', 'Ice'], ['صقيع', 'Frost'],
      ['زلزال', 'Earthquake'], ['حمم', 'Lava'], ['رماد', 'Ash'], ['نخلة', 'Palm'],
      ['زيتون', 'Olive'], ['سنديان', 'Oak'], ['صنوبر', 'Pine'], ['جذور', 'Roots'],
      ['سنبلة', 'Ear of Wheat'], ['رحيق', 'Nectar'], ['عنبر', 'Amber'], ['مسك', 'Musk'],
      ['شفق', 'Aurora'], ['أفق', 'Horizon'], ['مد وجزر', 'Tide'], ['مطر', 'Rain'],
      ['ثلج', 'Snow'], ['قوس قزح', 'Rainbow'], ['نسيم', 'Breeze'], ['رياح', 'Wind'],
      ['سحاب', 'Cloud'], ['غصن', 'Branch'], ['ورقة شجر', 'Leaf'], ['زهرة', 'Flower'],
      ['ياسمين', 'Jasmine'], ['ريحان', 'Basil'], ['أرز', 'Cedar'], ['فيروز', 'Turquoise'],
      ['عقيق', 'Agate'], ['مرمر', 'Alabaster'], ['رخام', 'Marble'], ['جرانيت', 'Granite'],
    ],
  },
  // 11. التفكير والمنطق
  {
    category: 'التفكير والمنطق',
    subCategory: 'الاستنتاج والرياضيات',
    semanticCluster: 'logic_reasoning',
    ageGroup: 'youth',
    difficulty: 'hard',
    packIds: ['elite_classic', 'logic_abstract'],
    iconType: 'mind',
    items: [
      ['متاهة', 'Labyrinth'], ['لغز', 'Riddle'], ['ذاكرة', 'Memory'], ['مفترق', 'Crossroads'],
      ['دليل', 'Clue'], ['برهان', 'Proof'], ['فرضية', 'Hypothesis'], ['نظرية', 'Theory'],
      ['استنتاج', 'Deduction'], ['تحليل', 'Analysis'], ['احتمال', 'Probability'], ['معادلة', 'Equation'],
      ['مفارقة', 'Paradox'], ['استراتيجية', 'Strategy'], ['خطة', 'Plan'], ['بصيرة', 'Insight'],
      ['حدس', 'Intuition'], ['تركيز', 'Focus'], ['انتباه', 'Attention'], ['إدراك', 'Perception'],
      ['منطق', 'Logic'], ['حجة', 'Argument'], ['مناظرة', 'Debate'], ['حوار', 'Dialogue'],
      ['سؤال', 'Question'], ['جواب', 'Answer'], ['احتمالات', 'Odds'], ['بديل', 'Alternative'],
      ['خيار', 'Option'], ['قرار', 'Decision'], ['أولوية', 'Priority'], ['معيار', 'Standard'],
      ['مقياس', 'Measure'], ['نمط', 'Pattern'], ['تسلسل', 'Sequence'], ['تقاطع', 'Intersection'],
      ['توازي', 'Parallel'], ['زاوية', 'Angle'], ['محور', 'Axis'], ['مركز', 'Center'],
      ['محيط دائرة', 'Perimeter'], ['هرم', 'Pyramid'], ['مكعب', 'Cube'], ['مصفوفة', 'Matrix'],
      ['رمز', 'Symbol'], ['تلميح', 'Hint'], ['قرينة', 'Evidence'], ['شاهد', 'Witness'],
      ['قضية', 'Case'], ['حل', 'Solution'], ['فكرة', 'Idea'], ['ابتكار', 'Innovation'],
      ['عبقرية', 'Genius'], ['مقارنة', 'Comparison'], ['تصنيف', 'Classification'], ['استقراء', 'Induction'],
      ['قياس', 'Syllogism'], ['معضلة', 'Dilemma'], ['إحداثيات', 'Coordinates'], ['متغير', 'Variable'],
      ['ثابت', 'Constant'], ['دالة', 'Function'], ['نسبة', 'Ratio'], ['تماثل', 'Symmetry'],
    ],
  },
  // 12. المهن والمجتمع
  {
    category: 'المهن والمجتمع',
    subCategory: 'الوظائف والمؤسسات',
    semanticCluster: 'professions_institutions',
    ageGroup: 'all',
    difficulty: 'easy',
    packIds: ['elite_classic', 'family_masjid', 'sports_action'],
    iconType: 'culture',
    items: [
      ['قائد', 'Leader'], ['قاضي', 'Judge'], ['محامي', 'Lawyer'], ['طبيب', 'Doctor'],
      ['جراح', 'Surgeon'], ['مهندس', 'Engineer'], ['معماري', 'Architect'], ['طيار', 'Pilot'],
      ['قبطان', 'Captain'], ['بحار', 'Sailor'], ['رائد', 'Pioneer'], ['عالم', 'Scientist'],
      ['باحث', 'Researcher'], ['مؤرخ', 'Historian'], ['كاتب', 'Writer'], ['شاعر', 'Poet'],
      ['صحفي', 'Journalist'], ['مراسل', 'Reporter'], ['مترجم', 'Translator'], ['معلم', 'Teacher'],
      ['أستاذ', 'Professor'], ['طالب', 'Student'], ['تاجر', 'Merchant'], ['صائغ', 'Jeweler'],
      ['حداد', 'Blacksmith'], ['نجار', 'Carpenter'], ['نساج', 'Weaver'], ['خطاط', 'Calligrapher'],
      ['حارس', 'Guard'], ['محقق', 'Detective'], ['سفير', 'Ambassador'], ['وزير', 'Minister'],
      ['مجلس', 'Council'], ['برلمان', 'Parliament'], ['محكمة', 'Court'], ['جامعة', 'University'],
      ['مدرسة', 'School'], ['مكتبة', 'Library'], ['متحف', 'Museum'], ['مستشفى', 'Hospital'],
      ['مصنع', 'Factory'], ['سوق', 'Market'], ['بورصة', 'Exchange'], ['مصرف', 'Bank'],
      ['عملة', 'Currency'], ['رصيد', 'Balance'], ['استثمار', 'Investment'], ['تجارة', 'Trade'],
      ['جمارك', 'Customs'], ['بريد', 'Mail'], ['مؤتمر', 'Conference'], ['ندوة', 'Symposium'],
      ['جمهور', 'Audience'], ['فريق', 'Team'], ['نقابة', 'Guild'], ['صيدلي', 'Pharmacist'],
      ['مزارع', 'Farmer'], ['خباز', 'Baker'], ['إطفائي', 'Firefighter'], ['مسعف', 'Paramedic'],
      ['مراقب', 'Inspector'], ['مستشار', 'Advisor'], ['أمين مكتبة', 'Librarian'], ['جمعية', 'Association'],
    ],
  },
  // 13. الفضاء والفلك
  {
    category: 'الفضاء',
    subCategory: 'الأجرام والرحلات الفضائية',
    semanticCluster: 'astronomy_space',
    ageGroup: 'all',
    difficulty: 'medium',
    packIds: ['elite_classic', 'science_space', 'junior_kids'],
    iconType: 'star',
    items: [
      ['مدار', 'Orbit'], ['مجرة', 'Galaxy'], ['نيزك', 'Meteor'], ['مرصد', 'Observatory'],
      ['كوكب', 'Planet'], ['نجم', 'Star'], ['شمس', 'Sun'], ['قمر', 'Moon'],
      ['هلال', 'Crescent'], ['بدر', 'Full Moon'], ['كسوف', 'Solar Eclipse'], ['خسوف', 'Lunar Eclipse'],
      ['مذنب', 'Comet'], ['شهاب', 'Shooting Star'], ['سديم', 'Nebula'], ['ثقب أسود', 'Black Hole'],
      ['كويكب', 'Asteroid'], ['مجموعة شمسية', 'Solar System'], ['درب التبانة', 'Milky Way'], ['زحل', 'Saturn'],
      ['المريخ', 'Mars'], ['المشتري', 'Jupiter'], ['عطارد', 'Mercury Planet'], ['الزهرة', 'Venus'],
      ['نبتون', 'Neptune'], ['أورانوس', 'Uranus'], ['سهيل', 'Canopus'], ['الثريا', 'Pleiades'],
      ['الجوزاء', 'Orion'], ['قطب شمالي', 'North Star'], ['تلسكوب', 'Telescope'], ['مسبار', 'Probe'],
      ['قمر صناعي', 'Satellite'], ['محطة فضاء', 'Space Station'], ['مكوك', 'Shuttle'], ['صاروخ', 'Rocket'],
      ['منصة إطلاق', 'Launchpad'], ['انعدام وزن', 'Zero Gravity'], ['غلاف جوي', 'Atmosphere'], ['فوهة', 'Crater'],
      ['سنة ضوئية', 'Light Year'], ['كون', 'Universe'], ['فضاء', 'Cosmos'], ['كوكبة', 'Constellation'],
      ['إشعاع', 'Radiation'], ['أوزون', 'Ozone'], ['موجات راديو', 'Radio Waves'], ['كبسولة', 'Capsule'],
      ['هبوط', 'Landing'], ['فلك', 'Astronomy'], ['مجس فضائي', 'Space Rover'], ['القطب الجنوبي', 'South Pole'],
      ['بدلة فضاء', 'Spacesuit'], ['أبولو', 'Apollo'], ['شفق قطبي', 'Polar Aurora'], ['تاج شمسي', 'Corona'],
    ],
  },
  // 14. الثقافة العربية والإسلامية
  {
    category: 'الثقافة العربية',
    subCategory: 'الأدب والتراث الإسلامي',
    semanticCluster: 'arabic_islamic_heritage',
    ageGroup: 'all',
    difficulty: 'medium',
    packIds: ['elite_classic', 'family_masjid', 'history_heritage'],
    iconType: 'culture',
    items: [
      ['ديوان', 'Diwan'], ['قصيدة', 'Poem'], ['قافية', 'Rhyme'], ['بلاغة', 'Eloquence'],
      ['فصاحة', 'Fluency'], ['معجم', 'Lexicon'], ['نحو', 'Grammar'], ['بيان', 'Rhetoric'],
      ['أمثال', 'Proverbs'], ['حكمة', 'Wisdom'], ['سمر', 'Evening Talk'], ['بادية', 'Desert Steppe'],
      ['خيمة', 'Tent'], ['وتد', 'Peg'], ['صهيل', 'Neigh'], ['مضارب', 'Encampment'],
      ['ضيافة', 'Hospitality'], ['قهوة', 'Coffee'], ['دلة', 'Dallah'], ['فنجان', 'Cup'],
      ['تمر', 'Dates'], ['زعفران', 'Saffron'], ['هيل', 'Cardamom'], ['عود', 'Agarwood'],
      ['بخور', 'Incense'], ['محراب', 'Mihrab'], ['منبر', 'Pulpit'], ['فسيفساء', 'Mosaic'],
      ['زخرفة', 'Ornament'], ['أرابيسك', 'Arabesque'], ['مشربية', 'Mashrabiya'], ['إيوان', 'Iwan'],
      ['فناء', 'Courtyard'], ['نافورة', 'Fountain'], ['سبيل', 'Water Kiosk'], ['وقف', 'Endowment'],
      ['كتّاب', 'Kuttab'], ['حكاية', 'Tale'], ['راوي', 'Narrator'], ['مقامات', 'Maqamat'],
      ['معلقات', 'Muallaqat'], ['كرم', 'Generosity'], ['مروءة', 'Chivalry'], ['نخوة', 'Gallantry'],
      ['وفاء', 'Loyalty'], ['عهد', 'Covenant'], ['شورى', 'Consultation'], ['تراث', 'Heritage'],
      ['أصالة', 'Authenticity'], ['عمامة', 'Turban'], ['عباءة', 'Cloak'], ['سيف', 'Sword'],
      ['غمد', 'Scabbard'], ['درهم', 'Dirham'], ['دينار', 'Dinar'], ['مسواك', 'Miswak'],
      ['مصحف', 'Mushaf'], ['خط كوفي', 'Kufic Script'], ['إجازة علمية', 'Ijaza'], ['حلقة علم', 'Study Circle'],
      ['رواق', 'Portico'], ['سقاية', 'Watering'], ['تكية', 'Hospice'], ['صومعة', 'Minaret Tower'],
      ['قنديل', 'Oil Lamp'], ['مسبحة', 'Prayer Beads'], ['سواك', 'Toothstick'], ['كعبة', 'Kaaba'],
    ],
  },
  // 15. المفاهيم المجردة والقيم
  {
    category: 'المفاهيم المجردة',
    subCategory: 'القيم والمعاني الكلية',
    semanticCluster: 'abstract_values',
    ageGroup: 'youth',
    difficulty: 'medium',
    packIds: ['elite_classic', 'logic_abstract', 'family_masjid'],
    iconType: 'mind',
    items: [
      ['عدالة', 'Justice'], ['حرية', 'Freedom'], ['سلام', 'Peace'], ['أمل', 'Hope'],
      ['طموح', 'Ambition'], ['إرادة', 'Willpower'], ['عزيمة', 'Determination'], ['شجاعة', 'Courage'],
      ['صبر', 'Patience'], ['ثقة', 'Trust'], ['صدق', 'Truth'], ['أمانة', 'Honesty'],
      ['مسؤولية', 'Responsibility'], ['واجب', 'Duty'], ['حق', 'Right'], ['كرامة', 'Dignity'],
      ['شرف', 'Honor'], ['مجد', 'Glory'], ['نصر', 'Victory'], ['تفوق', 'Excellence'],
      ['نجاح', 'Success'], ['خبرة', 'Experience'], ['معرفة', 'Knowledge'], ['وعي', 'Awareness'],
      ['خيال', 'Imagination'], ['حلم', 'Dream'], ['رؤية', 'Vision'], ['رسالة', 'Mission'],
      ['هدف', 'Objective'], ['غاية', 'Purpose'], ['وسيلة', 'Means'], ['فرصة', 'Opportunity'],
      ['مخاطرة', 'Risk'], ['مصير', 'Destiny'], ['زمن', 'Time'], ['لحظة', 'Moment'],
      ['أبد', 'Eternity'], ['ماضي', 'Past'], ['حاضر', 'Present'], ['مستقبل', 'Future'],
      ['بداية', 'Beginning'], ['نهاية', 'End'], ['تحول', 'Transformation'], ['تطور', 'Evolution'],
      ['نهضة', 'Renaissance'], ['وحدة', 'Unity'], ['تعاون', 'Cooperation'], ['تحالف', 'Alliance'],
      ['سيادة', 'Sovereignty'], ['هيبة', 'Prestige'], ['تأثير', 'Influence'], ['قوة', 'Strength'],
      ['صمت', 'Silence'], ['غموض', 'Mystery'], ['سر', 'Secret'], ['إخلاص', 'Sincerity'],
      ['إحسان', 'Benevolence'], ['تقوى', 'Piety'], ['رحمة', 'Mercy'], ['تسامح', 'Tolerance'],
      ['إيثار', 'Altruism'], ['همة', 'Zeal'], ['ثبات', 'Steadfastness'], ['يقين', 'Certainty'],
      ['بركة', 'Blessing'], ['سكينة', 'Tranquility'], ['وقار', 'Gravity'], ['اعتدال', 'Moderation'],
    ],
  },
  // 16. الغذاء والطب والصحة (حزمة جديدة غنية لجميع الأعمار والأشبال)
  {
    category: 'الغذاء والطب',
    subCategory: 'الأغذية والطب والصحة',
    semanticCluster: 'food_medicine_health',
    ageGroup: 'all',
    difficulty: 'easy',
    packIds: ['junior_kids', 'family_masjid', 'science_space', 'nature_creatures'],
    iconType: 'food',
    items: [
      ['لقاح', 'Vaccine'], ['جينات', 'Genes'], ['خلية', 'Cell'], ['هرمون', 'Hormone'],
      ['مناعة', 'Immunity'], ['عسل', 'Honey'], ['خبز', 'Bread'], ['قمح', 'Wheat'],
      ['شعير', 'Barley'], ['أرز أبيض', 'Rice'], ['تفاح', 'Apple'], ['رمان', 'Pomegranate'],
      ['تين', 'Fig'], ['عنب', 'Grapes'], ['برتقال', 'Orange'], ['ليمون', 'Lemon'],
      ['موز', 'Banana'], ['فراولة', 'Strawberry'], ['بطيخ', 'Watermelon'], ['شمام', 'Melon'],
      ['لوز', 'Almond'], ['جوز', 'Walnut'], ['فستق', 'Pistachio'], ['سمسم', 'Sesame'],
      ['حليب', 'Milk'], ['جبن', 'Cheese'], ['زبدة', 'Butter'], ['زيت', 'Oil'],
      ['ملح', 'Salt'], ['سكر', 'Sugar'], ['قرفة', 'Cinnamon'], ['زنجبيل', 'Ginger'],
      ['نعناع', 'Mint'], ['شاي', 'Tea'], ['عصير', 'Juice'], ['حساء', 'Soup'],
      ['دواء', 'Medicine'], ['مرهم', 'Ointment'], ['ضمادة', 'Bandage'], ['سماعة طبيب', 'Stethoscope'],
      ['نبض', 'Pulse'], ['قلب', 'Heart'], ['رئة', 'Lung'], ['عظم', 'Bone'],
      ['عضلة', 'Muscle'], ['دم', 'Blood'], ['فيتامين', 'Vitamin'], ['بروتين', 'Protein'],
      ['إسعاف', 'First Aid'], ['وصفة طبية', 'Prescription'], ['عدوى', 'Infection'], ['وقاية', 'Prevention'],
      ['شريان', 'Artery'], ['وريد', 'Vein'], ['بصمة', 'Fingerprint'], ['قرنية', 'Cornea'],
      ['حنجرة', 'Larynx'], ['مفصل', 'Joint'], ['عمود فقري', 'Spine'], ['تغذية', 'Nutrition'],
      ['كمثرى', 'Pear'], ['خوخ', 'Peach'], ['مشمش', 'Apricot'], ['توت', 'Berry'],
      ['عدس', 'Lentils'], ['حمص', 'Chickpeas'], ['فول', 'Beans'], ['ذرة', 'Corn'],
      ['شوكولاتة', 'Chocolate'], ['كعكة', 'Cake'], ['فطيرة', 'Pie'], ['مربى', 'Jam'],
    ],
  },
  // 17. العمارة والفنون والخط
  {
    category: 'العمارة والفنون',
    subCategory: 'الهندسة المعمارية والتصميم',
    semanticCluster: 'architecture_design',
    ageGroup: 'all',
    difficulty: 'medium',
    packIds: ['family_masjid', 'history_heritage', 'elite_classic'],
    iconType: 'arch',
    items: [
      ['قنطرة', 'Archway'], ['عقود', 'Arches'], ['صحن المسجد', 'Courtyard Hall'], ['مقرنصات', 'Muqarnas'],
      ['محراب مزخرف', 'Carved Mihrab'], ['خزف', 'Ceramics'], ['فخار', 'Pottery'], ['زجاج ملون', 'Stained Glass'],
      ['نحت', 'Sculpture'], ['لوحة فنية', 'Canvas'], ['إطار', 'Frame'], ['فرشاة', 'Brush'],
      ['ألوان مائية', 'Watercolors'], ['ظل ونور', 'Chiaroscuro'], ['منظور', 'Perspective'], ['تناسق', 'Harmony'],
      ['واجهة', 'Facade'], ['شرفة', 'Balcony'], ['درج', 'Staircase'], ['قصر', 'Palace'],
      ['حصن', 'Citadel'], ['سرداب', 'Basement'], ['دهليز', 'Corridor'], ['قاعة', 'Hall'],
      ['منصة', 'Podium'], ['مسرح', 'Theater'], ['معرض', 'Gallery'], ['نصب تذكاري', 'Monument'],
      ['مسلة', 'Obelisk'], ['نافورة رخامية', 'Marble Fountain'], ['بلاط', 'Tiles'], ['قرميد', 'Roof Tiles'],
      ['سقف', 'Ceiling'], ['جدار', 'Wall Panel'], ['أساس', 'Foundation'], ['مخطط هندسي', 'Blueprint'],
      ['مجسم', 'Scale Model'], ['بوصلة معمارية', 'Drafting Compass'], ['خط ثلث', 'Thuluth Script'], ['خط نسخ', 'Naskh Script'],
      ['خط ديواني', 'Diwani Script'], ['طغراء', 'Tughra'], ['رقعة', 'Ruqah'], ['تذهيب', 'Gilding'],
      ['مجلد', 'Tome'], ['غلاف', 'Cover'], ['فهرس', 'Index'], ['هامش', 'Margin'],
      ['عنوان', 'Title'], ['فصل', 'Chapter'], ['مطبعة', 'Printing Press'], ['ورق بردي', 'Papyrus'],
      ['رق', 'Parchment'], ['مداد', 'Ink'], ['يراعة', 'Reed Pen'], ['منمنمة', 'Miniature'],
    ],
  },
  // 18. توسعة إضافية للعلوم والطبيعة والمجتمع (لضمان تنوع ضخم يبلغ مئات الكلمات الإضافية)
  {
    category: 'الطبيعة',
    subCategory: 'البيئة والمناخ',
    semanticCluster: 'climate_ecology',
    ageGroup: 'all',
    difficulty: 'medium',
    packIds: ['nature_creatures', 'science_space', 'family_masjid'],
    iconType: 'nature',
    items: [
      ['احتباس حراري', 'Global Warming'], ['طاقة شمسية', 'Solar Power'], ['رياح موسمية', 'Monsoon'], ['تصحر', 'Desertification'],
      ['محمية طبيعية', 'Nature Reserve'], ['تنوع حيوي', 'Biodiversity'], ['سلسلة غذائية', 'Food Chain'], ['تمثيل ضوئي', 'Photosynthesis'],
      ['يخضور', 'Chlorophyll'], ['لقاح زهر', 'Pollen'], ['خلية نحل', 'Beehive'], ['عش', 'Nest'],
      ['جحر', 'Burrow'], ['عرين', 'Den'], ['قطيع', 'Herd'], ['سرب', 'Flock'],
      ['هجرة طيور', 'Migration'], ['سبات شتوي', 'Hibernation'], ['تمويه', 'Camouflage'], ['افتراس', 'Predation'],
      ['ينبوع حار', 'Geyser'], ['نهر جليدي', 'Glacier'], ['جبل جليدي', 'Iceberg'], ['شعاب مرجانية', 'Coral Reef'],
      ['مضيق جبلي', 'Gorge'], ['فوهة بركان', 'Caldera'], ['واحة نخيل', 'Palm Oasis'], ['تربة', 'Soil'],
      ['طين', 'Clay'], ['رمل', 'Sand'], ['حصى', 'Pebbles'], ['صخر', 'Rock'],
    ],
  },
  {
    category: 'الأدوات والأشياء اليومية',
    subCategory: 'الأجهزة والاتصالات',
    semanticCluster: 'devices_communication',
    ageGroup: 'all',
    difficulty: 'easy',
    packIds: ['junior_kids', 'family_masjid', 'elite_classic'],
    iconType: 'tool',
    items: [
      ['هاتف', 'Phone'], ['مذياع', 'Radio'], ['تلفاز', 'Television'], ['حاسوب', 'Computer'],
      ['جهاز عرض', 'Projector'], ['طابعة', 'Printer'], ['ماسح ضوئي', 'Scanner'], ['عدسة مكبرة', 'Magnifier'],
      ['ساعة رملية', 'Hourglass'], ['ساعة شمسية', 'Sundial'], ['تقويم', 'Calendar'], ['منبه', 'Alarm'],
      ['مروحة', 'Fan'], ['مدفأة', 'Heater'], ['مكيف', 'Air Conditioner'], ['ثلاجة', 'Refrigerator'],
      ['فرن', 'Oven'], ['غسالة', 'Washer'], ['مكواة', 'Iron Press'], ['مكنسة', 'Broom'],
      ['مصباح يدوي', 'Flashlight'], ['بطارية شحن', 'Powerbank'], ['شاحن', 'Charger'], ['مقبس', 'Socket'],
      ['مفتاح كهرباء', 'Switch'], ['جرس باب', 'Doorbell'], ['قفل ذكي', 'Smart Lock'], ['كاميرا مراقبة', 'Security Cam'],
      ['حقيبة سفر', 'Suitcase'], ['خريطة ورقية', 'Paper Map'], ['تذكرة', 'Ticket'], ['جواز سفر', 'Passport'],
    ],
  },
];

function buildInitialOfficialWordBank(): WordEntry[] {
  const clusterToWords = new Map<string, string[]>();
  for (const cluster of CURATED_CLUSTERS) {
    const existing = clusterToWords.get(cluster.semanticCluster) || [];
    for (const [ar] of cluster.items) {
      existing.push(ar);
    }
    clusterToWords.set(cluster.semanticCluster, existing);
  }

  const seenNormalized = new Set<string>();
  const result: WordEntry[] = [];

  for (const cluster of CURATED_CLUSTERS) {
    const siblings = clusterToWords.get(cluster.semanticCluster) || [];
    for (const [ar, en] of cluster.items) {
      const cleanedAr = ar.trim().replace(/[\u0640]/g, '').replace(/\s+/g, ' ');
      const norm = normalizeArabicWord(cleanedAr);
      if (seenNormalized.has(norm)) continue;
      seenNormalized.add(norm);

      const related = siblings.filter((w) => w !== cleanedAr).slice(0, 6);
      result.push({
        id: `word_${result.length + 1}`,
        ar: cleanedAr,
        en: en.trim(),
        category: cluster.category,
        subCategory: cluster.subCategory,
        ageGroup: cluster.ageGroup,
        difficulty: cluster.difficulty,
        language: en ? 'ar_en' : 'ar',
        status: 'approved',
        packIds: cluster.packIds,
        semanticCluster: cluster.semanticCluster,
        relatedWords: related,
        iconType: cluster.iconType,
      });
    }
  }

  return result;
}

export const OFFICIAL_WORD_BANK: readonly WordEntry[] = Object.freeze(
  buildInitialOfficialWordBank()
);

/**
 * Deduplicates and validates a list of word entries using normalized Arabic comparison.
 */
export function buildValidatedWordBank(
  rawEntries: Array<{
    ar: string;
    en?: string;
    category?: WordCategory;
    subCategory?: string;
    ageGroup?: WordAgeGroup;
    difficulty?: WordDifficulty;
    status?: WordStatus;
    packIds?: WordPackId[];
    semanticCluster?: string;
    relatedWords?: string[];
    iconType?: WordEntry['iconType'];
  }>
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
      id: `word_${words.length + 1}`,
      ar: cleanedAr,
      en: item.en?.trim() || '',
      category: item.category || 'المفاهيم المجردة',
      subCategory: item.subCategory || 'عام',
      ageGroup: item.ageGroup || 'all',
      difficulty: item.difficulty || 'medium',
      language: item.en?.trim() ? 'ar_en' : 'ar',
      status: item.status || 'approved',
      packIds: item.packIds && item.packIds.length > 0 ? item.packIds : ['elite_classic'],
      semanticCluster: item.semanticCluster || 'general',
      relatedWords: item.relatedWords || [],
      iconType: item.iconType || 'star',
    });
  }

  return { words, duplicatesRemoved, invalidRemoved };
}

/**
 * Filters and mixes word packs according to pre-match criteria (Pack IDs, Categories, Age, Difficulty, Approval Status).
 */
export function filterWordPoolByCriteria(
  pool: readonly WordEntry[],
  criteria: WordFilterCriteria = {}
): WordEntry[] {
  const {
    packIds,
    categories,
    ageGroup = 'any',
    difficulty = 'any',
    onlyApproved = true,
    searchQuery = '',
  } = criteria;

  const cleanSearch = normalizeArabicWord(searchQuery);

  return pool.filter((word) => {
    if (onlyApproved && word.status && word.status !== 'approved') {
      return false;
    }
    if (packIds && packIds.length > 0) {
      const wPacks = word.packIds || ['elite_classic'];
      const matchesPack = packIds.some((pid) => wPacks.includes(pid));
      if (!matchesPack) return false;
    }
    if (categories && categories.length > 0) {
      if (!categories.includes(word.category)) return false;
    }
    if (ageGroup !== 'any') {
      const wAge = word.ageGroup || 'all';
      if (ageGroup === 'junior' && wAge !== 'junior' && wAge !== 'all') return false;
      if (ageGroup === 'youth' && wAge === 'adult') return false;
    }
    if (difficulty !== 'any') {
      const wDiff = word.difficulty || 'medium';
      if (wDiff !== difficulty) return false;
    }
    if (cleanSearch) {
      const normAr = normalizeArabicWord(word.ar);
      const normEn = (word.en || '').toLowerCase();
      if (!normAr.includes(cleanSearch) && !normEn.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Parses imported JSON content (supports array of strings or array of WordEntry objects).
 */
export function parseImportedWordsJson(jsonString: string): {
  entries: WordEntry[];
  duplicatesRemoved: string[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      return {
        entries: [],
        duplicatesRemoved: [],
        error: 'يجب أن يحتوي ملف JSON على مصفوفة (Array) من الكلمات.',
      };
    }

    const rawItems: Array<{
      ar: string;
      en?: string;
      category?: WordCategory;
      subCategory?: string;
      ageGroup?: WordAgeGroup;
      difficulty?: WordDifficulty;
      status?: WordStatus;
      packIds?: WordPackId[];
    }> = [];

    for (const item of parsed) {
      if (typeof item === 'string') {
        rawItems.push({ ar: item, en: '', category: 'المفاهيم المجردة' });
      } else if (item && typeof item === 'object' && typeof item.ar === 'string') {
        rawItems.push({
          ar: item.ar,
          en: typeof item.en === 'string' ? item.en : '',
          category: item.category || 'المفاهيم المجردة',
          subCategory: item.subCategory || 'مخصص',
          ageGroup: item.ageGroup || 'all',
          difficulty: item.difficulty || 'medium',
          status: item.status || 'approved',
          packIds: Array.isArray(item.packIds) ? item.packIds : ['elite_classic'],
        });
      }
    }

    const validated = buildValidatedWordBank(rawItems);
    if (validated.words.length === 0) {
      return {
        entries: [],
        duplicatesRemoved: validated.duplicatesRemoved,
        error: 'لم يتم العثور على كلمات عربية صالحة في الملف.',
      };
    }

    return {
      entries: validated.words,
      duplicatesRemoved: validated.duplicatesRemoved,
    };
  } catch {
    return {
      entries: [],
      duplicatesRemoved: [],
      error: 'صيغة ملف JSON غير صالحة.',
    };
  }
}
