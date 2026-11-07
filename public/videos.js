// External links selected for introductory revision. The videos remain owned
// and hosted by their creators; availability and exam-board coverage can change.
export const videos = [
  {id:'bio-osmosis',title:'Osmosis',creator:'Cognito',level:'GCSE',subjects:['Biology','Combined Science'],description:'How water moves through partially permeable membranes.',url:'https://www.youtube.com/watch?v=vCJVXYmXkzM'},
  {id:'bio-diffusion',title:'Diffusion',creator:'Cognito',level:'GCSE',subjects:['Biology','Combined Science'],description:'Particle movement, examples and factors affecting diffusion.',url:'https://www.youtube.com/watch?v=LUPHohqlPTU'},
  {id:'bio-food-chains',title:'Food chains and predator-prey cycles',creator:'Cognito',level:'GCSE',subjects:['Biology','Combined Science'],description:'Energy flow and feeding relationships in ecosystems.',url:'https://www.youtube.com/watch?v=e8vzQWjzjm0'},
  {id:'bio-trophic',title:'Trophic levels, producers and consumers',creator:'Cognito',level:'GCSE',subjects:['Biology','Combined Science'],description:'Explore feeding levels and the organisms in a food chain.',url:'https://www.youtube.com/watch?v=D1In8W2qev4'},
  {id:'chem-periodic-video',title:'Development of the periodic table',creator:'Cognito',level:'GCSE',subjects:['Chemistry','Combined Science'],description:'Groups, periods and how the table is organised.',url:'https://www.youtube.com/watch?v=NVnnIjUbXNQ'},
  {id:'chem-bonding-video',title:'Covalent bonding',creator:'Cognito',level:'GCSE',subjects:['Chemistry','Combined Science'],description:'Electron sharing and drawing covalent bonds.',url:'https://www.youtube.com/watch?v=7IkYm7ZgiAw'},
  {id:'chem-metal-video',title:'Metals and non-metals',creator:'Cognito',level:'GCSE',subjects:['Chemistry','Combined Science'],description:'Electron arrangements and properties of metals and non-metals.',url:'https://www.youtube.com/watch?v=DOB_fJO6-uA'},
  {id:'physics-parallel',title:'Parallel circuits',creator:'Cognito',level:'GCSE',subjects:['Physics','Combined Science','Electronics'],description:'Current, potential difference and resistance in parallel circuits.',url:'https://www.youtube.com/watch?v=jNFXtjt5muI'},
  {id:'physics-half-life',title:'Radioactive decay and half-life',creator:'Cognito',level:'GCSE',subjects:['Physics','Combined Science'],description:'Activity, half-life and radioactive decay graphs.',url:'https://www.youtube.com/watch?v=zXw2cOSBB8E'},
  {id:'physics-generator',title:'The generator effect',creator:'Cognito',level:'GCSE',subjects:['Physics','Combined Science','Electronics'],description:'How a changing magnetic field can induce a potential difference.',url:'https://www.youtube.com/watch?v=pkzY7QfTowM'},
  {id:'math-ratio',title:'Ratios as fractions or percentages',creator:'Corbettmaths',level:'GCSE',subjects:['Mathematics'],description:'Worked GCSE-style questions converting ratios.',url:'https://www.youtube.com/watch?v=w_J_WQnAqjE'},
  {id:'math-proportion',title:'Direct proportion',creator:'Corbettmaths',level:'GCSE',subjects:['Mathematics'],description:'The proportionality symbol and constant of proportionality.',url:'https://www.youtube.com/watch?v=kcOwC7uqJNE'},
  {id:'math-quadratic',title:'Solving quadratics by factorising',creator:'Corbettmaths',level:'GCSE Further Maths',subjects:['Further Mathematics','Mathematics'],description:'A worked introduction to solving quadratic equations by factorisation.',url:'https://www.youtube.com/watch?v=oQlV9IEFp_o'},
  {id:'eng-unseen',title:'A method for unseen poetry',creator:'Mr Salles',level:'GCSE · AQA',subjects:['English Literature'],description:'An approach to analysing an unseen poem; check the requirements for your exam board.',url:'https://www.youtube.com/watch?v=Toq383utM-Y'},
  {id:'eng-poetry-compare',title:'Comparing poems',creator:'Mr Salles',level:'GCSE · AQA',subjects:['English Literature'],description:'Guidance on comparison using the AQA mark scheme.',url:'https://www.youtube.com/watch?v=5hMd5x1ocrc'},
  {id:'eng-punctuation',title:'How to use punctuation',creator:'YouTube lesson',level:'GCSE',subjects:['English Language'],description:'An introduction to punctuation in English writing.',url:'https://www.youtube.com/watch?v=n_Zw5xQ33y0'},
  {id:'geo-river',title:'River processes',creator:'OMG Revision',level:'GCSE',subjects:['Geography'],description:'River erosion, transportation and deposition.',url:'https://www.youtube.com/watch?v=8BOiJ3mWDxQ'},
  {id:'geo-tectonics',title:'Tectonic hazards',creator:'YouTube lesson',level:'GCSE',subjects:['Geography'],description:'Why earthquakes and volcanoes occur at different plate boundaries.',url:'https://www.youtube.com/watch?v=yLlaCVi8-9o'},
  {id:'cs-translators',title:'Assemblers, compilers and interpreters',creator:"Craig'n'Dave",level:'GCSE · AQA',subjects:['Computer Science','Digital Technology'],description:'How code is translated into machine code.',url:'https://www.youtube.com/watch?v=-98kmXsK5BY'},
  {id:'business-profit',title:'Revenue, costs and profit',creator:'tutor2u',level:'GCSE',subjects:['Business Studies'],description:'A revision session covering key business calculations.',url:'https://www.youtube.com/watch?v=hSwEObPmgu8'},
  {id:'psych-research',title:'Research methods: planning research',creator:'YouTube lesson',level:'GCSE · OCR',subjects:['Psychology'],description:'Hypotheses, variables, experimental design, sampling and ethics.',url:'https://www.youtube.com/watch?v=gi8WLkqtGME'},
  {id:'religion-ethics',title:'Buddhist ethics',creator:'YouTube lesson',level:'GCSE · AQA',subjects:['Religious Studies'],description:'An introduction to karuna, metta and karma.',url:'https://www.youtube.com/watch?v=7pCtNPoZjqk'},
  {id:'music-listening',title:'Practice listening questions',creator:'YouTube lesson',level:'GCSE',subjects:['Music'],description:'Practise responding to unfamiliar musical extracts.',url:'https://www.youtube.com/watch?v=BRz8pJ9LDHQ'},
  {id:'french-phrases',title:'French phrases for speaking and writing',creator:'YouTube lesson',level:'GCSE',subjects:['French'],description:'A selection of phrases to explore for GCSE French.',url:'https://www.youtube.com/watch?v=Nm2bsLQm_uQ'},
  {id:'spanish-conjugation',title:'Spanish conjugation practice',creator:'YouTube lesson',level:'GCSE',subjects:['Spanish'],description:'Practise several Spanish verb tenses.',url:'https://www.youtube.com/watch?v=MzIwom-GJ3Q'},
  {id:'history-medicine',title:'Medicine through time',creator:'YouTube lesson',level:'GCSE · OCR',subjects:['History'],description:'An overview of a specific history course topic; check it against your specification.',url:'https://www.youtube.com/watch?v=TtZNM5bnQGg'}
];

export function filterVideos(items, query = '', subject = 'My subjects', selected = []) {
  const term = query.trim().toLowerCase();
  return items.filter(video => {
    const subjectMatch = subject === 'All subjects' || (subject === 'My subjects'
      ? video.subjects.some(name => selected.includes(name))
      : video.subjects.includes(subject));
    const haystack = [video.title, video.creator, video.level, video.description, ...video.subjects].join(' ').toLowerCase();
    return subjectMatch && (!term || haystack.includes(term));
  });
}
