// University and Halls of Residence Data
// Source: Official verified reference data (2026)
// This file is the SINGLE SOURCE OF TRUTH for university-hall relationships

export type University = {
  id: string;
  name: string; // Canonical name - MUST match exactly what's stored in database
  type: 'public' | 'private' | 'technical' | 'nursing' | 'education';
  halls: string[]; // Official halls only - canonical names
};

export const UNIVERSITIES: University[] = [
  // ========== PUBLIC UNIVERSITIES ==========
  {
    id: 'ug',
    name: 'University of Ghana (UG)',
    type: 'public',
    halls: [
      'Commonwealth Hall',
      'Legon Hall',
      'Akuafo Hall',
      'Mensah Sarbah Hall',
      'Volta Hall (All-female)',
      'Hilla Limann Hall',
      'Alexander Kwapong Hall',
      'Elizabeth Frances Sey Hall',
      'Jean Nelson Aka Hall',
      'Jubilee Hall',
      'International Students Hostel (ISH)',
      'African Union (AU) Hall',
    ],
  },
  {
    id: 'knust',
    name: 'KNUST',
    type: 'public',
    halls: [
      'University Hall (Katanga)',
      'Unity Hall (Conti)',
      'Independence Hall',
      'Republic Hall',
      'Queen Elizabeth II Hall',
      'Africa Hall (All-female)',
      'GUSSS Hostels',
      'SRC Hostel',
    ],
  },
  {
    id: 'ucc',
    name: 'University of Cape Coast (UCC)',
    type: 'public',
    halls: [
      'Oguaa Hall',
      'Atlantic Hall',
      'Casely Hayford Hall (All-male)',
      'Adehye Hall (All-female)',
      'Kwame Nkrumah Hall',
      'Valco Trust Fund Hall',
      'Alumni Hall',
      'Clinical Hall',
      'GUSSS Hall',
    ],
  },
  {
    id: 'ashesi',
    name: 'Ashesi University',
    type: 'private',
    halls: [
      'Efua Sutherland Hall',
      'Walter Hall',
      'Berekuso Hall',
      'The Hive',
      'The Grill',
    ],
  },
  {
    id: 'uds',
    name: 'University for Development Studies (UDS)',
    type: 'public',
    halls: [
      'Hall 1 (Tamale)',
      'Hall 2 (Tamale)',
      'Akpabio Female Hall',
      'Isa Kaita Hall',
      'Hall 1 (Nyankpala)',
      'Hall 2 (Nyankpala)',
      'Hall 3 (Nyankpala)',
      'SSNIT (Ghana Hostels)',
    ],
  },
  {
    id: 'uew',
    name: 'University of Education, Winneba (UEW)',
    type: 'public',
    halls: [
      'Ghartey Hall',
      'Kwegyir Aggrey Hall',
      'Simpa Hall',
      'University Hall',
      'Ajumako Hall',
    ],
  },
  {
    id: 'gimpa',
    name: 'GIMPA',
    type: 'public',
    halls: [
      'GIMPA Student Hostel',
      'GIMPA Executive Conference Centre (GECC) Accommodation',
    ],
  },
  {
    id: 'upsa',
    name: 'UPSA',
    type: 'public',
    halls: [
      'Opoku Ampomah Hall',
      'Nelson Mandela Hall',
      'Liberty Hall',
      'Yaa Asantewaa Hall',
    ],
  },
  {
    id: 'uhas',
    name: 'University of Health and Allied Sciences (UHAS)',
    type: 'public',
    halls: [
      'Sokode Hall',
      'Asogli Hall',
      'Hohoe Campus Hostel',
    ],
  },
  {
    id: 'uenr',
    name: 'University of Energy and Natural Resources (UENR)',
    type: 'public',
    halls: [
      'Hall 1 (Sunyani)',
      'GETfund Hostel',
      'New Hostel',
    ],
  },
  {
    id: 'sdd-ubids',
    name: 'SDD-UBIDS',
    type: 'public',
    halls: [
      'Cardinal Dery Hall',
      'Jubilee Hall',
      'Royal Hall',
      'Limann Hall',
    ],
  },
  {
    id: 'ckt-utas',
    name: 'CKT-UTAS',
    type: 'public',
    halls: [
      'Navro Hall (All-female)',
      'Ecowas Hall (All-male)',
      'New Hall (Mixed)',
    ],
  },
  {
    id: 'aamusted',
    name: 'AAMUSTED',
    type: 'public',
    halls: [
      'Autonomy Hall',
      'Atwima Hall',
      'Opoku Ware II Hall',
      'Amaniampong Hall',
      'Serwah Block (Female)',
    ],
  },
  {
    id: 'central-university',
    name: 'Central University',
    type: 'private',
    halls: [
      'Pronto Hostel (Miotso)',
      'Trinity Hall',
      'Miotso Campus Hostels',
    ],
  },
  {
    id: 'valley-view',
    name: 'Valley View University',
    type: 'private',
    halls: [
      'Ellen Gould White Residence',
      'J.J. Nortey Residence',
      'M.A. Bediako Residence',
    ],
  },
  {
    id: 'methodist-university',
    name: 'Methodist University Ghana',
    type: 'private',
    halls: [
      'Methodist University Hostel (Dansoman)',
      'Wenchi Campus Hostel',
    ],
  },
  {
    id: 'catholic-university',
    name: 'Catholic University College of Ghana',
    type: 'private',
    halls: [
      'Fiapre Campus Hostels (Block A)',
      'Fiapre Campus Hostels (Block B)',
      'Fiapre Campus Hostels (Block C)',
    ],
  },
  {
    id: 'regent-university',
    name: 'Regent University College',
    type: 'private',
    halls: ['Regent Student Hostel'],
  },
  {
    id: 'pentecost-university',
    name: 'Pentecost University',
    type: 'private',
    halls: ['Pentecost University Hostel (Sowutuom)'],
  },

  // ========== TECHNICAL UNIVERSITIES ==========
  {
    id: 'atu',
    name: 'Accra Technical University',
    type: 'technical',
    halls: ['ATU Hostel (New Hostel)', 'Old Hostel'],
  },
  {
    id: 'ktu',
    name: 'Kumasi Technical University',
    type: 'technical',
    halls: ['Amakye Benjamin Hall', 'Simon Ofutufo Takyi Ansah Hall', 'Block M'],
  },
  {
    id: 'ttu',
    name: 'Takoradi Technical University',
    type: 'technical',
    halls: ['Ahanta Hall', 'Nzema Hall', 'Ghacem Hall', 'GETfund Hall'],
  },
  {
    id: 'cctu',
    name: 'Cape Coast Technical University',
    type: 'technical',
    halls: ['International Students Hostel', 'CCTU Hostels'],
  },
  {
    id: 'htu',
    name: 'Ho Technical University',
    type: 'technical',
    halls: ['Acolatse/Vodzi Hall', 'Adaklu Hall', 'HTU Hostel'],
  },
  {
    id: 'koftu',
    name: 'Koforidua Technical University',
    type: 'technical',
    halls: ['KTU Hostel (GETfund Hostel)'],
  },
  {
    id: 'stu',
    name: 'Sunyani Technical University',
    type: 'technical',
    halls: ['STU Hall (New Hostel)', 'Old Hostel'],
  },
  {
    id: 'tamtu',
    name: 'Tamale Technical University',
    type: 'technical',
    halls: ['GETfund Hostel', 'New Hostel'],
  },
  {
    id: 'btu',
    name: 'Bolgatanga Technical University',
    type: 'technical',
    halls: ['BTU Hostel (GETfund)'],
  },
  {
    id: 'watu',
    name: 'Wa Technical University',
    type: 'technical',
    halls: ['WaTU Hostel'],
  },
  {
    id: 'dhltu',
    name: 'Dr. Hilla Limann Technical University',
    type: 'technical',
    halls: ['DHLTU Hostel'],
  },
  {
    id: 'tarkwa-tu',
    name: 'Tarkwa Technical University',
    type: 'technical',
    halls: ['Tarkwa TU Hostels'],
  },

  // ========== NURSING TRAINING COLLEGES ==========
  {
    id: 'korle-bu-ntc',
    name: 'Korle Bu NTC',
    type: 'nursing',
    halls: ['Sunshine Hostel', 'NMTC Main Hostels'],
  },
  {
    id: '37-military-ntc',
    name: '37 Military Hospital NTC',
    type: 'nursing',
    halls: ['37 NMTC Hostels (On-campus)'],
  },
  {
    id: 'pantang-ntc',
    name: 'Pantang NTC',
    type: 'nursing',
    halls: ['Pantang NTC Student Hostels'],
  },
  {
    id: 'ridge-ntc',
    name: 'Ridge Hospital NTC',
    type: 'nursing',
    halls: ['Ridge NTC Hostels'],
  },
  {
    id: 'koforidua-ntc',
    name: 'Koforidua NTC',
    type: 'nursing',
    halls: ['Koforidua NTC Hostels'],
  },
  {
    id: 'komfo-anokye-ntc',
    name: 'Komfo Anokye NTC',
    type: 'nursing',
    halls: ['KNMTC Hostels (On-campus)'],
  },
  {
    id: 'sunyani-ntc',
    name: 'Sunyani NTC',
    type: 'nursing',
    halls: ['Sunyani NTC Hostels'],
  },
  {
    id: 'tamale-ntc',
    name: 'Tamale NTC',
    type: 'nursing',
    halls: ['Tamale NTC Hostels'],
  },
  {
    id: 'bolgatanga-ntc',
    name: 'Bolgatanga NTC',
    type: 'nursing',
    halls: ['Bolgatanga NTC Hostels'],
  },
  {
    id: 'wa-ntc',
    name: 'Wa NTC',
    type: 'nursing',
    halls: ['Wa NTC Hostels'],
  },
  {
    id: 'cape-coast-ntc',
    name: 'Cape Coast NTC',
    type: 'nursing',
    halls: ['Cape Coast NTC Hostels'],
  },
  {
    id: 'ho-ntc',
    name: 'Ho NTC',
    type: 'nursing',
    halls: ['Ho NTC Hostels'],
  },
  {
    id: 'yendi-ntc',
    name: 'Yendi NTC',
    type: 'nursing',
    halls: ['Yendi NTC Hostels'],
  },
  {
    id: 'navrongo-ntc',
    name: 'Navrongo NTC',
    type: 'nursing',
    halls: ['Navrongo NTC Hostels'],
  },
  {
    id: 'offinso-ntc',
    name: 'Offinso NTC',
    type: 'nursing',
    halls: ['Offinso NTC Hostels'],
  },
  {
    id: 'agogo-ntc',
    name: 'Presbyterian NTC, Agogo',
    type: 'nursing',
    halls: ['Agogo NTC Hostels'],
  },
  {
    id: 'wenchi-ntc',
    name: 'Methodist NTC, Wenchi',
    type: 'nursing',
    halls: ['Wenchi NTC Hostels'],
  },
  {
    id: 'techiman-ntc',
    name: 'Holy Family NTC, Techiman',
    type: 'nursing',
    halls: ['Techiman NTC Hostels'],
  },

  // ========== COLLEGES OF EDUCATION ==========
  {
    id: 'accra-coe',
    name: 'Accra College of Education',
    type: 'education',
    halls: ['Kwakranya II Hall', 'Ama Hesse Hall', 'Gberbie Hall', 'Christiana Henaku Hall'],
  },
  {
    id: 'wesley-coe',
    name: 'Wesley College of Education (Kumasi)',
    type: 'education',
    halls: ['Vera Hall', 'Margaret Hall', 'Charity Hall', 'Persis Hall'],
  },
  {
    id: 'komenda-coe',
    name: 'Komenda College of Education',
    type: 'education',
    halls: ['Komenda CoE Hostels'],
  },
  {
    id: 'st-louis-coe',
    name: 'St. Louis College of Education (Kumasi)',
    type: 'education',
    halls: [
      'St. Theresa Hall',
      'Guiseppe Hall',
      'Consilli Hall',
      "Dame's Block",
      'Archbishop Gabriel Justice Y. Anokye Hall',
      'Archbishop Thomas K. Mensah Hall',
    ],
  },
  {
    id: 'presbyterian-akropong-coe',
    name: 'Presbyterian College of Education (Akropong)',
    type: 'education',
    halls: ['Noble Hall', 'Akyekyerew ne Nwaw Hall', 'Pinido Hall', 'Affutumireku Hall'],
  },
  {
    id: 'mount-mary-coe',
    name: 'Mount Mary CoE (Somanya)',
    type: 'education',
    halls: ['El Hostel', 'Mount Mary Hostels'],
  },
  {
    id: 'tamale-coe',
    name: 'Tamale College of Education',
    type: 'education',
    halls: ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4'],
  },
  {
    id: 'bagabaga-coe',
    name: 'Bagabaga College of Education',
    type: 'education',
    halls: ['Hall 1', 'Hall 2', 'Hall 3', 'Hall 4'],
  },
  {
    id: 'nja-coe',
    name: 'Nusrat Jahan Ahmadiyya CoE',
    type: 'education',
    halls: ['NJA CoE Hostels'],
  },
  {
    id: 'peki-coe',
    name: 'Peki College of Education',
    type: 'education',
    halls: ['The Nobles Hall', 'Peki CoE Hostels'],
  },
  {
    id: 'ada-coe',
    name: 'Ada College of Education',
    type: 'education',
    halls: ['Same Hall', 'Lorlorvor Hall', 'Songor Hall', 'Okor Hall'],
  },
  {
    id: 'abetifi-coe',
    name: 'Abetifi Presbyterian CoE',
    type: 'education',
    halls: ['Abetifi CoE Hostels'],
  },
  {
    id: 'akatsi-coe',
    name: 'Akatsi College of Education',
    type: 'education',
    halls: [
      'Ahiable (Avenor 1)',
      'Dorglo Anumah (Avenor 2)',
      'Bedzo (Avenor 3)',
      'Maglo (Avenor 4)',
    ],
  },
  {
    id: 'st-teresas-coe',
    name: "St. Teresa's CoE (Hohoe)",
    type: 'education',
    halls: ['St. Agnes Hall', 'Bishop Konnings Hall'],
  },
  {
    id: 'st-john-bosco-coe',
    name: 'St. John Bosco CoE (Navrongo)',
    type: 'education',
    halls: ['St. John Bosco Hostels'],
  },
  {
    id: 'berekum-coe',
    name: 'Berekum College of Education',
    type: 'education',
    halls: ['Royal Hall', 'Berekum CoE Hostels'],
  },
  {
    id: 'enchi-coe',
    name: 'Enchi College of Education',
    type: 'education',
    halls: ['Annor Assemah Hall', 'Addison Hall', 'Nkrumah Hall', 'Cooke Hall'],
  },
];

