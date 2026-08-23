/* =========================================================
   The playlist.

   One entry per date, keyed YYYY-MM-DD. Generated from
   data/mixed-songs.json — the shared top-of-the-year list —
   with the single best-ranked song placed on the last door
   and the rest counting down backwards from there.
   ========================================================= */

const SONGS = {
  "2026-08-18": { title: "Mediterrània (feat. El Diluvi & …)", artist: "La Fúmiga", url: "https://music.apple.com/es/album/mediterr%C3%A0nia-feat-el-diluvi-vadebo/1804711459?i=1804711796&l=en-GB" },
  "2026-08-19": { title: "PIENSO EN TU MIRÁ (Cap.3: Celos)", artist: "ROSALÍA", url: "https://music.apple.com/es/album/pienso-en-tu-mir%C3%A1-cap-3-celos/1392446564?i=1392447206&l=en-GB" },
  "2026-08-20": { title: "Solo Quiero Bailar", artist: "Zenttric", url: "https://music.apple.com/es/album/solo-quiero-bailar/732185013?i=732185024&l=en-GB" },
  "2026-08-21": { title: "Don't Stop 'Til You Get Enough", artist: "Michael Jackson", url: "https://music.apple.com/es/album/off-the-wall/186166282?i=186166292&l=en-GB" },
  "2026-08-22": { title: "Video Games", artist: "Lana Del Rey", url: "https://music.apple.com/es/album/video-games-radio-edit/1667369849?i=1667370136&l=en-GB" },
  "2026-08-23": { title: "Toxic", artist: "Britney Spears", url: "https://music.apple.com/es/album/toxic/264025392?i=264025629&l=en-GB" },
  "2026-08-24": { title: "Laia", artist: "Sau", url: "https://music.apple.com/es/album/laia-directe-1996-concert-al-palau-desports/527168224?i=527168238&l=en-GB" },
  "2026-08-25": { title: "Estimar-te com la terra", artist: "Ginestà", url: "https://music.apple.com/es/album/estimar-te-com-la-terra/1483347447?i=1483347449&l=en-GB" },
  "2026-08-26": { title: "Amiga De Ningú", artist: "OQUES GRASSES", url: "https://music.apple.com/es/album/amiga-de-ning%C3%BA/1729835006?i=1729835019&l=en-GB" },
  "2026-08-27": { title: "Madness", artist: "Muse", url: "https://music.apple.com/es/album/madness/550281623?i=550281684&l=en-GB" },
  "2026-08-28": { title: "Copenhague", artist: "Valeria Castro", url: "https://music.apple.com/es/album/copenhague/1494683879?i=1494683881&l=en-GB" },
  "2026-08-29": { title: "Time Is Running Out", artist: "Muse", url: "https://music.apple.com/es/album/time-is-running-out/1716096819?i=1716096823&l=en-GB" },
  "2026-08-30": { title: "Juguete de Amor", artist: "Extrechinato y Tú", url: "https://music.apple.com/es/album/jugete-de-amor/101108338?i=101107735&l=en-GB" },
  "2026-08-31": { title: "Need You Now", artist: "Lady A", url: "https://music.apple.com/es/album/need-you-now/716298939?i=716299227&l=en-GB" },
  "2026-09-01": { title: "Miss Sarajevo (feat. Luciano Pavarotti)", artist: "Passengers", url: "https://music.apple.com/es/album/miss-sarajevo-feat-luciano-pavarotti-single-radio-edit/1440655963?i=1440655981&l=en-GB" },
  "2026-09-02": { title: "The Fate of Ophelia", artist: "Taylor Swift", url: "https://music.apple.com/es/album/the-fate-of-ophelia/1838810949?i=1838810951&l=en-GB" },
  "2026-09-03": { title: "Al mar!", artist: "Manel", url: "https://music.apple.com/es/album/al-mar/1443959128?i=1443959404&l=en-GB" },
  "2026-09-04": { title: "Cannock Chase", artist: "Labi Siffre", url: "https://music.apple.com/es/album/cannock-chase/1009327152?i=1009327159&l=en-GB" },
  "2026-09-05": { title: "Shape Of My Heart", artist: "Sting", url: "https://music.apple.com/es/album/shape-of-my-heart/1486682685?i=1486683136&l=en-GB" },
  "2026-09-06": { title: "Can I Call You Tonight?", artist: "Dayglow", url: "https://music.apple.com/es/album/can-i-call-you-tonight/1482950619?i=1482950632&l=en-GB" },
  "2026-09-07": { title: "Esta Vez", artist: "Café Tacvba", url: "https://music.apple.com/es/album/esta-vez/1446020426?i=1446021539&l=en-GB" },
  "2026-09-08": { title: "Plan fatal", artist: "Dani Fernández", url: "https://music.apple.com/es/album/plan-fatal/1592551738?i=1592552168&l=en-GB" },
  "2026-09-09": { title: "Me & Mr. Jones", artist: "Amy Winehouse", url: "https://music.apple.com/es/album/me-mr-jones/1422677780?i=1422677783&l=en-GB" },
  "2026-09-10": { title: "Huesos", artist: "Los Burros", url: "https://music.apple.com/es/album/huesos/100997864?i=100997744&l=en-GB" },
  "2026-09-11": { title: "End of Beginning", artist: "Djo", url: "https://music.apple.com/es/album/end-of-beginning/1759259193?i=1759259453&l=en-GB" },
  "2026-09-12": { title: "Supermassive Black Hole", artist: "Muse", url: "https://music.apple.com/es/album/supermassive-black-hole/992221994?i=992221997&l=en-GB" },
  "2026-09-13": { title: "Supersubmarina", artist: "Dani Fernández", url: "https://music.apple.com/es/album/supersubmarina/1592551738?i=1592552577&l=en-GB" },
  "2026-09-14": { title: "Ya no hay verano", artist: "Carolina Durante & Depresión Sonora", url: "https://music.apple.com/es/album/ya-no-hay-verano/1693853634?i=1693853645&l=en-GB" },
  "2026-09-15": { title: "Resistance", artist: "Muse", url: "https://music.apple.com/es/album/resistance/991509751?i=991509845&l=en-GB" },
  "2026-09-16": { title: "Aunque Es De Noche", artist: "ROSALÍA", url: "https://music.apple.com/es/album/aunque-es-de-noche/1444846102?i=1444846107&l=en-GB" },
  "2026-09-17": { title: "Desembre", artist: "The Tyets", url: "https://music.apple.com/es/album/desembre/1671855145?i=1671855864&l=en-GB" },
  "2026-09-18": { title: "La Meva Sort", artist: "Ginestà", url: "https://music.apple.com/es/album/la-meva-sort/1726449209?i=1726449843&l=en-GB" },
  "2026-09-19": { title: "Disneylandia", artist: "Los Burros", url: "https://music.apple.com/es/album/disneylandia/1048590196?i=1048591665&l=en-GB" },
  "2026-09-20": { title: "You Know I'm No Good", artist: "Amy Winehouse", url: "https://music.apple.com/es/album/you-know-im-no-good/1440856219?i=1440856222&l=en-GB" },
  "2026-09-21": { title: "BESO", artist: "ROSALÍA & Rauw Alejandro", url: "https://music.apple.com/es/album/beso/1676343408?i=1676343411&l=en-GB" },
  "2026-09-22": { title: "Nada que perder", artist: "Robe", url: "https://music.apple.com/es/album/nada-que-perder/1714878288?i=1714878292&l=en-GB" },
  "2026-09-23": { title: "Swing Lynn", artist: "Harmless", url: "https://music.apple.com/es/album/swing-lynn/1600668674?i=1600668689&l=en-GB" },
  "2026-09-24": { title: "Antes de Morirme (feat. ROSALÍA)", artist: "C. Tangana", url: "https://music.apple.com/es/album/antes-de-morirme-feat-rosal%C3%ADa/1540122284?i=1540122298&l=en-GB" },
  "2026-09-25": { title: "Tutto Bene", artist: "Pole.", url: "https://music.apple.com/es/album/tutto-bene/1563307999?i=1563308000&l=en-GB" },
  "2026-09-26": { title: "Braque", artist: "Los Rápidos", url: "https://music.apple.com/es/album/braque/1048590196?i=1048591136&l=en-GB" },
  "2026-09-27": { title: "Some Might Say", artist: "Oasis", url: "https://music.apple.com/es/album/some-might-say/1517476161?i=1517476169&l=en-GB" },
  "2026-09-28": { title: "Sometimes You Can't Make It on Your Own", artist: "U2", url: "https://music.apple.com/es/album/u218-singles-deluxe-edition/1440729856?i=1440730038&l=en-GB" },
  "2026-09-29": { title: "FEZ – Being Born", artist: "U2", url: "https://music.apple.com/es/album/fez-being-born/1445858931?i=1445858943&l=en-GB" },
  "2026-09-30": { title: "Stop Crying Your Heart Out", artist: "Oasis", url: "https://music.apple.com/es/album/stop-crying-your-heart-out/1517507851?i=1517508236&l=en-GB" },
  "2026-10-01": { title: "I Will Follow", artist: "U2", url: "https://music.apple.com/es/album/i-will-follow/1443189101?i=1443189106&l=en-GB" },
  "2026-10-02": { title: "Ya no danzo al son de los tambores (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/ya-no-danzo-al-son-de-los-tambores-2008-remaster/1515547759?i=1515547767&l=en-GB" },
  "2026-10-03": { title: "Un Alma de Papel", artist: "Manolo García", url: "https://music.apple.com/es/album/un-alma-de-papel/473235325?i=473236049&l=en-GB" },
  "2026-10-04": { title: "¿Quién eres tú? (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/qui%C3%A9n-eres-t%C3%BA-2008-remaster/1515725981?i=1515725986&l=en-GB" },
  "2026-10-05": { title: "With or Without You", artist: "U2", url: "https://music.apple.com/es/album/u218-singles-deluxe-edition/1440729856?i=1440729857&l=en-GB" },
  "2026-10-06": { title: "The Miracle (Of Joey Ramone)", artist: "U2", url: "https://music.apple.com/es/album/the-miracle-of-joey-ramone/1444749940?i=1444749981&l=en-GB" },
  "2026-10-07": { title: "Lejos de las leyes de los hombres", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/lejos-de-las-leyes-de-los-hombres-versi%C3%B3n-2023/1705893034?i=1705893259&l=en-GB" },
  "2026-10-08": { title: "Dios de la lluvia (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/dios-de-la-lluvia-2008-remaster/1515547759?i=1515547760&l=en-GB" },
  "2026-10-09": { title: "No me acostumbro (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/no-me-acostumbro-2008-remaster/1515725981?i=1515725991&l=en-GB" },
  "2026-10-10": { title: "I'll Go Crazy If I Don't Go Crazy Tonight", artist: "U2", url: "https://music.apple.com/es/album/ill-go-crazy-if-i-dont-go-crazy-tonight-single-version/1635130614?i=1635130616&l=en-GB" },
  "2026-10-11": { title: "Como la cabeza al sombrero (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/como-la-cabeza-al-sombrero-2008-remaster/1515547759?i=1515547766&l=en-GB" },
  "2026-10-12": { title: "El Rey Tiburón", artist: "Maná", url: "https://music.apple.com/es/album/el-rey-tibur%C3%B3n/1488157748?i=1488157879&l=en-GB" },
  "2026-10-13": { title: "En una Playa Calma", artist: "Manolo García", url: "https://music.apple.com/es/album/en-una-playa-calma/276995639?i=276995690&l=en-GB" },
  "2026-10-14": { title: "Mi Verdad (feat. Shakira) [2015]", artist: "Maná", url: "https://music.apple.com/es/album/mi-verdad-feat-shakira-2019-remasterizado/1769493982?i=1769494168&l=en-GB" },
  "2026-10-15": { title: "Querida Milagros (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/querida-milagros-2008-remaster/1515725981?i=1515725984&l=en-GB" },
  "2026-10-16": { title: "Canta por Mí (En Directo)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/canta-por-m%C3%AD-en-directo/1048590196?i=1048592419&l=en-GB" },
  "2026-10-17": { title: "Eres Mi Religión (2020 Remaster)", artist: "Maná", url: "https://music.apple.com/es/album/eres-mi-religi%C3%B3n-2020-remasterizado/1492024334?i=1492024343&l=en-GB" },
  "2026-10-18": { title: "Remando sobre el polvo", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/remando-sobre-el-polvo/1709024472?i=1709025082&l=en-GB" },
  "2026-10-19": { title: "El camino de las utopías", artist: "Extremoduro", url: "https://music.apple.com/es/album/el-camino-de-las-utop%C3%ADas/727042203?i=727042756&l=en-GB" },
  "2026-10-20": { title: "Street Of Dreams", artist: "U2", url: "https://music.apple.com/es/album/street-of-dreams/6774729762?i=6774729765&l=en-GB" },
  "2026-10-21": { title: "I Still Haven't Found What I'm Looking For", artist: "U2", url: "https://music.apple.com/es/album/u218-singles-deluxe-edition/1440729856?i=1440729857&l=en-GB" },
  "2026-10-22": { title: "Cuando el mar te tenga", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/cuando-el-mar-te-tenga-en-directo/1048590196?i=1048592424&l=en-GB" },
  "2026-10-23": { title: "Wonderwall", artist: "Oasis", url: "https://music.apple.com/es/album/wonderwall/1517449896?i=1517449902&l=en-GB" },
  "2026-10-24": { title: "Sara", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/sara/1048590196?i=1048592406&l=en-GB" },
  "2026-10-25": { title: "Estoy Alegre", artist: "Manolo García", url: "https://music.apple.com/es/album/estoy-alegre/473235325?i=473236053&l=en-GB" },
  "2026-10-26": { title: "Don't Look Back in Anger", artist: "Oasis", url: "https://music.apple.com/es/album/dont-look-back-in-anger/1517447039?i=1517447336&l=en-GB" },
  "2026-10-27": { title: "Insurrección (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/insurrecci%C3%B3n-2008-remaster/1515725981?i=1515725989&l=en-GB" },
  "2026-10-28": { title: "Unknown Caller", artist: "U2", url: "https://music.apple.com/es/album/unknown-caller/1445858931?i=1445858938&l=en-GB" },
  "2026-10-29": { title: "Tango Suicida", artist: "Extremoduro", url: "https://music.apple.com/es/album/tango-suicida/436726144?i=436726149&l=en-GB" },
  "2026-10-30": { title: "La piedra redonda (2008 Remaster)", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/la-piedra-redonda-2008-remaster/1515547759?i=1515547764&l=en-GB" },
  "2026-10-31": { title: "An Cat Dubh", artist: "U2", url: "https://music.apple.com/es/album/an-cat-dubh/1440793935?i=1440793939&l=en-GB" },
  "2026-11-01": { title: "Si Te Vienes Conmigo", artist: "Manolo García", url: "https://music.apple.com/es/album/si-te-vienes-conmigo-gira-geometr%C3%ADa-del-rayo-concierto/1442014584?i=1442015415&l=en-GB" },
  "2026-11-02": { title: "Pájaros de Barro", artist: "Manolo García", url: "https://music.apple.com/es/album/p%C3%A1jaros-de-barro/1759137969?i=1759138568&l=en-GB" },
  "2026-11-03": { title: "Lo Quiero Todo", artist: "Manolo García", url: "https://music.apple.com/es/album/lo-quiero-todo/473235325?i=473236050&l=en-GB" },
  "2026-11-04": { title: "Clavado en un Bar", artist: "Maná", url: "https://music.apple.com/es/album/clavado-en-un-bar/257823076?i=257823189&l=en-GB" },
  "2026-11-05": { title: "A Fuego", artist: "Extremoduro", url: "https://music.apple.com/es/album/a-fuego/63836966?i=63836935&l=en-GB" },
  "2026-11-06": { title: "Stand Up Comedy", artist: "U2", url: "https://music.apple.com/es/album/stand-up-comedy/1445858931?i=1445858942&l=en-GB" },
  "2026-11-07": { title: "Un Año y Otro Año", artist: "Manolo García", url: "https://music.apple.com/es/album/un-a%C3%B1o-y-otro-a%C3%B1o/473235325?i=473235328&l=en-GB" },
  "2026-11-08": { title: "Ama, Ama, Ama y Ensancha el Alma", artist: "Extremoduro", url: "https://music.apple.com/es/album/ama-ama-ama-y-ensancha-el-alma/42019175?i=42019228&l=en-GB" },
  "2026-11-09": { title: "Tu Me Salvaste", artist: "Maná", url: "https://music.apple.com/es/album/tu-me-salvaste/219381180?i=219381334&l=en-GB" },
  "2026-11-10": { title: "Bendita Tu Luz", artist: "Maná", url: "https://music.apple.com/es/album/bendita-tu-luz/219381180?i=219381317&l=en-GB" },
  "2026-11-11": { title: "Llanto de Pasión", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/llanto-de-pasi%C3%B3n/1048590196?i=1048591864&l=en-GB" },
  "2026-11-12": { title: "Jesucristo García", artist: "Extremoduro", url: "https://music.apple.com/es/album/jesucristo-garc%C3%ADa/403720861?i=403720917&l=en-GB" },
  "2026-11-13": { title: "Combatiente", artist: "Maná", url: "https://music.apple.com/es/album/combatiente/219381180?i=219381356&l=en-GB" },
  "2026-11-14": { title: "Desarraigo", artist: "Extremoduro", url: "https://music.apple.com/es/album/desarraigo/436726144?i=436726145&l=en-GB" },
  "2026-11-15": { title: "Somos Mar y Arena", artist: "Maná", url: "https://music.apple.com/es/album/somos-mar-y-arena/219381180?i=219381388&l=en-GB" },
  "2026-11-16": { title: "Todos Amamos Desesperadamente", artist: "Manolo García", url: "https://music.apple.com/es/album/todos-amamos-desesperadamente/473235325?i=473235327&l=en-GB" },
  "2026-11-17": { title: "Vivir Sin Aire (2019 Remaster)", artist: "Maná", url: "https://music.apple.com/es/album/vivir-sin-aire/257823076?i=257823107&l=en-GB" },
  "2026-11-18": { title: "Mi Espíritu Imperecedero", artist: "Extremoduro", url: "https://music.apple.com/es/album/mi-esp%C3%ADritu-imperecedero/436726144?i=436726146&l=en-GB" },
  "2026-11-19": { title: "Tengo Muchas Alas", artist: "Maná", url: "https://music.apple.com/es/album/tengo-muchas-alas/219381180?i=219381301&l=en-GB" },
  "2026-11-20": { title: "Como un Burro Amarrado en la Puerta del Baile", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/como-un-burro-amarrado-en-la-puerta-del-baile/1709024472?i=1709025089&l=en-GB" },
  "2026-11-21": { title: "¿Por Qué Te Vas? (2020 Remaster)", artist: "Maná", url: "https://music.apple.com/es/album/por-qu%C3%A9-te-vas/258905983?i=258906263&l=en-GB" },
  "2026-11-22": { title: "Song for Someone", artist: "U2", url: "https://music.apple.com/es/album/song-for-someone/1444749940?i=1444750184&l=en-GB" },
  "2026-11-23": { title: "Adicto a Tu Amor (2020 Remaster)", artist: "Maná", url: "https://music.apple.com/es/album/adicto-a-tu-amor/981703550?i=981703551&l=en-GB" },
  "2026-11-24": { title: "Mariposa Traicionera (2020 Remaster)", artist: "Maná", url: "https://music.apple.com/es/album/mariposa-traicionera-2020-remasterizado/1492024334?i=1492024341&l=en-GB" },
  "2026-11-25": { title: "Hoy Te la Meto Hasta las Orejas", artist: "Extremoduro", url: "https://music.apple.com/es/album/hoy-te-la-meto-hasta-las-orejas/63836966?i=63836944&l=en-GB" },
  "2026-11-26": { title: "Ojalá Pudiera Borrarte", artist: "Maná", url: "https://music.apple.com/es/album/ojal%C3%A1-pudiera-borrarte/219381180?i=219381270&l=en-GB" },
  "2026-11-27": { title: "Puta", artist: "Extremoduro", url: "https://music.apple.com/es/album/p-a/63836966?i=63836958&l=en-GB" },
  "2026-11-28": { title: "White As Snow", artist: "U2", url: "https://music.apple.com/es/album/white-as-snow/1442959667?i=1442959976&l=en-GB" },
  "2026-11-29": { title: "Golfa", artist: "Extremoduro", url: "https://music.apple.com/es/album/golfa/403729813?i=403729822&l=en-GB" },
  "2026-11-30": { title: "Arráncame el Corazón", artist: "Maná", url: "https://music.apple.com/es/album/arr%C3%A1ncame-el-coraz%C3%B3n/219381180?i=219381289&l=en-GB" },
  "2026-12-01": { title: "Salir", artist: "Extremoduro", url: "https://music.apple.com/es/album/salir/403729813?i=403729816&l=en-GB" },
  "2026-12-02": { title: "Every Breaking Wave", artist: "U2", url: "https://music.apple.com/es/album/every-breaking-wave/1444749940?i=1444749997&l=en-GB" },
  "2026-12-03": { title: "Mar antiguo", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/mar-antiguo/1709024472?i=1709025097&l=en-GB" },
  "2026-12-04": { title: "Lápiz y tinta", artist: "El Último de la Fila", url: "https://music.apple.com/es/search?term=L%C3%A1piz%20y%20tinta%20El%20%C3%9Altimo%20de%20la%20Fila" },
  "2026-12-05": { title: "Si Te Vas…", artist: "Extremoduro", url: "https://music.apple.com/es/album/si-te-vas/436726144?i=436726148&l=en-GB" },
  "2026-12-06": { title: "Standby", artist: "Extremoduro", url: "https://music.apple.com/es/album/standby/63836966?i=63836946&l=en-GB" },
  "2026-12-07": { title: "Labios Compartidos", artist: "Maná", url: "https://music.apple.com/es/song/219381245?l=en-GB" },
  "2026-12-08": { title: "Sin llaves", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/sin-llaves/1048590196?i=1048592406&l=en-GB" },
  "2026-12-09": { title: "Canta por mí", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/canta-por-m%C3%AD/1048590196?i=1048592418&l=en-GB" },
  "2026-12-10": { title: "En el Muelle de San Blás", artist: "Maná", url: "https://music.apple.com/es/album/en-el-muelle-de-san-bl%C3%A1s/306124292?i=306124419&l=en-GB" },
  "2026-12-11": { title: "Magnificent", artist: "U2", url: "https://music.apple.com/es/album/magnificent/1442959667?i=1442959848&l=en-GB" },
  "2026-12-12": { title: "Dime Luna", artist: "Maná", url: "https://music.apple.com/es/album/dime-luna/219381180?i=219381307&l=en-GB" },
  "2026-12-13": { title: "Un Giro Teatral", artist: "Manolo García", url: "https://music.apple.com/es/album/un-giro-teatral/473235325?i=473236051&l=en-GB" },
  "2026-12-14": { title: "Dulce Introducción al Caos", artist: "Extremoduro", url: "https://music.apple.com/es/album/dulce-introducci%C3%B3n-al-caos/1596903953?i=1596904684&l=en-GB" },
  "2026-12-15": { title: "Moment of Surrender", artist: "U2", url: "https://music.apple.com/es/album/moment-of-surrender/1442959667?i=1442959856&l=en-GB" },
  "2026-12-16": { title: "La Vereda de la Puerta de Atrás", artist: "Extremoduro", url: "https://music.apple.com/es/album/la-vereda-de-la-puerta-de-atras/63836966?i=63836937&l=en-GB" },
  "2026-12-17": { title: "Aviones Plateados", artist: "El Último de la Fila", url: "https://music.apple.com/es/album/aviones-plateados/1048590196?i=1048592405&l=en-GB" },
  "2026-12-18": { title: "Segundo Movimiento: Lo de Fuera", artist: "Extremoduro", url: "https://music.apple.com/es/album/segundo-movimiento-lo-de-fuera/290090461?i=290090543&l=en-GB" },
  "2026-12-19": { title: "Manda una Señal", artist: "Maná", url: "https://music.apple.com/es/album/manda-una-se%C3%B1al/219381180?i=219381187&l=en-GB" },
  "2026-12-20": { title: "No Line on the Horizon", artist: "U2", url: "https://music.apple.com/es/album/no-line-on-the-horizon/1445858931?i=1445858933&l=en-GB" },
};

/* Deterministic placeholder cover art, drawn as an inline SVG so the
   prototype needs no network and no image files. Real entries point
   at `art/…` instead and this is never used. */
function placeholderArt(dateKey) {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) {
    h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  }

  const hue = h % 360;
  const hue2 = (hue + 40 + (h >> 8) % 90) % 360;
  const angle = (h >> 4) % 180;
  const bars = 2 + (h >> 6) % 4;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
      `<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">` +
        `<stop offset="0" stop-color="hsl(${hue} 62% 52%)"/>` +
        `<stop offset="1" stop-color="hsl(${hue2} 55% 28%)"/>` +
      `</linearGradient></defs>` +
      `<rect width="100" height="100" fill="url(#g)"/>` +
      Array.from({ length: bars }, (_, i) => {
        const y = 18 + i * (64 / bars);
        const w = 22 + ((h >> (i * 3)) % 52);
        return `<rect x="14" y="${y}" width="${w}" height="4" ` +
               `fill="hsl(${hue2} 70% 88%)" opacity="0.55"/>`;
      }).join("") +
      `<circle cx="72" cy="76" r="12" fill="none" ` +
        `stroke="hsl(${hue} 80% 90%)" stroke-width="2.5" opacity="0.5"/>` +
    `</svg>`;

  // single quotes: this gets inlined into a double-quoted style attribute
  return `url('data:image/svg+xml,${encodeURIComponent(svg)}')`;
}
