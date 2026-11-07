import { starterExpansions } from './starter-expansions.js?v=20261107-1';
// Original introductory revision cards. Coverage is deliberately labelled as
// general GCSE-level material, not a complete exam-board specification.
export const extraDecks = [
  {id:'bio-transport',subject:'Biology',title:'Transport in cells',description:'Diffusion, osmosis and active transport',color:'mint',cards:[
    ['What is diffusion?','The net movement of particles from an area of higher concentration to an area of lower concentration.'],
    ['What is osmosis?','The net movement of water molecules through a partially permeable membrane from a dilute solution to a more concentrated solution.'],
    ['What is active transport?','The movement of substances against a concentration gradient using energy from respiration.'],
    ['Name one factor that increases the rate of diffusion.','A steeper concentration gradient, higher temperature or larger surface area.'],
    ['Why do root hair cells have a large surface area?','To increase the absorption of water and mineral ions from the soil.']
  ]},
  {id:'bio-organisation',subject:'Biology',title:'Organisation & digestion',description:'Tissues, organs and enzymes',color:'mint',cards:[
    ['What is a tissue?','A group of similar cells working together to perform a function.'],
    ['What is an organ?','A group of different tissues working together to perform a function.'],
    ['What do enzymes do?','They act as biological catalysts, speeding up reactions without being used up.'],
    ['What does amylase break down?','Starch into sugars.'],
    ['What can happen to an enzyme at a very high temperature?','It can denature: its active site changes shape, so its substrate no longer fits.']
  ]},
  {id:'bio-infection',subject:'Biology',title:'Infection & response',description:'Pathogens, immunity and prevention',color:'mint',cards:[
    ['What is a pathogen?','A microorganism that causes disease.'],
    ['Name four types of pathogen.','Bacteria, viruses, fungi and protists.'],
    ['How do white blood cells defend the body?','They can engulf pathogens, produce antibodies and produce antitoxins.'],
    ['How does vaccination protect against disease?','It exposes the immune system to antigens so memory cells can produce a faster response on future infection.'],
    ['Do antibiotics work against viruses?','No. Antibiotics target bacteria, not viruses.']
  ]},
  {id:'bio-photosynthesis',subject:'Biology',title:'Photosynthesis & respiration',description:'Energy transfers in living things',color:'mint',cards:[
    ['What is the word equation for photosynthesis?','Carbon dioxide + water → glucose + oxygen, using light energy.'],
    ['Where does photosynthesis take place in plant cells?','In chloroplasts, which contain chlorophyll.'],
    ['Give one limiting factor of photosynthesis.','Light intensity, carbon dioxide concentration or temperature.'],
    ['What is aerobic respiration?','A process that releases energy from glucose using oxygen.'],
    ['What are the products of aerobic respiration?','Carbon dioxide and water.']
  ]},
  {id:'bio-inheritance',subject:'Biology',title:'Inheritance & variation',description:'DNA, genes and reproduction',color:'mint',cards:[
    ['What is a gene?','A section of DNA that codes for a particular protein or functional RNA.'],
    ['What is an allele?','A different version of a gene.'],
    ['What does homozygous mean?','Having two identical alleles for a gene.'],
    ['What does heterozygous mean?','Having two different alleles for a gene.'],
    ['What is variation?','Differences in characteristics between individuals of the same species.']
  ]},
  {id:'chem-bonding',subject:'Chemistry',title:'Bonding basics',description:'Ionic, covalent and metallic bonding',color:'lilac',cards:[
    ['How is an ionic bond formed?','By electrostatic attraction between oppositely charged ions after electrons are transferred.'],
    ['What is a covalent bond?','A shared pair of electrons between atoms.'],
    ['What is metallic bonding?','The attraction between positive metal ions and delocalised electrons.'],
    ['Why can molten ionic compounds conduct electricity?','Their ions are free to move and carry charge.'],
    ['Why do simple molecular substances often have low boiling points?','The forces between their molecules are relatively weak.']
  ]},
  {id:'chem-periodic',subject:'Chemistry',title:'The periodic table',description:'Groups, periods and reactivity',color:'lilac',cards:[
    ['How is the modern periodic table arranged?','In order of increasing atomic number.'],
    ['What do elements in the same group have in common?','They have the same number of electrons in their outer shell and similar chemical properties.'],
    ['What is Group 1 called?','The alkali metals.'],
    ['What is Group 7 called?','The halogens.'],
    ['Why are noble gases generally unreactive?','They have full outer electron shells.']
  ]},
  {id:'chem-reactions',subject:'Chemistry',title:'Chemical reactions',description:'Equations, conservation and reactions',color:'lilac',cards:[
    ['Why must a chemical equation be balanced?','Atoms are conserved, so each element must have the same number of atoms on both sides.'],
    ['What is oxidation in terms of oxygen?','The gain of oxygen.'],
    ['What is reduction in terms of oxygen?','The loss of oxygen.'],
    ['What is an exothermic reaction?','A reaction that transfers energy to the surroundings.'],
    ['What is an endothermic reaction?','A reaction that takes in energy from the surroundings.']
  ]},
  {id:'chem-acids',subject:'Chemistry',title:'Acids & alkalis',description:'pH, neutralisation and salts',color:'lilac',cards:[
    ['What is the pH of a neutral solution at 25°C?','pH 7.'],
    ['Which ions do acids produce in aqueous solution?','Hydrogen ions, H⁺.'],
    ['Which ions do alkalis produce in aqueous solution?','Hydroxide ions, OH⁻.'],
    ['What are the products of an acid reacting with a metal oxide?','A salt and water.'],
    ['What are the products of an acid reacting with a carbonate?','A salt, water and carbon dioxide.']
  ]},
  {id:'chem-rates',subject:'Chemistry',title:'Rates of reaction',description:'Collision theory and catalysts',color:'lilac',cards:[
    ['How can temperature affect reaction rate?','Higher temperature usually increases the rate because particles collide more often and with more energy.'],
    ['What is activation energy?','The minimum energy that particles need for a successful reaction.'],
    ['What does a catalyst do?','It increases the reaction rate by providing a pathway with a lower activation energy.'],
    ['Why does a powder often react faster than a lump?','The powder has a larger surface area exposed to the reactants.'],
    ['How does increasing concentration often affect reaction rate?','It increases collision frequency, usually increasing the rate.']
  ]},
  {id:'physics-electricity',subject:'Physics',title:'Electric circuits',description:'Current, voltage and resistance',color:'blue',cards:[
    ['What is electric current?','The rate of flow of charge.'],
    ['What is the unit of current?','The ampere (A).'],
    ['What is the equation linking potential difference, current and resistance?','Potential difference = current × resistance (V = IR).'],
    ['What happens to current at every point in a series circuit?','It is the same at every point.'],
    ['How is potential difference arranged across parallel branches?','Each branch has the same potential difference.']
  ]},
  {id:'physics-forces',subject:'Physics',title:'Forces & motion',description:'Speed, acceleration and Newton’s laws',color:'blue',cards:[
    ['What is the equation for speed?','Speed = distance ÷ time.'],
    ['What is acceleration?','The rate of change of velocity.'],
    ['What is the equation linking force, mass and acceleration?','Resultant force = mass × acceleration (F = ma).'],
    ['What is weight?','The force acting on an object due to gravity.'],
    ['What is the unit of force?','The newton (N).']
  ]},
  {id:'physics-waves',subject:'Physics',title:'Waves',description:'Frequency, wavelength and the spectrum',color:'blue',cards:[
    ['What is wavelength?','The distance between corresponding points on adjacent waves.'],
    ['What is frequency?','The number of waves passing a point each second, measured in hertz.'],
    ['What is the wave speed equation?','Wave speed = frequency × wavelength.'],
    ['What is a transverse wave?','A wave in which oscillations are perpendicular to the direction of energy transfer.'],
    ['Are electromagnetic waves transverse or longitudinal?','Transverse.']
  ]},
  {id:'physics-energy',subject:'Physics',title:'Energy calculations',description:'Power, efficiency and energy transfer',color:'blue',cards:[
    ['What is power?','The rate at which energy is transferred.'],
    ['What is the equation for power?','Power = energy transferred ÷ time.'],
    ['What is the unit of power?','The watt (W).'],
    ['How is efficiency calculated?','Useful output energy ÷ total input energy (multiply by 100 for a percentage).'],
    ['What does insulation reduce?','The rate of energy transfer to the surroundings by heating.']
  ]},
  {id:'maths-fractions',subject:'Mathematics',title:'Fractions & percentages',description:'Core number skills',color:'peach',cards:[
    ['How do you multiply fractions?','Multiply the numerators together and the denominators together, then simplify.'],
    ['How do you divide by a fraction?','Multiply by its reciprocal.'],
    ['What is 25% as a fraction?','One quarter, or 1/4.'],
    ['How do you find 10% of a number?','Divide the number by 10.'],
    ['How do you calculate percentage change?','Change ÷ original value × 100%.']
  ]},
  {id:'maths-equations',subject:'Mathematics',title:'Equations & expressions',description:'Solving and simplifying algebra',color:'peach',cards:[
    ['Simplify 4x + 3x.','7x.'],
    ['Expand 2(x + 5).','2x + 10.'],
    ['Solve x − 7 = 12.','x = 19.'],
    ['Solve 5x = 35.','x = 7.'],
    ['What does it mean to factorise an expression?','To write it as a product of factors, for example 2x + 6 = 2(x + 3).']
  ]},
  {id:'maths-geometry',subject:'Mathematics',title:'Geometry essentials',description:'Angles, area and Pythagoras',color:'peach',cards:[
    ['What is the sum of angles in a triangle?','180°.'],
    ['What is the sum of angles on a straight line?','180°.'],
    ['How do you calculate the area of a triangle?','½ × base × perpendicular height.'],
    ['What is the circumference of a circle?','2πr, or πd.'],
    ['What is Pythagoras’ theorem?','For a right-angled triangle, a² + b² = c², where c is the hypotenuse.']
  ]},
  {id:'maths-statistics',subject:'Mathematics',title:'Statistics & probability',description:'Averages, range and chance',color:'peach',cards:[
    ['How do you calculate the mean?','Add all values and divide by the number of values.'],
    ['What is the median?','The middle value when the data is ordered; for an even number, average the two middle values.'],
    ['What is the mode?','The most frequent value.'],
    ['How do you find the range?','Subtract the smallest value from the largest.'],
    ['What is the probability of an impossible event?','0.']
  ]},
  {id:'english-techniques',subject:'English Literature',title:'Language techniques',description:'Imagery, sound and writer’s choices',color:'yellow',cards:[
    ['What is a simile?','A comparison using “like” or “as”.'],
    ['What is personification?','Giving human qualities to something non-human.'],
    ['What is alliteration?','The repetition of initial consonant sounds in nearby words.'],
    ['What is juxtaposition?','Placing contrasting ideas or images close together for effect.'],
    ['Why analyse individual words in a quotation?','To explain how their connotations contribute to meaning and effect.']
  ]},
  {id:'english-structure',subject:'English Literature',title:'Structure & narrative',description:'Perspective, contrast and endings',color:'yellow',cards:[
    ['What is narrative perspective?','The position or viewpoint from which a story is told.'],
    ['What is a first-person narrator?','A narrator who tells the story using “I” or “we”.'],
    ['What is foreshadowing?','A hint about an event that may happen later in a text.'],
    ['What is a structural shift?','A change in focus, time, setting or perspective within a text.'],
    ['Why consider a text’s ending?','It can shape the reader’s final understanding of characters, themes and ideas.']
  ]},
  {id:'history-evidence',subject:'History',title:'Historical evidence',description:'Sources, interpretations and context',color:'pink',cards:[
    ['What is a secondary source?','An account or interpretation produced after the events being studied.'],
    ['What is an interpretation?','A way of explaining or presenting the past, often shaped by evidence and perspective.'],
    ['What does reliability mean?','How far a source can be trusted for a particular question, considering its content and origin.'],
    ['Why might two interpretations differ?','Their authors may use different evidence, perspectives or purposes.'],
    ['How should you support a historical argument?','Use accurate, relevant evidence and explain how it supports your judgement.']
  ]},
  {id:'history-causation',subject:'History',title:'Cause & consequence',description:'Building historical explanations',color:'pink',cards:[
    ['What is a long-term cause?','A factor that develops over a longer period before an event.'],
    ['What is a short-term trigger?','An immediate event or factor that helps bring about a change.'],
    ['What is a consequence?','A result or effect of an event or development.'],
    ['What does continuity mean in history?','Things that stay similar over a period of time.'],
    ['How can you compare the importance of causes?','Explain how each contributed and justify which had the greatest impact.']
  ]},
  {id:'geography-rivers',subject:'Geography',title:'River processes',description:'Erosion, transport and deposition',color:'blue',cards:[
    ['What is erosion?','The wearing away of rock or soil.'],
    ['What is deposition?','The dropping of material carried by a river, often when it loses energy.'],
    ['What is hydraulic action?','Erosion caused by the force of water against the river bed and banks.'],
    ['What is a meander?','A bend in a river channel.'],
    ['Where is deposition common on a meander?','On the inner bend, where water moves more slowly.']
  ]},
  {id:'geography-climate',subject:'Geography',title:'Climate & ecosystems',description:'Climate, weather and food webs',color:'mint',cards:[
    ['What is the difference between weather and climate?','Weather is the short-term state of the atmosphere; climate is the long-term pattern of weather.'],
    ['What is an ecosystem?','A community of living organisms interacting with each other and their physical environment.'],
    ['What is a producer?','An organism, usually a plant, that makes its own food.'],
    ['What is biodiversity?','The variety of living organisms in an area.'],
    ['Name one greenhouse gas.','Carbon dioxide, methane or water vapour are examples.']
  ]},
  {id:'cs-systems',subject:'Computer Science',title:'Computer systems',description:'CPU, memory and storage',color:'lilac',cards:[
    ['What does the CPU do?','It processes instructions and controls the operation of the computer.'],
    ['What is RAM?','Volatile main memory used to hold programs and data currently in use.'],
    ['What does volatile memory mean?','Its contents are lost when power is removed.'],
    ['What is secondary storage?','Non-volatile storage used to retain data and programs long term.'],
    ['What is an operating system?','System software that manages hardware and provides services for applications.']
  ]},
  {id:'cs-programming',subject:'Computer Science',title:'Programming concepts',description:'Variables, loops and algorithms',color:'lilac',cards:[
    ['What is an algorithm?','A sequence of steps for solving a problem.'],
    ['What is a variable?','A named storage location whose value can change while a program runs.'],
    ['What is selection?','Choosing which instructions to execute based on a condition.'],
    ['What is iteration?','Repeating instructions, for example using a loop.'],
    ['What is a Boolean value?','A value that is either true or false.']
  ]}
];

