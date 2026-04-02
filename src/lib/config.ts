// Configuration for entity types
export const ENTITY_TYPES = {
  school: {
    label: 'School',
    plural: 'Schools',
    icon: 'SchoolOutlined',
    excelColumns: ['Name', 'Address', 'Phone Number']
  },
  interior: {
    label: 'Interior Design Firm',
    plural: 'Interior Design Firms',
    icon: 'PaletteOutlined',
    excelColumns: ['Firm Name', 'Address', 'Phone Number']
  },
  construction: {
    label: 'Construction Company',
    plural: 'Construction Companies',
    icon: 'BuildOutlined',
    excelColumns: ['Company Name', 'Address', 'Phone Number']
  },
  // Add more types as needed
} as const;

export type EntityType = keyof typeof ENTITY_TYPES;

// Current active entity type - can be set via environment variable
export const CURRENT_ENTITY_TYPE: EntityType = (process.env.NEXT_PUBLIC_ENTITY_TYPE as EntityType) || 'school';