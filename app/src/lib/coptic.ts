// Coptic calendar: dates, feasts, fasts, monthly commemorations, Synaxarium links.
// Everything is worked out for any year, so there is no list to update each year.
// Fixed feasts follow their Coptic date (so they move a day after a Coptic leap year);
// movable ones follow Coptic Easter. Checked against copticchurch.net for 2026 and 2027.

export type Bi = { en: string; ar: string };
export type FeastKind = "major" | "minor" | "fast" | "holy" | "other";
export type Feast = { date: string; kind: FeastKind; key: AboutKey; name: Bi };
export type Fast = { key: string; start: string; end: string; name: Bi; feast: Bi & { date: string } };

const pad = (n: number) => String(n).padStart(2, "0");
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parseIso(s); d.setDate(d.getDate() + n); return iso(d); };
export const daysBetween = (a: string, b: string) => Math.round((parseIso(b).getTime() - parseIso(a).getTime()) / 864e5);

// Coptic new year (1 Tout) is Sept 11, or Sept 12 when the next Gregorian year is a leap year.
const newYear = (y: number) => new Date(y, 8, (y + 1) % 4 === 0 ? 12 : 11);
export function copticParts(d: Date): { day: number; month: number; year: number } {
  const day0 = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let start = newYear(d.getFullYear()), year = d.getFullYear() - 283;
  if (day0 < start) { start = newYear(d.getFullYear() - 1); year--; }
  const n = Math.round((day0.getTime() - start.getTime()) / 864e5);
  return { day: (n % 30) + 1, month: Math.floor(n / 30) + 1, year };
}

// The Gregorian date in year `y` that falls on Coptic month/day.
function fromCoptic(y: number, month: number, day: number): string {
  for (let d = new Date(y, 0, 1); d.getFullYear() === y; d.setDate(d.getDate() + 1)) {
    const p = copticParts(d);
    if (p.month === month && p.day === day) return iso(d);
  }
  throw new Error(`no ${month}/${day} in ${y}`);
}

// Coptic (Julian) Easter, as a Gregorian date. Valid 1900-2099.
export function easter(y: number): string {
  const a = y % 4, b = y % 7, c = y % 19, d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const m = Math.floor((d + e + 114) / 31), day = ((d + e + 114) % 31) + 1;
  return addDays(`${y}-${pad(m)}-${pad(day)}`, 13);
}

const N = {
  nativity: { en: "Nativity", ar: "عيد الميلاد المجيد" },
  circumcision: { en: "Circumcision of our Lord", ar: "عيد الختان" },
  theophany: { en: "Theophany (Epiphany)", ar: "عيد الغطاس" },
  cana: { en: "Wedding at Cana", ar: "عرس قانا الجليل" },
  nineveh: { en: "Fast of Nineveh (Jonah's Fast)", ar: "صوم أهل نينوى (صوم يونان)" },
  temple: { en: "Entrance into the Temple", ar: "دخول السيد المسيح الهيكل" },
  lent: { en: "Great Lent begins", ar: "بداية الصوم الكبير" },
  palm: { en: "Palm Sunday", ar: "أحد الشعانين" },
  annunciation: { en: "Annunciation", ar: "عيد البشارة" },
  covenant: { en: "Covenant Thursday", ar: "خميس العهد" },
  goodFriday: { en: "Good Friday", ar: "الجمعة العظيمة" },
  easter: { en: "Feast of the Resurrection (Easter)", ar: "عيد القيامة المجيد" },
  thomas: { en: "Thomas Sunday", ar: "أحد توما" },
  ascension: { en: "Ascension", ar: "عيد الصعود" },
  pentecost: { en: "Pentecost", ar: "عيد العنصرة" },
  egypt: { en: "Entry of the Lord into Egypt", ar: "دخول السيد المسيح أرض مصر" },
  apostles: { en: "Feast of the Apostles", ar: "عيد الرسل" },
  maryFast: { en: "St. Mary's Fast begins", ar: "بداية صوم السيدة العذراء" },
  transfiguration: { en: "Transfiguration", ar: "عيد التجلي" },
  mary: { en: "Feast of St. Mary (Assumption)", ar: "عيد صعود جسد السيدة العذراء" },
  nativityFast: { en: "Nativity Fast begins", ar: "بداية صوم الميلاد" },
} satisfies Record<string, Bi>;