// Additional introductory sets for popular subject choices.
extraDecks.push(
  {id:'english-language',subject:'English Language',title:'Reading & writing',description:'Purpose, audience and language choices',color:'yellow',cards:[['What is the audience of a text?','The people a text is intended for.'],['What is the purpose of a text?','The reason it was written, such as to inform, persuade or entertain.'],['What is tone?','The attitude or feeling conveyed by a writer’s language.']]},
  {id:'business-basics',subject:'Business Studies',title:'Business basics',description:'Revenue, costs and profit',color:'peach',cards:[['What is revenue?','The income from sales: selling price multiplied by quantity sold.'],['What is profit?','Total revenue minus total costs.'],['What is a fixed cost?','A cost that does not change directly with output in the short term, such as rent.']]},
  {id:'economics-markets',subject:'Economics',title:'Markets & choices',description:'Scarcity, demand and supply',color:'peach',cards:[['What is scarcity?','Resources are limited while wants are unlimited.'],['What is opportunity cost?','The next best alternative given up when a choice is made.'],['What is demand?','The quantity consumers are willing and able to buy at a given price.']]},
  {id:'psychology-research',subject:'Psychology',title:'Research methods',description:'Variables, samples and ethics',color:'lilac',cards:[['What is a hypothesis?','A testable prediction about a relationship or difference.'],['What is an independent variable?','The variable a researcher changes in an experiment.'],['What is informed consent?','Participants agree to take part after receiving enough information to make a decision.']]},
  {id:'sociology-basics',subject:'Sociology',title:'Society & research',description:'Socialisation and evidence',color:'lilac',cards:[['What is socialisation?','The process of learning the norms and values of a society.'],['What are social norms?','Shared expectations about behaviour in a group or society.'],['What is qualitative data?','Non-numerical data, such as descriptions or interview responses.']]},
  {id:'religious-ethics',subject:'Religious Studies',title:'Ethics & belief',description:'Key terms for exploring beliefs',color:'yellow',cards:[['What is ethics?','The study of ideas about right and wrong conduct.'],['What is a secular view?','A perspective not based on religious belief.'],['What is religious diversity?','The presence of different religious beliefs and practices within a community.']]},
  {id:'pe-training',subject:'Physical Education',title:'Fitness & training',description:'Training principles and fitness',color:'blue',cards:[['What is cardiovascular endurance?','The ability of the heart and lungs to supply oxygen during sustained exercise.'],['What does progressive overload mean?','Gradually increasing training demands to improve performance.'],['Why is recovery important after exercise?','It allows the body to repair and adapt between training sessions.']]},
  {id:'french-intro',subject:'French',title:'Everyday French',description:'Simple phrases and vocabulary',color:'pink',cards:[['What does “bonjour” mean?','Hello or good morning.'],['What does “merci” mean?','Thank you.'],['What does “je suis” mean?','I am.']]},
  {id:'spanish-intro',subject:'Spanish',title:'Everyday Spanish',description:'Simple phrases and vocabulary',color:'pink',cards:[['What does “hola” mean?','Hello.'],['What does “gracias” mean?','Thank you.'],['What does “soy” mean?','I am, from the verb ser.']]},
  {id:'german-intro',subject:'German',title:'Everyday German',description:'Simple phrases and vocabulary',color:'pink',cards:[['What does “hallo” mean?','Hello.'],['What does “danke” mean?','Thank you.'],['What does “ich bin” mean?','I am.']]},
  {id:'dt-design',subject:'Design and Technology',title:'Design process',description:'Briefs, prototypes and evaluation',color:'mint',cards:[['What is a design brief?','A statement of the problem or need a design should address.'],['What is a prototype?','An early model used to test and develop a design.'],['Why evaluate a design?','To identify how well it meets requirements and how it could be improved.']]},
  {id:'music-basics',subject:'Music',title:'Music vocabulary',description:'Tempo, pitch and dynamics',color:'lilac',cards:[['What is tempo?','The speed of music.'],['What is pitch?','How high or low a sound is.'],['What are dynamics?','The varying loudness or softness of music.']]},
  {id:'art-basics',subject:'Art and Design',title:'Visual elements',description:'Colour, tone and composition',color:'yellow',cards:[['What is tone in art?','The lightness or darkness of a colour or area.'],['What is composition?','The arrangement of visual elements in an artwork.'],['What is texture?','The way a surface feels or appears to feel.']]},
  {id:'media-audience',subject:'Media Studies',title:'Media concepts',description:'Audience, representation and purpose',color:'blue',cards:[['What is a target audience?','The group a media product is intended to reach.'],['What is representation?','The way people, places or ideas are presented in media.'],['What is media language?','The techniques and choices used to communicate meaning in a media product.']]},
  {id:'politics-basics',subject:'Politics',title:'Democracy & government',description:'Government and representation',color:'pink',cards:[['What is democracy?','A system in which political power is exercised by the people, often through elected representatives.'],['What is a constitution?','The rules and principles that establish how a state is governed.'],['What is an election?','A process in which people vote to choose representatives or decide an issue.']]},
  {id:'food-nutrition',subject:'Food Preparation and Nutrition',title:'Nutrition basics',description:'Macronutrients and food safety',color:'peach',cards:[['What is the main role of carbohydrates?','They are a source of energy.'],['What is one important role of protein?','It helps the body grow and repair tissues.'],['Why should raw and cooked foods be kept separate?','To reduce the risk of cross-contamination.']]}
);

