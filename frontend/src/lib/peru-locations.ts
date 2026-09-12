/** Departamentos y distritos/ciudades principales de Perú para envío. */
export const PERU_DEPARTMENTS = [
  'Amazonas',
  'Áncash',
  'Apurímac',
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Callao',
  'Cusco',
  'Huancavelica',
  'Huánuco',
  'Ica',
  'Junín',
  'La Libertad',
  'Lambayeque',
  'Lima',
  'Loreto',
  'Madre de Dios',
  'Moquegua',
  'Pasco',
  'Piura',
  'Puno',
  'San Martín',
  'Tacna',
  'Tumbes',
  'Ucayali',
] as const;

export type PeruDepartment = (typeof PERU_DEPARTMENTS)[number];

export const PERU_DISTRICTS: Record<PeruDepartment, string[]> = {
  Amazonas: [
    'Chachapoyas',
    'Bagua',
    'Bagua Grande',
    'Jumbilla',
    'Lamud',
    'San Nicolás',
  ],
  Áncash: [
    'Huaraz',
    'Aija',
    'Caraz',
    'Carhuaz',
    'Casma',
    'Chimbote',
    'Huarmey',
    'Nuevo Chimbote',
    'Recuay',
    'Santa',
    'Yungay',
  ],
  Apurímac: ['Abancay', 'Andahuaylas', 'Antabamba', 'Aymaraes', 'Chincheros', 'Cotabambas', 'Grau'],
  Arequipa: [
    'Arequipa',
    'Alto Selva Alegre',
    'Camaná',
    'Cayma',
    'Cerro Colorado',
    'Chivay',
    'Jacobo Hunter',
    'José Luis Bustamante y Rivero',
    'Mariano Melgar',
    'Miraflores',
    'Mollendo',
    'Paucarpata',
    'Sabandía',
    'Sachaca',
    'Socabaya',
    'Yanahuara',
  ],
  Ayacucho: ['Ayacucho', 'Cangallo', 'Huamanga', 'Huanta', 'Puquio', 'San Miguel', 'Vilcas Huamán'],
  Cajamarca: [
    'Cajamarca',
    'Celendín',
    'Chota',
    'Cutervo',
    'Jaén',
    'San Ignacio',
    'San Marcos',
    'Santa Cruz',
  ],
  Callao: [
    'Bellavista',
    'Callao',
    'Carmen de la Legua Reynoso',
    'La Perla',
    'La Punta',
    'Mi Perú',
    'Ventanilla',
  ],
  Cusco: [
    'Cusco',
    'Calca',
    'San Jerónimo',
    'San Sebastián',
    'Santiago',
    'Sicuani',
    'Urubamba',
    'Wanchaq',
  ],
  Huancavelica: ['Huancavelica', 'Acobamba', 'Angaraes', 'Castrovirreyna', 'Churcampa', 'Huaytará', 'Tayacaja'],
  Huánuco: ['Huánuco', 'Ambo', 'Dos de Mayo', 'Huacaybamba', 'Huamalíes', 'Leoncio Prado', 'Tingo María'],
  Ica: ['Ica', 'Chincha Alta', 'Nazca', 'Palpa', 'Pisco', 'Parcona', 'Subtanjalla'],
  Junín: [
    'Huancayo',
    'Chanchamayo',
    'Chupaca',
    'Concepción',
    'El Tambo',
    'Jauja',
    'Junín',
    'La Oroya',
    'Satipo',
    'Tarma',
  ],
  'La Libertad': [
    'Trujillo',
    'El Porvenir',
    'Florencia de Mora',
    'Huamachuco',
    'Huanchaco',
    'La Esperanza',
    'Laredo',
    'Moche',
    'Otuzco',
    'Pacasmayo',
    'Salaverry',
    'Santiago de Chuco',
    'Víctor Larco Herrera',
  ],
  Lambayeque: ['Chiclayo', 'Ferreñafe', 'José Leonardo Ortiz', 'Lambayeque', 'Monsefú', 'Pimentel'],
  Lima: [
    'Ancón',
    'Ate',
    'Barranco',
    'Breña',
    'Carabayllo',
    'Chaclacayo',
    'Chorrillos',
    'Cieneguilla',
    'Comas',
    'El Agustino',
    'Independencia',
    'Jesús María',
    'La Molina',
    'La Victoria',
    'Lima',
    'Lince',
    'Los Olivos',
    'Lurigancho',
    'Lurín',
    'Magdalena del Mar',
    'Miraflores',
    'Pachacámac',
    'Pucusana',
    'Pueblo Libre',
    'Puente Piedra',
    'Punta Hermosa',
    'Punta Negra',
    'Rímac',
    'San Bartolo',
    'San Borja',
    'San Isidro',
    'San Juan de Lurigancho',
    'San Juan de Miraflores',
    'San Luis',
    'San Martín de Porres',
    'San Miguel',
    'Santa Anita',
    'Santa María del Mar',
    'Santa Rosa',
    'Santiago de Surco',
    'Surquillo',
    'Villa El Salvador',
    'Villa María del Triunfo',
    'Barranca',
    'Cañete',
    'Huaral',
    'Huaura',
    'Huacho',
    'Oyón',
    'Yauyos',
  ],
  Loreto: ['Iquitos', 'Belén', 'Nauta', 'Punchana', 'Requena', 'San Juan Bautista', 'Yurimaguas'],
  'Madre de Dios': ['Puerto Maldonado', 'Iberia', 'Iñapari', 'Manu', 'Tahuamanu'],
  Moquegua: ['Moquegua', 'Ilo', 'Omate', 'Samegua', 'Torata'],
  Pasco: ['Cerro de Pasco', 'Oxapampa', 'Chaupimarca', 'Yanacancha', 'Villa Rica'],
  Piura: [
    'Piura',
    'Ayabaca',
    'Castilla',
    'Catacaos',
    'Chulucanas',
    'Paita',
    'Sechura',
    'Sullana',
    'Talara',
  ],
  Puno: ['Puno', 'Azángaro', 'Ilave', 'Juliaca', 'Lampa', 'Melgar', 'Sandia', 'Yunguyo'],
  'San Martín': ['Moyobamba', 'Bellavista', 'Juanjuí', 'Lamas', 'Rioja', 'Tarapoto', 'Tocache'],
  Tacna: ['Tacna', 'Candarave', 'Jorge Basadre', 'Tarata', 'Alto de la Alianza', 'Ciudad Nueva', 'Gregorio Albarracín'],
  Tumbes: ['Tumbes', 'Contralmirante Villar', 'Zarumilla', 'Aguas Verdes', 'Corrales'],
  Ucayali: ['Pucallpa', 'Atalaya', 'Callería', 'Manantay', 'Yarinacocha'],
};

export function formatPeruLocation(department: string, district: string): string {
  if (!district) return '';
  if (!department) return district;
  return `${district}, ${department}`;
}

export function parsePeruLocation(value: string): { department: string; district: string } {
  const raw = value.trim();
  if (!raw) return { department: '', district: '' };

  const [left, ...rest] = raw.split(',').map((part) => part.trim());
  const right = rest.join(', ');

  if (right && isPeruDepartment(right) && PERU_DISTRICTS[right].includes(left)) {
    return { department: right, district: left };
  }

  if (isPeruDepartment(raw)) {
    return { department: raw, district: '' };
  }

  if (PERU_DISTRICTS.Lima.includes(raw)) {
    return { department: 'Lima', district: raw };
  }

  for (const department of PERU_DEPARTMENTS) {
    if (PERU_DISTRICTS[department].includes(raw)) {
      return { department, district: raw };
    }
  }

  if (isPeruDepartment(right)) {
    return { department: right, district: left };
  }

  return { department: 'Lima', district: raw };
}

export function isPeruDepartment(value: string): value is PeruDepartment {
  return (PERU_DEPARTMENTS as readonly string[]).includes(value);
}