const keyOf = (name: Bi) => (Object.keys(N) as (keyof typeof N)[]).find(k => N[k] === name)!;

// Short background for every feast and fast, written for kids and newcomers in our own words.
// Each one links the trusted Coptic Orthodox page it is based on (St-Takla.org, CopticChurch.net, the Southern US diocese).
// The weekly link check (scripts/check-links.mjs) opens every link in this file.
export type AboutKey = keyof typeof N | "apostlesFast" | "wedFri" | "commMary" | "commMichael" | "synaxarium" | "calendar";
export type About = Bi & { src: string };
const TAKLA = "https://st-takla.org/faith/en/terms/feasts.html", SX = "https://st-takla.org/books/en/church/synaxarium/";
const WORSHIP = "https://www.copticchurch.net/introduction-to-the-coptic-church/book/church2-1";
export const ABOUT: Record<AboutKey, About> = {
  nativity: { src: SX + "04-keyahk/29-kiahk-christmas.html",
    en: "We celebrate the birth of our Lord Jesus Christ in Bethlehem. God became a man to save us, and the angels sang “Glory to God in the highest.”",
    ar: "نحتفل بميلاد ربنا يسوع المسيح في بيت لحم. صار الله إنسانًا ليخلّصنا، وسبّحت الملائكة: «المجد لله في الأعالي»." },
  circumcision: { src: TAKLA,
    en: "Eight days after He was born, baby Jesus was circumcised and named Jesus, just as the angel had said. He kept the Law of Moses for our sake.",
    ar: "بعد ثمانية أيام من ميلاده خُتن الطفل وسُمّي يسوع كما قال الملاك. لقد أكمل ناموس موسى من أجلنا." },
  theophany: { src: SX + "05-topah/11-toba.html",
    en: "John baptized Jesus in the Jordan River. The Holy Spirit came down like a dove and the Father spoke from heaven, so the Holy Trinity was shown to us. Churches pray the Blessing of the Waters (Laqqan).",
    ar: "عمّد يوحنا يسوعَ في نهر الأردن. نزل الروح القدس مثل حمامة وتكلّم الآب من السماء، فظهر لنا الثالوث القدوس. وتصلي الكنائس صلاة اللقان." },
  cana: { src: SX + "05-topah/13-toba.html",
    en: "At a wedding in Cana, Jesus turned water into wine after His mother, St. Mary, asked Him to help. It was His first miracle.",
    ar: "في عرس بقانا الجليل حوّل يسوع الماء إلى خمر بعدما طلبت منه أمه العذراء مريم. وكانت هذه أولى معجزاته." },
  nineveh: { src: "https://st-takla.org/Feastes-&-Special-Events/Jonah-s-Fasting__Nineveh-s-Fast/Soom-Yonan__EN-03-How-many-days-People-of-Nineveh-fast.html",
    en: "Three days of fasting and repentance, two weeks before Great Lent. God sent Jonah to Nineveh, and when the people turned back to Him, He forgave them. Jonah's three days inside the great fish point to Christ rising on the third day.",
    ar: "ثلاثة أيام صوم وتوبة قبل الصوم الكبير بأسبوعين. أرسل الله يونان إلى نينوى، ولما تاب أهلها غفر لهم. وأيام يونان الثلاثة في بطن الحوت رمز لقيامة المسيح في اليوم الثالث." },
  temple: { src: SX + "06-amsheer/08-amshir.html",
    en: "Forty days after His birth, St. Mary and St. Joseph brought baby Jesus to the Temple. Old Simeon held Him in his arms and thanked God for letting him see the Savior.",
    ar: "بعد أربعين يومًا من ميلاده قدّمت العذراء ويوسف الطفل يسوع في الهيكل. فحمله سمعان الشيخ على ذراعيه وشكر الله لأنه رأى المخلّص." },
  lent: { src: "https://st-takla.org/Feastes-&-Special-Events/Great-Lent-Baskha/Coptic-El-Soom-Al-Kabir-03-Article-on-Fasting.html",
    en: "The Church's longest fast, 55 days. It includes the 40 days Jesus fasted in the wilderness and ends with Holy Week (Pascha). It is a time to pray more, fast, give to others and get ready for Easter.",
    ar: "أطول صوم في الكنيسة، 55 يومًا. يشمل الأربعين يومًا التي صامها يسوع في البرية وينتهي بأسبوع الآلام (البصخة). وقت نصلي فيه أكثر ونصوم ونعطي غيرنا ونستعد لعيد القيامة." },
  palm: { src: TAKLA,
    en: "Jesus rode into Jerusalem on a donkey, and the crowds waved palm branches and shouted “Hosanna!” We carry palms in church, and many people weave them into crosses.",
    ar: "دخل يسوع أورشليم راكبًا على جحش، فاستقبلته الجموع بسعف النخل وهم يهتفون: «أوصنا!». نحمل السعف في الكنيسة، ويضفّر كثيرون منه صلبانًا." },
  annunciation: { src: SX + "07-baramhat/29-paramhat.html",
    en: "The Angel Gabriel told St. Mary that she would be the mother of the Son of God, and she said yes. The Church sees this day as the start of our salvation.",
    ar: "بشّر الملاك جبرائيل العذراء مريم بأنها ستلد ابن الله، فقبلت. وترى الكنيسة هذا اليوم بداية خلاصنا." },
  covenant: { src: WORSHIP,
    en: "At the Last Supper, Jesus washed His disciples' feet and gave them His Body and Blood, the first Holy Communion. Churches pray the foot-washing service and the Divine Liturgy.",
    ar: "في العشاء الأخير غسل يسوع أرجل تلاميذه وأعطاهم جسده ودمه، أول تناول. وتصلي الكنائس لقان غسل الأرجل والقداس الإلهي." },
  goodFriday: { src: WORSHIP,
    en: "Jesus was crucified and died on the Cross for us, and was buried. It is the most solemn day of the year, and churches pray from morning until evening.",
    ar: "صُلب يسوع ومات على الصليب من أجلنا ثم دُفن. هو أكثر أيام السنة خشوعًا، وتصلي الكنائس من الصباح حتى المساء." },
  easter: { src: TAKLA,
    en: "On the third day Jesus rose from the dead and defeated death. It is the greatest feast of all. We say “Christ is risen! Truly He is risen!” and keep celebrating for 50 days, until Pentecost.",
    ar: "في اليوم الثالث قام يسوع من بين الأموات وغلب الموت. هو أعظم الأعياد كلها. نقول: «المسيح قام! بالحقيقة قام!» ونبقى نفرح خمسين يومًا حتى عيد العنصرة." },
  thomas: { src: TAKLA,
    en: "A week after Easter, Jesus appeared to St. Thomas, who had doubted, and let him touch His wounds. Thomas said, “My Lord and my God!”",
    ar: "بعد القيامة بأسبوع ظهر يسوع لتوما الذي شكّ، وجعله يلمس جراحه. فقال توما: «ربي وإلهي!»" },
  ascension: { src: TAKLA,
    en: "Forty days after Easter, Jesus went up into heaven while His disciples watched. Two angels told them He will come back the same way.",
    ar: "بعد القيامة بأربعين يومًا صعد يسوع إلى السماء أمام تلاميذه. وقال لهم ملاكان إنه سيأتي هكذا مرة أخرى." },
  pentecost: { src: TAKLA,
    en: "Fifty days after Easter, the Holy Spirit came down on the disciples like tongues of fire, and they spoke in many languages. It is often called the birthday of the Church.",
    ar: "بعد القيامة بخمسين يومًا حلّ الروح القدس على التلاميذ بألسنة كأنها من نار، فتكلموا بلغات كثيرة. ويُسمّى كثيرًا عيد ميلاد الكنيسة." },
  egypt: { src: SX + "09-bashans/24-pashans.html",
    en: "The Holy Family (St. Mary, St. Joseph and baby Jesus) fled to Egypt to escape King Herod. They blessed many places in Egypt that Copts still visit today: “Out of Egypt I called My Son.”",
    ar: "هربت العائلة المقدسة (العذراء ويوسف والطفل يسوع) إلى مصر من الملك هيرودس، وباركت أماكن كثيرة ما زال الأقباط يزورونها: «من مصر دعوت ابني»." },
  apostles: { src: "https://st-takla.org/faith/en/terms/apostles-feast.html",
    en: "We remember St. Peter and St. Paul, who were martyred in Rome for their faith in Christ. This feast ends the Apostles' Fast.",
    ar: "نتذكر القديسين بطرس وبولس اللذين استشهدا في روما من أجل إيمانهما بالمسيح. وبهذا العيد ينتهي صوم الرسل." },
  apostlesFast: { src: "https://st-takla.org/faith/en/terms/apostles-feast.html",
    en: "Starts the day after Pentecost and lasts until the Feast of the Apostles on July 12. The apostles fasted before they went out to preach, so we fast to grow in love for sharing our faith.",
    ar: "يبدأ في اليوم التالي لعيد العنصرة ويستمر حتى عيد الرسل في 12 يوليو. صام الرسل قبل أن يخرجوا للكرازة، فنصوم لننمو في محبة نشر إيماننا." },
  maryFast: { src: "https://abbey.suscopts.org/resources/monastic-library/the-virgins-fast-by-h-h-pope-shenouda-iii/",
    en: "Two weeks of fasting before the Feast of St. Mary. Tradition says the apostles fasted so they could see her body taken up to heaven. Many churches hold evening praises for her, and we ask for her prayers.",
    ar: "أسبوعان صوم قبل عيد السيدة العذراء. ويقول التقليد إن الرسل صاموا ليروا صعود جسدها إلى السماء. تقيم كنائس كثيرة نهضات وتماجيد لها، ونطلب شفاعتها." },
  transfiguration: { src: SX + "12-mesraa/13-mesra.html",
    en: "Jesus took Peter, James and John up a high mountain. His face shone like the sun, and Moses and Elijah appeared and talked with Him.",
    ar: "أخذ يسوع بطرس ويعقوب ويوحنا إلى جبل عالٍ، فأضاء وجهه كالشمس وظهر موسى وإيليا يتكلمان معه." },
  mary: { src: SX + "12-mesraa/16-mesra.html",
    en: "The Church remembers how St. Mary's body was taken up to heaven after she departed. This feast ends St. Mary's Fast.",
    ar: "تتذكر الكنيسة صعود جسد السيدة العذراء إلى السماء بعد نياحتها. وبهذا العيد ينتهي صوم العذراء." },
  nativityFast: { src: "https://st-takla.org/Feastes-&-Special-Events/Coptic-Nativity-of-Jesus-Christ-Milad-El-Masih/Coptic-Jesus-Incarnation-Christmas-00-index.html",
    en: "43 days of fasting to get ready for Christmas: 40 days, like Moses before he received God's Law, plus 3 days that remember the miracle of moving the Muqattam Mountain in Cairo.",
    ar: "43 يومًا صوم استعدادًا لعيد الميلاد: أربعون يومًا مثل صوم موسى قبل أن يستلم الشريعة، وثلاثة أيام تذكارًا لمعجزة نقل جبل المقطم في القاهرة." },
  wedFri: { src: "https://www.suscopts.org/mightyarrows/vol1_no3/fasting.html",
    en: "Since the time of the apostles, the Church fasts on Wednesdays, the day Judas agreed to betray Jesus, and on Fridays, the day Jesus was crucified. There is no fasting in the 50 days after Easter.",
    ar: "منذ أيام الرسل تصوم الكنيسة يوم الأربعاء الذي اتفق فيه يهوذا على تسليم يسوع، ويوم الجمعة الذي صُلب فيه. ولا صوم في الخمسين يومًا بعد القيامة." },
  commMary: { src: WORSHIP,
    en: "On the 21st of every Coptic month the Church honors St. Mary, the Mother of God, remembering her departure on 21 Toba. Many churches pray a Liturgy or praises for her that day.",
    ar: "في يوم 21 من كل شهر قبطي تكرّم الكنيسة السيدة العذراء والدة الإله، تذكارًا لنياحتها في 21 طوبة. وتقيم كنائس كثيرة قداسًا أو تمجيدًا لها في هذا اليوم." },
  commMichael: { src: "https://www.copticchurch.net/synaxarium/3_12.html",
    en: "On the 12th of every Coptic month the Church honors the Archangel Michael, the leader of the angels, who stands before God and prays for us. Many people give to the poor in his name.",
    ar: "في يوم 12 من كل شهر قبطي تكرّم الكنيسة رئيس الملائكة ميخائيل، رئيس جند السماء الواقف أمام الله يشفع فينا. ويقدّم كثيرون صدقات للفقراء باسمه." },
  synaxarium: { src: "https://www.suscopts.org/mightyarrows/copticsyn.html",
    en: "The Synaxarium is the Church's book of the lives of saints and martyrs, with a reading for every day of the Coptic year. It is read in the Liturgy right after the Book of Acts.",
    ar: "السنكسار هو كتاب الكنيسة لسير القديسين والشهداء، فيه قراءة لكل يوم من السنة القبطية، ويُقرأ في القداس بعد سفر أعمال الرسل." },
  calendar: { src: "https://www.copticchurch.net/calendar",
    en: "The Coptic calendar is one of the oldest in the world. Its years are counted from 284 AD, when Emperor Diocletian began a terrible persecution of Christians, so it is called the Year of the Martyrs. Each year starts with the Feast of Nayrouz, usually on September 11.",
    ar: "التقويم القبطي من أقدم التقاويم في العالم. تُحسب سنواته من سنة 284م حين بدأ الإمبراطور دقلديانوس اضطهادًا شديدًا للمسيحيين، لذلك يسمى تقويم الشهداء. وتبدأ كل سنة بعيد النيروز، غالبًا في 11 سبتمبر." },
};
// The background for one of the five fasting seasons (fastsFor keys).
export const fastAbout = (key: string): About => ABOUT[({ nineveh: "nineveh", lent: "lent", apostles: "apostlesFast", mary: "maryFast", nativity: "nativityFast" } as Record<string, AboutKey>)[key]];