extraDecks.push(
  {id:'further-maths-functions',subject:'Further Mathematics',title:'Functions and graphs',description:'Domain, range and inverse functions',color:'peach',cards:[['What is the domain of a function?','The set of permitted input values.'],['What is the range of a function?','The set of output values the function can produce.'],['What does an inverse function do?','It reverses the mapping of the original function where an inverse exists.']]},
  {id:'combined-science-methods',subject:'Combined Science',title:'Scientific methods',description:'Variables and reliable results',color:'mint',cards:[['What is a control variable?','A factor kept the same to make a test fair.'],['Why repeat measurements?','To identify anomalies and improve confidence in the results.'],['What is a dependent variable?','The variable measured in an investigation.']]},
  {id:'citizenship-democracy',subject:'Citizenship',title:'Rights and democracy',description:'Rights, responsibilities and representation',color:'blue',cards:[['What is a legal right?','An entitlement protected by law.'],['What is a responsibility?','A duty or obligation towards others or society.'],['What is representation in a democracy?','Elected people act on behalf of those who voted for them.']]},
  {id:'law-basics',subject:'Law',title:'Law fundamentals',description:'Courts and legal concepts',color:'pink',cards:[['What is criminal law concerned with?','Offences against the state or public, which may result in punishment.'],['What is civil law concerned with?','Disputes between individuals or organisations, often involving remedies.'],['What is precedent?','A legal decision that may guide or bind later decisions in similar cases.']]},
  {id:'accounting-basics',subject:'Accounting',title:'Accounting basics',description:'Assets, liabilities and capital',color:'peach',cards:[['What is an asset?','A resource controlled by a business that has economic value.'],['What is a liability?','An obligation a business owes to another party.'],['What is the basic accounting equation?','Assets = liabilities + equity.']]},
  {id:'statistics-sampling',subject:'Statistics',title:'Sampling data',description:'Populations and samples',color:'peach',cards:[['What is a population in statistics?','The full group being studied.'],['What is a sample?','A subset of a population used to collect data.'],['What is sampling bias?','A systematic tendency for a sample to misrepresent the population.']]},
  {id:'film-basics',subject:'Film Studies',title:'Film language',description:'Shots, sound and editing',color:'yellow',cards:[['What is a close-up?','A shot that frames a subject tightly to show detail.'],['What is diegetic sound?','Sound originating within the world of the film.'],['What is editing?','The selection and arrangement of shots to create a sequence.']]},
  {id:'photography-light',subject:'Photography',title:'Photography basics',description:'Exposure and composition',color:'yellow',cards:[['What is aperture?','The opening in a lens that controls how much light enters.'],['What does shutter speed control?','How long the camera sensor is exposed to light.'],['What is composition?','The arrangement of elements within an image.']]},
  {id:'graphics-design',subject:'Graphic Design',title:'Design principles',description:'Hierarchy, contrast and layout',color:'yellow',cards:[['What is visual hierarchy?','The arrangement of elements to guide the viewer’s attention.'],['What is contrast?','A difference between visual elements that helps them stand out.'],['What is typography?','The selection and arrangement of type.']]},
  {id:'drama-basics',subject:'Drama',title:'Drama skills',description:'Character, voice and staging',color:'lilac',cards:[['What is characterisation?','The choices used to create and communicate a character.'],['What is projection?','Using the voice clearly so an audience can hear it.'],['What is stage direction?','An instruction about movement, action or staging in a script.']]},
  {id:'dance-basics',subject:'Dance',title:'Dance concepts',description:'Movement and choreography',color:'lilac',cards:[['What is choreography?','The creation and arrangement of movement in a dance.'],['What is dynamics in dance?','The qualities of movement, such as force, speed and energy.'],['What is a motif?','A movement or short sequence that can be repeated and developed.']]},
  {id:'sport-science-training',subject:'Sport Science',title:'Training principles',description:'Adaptation, overload and recovery',color:'blue',cards:[['What is specificity in training?','Training should relate to the demands of the activity or goal.'],['What is progressive overload?','Increasing training demands gradually as fitness improves.'],['What is recovery?','Time for the body to repair and adapt after training.']]},
  {id:'health-care-basics',subject:'Health and Social Care',title:'Care values',description:'Dignity, confidentiality and consent',color:'mint',cards:[['What is confidentiality?','Keeping personal information private unless sharing is justified and appropriate.'],['What does dignity in care mean?','Treating a person with respect and valuing their individuality.'],['What is consent?','A person’s informed agreement to a proposed action.']]},
  {id:'child-dev-growth',subject:'Child Development',title:'Child development',description:'Physical, social and cognitive development',color:'mint',cards:[['What is physical development?','Changes in the body and physical skills as a child grows.'],['What is cognitive development?','The development of thinking, learning and understanding.'],['Why is play important?','It can support learning, creativity, social skills and physical development.']]},
  {id:'engineering-design',subject:'Engineering',title:'Engineering design',description:'Constraints and testing',color:'blue',cards:[['What is an engineering constraint?','A limit on a design, such as cost, size or material availability.'],['What is a prototype?','An early model used to test and improve a design.'],['Why test a design?','To check performance and safety against its requirements.']]},
  {id:'electronics-circuits',subject:'Electronics',title:'Electronic circuits',description:'Voltage, current and resistance',color:'blue',cards:[['What is current?','The rate of flow of electric charge.'],['What is resistance measured in?','Ohms (Ω).'],['What is Ohm’s law?','Potential difference = current × resistance (V = IR).']]},
  {id:'environment-systems',subject:'Environmental Science',title:'Environmental systems',description:'Resources and biodiversity',color:'mint',cards:[['What is a renewable resource?','A resource replenished naturally on a human timescale.'],['What is biodiversity?','The variety of living organisms in an area.'],['What is sustainability?','Meeting present needs while considering the ability of future generations to meet theirs.']]},
  {id:'geology-rocks',subject:'Geology',title:'Rock types',description:'Igneous, sedimentary and metamorphic rocks',color:'peach',cards:[['How do igneous rocks form?','When molten rock cools and solidifies.'],['How do sedimentary rocks often form?','Through deposition, compaction and cementation of sediments.'],['How do metamorphic rocks form?','Existing rocks are changed by heat and pressure without melting completely.']]},
  {id:'astronomy-space',subject:'Astronomy',title:'Space basics',description:'Stars, planets and orbits',color:'blue',cards:[['What is a star?','A hot sphere of gas that emits energy generated by nuclear fusion.'],['What is an orbit?','The path an object follows around another body due to gravity.'],['What is a light-year?','The distance light travels in a vacuum in one year.']]},
  {id:'latin-intro',subject:'Latin',title:'Latin language basics',description:'Grammar and vocabulary',color:'pink',cards:[['What is a noun?','A word naming a person, place, thing or idea.'],['What is a verb?','A word expressing an action, occurrence or state.'],['What does “et” mean in Latin?','And.']]},
  {id:'classical-civ-sources',subject:'Classical Civilisation',title:'Ancient sources',description:'Evidence from the ancient world',color:'pink',cards:[['What is archaeology?','The study of the past through material remains.'],['What is a primary source?','Evidence produced during the period being studied.'],['Why consider a source’s purpose?','It helps explain how the creator’s aims may shape its content.']]},
  {id:'philosophy-arguments',subject:'Philosophy',title:'Arguments & reasoning',description:'Premises, conclusions and validity',color:'lilac',cards:[['What is a premise?','A statement offered in support of a conclusion.'],['What is a conclusion?','The claim an argument is trying to establish.'],['What is a valid deductive argument?','One where the conclusion must follow if the premises are true.']]},
  {id:'criminology-basics',subject:'Criminology',title:'Crime & evidence',description:'Crime, evidence and explanations',color:'blue',cards:[['What is crime?','An act or omission that breaks criminal law.'],['What is a witness?','A person who provides evidence about an event or matter.'],['Why evaluate evidence?','To consider its relevance, reliability and limitations.']]},
  {id:'it-data',subject:'Information Technology',title:'Digital data',description:'Data, security and backups',color:'blue',cards:[['What is data?','Facts or values that can be stored and processed.'],['What is a backup?','A separate copy of data used for recovery if the original is lost or damaged.'],['What is phishing?','A fraudulent attempt to obtain information by impersonating a trusted source.']]},
  {id:'travel-tourism',subject:'Travel and Tourism',title:'Tourism basics',description:'Tourists, destinations and impacts',color:'mint',cards:[['What is domestic tourism?','Travel within a person’s own country for tourism.'],['What is inbound tourism?','Visits to a country by people who live in another country.'],['Name one possible impact of tourism.','It can create jobs, but may also place pressure on local environments.']]},
  {id:'textiles-fibres',subject:'Textiles',title:'Textile basics',description:'Fibres and fabric',color:'yellow',cards:[['What is a fibre?','A thin strand that can be used to make yarn or fabric.'],['What is a natural fibre?','A fibre obtained from a plant, animal or mineral source.'],['What is a synthetic fibre?','A manufactured fibre made from chemical substances.']]},
  {id:'product-design',subject:'Product Design',title:'Product design',description:'Users, briefs and prototypes',color:'mint',cards:[['What is a target user?','The person or group a product is designed for.'],['What is a specification?','A list of requirements that a design must meet.'],['Why prototype?','To test ideas and improve a product before final production.']]},
  {id:'hospitality-service',subject:'Hospitality',title:'Hospitality basics',description:'Service and hygiene',color:'peach',cards:[['What is customer service?','Helping customers and responding to their needs.'],['What is cross-contamination?','The transfer of harmful microorganisms or allergens between foods or surfaces.'],['Why is hand hygiene important?','It reduces the spread of contaminants and infection.']]},
  {id:'welsh-intro',subject:'Welsh',title:'Everyday Welsh',description:'Simple words and phrases',color:'pink',cards:[['What does “bore da” mean?','Good morning.'],['What does “diolch” mean?','Thank you.'],['What does “ie” mean?','Yes.']]}
);

// Append rather than reorder: review progress is indexed by deck and card position.
for (const deck of extraDecks) deck.cards.push(...(starterExpansions[deck.id] || []));

export function searchDecks(decks, query = '', subject = 'All') {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return decks.filter(deck => {
    if (subject !== 'All' && deck.subject !== subject) return false;
    const haystack = [deck.subject, deck.title, deck.description, ...deck.cards.flat()].join(' ').toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}
