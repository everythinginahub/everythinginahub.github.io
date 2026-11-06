// Choices can be personalised, including a custom subject. Not every subject
// currently has an official starter deck; the library makes this explicit.
export const subjectCatalog = [
  'Mathematics','Further Mathematics','Biology','Chemistry','Physics','Combined Science','English Language','English Literature','History','Geography','Computer Science','Business Studies','Economics','Psychology','Sociology','Religious Studies','Citizenship','Politics','Law','Accounting','Statistics','Media Studies','Film Studies','Art and Design','Photography','Graphic Design','Music','Drama','Dance','Physical Education','Sport Science','Health and Social Care','Child Development','Food Preparation and Nutrition','Design and Technology','Engineering','Electronics','Environmental Science','Agriculture','Geology','Astronomy','French','Spanish','German','Italian','Portuguese','Latin','Classical Greek','Classical Civilisation','Mandarin Chinese','Japanese','Arabic','Urdu','Welsh','Irish','Polish','Russian','Philosophy','Anthropology','Criminology','Travel and Tourism','Hospitality','Digital Technology','Information Technology','Performing Arts','Product Design','Textiles'
];
export function cleanSubjects(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(x=>typeof x==='string').map(x=>x.trim().slice(0,80)).filter(Boolean))].slice(0,30);
}
