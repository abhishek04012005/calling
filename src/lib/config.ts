// Configuration for entity types
export const ENTITY_TYPES = {
  school: {
    label: 'School',
    plural: 'Schools',
    icon: 'SchoolOutlined',
    excelColumns: ['Name', 'Address', 'Phone Number'],
    whatsappMessage: `Hello! 👋 This is Ank Square. We help businesses grow from local to global by building a strong digital presence. 🚀

We noticed great potential in your business and would love to help you expand your reach, increase customers, and boost sales through our smart digital solutions.

Let’s take your business to the next level together! 🌍

You can explore more about us here: https://anksquare.com/
Looking forward to connecting with you!`,
  },
  interior: {
    label: 'Interior Design Firm',
    plural: 'Interior Design Firms',
    icon: 'PaletteOutlined',
    excelColumns: ['Firm Name', 'Address', 'Phone Number'],
    whatsappMessage: `Hello! 👋 This is Ank Square. We help businesses grow from local to global by building a strong digital presence. 🚀

We noticed great potential in your business and would love to help you expand your reach, increase customers, and boost sales through our smart digital solutions.

Let’s take your business to the next level together! 🌍

You can explore more about us here: https://anksquare.com/
Looking forward to connecting with you!`,
  },
  construction: {
    label: 'Construction Company',
    plural: 'Construction Companies',
    icon: 'BuildOutlined',
    excelColumns: ['Company Name', 'Address', 'Phone Number'],
    whatsappMessage: `Hello! 👋 This is Ank Square. We help businesses grow from local to global by building a strong digital presence. 🚀

We noticed great potential in your business and would love to help you expand your reach, increase customers, and boost sales through our smart digital solutions.

Let’s take your business to the next level together! 🌍

You can explore more about us here: https://anksquare.com/
Looking forward to connecting with you!`,
  },
  // Add more types as needed
} as const;

export type EntityType = keyof typeof ENTITY_TYPES;

// Current active entity type - can be set via environment variable
export const CURRENT_ENTITY_TYPE: EntityType = (process.env.NEXT_PUBLIC_ENTITY_TYPE as EntityType) || 'school';