// Reference pools used only to *label* placeholder records realistically.
// No clinical logic is derived from these — severities, statuses, and
// recommendations are always assigned as opaque backend-shaped values.

export const DOCTOR_NAMES = [
  { id: "doc-001", name: "Dr. Anita Rao", specialty: "Internal Medicine" },
  { id: "doc-002", name: "Dr. Marcus Chen", specialty: "Cardiology" },
  { id: "doc-003", name: "Dr. Priya Nair", specialty: "Endocrinology" },
  { id: "doc-004", name: "Dr. Samuel Okafor", specialty: "Nephrology" },
  { id: "doc-005", name: "Dr. Lena Fischer", specialty: "Geriatrics" },
  { id: "doc-006", name: "Dr. Ravi Menon", specialty: "General Medicine" },
];

export const PHARMACIST_NAMES = [
  { id: "phm-001", name: "James Whitfield" },
  { id: "phm-002", name: "Sarah Osei" },
  { id: "phm-003", name: "Meera Iyer" },
  { id: "phm-004", name: "Daniel Kwon" },
];

export const PATIENT_NAMES = [
  "Alan Ferreira", "Bina Shah", "Carlos Mendes", "Diya Patel", "Ethan Brooks",
  "Fatima Al-Sayed", "George Lindqvist", "Hana Kobayashi", "Ivan Petrov", "Jyoti Verma",
  "Kwame Asante", "Laila Haddad", "Manuel Ortiz", "Nina Kowalski", "Omar Farouk",
  "Priya Deshmukh", "Quentin Dubois", "Rosa Almeida", "Samir Khan", "Tara O'Sullivan",
  "Uma Krishnan", "Victor Novak", "Wanjiru Kamau", "Xin Zhao", "Yara Nasser",
  "Zain Malik", "Abigail Ross", "Bhavesh Rao", "Chloe Martin", "Deepak Sinha",
];

export const MEDICATIONS = [
  { name: "Metformin", strengths: ["500 mg", "850 mg", "1000 mg"] },
  { name: "Lisinopril", strengths: ["5 mg", "10 mg", "20 mg"] },
  { name: "Atorvastatin", strengths: ["10 mg", "20 mg", "40 mg"] },
  { name: "Warfarin", strengths: ["1 mg", "2 mg", "5 mg"] },
  { name: "Amoxicillin", strengths: ["250 mg", "500 mg"] },
  { name: "Ibuprofen", strengths: ["200 mg", "400 mg", "600 mg"] },
  { name: "Omeprazole", strengths: ["20 mg", "40 mg"] },
  { name: "Amlodipine", strengths: ["2.5 mg", "5 mg", "10 mg"] },
  { name: "Sertraline", strengths: ["25 mg", "50 mg", "100 mg"] },
  { name: "Furosemide", strengths: ["20 mg", "40 mg"] },
  { name: "Insulin Glargine", strengths: ["100 units/mL"] },
  { name: "Clopidogrel", strengths: ["75 mg"] },
  { name: "Levothyroxine", strengths: ["50 mcg", "75 mcg", "100 mcg"] },
  { name: "Prednisone", strengths: ["5 mg", "10 mg", "20 mg"] },
  { name: "Azithromycin", strengths: ["250 mg", "500 mg"] },
];

export const ROUTES = ["oral", "iv", "im", "subcutaneous", "topical", "inhalation"] as const;
export const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Every 8 hours", "Every 12 hours", "As needed", "Once weekly"];
export const DURATIONS = ["5 days", "7 days", "10 days", "14 days", "30 days", "90 days", "Ongoing"];
export const INDICATIONS = [
  "Type 2 diabetes management", "Hypertension control", "Hyperlipidemia", "Atrial fibrillation prophylaxis",
  "Bacterial infection", "Pain and inflammation", "GERD management", "Post-MI secondary prevention",
  "Depression / anxiety", "Fluid overload management", "Hypothyroidism", "Anti-inflammatory course",
];
export const ALLERGY_POOL = ["Penicillin", "Sulfa drugs", "NSAIDs", "Latex", "Aspirin", "Codeine", "Shellfish", "None documented"];

export const HOSPITAL_NODES = [
  "St. Mary's General — North Campus",
  "Riverbend Regional Medical Center",
  "Lakeside Community Hospital",
  "Highland Park Health System",
  "Coastal Health Alliance",
  "Meridian University Hospital",
];