// Feasts and fast beginnings in Gregorian year y, in date order.
export function feastsFor(y: number): Feast[] {
  const e = easter(y), F = (date: string, kind: FeastKind, name: Bi): Feast => ({ date, kind, key: keyOf(name), name });
  return [
    F(`${y}-01-07`, "major", N.nativity), // The Church keeps Nativity on January 7 every year.
    F(fromCoptic(y, 5, 6), "minor", N.circumcision),
    F(fromCoptic(y, 5, 11), "major", N.theophany),
    F(fromCoptic(y, 5, 13), "minor", N.cana),
    F(addDays(e, -69), "fast", N.nineveh),
    F(fromCoptic(y, 6, 8), "minor", N.temple),
    F(addDays(e, -55), "fast", N.lent),
    F(addDays(e, -7), "major", N.palm),
    F(fromCoptic(y, 7, 29), "major", N.annunciation),
    F(addDays(e, -3), "minor", N.covenant),
    F(addDays(e, -2), "holy", N.goodFriday),
    F(e, "major", N.easter),
    F(addDays(e, 7), "minor", N.thomas),
    F(addDays(e, 39), "major", N.ascension),
    F(addDays(e, 49), "major", N.pentecost),
    F(fromCoptic(y, 9, 24), "minor", N.egypt),
    F(`${y}-07-12`, "other", N.apostles),
    F(`${y}-08-07`, "fast", N.maryFast),
    F(fromCoptic(y, 12, 13), "minor", N.transfiguration),
    F(`${y}-08-22`, "other", N.mary),
    F(`${y}-11-25`, "fast", N.nativityFast), // 43 days, always ending the day before Nativity.
  ].sort((a, b) => a.date.localeCompare(b.date));
}

