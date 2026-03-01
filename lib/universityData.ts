export type University = {
  id: string;
  name: string;
  type: 'public' | 'private' | 'technical' | 'nursing' | 'education';
  halls: string[];
};

export const UNIVERSITIES: University[] = [
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
];

export const getHallsForUniversity = (universityName: string): string[] => {
  const university = UNIVERSITIES.find((u) => u.name === universityName);
  return university?.halls || [];
};

export const getUniversityByName = (name: string): University | undefined => {
  return UNIVERSITIES.find((u) => u.name === name);
};

export const getAllUniversityNames = (): string[] => {
  return UNIVERSITIES.map((u) => u.name).sort();
};

export const getUniversitiesByType = (type: University['type']): University[] => {
  return UNIVERSITIES.filter((u) => u.type === type).sort((a, b) => a.name.localeCompare(b.name));
};

export const getGroupedUniversities = (): Record<string, University[]> => {
  return {
    Public: getUniversitiesByType('public'),
    Private: getUniversitiesByType('private'),
    Technical: getUniversitiesByType('technical'),
    Nursing: getUniversitiesByType('nursing'),
    'Colleges of Education': getUniversitiesByType('education'),
  };
};