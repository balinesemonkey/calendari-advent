/* =========================================================
   Scenes — the places between the cities.

   The 49 city pins are landmarks: a temple, a tower, a bridge.
   These are the country in between — the volcano you walk past,
   the river you ford, the pass you climb over. They pin to the
   card the same way, in the same two bands, so the walk is a
   run of photographs rather than a run of monuments.

   `t` is how far along the route the place sits; it snaps to the
   nearest door like the cities do. `wiki` is the English Wikipedia
   article tools/fetch-photos.py pulls the lead image from, and the
   photo lands at photos/scenes/<slug>.jpg. A scene with no file
   simply isn't drawn — unlike a city, it has no ink drawing to
   fall back to, because it isn't a landmark.
   ========================================================= */

const SCENES = [
  { t: 0.011, slug: "mount-agung",      wiki: "Mount Agung",                   name: "El volcà Agung",       where: "Bali" },
  { t: 0.033, slug: "tegallalang",      wiki: "Tegallalang",                   name: "Els arrossars",        where: "Bali" },
  { t: 0.057, slug: "mount-bromo",      wiki: "Mount Bromo",                   name: "El volcà Bromo",       where: "Java" },
  { t: 0.080, slug: "mount-merapi",     wiki: "Mount Merapi",                  name: "El volcà Merapi",      where: "Java" },
  { t: 0.104, slug: "krakatoa",         wiki: "Krakatoa",                      name: "El Krakatau",          where: "Sonda" },
  { t: 0.127, slug: "lake-toba",        wiki: "Lake Toba",                     name: "El llac Toba",         where: "Sumatra" },
  { t: 0.149, slug: "strait-of-malacca",wiki: "Strait of Malacca",             name: "L'estret de Malaca",   where: "Sonda" },
  { t: 0.170, slug: "cameron-highlands",wiki: "Cameron Highlands",             name: "Les terres altes",     where: "Malàisia" },
  { t: 0.191, slug: "taman-negara",     wiki: "Taman Negara",                  name: "La selva primària",    where: "Malàisia" },
  { t: 0.211, slug: "phang-nga-bay",    wiki: "Phang Nga Bay",                 name: "La badia de Phang Nga",where: "Siam" },
  { t: 0.233, slug: "khao-sok",         wiki: "Khao Sok National Park",        name: "Khao Sok",             where: "Siam" },
  { t: 0.255, slug: "chao-phraya",      wiki: "Chao Phraya River",             name: "El riu Chao Phraya",   where: "Siam" },
  { t: 0.277, slug: "doi-inthanon",     wiki: "Doi Inthanon",                  name: "El Doi Inthanon",      where: "Siam" },
  { t: 0.299, slug: "salween",          wiki: "Salween River",                 name: "El riu Salween",       where: "Myanmar" },
  { t: 0.321, slug: "irrawaddy",        wiki: "Irrawaddy River",               name: "L'Irauadi",            where: "Myanmar" },
  { t: 0.343, slug: "inle-lake",        wiki: "Inle Lake",                     name: "El llac Inle",         where: "Myanmar" },
  { t: 0.365, slug: "chin-hills",       wiki: "Chin Hills",                    name: "Els turons Chin",      where: "Myanmar" },
  { t: 0.387, slug: "sundarbans",       wiki: "Sundarbans",                    name: "Els Sundarbans",       where: "Bengala" },
  { t: 0.409, slug: "ganges-delta",     wiki: "Ganges Delta",                  name: "El delta del Ganges",  where: "Bengala" },
  { t: 0.431, slug: "ganges",           wiki: "Ganges",                        name: "El Ganges",            where: "L'Hindustan" },
  { t: 0.452, slug: "gangetic-plain",   wiki: "Indo-Gangetic Plain",           name: "La plana gangètica",   where: "L'Hindustan" },
  { t: 0.472, slug: "yamuna",           wiki: "Yamuna",                        name: "El riu Yamuna",        where: "L'Hindustan" },
  { t: 0.492, slug: "aravalli",         wiki: "Aravalli Range",                name: "Els Aravalli",         where: "L'Hindustan" },
  { t: 0.512, slug: "thar-desert",      wiki: "Thar Desert",                   name: "El desert del Thar",   where: "L'Hindustan" },
  { t: 0.533, slug: "sutlej",           wiki: "Sutlej",                        name: "El riu Sutlej",        where: "Panjab" },
  { t: 0.554, slug: "indus",            wiki: "Indus River",                   name: "L'Indus",              where: "Panjab" },
  { t: 0.575, slug: "salt-range",       wiki: "Salt Range",                    name: "La serra de la Sal",   where: "Panjab" },
  { t: 0.596, slug: "khyber-pass",      wiki: "Khyber Pass",                   name: "El pas de Khyber",     where: "Panjab" },
  { t: 0.616, slug: "hindu-kush",       wiki: "Hindu Kush",                    name: "L'Hindu Kush",         where: "Afganistan" },
  { t: 0.637, slug: "band-e-amir",      wiki: "Band-e Amir National Park",     name: "Band-e Amir",          where: "Afganistan" },
  { t: 0.658, slug: "registan",         wiki: "Registan Desert",               name: "El Registan",          where: "Afganistan" },
  { t: 0.679, slug: "dasht-e-kavir",    wiki: "Dasht-e Kavir",                 name: "El Dasht-e Kavir",     where: "Pèrsia" },
  { t: 0.700, slug: "alborz",           wiki: "Alborz",                        name: "L'Alborz",             where: "Pèrsia" },
  { t: 0.720, slug: "caspian-sea",      wiki: "Caspian Sea",                   name: "La mar Càspia",        where: "Pèrsia" },
  { t: 0.741, slug: "zagros",           wiki: "Zagros Mountains",              name: "Els Zagros",           where: "Pèrsia" },
  { t: 0.762, slug: "mount-ararat",     wiki: "Mount Ararat",                  name: "L'Ararat",             where: "Armènia" },
  { t: 0.782, slug: "lake-van",         wiki: "Lake Van",                      name: "El llac Van",          where: "Anatòlia" },
  { t: 0.803, slug: "cappadocia",       wiki: "Cappadocia",                    name: "La Capadòcia",         where: "Anatòlia" },
  { t: 0.825, slug: "bosporus",         wiki: "Bosporus",                      name: "El Bòsfor",            where: "Anatòlia" },
  { t: 0.846, slug: "rila",             wiki: "Rila",                          name: "El massís de Rila",    where: "Els Balcans" },
  { t: 0.866, slug: "danube",           wiki: "Danube",                        name: "El Danubi",            where: "Els Balcans" },
  { t: 0.886, slug: "plitvice",         wiki: "Plitvice Lakes National Park",  name: "Els llacs de Plitvice",where: "Els Balcans" },
  { t: 0.907, slug: "dolomites",        wiki: "Dolomites",                     name: "Les Dolomites",        where: "Llombardia" },
  { t: 0.928, slug: "alps",             wiki: "Alps",                          name: "Els Alps",             where: "Llombardia" },
  { t: 0.948, slug: "camargue",         wiki: "Camargue horse",                name: "La Camarga",           where: "Occitània" },
  { t: 0.967, slug: "calanques",        wiki: "Calanques National Park",       name: "Les Calanques",        where: "Occitània" },
  { t: 0.983, slug: "pyrenees",         wiki: "Pyrenees",                      name: "Els Pirineus",         where: "Catalunya" },
  { t: 0.995, slug: "montserrat",       wiki: "Montserrat (mountain)",         name: "Montserrat",           where: "Catalunya" },
];