// The five fasting seasons that begin in Gregorian year y.
export function fastsFor(y: number): Fast[] {
  const e = easter(y), pent = addDays(e, 49);
  return [
    { key: "nineveh", start: addDays(e, -69), end: addDays(e, -67), name: { en: "Fast of Nineveh (Jonah's Fast)", ar: "صوم أهل نينوى (صوم يونان)" }, feast: { date: addDays(e, -66), en: "Jonah's Passover", ar: "فصح يونان" } },
    { key: "lent", start: addDays(e, -55), end: addDays(e, -1), name: { en: "Great Lent and Holy Week", ar: "الصوم الكبير وأسبوع الآلام" }, feast: { date: e, en: "Easter", ar: "عيد القيامة" } },
    { key: "apostles", start: addDays(pent, 1), end: `${y}-07-11`, name: { en: "Apostles' Fast", ar: "صوم الرسل" }, feast: { date: `${y}-07-12`, en: "Feast of the Apostles", ar: "عيد الرسل" } },
    { key: "mary", start: `${y}-08-07`, end: `${y}-08-21`, name: { en: "St. Mary's Fast", ar: "صوم السيدة العذراء" }, feast: { date: `${y}-08-22`, en: "Feast of St. Mary", ar: "عيد السيدة العذراء" } },
    { key: "nativity", start: `${y}-11-25`, end: `${y + 1}-01-06`, name: { en: "Nativity Fast", ar: "صوم الميلاد" }, feast: { date: `${y + 1}-01-07`, en: "Nativity", ar: "عيد الميلاد" } },
  ];
}

