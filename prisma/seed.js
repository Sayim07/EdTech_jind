const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // This script DELETES every user, course and enrollment and creates accounts with known passwords.
  // It exists for a throwaway local database only.
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DESTRUCTIVE_SEED !== 'yes') {
    console.error('Refusing to run: the seed wipes all data and creates users with public passwords.
Set ALLOW_DESTRUCTIVE_SEED=yes to run it on a disposable local database.');
    process.exit(1);
  }
  console.log('Seeding EdTech Jindal database with authentic CIM WEB curriculum...');

  // 1. Clean existing records
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users (Only admin and student requested by user)
  const adminPassword = await bcrypt.hash('admin123', 10);
  const student1Password = await bcrypt.hash('stud123@1', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Executive Admin',
      email: 'admin@gmail.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const student1 = await prisma.user.create({
    data: {
      name: 'Student One',
      email: 'student1@gmail.com',
      passwordHash: student1Password,
      role: 'STUDENT',
    },
  });

  console.log(`Created admin: ${admin.email} (pass: admin123)`);
  console.log(`Created fresher student1: ${student1.email} (pass: stud123@1)`);

  // ==========================================
  // 3. COURSE 1: THE ORIGIN OF FOOD & HUMAN EVOLUTION
  // ==========================================
  const courseOrigin = await prisma.course.create({
    data: {
      title: 'The Origin of Food & Human Evolution',
      slug: 'origin-of-food-evolution',
      shortDescription: 'How fire, ancient hearths, animal domestication, and first crops re-engineered human anatomy and culture.',
      description: 'Explore half a million years of kitchen engineering, the biological trap of early farming, and the culinary revolutions that formed civilization. Features authentic master recordings, interactive slide decks, master audio podcasts, and high-res infographics from CIM Jindal.',
      thumbnail: '/covers/origin-of-food.jpg',
      faqs: JSON.stringify([{"q": "Do I need any prior knowledge of history or nutrition?", "a": "No. The course starts from the beginning and builds up. It suits curious beginners as well as readers who already know the basics."}, {"q": "What do I receive with the course?", "a": "Video lectures, downloadable slide decks, an audio podcast version of each lecture, summary infographics and assignments for every module."}, {"q": "How long do I have access?", "a": "Access is for life. You can learn at your own pace on mobile or desktop and come back to any lesson."}, {"q": "Will I get a certificate?", "a": "Yes. Finish every lesson and your certificate of completion is released automatically. You can view and print it from the Purchases & Certificates page."}]),
      price: 1999,
      originalPrice: 3999,
      level: 'All Levels',
      category: 'Anthropology & Gastronomy',
      instructorName: 'Prof. C.I.M. Jindal',
      featured: true,
      published: true,
      modules: {
        create: [
          // Module 1: Origin of Fire
          {
            title: 'Module 1: The Spark of Humanity & Controlled Fire',
            order: 1,
            lessons: {
              create: [
                {
                  title: '1.1 The Spark of Humanity: Fire & Anatomy',
                  slug: 'spark-of-humanity',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/spark-of-humanity.mp4',
                  fileUrl: '/media/forged-by-fire.pptx',
                  audioUrl: '/media/fire-reengineered-anatomy.m4a',
                  infographicUrl: '/media/fire-evolution.png',
                  duration: '14:20',
                  content: 'How the biological discovery of controlled thermal cooking reduced human digestive tract expenditure, accelerated brain encephalization, and forged modern hominid social bonding around the nocturnal hearth.',
                  assignments: {
                    create: [
                      {
                        title: 'Anatomical Re-engineering Thesis',
                        description: 'Critically evaluate the metabolic tradeoffs of cooked food vs raw food in early hominids based on Richard Wrangham\'s cooking hypothesis.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 2: Ancient Kitchen
          {
            title: 'Module 2: Half a Million Years of Kitchen Engineering',
            order: 2,
            lessons: {
              create: [
                {
                  title: '1.2 Evolution of the Human Kitchen: Hearth to Clay Oven',
                  slug: 'evolution-of-the-kitchen',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/kitchen-evolution.mp4',
                  fileUrl: '/media/hearth-to-heart.pptx',
                  audioUrl: '/media/kitchen-engineering.m4a',
                  infographicUrl: '/media/kitchen-evolution.png',
                  duration: '18:45',
                  content: 'Chronicles the progression from stone-age ground roasting pits and heated-rock water boiling to domed clay bread ovens and the birth of communal kitchen architecture.',
                  assignments: {
                    create: [
                      {
                        title: 'Paleolithic Hearth Engineering Diagram',
                        description: 'Diagram and explain the thermal efficiency differences between an open rock-pit hearth and an insulated mud-brick domed oven.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 3: Animal Domestication
          {
            title: 'Module 3: The Symbiotic Blueprint & Animal Domestication',
            order: 3,
            lessons: {
              create: [
                {
                  title: '1.3 How Animals Rewired Human Biology & History',
                  slug: 'animal-domestication',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/animal-domestication.mp4',
                  fileUrl: '/media/symbiotic-blueprint.pptx',
                  audioUrl: '/media/animals-rewired-biology.m4a',
                  infographicUrl: '/media/domestication-revolution.png',
                  duration: '16:10',
                  content: 'The symbiotic co-evolution between humans, canids, ovicaprids, and bovines. Explores how secondary pastoralist products (dairy, wool, traction) re-engineered human genetics via adult lactase persistence.',
                  assignments: {
                    create: [
                      {
                        title: 'Lactase Persistence & Pastoralist Expansion Analysis',
                        description: 'Explain the biocultural selection pressures that spread lactase persistence alleles across Bronze Age pastoral populations.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 4: Bread & Beer
          {
            title: 'Module 4: Elemental Alchemies: The Bread or Beer Dilemma',
            order: 4,
            lessons: {
              create: [
                {
                  title: '1.4 Bread or Beer: How Fermentation Built Civilization',
                  slug: 'bread-or-beer',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/bread-or-beer.mp4',
                  fileUrl: '/media/elemental-alchemies.pptx',
                  audioUrl: '/media/fire-beer-humanity.m4a',
                  infographicUrl: '/media/roasting-brewing.png',
                  duration: '15:30',
                  content: 'The famous Robert Braidwood vs Solomon Katz debate: Did foraging bands settle into sedentary Natufian hamlets to harvest bread, or to brew communal beer? Examination of wild yeast, malt conversion, and ritual feast vessels.',
                  assignments: {
                    create: [
                      {
                        title: 'The Fermentation Sedentism Essay',
                        description: 'Argue whether beer fermentation or bread production provided the primary initial catalyst for sedentary grain cultivation.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 5: Hunter Gatherer to Agriculture
          {
            title: 'Module 5: The Biological Trap of Early Farming',
            order: 5,
            lessons: {
              create: [
                {
                  title: '1.5 Climate Birthed Agriculture: Rethinking the Neolithic Paradox',
                  slug: 'climate-birthed-agriculture',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/climate-birthed-agriculture.mp4',
                  fileUrl: '/media/rethinking-agriculture.pptx',
                  audioUrl: '/media/trap-early-farming.m4a',
                  infographicUrl: '/media/paradox-agriculture.png',
                  duration: '22:15',
                  content: 'Paleopathological skeletal evidence reveals that the transition to cereal agriculture initially brought increased infectious diseases, nutritional stunting, and dental caries compared to diverse forager diets. How climate shocks forced this irreversible transformation.',
                  assignments: {
                    create: [
                      {
                        title: 'Neolithic Skeletal Bioarchaeology Audit',
                        description: 'Compare osteological health markers (porotic hyperostosis, Harris lines, enamel hypoplasia) between late hunter-gatherers and early agriculturalists.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 6: Origin of First Crop
          {
            title: 'Module 6: The First Harvests: How Wild Weeds Became Food',
            order: 6,
            lessons: {
              create: [
                {
                  title: '1.6 Origin of First Crops: The Genetic Transformation of Grain',
                  slug: 'origin-of-first-crops',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/first-crops.mp4',
                  fileUrl: '/media/first-harvests.pptx',
                  audioUrl: '/media/wild-weeds-crops.m4a',
                  infographicUrl: '/media/global-agriculture.png',
                  duration: '19:50',
                  content: 'The genetic mutation from brittle to tough non-shattering rachis in wild emmer, einkorn, and barley across the Fertile Crescent, and the independent domestication centers in the Yangtze and Mesoamerica.',
                  assignments: {
                    create: [
                      {
                        title: 'Non-Shattering Rachis & Genetic Domestication',
                        description: 'Detail the evolutionary mechanics of how human sickle harvesting selected for mutant non-shattering grain stalks.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Created Course 1: ${courseOrigin.title} (6 modules, 6 videos, 6 PPTs, 6 audios, 6 infographics)`);

  // ==========================================
  // 4. COURSE 2: ANCIENT CIVILIZATIONS & THEIR FOOD TRADITIONS
  // ==========================================
  const courseCivilizations = await prisma.course.create({
    data: {
      title: 'Ancient Civilizations & Their Food Traditions',
      slug: 'ancient-civilizations-food',
      shortDescription: 'From Mesopotamian tablets and Egyptian beer pyramids to Greek symposia, Roman banquets, Persian courts, and Chinese dynasties.',
      description: 'Journey across the ancient Mediterranean, Near East, and East Asia to study how grand empires wielded cuisine as politics, religious spectacle, and social hierarchy. Features 8 authentic master recordings, PPT slide decks, audio podcasts, and historical infographics from CIM Jindal.',
      thumbnail: '/covers/ancient-civilizations.jpg',
      faqs: JSON.stringify([{"q": "Is this course connected to the Origin of Food course?", "a": "They complement each other, but each stands alone. You can take them in any order."}, {"q": "Are the assignments graded?", "a": "Yes. Submit your written answer for each assignment and you will see your score and feedback on the Assignments page."}, {"q": "Can I download the slides?", "a": "Every lesson with a slide deck has a Download Slides button, so you can study offline."}, {"q": "Will I get a certificate?", "a": "Yes. Complete every lesson to unlock your certificate of completion."}]),
      price: 1499,
      originalPrice: 2999,
      level: 'Intermediate',
      category: 'World History',
      instructorName: 'Prof. C.I.M. Jindal',
      featured: true,
      published: true,
      modules: {
        create: [
          // Module 1: Mesopotamian Cuisine
          {
            title: 'Module 1: Mesopotamian Cuisine & The First Written Recipes',
            order: 1,
            lessons: {
              create: [
                {
                  title: '2.1 Tasting Ancient Mesopotamia: Table of Gods',
                  slug: 'tasting-ancient-mesopotamia',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/tasting-mesopotamia.mp4',
                  fileUrl: '/media/table-of-gods.pptx',
                  audioUrl: '/media/mesopotamia-tasted-like.m4a',
                  infographicUrl: '/media/mesopotamian-timeline.png',
                  duration: '20:45',
                  content: 'Decoding the oldest surviving recipes in human history from the Yale Babylonian cuneiform culinary tablets (1750 BCE): rich meat stews, leek-shallot aromatics, and temple sacrificial banquets.',
                  assignments: {
                    create: [
                      {
                        title: 'Yale Babylonian Cuneiform Recipe Analysis',
                        description: 'Translate the culinary techniques of the Tuh\'u lamb stew and evaluate its balance of fats, aromatics, and beer reduction.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 2: Egyptian Bread & Beer
          {
            title: 'Module 2: Egyptian Bread, Beer & Pyramid Construction Logistics',
            order: 2,
            lessons: {
              create: [
                {
                  title: '2.2 Grain of Empire: Bread and Beer Powered the Pyramids',
                  slug: 'grain-of-empire-egypt',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/egyptian-bread-beer-pyramids.mp4',
                  fileUrl: '/media/grain-of-empire.pptx',
                  audioUrl: '/media/bread-beer-pyramids.m4a',
                  infographicUrl: '/media/egyptian-bread-beer.png',
                  duration: '24:10',
                  content: 'How standard state-rationed beer (heket) and emmer loaves fueled the massive workforce that quarried and erected the pyramids of the Old and Middle Kingdoms.',
                  assignments: {
                    create: [
                      {
                        title: 'State Caloric Logistics in Old Kingdom Egypt',
                        description: 'Calculate the required grain bushels, brewery capacity, and distribution infrastructure necessary to sustain 20,000 seasonal workers at Giza.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 3: Greek Banquets & Symposium
          {
            title: 'Module 3: Soil to Symposium: Dining & Democracy in Ancient Greece',
            order: 3,
            lessons: {
              create: [
                {
                  title: '2.3 Soil to Symposium: Dining in Ancient Greece',
                  slug: 'dining-in-ancient-greece',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/dining-ancient-greece.mp4',
                  fileUrl: '/media/soil-to-symposium.pptx',
                  audioUrl: '/media/pancakes-blood-soup-symposium.m4a',
                  infographicUrl: '/media/greek-dining-culture.png',
                  duration: '21:30',
                  content: 'From the austere Spartan common mess (syssitia) and black broth to the refined Athenian symposium: how diluted wine, kraters, and philosophical debate reinforced civic identity.',
                  assignments: {
                    create: [
                      {
                        title: 'The Symposiarch & Hegemonic Wine Dilution',
                        description: 'Analyze the cultural and political role of the symposiarch in enforcing moderation vs excess during classical Athenian symposia.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 4: Roman Feasts
          {
            title: 'Module 4: The Roman Palate: Power Dining & Weaponized Feasts',
            order: 4,
            lessons: {
              create: [
                {
                  title: '2.4 The Roman Palate: Lavish Banquets & The Chemistry of Garum',
                  slug: 'roman-palate-power-dining',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/roman-banquet.mp4',
                  fileUrl: '/media/roman-palate.pptx',
                  audioUrl: '/media/weaponized-feasts-garum.m4a',
                  infographicUrl: '/media/roman-power-dining.png',
                  duration: '22:50',
                  content: 'Weaponized feasts, sumptuary laws, the theatrical banquet of Trimalchio, and the empire-wide industrial manufacture of garum (fermented fish umami sauce).',
                  assignments: {
                    create: [
                      {
                        title: 'Garum Production & Roman Mediterranean Trade',
                        description: 'Examine the industrial archaeology of Spanish garum vat complexes and amphora shipping across the western provinces.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 5: Persian Royal Kitchens
          {
            title: 'Module 5: The Persian Synthesis: Imperial Gastronomy & Flavor Design',
            order: 5,
            lessons: {
              create: [
                {
                  title: '2.5 The Persian Recipe for Empire: How Royal Courts Invented Modern Flavor',
                  slug: 'persian-recipe-for-empire',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/persian-recipe-empire.mp4',
                  fileUrl: '/media/persian-synthesis.pptx',
                  audioUrl: '/media/royal-courts-flavor.m4a',
                  infographicUrl: '/media/flavor-persian-cuisine.png',
                  duration: '19:20',
                  content: 'Achaemenid, Parthian, and Sasanian banquet etiquette: the invention of sweet-and-sour flavor balances, pomegranate molasses, saffron pilafs, and almond confectionery that shaped Islamic and European court cuisines.',
                  assignments: {
                    create: [
                      {
                        title: 'Persian Imperial Culinary Diffusion',
                        description: 'Trace how Sasanian court gastronomy migrated into the Abbasid Caliphate and eventually influenced medieval European cuisine.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },

          // Module 6: Chinese Dynasties & Food Traditions
          {
            title: 'Module 6: Chinese Dynasties: 5,000 Years of Flavor & The Edible Empire',
            order: 6,
            lessons: {
              create: [
                {
                  title: '2.6 The 30 Pillars of Chinese Cuisine & The Wok Revolution',
                  slug: 'chinese-dynasties-food-traditions',
                  order: 1,
                  type: 'VIDEO',
                  videoUrl: '/media/chinese-5000-years-flavor.mp4',
                  fileUrl: '/media/chinese-30-pillars.pptx',
                  audioUrl: '/media/chinese-history-science-cooking.m4a',
                  infographicUrl: '/media/chinese-culinary-methods.png',
                  duration: '28:15',
                  content: 'From ancient sacrificial bronze ding cauldrons of the Shang and Zhou to the Song dynasty urban restaurant explosion. Explores the wok revolution forced by fuel shortages, the geographic matrix of regional cuisines, and the 30 classical cooking techniques.',
                  assignments: {
                    create: [
                      {
                        title: 'Fuel Scarcity & The Thermodynamic Invention of the Wok',
                        description: 'Explain how deforestation in northern China during the Song dynasty spurred the development of fast stir-frying and uniform ingredient cutting.',
                        maxScore: 100,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  });

  console.log(`Created Course 2: ${courseCivilizations.title} (6 civilizational modules, 8 videos, 7 PPTs, audios, infographics)`);
  console.log('Seeding completed successfully with all authentic CIM WEB contents!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