// ========== HELPER FUNCTIONS ==========

/**
 * Get halls for a specific university by name
 * Returns empty array if university not found
 */
export const getHallsForUniversity = (universityName: string): string[] => {
  const university = UNIVERSITIES.find((u) => u.name === universityName);
  return university?.halls || [];
};

/**
 * Get university object by name
 */
export const getUniversityByName = (name: string): University | undefined => {
  return UNIVERSITIES.find((u) => u.name === name);
};

/**
 * Get all university names sorted alphabetically
 */
export const getAllUniversityNames = (): string[] => {
  return UNIVERSITIES.map((u) => u.name).sort();
};

/**
 * Get universities grouped by type
 */
export const getUniversitiesByType = (type: University['type']): University[] => {
  return UNIVERSITIES.filter((u) => u.type === type).sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Get all universities grouped by type for display
 */
export const getGroupedUniversities = (): Record<string, University[]> => {
  return {
    Public: getUniversitiesByType('public'),
    Private: getUniversitiesByType('private'),
    Technical: getUniversitiesByType('technical'),
    Nursing: getUniversitiesByType('nursing'),
    'Colleges of Education': getUniversitiesByType('education'),
  };
};

/**
 * Validate if a hall belongs to a university
 */
export const isValidHallForUniversity = (universityName: string, hallName: string): boolean => {
  const halls = getHallsForUniversity(universityName);
  return halls.includes(hallName);
};

/**
 * Get type label for display
 */
export const getTypeLabel = (type: University['type']): string => {
  const labels: Record<University['type'], string> = {
    public: 'Public Universities',
    private: 'Private Universities',
    technical: 'Technical Universities',
    nursing: 'Nursing Training Colleges',
    education: 'Colleges of Education',
  };
  return labels[type];
};