// Each fast's current or next season, soonest first.
export function upcomingFasts(today: string): Fast[] {
  const y = Number(today.slice(0, 4));
  const all = [...fastsFor(y - 1), ...fastsFor(y), ...fastsFor(y + 1)];
  return [...new Set(all.map(f => f.key))]
    .map(k => all.find(f => f.key === k && f.end >= today)!)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function feastsAround(today: string, back = 60, ahead = 365): Feast[] {
  const y = Number(today.slice(0, 4)), from = addDays(today, -back), to = addDays(today, ahead);
  return [y - 1, y, y + 1].flatMap(feastsFor).filter(f => f.date >= from && f.date <= to);
}

export const fastOn = (day: string) => {
  const y = Number(day.slice(0, 4));
  return [...fastsFor(y - 1), ...fastsFor(y)].find(f => day >= f.start && day <= f.end) ?? null;
};

// Wednesdays and Fridays are fasting days, except from Easter to Pentecost and on Nativity or Theophany.
export function isWedFriFast(day: string): boolean {
  const dow = parseIso(day).getDay();
  if (dow !== 3 && dow !== 5) return false;
  const y = Number(day.slice(0, 4)), e = easter(y);
  if (day >= e && day <= addDays(e, 49)) return false;
  return day !== `${y}-01-07` && day !== fromCoptic(y, 5, 11);
}

// Monthly commemorations: Archangel Michael on the 12th and the Virgin Mary on the 21st of each Coptic month.
export const COMMS = [
  { day: 21, key: "mary" as const, title: { en: "Monthly commemoration of the Virgin Mary", ar: "التذكار الشهري للسيدة العذراء" } },
  { day: 12, key: "michael" as const, title: { en: "Monthly commemoration of Archangel Michael", ar: "التذكار الشهري لرئيس الملائكة ميخائيل" } },
];
export const commOn = (day: string) => { const p = copticParts(parseIso(day)); return p.month <= 12 ? COMMS.find(c => c.day === p.day) ?? null : null; };
export function commDates(cDay: number, from: string, n: number): string[] {
  const out: string[] = [];
  for (let d = from; out.length < n; d = addDays(d, 1)) {
    const p = copticParts(parseIso(d));
    if (p.month <= 12 && p.day === cDay) out.push(d);
  }
  return out;
}

const SYNAX = [["01-toot", "tout"], ["02-babah", "baba"], ["03-hatoor", "hator"], ["04-keyahk", "kiahk"], ["05-topah", "toba"], ["06-amsheer", "amshir"], ["07-baramhat", "paramhat"], ["08-bermodah", "baramouda"], ["09-bashans", "pashans"], ["10-bawoonah", "paona"], ["11-abeeb", "epep"], ["12-mesraa", "mesra"], ["13-nasea", "nasie"]];
export function synaxUrl(day: string): string {
  const p = copticParts(parseIso(day)), [folder, sfx] = SYNAX[p.month - 1];
  return `https://st-takla.org/books/en/church/synaxarium/${folder}/${pad(p.day)}-${sfx}.html`;
}
