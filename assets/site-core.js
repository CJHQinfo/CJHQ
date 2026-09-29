// ---------- ROUTING BASE PATH ----------
// Auto-detects whether this site is served from a domain root (e.g.
// cjhq.org/contact) or a GitHub Pages project subpath (e.g.
// cjhqinfo.github.io/CJHQ/contact). No manual configuration needed —
// this makes every link below correct on either setup automatically.
const SITE_BASE_PATH = (function(){
  if(location.hostname.endsWith('.github.io')){
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return seg ? '/' + seg : '';
  }
  return '';
})();
// ---------- ICON LIBRARY (simple line icons, 24x24) ----------
const icons = {
  baby: '<path d="M9 12a3 3 0 106 0M12 4v3M8 7c-2 0-3 2-3 4M16 7c2 0 3 2 3 4M6 12c0 5 3 8 6 8s6-3 6-8"/>',
  leaf: '<path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z"/><path d="M8 16l8-8"/>',
  plane: '<path d="M3 12l18-7-7 18-3-8-8-3z"/>',
  passport: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><circle cx="12" cy="10" r="2.4"/><path d="M9 16h6"/>',
  heart: '<path d="M12 20s-7-4.6-9.5-9C.7 7.4 3 4 6.5 4 9 4 11 6 12 7.5 13 6 15 4 17.5 4 21 4 23.3 7.4 21.5 11 19 15.4 12 20 12 20z"/>',
  briefcase: '<rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M8 8V6a2 2 0 012-2h4a2 2 0 012 2v2"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/>',
  building: '<rect x="4" y="3" width="16" height="18"/><path d="M9 8h1M14 8h1M9 12h1M14 12h1M9 16h1M14 16h1"/>',
  truck: '<rect x="2" y="8" width="12" height="9"/><path d="M14 11h4l3 3v3h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>',
  gov: '<path d="M4 21h16M5 21V10M19 21V10M3 10l9-6 9 6M8 10v7M12 10v7M16 10v7"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15.5 0 18M12 3c-2.5 2.5-2.5 15.5 0 18"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
  people: '<circle cx="8" cy="8" r="3.2"/><circle cx="16" cy="8" r="3.2"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M10 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>',
  handshake: '<path d="M2 12l5-4 4 3 3-3 5 4-3 3-2-2-3 3-4-3-2 2z"/><path d="M7 8l4 8M17 8l-4 8"/>',
  scale: '<path d="M12 3v18M5 8l-3 6a3 3 0 006 0L5 8zM19 8l-3 6a3 3 0 006 0l-3-6zM5 8h14M8 21h8"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5 5-5"/>'
};
function iconSVG(name){
  return `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}

// ---------- RESOURCE CATEGORY DATA ----------
// Canadian English accepts both "licence" and "license"; the only driver
// resource is titled with the American spelling ("New York Enhanced Driver
// License"), so a search for "licence" returned nothing. Normalising both the
// query and the text being searched makes either spelling match. No stored
// content is altered - this only affects comparison.
function cjhqNormalizeSearch(str){
  return String(str == null ? '' : str)
    .toLowerCase()
    .replace(/\u2019/g, "'")      // curly apostrophe (phone keyboards) -> straight
    .replace(/'s\b/g, '')         // possessive: "driver's license" -> "driver license",
                                  // so it matches the stored "Driver License"
    .replace(/licence/g, 'license'); // Canadian/British spelling -> the stored spelling
}

const searchIndex = [
  { page:'home', en:'Home', fr:'Accueil',
    body_en:'CJHQ is a central point of contact for Quebec\'s Hasidic Jewish communities, providing services, assistance, information, representation, and advocacy.',
    body_fr:'Le CJHQ est un point de contact central pour les communautés juives hassidiques du Québec, offrant services, assistance, information, représentation et défense de leurs intérêts.' },
  { page:'home', en:'Our Partners', fr:'Nos partenaires',
    body_en:'CJHQ works alongside community organizations including Refuah V\'Chesed, Hatzolah Montreal, Chaverim Montreal, and others.',
    body_fr:'Le CJHQ collabore avec des organismes communautaires, dont Refuah V\'Chesed, Hatzolah Montreal, Chaverim Montreal et d\'autres.' },
  { page:'about', en:'About CJHQ', fr:'À propos du CJHQ',
    body_en:'A community organization dedicated to serving, supporting, and representing Quebec\'s Hasidic Jewish communities.',
    body_fr:'Un organisme communautaire qui se consacre à servir, soutenir et représenter les communautés juives hassidiques du Québec.' },
  { page:'about', en:'Our Mission', fr:'Notre mission',
    body_en:'To serve and strengthen Quebec\'s Hasidic Jewish communities through practical services, trusted information, and advocacy.',
    body_fr:'Servir et renforcer les communautés juives hassidiques du Québec par des services pratiques, une information fiable et la défense de leurs intérêts.' },
  { page:'about', en:'Our Approach', fr:'Notre approche',
    body_en:'Effective advocacy combines strong relationships with a clear and responsible community voice.',
    body_fr:'Une représentation efficace combine des relations solides avec une voix communautaire claire et responsable.' },
  { page:'about', en:'Our Values', fr:'Nos valeurs',
    body_en:'Service, professionalism, integrity, collaboration, respect, and non-partisanship.',
    body_fr:'Service, professionnalisme, intégrité, collaboration, respect et non-partisanerie.' },
  { page:'resources', en:'Community Resource Centre', fr:'Centre de ressources communautaires',
    body_en:'Trusted government resources, applications, and services for Quebec\'s Hasidic Jewish communities.',
    body_fr:'Ressources gouvernementales fiables, demandes et services pour les communautés juives hassidiques du Québec.' },
  { page:'resources', en:'Visitor Parking — Outremont & Le Plateau-Mont-Royal', fr:'Stationnement pour visiteurs — Outremont et Le Plateau-Mont-Royal',
    body_en:'How to get a visitor parking pass in Outremont and Le Plateau-Mont-Royal, including access codes and pay station instructions.',
    body_fr:'Comment obtenir une vignette de stationnement pour visiteurs à Outremont et au Plateau-Mont-Royal, incluant les codes d\'accès et les instructions pour les bornes de paiement.' },
  { page:'stay-informed', en:'Stay Informed', fr:'Restez informés',
    body_en:'How to stay connected with CJHQ through Community Information Updates and public communications.',
    body_fr:'Comment rester branché avec le CJHQ par les mises à jour d\'information communautaire et les communications publiques.' },
  { page:'stay-informed', en:'Community Information Updates', fr:'Mises à jour d\'information communautaire',
    body_en:'Subscribe for announcements, holiday information, travel and border updates, and public safety information.',
    body_fr:'Abonnez-vous pour les annonces, l\'information sur les fêtes, les mises à jour de voyage et la sécurité publique.' },
  { page:'stay-informed', en:'Public Statements & Announcements', fr:'Déclarations et annonces publiques',
    body_en:'Official statements and announcements shared on Facebook and X.',
    body_fr:'Déclarations et annonces officielles diffusées sur Facebook et X.' },
  { page:'stay-informed', en:'Why Two Communication Channels?', fr:'Pourquoi deux canaux de communication?',
    body_en:'Why CJHQ uses both Community Information Updates and public social media communications.',
    body_fr:'Pourquoi le CJHQ utilise à la fois les mises à jour d\'information communautaire et les communications publiques.' },
  { page:'contact', en:'Contact CJHQ', fr:'Contacter le CJHQ',
    body_en:'Get in touch — community members, government officials, media, and organizations.',
    body_fr:'Communiquez avec nous — membres de la communauté, représentants gouvernementaux, médias et organismes.' },
  { page:'contact', en:'Community Organizations', fr:'Organismes communautaires',
    body_en:'How community organizations and partners can connect with CJHQ.',
    body_fr:'Comment les organismes communautaires et partenaires peuvent communiquer avec le CJHQ.' },
  { page:'contact', en:'Response Times', fr:'Délais de réponse',
    body_en:'What to expect when contacting CJHQ, and how to flag an urgent matter.',
    body_fr:'À quoi s\'attendre en communiquant avec le CJHQ, et comment signaler une situation urgente.' },
  { page:'contact', en:'Office Address & Phone', fr:'Adresse et téléphone du bureau',
    body_en:'1040 Van Horne Ave, Outremont, QC, H2V 1J5, CANADA · (514) 819-9440 · info@cjhq.org',
    body_fr:'1040, avenue Van Horne, Outremont (Québec) H2V 1J5, CANADA · (514) 819-9440 · info@cjhq.org' },
  { page:'privacy', en:'Privacy Policy', fr:'Politique de confidentialité',
    body_en:'What information CJHQ collects, how it is used, and how it is protected.',
    body_fr:'Quels renseignements le CJHQ recueille, comment ils sont utilisés et protégés.' },
  { page:'terms', en:'Terms of Use', fr:'Conditions d\'utilisation',
    body_en:'The terms governing use of the CJHQ website.',
    body_fr:'Les conditions régissant l\'utilisation du site Web du CJHQ.' },
  { page:'accessibility', en:'Accessibility Statement', fr:'Déclaration d\'accessibilité',
    body_en:'CJHQ\'s commitment to an accessible website for all visitors.',
    body_fr:'L\'engagement du CJHQ envers un site Web accessible à tous les visiteurs.' },
];

const categories = [
  { icon:'passport', en:'Canadian Passports', fr:'Passeports canadiens',
    intro_en:'Everything you need to apply for, renew, or replace a Canadian passport.',
    intro_fr:'Tout ce qu\'il faut pour faire une demande, renouveler ou remplacer un passeport canadien.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Adult Passport Application', fr:'Demande de passeport pour adulte', desc_en:'Apply for your first Canadian adult passport.', desc_fr:'Faites une demande pour votre premier passeport canadien pour adulte.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/new-adult-passport.html", what_en:'This is for anyone applying for their very first Canadian adult passport.', what_fr:'Ceci s\'adresse à toute personne qui fait une demande pour son tout premier passeport canadien pour adulte.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Use this application if you have never had a Canadian adult passport. If you already have, or previously had, a Canadian passport, use Passport Renewal instead.', answer_fr:'Utilisez cette demande si vous n\'avez jamais eu de passeport canadien pour adulte. Si vous avez déjà eu un passeport canadien, utilisez plutôt le Renouvellement de passeport.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You will need:', need_intro_fr:'Vous aurez besoin de :', need_list_en:['Proof of Canadian citizenship (birth certificate or citizenship certificate)','One valid government-issued photo ID','Two identical passport photos','One guarantor who has known you personally for at least two years','Two references','Payment'], need_list_fr:['Preuve de citoyenneté canadienne (certificat de naissance ou de citoyenneté)','Une pièce d\'identité valide avec photo émise par le gouvernement','Deux photos de passeport identiques','Un répondant qui vous connaît personnellement depuis au moins deux ans','Deux références','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Complete the passport application.','Have your passport photos taken.','Gather your required documents.','Have your guarantor complete the required sections.','Submit your application by mail or at a Passport Office.'], steps_list_fr:['Complétez la demande de passeport.','Faites prendre vos photos de passeport.','Rassemblez vos documents requis.','Faites remplir les sections requises par votre répondant.','Soumettez votre demande par la poste ou à un bureau des passeports.'], tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['Passport photos must meet Government of Canada specifications.','Make sure your name matches your citizenship document exactly.','If you are travelling soon, review the current processing times before submitting your application.'], tips_list_fr:['Les photos de passeport doivent respecter les normes du gouvernement du Canada.','Assurez-vous que votre nom correspond exactement à votre document de citoyenneté.','Si vous voyagez bientôt, consultez les délais de traitement actuels avant de soumettre votre demande.'], official_links:[{label_en:'Adult Passport Application', label_fr:'Demande de passeport pour adulte', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/new-adult-passport.html"},{label_en:'Passport Processing Times', label_fr:'Délais de traitement des passeports', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/processing-times.html"},{label_en:'Find a Passport Office', label_fr:'Trouver un bureau des passeports', url:"https://offices.service.canada.ca/en/SearchPassport"}], related:['passport-renewal','urgent-express-passport-services','child-passport','lost-stolen-or-damaged-passport'], reviewed:'August 2026', slug:'adult-passport-application'},
        {en:'Passport Renewal', fr:'Renouvellement de passeport', desc_en:'Renew your existing Canadian passport.', desc_fr:'Renouvelez votre passeport canadien existant.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/renew-adult-passport.html", what_en:'This is the process for renewing a passport that\'s expiring or has recently expired.', what_fr:'Voici la démarche pour renouveler un passeport qui arrive à échéance ou qui a récemment expiré.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Use this application if your passport is expiring or has expired. If you\'ve never had a Canadian passport before, use Adult Passport Application.', answer_fr:'Utilisez cette demande si votre passeport arrive à échéance ou a expiré. Si vous n\'avez jamais eu de passeport canadien, utilisez plutôt la Demande de passeport pour adulte.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You will need:', need_intro_fr:'Vous aurez besoin de :', need_list_en:['Your current or most recent passport','Two new passport photos','Payment'], need_list_fr:['Votre passeport actuel ou le plus récent','Deux nouvelles photos de passeport','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Complete the renewal application.','Have new passport photos taken, or a digital photo if applying online.','Include your current passport (not required if applying online).','Submit your application online, by mail, or at a Passport Office.'], steps_list_fr:['Complétez la demande de renouvellement.','Faites prendre de nouvelles photos de passeport, ou une photo numérique si vous faites la demande en ligne.','Incluez votre passeport actuel (non requis si vous faites la demande en ligne).','Soumettez votre demande en ligne, par la poste ou à un bureau des passeports.'], tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['As of July 2026, most adults can renew entirely online if they are 16 or older, applying from within Canada, and their current passport is valid or expired less than 15 years.','Processing times do not include mailing time.','If you are travelling soon, check whether you qualify for urgent or express service.'], tips_list_fr:['Depuis juillet 2026, la plupart des adultes peuvent renouveler entièrement en ligne s\'ils ont 16 ans ou plus, font la demande depuis le Canada, et que leur passeport actuel est valide ou a expiré depuis moins de 15 ans.','Les délais de traitement n\'incluent pas le temps d\'acheminement postal.','Si vous voyagez bientôt, vérifiez si vous êtes admissible au service urgent ou express.'], official_links:[{label_en:'Passport Renewal', label_fr:'Renouvellement de passeport', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/renew-adult-passport.html"},{label_en:'Passport Processing Times', label_fr:'Délais de traitement des passeports', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/processing-times.html"},{label_en:'Find a Passport Office', label_fr:'Trouver un bureau des passeports', url:"https://offices.service.canada.ca/en/SearchPassport"}], related:['adult-passport-application','urgent-express-passport-services','lost-stolen-or-damaged-passport'], reviewed:'August 2026', slug:'passport-renewal'},
        {en:'Child Passport', fr:'Passeport pour enfant', desc_en:'Apply for a Canadian passport for a child under 16 years of age.', desc_fr:'Faites une demande de passeport canadien pour un enfant de moins de 16 ans.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/child-passport.html", what_en:'This is for a child\'s Canadian passport application — every child needs their own passport to travel, even a newborn.', what_fr:'Ceci concerne la demande de passeport canadien d\'un enfant — chaque enfant a besoin de son propre passeport pour voyager, même un nouveau-né.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Every child must have their own passport to travel internationally, including newborn babies. Children under 16 do not renew a passport — a new child passport application is required each time.', answer_fr:'Chaque enfant doit avoir son propre passeport pour voyager à l\'international, incluant les nouveau-nés. Les enfants de moins de 16 ans ne renouvellent pas un passeport — une nouvelle demande est requise à chaque fois.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You will need:', need_intro_fr:'Vous aurez besoin de :', need_list_en:['Proof of the child\'s Canadian citizenship','Two passport photos','Identification for the parent(s) or legal guardian(s)','Signatures from all required parents or guardians','Payment'], need_list_fr:['Preuve de citoyenneté canadienne de l\'enfant','Deux photos de passeport','Pièces d\'identité des parents ou tuteurs légaux','Signatures de tous les parents ou tuteurs requis','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Complete the child passport application.','Have passport photos taken.','Gather the required documents.','Ensure all required parents or guardians sign the application.','Submit the application by mail or in person.'], steps_list_fr:['Complétez la demande de passeport pour enfant.','Faites prendre les photos de passeport.','Rassemblez les documents requis.','Assurez-vous que tous les parents ou tuteurs requis signent la demande.','Soumettez la demande par la poste ou en personne.'], tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['Every child needs their own passport, regardless of age.','Babies also require passport photos.','If only one parent has legal decision-making authority, supporting documents may be required.'], tips_list_fr:['Chaque enfant a besoin de son propre passeport, peu importe l\'âge.','Les bébés ont aussi besoin de photos de passeport.','Si un seul parent a l\'autorité légale de décision, des documents à l\'appui peuvent être requis.'], official_links:[{label_en:'Child Passport Application', label_fr:'Demande de passeport pour enfant', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/child-passport.html"},{label_en:'Passport Processing Times', label_fr:'Délais de traitement des passeports', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/processing-times.html"},{label_en:'Find a Passport Office', label_fr:'Trouver un bureau des passeports', url:"https://offices.service.canada.ca/en/SearchPassport"}], related:['adult-passport-application','passport-renewal','children-travelling','urgent-express-passport-services'], reviewed:'August 2026', slug:'child-passport'},
        {en:'Urgent & Express Passport Service', fr:'Services de passeport urgents et express', desc_en:'Apply for faster passport processing if you need your passport urgently.', desc_fr:'Faites une demande de traitement accéléré si vous avez besoin de votre passeport de toute urgence.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/urgent-emergency-passport.html", what_en:'This is for travellers who need a passport faster than the standard timeline, because of an urgent or unexpected trip.', what_fr:'Ceci s\'adresse aux voyageurs qui ont besoin d\'un passeport plus rapidement que le délai standard, en raison d\'un voyage urgent ou imprévu.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Choose this option if you need your passport before the regular processing time because of upcoming travel.', answer_fr:'Choisissez cette option si vous avez besoin de votre passeport avant le délai de traitement régulier en raison d\'un voyage à venir.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'Bring:', need_intro_fr:'Apportez :', need_list_en:['All documents required for your passport application','Proof of travel, such as an airline ticket, travel itinerary, or written proof from your employer','Proof of a family emergency, if applicable'], need_list_fr:['Tous les documents requis pour votre demande de passeport','Une preuve de voyage, comme un billet d\'avion, un itinéraire de voyage ou une preuve écrite de votre employeur','Une preuve d\'urgence familiale, le cas échéant'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'Urgent and express service generally requires you to apply in person at a Passport Office. Bring all required documents and your proof of travel.', steps_fr:'Le service urgent et express exige généralement de faire la demande en personne à un bureau des passeports. Apportez tous les documents requis et votre preuve de voyage.', tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['Faster processing is not available for every situation.','Additional government fees apply for urgent and express service.','The closer your travel date, the more important it is to bring proof of travel.'], tips_list_fr:['Le traitement accéléré n\'est pas offert pour toutes les situations.','Des frais gouvernementaux supplémentaires s\'appliquent pour le service urgent et express.','Plus votre date de voyage approche, plus il est important d\'apporter une preuve de voyage.'], official_links:[{label_en:'Urgent & Express Passport Service', label_fr:'Service de passeport urgent et express', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/urgent-emergency-passport.html"},{label_en:'Find a Passport Office', label_fr:'Trouver un bureau des passeports', url:"https://offices.service.canada.ca/en/SearchPassport"},{label_en:'Passport Processing Times', label_fr:'Délais de traitement des passeports', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/processing-times.html"}], related:['adult-passport-application','passport-renewal','child-passport'], reviewed:'August 2026', slug:'urgent-express-passport-services'},
        {en:'Find a Passport Office', fr:'Trouver un bureau des passeports', desc_en:'Find the nearest Passport Office or Service Canada location.', desc_fr:'Trouvez le bureau des passeports ou le bureau de Service Canada le plus près.', url:"https://offices.service.canada.ca/en/SearchPassport", what_en:'Use this tool to find the closest office where you can submit a passport application or obtain passport services.', what_fr:'Utilisez cet outil pour trouver le bureau le plus près où soumettre une demande de passeport ou obtenir des services de passeport.', need_heading_en:'Before You Go', need_heading_fr:'Avant de vous déplacer', need_intro_en:'Have your postal code or city ready. Always check:', need_intro_fr:'Ayez votre code postal ou votre ville en main. Vérifiez toujours :', need_list_en:['Office hours','Appointment requirements','Services available at that location'], need_list_fr:['Les heures d\'ouverture','Les exigences de rendez-vous','Les services offerts à cet endroit'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Enter your postal code or city to see nearby locations, then check their hours before you go — some locations get busy, especially early in the week.', steps_fr:'Entrez votre code postal ou votre ville pour voir les emplacements à proximité, puis vérifiez leurs heures avant de vous déplacer — certains bureaux sont achalandés, surtout en début de semaine.', official_links:[{label_en:'Passport Office Locator', label_fr:'Localisateur de bureaux des passeports', url:"https://offices.service.canada.ca/en/SearchPassport"}], related:['adult-passport-application','passport-renewal','urgent-express-passport-services'], reviewed:'August 2026', slug:'find-a-passport-office', label_en1:'Find an Office →', label_fr1:'Trouver un bureau →'},
        {en:'Passport Processing Times', fr:'Délais de traitement des passeports', desc_en:'View current passport processing times.', desc_fr:'Consultez les délais de traitement actuels des passeports.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/processing-times.html", what_en:'Review processing times before booking travel or submitting your application.', what_fr:'Consultez les délais de traitement avant de réserver un voyage ou de soumettre votre demande.', need_heading_en:'Good to Know', need_heading_fr:'Bon à savoir', need_list_en:['Processing times begin after your complete application has been received.','Mail delivery time is not included in the estimated processing time.'], need_list_fr:['Les délais de traitement commencent une fois votre demande complète reçue.','Le temps d\'acheminement postal n\'est pas inclus dans le délai de traitement estimé.'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Check this before applying so you know how much time to leave before your trip — processing time doesn\'t include time in the mail.', steps_fr:'Vérifiez cette page avant de faire votre demande afin de savoir combien de temps prévoir avant votre voyage — le délai de traitement n\'inclut pas le temps d\'acheminement postal.', official_links:[{label_en:'Passport Processing Times', label_fr:'Délais de traitement des passeports', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/processing-times.html"}], related:['adult-passport-application','passport-renewal','urgent-express-passport-services'], reviewed:'September 2026', slug:'passport-processing-times', label_en1:'View Processing Times →', label_fr1:'Voir les délais de traitement →'},
        {en:'Lost, Stolen or Damaged Passport', fr:'Passeport perdu, volé ou endommagé', desc_en:'Report and replace a lost, stolen or damaged Canadian passport.', desc_fr:'Signalez et remplacez un passeport canadien perdu, volé ou endommagé.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/lost-stolen-inaccessible-damaged-found.html", what_en:'If your passport was lost, stolen, or damaged, don\'t worry — this happens, and there\'s a clear process to fix it.', what_fr:'Si votre passeport a été perdu, volé ou endommagé, ne vous inquiétez pas — cela arrive, et il existe une démarche claire pour y remédier.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Use this guide if your passport has been lost, stolen, or damaged.', answer_fr:'Utilisez ce guide si votre passeport a été perdu, volé ou endommagé.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You will need:', need_intro_fr:'Vous aurez besoin de :', need_list_en:['Details about what happened to your passport','A new passport application','Proof of Canadian citizenship','Government-issued identification','Passport photos','Payment'], need_list_fr:['Détails sur ce qui est arrivé à votre passeport','Une nouvelle demande de passeport','Preuve de citoyenneté canadienne','Pièce d\'identité émise par le gouvernement','Photos de passeport','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Report the lost, stolen or damaged passport.','Complete a new passport application.','Submit all required supporting documents.'], steps_list_fr:['Signalez le passeport perdu, volé ou endommagé.','Complétez une nouvelle demande de passeport.','Soumettez tous les documents à l\'appui requis.'], tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['A replacement passport is processed similarly to a new passport application.','If your passport is lost while travelling outside Canada, contact the nearest Canadian embassy, high commission or consulate immediately.'], tips_list_fr:['Un passeport de remplacement est traité de façon similaire à une nouvelle demande de passeport.','Si votre passeport est perdu à l\'extérieur du Canada, contactez immédiatement l\'ambassade, le haut-commissariat ou le consulat canadien le plus près.'], official_links:[{label_en:'Lost, Stolen or Damaged Passport', label_fr:'Passeport perdu, volé ou endommagé', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/lost-stolen-inaccessible-damaged-found.html"},{label_en:'Find a Passport Office', label_fr:'Trouver un bureau des passeports', url:"https://offices.service.canada.ca/en/SearchPassport"}], related:['adult-passport-application','passport-renewal','urgent-express-passport-services'], reviewed:'August 2026', slug:'lost-stolen-or-damaged-passport'}
      ] }
    ] },
  { icon:'passport', en:'United States Citizens', fr:'Citoyens américains',
    intro_en:'Passport, citizenship, and identity services for U.S. citizens living in or visiting Quebec.',
    intro_fr:'Services de passeport, de citoyenneté et d\'identité pour les citoyens américains vivant au Québec ou en visite.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'U.S. Passport', fr:'Demande de passeport américain', desc_en:'Apply for, renew, replace, or update a U.S. passport.', desc_fr:'Faites une demande, renouvelez, remplacez ou mettez à jour un passeport américain.', url:"https://travel.state.gov/content/travel/en/passports.html", what_en:'This is the official starting point for U.S. citizens applying for or renewing an American passport from Canada.', what_fr:'Voici le point de départ officiel pour les citoyens américains qui font une demande ou un renouvellement de passeport américain depuis le Canada.', question_en:'Is this the right service?', question_fr:'Est-ce le bon service?', answer_en:'Use this page if you are a U.S. citizen and need to apply for your first U.S. passport, renew an existing passport, replace a lost or stolen passport, or update your passport after a name change.', answer_fr:'Utilisez cette page si vous êtes citoyen américain et devez faire une demande pour votre premier passeport américain, renouveler un passeport existant, remplacer un passeport perdu ou volé, ou mettre à jour votre passeport après un changement de nom.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'The documents required depend on your situation, but generally include:', need_intro_fr:'Les documents requis dépendent de votre situation, mais incluent généralement :', need_list_en:['Proof of U.S. citizenship','Government-issued identification','One passport photo','The appropriate passport application form','Payment'], need_list_fr:['Preuve de citoyenneté américaine','Pièce d\'identité émise par le gouvernement','Une photo de passeport','Le formulaire de demande de passeport approprié','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'The U.S. Department of State will guide you to the correct application based on your situation. Follow the instructions provided for mailing your application or booking an appointment if required.', steps_fr:'Le Département d\'État américain vous guidera vers la bonne demande selon votre situation. Suivez les instructions fournies pour envoyer votre demande par la poste ou prendre rendez-vous si nécessaire.', tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['First-time applications and renewals use different forms.','Eligible adults renewing a passport may be able to renew online, but this generally requires being physically located within the United States at the time of application — most U.S. citizens applying from Quebec will need to renew by mail instead.','If you\'re travelling soon, check current processing times before applying.'], tips_list_fr:['Les premières demandes et les renouvellements utilisent des formulaires différents.','Les adultes admissibles au renouvellement pourraient pouvoir renouveler en ligne, mais cela exige généralement de se trouver physiquement aux États-Unis au moment de la demande — la plupart des citoyens américains faisant une demande depuis le Québec devront renouveler par la poste.','Si vous voyagez bientôt, vérifiez les délais de traitement actuels avant de faire la demande.'], official_links:[{label_en:'U.S. Passport Services', label_fr:'Services de passeport américain', url:"https://travel.state.gov/content/travel/en/passports.html"},{label_en:'U.S. Embassy & Consulate Services', label_fr:'Services de l\'ambassade et des consulats américains', url:"https://ca.usembassy.gov/services/"}], related:['first-us-passport-for-a-child','consular-report-of-birth-abroad-crba','embassy-consulate-appointments'], reviewed:'August 2026', slug:'us-passport-application'},
        {en:'Consular Report of Birth Abroad (CRBA)', fr:'Rapport consulaire de naissance à l\'étranger (CRBA)', desc_en:'Register a child born outside the United States to a U.S. citizen parent.', desc_fr:'Enregistrez un enfant né à l\'extérieur des États-Unis d\'un parent citoyen américain.', url:"https://travel.state.gov/en/international-travel/living-abroad/birth.html", what_en:'This document (called a CRBA) registers a child\'s U.S. citizenship when they were born outside the United States to a U.S. citizen parent.', what_fr:'Ce document (appelé CRBA) enregistre la citoyenneté américaine d\'un enfant né à l\'extérieur des États-Unis d\'un parent citoyen américain.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Apply for a Consular Report of Birth Abroad (CRBA) if your child was born outside the United States and may qualify for U.S. citizenship through one or both parents. A CRBA is proof of U.S. citizenship and is often applied for together with the child\'s first U.S. passport.', answer_fr:'Faites une demande de rapport consulaire de naissance à l\'étranger (CRBA) si votre enfant est né à l\'extérieur des États-Unis et pourrait être admissible à la citoyenneté américaine par un ou les deux parents. Le CRBA est une preuve de citoyenneté américaine et est souvent demandé en même temps que le premier passeport américain de l\'enfant.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You\'ll generally need:', need_intro_fr:'Vous aurez généralement besoin de :', need_list_en:['The child\'s birth certificate','Proof of the parent\'s U.S. citizenship','Parents\' identification','Evidence of the parent\'s physical presence in the United States (if required)','Supporting family documents, such as a marriage certificate if applicable'], need_list_fr:['Le certificat de naissance de l\'enfant','Preuve de citoyenneté américaine du parent','Pièces d\'identité des parents','Preuve de présence physique du parent aux États-Unis (si requis)','Documents familiaux à l\'appui, comme un certificat de mariage le cas échéant'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Schedule an appointment with a U.S. Embassy or Consulate.','Bring all required documents and complete the application during your appointment.'], steps_list_fr:['Prenez rendez-vous avec une ambassade ou un consulat américain.','Apportez tous les documents requis et complétez la demande lors de votre rendez-vous.'], tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['Apply as soon as practical after the child\'s birth.','A CRBA can only be issued while the child is under 18 years of age.','Many families apply for the child\'s first U.S. passport during the same appointment.'], tips_list_fr:['Faites la demande le plus tôt possible après la naissance de l\'enfant.','Un CRBA ne peut être délivré que si l\'enfant a moins de 18 ans.','Plusieurs familles font la demande du premier passeport américain de l\'enfant lors du même rendez-vous.'], official_links:[{label_en:'Consular Report of Birth Abroad', label_fr:'Rapport consulaire de naissance à l\'étranger', url:"https://travel.state.gov/en/international-travel/living-abroad/birth.html"},{label_en:'U.S. Embassy & Consulate Services', label_fr:'Services de l\'ambassade et des consulats américains', url:"https://ca.usembassy.gov/services/"}], related:['first-us-passport-for-a-child','social-security-number','us-passport-application'], reviewed:'August 2026', slug:'consular-report-of-birth-abroad-crba'},
        {en:'First U.S. Passport for a Child', fr:'Premier passeport américain pour un enfant', desc_en:'Apply for a child\'s first U.S. passport.', desc_fr:'Faites une demande pour le premier passeport américain d\'un enfant.', url:"https://travel.state.gov/en/passports/apply/child/under-16.html", what_en:'This is for a child who has never had a U.S. passport before.', what_fr:'Ceci concerne un enfant qui n\'a jamais eu de passeport américain.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Use this application if your child has never had a U.S. passport.', answer_fr:'Utilisez cette demande si votre enfant n\'a jamais eu de passeport américain.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You\'ll generally need:', need_intro_fr:'Vous aurez généralement besoin de :', need_list_en:['Proof of the child\'s U.S. citizenship','Proof of the parents\' relationship to the child','Parents\' identification','One passport photo','Payment'], need_list_fr:['Preuve de citoyenneté américaine de l\'enfant','Preuve de la relation des parents avec l\'enfant','Pièces d\'identité des parents','Une photo de passeport','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Book an appointment at a U.S. Embassy, Consulate, or Passport Acceptance Facility, depending on where you are applying.','Attend the appointment with your child and all required documents.'], steps_list_fr:['Prenez rendez-vous à une ambassade, un consulat ou un centre d\'acceptation de passeports américain, selon l\'endroit où vous faites la demande.','Assistez au rendez-vous avec votre enfant et tous les documents requis.'], tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['First-time child passport applications must normally be submitted in person.','If one parent cannot attend, additional consent forms or documentation may be required.'], tips_list_fr:['Les premières demandes de passeport pour enfant doivent normalement être soumises en personne.','Si un parent ne peut être présent, des formulaires de consentement ou documents supplémentaires peuvent être requis.'], official_links:[{label_en:'First Child Passport', label_fr:'Premier passeport pour enfant', url:"https://travel.state.gov/en/passports/apply/child/under-16.html"},{label_en:'U.S. Embassy & Consulate Services', label_fr:'Services de l\'ambassade et des consulats américains', url:"https://ca.usembassy.gov/services/"}], related:['consular-report-of-birth-abroad-crba','us-passport-application','social-security-number'], reviewed:'August 2026', slug:'first-us-passport-for-a-child'},
        {en:'Social Security Number (SSN)', fr:'Numéro de sécurité sociale', desc_en:'Apply for a Social Security card or replacement.', desc_fr:'Faites une demande de carte de sécurité sociale ou de remplacement.', url:"https://www.ssa.gov/number-card", what_en:'A Social Security Number is required for employment, taxes, and many U.S. government services.', what_fr:'Un numéro de sécurité sociale est requis pour le travail, les impôts et plusieurs services gouvernementaux américains.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Use this service if you need to apply for your first Social Security Number, apply for your child\'s first Social Security Number, replace a lost Social Security card, or update your Social Security record.', answer_fr:'Utilisez ce service si vous devez faire une demande pour votre premier numéro de sécurité sociale, celui de votre enfant, remplacer une carte perdue, ou mettre à jour votre dossier.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'The required documents depend on your situation but generally include:', need_intro_fr:'Les documents requis dépendent de votre situation, mais incluent généralement :', need_list_en:['Proof of identity','Proof of U.S. citizenship or immigration status','Supporting documents if changing information on your record'], need_list_fr:['Preuve d\'identité','Preuve de citoyenneté américaine ou de statut d\'immigration','Documents à l\'appui si vous modifiez des renseignements à votre dossier'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'Follow the instructions provided by the Social Security Administration for your specific situation. Some applications can be completed online, while others require an appointment or supporting documents.', steps_fr:'Suivez les instructions fournies par la Social Security Administration selon votre situation. Certaines demandes peuvent être complétées en ligne, tandis que d\'autres nécessitent un rendez-vous ou des documents à l\'appui.', official_links:[{label_en:'Social Security Number Services', label_fr:'Services de numéro de sécurité sociale', url:"https://www.ssa.gov/number-card"}], related:['consular-report-of-birth-abroad-crba','first-us-passport-for-a-child','us-passport-application'], reviewed:'August 2026', slug:'social-security-number'},
        {en:'U.S. Embassy & Consulate Appointments', fr:'Rendez-vous à l\'ambassade et au consulat', desc_en:'Book appointments for U.S. citizen services in Canada.', desc_fr:'Prenez rendez-vous pour les services aux citoyens américains au Canada.', url:"https://ca.usembassy.gov/services/", what_en:'Many U.S. citizen services require an appointment, including passport services, Consular Report of Birth Abroad, notarial services, and emergency passport assistance.', what_fr:'Plusieurs services aux citoyens américains nécessitent un rendez-vous, incluant les services de passeport, le rapport consulaire de naissance à l\'étranger, les services notariaux et l\'assistance passeport d\'urgence.', need_heading_en:'Before You Book', need_heading_fr:'Avant de réserver', need_en:'Check which Embassy or Consulate provides the service you need. Some services are only available at certain locations.', need_fr:'Vérifiez quelle ambassade ou quel consulat offre le service dont vous avez besoin. Certains services ne sont offerts qu\'à certains endroits.', steps_heading_en:'How to Book', steps_heading_fr:'Comment réserver', steps_en:'Select your required service and follow the online appointment instructions. Bring all required documents to your appointment.', steps_fr:'Sélectionnez le service requis et suivez les instructions de rendez-vous en ligne. Apportez tous les documents requis à votre rendez-vous.', official_links:[{label_en:'U.S. Embassy & Consulate Services', label_fr:'Services de l\'ambassade et des consulats américains', url:"https://ca.usembassy.gov/services/"}], related:['us-passport-application','consular-report-of-birth-abroad-crba','first-us-passport-for-a-child'], reviewed:'August 2026', slug:'embassy-consulate-appointments', label_en1:'Book Appointment →', label_fr1:'Prendre rendez-vous →'}
      ] }
    ] },
  { icon:'check', en:'NEXUS', fr:'NEXUS',
    intro_en:'NEXUS is a trusted traveller program jointly administered by the Canada Border Services Agency (CBSA) and U.S. Customs and Border Protection (CBP). Members enjoy expedited processing at participating land border crossings, airports, and marine reporting locations.',
    intro_fr:'NEXUS est un programme de voyageur digne de confiance administré conjointement par l\'Agence des services frontaliers du Canada (ASFC) et le U.S. Customs and Border Protection (CBP). Les membres bénéficient d\'un traitement accéléré aux points d\'entrée terrestres, aéroports et postes maritimes participants.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Apply for NEXUS', fr:'Faire une demande NEXUS', desc_en:'Apply for a new NEXUS membership.', desc_fr:'Faites une demande de nouvelle adhésion NEXUS.', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/nexus-4-eng.html", what_en:'NEXUS allows pre-approved, low-risk travellers to cross the Canada–U.S. border more quickly at participating airports, land crossings, and marine locations.', what_fr:'NEXUS permet aux voyageurs pré-approuvés à faible risque de traverser la frontière Canada–États-Unis plus rapidement aux aéroports, postes frontaliers terrestres et emplacements maritimes participants.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Apply if you have never been a NEXUS member and would like faster border crossings between Canada and the United States.', answer_fr:'Faites une demande si vous n\'avez jamais été membre NEXUS et souhaitez traverser la frontière Canada–États-Unis plus rapidement.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You\'ll need:', need_intro_fr:'Vous aurez besoin de :', need_list_en:['A Trusted Traveler Programs (TTP) account','Valid passport(s)','Driver\'s licence or other government-issued identification','Your address and travel history','Payment of the application fee'], need_list_fr:['Un compte Trusted Traveler Programs (TTP)','Passeport(s) valide(s)','Permis de conduire ou autre pièce d\'identité émise par le gouvernement','Votre adresse et historique de voyage','Le paiement des frais de demande'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Create a Trusted Traveler Programs account.','Complete the online application.','Pay the application fee.','Wait for conditional approval.','Book and attend your interview.'], steps_list_fr:['Créez un compte Trusted Traveler Programs.','Complétez la demande en ligne.','Payez les frais de demande.','Attendez l\'approbation conditionnelle.','Réservez et assistez à votre entrevue.'], tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['Every applicant, including children, must have their own application.','Children may apply free of charge when eligibility requirements are met.','Approval is not automatic.'], tips_list_fr:['Chaque demandeur, incluant les enfants, doit avoir sa propre demande.','Les enfants peuvent faire une demande gratuitement lorsque les critères d\'admissibilité sont respectés.','L\'approbation n\'est pas automatique.'], official_links:[{label_en:'Apply for NEXUS', label_fr:'Faire une demande NEXUS', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/nexus-4-eng.html"}], related:['renew-or-replace-nexus','schedule-your-interview','find-an-enrolment-centre'], reviewed:'September 2026', slug:'apply-for-nexus'},
        {en:'Renew or Replace NEXUS', fr:'Renouveler ou remplacer NEXUS', desc_en:'Renew your NEXUS membership or replace a lost, stolen, or damaged card.', desc_fr:'Renouvelez votre adhésion NEXUS ou remplacez une carte perdue, volée ou endommagée.', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/nexus-6-eng.html", what_en:'This covers renewing a NEXUS membership before it expires, or replacing a card that\'s lost or damaged.', what_fr:'Ceci concerne le renouvellement d\'une adhésion NEXUS avant son expiration, ou le remplacement d\'une carte perdue ou endommagée.', question_en:'Is this the right application?', question_fr:'Est-ce la bonne demande?', answer_en:'Use this service if your membership is expiring or your card has been lost, stolen, or damaged.', answer_fr:'Utilisez ce service si votre adhésion arrive à échéance ou si votre carte a été perdue, volée ou endommagée.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_en:'You\'ll need your Trusted Traveler Programs account and your membership information.', need_fr:'Vous aurez besoin de votre compte Trusted Traveler Programs et de vos renseignements d\'adhésion.', steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'Sign in to your account and submit your renewal or replacement request online. You may be asked to attend another interview.', steps_fr:'Connectez-vous à votre compte et soumettez votre demande de renouvellement ou de remplacement en ligne. On pourrait vous demander d\'assister à une autre entrevue.', tips_heading_en:'Before You Apply', tips_heading_fr:'Avant de faire la demande', tips_list_en:['Renew your membership before it expires to avoid interruptions to your NEXUS benefits.'], tips_list_fr:['Renouvelez votre adhésion avant son expiration pour éviter toute interruption de vos avantages NEXUS.'], official_links:[{label_en:'Renew or Replace NEXUS', label_fr:'Renouveler ou remplacer NEXUS', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/nexus-6-eng.html"}], related:['apply-for-nexus','schedule-your-interview'], reviewed:'September 2026', slug:'renew-or-replace-nexus'},
        {en:'Schedule Your Interview', fr:'Planifier votre entrevue', desc_en:'Book your required NEXUS enrolment interview.', desc_fr:'Réservez votre entrevue d\'inscription NEXUS requise.', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/centres-eng.html", what_en:'After receiving conditional approval, you\'ll need to schedule an interview before your membership can be approved.', what_fr:'Après avoir reçu une approbation conditionnelle, vous devrez planifier une entrevue avant que votre adhésion puisse être approuvée.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'Bring:', need_intro_fr:'Apportez :', need_list_en:['Your passport(s)','Additional identification if requested','Any documents listed in your appointment confirmation'], need_list_fr:['Votre ou vos passeports','Pièces d\'identité supplémentaires si demandées','Tout document indiqué dans votre confirmation de rendez-vous'], steps_heading_en:'How to Schedule', steps_heading_fr:'Comment planifier', steps_en:'Log in to your Trusted Traveler Programs account and select an available interview location and appointment time.', steps_fr:'Connectez-vous à votre compte Trusted Traveler Programs et sélectionnez un lieu d\'entrevue et une heure de rendez-vous disponibles.', tips_heading_en:'Before Your Appointment', tips_heading_fr:'Avant votre rendez-vous', tips_list_en:['Arrive on time and bring all required documents.','Missing documents may require you to reschedule.'], tips_list_fr:['Arrivez à l\'heure et apportez tous les documents requis.','Des documents manquants pourraient vous obliger à reprendre rendez-vous.'], official_links:[{label_en:'Schedule Interview', label_fr:'Planifier une entrevue', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/centres-eng.html"}], related:['apply-for-nexus','find-an-enrolment-centre'], reviewed:'September 2026', slug:'schedule-your-interview', label_en1:'Schedule Interview →', label_fr1:'Planifier une entrevue →'},
        {en:'Where NEXUS Interviews Take Place', fr:'Où se déroulent les entrevues NEXUS', desc_en:'See which airports and land border crossings host NEXUS interviews.', desc_fr:'Voyez quels aéroports et postes frontaliers terrestres accueillent les entrevues NEXUS.', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/centres-eng.html", what_en:'NEXUS interviews are held at participating airports and land border crossings. CBSA does not publish a single directory of locations — available centres and appointment times are shown in the Trusted Traveler Programs system when you book.', what_fr:'Les entrevues NEXUS ont lieu dans les aéroports et postes frontaliers terrestres participants. L\'ASFC ne publie pas de répertoire unique des emplacements : les centres disponibles et les plages de rendez-vous apparaissent dans le système Trusted Traveler Programs au moment de réserver.', need_heading_en:'Before You Go', need_heading_fr:'Avant de vous déplacer', need_intro_en:'Check:', need_intro_fr:'Vérifiez :', need_list_en:['Appointment availability','Office hours','Services offered'], need_list_fr:['La disponibilité des rendez-vous','Les heures d\'ouverture','Les services offerts'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Sign in to the Trusted Traveler Programs system to see which centres have appointments available and when.', steps_fr:'Connectez-vous au système Trusted Traveler Programs pour voir quels centres ont des rendez-vous disponibles et à quel moment.', official_links:[{label_en:'Where NEXUS Interviews Take Place', label_fr:'Où se déroulent les entrevues NEXUS', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/centres-eng.html"}], related:['apply-for-nexus','schedule-your-interview','renew-or-replace-nexus'], reviewed:'September 2026', slug:'find-an-enrolment-centre', label_en1:'See Interview Locations →', label_fr1:'Voir les lieux d\'entrevue →'},
        {en:'Credit Cards That Reimburse NEXUS Fees', fr:'Cartes de crédit qui remboursent les frais NEXUS', desc_en:'See which travel credit cards cover the NEXUS application or renewal fee.', desc_fr:'Voyez quelles cartes de crédit voyage couvrent les frais de demande ou de renouvellement NEXUS.', what_en:'Many premium travel credit cards reimburse the NEXUS application or renewal fee as a statement credit. The NEXUS application processing fee is US$120 and is non-refundable, and a NEXUS membership is valid for 5 years.', what_fr:'Plusieurs cartes de crédit voyage haut de gamme remboursent les frais de demande ou de renouvellement NEXUS sous forme de crédit sur relevé. Les frais de traitement de la demande NEXUS sont de 120 $ US et ne sont pas remboursables, et l’adhésion NEXUS est valide 5 ans.', question_en:'How does the reimbursement work?', question_fr:'Comment fonctionne le remboursement?', answer_en:'You pay the NEXUS fee with an eligible card and the card issuer posts a statement credit. The credit comes from the card issuer, not from CBSA or CBP. Eligibility, the amount and how often it can be claimed are set by the issuer and can change at any time, so verify directly with your card issuer before applying or renewing.', answer_fr:'Vous payez les frais NEXUS avec une carte admissible et l’émetteur de la carte porte un crédit à votre relevé. Le crédit provient de l’émetteur de la carte, et non de l’ASFC ou du CBP. L’admissibilité, le montant et la fréquence sont fixés par l’émetteur et peuvent changer en tout temps ; vérifiez donc directement auprès de votre émetteur avant de faire une demande ou un renouvellement.', need_heading_en:'Canadian Credit Cards', need_heading_fr:'Cartes de crédit canadiennes', need_intro_en:'Statement credit and how often it can be claimed:', need_intro_fr:'Crédit sur relevé et fréquence :', need_list_en:['American Express Platinum Card — up to $100 CAD, once every 4 years','American Express Business Platinum Card — up to $100 CAD, once every 4 years','TD Aeroplan Visa Infinite Privilege — up to $100 CAD, every 48 months','TD Aeroplan Business Visa Infinite — up to $100 CAD, every 48 months','CIBC Aeroplan Visa Infinite Privilege — up to $100 CAD, every 48 months','CIBC Aeroplan Business Visa Infinite — up to $100 CAD, every 48 months'], need_list_fr:['American Express Platinum Card — jusqu’à 100 $ CA, une fois tous les 4 ans','American Express Business Platinum Card — jusqu’à 100 $ CA, une fois tous les 4 ans','TD Aeroplan Visa Infinite Privilege — jusqu’à 100 $ CA, tous les 48 mois','TD Aeroplan Business Visa Infinite — jusqu’à 100 $ CA, tous les 48 mois','CIBC Aeroplan Visa Infinite Privilege — jusqu’à 100 $ CA, tous les 48 mois','CIBC Aeroplan Business Visa Infinite — jusqu’à 100 $ CA, tous les 48 mois'], tips_heading_en:'United States Credit Cards', tips_heading_fr:'Cartes de crédit américaines', tips_list_en:['Chase Sapphire Reserve® — up to US$120, every 4 years','Chase Sapphire Reserve Business℠ — up to US$120, every 4 years','Chase Aeroplan® Credit Card — up to US$120, every 4 years','United Club℠ Card — up to US$120, every 4 years','United Quest℠ Card — up to US$120, every 4 years','United Explorer℠ Card — up to US$120, every 4 years','IHG One Rewards Premier Credit Card — up to US$120, every 4 years','IHG One Rewards Premier Business Credit Card — up to US$120, every 4 years','Southwest Rapid Rewards® Performance Business Card — up to US$120, every 4 years'], tips_list_fr:['Chase Sapphire Reserve® — jusqu’à 120 $ US, tous les 4 ans','Chase Sapphire Reserve Business℠ — jusqu’à 120 $ US, tous les 4 ans','Chase Aeroplan® Credit Card — jusqu’à 120 $ US, tous les 4 ans','United Club℠ Card — jusqu’à 120 $ US, tous les 4 ans','United Quest℠ Card — jusqu’à 120 $ US, tous les 4 ans','United Explorer℠ Card — jusqu’à 120 $ US, tous les 4 ans','IHG One Rewards Premier Credit Card — jusqu’à 120 $ US, tous les 4 ans','IHG One Rewards Premier Business Credit Card — jusqu’à 120 $ US, tous les 4 ans','Southwest Rapid Rewards® Performance Business Card — jusqu’à 120 $ US, tous les 4 ans'], official_links:[{label_en:'NEXUS fees and membership (CBSA)', label_fr:'Frais et adhésion NEXUS (ASFC)', url:"https://www.cbsa-asfc.gc.ca/services/travel-voyage/prog/nexus/menu-eng.html"}], related:['apply-for-nexus','renew-or-replace-nexus'], facts_en:[{label:'Current NEXUS Membership Fee',value:'US$120'},{label:'Membership Validity',value:'5 Years'}], facts_fr:[{label:'Frais d’adhésion NEXUS actuels',value:'120 $ US'},{label:'Validité de l’adhésion',value:'5 ans'}], tables_en:[{heading:'Canadian Credit Cards',cols:['Card','Statement Credit','Benefit'],rows:[['American Express Platinum Card','Up to $100 CAD','Once every 4 years'],['American Express Business Platinum Card','Up to $100 CAD','Once every 4 years'],['TD Aeroplan Visa Infinite Privilege','Up to $100 CAD','Every 48 months'],['TD Aeroplan Business Visa Infinite','Up to $100 CAD','Every 48 months'],['CIBC Aeroplan Visa Infinite Privilege','Up to $100 CAD','Every 48 months'],['CIBC Aeroplan Business Visa Infinite','Up to $100 CAD','Every 48 months']]},{heading:'United States Credit Cards',cols:['Card','Statement Credit','Benefit'],rows:[['Chase Sapphire Reserve®','Up to US$120','Every 4 years'],['Chase Sapphire Reserve Business℠','Up to US$120','Every 4 years'],['Chase Aeroplan® Credit Card','Up to US$120','Every 4 years'],['United Club℠ Card','Up to US$120','Every 4 years'],['United Quest℠ Card','Up to US$120','Every 4 years'],['United Explorer℠ Card','Up to US$120','Every 4 years'],['IHG One Rewards Premier Credit Card','Up to US$120','Every 4 years'],['IHG One Rewards Premier Business Credit Card','Up to US$120','Every 4 years'],['Southwest Rapid Rewards® Performance Business Card','Up to US$120','Every 4 years']]}], tables_fr:[{heading:'Cartes de crédit canadiennes',cols:['Carte','Crédit sur relevé','Avantage'],rows:[['American Express Platinum Card','Jusqu’à 100 $ CA','Une fois tous les 4 ans'],['American Express Business Platinum Card','Jusqu’à 100 $ CA','Une fois tous les 4 ans'],['TD Aeroplan Visa Infinite Privilege','Jusqu’à 100 $ CA','Tous les 48 mois'],['TD Aeroplan Business Visa Infinite','Jusqu’à 100 $ CA','Tous les 48 mois'],['CIBC Aeroplan Visa Infinite Privilege','Jusqu’à 100 $ CA','Tous les 48 mois'],['CIBC Aeroplan Business Visa Infinite','Jusqu’à 100 $ CA','Tous les 48 mois']]},{heading:'Cartes de crédit américaines',cols:['Carte','Crédit sur relevé','Avantage'],rows:[['Chase Sapphire Reserve®','Jusqu’à 120 $ US','Tous les 4 ans'],['Chase Sapphire Reserve Business℠','Jusqu’à 120 $ US','Tous les 4 ans'],['Chase Aeroplan® Credit Card','Jusqu’à 120 $ US','Tous les 4 ans'],['United Club℠ Card','Jusqu’à 120 $ US','Tous les 4 ans'],['United Quest℠ Card','Jusqu’à 120 $ US','Tous les 4 ans'],['United Explorer℠ Card','Jusqu’à 120 $ US','Tous les 4 ans'],['IHG One Rewards Premier Credit Card','Jusqu’à 120 $ US','Tous les 4 ans'],['IHG One Rewards Premier Business Credit Card','Jusqu’à 120 $ US','Tous les 4 ans'],['Southwest Rapid Rewards® Performance Business Card','Jusqu’à 120 $ US','Tous les 4 ans']]}], reviewed:'September 2026', slug:'nexus-fee-credit-cards', label_en1:'NEXUS Fees & Membership →', label_fr1:'Frais et adhésion NEXUS →'}
      ] }
    ] },
  { icon:'globe', en:'Travel & Border Crossing', fr:'Voyage et passage frontalier',
    intro_en:'Wait times, duty-free limits, travel insurance, and documentation for crossing the Canada–U.S. border.',
    intro_fr:'Temps d\'attente, limites hors taxes, assurance voyage et documents pour traverser la frontière Canada–États-Unis.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Canada Border Services Agency (CBSA)', fr:'Agence des services frontaliers du Canada (ASFC)', desc_en:'Official information for returning to Canada.', desc_fr:'Renseignements officiels pour le retour au Canada.', url:"https://www.cbsa-asfc.gc.ca/menu-eng.html", what_en:'Use this if you\'re returning to Canada and need information about what you must declare, what you can bring back, and border rules and customs requirements.', what_fr:'Utilisez ceci si vous revenez au Canada et avez besoin d\'information sur ce que vous devez déclarer, ce que vous pouvez rapporter, et les règles frontalières et exigences douanières.', need_heading_en:'Before You Cross', need_heading_fr:'Avant de traverser', need_intro_en:'Have ready:', need_intro_fr:'Ayez en main :', need_list_en:['Your passport or other accepted travel document','Receipts for purchases made outside Canada','Details of any alcohol, tobacco, food, gifts, or high-value items you\'re bringing back'], need_list_fr:['Votre passeport ou autre document de voyage accepté','Les reçus de vos achats effectués à l\'extérieur du Canada','Les détails de tout alcool, tabac, nourriture, cadeaux ou articles de grande valeur que vous rapportez'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'A good page to check before any trip, especially if you\'re unsure what needs to be declared.', steps_fr:'Une bonne page à consulter avant tout voyage, surtout si vous n\'êtes pas certain de ce qui doit être déclaré.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['You must declare everything you purchased or are bringing back into Canada, even if it qualifies for a duty-free exemption.','Failure to declare goods may result in fines, seizure of goods, or additional penalties.'], tips_list_fr:['Vous devez déclarer tout ce que vous avez acheté ou rapportez au Canada, même si cela est admissible à une exemption hors taxes.','Omettre de déclarer des biens peut entraîner des amendes, la saisie de biens ou des pénalités supplémentaires.'], official_links:[{label_en:'Canada Border Services Agency', label_fr:'Agence des services frontaliers du Canada', url:"https://www.cbsa-asfc.gc.ca/menu-eng.html"}], related:['duty-free-allowances','border-wait-times','children-travelling'], reviewed:'September 2026', slug:'canada-border-services-agency-cbsa', label_en1:'Visit CBSA →', label_fr1:'Visiter l\'ASFC →'},
        {en:'U.S. Customs & Border Protection (CBP)', fr:'U.S. Customs & Border Protection (CBP)', desc_en:'Official information for entering the United States.', desc_fr:'Renseignements officiels pour entrer aux États-Unis.', url:"https://www.cbp.gov/travel", what_en:'Use this before travelling to the United States to confirm entry requirements, accepted travel documents, customs regulations, and items that may be restricted or prohibited.', what_fr:'Utilisez ceci avant de voyager aux États-Unis pour confirmer les exigences d\'entrée, les documents de voyage acceptés, les règlements douaniers et les articles pouvant être restreints ou interdits.', need_heading_en:'Before You Cross', need_heading_fr:'Avant de traverser', need_intro_en:'Have ready:', need_intro_fr:'Ayez en main :', need_list_en:['Your passport or other accepted travel document','Any visas or travel authorizations, if required','Supporting documents if requested by U.S. border officers'], need_list_fr:['Votre passeport ou autre document de voyage accepté','Tout visa ou autorisation de voyage, si requis','Documents à l\'appui si demandés par les agents frontaliers américains'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Review this before crossing into the U.S. to confirm your documents and any items you\'re bringing meet current requirements.', steps_fr:'Consultez cette page avant de traverser vers les États-Unis pour confirmer que vos documents et les articles que vous apportez respectent les exigences actuelles.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Border officers may ask questions about your trip, where you\'re staying, and how long you plan to remain in the United States.','Answer all questions truthfully and completely.'], tips_list_fr:['Les agents frontaliers peuvent poser des questions sur votre voyage, votre lieu de séjour et la durée prévue de votre séjour aux États-Unis.','Répondez à toutes les questions de façon honnête et complète.'], official_links:[{label_en:'U.S. Customs & Border Protection', label_fr:'U.S. Customs & Border Protection', url:"https://www.cbp.gov/travel"}], related:['border-wait-times','apply-for-nexus','children-travelling'], reviewed:'September 2026', slug:'us-customs-border-protection-cbp', label_en1:'Visit CBP →', label_fr1:'Visiter le CBP →'},
        {en:'Border Wait Times', fr:'Temps d\'attente à la frontière', desc_en:'View live wait times at Canada–U.S. land border crossings.', desc_fr:'Consultez les temps d\'attente en direct aux postes frontaliers terrestres Canada–États-Unis.', url:"https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html", what_en:'Check current border wait times before leaving home. The tool shows estimated wait times for most Canada–U.S. land border crossings.', what_fr:'Vérifiez les temps d\'attente actuels avant de quitter la maison. L\'outil affiche les temps d\'attente estimés pour la plupart des postes frontaliers terrestres Canada–États-Unis.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Check it before you leave, especially on busy travel days, to pick the crossing with the shortest wait.', steps_fr:'Vérifiez-le avant de partir, surtout les jours de grand achalandage, pour choisir le poste frontalier avec le moins d\'attente.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Wait times change throughout the day.','Friday afternoons, Sunday evenings, long weekends, and holiday periods are usually the busiest.','If you have flexibility, choosing another crossing can often save considerable time.'], tips_list_fr:['Les temps d\'attente changent tout au long de la journée.','Les vendredis après-midi, dimanches soirs, longs weekends et périodes de congé sont habituellement les plus achalandés.','Si vous avez de la flexibilité, choisir un autre poste frontalier peut souvent faire économiser beaucoup de temps.'], official_links:[{label_en:'Canada–U.S. Border Wait Times', label_fr:'Temps d\'attente à la frontière Canada–États-Unis', url:"https://www.cbsa-asfc.gc.ca/bwt-taf/menu-eng.html"}], related:['apply-for-nexus','canada-border-services-agency-cbsa','us-customs-border-protection-cbp'], reviewed:'September 2026', slug:'border-wait-times', label_en1:'Check Wait Times →', label_fr1:'Vérifier les temps d\'attente →'},
        {en:'Duty-Free Allowances', fr:'Exemptions hors taxes', desc_en:'Understand what you can bring back to Canada without paying duty or taxes.', desc_fr:'Comprenez ce que vous pouvez rapporter au Canada sans payer de droits ou de taxes.', url:"https://travel.gc.ca/returning/customs/bringing-to-canada/personal-exemptions-mini-guide", what_en:'Review these exemptions before returning to Canada after travelling outside the country.', what_fr:'Consultez ces exemptions avant de revenir au Canada après un voyage à l\'extérieur du pays.', need_heading_en:'Duty-Free Exemptions', need_heading_fr:'Exemptions hors taxes', need_list_en:['Less than 24 hours: No personal exemption.','24 hours or more: Up to CAN\$200 worth of goods. Alcohol and tobacco products are not included in this exemption.','48 hours or more: Up to CAN\$800 worth of goods, plus an alcohol allowance — choose one of 1.5 litres of wine, or 1.14 litres of liquor, or 8.5 litres of beer/ale — and a tobacco allowance of all of the following: 200 cigarettes, 50 cigars, 200 g of manufactured tobacco, and 200 tobacco sticks.','7 days or more: The same CAN\$800 personal exemption. Goods other than alcohol and tobacco may follow you by mail or courier, but alcohol and tobacco must be in your possession when you enter Canada. Everything must still be declared on arrival.'], need_list_fr:['Moins de 24 heures : Aucune exemption personnelle.','24 heures ou plus : Jusqu\'à 200 \$ CA de biens. L\'alcool et le tabac ne sont pas inclus dans cette exemption.','48 heures ou plus : Jusqu\'à 800 \$ CA de biens, plus une quantité d\'alcool — au choix, 1,5 litre de vin, ou 1,14 litre de spiritueux, ou 8,5 litres de bière — et une quantité de tabac correspondant à la totalité de : 200 cigarettes, 50 cigares, 200 g de tabac manufacturé, et 200 bâtonnets de tabac.','7 jours ou plus : La même exemption personnelle de 800 \$ CA. Les biens autres que l\'alcool et le tabac peuvent vous suivre par la poste ou par messagerie, mais l\'alcool et le tabac doivent être en votre possession à votre entrée au Canada. Tout doit tout de même être déclaré à l\'arrivée.'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'We\'ve put together a quick reference table further down this page showing the exemption amounts by trip length.', steps_fr:'Nous avons préparé un tableau de référence rapide plus bas sur cette page montrant les montants d\'exemption selon la durée du voyage.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Keep receipts for everything you purchased while travelling — border officers may ask to see them.','If you exceed your exemption, you generally only pay duty and taxes on the amount over your allowance — not on everything you purchased.','The tobacco allowance applies to stamped tobacco. Product not marked \'duty paid Canada droit acquitté\' attracts a special duty even inside your exemption.','You must meet the legal drinking age of the province or territory where you enter Canada.'], tips_list_fr:['Conservez les reçus de tous vos achats en voyage — les agents frontaliers pourraient les demander.','Si vous dépassez votre exemption, vous payez généralement des droits et taxes seulement sur le montant excédentaire — pas sur la totalité de vos achats.','L\'exemption de tabac s\'applique au tabac estampillé. Un produit non marqué « droit acquitté Canada duty paid » est assujetti à un droit spécial même à l\'intérieur de votre exemption.','Vous devez respecter l\'âge légal pour consommer de l\'alcool dans la province ou le territoire où vous entrez au Canada.'], official_links:[{label_en:'Personal Exemptions Mini Guide', label_fr:'Mini-guide des exemptions personnelles', url:"https://travel.gc.ca/returning/customs/bringing-to-canada/personal-exemptions-mini-guide"},{label_en:'I Declare: A Guide for Residents Returning to Canada', label_fr:'Je déclare : Guide à l\'intention des résidents revenant au Canada', url:"https://www.cbsa-asfc.gc.ca/travel-voyage/declare-eng.html"},{label_en:'Alcohol and Tobacco Limits', label_fr:'Limites d\'alcool et de tabac', url:"https://www.cbsa-asfc.gc.ca/travel-voyage/atl-lat-eng.html"}], related:['canada-border-services-agency-cbsa'], reviewed:'September 2026', slug:'duty-free-allowances', label_en1:'View Allowances →', label_fr1:'Voir les exemptions →'},
        {en:'Children Travelling', fr:'Enfants voyageant', desc_en:'Recommended documents when travelling with children.', desc_fr:'Documents recommandés lors de voyages avec des enfants.', url:"https://travel.gc.ca/travelling/children", what_en:'Review this information if only one parent is travelling with a child, a grandparent or relative is travelling with a child, or someone other than the child\'s parent is travelling with the child.', what_fr:'Consultez cette information si un seul parent voyage avec un enfant, un grand-parent ou un proche voyage avec un enfant, ou une personne autre que le parent voyage avec l\'enfant.', need_heading_en:'Bring With You', need_heading_fr:'Apportez avec vous', need_intro_en:'It is strongly recommended to carry:', need_intro_fr:'Il est fortement recommandé d\'apporter :', need_list_en:['The child\'s passport','A consent letter signed by the parent(s) or legal guardian(s) who are not travelling','Contact information for the parent(s)'], need_list_fr:['Le passeport de l\'enfant','Une lettre de consentement signée par le ou les parents ou tuteurs légaux qui ne voyagent pas','Les coordonnées des parents'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Prepare this documentation before you travel — border officers may ask for it, and having it ready avoids delays.', steps_fr:'Préparez ces documents avant votre voyage — les agents frontaliers peuvent les demander, et les avoir en main évite des délais.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Although a consent letter is not always legally required, border officers in Canada and the United States may ask for it.','Having it ready can help prevent delays.'], tips_list_fr:['Bien qu\'une lettre de consentement ne soit pas toujours légalement requise, les agents frontaliers au Canada et aux États-Unis peuvent la demander.','L\'avoir en main peut aider à éviter des délais.'], official_links:[{label_en:'Children Travelling', label_fr:'Enfants voyageant', url:"https://travel.gc.ca/travelling/children"}], related:['child-passport','canada-border-services-agency-cbsa','us-customs-border-protection-cbp'], reviewed:'September 2026', slug:'children-travelling', label_en1:'Learn More →', label_fr1:'En savoir plus →'},
      {en:'Child Travel Consent Letter', fr:'Lettre de consentement au voyage d\'un enfant', desc_en:'Create and download a printable consent letter for a child\'s Canada\u2013U.S. travel.', desc_fr:'Cr\u00e9ez et t\u00e9l\u00e9chargez une lettre de consentement imprimable pour le voyage Canada\u2013\u00c9tats-Unis d\'un enfant.', url:'/child-travel-consent', internalPage:'child-travel-consent', label_en1:'Create Letter \u2192', label_fr1:'Cr\u00e9er la lettre \u2192', blankForm:true, what_en:'A free CJHQ tool that fills in a standard travel consent letter for a child travelling between Canada and the United States without both parents or guardians. You complete a short form, review the letter, then download or print it and sign it by hand.', what_fr:'Un outil gratuit du CJHQ qui remplit une lettre de consentement type pour un enfant voyageant entre le Canada et les \u00c9tats-Unis sans ses deux parents ou tuteurs. Vous remplissez un court formulaire, v\u00e9rifiez la lettre, puis vous la t\u00e9l\u00e9chargez ou l\'imprimez et la signez \u00e0 la main.', question_en:'Is this the right tool?', question_fr:'Est-ce le bon outil?', answer_en:'Use this if a child is crossing the Canada\u2013U.S. border with one parent, a grandparent, a relative or another adult. Border officers may ask for a consent letter. This tool creates the letter only \u2014 it is not legal advice, and it does not replace custody or court documents.', answer_fr:'Utilisez cet outil si un enfant traverse la fronti\u00e8re Canada\u2013\u00c9tats-Unis avec un seul parent, un grand-parent, un proche ou un autre adulte. Les agents frontaliers peuvent demander une lettre de consentement. Cet outil ne fait que produire la lettre \u2014 il ne constitue pas un avis juridique et ne remplace pas les documents de garde ou une ordonnance du tribunal.', need_heading_en:'What You\'ll Need', need_heading_fr:'Ce dont vous aurez besoin', need_list_en:['The child\'s full name, date of birth and passport number','The accompanying adult\'s full name, passport number and phone number','Your address and phone number','Departure and return dates'], need_list_fr:['Le nom complet, la date de naissance et le num\u00e9ro de passeport de l\'enfant','Le nom complet, le num\u00e9ro de passeport et le num\u00e9ro de t\u00e9l\u00e9phone de l\'adulte accompagnateur','Votre adresse et votre num\u00e9ro de t\u00e9l\u00e9phone','Les dates de d\u00e9part et de retour'], tips_list_en:['The letter is created in your browser. Nothing you enter is sent to CJHQ or stored anywhere.','Print the letter and sign it by hand \u2014 the signature lines are left blank on purpose.','Where possible, have the other parent or guardian sign as well.'], tips_list_fr:['La lettre est cr\u00e9\u00e9e dans votre navigateur. Rien de ce que vous saisissez n\'est envoy\u00e9 au CJHQ ni conserv\u00e9.','Imprimez la lettre et signez-la \u00e0 la main \u2014 les lignes de signature sont volontairement laiss\u00e9es vides.','Dans la mesure du possible, faites-la signer aussi par l\'autre parent ou tuteur.'], official_links:[{label_en:'Government of Canada \u2014 Children Travelling Abroad', label_fr:'Gouvernement du Canada \u2014 Enfants voyageant \u00e0 l\'\u00e9tranger', url:"https://travel.gc.ca/travelling/children"}], related:['children-travelling'], reviewed:'September 2026', slug:'child-travel-consent-letter'}
      ] },
      { heading_en:'Travel Insurance', heading_fr:'Assurance voyage', items:[
        {en:'Manulife Travel Insurance', fr:'Assurance voyage Manulife', desc_en:'Purchase travel medical insurance before leaving Canada.', desc_fr:'Achetez une assurance médicale voyage avant de quitter le Canada.', url:"https://www.manulife-travel.ca/dist/home.html?as=wllebovits", what_en:'Travel medical insurance helps protect you against unexpected medical expenses while travelling outside your home province or country.', what_fr:'L\'assurance médicale voyage vous protège contre des dépenses médicales imprévues lors d\'un voyage à l\'extérieur de votre province ou pays.', need_heading_en:'Before You Buy', need_heading_fr:'Avant d\'acheter', need_intro_en:'Have ready:', need_intro_fr:'Ayez en main :', need_list_en:['Your travel dates','Destination','Traveller information','Basic health information'], need_list_fr:['Vos dates de voyage','La destination','Les renseignements du voyageur','Des renseignements de santé de base'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Get a quote directly on their site, compare coverage options, and purchase your policy before you leave.', steps_fr:'Obtenez une soumission directement sur leur site, comparez les options de couverture, et achetez votre police avant de partir.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Provincial health coverage generally pays only a small portion of medical costs outside Canada.','Travel medical insurance can help cover emergency medical treatment, hospital stays, and medical transportation.'], tips_list_fr:['La couverture santé provinciale ne couvre généralement qu\'une petite partie des frais médicaux à l\'extérieur du Canada.','L\'assurance médicale voyage peut couvrir les traitements médicaux d\'urgence, les séjours hospitaliers et le transport médical.'], official_links:[{label_en:'Manulife Travel Insurance', label_fr:'Assurance voyage Manulife', url:"https://www.manulife-travel.ca/dist/home.html?as=wllebovits"}], related:['tugo-travel-insurance'], reviewed:'August 2026', slug:'manulife-travel-insurance', label_en1:'Get a Quote →', label_fr1:'Obtenir une soumission →'},
        {en:'TuGo Travel Insurance', fr:'Assurance voyage TuGo', desc_en:'Purchase emergency medical and trip protection insurance.', desc_fr:'Achetez une assurance médicale d\'urgence et de protection de voyage.', url:"https://shop.tugo.com/store/IAB48720", what_en:'Travel insurance helps protect against unexpected medical expenses and certain travel interruptions while away from home.', what_fr:'L\'assurance voyage protège contre des dépenses médicales imprévues et certaines interruptions de voyage loin de la maison.', need_heading_en:'Before You Buy', need_heading_fr:'Avant d\'acheter', need_intro_en:'Have ready:', need_intro_fr:'Ayez en main :', need_list_en:['Travel dates','Destination','Traveller information','Basic health information'], need_list_fr:['Les dates de voyage','La destination','Les renseignements du voyageur','Des renseignements de santé de base'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Compare plans and purchase directly through their site before your trip.', steps_fr:'Comparez les régimes et achetez directement sur leur site avant votre voyage.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Compare coverage options and limits before purchasing a policy.','Coverage varies depending on age, destination, trip length, and pre-existing medical conditions.'], tips_list_fr:['Comparez les options et limites de couverture avant d\'acheter une police.','La couverture varie selon l\'âge, la destination, la durée du voyage et les conditions médicales préexistantes.'], official_links:[{label_en:'TuGo Travel Insurance', label_fr:'Assurance voyage TuGo', url:"https://shop.tugo.com/store/IAB48720"}], related:['manulife-travel-insurance'], reviewed:'September 2026', slug:'tugo-travel-insurance', label_en1:'Get a Quote →', label_fr1:'Obtenir une soumission →'},
        {en:'New York Enhanced Driver License (EDL)', fr:'Permis de conduire amélioré de New York', desc_en:'An alternative to a passport for land and sea travel between the U.S. and Canada.', desc_fr:'Une alternative au passeport pour les déplacements terrestres et maritimes entre les États-Unis et le Canada.', url:"https://dmv.ny.gov/driver-license/enhanced-or-real-id", what_en:'A New York Enhanced Driver License can be used instead of a passport for land and sea travel between the United States and Canada.', what_fr:'Un permis de conduire amélioré de New York peut être utilisé à la place d\'un passeport pour les déplacements terrestres et maritimes entre les États-Unis et le Canada.', question_en:'When should I use this?', question_fr:'Quand dois-je utiliser ceci?', answer_en:'If you\'re a New York State resident who regularly crosses the Canada–U.S. border by land or sea, an Enhanced Driver License may be a convenient alternative to carrying a passport.', answer_fr:'Si vous résidez dans l\'État de New York et traversez régulièrement la frontière Canada–États-Unis par voie terrestre ou maritime, un permis de conduire amélioré peut être une alternative pratique au passeport.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You\'ll need:', need_intro_fr:'Vous aurez besoin de :', need_list_en:['Proof of U.S. citizenship','Proof of identity','Proof of New York residency','Payment'], need_list_fr:['Preuve de citoyenneté américaine','Preuve d\'identité','Preuve de résidence à New York','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'Apply in person at a New York DMV office. Enhanced Driver Licenses cannot be issued online.', steps_fr:'Faites la demande en personne à un bureau du DMV de New York. Les permis de conduire améliorés ne peuvent pas être émis en ligne.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['An Enhanced Driver License cannot be used for international air travel.','You will still need a passport when flying between Canada and the United States.'], tips_list_fr:['Un permis de conduire amélioré ne peut pas être utilisé pour les voyages aériens internationaux.','Vous aurez toujours besoin d\'un passeport pour les vols entre le Canada et les États-Unis.'], official_links:[{label_en:'New York Enhanced Driver License', label_fr:'Permis de conduire amélioré de New York', url:"https://dmv.ny.gov/driver-license/enhanced-or-real-id"}], related:['us-passport-application','apply-for-nexus'], reviewed:'August 2026', slug:'new-york-enhanced-drivers-license'}
      ] }
    ],
    extra_en:`<details class="res-details">
  <summary>🪪 Which Document Do I Need to Cross the Border?</summary>
  <div class="res-details-body">
    <p>A quick comparison of the documents accepted for crossing the Canada–U.S. border, depending on how you're travelling.</p>
    <table class="res-cc-table"><thead><tr><th>Document</th><th>Air Travel</th><th>Land / Sea Travel</th></tr></thead><tbody>
      <tr><td>Passport</td><td>Yes</td><td>Yes</td></tr>
      <tr><td>U.S. Passport Card</td><td>Domestic U.S. only</td><td>Yes</td></tr>
      <tr><td>NEXUS Card</td><td>Yes, at NEXUS lanes/kiosks</td><td>Yes, expedited lanes</td></tr>
      <tr><td>Enhanced Driver's License (EDL)</td><td>Domestic U.S. only</td><td>Yes</td></tr>
    </tbody></table>
    <p class="res-fee-note">Children under 16 generally need only proof of citizenship (such as a birth certificate) for land and sea travel — check current requirements before travelling.</p>
  </div>
</details>`,
    extra_fr:`<details class="res-details">
  <summary>🪪 Quel document faut-il pour traverser la frontière?</summary>
  <div class="res-details-body">
    <p>Comparaison rapide des documents acceptés pour traverser la frontière Canada–États-Unis, selon votre mode de déplacement.</p>
    <table class="res-cc-table"><thead><tr><th>Document</th><th>Voyage aérien</th><th>Voyage terrestre / maritime</th></tr></thead><tbody>
      <tr><td>Passeport</td><td>Oui</td><td>Oui</td></tr>
      <tr><td>Carte de passeport américaine</td><td>Vols intérieurs américains seulement</td><td>Oui</td></tr>
      <tr><td>Carte NEXUS</td><td>Oui, aux voies/kiosques NEXUS</td><td>Oui, voies accélérées</td></tr>
      <tr><td>Permis de conduire amélioré (EDL)</td><td>Vols intérieurs américains seulement</td><td>Oui</td></tr>
    </tbody></table>
    <p class="res-fee-note">Les enfants de moins de 16 ans ont généralement seulement besoin d'une preuve de citoyenneté (comme un certificat de naissance) pour les déplacements terrestres et maritimes — vérifiez les exigences actuelles avant de voyager.</p>
  </div>
</details>` },
  { icon:'globe', en:'Canadian Citizens Living Abroad', fr:'Citoyens canadiens vivant à l\'étranger',
    intro_en:'Services for Canadian citizens living outside Canada, including emergency assistance, voting, and passport services.',
    intro_fr:'Services pour les citoyens canadiens vivant à l\'extérieur du Canada, incluant l\'aide d\'urgence, le vote et les services de passeport.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Registration of Canadians Abroad', fr:'Inscription des Canadiens à l\'étranger', desc_en:'Register your trip or stay outside Canada so the Government of Canada can contact you during an emergency.', desc_fr:'Enregistrez votre voyage ou séjour à l\'extérieur du Canada afin que le gouvernement puisse vous joindre en cas d\'urgence.', url:"https://travel.gc.ca/travelling/registration", what_en:'Register if you\'ll be travelling or living outside Canada, especially for an extended period.', what_fr:'Inscrivez-vous si vous voyagerez ou vivrez à l\'extérieur du Canada, particulièrement pour une période prolongée.', question_en:'When should I use this?', question_fr:'Quand dois-je utiliser ceci?', answer_en:'This free service allows the Government of Canada to contact you if there is a natural disaster, civil unrest, a major emergency, an evacuation, or an emergency affecting Canadians in your area.', answer_fr:'Ce service gratuit permet au gouvernement du Canada de vous joindre en cas de catastrophe naturelle, de troubles civils, d\'urgence majeure, d\'évacuation, ou d\'urgence touchant les Canadiens dans votre région.', need_heading_en:'Required Information', need_heading_fr:'Renseignements requis', need_intro_en:'You\'ll need:', need_intro_fr:'Vous aurez besoin de :', need_list_en:['Your contact information','Your destination','Your travel dates or address abroad','Emergency contact information'], need_list_fr:['Vos coordonnées','Votre destination','Vos dates de voyage ou votre adresse à l\'étranger','Les coordonnées d\'une personne à contacter en cas d\'urgence'], steps_heading_en:'How to Register', steps_heading_fr:'Comment s\'inscrire', steps_en:'Complete the online registration before you leave Canada or shortly after arriving at your destination. You can update or cancel your registration at any time.', steps_fr:'Complétez l\'inscription en ligne avant de quitter le Canada ou peu après votre arrivée à destination. Vous pouvez mettre à jour ou annuler votre inscription en tout temps.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Registration is free and does not affect your passport or immigration status.'], tips_list_fr:['L\'inscription est gratuite et n\'affecte pas votre passeport ou votre statut d\'immigration.'], official_links:[{label_en:'Registration of Canadians Abroad', label_fr:'Inscription des Canadiens à l\'étranger', url:"https://travel.gc.ca/travelling/registration"}], related:['consular-services','canadian-passport-services'], reviewed:'September 2026', slug:'registration-of-canadians-abroad', label_en1:'Register Online →', label_fr1:'S\'inscrire en ligne →'},
        {en:'Consular Services', fr:'Services consulaires', desc_en:'Emergency assistance for Canadian citizens outside Canada.', desc_fr:'Aide d\'urgence pour les citoyens canadiens à l\'extérieur du Canada.', url:"https://travel.gc.ca/assistance/consular-services/consular", what_en:'Canadian embassies, high commissions and consulates may be able to help Canadians in emergency situations abroad.', what_fr:'Les ambassades, hauts-commissariats et consulats canadiens peuvent aider les Canadiens en situation d\'urgence à l\'étranger.', question_en:'When should I use this?', question_fr:'Quand dois-je utiliser ceci?', answer_en:'Canadian embassies, high commissions and consulates may be able to help if you lose your passport, need an emergency travel document, are arrested or detained, experience a medical emergency, or need assistance during a crisis abroad.', answer_fr:'Les ambassades, hauts-commissariats et consulats canadiens peuvent vous aider si vous perdez votre passeport, avez besoin d\'un document de voyage d\'urgence, êtes arrêté ou détenu, vivez une urgence médicale, ou avez besoin d\'aide lors d\'une crise à l\'étranger.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'This page explains what kind of help is available and how to reach the nearest Canadian office wherever you are.', steps_fr:'Cette page explique quel type d\'aide est disponible et comment joindre le bureau canadien le plus près, où que vous soyez.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Consular officials can provide assistance and information, but they cannot pay your expenses, provide legal advice, or override local laws.'], tips_list_fr:['Les agents consulaires peuvent offrir de l\'aide et de l\'information, mais ne peuvent pas payer vos dépenses, fournir des conseils juridiques ou outrepasser les lois locales.'], official_links:[{label_en:'Canadian Consular Services', label_fr:'Services consulaires canadiens', url:"https://travel.gc.ca/assistance/consular-services/consular"}], related:['canadian-passport-services','registration-of-canadians-abroad'], reviewed:'September 2026', slug:'consular-services', label_en1:'Learn More →', label_fr1:'En savoir plus →'},
        {en:'Voting from Abroad', fr:'Voter depuis l\'étranger', desc_en:'Register to vote by mail while living or travelling outside Canada.', desc_fr:'Inscrivez-vous pour voter par la poste en vivant ou voyageant à l\'extérieur du Canada.', url:"https://www.elections.ca/content.aspx?section=vot&dir=reg/etr&document=index&lang=e", what_en:'If you\'re a Canadian citizen living outside Canada and want to vote in federal elections, you can register in the International Register of Electors and vote by mail.', what_fr:'Si vous êtes un citoyen canadien vivant à l\'extérieur du Canada et souhaitez voter aux élections fédérales, vous pouvez vous inscrire au Registre international des électeurs et voter par la poste.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You\'ll need one piece of identification, such as:', need_intro_fr:'Vous aurez besoin d\'une pièce d\'identité, par exemple :', need_list_en:['Pages 2 and 3 of your Canadian passport','A citizenship certificate','A birth certificate','Your last residential address in Canada before you left (a P.O. box or rural route is not accepted) — this determines which electoral district your vote is counted in'], need_list_fr:['Les pages 2 et 3 de votre passeport canadien','Un certificat de citoyenneté','Un certificat de naissance','Votre dernière adresse résidentielle au Canada avant votre départ (une case postale ou une route rurale n\'est pas acceptée) — cela détermine la circonscription électorale où votre vote sera compté'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'Apply to Elections Canada at any time — you do not have to wait for an election to be called. Once a federal election is called, you\'ll receive a special ballot voting kit and instructions for returning it by mail.', steps_fr:'Faites votre demande auprès d\'Élections Canada en tout temps — vous n\'avez pas à attendre le déclenchement d\'une élection. Une fois une élection fédérale déclenchée, vous recevrez une trousse de vote par bulletin spécial et les instructions pour la retourner par la poste.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['You do not need to provide proof of address.','There is no time limit on how long you can have lived outside Canada — the former five-year rule was struck down by the Supreme Court of Canada in Frank v. Canada (2019) and removed from the legislation.','You must be a Canadian citizen, at least 18 years old on election day, and have lived in Canada at some point in your life.','This applies to federal elections only. Provincial and municipal elections have different rules.','Return your completed ballot early — it must arrive at Elections Canada by the deadline, not merely be postmarked by it.'], tips_list_fr:['Vous n\'avez pas besoin de fournir une preuve d\'adresse.','Il n\'y a aucune limite de temps quant à la durée pendant laquelle vous pouvez avoir vécu à l\'extérieur du Canada — l\'ancienne règle de cinq ans a été invalidée par la Cour suprême du Canada dans l\'affaire Frank c. Canada (2019) et retirée de la loi.','Vous devez être citoyen canadien, âgé d\'au moins 18 ans le jour du scrutin, et avoir vécu au Canada à un moment de votre vie.','Ceci s\'applique aux élections fédérales seulement. Les élections provinciales et municipales ont des règles différentes.','Retournez votre bulletin complété tôt — il doit arriver à Élections Canada avant la date limite, et non simplement être oblitéré avant cette date.'], official_links:[{label_en:'Registration and Voting for Canadians Who Live Abroad', label_fr:'Inscription et vote pour les Canadiens vivant à l\'étranger', url:"https://www.elections.ca/content.aspx?section=vot&dir=reg/etr&document=index&lang=e"},{label_en:'Apply to Vote by Mail', label_fr:'Faire une demande pour voter par la poste', url:"https://www.elections.ca/voting-by-mail"}], related:['registration-of-canadians-abroad'], reviewed:'September 2026', slug:'voting-from-abroad'},
        {en:'Canadian Passport Services', fr:'Services de passeport canadien', desc_en:'Apply for, renew, or replace a Canadian passport while outside Canada.', desc_fr:'Faites une demande, renouvelez ou remplacez un passeport canadien à l\'extérieur du Canada.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports.html", what_en:'Use this service if you\'re living or travelling outside Canada and need passport services.', what_fr:'Utilisez ce service si vous vivez ou voyagez à l\'extérieur du Canada et avez besoin de services de passeport.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'The required documents depend on your application but generally include:', need_intro_fr:'Les documents requis dépendent de votre demande mais incluent généralement :', need_list_en:['Proof of Canadian citizenship','Passport photos','Supporting identification','Your current passport (for renewals)','Payment'], need_list_fr:['Preuve de citoyenneté canadienne','Photos de passeport','Pièces d\'identité à l\'appui','Votre passeport actuel (pour les renouvellements)','Le paiement'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'Select the country where you\'re located and follow the passport instructions for that Canadian embassy, high commission, or consulate.', steps_fr:'Sélectionnez le pays où vous vous trouvez et suivez les instructions de passeport de cette ambassade, ce haut-commissariat ou ce consulat canadien.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Processing times outside Canada vary by country.'], tips_list_fr:['Les délais de traitement à l\'extérieur du Canada varient selon le pays.'], official_links:[{label_en:'Canadian Passport Services Abroad', label_fr:'Services de passeport canadien à l\'étranger', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports.html"}], related:['consular-services','registration-of-canadians-abroad'], reviewed:'September 2026', slug:'canadian-passport-services'}
      ] }
    ] },
  { icon:'handshake', en:'Immigrating to Canada', fr:'Immigrer au Canada',
    intro_en:'Resources for those looking to move to Canada or Quebec permanently, including skilled worker, family sponsorship, and citizenship programs.',
    intro_fr:'Ressources pour les personnes souhaitant s\'établir au Canada ou au Québec de façon permanente, incluant les programmes de travailleurs qualifiés, de parrainage familial et de citoyenneté.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Explore Immigration Programs', fr:'Explorer les programmes d\'immigration', desc_en:'Find the immigration program that best fits your situation.', desc_fr:'Trouvez le programme d\'immigration qui convient le mieux à votre situation.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html", what_en:'Start here if you want to move to Canada permanently but aren\'t sure which immigration program applies to you.', what_fr:'Commencez ici si vous souhaitez immigrer au Canada de façon permanente mais n\'êtes pas certain du programme qui s\'applique à vous.', need_heading_en:'Immigration Options', need_heading_fr:'Options d\'immigration', need_list_en:['Skilled workers','Family sponsorship','Business immigration','Provincial immigration programs','Refugees and humanitarian programs'], need_list_fr:['Travailleurs qualifiés','Parrainage familial','Immigration d\'affaires','Programmes d\'immigration provinciaux','Réfugiés et programmes humanitaires'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Start here to understand which program fits your situation before diving into a specific application.', steps_fr:'Commencez ici pour comprendre quel programme convient à votre situation avant de vous lancer dans une demande spécifique.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Quebec has its own immigration programs and selection process for many applicants planning to settle in the province.'], tips_list_fr:['Le Québec a ses propres programmes d\'immigration et processus de sélection pour plusieurs candidats qui prévoient s\'établir dans la province.'], official_links:[{label_en:'Explore Immigration Programs', label_fr:'Explorer les programmes d\'immigration', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada.html"}], related:['express-entry-skilled-workers','family-sponsorship','quebec-selection-certificate-csq'], reviewed:'September 2026', slug:'explore-immigration-programs', label_en1:'Explore Programs →', label_fr1:'Explorer les programmes →'},
        {en:'Express Entry', fr:'Entrée express (travailleurs qualifiés)', desc_en:'Canada\'s immigration system for many skilled workers.', desc_fr:'Le système d\'immigration du Canada pour plusieurs travailleurs qualifiés.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html", what_en:'If you\'re applying for permanent residence based on your education, work experience, and language ability, Express Entry is Canada\'s main points-based system.', what_fr:'Si vous faites une demande de résidence permanente selon votre formation, votre expérience de travail et vos compétences linguistiques, Entrée express est le principal système à points du Canada.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'You\'ll generally need:', need_intro_fr:'Vous aurez généralement besoin de :', need_list_en:['Language test results','Educational Credential Assessment (if required)','Passport','Employment history'], need_list_fr:['Résultats de tests linguistiques','Évaluation des diplômes d\'études (si requise)','Passeport','Historique d\'emploi'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_en:'Create an Express Entry profile online. If you\'re invited to apply, you\'ll submit your permanent residence application.', steps_fr:'Créez un profil Entrée express en ligne. Si vous êtes invité à faire une demande, vous soumettrez votre demande de résidence permanente.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Creating a profile does not guarantee you\'ll receive an invitation.'], tips_list_fr:['Créer un profil ne garantit pas que vous recevrez une invitation.'], official_links:[{label_en:'Express Entry', label_fr:'Entrée express', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry.html"}], related:['explore-immigration-programs','quebec-selection-certificate-csq'], reviewed:'September 2026', slug:'express-entry-skilled-workers'},
        {en:'Family Sponsorship', fr:'Parrainage familial', desc_en:'Sponsor eligible family members to become permanent residents of Canada.', desc_fr:'Parrainez des membres de famille admissibles pour qu\'ils deviennent résidents permanents du Canada.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html", what_en:'If you\'re a Canadian citizen or permanent resident, you may be able to sponsor an eligible family member to immigrate.', what_fr:'Si vous êtes citoyen canadien ou résident permanent, vous pourriez être en mesure de parrainer un membre de famille admissible pour immigrer.', need_heading_en:'Eligible Family Members', need_heading_fr:'Membres de famille admissibles', need_intro_en:'Depending on the program, you may be able to sponsor:', need_intro_fr:'Selon le programme, vous pourriez être en mesure de parrainer :', need_list_en:['Your spouse','Common-law or conjugal partner','Dependent children','Parents','Grandparents'], need_list_fr:['Votre époux ou épouse','Partenaire conjugal ou de fait','Enfants à charge','Parents','Grands-parents'], steps_en:'Your sponsor submits an application on your behalf, along with your own application forms and supporting documents.', steps_fr:'Votre répondant soumet une demande en votre nom, avec vos propres formulaires de demande et documents à l\'appui.', official_links:[{label_en:'Family Sponsorship', label_fr:'Parrainage familial', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/family-sponsorship.html"}], related:['explore-immigration-programs','canadian-citizenship-application'], reviewed:'September 2026', slug:'family-sponsorship'},
        {en:'Quebec Selection Certificate (CSQ)', fr:'Certificat de sélection du Québec (CSQ)', desc_en:'Immigration programs for people planning to settle in Quebec.', desc_fr:'Programmes d\'immigration pour les personnes prévoyant s\'établir au Québec.', url:"https://www.quebec.ca/en/immigration/permanent/choose-quebec", what_en:'If you plan to immigrate to Quebec, most applicants must first receive a Quebec Selection Certificate (CSQ) before applying to the federal government for permanent residence.', what_fr:'Si vous prévoyez immigrer au Québec, la plupart des candidats doivent d\'abord obtenir un certificat de sélection du Québec (CSQ) avant de faire une demande de résidence permanente au gouvernement fédéral.', steps_en:'This page explains Quebec\'s programs and how the CSQ fits into the overall process, step by step.', steps_fr:'Cette page explique les programmes du Québec et la place du CSQ dans l\'ensemble du processus, étape par étape.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Quebec manages many of its own immigration programs separately from the rest of Canada.'], tips_list_fr:['Le Québec gère plusieurs de ses propres programmes d\'immigration séparément du reste du Canada.'], official_links:[{label_en:'Quebec Immigration', label_fr:'Immigration Québec', url:"https://www.quebec.ca/en/immigration/permanent/choose-quebec"}], related:['express-entry-skilled-workers','explore-immigration-programs'], reviewed:'September 2026', slug:'quebec-selection-certificate-csq'},
        {en:'Canadian Citizenship', fr:'Demande de citoyenneté canadienne', desc_en:'Apply to become a Canadian citizen.', desc_fr:'Faites une demande pour devenir citoyen canadien.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/become-canadian-citizen.html", what_en:'Apply after meeting the permanent residence and physical presence requirements.', what_fr:'Faites une demande après avoir répondu aux exigences de résidence permanente et de présence physique.', need_heading_en:'Required Documents', need_heading_fr:'Documents requis', need_intro_en:'Requirements vary but generally include:', need_intro_fr:'Les exigences varient mais incluent généralement :', need_list_en:['Permanent Resident documentation','Proof of physical presence in Canada','Supporting identification'], need_list_fr:['Documents de résident permanent','Preuve de présence physique au Canada','Pièces d\'identité à l\'appui'], steps_en:'Submit your application online, then prepare for the citizenship test and, eventually, the citizenship ceremony.', steps_fr:'Soumettez votre demande en ligne, puis préparez-vous pour le test de citoyenneté et, éventuellement, la cérémonie de citoyenneté.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['Most applicants between certain ages must complete a citizenship test and attend a citizenship ceremony before becoming Canadian citizens.'], tips_list_fr:['La plupart des candidats d\'un certain âge doivent réussir un test de citoyenneté et assister à une cérémonie de citoyenneté avant de devenir citoyens canadiens.'], official_links:[{label_en:'Canadian Citizenship Application', label_fr:'Demande de citoyenneté canadienne', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/become-canadian-citizen.html"}], related:['explore-immigration-programs','family-sponsorship'], reviewed:'September 2026', slug:'canadian-citizenship-application'}
      ] }
    ] },
  { icon:'baby', en:'Family & Children', fr:'Famille et enfants',
    intro_en:'Whether welcoming a newborn, registering a child, or applying for family benefits, this section provides direct access to the services most frequently used by families.',
    intro_fr:'Que ce soit pour accueillir un nouveau-né, enregistrer un enfant ou faire une demande de prestations familiales, cette section donne un accès direct aux services les plus utilisés par les familles.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Birth Registration', fr:'Déclaration de naissance', desc_en:'Officially register the birth of a child born in Quebec.', desc_fr:'Enregistrez officiellement la naissance d\'un enfant né au Québec.', url:"https://www.etatcivil.gouv.qc.ca/en/birth/declaration_birth.html", what_en:'Every child born in Quebec must be registered with the Directeur de l\'état civil. This is the first legal step after birth.', what_fr:'Chaque enfant né au Québec doit être enregistré auprès du Directeur de l\'état civil. C\'est la première étape légale après la naissance.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Information provided by the hospital or midwife','Parents\' personal information','Child\'s full legal name'], need_list_fr:['Renseignements fournis par l\'hôpital ou la sage-femme','Renseignements personnels des parents','Nom légal complet de l\'enfant'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Complete the Declaration of Birth within 30 days of the birth. In most cases, the hospital begins the process and the parents complete the remaining information.', steps_fr:'Complétez la déclaration de naissance dans les 30 jours suivant la naissance. Dans la plupart des cas, l\'hôpital débute le processus et les parents complètent les renseignements restants.', official_links:[{label_en:'Birth Registration', label_fr:'Déclaration de naissance', url:"https://www.etatcivil.gouv.qc.ca/en/birth/declaration_birth.html"}], related:['birth-certificate','canada-child-benefit','quebec-family-allowance'], reviewed:'September 2026', slug:'birth-registration'},
        {en:'Birth Certificate', fr:'Certificat de naissance', desc_en:'Order an official Quebec birth certificate.', desc_fr:'Commandez un certificat de naissance officiel du Québec.', url:"https://www.etatcivil.gouv.qc.ca/en/certificate-copy.html", what_en:'A birth certificate is commonly required for passports, school registration, government services, and many legal documents.', what_fr:'Un certificat de naissance est couramment requis pour les passeports, l\'inscription scolaire, les services gouvernementaux et plusieurs documents légaux.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Child\'s full name','Date of birth','Parents\' names','Payment'], need_list_fr:['Nom complet de l\'enfant','Date de naissance','Noms des parents','Le paiement'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Order your birth certificate online. It will be mailed to you.', steps_fr:'Commandez votre certificat de naissance en ligne. Il vous sera envoyé par la poste.', official_links:[{label_en:'Order Birth Certificate', label_fr:'Commander un certificat de naissance', url:"https://www.etatcivil.gouv.qc.ca/en/certificate-copy.html"}], related:['birth-registration','child-passport'], reviewed:'September 2026', slug:'birth-certificate'},
        {en:'Canada Child Benefit (CCB)', fr:'Allocation canadienne pour enfants', desc_en:'Monthly tax-free payment from the Government of Canada for eligible families.', desc_fr:'Paiement mensuel non imposable du gouvernement du Canada pour les familles admissibles.', url:"https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit.html", what_en:'If you have a child under 18, you may qualify for the Canada Child Benefit.', what_fr:'Si vous avez un enfant de moins de 18 ans, vous pourriez être admissible à l\'Allocation canadienne pour enfants.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Most families do not need to apply separately. If you register your child\'s birth and file your income tax returns each year, your eligibility is generally assessed automatically. If you were not automatically enrolled, you can apply directly.', need_fr:'La plupart des familles n\'ont pas besoin de faire une demande séparée. Si vous enregistrez la naissance de votre enfant et produisez vos déclarations de revenus chaque année, votre admissibilité est généralement évaluée automatiquement. Si vous n\'avez pas été inscrit automatiquement, vous pouvez faire une demande directement.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Check whether you\'re already receiving the benefit before submitting a new application.', steps_fr:'Vérifiez si vous recevez déjà la prestation avant de soumettre une nouvelle demande.', official_links:[{label_en:'Canada Child Benefit', label_fr:'Allocation canadienne pour enfants', url:"https://www.canada.ca/en/revenue-agency/services/child-family-benefits/canada-child-benefit.html"}], related:['quebec-family-allowance','birth-registration'], reviewed:'September 2026', slug:'canada-child-benefit'},
        {en:'Quebec Family Allowance', fr:'Allocation famille du Québec', desc_en:'Monthly financial assistance for eligible families living in Quebec.', desc_fr:'Aide financière mensuelle pour les familles admissibles vivant au Québec.', url:"https://www.retraitequebec.gouv.qc.ca/en/programs/family-allowance-measure", what_en:'Families with children under 18 living in Quebec may qualify for Family Allowance.', what_fr:'Les familles ayant des enfants de moins de 18 ans vivant au Québec pourraient être admissibles à l\'Allocation famille.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Most families are enrolled automatically. If your child\'s birth has been registered and your income tax returns are up to date, you usually do not need to apply.', need_fr:'La plupart des familles sont inscrites automatiquement. Si la naissance de votre enfant a été enregistrée et vos déclarations de revenus sont à jour, vous n\'avez habituellement pas besoin de faire une demande.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Verify whether you\'re already receiving Family Allowance before submitting an application.', steps_fr:'Vérifiez si vous recevez déjà l\'Allocation famille avant de soumettre une demande.', official_links:[{label_en:'Quebec Family Allowance', label_fr:'Allocation famille du Québec', url:"https://www.retraitequebec.gouv.qc.ca/en/programs/family-allowance-measure"}], related:['canada-child-benefit','birth-registration'], reviewed:'September 2026', slug:'quebec-family-allowance'},
        {en:'Quebec Parental Insurance Plan (QPIP)', fr:'Régime québécois d\'assurance parentale (RQAP)', desc_en:'Income replacement during maternity, paternity, parental, or adoption leave.', desc_fr:'Remplacement de revenu pendant un congé de maternité, de paternité, parental ou d\'adoption.', url:"https://www.rqap.gouv.qc.ca/en", what_en:'Apply if you\'re taking maternity, paternity, parental, or adoption leave from work.', what_fr:'Faites une demande si vous prenez un congé de maternité, de paternité, parental ou d\'adoption.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Social Insurance Number','Employment information','Expected or actual birth or adoption date','Banking information for direct deposit'], need_list_fr:['Numéro d\'assurance sociale','Renseignements d\'emploi','Date prévue ou réelle de naissance ou d\'adoption','Renseignements bancaires pour le dépôt direct'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Submit your application online after your leave begins or shortly before your benefits are expected to start.', steps_fr:'Soumettez votre demande en ligne après le début de votre congé ou peu avant le début prévu de vos prestations.', official_links:[{label_en:'QPIP', label_fr:'RQAP', url:"https://www.rqap.gouv.qc.ca/en"}], related:['canada-child-benefit'], reviewed:'September 2026', slug:'quebec-parental-insurance-plan-qpip'},
        {en:'Children Born Abroad', fr:'Enfants nés à l\'étranger', desc_en:'Apply for proof of Canadian citizenship for a child born outside Canada.', desc_fr:'Faites une demande de preuve de citoyenneté canadienne pour un enfant né à l\'extérieur du Canada.', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/proof-citizenship.html", what_en:'If your child was born outside Canada to a Canadian citizen parent, they may already be a Canadian citizen and need a Citizenship Certificate before applying for a Canadian passport.', what_fr:'Si votre enfant est né à l\'extérieur du Canada d\'un parent citoyen canadien, il pourrait déjà être citoyen canadien et avoir besoin d\'un certificat de citoyenneté avant de faire une demande de passeport canadien.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Child\'s foreign birth certificate','Parent\'s proof of Canadian citizenship','Supporting identification'], need_list_fr:['Certificat de naissance étranger de l\'enfant','Preuve de citoyenneté canadienne du parent','Pièces d\'identité à l\'appui'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Apply for a Canadian Citizenship Certificate. Once approved, you can apply for the child\'s Canadian passport.', steps_fr:'Faites une demande de certificat de citoyenneté canadienne. Une fois approuvé, vous pourrez faire une demande de passeport canadien pour l\'enfant.', official_links:[{label_en:'Proof of Citizenship', label_fr:'Preuve de citoyenneté', url:"https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship/proof-citizenship.html"}], related:['child-passport','canadian-citizenship-application'], reviewed:'September 2026', slug:'children-born-abroad'},
        {en:'Childcare Registration (Childcare Services Registration Portal, formerly La Place 0-5)', fr:'Inscription en service de garde (Portail d\'inscription, anciennement La Place 0-5)', desc_en:'Register for subsidized daycare and CPE waiting lists.', desc_fr:'Inscrivez-vous aux listes d\'attente de garderies subventionnées et de CPE.', url:"https://www.quebec.ca/en/family-and-support-for-individuals/childhood/childcare-centres/registration-portal", what_en:'Register if you\'re looking for a place in a CPE or subsidized daycare in Quebec. The Childcare Services Registration Portal replaced La Place 0-5, which stopped operating in October 2025; existing records were migrated automatically.', what_fr:'Inscrivez-vous si vous cherchez une place en CPE ou en garderie subventionnée au Québec. Le Portail d\'inscription en service de garde a remplacé La Place 0-5, qui a cessé ses activités en octobre 2025 ; les dossiers existants ont été transférés automatiquement.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Child\'s information — the child must already be born, or arrived in your family in the case of adoption','Parent or guardian information','Your desired date of entry into childcare','Preferred daycare locations','Access through the Government Authentication Service (SAG), which replaced clicSÉQUR'], need_list_fr:['Renseignements de l\'enfant — l\'enfant doit déjà être né, ou arrivé dans votre famille dans le cas d\'une adoption','Renseignements du parent ou tuteur','Votre date d\'entrée souhaitée en service de garde','Emplacements de garderie préférés','Accès via le Service d\'authentification gouvernementale (SAG), qui a remplacé clicSÉQUR'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Create your account and register each child who is already born.', steps_fr:'Créez votre compte et inscrivez chaque enfant déjà né.', tips_heading_en:'Good to Know', tips_heading_fr:'Bon à savoir', tips_list_en:['You cannot register an unborn child. Registration is only possible once your child is born, or has arrived in your family through adoption.','Spaces are allocated based on your desired date of entry into childcare, not on how early you registered — registering sooner no longer improves your position.'], tips_list_fr:['Vous ne pouvez pas inscrire un enfant à naître. L\'inscription n\'est possible qu\'une fois votre enfant né, ou arrivé dans votre famille par adoption.','Les places sont attribuées en fonction de votre date d\'entrée souhaitée en service de garde, et non selon la rapidité de votre inscription — s\'inscrire plus tôt n\'améliore plus votre position.'], official_links:[{label_en:'Childcare Services Registration Portal (information)', label_fr:'Portail d\'inscription en service de garde (information)', url:"https://www.quebec.ca/en/family-and-support-for-individuals/childhood/childcare-centres/registration-portal"},{label_en:'Parent Access to the Portal', label_fr:'Accès parent au portail', url:"https://www.quebec.ca/en/family-and-support-for-individuals/childhood/childcare-centres/registration-portal/parents/parents-access"}], related:['birth-registration','canada-child-benefit'], reviewed:'September 2026', slug:'childcare-registration-cpe-subsidized-daycare'}
      ] }
    ] },
  { icon:'briefcase', en:'Government Benefits', fr:'Prestations gouvernementales',
    intro_en:'Federal and provincial financial assistance programs.',
    intro_fr:'Programmes d\'aide financière fédéraux et provinciaux.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Employment Insurance (EI)', fr:'Assurance-emploi (AE)', desc_en:'Temporary income support for eligible workers.', desc_fr:'Soutien temporaire du revenu pour les travailleurs admissibles.', url:"https://www.canada.ca/en/services/benefits/ei.html", what_en:'Apply if you\'ve stopped working because of job loss, illness, maternity, parental leave, caregiving responsibilities, or another qualifying reason.', what_fr:'Faites une demande si vous avez cessé de travailler en raison d\'une perte d\'emploi, d\'une maladie, d\'un congé de maternité ou parental, de responsabilités de proche aidant, ou d\'une autre raison admissible.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Social Insurance Number','Record of Employment (ROE)','Banking information','Employment history'], need_list_fr:['Numéro d\'assurance sociale','Relevé d\'emploi (RE)','Renseignements bancaires','Historique d\'emploi'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Apply online as soon as you stop working. Don\'t wait for your Record of Employment if your employer hasn\'t submitted it yet.', steps_fr:'Faites une demande en ligne dès que vous cessez de travailler. N\'attendez pas votre relevé d\'emploi si votre employeur ne l\'a pas encore soumis.', official_links:[{label_en:'Employment Insurance', label_fr:'Assurance-emploi', url:"https://www.canada.ca/en/services/benefits/ei.html"}], related:['canada-pension-plan-cpp','disability-benefits'], reviewed:'September 2026', slug:'employment-insurance-ei'},
        {en:'Canada Pension Plan (CPP)', fr:'Régime de pensions du Canada (RPC)', desc_en:'Retirement, disability, children\'s and survivor benefits.', desc_fr:'Prestations de retraite, d\'invalidité, pour enfants et de survivant.', url:"https://www.canada.ca/en/services/benefits/publicpensions/cpp.html", what_en:'Apply when you\'re ready to start receiving CPP retirement benefits or if you\'re applying for CPP disability or survivor benefits.', what_fr:'Faites une demande lorsque vous êtes prêt à recevoir vos prestations de retraite du RPC ou pour des prestations d\'invalidité ou de survivant.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Social Insurance Number','Banking information','Employment history (if required)'], need_list_fr:['Numéro d\'assurance sociale','Renseignements bancaires','Historique d\'emploi (si requis)'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Apply online through your My Service Canada Account. Retirement benefits can be started any time between ages 60 and 70.', steps_fr:'Faites une demande en ligne via votre compte Mon dossier Service Canada. Les prestations de retraite peuvent débuter à tout moment entre 60 et 70 ans.', official_links:[{label_en:'Canada Pension Plan', label_fr:'Régime de pensions du Canada', url:"https://www.canada.ca/en/services/benefits/publicpensions/cpp.html"}], related:['old-age-security-oas','employment-insurance-ei'], reviewed:'September 2026', slug:'canada-pension-plan-cpp'},
        {en:'Old Age Security (OAS)', fr:'Sécurité de la vieillesse (SV)', desc_en:'Monthly pension for eligible Canadians aged 65 and older.', desc_fr:'Pension mensuelle pour les Canadiens admissibles de 65 ans et plus.', url:"https://www.canada.ca/en/services/benefits/publicpensions/old-age-security.html", what_en:'Apply only if you were not automatically enrolled.', what_fr:'Faites une demande seulement si vous n\'avez pas été inscrit automatiquement.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Many Canadians are enrolled automatically and receive a notification before turning 65. If you did not receive a notification, you may need to apply.', need_fr:'Plusieurs Canadiens sont inscrits automatiquement et reçoivent un avis avant leur 65e anniversaire. Si vous n\'avez pas reçu d\'avis, vous pourriez avoir besoin de faire une demande.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Check whether you\'ve been automatically enrolled before submitting an application.', steps_fr:'Vérifiez si vous avez été inscrit automatiquement avant de soumettre une demande.', official_links:[{label_en:'Old Age Security', label_fr:'Sécurité de la vieillesse', url:"https://www.canada.ca/en/services/benefits/publicpensions/old-age-security.html"}], related:['guaranteed-income-supplement-gis','canada-pension-plan-cpp'], reviewed:'September 2026', slug:'old-age-security-oas'},
        {en:'Guaranteed Income Supplement (GIS)', fr:'Supplément de revenu garanti (SRG)', desc_en:'Additional monthly payments for low-income seniors receiving Old Age Security.', desc_fr:'Paiements mensuels supplémentaires pour les aînés à faible revenu recevant la Sécurité de la vieillesse.', url:"https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/guaranteed-income-supplement.html", what_en:'If you\'re receiving Old Age Security and your household income is below the annual limit, you may qualify for GIS.', what_fr:'Si vous recevez la Sécurité de la vieillesse et que le revenu de votre ménage est sous la limite annuelle, vous pourriez être admissible au SRG.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Old Age Security eligibility','Most recent income tax return'], need_list_fr:['Admissibilité à la Sécurité de la vieillesse','Déclaration de revenus la plus récente'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Many recipients are enrolled automatically. Filing your income tax return every year helps keep your eligibility up to date.', steps_fr:'Plusieurs bénéficiaires sont inscrits automatiquement. Produire votre déclaration de revenus chaque année aide à maintenir votre admissibilité à jour.', official_links:[{label_en:'Guaranteed Income Supplement', label_fr:'Supplément de revenu garanti', url:"https://www.canada.ca/en/services/benefits/publicpensions/old-age-security/guaranteed-income-supplement.html"}], related:['old-age-security-oas'], reviewed:'September 2026', slug:'guaranteed-income-supplement-gis'},
        {en:'Disability Benefits', fr:'Prestations d\'invalidité', desc_en:'Find disability benefits and support programs.', desc_fr:'Trouvez des prestations d\'invalidité et des programmes de soutien.', url:"https://www.canada.ca/en/services/benefits/disability.html", what_en:'If you have a disability or medical condition that affects your ability to work or your daily activities, this page helps you find the programs you may qualify for.', what_fr:'Si vous avez un handicap ou une condition médicale qui affecte votre capacité à travailler ou vos activités quotidiennes, cette page vous aide à trouver les programmes auxquels vous pourriez être admissible.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Medical information','Supporting documents','Social Insurance Number (for many programs)'], need_list_fr:['Renseignements médicaux','Documents à l\'appui','Numéro d\'assurance sociale (pour plusieurs programmes)'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Review the available disability programs and apply directly for the one that matches your situation.', steps_fr:'Consultez les programmes d\'invalidité disponibles et faites une demande directement pour celui qui correspond à votre situation.', official_links:[{label_en:'Disability Benefits', label_fr:'Prestations d\'invalidité', url:"https://www.canada.ca/en/services/benefits/disability.html"}], related:['employment-insurance-ei','canada-pension-plan-cpp'], reviewed:'September 2026', slug:'disability-benefits'},
        {en:'Family Benefits', fr:'Prestations familiales', desc_en:'Overview of federal child and family benefit programs.', desc_fr:'Aperçu des programmes fédéraux de prestations pour enfants et familles.', url:"https://www.canada.ca/en/revenue-agency/services/child-family-benefits.html", what_en:'Visit this page if you want to review all federal family benefits or check whether you qualify for additional programs.', what_fr:'Visitez cette page pour consulter toutes les prestations familiales fédérales ou vérifier si vous êtes admissible à des programmes supplémentaires.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Have your CRA account available if you need to update your information or submit an application.', need_fr:'Ayez votre compte ARC à portée de main si vous devez mettre à jour vos renseignements ou soumettre une demande.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Review the available benefits and apply only for programs that are not automatically provided based on your eligibility.', steps_fr:'Consultez les prestations disponibles et faites une demande seulement pour les programmes qui ne sont pas fournis automatiquement selon votre admissibilité.', official_links:[{label_en:'Family Benefits', label_fr:'Prestations familiales', url:"https://www.canada.ca/en/revenue-agency/services/child-family-benefits.html"}], related:['canada-child-benefit','quebec-family-allowance'], reviewed:'September 2026', slug:'family-benefits'}
      ] }
    ] },
  { icon:'heart', en:'Healthcare', fr:'Soins de santé',
    intro_en:'Quebec healthcare services.',
    intro_fr:'Services de santé du Québec.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Apply for RAMQ', fr:'Faire une demande à la RAMQ', desc_en:'Register for Quebec\'s public health insurance plan.', desc_fr:'Inscrivez-vous à l\'assurance maladie publique du Québec.', url:"https://www.ramq.gouv.qc.ca/en/citizens/health-insurance/register", what_en:'Apply if you\'ve recently moved to Quebec and are eligible for provincial health coverage.', what_fr:'Faites une demande si vous avez récemment déménagé au Québec et êtes admissible à la couverture santé provinciale.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Proof of identity','Proof you live in Quebec','Immigration documents (if applicable)'], need_list_fr:['Preuve d\'identité','Preuve de résidence au Québec','Documents d\'immigration (le cas échéant)'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Register as soon as possible after arriving in Quebec. Depending on your situation, a waiting period may apply before coverage begins.', steps_fr:'Inscrivez-vous le plus tôt possible après votre arrivée au Québec. Selon votre situation, une période d\'attente peut s\'appliquer avant le début de la couverture.', official_links:[{label_en:'Apply for RAMQ', label_fr:'Faire une demande à la RAMQ', url:"https://www.ramq.gouv.qc.ca/en/citizens/health-insurance/register"}], related:['replace-or-renew-your-health-card','register-a-newborn-with-ramq'], reviewed:'August 2026', slug:'apply-for-ramq'},
        {en:'Replace or Renew Your Health Card', fr:'Remplacer ou renouveler votre carte d\'assurance maladie', desc_en:'Renew an expiring health card or replace one that\'s lost, stolen, or damaged.', desc_fr:'Renouvelez une carte d\'assurance maladie qui expire ou remplacez-en une perdue, volée ou endommagée.', url:"https://www.ramq.gouv.qc.ca/en/citizens/health-insurance/obtain-new-card", what_en:'Use this service if your health card is expiring or if it has been lost, stolen, or damaged.', what_fr:'Utilisez ce service si votre carte d\'assurance maladie expire ou a été perdue, volée ou endommagée.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Proof of identity','Your current health card (if available)'], need_list_fr:['Preuve d\'identité','Votre carte d\'assurance maladie actuelle (si disponible)'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Renew your card when you receive your renewal notice, or request a replacement immediately if your card is lost or damaged.', steps_fr:'Renouvelez votre carte lorsque vous recevez votre avis de renouvellement, ou demandez un remplacement immédiatement si votre carte est perdue ou endommagée.', official_links:[{label_en:'Replace or Renew Your Health Card', label_fr:'Remplacer ou renouveler votre carte d\'assurance maladie', url:"https://www.ramq.gouv.qc.ca/en/citizens/health-insurance/obtain-new-card"}], related:['apply-for-ramq'], reviewed:'August 2026', slug:'replace-or-renew-your-health-card'},
        {en:'Register a Newborn with RAMQ', fr:'Inscrire un nouveau-né à la RAMQ', desc_en:'Register your newborn for Quebec health coverage.', desc_fr:'Inscrivez votre nouveau-né à la couverture santé du Québec.', url:"https://www.ramq.gouv.qc.ca/en/citizens/birth-adoption", what_en:'Register your child as soon as possible after birth so they receive their own RAMQ coverage.', what_fr:'Inscrivez votre enfant le plus tôt possible après la naissance afin qu\'il reçoive sa propre couverture RAMQ.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['Birth registration information','Parent\'s RAMQ information'], need_list_fr:['Renseignements de déclaration de naissance','Renseignements RAMQ du parent'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Complete the registration after your child\'s birth has been declared.', steps_fr:'Complétez l\'inscription après que la naissance de votre enfant ait été déclarée.', official_links:[{label_en:'Register a Newborn with RAMQ', label_fr:'Inscrire un nouveau-né à la RAMQ', url:"https://www.ramq.gouv.qc.ca/en/citizens/birth-adoption"}], related:['apply-for-ramq','birth-registration'], reviewed:'August 2026', slug:'register-a-newborn-with-ramq'},
        {en:'Find a Family Doctor', fr:'Trouver un médecin de famille', desc_en:'Join Quebec\'s waiting list for a family doctor.', desc_fr:'Rejoignez la liste d\'attente du Québec pour un médecin de famille.', url:"https://www.quebec.ca/en/health/finding-a-resource/quebec-family-doctor-finder", what_en:'Register if you don\'t currently have a family doctor.', what_fr:'Inscrivez-vous si vous n\'avez pas actuellement de médecin de famille.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['RAMQ health card','Contact information'], need_list_fr:['Carte d\'assurance maladie RAMQ','Coordonnées'], steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Register online and keep your contact information up to date while waiting to be matched.', steps_fr:'Inscrivez-vous en ligne et gardez vos coordonnées à jour en attendant d\'être jumelé.', official_links:[{label_en:'Find a Family Doctor', label_fr:'Trouver un médecin de famille', url:"https://www.quebec.ca/en/health/finding-a-resource/quebec-family-doctor-finder"}], related:['apply-for-ramq','info-sante-811'], reviewed:'September 2026', slug:'find-a-family-doctor'},
        {en:'Prescription Drug Insurance', fr:'Assurance médicaments', desc_en:'Learn about Quebec\'s prescription drug insurance.', desc_fr:'Renseignez-vous sur l\'assurance médicaments du Québec.', url:"https://www.ramq.gouv.qc.ca/en/citizens/prescription-drug-insurance", what_en:'Everyone living in Quebec must have prescription drug coverage through either a private insurance plan or the public RAMQ plan.', what_fr:'Toute personne vivant au Québec doit avoir une assurance médicaments, soit par un régime privé, soit par le régime public de la RAMQ.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Know whether you already have prescription coverage through your employer or another private insurance plan.', need_fr:'Vérifiez si vous avez déjà une couverture de médicaments par votre employeur ou un autre régime privé.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'If you don\'t have private coverage, review the RAMQ Public Prescription Drug Insurance Plan and confirm your eligibility.', steps_fr:'Si vous n\'avez pas de couverture privée, consultez le régime public d\'assurance médicaments de la RAMQ et confirmez votre admissibilité.', official_links:[{label_en:'Prescription Drug Insurance', label_fr:'Assurance médicaments', url:"https://www.ramq.gouv.qc.ca/en/citizens/prescription-drug-insurance"}], related:['apply-for-ramq'], reviewed:'August 2026', slug:'prescription-drug-insurance'},
        {en:'Info-Santé 811', fr:'Info-Santé 811', desc_en:'Speak with a nurse for non-emergency medical advice.', desc_fr:'Parlez à une infirmière pour des conseils médicaux non urgents.', url:"https://www.quebec.ca/en/health/finding-a-resource/info-sante-811", what_en:'Call if you\'re unsure whether you should see a doctor, visit a clinic, or go to the emergency room.', what_fr:'Appelez si vous n\'êtes pas certain de devoir consulter un médecin, visiter une clinique ou vous rendre à l\'urgence.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Have your RAMQ card available if possible, along with details about your symptoms.', need_fr:'Ayez votre carte RAMQ à portée de main si possible, ainsi que les détails de vos symptômes.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Call 811 anytime to speak with a nurse. No appointment is required.', steps_fr:'Composez le 811 en tout temps pour parler à une infirmière. Aucun rendez-vous n\'est nécessaire.', official_links:[{label_en:'Info-Santé 811', label_fr:'Info-Santé 811', url:"https://www.quebec.ca/en/health/finding-a-resource/info-sante-811"}], related:['find-a-family-doctor'], reviewed:'September 2026', slug:'info-sante-811'},
        {en:'Tzum Gezunt Health Centre', fr:'Centre de santé Tzum Gezunt', desc_en:'Community healthcare services for Quebec\'s Hasidic Jewish community.', desc_fr:'Services de santé communautaires pour la communauté juive hassidique du Québec.', url:"https://tzumgezunt.ca/", what_en:'Contact Tzum Gezunt for primary healthcare services and community health programs.', what_fr:'Contactez Tzum Gezunt pour des services de soins de santé primaires et des programmes de santé communautaires.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Have your RAMQ card and any referral or medical information available if requested.', need_fr:'Ayez votre carte RAMQ et tout renseignement de référence ou médical disponible si demandé.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Visit the website or contact the clinic directly to learn about available services and book an appointment.', steps_fr:'Visitez le site web ou contactez la clinique directement pour connaître les services disponibles et prendre rendez-vous.', label_en1:'Visit Website →', label_fr1:'Visiter le site web →', tips_heading_en:'Contact Information', tips_heading_fr:'Coordonnées', tips_list_en:['Fax: 514.277.4887','Address: 5655 av du Parc, Suite 206, Montréal QC H2V-4H2'], tips_list_fr:['Télécopieur : 514.277.4887','Adresse : 5655, av. du Parc, bureau 206, Montréal (Québec) H2V-4H2'], official_links:[{label_en:'Tzum Gezunt Health Centre', label_fr:'Centre de santé Tzum Gezunt', url:"https://tzumgezunt.ca/"},{label_en:'Phone: 514.545.4398', label_fr:'Téléphone : 514.545.4398', url:"tel:5145454398"},{label_en:'Email: info@tzumgezunt.ca', label_fr:'Courriel : info@tzumgezunt.ca', url:"mailto:info@tzumgezunt.ca"}], related:['apply-for-ramq','find-a-family-doctor'], reviewed:'September 2026', slug:'tzum-gezunt-health-centre'}
      ] }
    ] },
  { icon:'gov', en:'Municipal Services', fr:'Services municipaux',
    intro_en:'Everyday municipal services.',
    intro_fr:'Services municipaux courants.',
    groups:[
      { heading_en:'', heading_fr:'', items:[
        {en:'Report a Problem: Street Cleaning, Garbage or Another City Service (311)', fr:'Signaler un probl\u00e8me\u00a0: nettoyage des rues, ordures ou autre service municipal (311)', desc_en:'The City of Montr\u00e9al service-request channel for cleanliness, street cleaning, garbage, potholes and public-space maintenance.', desc_fr:'Le canal de demandes de services de la Ville de Montr\u00e9al pour la propret\u00e9, le nettoyage des rues, les ordures, les nids-de-poule et l\'entretien du domaine public.', url:"https://montreal.ca/en/how-to/report-cleanliness-issue", what_en:'Use 311 to report a municipal service problem or make a complaint about street cleaning, cleanliness, garbage, snow clearing, potholes, sidewalks or other public-space maintenance. This is the City\'s own service-request channel and it is the right first step for a routine service problem \u2014 before contacting the borough office or an elected official.', what_fr:'Utilisez le 311 pour signaler un probl\u00e8me de service municipal ou faire une plainte concernant le nettoyage des rues, la propret\u00e9, les ordures, le d\u00e9neigement, les nids-de-poule, les trottoirs ou l\'entretien du domaine public. C\'est le canal de la Ville et la bonne premi\u00e8re \u00e9tape pour un probl\u00e8me de service courant \u2014 avant de contacter la mairie d\'arrondissement ou un \u00e9lu.', question_en:'Should I contact my borough or an elected official instead?', question_fr:'Devrais-je plut\u00f4t contacter mon arrondissement ou un \u00e9lu?', answer_en:'Start with 311 for a routine service problem. Contact the borough office if the request is not resolved or the matter is borough policy rather than a service fault, and an elected official for a policy question or a repeatedly unresolved problem.', answer_fr:'Commencez par le 311 pour un probl\u00e8me de service courant. Contactez la mairie d\'arrondissement si la demande n\'est pas r\u00e9gl\u00e9e ou s\'il s\'agit d\'une politique d\'arrondissement plut\u00f4t que d\'un bris de service, et un \u00e9lu pour une question de politique ou un probl\u00e8me qui reste non r\u00e9solu.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_list_en:['The exact address or nearest intersection','A description of the problem','Photos, if you have them','Your contact information, if you want a follow-up'], need_list_fr:['L\'adresse exacte ou l\'intersection la plus proche','Une description du probl\u00e8me','Des photos, si vous en avez','Vos coordonn\u00e9es, si vous souhaitez un suivi'], steps_heading_en:'How to Report It', steps_heading_fr:'Comment le signaler', steps_list_en:['Submit the request online through the City\'s report form.','Or call 311 (514-872-0311 from outside Montr\u00e9al).','Or use the 311 Montr\u00e9al mobile app.','Or go in person to your borough\'s Bureau Acc\u00e8s Montr\u00e9al.','Keep the request number so you can follow up.'], steps_list_fr:['Soumettez la demande en ligne au moyen du formulaire de la Ville.','Ou composez le 311 (514-872-0311 \u00e0 l\'ext\u00e9rieur de Montr\u00e9al).','Ou utilisez l\'application mobile 311 Montr\u00e9al.','Ou pr\u00e9sentez-vous au Bureau Acc\u00e8s Montr\u00e9al de votre arrondissement.','Conservez le num\u00e9ro de demande pour faire un suivi.'], tips_heading_en:'Good to Know', tips_heading_fr:'Bon \u00e0 savoir', tips_list_en:['311 is open Monday to Friday from 8:30 a.m. to 8:30 p.m., and Saturday, Sunday and holidays from 9 a.m. to 5 p.m.','Routine service problems are handled faster through 311 than by writing to an elected official.','You can copy info@cjhq.org when you write to the City or a borough about a matter affecting the community, so CJHQ is aware of the correspondence and can assist or follow up where appropriate.'], tips_list_fr:['Le 311 est ouvert du lundi au vendredi de 8 h 30 \u00e0 20 h 30, et le samedi, le dimanche et les jours f\u00e9ri\u00e9s de 9 h \u00e0 17 h.','Les probl\u00e8mes de service courants sont trait\u00e9s plus rapidement par le 311 qu\'en \u00e9crivant \u00e0 un \u00e9lu.','Vous pouvez mettre info@cjhq.org en copie lorsque vous \u00e9crivez \u00e0 la Ville ou \u00e0 un arrondissement au sujet d\'une question touchant la communaut\u00e9, afin que le CJHQ soit au courant et puisse aider ou faire un suivi s\'il y a lieu.'], official_links:[{label_en:'Report a Cleanliness or Street Cleaning Issue', label_fr:'Signaler un probl\u00e8me de propret\u00e9 ou de nettoyage', url:"https://montreal.ca/en/how-to/report-cleanliness-issue"},{label_en:'Contact the City (311)', label_fr:'Joindre la Ville (311)', url:"https://montreal.ca/en/contact-us"},{label_en:'311 Montr\u00e9al Mobile App', label_fr:'Application mobile 311 Montr\u00e9al', url:"https://montreal.ca/en/311-montreal-mobile-app"}], related:['waste-collection','snow-removal','local-borough-services'], reviewed:'September 2026', slug:'report-a-problem-311', label_en1:'Report a Problem \u2192', label_fr1:'Signaler un probl\u00e8me \u2192'},
        {en:'Outremont Borough Services, Contacts and Complaints', fr:'Arrondissement d\'Outremont \u2014 services, coordonn\u00e9es et plaintes', desc_en:'Borough office, permits counter, borough council and how to raise a local issue in Outremont.', desc_fr:'Mairie d\'arrondissement, comptoir des permis, conseil d\'arrondissement et comment soulever un enjeu local \u00e0 Outremont.', url:"https://montreal.ca/outremont", what_en:'Use this if you live in Outremont and need to reach the borough, raise a local complaint, or find out who your borough council members are. For a routine service problem such as street cleaning or garbage, use the City\'s 311 service request first.', what_fr:'Utilisez ceci si vous habitez Outremont et devez joindre l\'arrondissement, formuler une plainte locale ou savoir qui si\u00e8ge au conseil d\'arrondissement. Pour un probl\u00e8me de service courant comme le nettoyage des rues ou les ordures, utilisez d\'abord une demande 311.', question_en:'Should I write to the borough mayor?', question_fr:'Dois-je \u00e9crire \u00e0 la mairesse d\'arrondissement?', answer_en:'Not for a routine service problem \u2014 use 311 first, and the borough office if that does not resolve it. Elected officials are the right place for a policy question, or for a problem that has already been reported and remains unresolved. The borough council page lists the current members.', answer_fr:'Pas pour un probl\u00e8me de service courant \u2014 utilisez d\'abord le 311, puis la mairie d\'arrondissement si cela ne r\u00e8gle rien. Les \u00e9lus sont l\'endroit indiqu\u00e9 pour une question de politique ou pour un probl\u00e8me d\u00e9j\u00e0 signal\u00e9 et non r\u00e9solu. La page du conseil d\'arrondissement indique les membres actuels.', need_heading_en:'Where to Go', need_heading_fr:'O\u00f9 aller', need_list_en:['Borough office: 543, chemin de la C\u00f4te-Sainte-Catherine, Montr\u00e9al QC H2V 4R2','Permits counter: 1431, avenue Van Horne, 2e \u00e9tage, Montr\u00e9al QC H2V 1K9 \u2014 514 495-6234','General enquiries and service requests: 311, or 514-872-0311 from outside Montr\u00e9al'], need_list_fr:['Mairie d\'arrondissement\u00a0: 543, chemin de la C\u00f4te-Sainte-Catherine, Montr\u00e9al QC H2V 4R2','Comptoir des permis\u00a0: 1431, avenue Van Horne, 2e \u00e9tage, Montr\u00e9al QC H2V 1K9 \u2014 514 495-6234','Renseignements g\u00e9n\u00e9raux et demandes de services\u00a0: 311, ou 514-872-0311 de l\'ext\u00e9rieur de Montr\u00e9al'], steps_heading_en:'How to Raise a Local Issue', steps_heading_fr:'Comment soulever un enjeu local', steps_list_en:['For a service problem \u2014 street cleaning, garbage, snow, potholes \u2014 submit a 311 request first.','If it is not resolved, contact the borough office and quote your 311 request number.','For a borough policy question, or a problem already reported and unresolved, write to the borough council.','Check the borough council page for the current members and how to reach them.'], steps_list_fr:['Pour un probl\u00e8me de service \u2014 nettoyage des rues, ordures, neige, nids-de-poule \u2014 faites d\'abord une demande 311.','Si ce n\'est pas r\u00e9gl\u00e9, communiquez avec la mairie d\'arrondissement en citant votre num\u00e9ro de demande 311.','Pour une question de politique d\'arrondissement, ou un probl\u00e8me d\u00e9j\u00e0 signal\u00e9 et non r\u00e9solu, \u00e9crivez au conseil d\'arrondissement.','Consultez la page du conseil d\'arrondissement pour conna\u00eetre les membres actuels et comment les joindre.'], tips_heading_en:'Good to Know', tips_heading_fr:'Bon \u00e0 savoir', tips_list_en:['Borough council members change with each municipal election \u2014 the official council page is always the current list.','The borough office does not publish a general public email address; use 311 or the borough page to reach it.','You can copy info@cjhq.org when you write to the City or a borough about a matter affecting the community, so CJHQ is aware of the correspondence and can assist or follow up where appropriate.'], tips_list_fr:['Les membres du conseil d\'arrondissement changent \u00e0 chaque \u00e9lection municipale \u2014 la page officielle du conseil est toujours \u00e0 jour.','La mairie d\'arrondissement ne publie pas d\'adresse courriel publique g\u00e9n\u00e9rale\u00a0; passez par le 311 ou la page de l\'arrondissement.','Vous pouvez mettre info@cjhq.org en copie lorsque vous \u00e9crivez \u00e0 la Ville ou \u00e0 un arrondissement au sujet d\'une question touchant la communaut\u00e9, afin que le CJHQ soit au courant et puisse aider ou faire un suivi s\'il y a lieu.'], official_links:[{label_en:'Outremont Borough', label_fr:'Arrondissement d\'Outremont', url:"https://montreal.ca/outremont"},{label_en:'Outremont Borough Council', label_fr:'Conseil d\'arrondissement d\'Outremont', url:"https://montreal.ca/conseils-decisionnels/conseil-darrondissement-doutremont"},{label_en:'Outremont Borough Office', label_fr:'Mairie d\'arrondissement d\'Outremont', url:"https://montreal.ca/lieux/mairie-darrondissement-doutremont"},{label_en:'Outremont Permits Counter', label_fr:'Comptoir des permis \u2014 Outremont', url:"https://montreal.ca/lieux/comptoir-des-permis-outremont"}], related:['report-a-problem-311','local-borough-services','outdoor-public-events-permits'], reviewed:'September 2026', slug:'outremont-borough-services', label_en1:'Outremont Borough \u2192', label_fr1:'Arrondissement d\'Outremont \u2192'},
        {en:'Le Plateau-Mont-Royal Borough Services, Contacts and Complaints', fr:'Arrondissement du Plateau-Mont-Royal \u2014 services, coordonn\u00e9es et plaintes', desc_en:'Borough office, borough council and how to raise a local issue in Le Plateau-Mont-Royal.', desc_fr:'Mairie d\'arrondissement, conseil d\'arrondissement et comment soulever un enjeu local dans Le Plateau-Mont-Royal.', url:"https://montreal.ca/en/city-government/plateau-mont-royal-borough-council", what_en:'Use this if you live in Le Plateau-Mont-Royal and need to reach the borough, raise a local complaint, or find out who your borough council members are. For a routine service problem such as street cleaning or garbage, use the City\'s 311 service request first.', what_fr:'Utilisez ceci si vous habitez Le Plateau-Mont-Royal et devez joindre l\'arrondissement, formuler une plainte locale ou savoir qui si\u00e8ge au conseil d\'arrondissement. Pour un probl\u00e8me de service courant comme le nettoyage des rues ou les ordures, utilisez d\'abord une demande 311.', question_en:'Should I write to the borough mayor?', question_fr:'Dois-je \u00e9crire \u00e0 la mairesse d\'arrondissement?', answer_en:'Not for a routine service problem \u2014 use 311 first, and the Plateau-Mont-Royal borough office if that does not resolve it. Elected officials are the right place for a policy question, or for a problem that has already been reported and remains unresolved. The Plateau-Mont-Royal borough council page lists the current members.', answer_fr:'Pas pour un probl\u00e8me de service courant \u2014 utilisez d\'abord le 311, puis la mairie d\'arrondissement du Plateau-Mont-Royal si cela ne r\u00e8gle rien. Les \u00e9lus sont l\'endroit indiqu\u00e9 pour une question de politique ou pour un probl\u00e8me d\u00e9j\u00e0 signal\u00e9 et non r\u00e9solu. La page du conseil d\'arrondissement du Plateau-Mont-Royal indique les membres actuels.', need_heading_en:'Where to Go', need_heading_fr:'O\u00f9 aller', need_list_en:['Borough office: 201, avenue Laurier Est, Montr\u00e9al QC H2T 3E6','General enquiries and service requests: 311, or 514-872-0311 from outside Montr\u00e9al','Borough events line: 514-872-6103'], need_list_fr:['Mairie d\'arrondissement\u00a0: 201, avenue Laurier Est, Montr\u00e9al QC H2T 3E6','Renseignements g\u00e9n\u00e9raux et demandes de services\u00a0: 311, ou 514-872-0311 de l\'ext\u00e9rieur de Montr\u00e9al','Ligne des \u00e9v\u00e9nements de l\'arrondissement\u00a0: 514-872-6103'], steps_heading_en:'How to Raise a Local Issue', steps_heading_fr:'Comment soulever un enjeu local', steps_list_en:['For a service problem \u2014 street cleaning, garbage, snow, potholes \u2014 submit a 311 request first.','If it is not resolved, contact the borough office and quote your 311 request number.','For a borough policy question, or a problem already reported and unresolved, write to the borough council.','Check the borough council page for the current members and how to reach them.'], steps_list_fr:['Pour un probl\u00e8me de service \u2014 nettoyage des rues, ordures, neige, nids-de-poule \u2014 faites d\'abord une demande 311.','Si ce n\'est pas r\u00e9gl\u00e9, communiquez avec la mairie d\'arrondissement en citant votre num\u00e9ro de demande 311.','Pour une question de politique d\'arrondissement, ou un probl\u00e8me d\u00e9j\u00e0 signal\u00e9 et non r\u00e9solu, \u00e9crivez au conseil d\'arrondissement.','Consultez la page du conseil d\'arrondissement pour conna\u00eetre les membres actuels et comment les joindre.'], tips_heading_en:'Good to Know', tips_heading_fr:'Bon \u00e0 savoir', tips_list_en:['The borough office is open Tuesday to Thursday; it is closed Monday and Friday.','Borough council members change with each municipal election \u2014 the official council page is always the current list.','You can copy info@cjhq.org when you write to the City or a borough about a matter affecting the community, so CJHQ is aware of the correspondence and can assist or follow up where appropriate.'], tips_list_fr:['La mairie d\'arrondissement est ouverte du mardi au jeudi\u00a0; elle est ferm\u00e9e le lundi et le vendredi.','Les membres du conseil d\'arrondissement changent \u00e0 chaque \u00e9lection municipale \u2014 la page officielle du conseil est toujours \u00e0 jour.','Vous pouvez mettre info@cjhq.org en copie lorsque vous \u00e9crivez \u00e0 la Ville ou \u00e0 un arrondissement au sujet d\'une question touchant la communaut\u00e9, afin que le CJHQ soit au courant et puisse aider ou faire un suivi s\'il y a lieu.'], official_links:[{label_en:'Le Plateau-Mont-Royal Borough Council', label_fr:'Conseil d\'arrondissement du Plateau-Mont-Royal', url:"https://montreal.ca/en/city-government/plateau-mont-royal-borough-council"},{label_en:'Le Plateau-Mont-Royal Borough Office', label_fr:'Mairie d\'arrondissement du Plateau-Mont-Royal', url:"https://montreal.ca/lieux/mairie-darrondissement-du-plateau-mont-royal"}], related:['report-a-problem-311','local-borough-services','outdoor-public-events-permits'], reviewed:'September 2026', slug:'plateau-borough-services', label_en1:'Plateau Borough \u2192', label_fr1:'Arrondissement du Plateau \u2192'},
        {en:'Outdoor Public Events, Processions and Road Closure Permits', fr:'\u00c9v\u00e9nements publics ext\u00e9rieurs, processions et permis de fermeture de rue', desc_en:'Borough authorization for an outdoor public event, a procession, or occupying public space.', desc_fr:'Autorisation d\'arrondissement pour un \u00e9v\u00e9nement public ext\u00e9rieur, une procession ou l\'occupation du domaine public.', url:"https://montreal.ca/en/how-to/organize-public-event-your-borough", what_en:'A permit is required to hold a public event on public property in Montr\u00e9al \u2014 a park, a street or another outdoor public space. Applications go to your borough, not to the central City. This covers a festival, a community or neighbourhood gathering, and a parade, march or procession.', what_fr:'Un permis est requis pour tenir un \u00e9v\u00e9nement public sur le domaine public \u00e0 Montr\u00e9al \u2014 un parc, une rue ou un autre espace public ext\u00e9rieur. Les demandes se font aupr\u00e8s de votre arrondissement, et non de la Ville centre. Cela vise un festival, une f\u00eate communautaire ou de quartier, et un d\u00e9fil\u00e9, une marche ou une procession.', question_en:'What about a Hachnoses Sefer Torah or another religious procession?', question_fr:'Qu\'en est-il d\'une Hachnoses Sefer Torah ou d\'une autre procession religieuse?', answer_en:'CJHQ cannot tell you which category applies. The City lists a parade, march or procession among the activities a borough permit covers, and separately lists a religious ceremony among the events the standard public-event permit does not cover \u2014 and a procession on a street may also involve your neighbourhood police station. Confirm your specific event with your borough before you plan around a date.', answer_fr:'Le CJHQ ne peut pas vous dire quelle cat\u00e9gorie s\'applique. La Ville inclut le d\u00e9fil\u00e9, la marche ou la procession parmi les activit\u00e9s vis\u00e9es par un permis d\'arrondissement, et mentionne s\u00e9par\u00e9ment la c\u00e9r\u00e9monie religieuse parmi les \u00e9v\u00e9nements que le permis standard ne couvre pas \u2014 et une procession dans la rue peut aussi impliquer votre poste de quartier. Confirmez votre \u00e9v\u00e9nement aupr\u00e8s de votre arrondissement avant de planifier une date.', need_heading_en:'What the City Generally Requires', need_heading_fr:'Ce que la Ville exige g\u00e9n\u00e9ralement', need_list_en:['A legally incorporated organization as the applicant','Proof of liability insurance, generally $3 million to $5 million, naming the Ville de Montr\u00e9al as an insured','A site plan and the event programme','A SOCAN permit if there will be music','Additional fees and conditions if a street is closed or public space is occupied'], need_list_fr:['Un organisme l\u00e9galement constitu\u00e9 comme demandeur','Une preuve d\'assurance responsabilit\u00e9, g\u00e9n\u00e9ralement de 3 \u00e0 5 millions de dollars, d\u00e9signant la Ville de Montr\u00e9al comme assur\u00e9e','Un plan du site et le programme de l\'\u00e9v\u00e9nement','Un permis de la SOCAN s\'il y a de la musique','Des frais et conditions suppl\u00e9mentaires si une rue est ferm\u00e9e ou le domaine public occup\u00e9'], steps_heading_en:'How to Apply', steps_heading_fr:'Comment faire la demande', steps_list_en:['Read the City page for your borough \u2014 the process, deadline and form differ by borough.','Contact your borough to confirm which authorization your event needs before you commit to a date.','Submit the borough\'s application with the required documents.','Ask the borough whether your neighbourhood police station also needs to be involved for a street procession.','Apply as early as you can \u2014 boroughs set their own deadlines and some are months ahead.'], steps_list_fr:['Consultez la page de la Ville pour votre arrondissement \u2014 le processus, le d\u00e9lai et le formulaire varient.','Communiquez avec votre arrondissement pour confirmer l\'autorisation requise avant d\'arr\u00eater une date.','Soumettez la demande de l\'arrondissement avec les documents requis.','Demandez \u00e0 l\'arrondissement si votre poste de quartier doit aussi \u00eatre impliqu\u00e9 pour une procession dans la rue.','Faites la demande le plus t\u00f4t possible \u2014 les arrondissements fixent leurs propres d\u00e9lais, parfois plusieurs mois \u00e0 l\'avance.'], tips_heading_en:'Good to Know', tips_heading_fr:'Bon \u00e0 savoir', tips_list_en:['Deadlines differ by borough and the published English and French pages do not always agree \u2014 confirm the current deadline with the borough itself.','CJHQ is not the permitting authority and cannot obtain or guarantee an approval. CJHQ can help you prepare a request and follow up.','You can copy info@cjhq.org when you write to the City or a borough about a matter affecting the community, so CJHQ is aware of the correspondence and can assist or follow up where appropriate.'], tips_list_fr:['Les d\u00e9lais varient selon l\'arrondissement et les pages publi\u00e9es en fran\u00e7ais et en anglais ne concordent pas toujours \u2014 confirmez le d\u00e9lai courant aupr\u00e8s de l\'arrondissement.','Le CJHQ n\'est pas l\'autorit\u00e9 qui d\u00e9livre les permis et ne peut ni obtenir ni garantir une approbation. Le CJHQ peut vous aider \u00e0 pr\u00e9parer une demande et \u00e0 faire un suivi.','Vous pouvez mettre info@cjhq.org en copie lorsque vous \u00e9crivez \u00e0 la Ville ou \u00e0 un arrondissement au sujet d\'une question touchant la communaut\u00e9, afin que le CJHQ soit au courant et puisse aider ou faire un suivi s\'il y a lieu.'], official_links:[{label_en:'Organize a Public Event in Your Borough', label_fr:'Organiser un \u00e9v\u00e9nement public en arrondissement', url:"https://montreal.ca/en/how-to/organize-public-event-your-borough"},{label_en:'Public Events and Festivals', label_fr:'\u00c9v\u00e9nements publics et festivals', url:"https://montreal.ca/en/topics/public-events-and-festivals"},{label_en:'Permits and Authorizations', label_fr:'Permis et autorisations', url:"https://montreal.ca/en/permits-and-authorizations"}], related:['outremont-borough-services','plateau-borough-services','local-borough-services'], reviewed:'September 2026', slug:'outdoor-public-events-permits', label_en1:'City Event Permits \u2192', label_fr1:'Permis d\'\u00e9v\u00e9nement \u2192'},
        {en:'Outremont Visitor Parking', fr:'Stationnement visiteurs Outremont', desc_en:'Register free visitor parking permits for eligible Outremont residents.', desc_fr:'Inscrivez des vignettes de stationnement gratuites pour visiteurs pour les résidents admissibles d\'Outremont.', url:"https://arr-outremont.ca/", url2:"mailto:mobilite.durable@montreal.ca?subject=Request%20for%20Outremont%20Parking%20Access%20Code&body=Please%20find%20attached%20my%20proof%20of%20residence%20to%20obtain%20visitor%20parking%20access%20codes.", label_en1:'Register Online →', label_fr1:'S\'inscrire en ligne →', label_en2:'Request Access Code', label_fr2:'Demander un code', what_en:'Use this service if you live in Outremont and need a visitor parking permit.', what_fr:'Utilisez ce service si vous habitez à Outremont et avez besoin d\'une vignette de stationnement pour visiteurs.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'You\'ll need your resident access code. If you don\'t have one, request it by providing proof of residence.', need_fr:'Vous aurez besoin de votre code d\'accès résident. Si vous n\'en avez pas, demandez-en un en fournissant une preuve de résidence.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Create a visitor permit online. Eligible residents receive up to 50 free visitor permits each calendar year.', steps_fr:'Créez une vignette pour visiteurs en ligne. Les résidents admissibles reçoivent jusqu\'à 50 vignettes gratuites par année civile.', official_links:[{label_en:'Outremont Visitor Parking', label_fr:'Stationnement visiteurs Outremont', url:"https://arr-outremont.ca/"}], related:['le-plateau-mont-royal-visitor-parking'], reviewed:'September 2026', slug:'outremont-visitor-parking'},
        {en:'Le Plateau-Mont-Royal Visitor Parking', fr:'Stationnement visiteurs — Le Plateau-Mont-Royal', desc_en:'Free visitor permits for residents, or a paid daily sticker for everyone else.', desc_fr:'Permis visiteurs gratuits pour les résidents, ou une vignette quotidienne payante pour tous les autres.', url:"https://montreal.ca/en/how-to/get-temporary-visitor-parking-sticker?arrondissement=Le%20Plateau-Mont-Royal", what_en:'Use this service when visitors need to park in resident-only areas of Le Plateau-Mont-Royal.', what_fr:'Utilisez ce service lorsque des visiteurs doivent stationner dans les zones réservées aux résidents du Plateau-Mont-Royal.', need_heading_en:'Check the Free Option First', need_heading_fr:'Vérifiez d\'abord l\'option gratuite', need_en:'Plateau residents can obtain up to 50 free daily virtual visitor permits per year through the borough\'s online portal. Nothing to print, nothing to display.', need_fr:'Les résidents du Plateau peuvent obtenir jusqu\'à 50 permis virtuels gratuits pour visiteurs par année, par jour, via le portail en ligne de l\'arrondissement. Rien à imprimer, rien à afficher.', steps_heading_en:'If You Are Not a Resident (or Have Used Your 50)', steps_heading_fr:'Si vous n\'êtes pas résident (ou avez utilisé vos 50 permis)', steps_list_en:['Buy a daily parking sticker at any Montréal parking pay station — the same machines used for parking meters.','Zone PMR01 (all sticker zones in the borough): \$16.','Zone PMR02 (only zones east of Rue Saint-Denis, excluding Saint-Denis itself): \$10.','The sticker is valid for 24 hours from purchase — leave the printed coupon in plain view on the dashboard, street side.'], steps_list_fr:['Achetez une vignette de stationnement quotidienne à n\'importe quelle borne de paiement de Montréal — les mêmes bornes que pour les parcomètres.','Zone PMR01 (toutes les zones à vignette de l\'arrondissement) : 16 \$.','Zone PMR02 (seulement les zones à l\'est de la rue Saint-Denis, celle-ci exclue) : 10 \$.','La vignette est valide 24 heures à partir de l\'achat — laissez le coupon imprimé bien visible sur le tableau de bord, côté rue.'], official_links:[{label_en:'Free Visitor Permit for Residents', label_fr:'Permis visiteur gratuit pour résidents', url:"https://montreal.ca/en/how-to/get-temporary-visitor-parking-sticker?arrondissement=Le%20Plateau-Mont-Royal"},{label_en:'Daily or Monthly Parking Sticker', label_fr:'Vignette de stationnement quotidienne ou mensuelle', url:"https://montreal.ca/en/how-to/get-daily-or-monthly-parking-sticker?arrondissement=PMR"},{label_en:'On-Street Parking', label_fr:'Stationnement sur rue', url:"https://montreal.ca/en/topics/street-parking"}], related:['outremont-visitor-parking'], reviewed:'September 2026', slug:'le-plateau-mont-royal-visitor-parking', label_en1:'Get a Permit →', label_fr1:'Obtenir un permis →'},
        {en:'Waste Collection', fr:'Collecte des matières résiduelles', desc_en:'Garbage, recycling, compost, and bulky item collection schedules.', desc_fr:'Horaires de collecte des ordures, du recyclage, du compost et des objets volumineux.', url:"https://montreal.ca/en/services/collection-schedules", what_en:'Use this page to find your collection schedule and disposal rules.', what_fr:'Utilisez cette page pour trouver votre horaire de collecte et les règles d\'élimination.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Your municipal address.', need_fr:'Votre adresse municipale.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Enter your address to view collection days and instructions for your neighbourhood.', steps_fr:'Entrez votre adresse pour voir les jours de collecte et les instructions pour votre quartier.', official_links:[{label_en:'Waste Collection', label_fr:'Collecte des matières résiduelles', url:"https://montreal.ca/en/services/collection-schedules"}], related:['snow-removal','property-taxes'], reviewed:'September 2026', slug:'waste-collection', label_en1:'View Schedule →', label_fr1:'Voir l\'horaire →'},
        {en:'Snow Removal', fr:'Déneigement', desc_en:'Snow removal operations and temporary parking restrictions.', desc_fr:'Opérations de déneigement et restrictions de stationnement temporaires.', url:"https://montreal.ca/en/snow-removal", what_en:'Check before parking on the street during the winter.', what_fr:'Vérifiez avant de stationner dans la rue pendant l\'hiver.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Your street name or address.', need_fr:'Le nom de votre rue ou votre adresse.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'View current snow removal operations and move your vehicle before posted restrictions begin.', steps_fr:'Consultez les opérations de déneigement actuelles et déplacez votre véhicule avant le début des restrictions affichées.', official_links:[{label_en:'Snow Removal', label_fr:'Déneigement', url:"https://montreal.ca/en/snow-removal"},{label_en:'311 Montréal App — Track Snow Removal & Report an Issue', label_fr:'Application 311 Montréal — Suivre le déneigement et signaler un problème', url:"https://montreal.ca/en/311-montreal-mobile-app"},{label_en:'Download 311 Montréal for iPhone', label_fr:'Télécharger 311 Montréal pour iPhone', url:"https://apps.apple.com/ca/app/montr%C3%A9al-services-aux-citoyens/id1280592582?l=fr-CA"},{label_en:'Download 311 Montréal for Android', label_fr:'Télécharger 311 Montréal pour Android', url:"https://play.google.com/store/apps/details?id=ca.montreal.montrealservicesauxcitoyens"}], related:['waste-collection'], reviewed:'September 2026', slug:'snow-removal', label_en1:'Learn More →', label_fr1:'En savoir plus →'},
        {en:'Property Taxes', fr:'Taxes municipales', desc_en:'View and pay your municipal property taxes.', desc_fr:'Consultez et payez vos taxes municipales.', url:"https://montreal.ca/en/municipal-taxes", what_en:'Use this service if you own property in Montreal.', what_fr:'Utilisez ce service si vous possédez une propriété à Montréal.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Your municipal tax account number or property information.', need_fr:'Votre numéro de compte de taxes municipales ou renseignements de propriété.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'View your account and pay online or through your financial institution.', steps_fr:'Consultez votre compte et payez en ligne ou par votre institution financière.', official_links:[{label_en:'Property Taxes', label_fr:'Taxes municipales', url:"https://montreal.ca/en/municipal-taxes"}], related:['waste-collection','building-permits'], reviewed:'September 2026', slug:'property-taxes', label_en1:'View or Pay Online →', label_fr1:'Consulter ou payer en ligne →'},
        {en:'Building Permits', fr:'Permis de construction', desc_en:'Apply for permits before starting construction or renovations.', desc_fr:'Faites une demande de permis avant de débuter la construction ou des rénovations.', url:"https://montreal.ca/en/permits-and-authorizations", what_en:'Many construction and renovation projects require a municipal permit before work begins.', what_fr:'Plusieurs projets de construction et de rénovation nécessitent un permis municipal avant le début des travaux.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Details of your project, including plans if required.', need_fr:'Les détails de votre projet, incluant les plans si requis.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Confirm whether a permit is required and submit your application before starting any work.', steps_fr:'Confirmez si un permis est requis et soumettez votre demande avant de débuter les travaux.', official_links:[{label_en:'Building Permits', label_fr:'Permis de construction', url:"https://montreal.ca/en/permits-and-authorizations"}], related:['local-borough-services','property-taxes'], reviewed:'September 2026', slug:'building-permits', label_en1:'Learn More →', label_fr1:'En savoir plus →'},
        {en:'Local Borough Services', fr:'Services d\'arrondissement', desc_en:'Contact your local borough office.', desc_fr:'Contactez votre bureau d\'arrondissement local.', url:"https://montreal.ca/en/boroughs", what_en:'Use this page for services handled by your local borough, including permits, local regulations, parks, libraries, and neighbourhood services.', what_fr:'Utilisez cette page pour les services gérés par votre arrondissement local, incluant les permis, les règlements locaux, les parcs, les bibliothèques et les services de quartier.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Know which Montreal borough you live in.', need_fr:'Sachez dans quel arrondissement de Montréal vous habitez.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Select your borough to find contact information and available municipal services.', steps_fr:'Sélectionnez votre arrondissement pour trouver les coordonnées et les services municipaux disponibles.', official_links:[{label_en:'Local Borough Services', label_fr:'Services d\'arrondissement', url:"https://montreal.ca/en/boroughs"}], related:['building-permits','waste-collection'], reviewed:'September 2026', slug:'local-borough-services', label_en1:'Find Your Borough →', label_fr1:'Trouver votre arrondissement →'},
        {en:'Public Transit (STM)', fr:'Transport en commun (STM)', desc_en:'OPUS cards, fares, and public transit information.', desc_fr:'Cartes OPUS, tarifs et renseignements sur le transport en commun.', url:"https://www.stm.info/en/info/fares/transit-fares", what_en:'Use this page if you travel on Montreal buses or the métro.', what_fr:'Utilisez cette page si vous vous déplacez en autobus ou en métro à Montréal.', need_heading_en:'Before You Start', need_heading_fr:'Avant de commencer', need_en:'Decide whether you need single fares, multiple trips, or a monthly pass.', need_fr:'Déterminez si vous avez besoin de tarifs simples, de plusieurs déplacements ou d\'une passe mensuelle.', steps_heading_en:'Next Step', steps_heading_fr:'Prochaine étape', steps_en:'Purchase an OPUS card at any métro station or authorized retailer and load the fare or pass that best suits your travel needs.', steps_fr:'Achetez une carte OPUS à n\'importe quelle station de métro ou détaillant autorisé et chargez le tarif ou la passe qui convient le mieux à vos besoins.', official_links:[{label_en:'Public Transit (STM)', label_fr:'Transport en commun (STM)', url:"https://www.stm.info/en/info/fares/transit-fares"}], reviewed:'September 2026', slug:'public-transit-stm', label_en1:'View Fares →', label_fr1:'Voir les tarifs →'}
      ] }
    ] },
];
const contactCats = [
  { en:'Community Member', fr:'Membre de la communauté' },
  { en:'Government or Public Institution', fr:'Gouvernement ou institution publique' },
  { en:'Media Representative', fr:'Représentant des médias' },
  { en:'Community Organization', fr:'Organisme communautaire' },
  { en:'General Inquiry', fr:'Demande générale' },
];

const contactFieldGroups = [
  { en:'Community Member', fr:'Membre de la communauté',
    fields:[
      {name:'full_name', en:'Full Name', fr:'Nom complet', type:'text', required:true},
      {name:'email', en:'Email Address', fr:'Adresse courriel', type:'email', required:true},
      {name:'phone', en:'Telephone Number (optional)', fr:'Numéro de téléphone (facultatif)', type:'tel', required:false},
      {name:'community', en:'Community (optional)', fr:'Communauté (facultatif)', type:'text', required:false},
      {name:'subject', en:'Subject', fr:'Sujet', type:'text', required:true},
      {name:'message', en:'How can we help?', fr:'Comment pouvons-nous vous aider?', type:'textarea', required:true},
    ] },
  { en:'Government or Public Institution', fr:'Gouvernement ou institution publique',
    fields:[
      {name:'full_name', en:'Full Name', fr:'Nom complet', type:'text', required:true},
      {name:'position', en:'Position / Title', fr:'Poste / titre', type:'text', required:true},
      {name:'department', en:'Department or Agency', fr:'Ministère ou organisme', type:'text', required:true},
      {name:'location', en:'Municipality / Province / Country', fr:'Municipalité / province / pays', type:'text', required:true},
      {name:'email', en:'Email Address', fr:'Adresse courriel', type:'email', required:true},
      {name:'phone', en:'Telephone Number', fr:'Numéro de téléphone', type:'tel', required:true},
      {name:'nature', en:'Nature of Inquiry', fr:'Nature de la demande', type:'text', required:true},
      {name:'message', en:'Message', fr:'Message', type:'textarea', required:true},
    ] },
  { en:'Media Representative', fr:'Représentant des médias',
    fields:[
      {name:'full_name', en:'Full Name', fr:'Nom complet', type:'text', required:true},
      {name:'news_org', en:'News Organization', fr:'Organisation médiatique', type:'text', required:true},
      {name:'position', en:'Position / Title', fr:'Poste / titre', type:'text', required:true},
      {name:'deadline', en:'Deadline (optional)', fr:'Échéance (facultatif)', type:'text', required:false},
      {name:'email', en:'Email Address', fr:'Adresse courriel', type:'email', required:true},
      {name:'phone', en:'Telephone Number', fr:'Numéro de téléphone', type:'tel', required:true},
      {name:'nature', en:'Nature of Media Inquiry', fr:'Nature de la demande médiatique', type:'text', required:true},
      {name:'message', en:'Message', fr:'Message', type:'textarea', required:true},
    ] },
  { en:'Community Organization', fr:'Organisme communautaire',
    fields:[
      {name:'org_name', en:'Organization Name', fr:'Nom de l\'organisme', type:'text', required:true},
      {name:'contact_person', en:'Contact Person', fr:'Personne-ressource', type:'text', required:true},
      {name:'position', en:'Position', fr:'Poste', type:'text', required:true},
      {name:'email', en:'Email Address', fr:'Adresse courriel', type:'email', required:true},
      {name:'phone', en:'Telephone Number', fr:'Numéro de téléphone', type:'tel', required:true},
      {name:'nature', en:'Nature of Inquiry', fr:'Nature de la demande', type:'text', required:true},
      {name:'message', en:'Message', fr:'Message', type:'textarea', required:true},
    ] },
  { en:'General Inquiry', fr:'Demande générale',
    fields:[
      {name:'full_name', en:'Full Name', fr:'Nom complet', type:'text', required:true},
      {name:'email', en:'Email Address', fr:'Adresse courriel', type:'email', required:true},
      {name:'phone', en:'Telephone Number (optional)', fr:'Numéro de téléphone (facultatif)', type:'tel', required:false},
      {name:'subject', en:'Subject', fr:'Sujet', type:'text', required:true},
      {name:'message', en:'Message', fr:'Message', type:'textarea', required:true},
    ] },
];

const coreValues = [
  { icon:'scale', en:'Integrity', fr:'Intégrité' },
  { icon:'heart', en:'Service', fr:'Service' },
  { icon:'briefcase', en:'Professionalism', fr:'Professionnalisme' },
  { icon:'people', en:'Respect', fr:'Respect' },
  { icon:'handshake', en:'Collaboration', fr:'Collaboration' },
];

const initiatives = [
  { icon:'people', en:'Community Services and Practical Assistance', fr:'Services communautaires et assistance pratique' },
  { icon:'scale', en:'Advocacy and Representation', fr:'Défense des intérêts et représentation' },
  { icon:'gov', en:'Government and Institutional Relations', fr:'Relations gouvernementales et institutionnelles' },
  { icon:'shield', en:'Public Safety and Security', fr:'Sécurité publique et sécurité' },
  { icon:'heart', en:'Religious Accommodation and Community Life', fr:'Accommodements religieux et vie communautaire' },
  { icon:'doc', en:'Community Information and Communication', fr:'Information et communication communautaires' },
];

const newsTopics = [
  { icon:'doc', en:'Community announcements', fr:'Annonces communautaires' },
  { icon:'leaf', en:'Holiday information and schedules', fr:'Renseignements et horaires des fêtes' },
  { icon:'plane', en:'Travel and border updates', fr:'Mises à jour sur les voyages et les frontières' },
  { icon:'truck', en:'Road closures and transportation notices', fr:'Fermetures de routes et avis de transport' },
  { icon:'shield', en:'Public safety information', fr:'Information sur la sécurité publique' },
  { icon:'check', en:'Time-sensitive notices and reminders', fr:'Avis urgents et rappels' },
];

// ---------- RENDER ----------
const INSURANCE_URLS = ['https://www.manulife-travel.ca/dist/home.html?as=wllebovits','https://shop.tugo.com/store/IAB48720'];

// Accordion state must be exposed to assistive technology, not just visually.
// Called from the head button's onclick; also used when search auto-opens or
// closes a category so aria-expanded never drifts from the .open class.
function toggleAccordion(headBtn){
  const item = headBtn.closest('.accordion-item');
  const open = item.classList.toggle('open');
  headBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
function syncAccordionAria(){
  document.querySelectorAll('#accordionWrap .accordion-item').forEach(item=>{
    const head = item.querySelector('.accordion-head');
    if(head) head.setAttribute('aria-expanded', item.classList.contains('open') ? 'true' : 'false');
  });
}

function renderAccordion(){
  const wrap = document.getElementById('accordionWrap');
  categories.forEach((c, idx)=>{
    const item = document.createElement('div');
    item.className = 'accordion-item';
    const buildItem = (it) => {
      const escAttr = (s) => (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;');
      const ov = RESOURCE_OVERRIDES_CACHE[it.slug];
      if(ov && ov.hidden) return '';
      let effective = it;
      if(ov){
        const use = (key) => (ov[key] !== undefined && ov[key] !== null && ov[key] !== '') ? ov[key] : it[key];
        effective = {
          ...it,
          en: use('title_en'), fr: use('title_fr'),
          desc_en: use('desc_en'), desc_fr: use('desc_fr'),
          url: use('url'),
          what_en: use('what_en'), what_fr: use('what_fr'),
          question_en: use('question_en'), question_fr: use('question_fr'),
          answer_en: use('answer_en'), answer_fr: use('answer_fr'),
          need_heading_en: use('need_heading_en'), need_heading_fr: use('need_heading_fr'),
          need_intro_en: use('need_intro_en'), need_intro_fr: use('need_intro_fr'),
          need_list_en: (ov.need_list_en && ov.need_list_en.length) ? ov.need_list_en : it.need_list_en,
          need_list_fr: (ov.need_list_fr && ov.need_list_fr.length) ? ov.need_list_fr : it.need_list_fr,
          steps_heading_en: use('steps_heading_en'), steps_heading_fr: use('steps_heading_fr'),
          steps_list_en: (ov.steps_list_en && ov.steps_list_en.length) ? ov.steps_list_en : it.steps_list_en,
          steps_list_fr: (ov.steps_list_fr && ov.steps_list_fr.length) ? ov.steps_list_fr : it.steps_list_fr,
          tips_heading_en: use('tips_heading_en'), tips_heading_fr: use('tips_heading_fr'),
          tips_list_en: (ov.tips_list_en && ov.tips_list_en.length) ? ov.tips_list_en : it.tips_list_en,
          tips_list_fr: (ov.tips_list_fr && ov.tips_list_fr.length) ? ov.tips_list_fr : it.tips_list_fr,
          official_links: (ov.official_links && ov.official_links.length) ? ov.official_links : it.official_links,
          related: (ov.related && ov.related.length) ? ov.related : it.related,
          label_en1: use('label_en1'), label_fr1: use('label_fr1'),
          url2: use('url2'), label_en2: use('label_en2'), label_fr2: use('label_fr2'),
        };
      }
      RESOURCE_BY_SLUG[it.slug] = effective;
      // The card is a real <button> so it is reachable by Tab and activated by
      // Enter/Space. The <li> stays the grid cell (the search filter hides it by
      // id), and all card styling moved to .res-item-btn, so the rendered result
      // is unchanged.
      const cardHref = effective.internalPage ? pathForPage(effective.internalPage) : (effective.url || resourceDeepLink(effective.slug));
      const externalAttrs = effective.internalPage ? '' : ' target="_blank" rel="noopener noreferrer"';
      return `<li class="res-item" data-slug="${escAttr(effective.slug)}">
          <a class="res-item-btn" href="${escAttr(cardHref)}"${externalAttrs}>
            <span class="res-item-text">
              <span class="res-link-title" data-en>${cjhqEscapeHtml(effective.en)}</span>
              <span class="res-link-title" data-fr>${cjhqEscapeHtml(effective.fr)}</span>
              ${effective.desc_en ? `<span class="res-desc" data-en>${cjhqEscapeHtml(effective.desc_en)}</span>` : ''}
              ${effective.desc_fr ? `<span class="res-desc" data-fr>${cjhqEscapeHtml(effective.desc_fr)}</span>` : ''}
            </span>
            <span class="res-learn-more"><span data-en>Learn more →</span><span data-fr>En savoir plus →</span></span>
          </a>
        </li>`;
    };
    const groupsHtml = c.groups.map(g => `
      <div class="res-group">
        ${g.heading_en ? `<h3 class="res-group-heading"><span data-en>${g.heading_en}</span><span data-fr>${g.heading_fr}</span></h3>` : ''}
        ${g.intro_en ? `<p class="res-group-intro" data-en>${g.intro_en}</p>` : ''}
        ${g.intro_fr ? `<p class="res-group-intro" data-fr>${g.intro_fr}</p>` : ''}
        <ul class="res-list">${g.items.map(buildItem).join('')}</ul>
        ${g.extra_en ? `<div data-en>${g.extra_en}</div>` : ''}
        ${g.extra_fr ? `<div data-fr>${g.extra_fr}</div>` : ''}
      </div>`).join('');
    item.innerHTML = `
      <button class="accordion-head" type="button" id="acc-head-${idx}" aria-expanded="false" aria-controls="acc-panel-${idx}" onclick="toggleAccordion(this)">
        <div class="icon-badge">${iconSVG(c.icon)}</div>
        <div class="accordion-head-text">
          <span class="accordion-head-title"><span data-en>${c.en}</span><span data-fr>${c.fr}</span></span>
          <span class="accordion-head-sub" data-en>${c.intro_en}</span>
          <span class="accordion-head-sub" data-fr>${c.intro_fr}</span>
        </div>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div class="accordion-body" id="acc-panel-${idx}" role="region" aria-labelledby="acc-head-${idx}">
        <div class="accordion-body-inner">
          ${groupsHtml}
          ${c.extra_en ? `<div data-en>${c.extra_en}</div>` : ''}
          ${c.extra_fr ? `<div data-fr>${c.extra_fr}</div>` : ''}
        </div>
      </div>`;
    wrap.appendChild(item);
  });
  initResourceCellHandlers();
}

/* ---------- Resource cells: click opens a CJHQ-voice "how to apply" popup ---------- */
const CONTENT_MANIFEST = [
  {cid:'accessibility-1', page:'page-accessibility', pageLabel:'Accessibility Statement', tag:'h1', label:'Accessibility Statement', default_en:'Accessibility Statement', default_fr:'Déclaration d\'accessibilité'},
  {cid:'accessibility-2', page:'page-accessibility', pageLabel:'Accessibility Statement', tag:'p', label:'The Jewish Hasidic Council of Quebec (CJHQ) is committed to providing ', default_en:'The Jewish Hasidic Council of Quebec (CJHQ) is committed to providing a website that is accessible to all visitors.', default_fr:'Le Conseil des Juifs Hassidiques du Québec (CJHQ) s\'engage à offrir un site Web accessible à tous les visiteurs.'},
  {cid:'accessibility-3', page:'page-accessibility', pageLabel:'Accessibility Statement', tag:'p', label:'We strive to make our website easy to navigate and compatible with com', default_en:'We strive to make our website easy to navigate and compatible with commonly used browsers, mobile devices, and assistive technologies.', default_fr:'Nous nous efforçons de rendre notre site Web facile à naviguer et compatible avec les navigateurs, les appareils mobiles et les technologies d\'assistance couramment utilisés.'},
  {cid:'accessibility-4', page:'page-accessibility', pageLabel:'Accessibility Statement', tag:'p', label:'As our website continues to evolve, we will make reasonable efforts to', default_en:'As our website continues to evolve, we will make reasonable efforts to improve accessibility and enhance the user experience for everyone.', default_fr:'Alors que notre site Web continue d\'évoluer, nous déploierons des efforts raisonnables pour améliorer l\'accessibilité et bonifier l\'expérience utilisateur pour tous.'},
  {cid:'accessibility-5', page:'page-accessibility', pageLabel:'Accessibility Statement', tag:'p', label:'If you experience difficulty accessing any part of this website or req', default_en:'If you experience difficulty accessing any part of this website or require information in an alternative format, we encourage you to contact CJHQ through our Contact page.', default_fr:'Si vous éprouvez de la difficulté à accéder à une partie de ce site Web ou si vous avez besoin d\'information dans un autre format, nous vous encourageons à communiquer avec le CJHQ par notre page Contact.'},
  {cid:'accessibility-6', page:'page-accessibility', pageLabel:'Accessibility Statement', tag:'p', label:'We value your feedback and will make every reasonable effort to improv', default_en:'We value your feedback and will make every reasonable effort to improve accessibility wherever possible.', default_fr:'Nous accordons de la valeur à vos commentaires et déploierons tous les efforts raisonnables pour améliorer l\'accessibilité dans la mesure du possible.'},
  {cid:'terms-1', page:'page-terms', pageLabel:'Terms of Use', tag:'h1', label:'Terms of Use', default_en:'Terms of Use', default_fr:'Conditions d\'utilisation'},
  {cid:'terms-2', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'By accessing and using this website, you agree to these Terms of Use.', default_en:'By accessing and using this website, you agree to these Terms of Use.', default_fr:'En accédant à ce site Web et en l\'utilisant, vous acceptez les présentes conditions d\'utilisation.'},
  {cid:'terms-3', page:'page-terms', pageLabel:'Terms of Use', tag:'h2', label:'Website Purpose', default_en:'Website Purpose', default_fr:'Objet du site Web'},
  {cid:'terms-4', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'The CJHQ website provides community information, official resource lin', default_en:'The CJHQ website provides community information, official resource links, and general information about the work of the Jewish Hasidic Council of Quebec.', default_fr:'Le site Web du CJHQ offre de l\'information communautaire, des liens vers des ressources officielles et de l\'information générale sur le travail du Conseil des Juifs Hassidiques du Québec.'},
  {cid:'terms-5', page:'page-terms', pageLabel:'Terms of Use', tag:'h2', label:'Information Accuracy', default_en:'Information Accuracy', default_fr:'Exactitude de l\'information'},
  {cid:'terms-6', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'CJHQ makes every reasonable effort to provide accurate and reliable in', default_en:'CJHQ makes every reasonable effort to provide accurate and reliable information.', default_fr:'Le CJHQ déploie tous les efforts raisonnables pour fournir une information exacte et fiable.'},
  {cid:'terms-7', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'However, government programs, regulations, policies, procedures, and r', default_en:'However, government programs, regulations, policies, procedures, and requirements may change without notice.', default_fr:'Toutefois, les programmes, règlements, politiques, procédures et exigences gouvernementaux peuvent changer sans préavis.'},
  {cid:'terms-8', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Visitors should always verify important information directly with the ', default_en:'Visitors should always verify important information directly with the appropriate government department or official source.', default_fr:'Les visiteurs devraient toujours vérifier les renseignements importants directement auprès du ministère gouvernemental concerné ou de la source officielle appropriée.'},
  {cid:'terms-9', page:'page-terms', pageLabel:'Terms of Use', tag:'h2', label:'External Links', default_en:'External Links', default_fr:'Liens externes'},
  {cid:'terms-10', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Many pages contain links to third-party websites, including government', default_en:'Many pages contain links to third-party websites, including government departments and public institutions.', default_fr:'Plusieurs pages contiennent des liens vers des sites tiers, y compris des ministères et des institutions publiques.'},
  {cid:'terms-11', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'CJHQ is not responsible for the content, availability, or accuracy of ', default_en:'CJHQ is not responsible for the content, availability, or accuracy of external websites.', default_fr:'Le CJHQ n\'est pas responsable du contenu, de la disponibilité ou de l\'exactitude des sites externes.'},
  {cid:'terms-12', page:'page-terms', pageLabel:'Terms of Use', tag:'h2', label:'No Professional Advice', default_en:'No Professional Advice', default_fr:'Absence de conseils professionnels'},
  {cid:'terms-13', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Information provided through this website is intended for general info', default_en:'Information provided through this website is intended for general informational purposes only.', default_fr:'L\'information fournie par ce site Web est destinée à des fins d\'information générale seulement.'},
  {cid:'terms-14', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Nothing contained on this website should be considered legal, financia', default_en:'Nothing contained on this website should be considered legal, financial, immigration, medical, or professional advice.', default_fr:'Rien sur ce site Web ne doit être considéré comme un conseil juridique, financier, en matière d\'immigration, médical ou professionnel.'},
  {cid:'terms-15', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Visitors should consult the appropriate qualified professional where n', default_en:'Visitors should consult the appropriate qualified professional where necessary.', default_fr:'Les visiteurs devraient consulter le professionnel qualifié approprié au besoin.'},
  {cid:'terms-16', page:'page-terms', pageLabel:'Terms of Use', tag:'h2', label:'Intellectual Property', default_en:'Intellectual Property', default_fr:'Propriété intellectuelle'},
  {cid:'terms-17', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Unless otherwise indicated, the content of this website is the propert', default_en:'Unless otherwise indicated, the content of this website is the property of the Jewish Hasidic Council of Quebec.', default_fr:'Sauf indication contraire, le contenu de ce site Web est la propriété du Conseil des Juifs Hassidiques du Québec.'},
  {cid:'terms-18', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Content may not be reproduced without prior written permission, except', default_en:'Content may not be reproduced without prior written permission, except where permitted by law.', default_fr:'Le contenu ne peut être reproduit sans autorisation écrite préalable, sauf dans les cas permis par la loi.'},
  {cid:'terms-19', page:'page-terms', pageLabel:'Terms of Use', tag:'h2', label:'Changes', default_en:'Changes', default_fr:'Modifications'},
  {cid:'terms-20', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'CJHQ may update these Terms of Use from time to time.', default_en:'CJHQ may update these Terms of Use from time to time.', default_fr:'Le CJHQ peut mettre à jour les présentes conditions d\'utilisation périodiquement.'},
  {cid:'terms-21', page:'page-terms', pageLabel:'Terms of Use', tag:'p', label:'Continued use of this website constitutes acceptance of the updated Te', default_en:'Continued use of this website constitutes acceptance of the updated Terms.', default_fr:'L\'utilisation continue de ce site Web constitue une acceptation des conditions mises à jour.'},
  {cid:'privacy-1', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h1', label:'Privacy Policy', default_en:'Privacy Policy', default_fr:'Politique de confidentialité'},
  {cid:'privacy-2', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Effective Date: September 24, 2026', default_en:'<strong>Effective Date:</strong> September 24, 2026', default_fr:'<strong>Date d\'entrée en vigueur :</strong> 24 septembre 2026'},
  {cid:'privacy-3', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'The Jewish Hasidic Council of Quebec (CJHQ) is committed to protecting', default_en:'The Jewish Hasidic Council of Quebec (CJHQ) is committed to protecting the privacy of all individuals who visit our website or communicate with us.', default_fr:'Le Conseil des Juifs Hassidiques du Québec (CJHQ) s\'engage à protéger la vie privée de toutes les personnes qui visitent notre site Web ou communiquent avec nous.'},
  {cid:'privacy-4', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'This Privacy Policy explains what information may be collected through', default_en:'This Privacy Policy explains what information may be collected through this website, how it is used, and how it is protected.', default_fr:'La présente politique de confidentialité explique quels renseignements peuvent être recueillis par ce site Web, comment ils sont utilisés et comment ils sont protégés.'},
  {cid:'privacy-5', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Information We Collect', default_en:'Information We Collect', default_fr:'Renseignements que nous recueillons'},
  {cid:'privacy-6', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Depending on how you interact with our website, CJHQ may collect infor', default_en:'Depending on how you interact with our website, CJHQ may collect information that you voluntarily provide, including:', default_fr:'Selon la façon dont vous interagissez avec notre site Web, le CJHQ peut recueillir des renseignements que vous fournissez volontairement, notamment :'},
  {cid:'privacy-7', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'How We Use Your Information', default_en:'How We Use Your Information', default_fr:'Utilisation de vos renseignements'},
  {cid:'privacy-8', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Information submitted through this website may be used to:', default_en:'Information submitted through this website may be used to:', default_fr:'Les renseignements soumis par ce site Web peuvent être utilisés pour :'},
  {cid:'privacy-9', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'CJHQ does not sell or rent personal information.', default_en:'CJHQ does not sell or rent personal information.', default_fr:'Le CJHQ ne vend ni ne loue les renseignements personnels.'},
  {cid:'privacy-10', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Email Communications', default_en:'Email Communications', default_fr:'Communications par courriel'},
  {cid:'privacy-11', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Individuals who subscribe to Community Information Updates may receive', default_en:'Individuals who subscribe to Community Information Updates may receive important community information, announcements, travel updates, government information, and other relevant communications.', default_fr:'Les personnes abonnées à l\'infolettre communautaire peuvent recevoir de l\'information communautaire importante, des annonces, des mises à jour sur les voyages, de l\'information gouvernementale et d\'autres communications pertinentes.'},
  {cid:'privacy-12', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Subscribers may unsubscribe at any time using the unsubscribe link inc', default_en:'Subscribers may unsubscribe at any time using the unsubscribe link included in each email.', default_fr:'Les abonnés peuvent se désabonner en tout temps à l\'aide du lien de désabonnement inclus dans chaque courriel.'},
  {cid:'privacy-13', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Cookies', default_en:'Cookies', default_fr:'Témoins (cookies)'},
  {cid:'privacy-14', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'This website uses cookies and similar technologies for two purposes', default_en:'This website uses cookies and similar technologies for two purposes: to remember your language choice, and for the website analytics described below. It does not use advertising cookies.', default_fr:"Ce site Web utilise des témoins et des technologies similaires à deux fins : retenir votre choix de langue et produire les statistiques de fréquentation décrites ci-dessous. Il n'utilise aucun témoin publicitaire."},
  {cid:'privacy-15', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Visitors may adjust their browser settings to manage or disable cookie', default_en:'Visitors may adjust their browser settings to manage or disable cookies.', default_fr:'Les visiteurs peuvent ajuster les paramètres de leur navigateur afin de gérer ou de désactiver les témoins.'},
  {cid:'privacy-analytics-1', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Website Analytics', default_en:'Website Analytics', default_fr:'Statistiques de fréquentation du site Web'},
  {cid:'privacy-analytics-2', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'This website uses Google Analytics, a web analytics service provided b', default_en:'This website uses Google Analytics, a web analytics service provided by Google, to understand how visitors use the site. It records information such as the pages viewed, the approximate region a visit comes from, the type of device and browser used, and how visitors arrived at the site.', default_fr:"Ce site Web utilise Google Analytics, un service d'analyse Web fourni par Google, afin de comprendre comment les visiteurs utilisent le site. Ce service enregistre des renseignements tels que les pages consultées, la région approximative d'où provient la visite, le type d'appareil et de navigateur utilisé, ainsi que la façon dont les visiteurs sont arrivés sur le site."},
  {cid:'privacy-analytics-3', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'CJHQ uses this information only to improve the website and to understan', default_en:'CJHQ uses this information only to improve the website and to understand which community resources are most needed. We do not use it to identify individual visitors, and we do not combine it with any information you send us through the contact form or the newsletter.', default_fr:"Le CJHQ utilise ces renseignements uniquement pour améliorer le site Web et pour comprendre quelles ressources communautaires sont les plus utiles. Nous ne les utilisons pas pour identifier des visiteurs en particulier, et nous ne les combinons pas avec les renseignements que vous nous transmettez par le formulaire de contact ou l'infolettre."},
  {cid:'privacy-analytics-4', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Google Analytics is configured so that advertising features and cross-s', default_en:"Google Analytics is configured so that advertising features and cross-site profiling are turned off. Information is processed by Google and may be stored outside Quebec and Canada. Visitors who prefer not to be included can block analytics through their browser settings or by installing Google's opt-out browser add-on.", default_fr:"Google Analytics est configuré de façon à désactiver les fonctions publicitaires et le profilage entre sites. Les renseignements sont traités par Google et peuvent être conservés à l'extérieur du Québec et du Canada. Les visiteurs qui préfèrent ne pas y être inclus peuvent bloquer les statistiques au moyen des paramètres de leur navigateur ou en installant le module complémentaire de désactivation offert par Google."},
  {cid:'privacy-analytics-5', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'This website also uses Microsoft Clarity, a service provided by Microsof', default_en:"This website also uses Microsoft Clarity, a service provided by Microsoft, to understand how visitors use each page: where they click, how far they scroll and how long they stay. Clarity produces heatmaps and replays of visits that help us find parts of the site that are hard to use. Anything typed into forms is hidden and never recorded. Clarity uses cookies, and its information is processed by Microsoft and may be stored outside Quebec and Canada. Visitors who prefer not to be included can block it through their browser settings.", default_fr:"Ce site Web utilise également Microsoft Clarity, un service fourni par Microsoft, afin de comprendre comment les visiteurs utilisent chaque page : où ils cliquent, jusqu'où ils font défiler la page et combien de temps ils y restent. Clarity produit des cartes de chaleur et des reprises de visites qui nous aident à repérer les parties du site difficiles à utiliser. Tout ce qui est saisi dans les formulaires est masqué et n'est jamais enregistré. Clarity utilise des témoins; ses renseignements sont traités par Microsoft et peuvent être conservés à l'extérieur du Québec et du Canada. Les visiteurs qui préfèrent ne pas y être inclus peuvent le bloquer au moyen des paramètres de leur navigateur."},
  {cid:'privacy-16', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Third-Party Links', default_en:'Third-Party Links', default_fr:'Liens vers des sites tiers'},
  {cid:'privacy-17', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Our website contains links to official government websites and other t', default_en:'Our website contains links to official government websites and other trusted resources.', default_fr:'Notre site Web contient des liens vers des sites gouvernementaux officiels et d\'autres ressources fiables.'},
  {cid:'privacy-18', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'CJHQ is not responsible for the privacy practices or content of extern', default_en:'CJHQ is not responsible for the privacy practices or content of external websites.', default_fr:'Le CJHQ n\'est pas responsable des pratiques de confidentialité ou du contenu des sites externes.'},
  {cid:'privacy-19', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Visitors should review the privacy policies of those websites separate', default_en:'Visitors should review the privacy policies of those websites separately.', default_fr:'Les visiteurs sont invités à consulter séparément les politiques de confidentialité de ces sites.'},
  {cid:'privacy-20', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Data Security', default_en:'Data Security', default_fr:'Sécurité des données'},
  {cid:'privacy-21', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'CJHQ takes reasonable measures to protect personal information submitt', default_en:'CJHQ takes reasonable measures to protect personal information submitted through this website.', default_fr:'Le CJHQ prend des mesures raisonnables pour protéger les renseignements personnels soumis par ce site Web.'},
  {cid:'privacy-22', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'While no method of electronic transmission is completely secure, appro', default_en:'While no method of electronic transmission is completely secure, appropriate safeguards are used to help protect information from unauthorized access.', default_fr:'Bien qu\'aucune méthode de transmission électronique ne soit entièrement sécurisée, des mesures de protection appropriées sont utilisées pour aider à protéger l\'information contre tout accès non autorisé.'},
  {cid:'privacy-23', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Changes to this Policy', default_en:'Changes to this Policy', default_fr:'Modifications de la présente politique'},
  {cid:'privacy-24', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'This Privacy Policy may be updated from time to time to reflect change', default_en:'This Privacy Policy may be updated from time to time to reflect changes in legal requirements or website functionality.', default_fr:'La présente politique de confidentialité peut être mise à jour périodiquement afin de refléter les changements aux exigences légales ou aux fonctionnalités du site Web.'},
  {cid:'privacy-25', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'The most current version will always be published on this website.', default_en:'The most current version will always be published on this website.', default_fr:'La version la plus récente sera toujours publiée sur ce site Web.'},
  {cid:'privacy-26', page:'page-privacy', pageLabel:'Privacy Policy', tag:'h2', label:'Contact', default_en:'Contact', default_fr:'Contact'},
  {cid:'privacy-27', page:'page-privacy', pageLabel:'Privacy Policy', tag:'p', label:'Questions regarding this Privacy Policy may be submitted through the C', default_en:'Questions regarding this Privacy Policy may be submitted through the Contact page.', default_fr:'Les questions relatives à la présente politique de confidentialité peuvent être soumises par la page Contact.'},
  {cid:'contact-1', page:'page-contact', pageLabel:'Contact CJHQ', tag:'h1', label:'We\'re Here to Help', default_en:'We\'re Here to Help', default_fr:'Nous sommes là pour vous aider'},
  {cid:'contact-2', page:'page-contact', pageLabel:'Contact CJHQ', tag:'p', label:'Whether you are a community member, government official, public instit', default_en:'Whether you are a community member, government official, public institution, journalist, community organization, or have a general question, the Jewish Hasidic Council of Quebec (CJHQ) welcomes your inquiry.', default_fr:'Que vous soyez un membre de la communauté, un représentant gouvernemental, une institution publique, un journaliste, un organisme communautaire ou que vous ayez une question générale, le Conseil des Juifs Hassidiques du Québec (CJHQ) accueille votre demande.'},
  {cid:'contact-3', page:'page-contact', pageLabel:'Contact CJHQ', tag:'p', label:'Our goal is to ensure that every request reaches the appropriate membe', default_en:'Our goal is to ensure that every request reaches the appropriate member of our team so that it can be handled efficiently and professionally.', default_fr:'Notre objectif est de veiller à ce que chaque demande soit acheminée au bon membre de notre équipe afin qu\'elle soit traitée de façon efficace et professionnelle.'},
  {cid:'contact-4', page:'page-contact', pageLabel:'Contact CJHQ', tag:'h3', label:'How can we assist you?', default_en:'How can we assist you?', default_fr:'Comment pouvons-nous vous aider?'},
  {cid:'contact-5', page:'page-contact', pageLabel:'Contact CJHQ', tag:'p', label:'Please begin by selecting the option that best describes you. The form', default_en:'Please begin by selecting the option that best describes you. The form will automatically display the questions most relevant to your inquiry.', default_fr:'Veuillez d\'abord sélectionner l\'option qui vous décrit le mieux. Le formulaire affichera automatiquement les questions les plus pertinentes pour votre demande.'},
  {cid:'contact-6', page:'page-contact', pageLabel:'Contact CJHQ', tag:'p', label:'I am a:', default_en:'I am a:', default_fr:'Je suis :'},
  {cid:'contact-22', page:'page-contact', pageLabel:'Contact CJHQ', tag:'h2', label:'Thank You', default_en:'Thank You', default_fr:'Merci'},
  {cid:'contact-23', page:'page-contact', pageLabel:'Contact CJHQ', tag:'p', label:'Thank you for contacting the Jewish Hasidic Council of Quebec.', default_en:'Thank you for contacting the Jewish Hasidic Council of Quebec.', default_fr:'Merci d\'avoir communiqué avec le Conseil des Juifs Hassidiques du Québec.'},
  {cid:'contact-24', page:'page-contact', pageLabel:'Contact CJHQ', tag:'p', label:'We appreciate the opportunity to assist you and look forward to workin', default_en:'We appreciate the opportunity to assist you and look forward to working with you.', default_fr:'Nous apprécions l\'occasion de vous venir en aide et avons hâte de travailler avec vous.'},
  {cid:'stay-informed-1', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'h1', label:'Stay Connected with CJHQ', default_en:'Stay Connected with CJHQ', default_fr:'Restez branchés avec le CJHQ'},
  {cid:'stay-informed-2', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Timely, accurate communication is an important part of serving Quebec\'', default_en:'Timely, accurate communication is an important part of serving Quebec\'s Hasidic Jewish communities.', default_fr:'Une communication rapide et exacte est un élément important du service aux communautés juives hassidiques du Québec.'},
  {cid:'stay-informed-3', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'The Jewish Hasidic Council of Quebec (CJHQ) shares important informati', default_en:'The Jewish Hasidic Council of Quebec (CJHQ) shares important information through two official communication channels, each serving a different purpose.', default_fr:'Le Conseil des Juifs Hassidiques du Québec (CJHQ) diffuse de l\'information importante par deux canaux de communication officiels, chacun ayant un objectif distinct.'},
  {cid:'stay-informed-4', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Community members receive direct Community Information Updates by emai', default_en:'Community members receive direct Community Information Updates by email, while official statements and public announcements are shared through CJHQ\'s social media channels.', default_fr:'Les membres de la communauté reçoivent directement les mises à jour d\'information communautaire par courriel, tandis que les déclarations et annonces publiques officielles sont diffusées par les réseaux sociaux du CJHQ.'},
  {cid:'stay-informed-5', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Whether the information relates to government services, travel, public', default_en:'Whether the information relates to government services, travel, public safety, holidays, or community matters, CJHQ is committed to providing reliable and timely communication.', default_fr:'Qu\'il s\'agisse de services gouvernementaux, de voyages, de sécurité publique, de fêtes ou d\'enjeux communautaires, le CJHQ s\'engage à offrir une communication fiable et rapide.'},
  {cid:'stay-informed-6', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'h2', label:'Important Information for the Community', default_en:'Important Information for the Community', default_fr:'Information importante pour la communauté'},
  {cid:'stay-informed-7', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Throughout the year, CJHQ distributes Community Information Updates by', default_en:'Throughout the year, CJHQ distributes Community Information Updates by email to subscribers within Quebec\'s Hasidic Jewish communities.', default_fr:'Tout au long de l\'année, le CJHQ diffuse des mises à jour d\'information communautaire par courriel aux abonnés des communautés juives hassidiques du Québec.'},
  {cid:'stay-informed-8', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'These updates provide practical information that helps community membe', default_en:'These updates provide practical information that helps community members stay informed about matters affecting everyday life. Topics may include:', default_fr:'Ces mises à jour offrent de l\'information pratique qui aide les membres de la communauté à rester informés des enjeux touchant la vie quotidienne. Les sujets peuvent inclure :'},
  {cid:'stay-informed-9', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Many of these communications are intended specifically for community m', default_en:'Many of these communications are intended specifically for community members and are therefore distributed by email rather than published publicly.', default_fr:'Plusieurs de ces communications sont destinées spécifiquement aux membres de la communauté et sont donc diffusées par courriel plutôt que publiées publiquement.'},
  {cid:'stay-informed-10', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'If you are part of Quebec\'s Hasidic Jewish community, we encourage you', default_en:'If you are part of Quebec\'s Hasidic Jewish community, we encourage you to subscribe to ensure you receive important updates as they are issued.', default_fr:'Si vous faites partie de la communauté juive hassidique du Québec, nous vous encourageons à vous abonner afin de recevoir les mises à jour importantes dès leur diffusion.'},
  {cid:'stay-informed-11', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'h2', label:'Follow CJHQ', default_en:'Follow CJHQ', default_fr:'Suivre le CJHQ'},
  {cid:'stay-informed-12', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Official statements, public announcements, organizational updates, and', default_en:'Official statements, public announcements, organizational updates, and other information intended for the broader public are shared through CJHQ\'s official social media channels.', default_fr:'Les déclarations officielles, les annonces publiques, les mises à jour organisationnelles et d\'autres renseignements destinés au grand public sont diffusés par les réseaux sociaux officiels du CJHQ.'},
  {cid:'stay-informed-13', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Follow CJHQ for:', default_en:'Follow CJHQ for:', default_fr:'Suivez le CJHQ pour :'},
  {cid:'stay-informed-14', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'h3', label:'Facebook Feed', default_en:'Facebook Feed', default_fr:'Fil Facebook'},
  {cid:'stay-informed-16', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'h2', label:'Why Two Communication Channels?', default_en:'Why Two Communication Channels?', default_fr:'Pourquoi deux canaux de communication?'},
  {cid:'stay-informed-17', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'CJHQ communicates through two complementary channels because different', default_en:'CJHQ communicates through two complementary channels because different information serves different audiences.', default_fr:'Le CJHQ communique par deux canaux complémentaires, car différents types d\'information s\'adressent à différents publics.'},
  {cid:'stay-informed-18', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Delivered directly by email to subscribers within the community.', default_en:'Delivered directly by email to subscribers within the community.', default_fr:'Livrées directement par courriel aux abonnés de la communauté.'},
  {cid:'stay-informed-19', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'These updates often contain practical information relating to holidays', default_en:'These updates often contain practical information relating to holidays, travel, public services, government programs, municipal notices, and other matters affecting daily community life. Many of these communications are not intended for a general public audience and are therefore distributed exclusively by email.', default_fr:'Ces mises à jour contiennent souvent de l\'information pratique relative aux fêtes, aux voyages, aux services publics, aux programmes gouvernementaux, aux avis municipaux et à d\'autres enjeux touchant la vie communautaire quotidienne. Plusieurs de ces communications ne sont pas destinées au grand public et sont donc diffusées exclusivement par courriel.'},
  {cid:'stay-informed-20', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Shared publicly through CJHQ\'s official social media channels.', default_en:'Shared publicly through CJHQ\'s official social media channels.', default_fr:'Diffusées publiquement par les réseaux sociaux officiels du CJHQ.'},
  {cid:'stay-informed-21', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'These communications include official statements, public announcements', default_en:'These communications include official statements, public announcements, organizational updates, and information intended for governments, public institutions, media organizations, community partners, and the general public.', default_fr:'Ces communications comprennent des déclarations officielles, des annonces publiques, des mises à jour organisationnelles et de l\'information destinée aux gouvernements, aux institutions publiques, aux médias, aux partenaires communautaires et au grand public.'},
  {cid:'stay-informed-22', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Together, these two communication channels ensure that important infor', default_en:'Together, these two communication channels ensure that important information reaches the appropriate audience in the most effective manner.', default_fr:'Ensemble, ces deux canaux de communication garantissent que l\'information importante rejoint le bon public de la façon la plus efficace.'},
  {cid:'stay-informed-27', page:'page-stay-informed', pageLabel:'Stay Informed', tag:'p', label:'Reliable information. Trusted communication. Stronger communities.', default_en:'Reliable information. Trusted communication. Stronger communities.', default_fr:'Une information fiable. Une communication de confiance. Des communautés plus fortes.'},
  {cid:'resources-1', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'h1', label:'Trusted Government Resources — All in One Place', default_en:'Trusted Government Resources — All in One Place', default_fr:'Des ressources gouvernementales fiables — regroupées en un seul endroit'},
  {cid:'resources-2', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'p', label:'The CJHQ Community Resource Centre brings together the government serv', default_en:'The CJHQ Community Resource Centre brings together the government services, applications, and official resources most frequently used by Quebec\'s Hasidic Jewish communities.', default_fr:'Le Centre de ressources communautaires du CJHQ réunit les services gouvernementaux, les demandes et les ressources officielles les plus utilisés par les communautés juives hassidiques du Québec.'},
  {cid:'resources-3', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'p', label:'Our goal is simple: save you time by directing you straight to the inf', default_en:'Our goal is simple: save you time by directing you straight to the information or application you need. Whenever possible, every link on this page leads directly to the official government application, online service, or form—not simply a government homepage.', default_fr:'Notre objectif est simple : vous faire gagner du temps en vous dirigeant directement vers l\'information ou la demande dont vous avez besoin. Dans la mesure du possible, chaque lien de cette page mène directement à la demande, au service en ligne ou au formulaire gouvernemental officiel — et non simplement à une page d\'accueil gouvernementale.'},
  {cid:'resources-4', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'h2', label:'Browse by Category', default_en:'Browse by Category', default_fr:'Parcourir par catégorie'},
  {cid:'resources-6', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'h2', label:'Before You Continue', default_en:'Before You Continue', default_fr:'Avant de continuer'},
  {cid:'resources-7', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'p', label:'CJHQ is not an insurance broker or provider. This link points to a thi', default_en:'CJHQ is not an insurance broker or provider. This link points to a third-party provider the community has found useful. Coverage, pricing, and terms are set entirely by that provider — please review the policy carefully and confirm it meets your needs before purchasing.', default_fr:'Le CJHQ n\'est pas un courtier ni un fournisseur d\'assurance. Ce lien dirige vers un fournisseur tiers que la communauté a trouvé utile. La couverture, les prix et les conditions sont établis entièrement par ce fournisseur — veuillez examiner attentivement la police et confirmer qu\'elle répond à vos besoins avant l\'achat.'},
  {cid:'resources-8', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'h2', label:'Can\'t Find What You\'re Looking For?', default_en:'Can\'t Find What You\'re Looking For?', default_fr:'Vous ne trouvez pas ce que vous cherchez?'},
  {cid:'resources-9', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'p', label:'If you cannot find the service or information you\'re looking for, CJHQ', default_en:'If you cannot find the service or information you\'re looking for, CJHQ is here to help.', default_fr:'Si vous ne trouvez pas le service ou l\'information que vous cherchez, le CJHQ est là pour vous aider.'},
  {cid:'resources-10', page:'page-resources', pageLabel:'Community Resource Centre (intro only)', tag:'p', label:'Use our contact form and we\'ll do our best to direct you to the approp', default_en:'Use our contact form and we\'ll do our best to direct you to the appropriate government department, application, or official resource.', default_fr:'Utilisez notre formulaire de contact et nous ferons de notre mieux pour vous diriger vers le bon ministère, la bonne demande ou la bonne ressource officielle.'},
  {cid:'about-1', page:'page-about', pageLabel:'About CJHQ', tag:'h1', label:'About the Jewish Hasidic Council of Quebec', default_en:'About the Jewish Hasidic Council of Quebec', default_fr:'À propos du Conseil des Juifs Hassidiques du Québec'},
  {cid:'about-2', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'The Jewish Hasidic Council of Quebec (CJHQ), known in French as Le Co', default_en:'The Jewish Hasidic Council of Quebec (CJHQ), known in French as Le Conseil des Juifs Hassidiques du Québec, is a community organization dedicated to serving, supporting, and representing Quebec\'s Hasidic Jewish communities.', default_fr:'Le Conseil des Juifs Hassidiques du Québec (CJHQ) est un organisme communautaire qui se consacre à servir, soutenir et représenter les communautés juives hassidiques du Québec.'},
  {cid:'about-3', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'CJHQ acts as a central point of contact for individuals, families, in', default_en:'CJHQ acts as a central point of contact for individuals, families, institutions, and community organizations seeking practical assistance, services, representation, advocacy, guidance, or reliable information. At the heart of our work is a commitment to helping community members address the issues affecting their daily lives and ensuring that the community\'s needs and concerns are properly represented.', default_fr:'Le CJHQ agit comme point de contact central pour les personnes, les familles, les institutions et les organismes communautaires à la recherche d\'assistance pratique, de services, de représentation, de défense des intérêts, de conseils ou d\'information fiable. Au cœur de notre travail se trouve un engagement à aider les membres de la communauté à résoudre les enjeux touchant leur vie quotidienne et à veiller à ce que les besoins et les préoccupations de la communauté soient adéquatement représentés.'},
  {cid:'about-4', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'We work closely with governments, municipal authorities, law enforce', default_en:'We work closely with governments, municipal authorities, law enforcement agencies, public institutions, service providers, and community organizations. Through these relationships, CJHQ helps address concerns, improve access to services, strengthen public safety, and develop practical solutions that respect the community\'s religious practices and way of life.', default_fr:'Nous travaillons en étroite collaboration avec les gouvernements, les autorités municipales, les services policiers, les institutions publiques, les fournisseurs de services et les organismes communautaires. Grâce à ces relations, le CJHQ contribue à résoudre des préoccupations, à améliorer l\'accès aux services, à renforcer la sécurité publique et à élaborer des solutions pratiques qui respectent les pratiques religieuses et le mode de vie de la communauté.'},
  {cid:'about-5', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'CJHQ also works to promote greater understanding of Hasidic Jewish li', default_en:'CJHQ also works to promote greater understanding of Hasidic Jewish life and to strengthen communication between the Hasidic community, public authorities, institutions, and the broader public.', default_fr:'Le CJHQ travaille également à favoriser une meilleure compréhension de la vie juive hassidique et à renforcer la communication entre la communauté hassidique, les autorités publiques, les institutions et le grand public.'},
  {cid:'about-7', page:'page-about', pageLabel:'About CJHQ', tag:'h2', label:'Our Mission', default_en:'Our Mission', default_fr:'Notre mission'},
  {cid:'about-8', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'Our mission is to serve and strengthen Quebec\'s Hasidic Jewish communi', default_en:'Our mission is to serve and strengthen Quebec\'s Hasidic Jewish communities through practical assistance, effective advocacy, trusted representation, and strong relationships with governments, public institutions, service providers, and community partners.', default_fr:'Notre mission est de servir et de renforcer les communautés juives hassidiques du Québec par une assistance pratique, une défense efficace des intérêts, une représentation fiable et des relations solides avec les gouvernements, les institutions publiques, les fournisseurs de services et les partenaires communautaires.'},
  {cid:'about-8b', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'We are committed to promoting the safety, dignity, well-being, and fu', default_en:'We are committed to promoting the safety, dignity, well-being, and full participation of Hasidic Jewish residents throughout Quebec.', default_fr:'Nous nous engageons à promouvoir la sécurité, la dignité, le bien-être et la pleine participation des résidents juifs hassidiques partout au Québec.'},
  {cid:'about-8c', page:'page-about', pageLabel:'About CJHQ', tag:'h2', label:'How We Serve the Community', default_en:'How We Serve the Community', default_fr:'Comment nous servons la communauté'},
  {cid:'about-8d', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'CJHQ assists individuals, families, institutions, and community organ', default_en:'CJHQ assists individuals, families, institutions, and community organizations with matters involving government and municipal services, public safety, religious accommodations, travel and border issues, community events, and other concerns affecting daily life.', default_fr:'Le CJHQ aide les personnes, les familles, les institutions et les organismes communautaires pour des enjeux touchant les services gouvernementaux et municipaux, la sécurité publique, les accommodements religieux, les questions de voyage et de frontière, les événements communautaires et d\'autres préoccupations touchant la vie quotidienne.'},
  {cid:'about-8e', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'We represent the needs of Quebec\'s Hasidic Jewish communities before ', default_en:'We represent the needs of Quebec\'s Hasidic Jewish communities before governments, law enforcement agencies, public institutions, service providers, and other decision-makers. We also provide timely guidance and reliable information when changes, emergencies, or public developments affect the community.', default_fr:'Nous représentons les besoins des communautés juives hassidiques du Québec auprès des gouvernements, des services policiers, des institutions publiques, des fournisseurs de services et d\'autres décideurs. Nous fournissons également des conseils rapides et une information fiable lorsque des changements, des urgences ou des événements publics touchent la communauté.'},
  {cid:'about-9', page:'page-about', pageLabel:'About CJHQ', tag:'h2', label:'Constructive Engagement. Practical Solutions.', default_en:'Constructive Engagement. Practical Solutions.', default_fr:'Engagement constructif. Solutions pratiques.'},
  {cid:'about-10', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'CJHQ believes that effective advocacy combines strong relationships wi', default_en:'CJHQ believes that effective advocacy combines strong relationships with a clear and responsible community voice.', default_fr:'Le CJHQ croit qu\'une représentation efficace combine des relations solides avec une voix communautaire claire et responsable.'},
  {cid:'about-11', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'Whenever possible, we seek practical solutions through respectful dial', default_en:'Whenever possible, we seek practical solutions through respectful dialogue, direct engagement, and professional collaboration. When circumstances require public advocacy, CJHQ speaks clearly and firmly on behalf of the community.', default_fr:'Dans la mesure du possible, nous recherchons des solutions pratiques par le dialogue respectueux, l\'engagement direct et la collaboration professionnelle. Lorsque les circonstances exigent une représentation publique, le CJHQ s\'exprime clairement et fermement au nom de la communauté.'},
  {cid:'about-12', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'As a non-partisan organization, CJHQ works constructively with elected', default_en:'As a non-partisan organization, CJHQ works constructively with elected officials and governments of every political affiliation. Our commitment is to the community and to achieving meaningful, lasting results.', default_fr:'En tant qu\'organisme non partisan, le CJHQ travaille de façon constructive avec les élus et les gouvernements de toutes allégeances politiques. Notre engagement est envers la communauté et l\'atteinte de résultats significatifs et durables.'},
  {cid:'about-13', page:'page-about', pageLabel:'About CJHQ', tag:'h2', label:'The Principles That Guide Our Work', default_en:'The Principles That Guide Our Work', default_fr:'Les principes qui guident notre travail'},
  {cid:'about-17', page:'page-about', pageLabel:'About CJHQ', tag:'h2', label:'Connect With CJHQ', default_en:'Connect With CJHQ', default_fr:'Communiquer avec le CJHQ'},
  {cid:'about-18', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'Whether you are a community member, government representative, public ', default_en:'Whether you are a community member, government representative, public institution, journalist, community organization, or member of the public, we welcome the opportunity to connect with you.', default_fr:'Que vous soyez un membre de la communauté, un représentant gouvernemental, une institution publique, un journaliste, un organisme communautaire ou un membre du public, nous serions heureux d\'entrer en contact avec vous.'},
  {cid:'about-19', page:'page-about', pageLabel:'About CJHQ', tag:'p', label:'If you have a question, require assistance, or would like to learn mor', default_en:'If you have a question, require assistance, or would like to learn more about our work, our team is here to help.', default_fr:'Si vous avez une question, avez besoin d\'aide ou souhaitez en apprendre davantage sur notre travail, notre équipe est là pour vous aider.'},
  {cid:'home-1', page:'page-home', pageLabel:'Home', tag:'h1', label:'Serving Quebec\'s Hasidic Jewish Communities', default_en:'Serving Quebec\'s Hasidic Jewish Communities', default_fr:'Servir les communautés juives hassidiques du Québec'},
  {cid:'home-2', page:'page-home', pageLabel:'Home', tag:'p', label:'The Jewish Hasidic Council of Quebec (CJHQ) is a central point of cont', default_en:'The Jewish Hasidic Council of Quebec (CJHQ) is a central point of contact for Quebec\'s Hasidic Jewish communities, providing community services, practical assistance, trusted information, representation, and advocacy.', default_fr:'Le Conseil des Juifs Hassidiques du Québec (CJHQ) est un point de contact central pour les communautés juives hassidiques du Québec, offrant des services communautaires, une assistance pratique, une information fiable, la représentation et la défense de leurs intérêts.'},
  {cid:'home-3', page:'page-home', pageLabel:'Home', tag:'p', label:'CJHQ works with government, public institutions, law enforcement, serv', default_en:'CJHQ works with government, public institutions, law enforcement, service providers, and community organizations to address community needs, improve access to services, strengthen public safety, and ensure that the concerns of Hasidic residents are understood and effectively represented.', default_fr:'Le CJHQ travaille avec les gouvernements, les institutions publiques, les services policiers, les fournisseurs de services et les organismes communautaires afin de répondre aux besoins de la communauté, d\'améliorer l\'accès aux services, de renforcer la sécurité publique et de veiller à ce que les préoccupations des résidents hassidiques soient comprises et efficacement représentées.'},
  {cid:'home-5', page:'page-home', pageLabel:'Home', tag:'h2', label:'Working Alongside Community Organizations', default_en:'Working Alongside Community Organizations', default_fr:'En collaboration avec les organismes communautaires'},
  {cid:'home-6', page:'page-home', pageLabel:'Home', tag:'p', label:'CJHQ works alongside a wide network of community organizations dedicat', default_en:'CJHQ works alongside a wide network of community organizations dedicated to serving Quebec\'s Hasidic Jewish communities.', default_fr:'Le CJHQ travaille aux côtés d\'un vaste réseau d\'organismes communautaires voués au service des communautés juives hassidiques du Québec.'},
];
const RESOURCE_BY_SLUG = {};
let REVIEWED_OVERRIDES = {};
let RESOURCE_OVERRIDES_CACHE = {};

/* ---------- Untrusted-value helpers ----------
   Resource overrides, pending notices, custom pages and partner records all
   come from Firestore. Anything Firestore supplies is treated as untrusted:
   escaped before it reaches innerHTML, and scheme-checked before it is used
   as a navigation target.

   Allowed: http, https, mailto, tel. Rejected: javascript: and data: execute
   in the page or the opened tab, file: can probe the local disk. mailto: and
   tel: cannot execute anything and are genuinely in use — the Outremont
   visitor-parking resource links to a City of Montreal mailto: address with a
   prefilled subject and body. All 143 real URLs pass unchanged. */
// Admin-authored HTML from Firestore is rendered with innerHTML in three
// places: custom pages, the site banner and the site popup. DOMPurify does that
// safely. If DOMPurify is not available - blocked CDN, ad blocker, offline, an
// outage - the previous fallback stripped <script> tags with a regex and
// nothing else, so <img src=x onerror=...> went straight through. A sanitiser
// that only appears to work is worse than none.
//
// This fails closed instead: with no DOMPurify the content is escaped and
// renders as visible text. Formatting is lost for that visitor, nothing
// executes, and no content silently disappears.
function cjhqSanitizeHtml(v){
  const raw = (v == null) ? '' : String(v);
  if(typeof DOMPurify !== 'undefined' && DOMPurify && typeof DOMPurify.sanitize === 'function'){
    return DOMPurify.sanitize(raw);
  }
  console.warn('[CJHQ] DOMPurify unavailable - rendering admin HTML as escaped text.');
  return cjhqEscapeHtml(raw);
}

function cjhqEscapeHtml(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function cjhqSafeUrl(u){
  if(!u) return null;
  try{
    const parsed = new URL(String(u), location.href);
    const ok = ['http:', 'https:', 'mailto:', 'tel:'];
    return ok.includes(parsed.protocol) ? parsed.href : null;
  }catch(err){ return null; }
}
let HIDDEN_PAGES_CACHE = {};
let CUSTOM_PAGES_CACHE = {};
// Only the pages a visitor may see today. Everything public reads this one;
// CUSTOM_PAGES_CACHE keeps every page because the admin has to manage the ones
// that are expired or not yet started.
let CUSTOM_PAGES_PUBLIC = {};

/* ---------- Temporary-page lifecycle ----------
   Start and End govern the whole public life of a page, not just whether it is
   promoted on the homepage: outside the window the page is not routable, not in
   the nav, and not reachable by its own URL.

   Dates are plain YYYY-MM-DD and are compared as strings, which sorts correctly
   for that format and avoids every timezone trap that Date parsing brings. The
   day is Montreal's, not the visitor's - a page that ends October 5 ends at the
   close of October 5 here, whether the reader is in Montreal or Melbourne. */
function cjhqMontrealToday(){
  try{
    return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Toronto',
      year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
  }catch(e){
    return new Date().toISOString().slice(0,10);   // last resort, UTC
  }
}
// Test seam. Nothing in the product sets this; the date suite does, so the
// boundary days can be checked without waiting for them to arrive.
function cjhqToday(){ return window.__cjhqTodayOverride || cjhqMontrealToday(); }

/* draft | scheduled | live | expired - the four states the admin shows. */
function cjhqPageLifecycle(p, today){
  if(!p) return 'expired';
  today = today || cjhqToday();
  // A page saved before this feature existed has no `published` field and was
  // public simply by existing, so absent means published. Only an explicit
  // false is a draft.
  if(p.published === false) return 'draft';
  const from = String(p.start_date || '').trim();
  const to   = String(p.end_date   || '').trim();
  if(from && today < from) return 'scheduled';
  if(to   && today > to)   return 'expired';   // inclusive: ends AFTER `to`
  return 'live';
}
function cjhqPageIsPublic(p){ return cjhqPageLifecycle(p) === 'live'; }

/* A page body is either HTML or plain text, chosen per page in the admin.

   HTML goes through DOMPurify exactly as it always has. Plain text is ESCAPED
   first and then given its paragraphs back, so a body pasted out of an email or
   a Word document keeps its shape instead of collapsing into one block - and a
   stray < or & in it is shown as typed rather than swallowed as markup.

   Anything saved before the switch existed has no body_format and is treated as
   HTML, which is what it was. */
// "On this page" boxes in custom pages. Page bodies are admin-written HTML
// (sanitized), so the jump list arrives as plain labels that looked clickable
// but did nothing. When a box's labels line up one-to-one with the page's
// section headings, each label becomes a working jump link. Nothing in the
// stored page changes; a box that doesn't line up is left exactly as it was.
function cjhqWireOnThisPage(root){
  if(!root) return;
  root.querySelectorAll('[data-en], [data-fr]').forEach(scope=>{
    const heads = [...scope.querySelectorAll('h2')];
    const label = [...scope.querySelectorAll('p, div, span, strong')].find(el =>
      el.children.length === 0 && /^(on this page|sur cette page|dans cette page)$/i.test(el.textContent.trim()));
    if(!label || !heads.length) return;
    const list = label.nextElementSibling;
    if(!list) return;
    const pills = [...list.children];
    if(pills.length !== heads.length) return;
    const header = document.querySelector('header');
    pills.forEach((pill, i)=>{
      const h = heads[i];
      pill.setAttribute('role', 'link');
      pill.setAttribute('tabindex', '0');
      pill.style.cursor = 'pointer';
      pill.classList.add('cjhq-otp-link');
      const go = (e)=>{
        e.preventDefault();
        const off = (header && getComputedStyle(header).position.match(/sticky|fixed/)) ? header.offsetHeight + 12 : 12;
        const top = h.getBoundingClientRect().top + window.scrollY - off;
        window.scrollTo({top, behavior:'smooth'});
      };
      pill.addEventListener('click', go);
      pill.addEventListener('keydown', e=>{ if(e.key === 'Enter' || e.key === ' ') go(e); });
    });
  });
}
function cjhqRenderPageBody(body, format){
  const raw = String(body == null ? '' : body);
  if(format !== 'text') return cjhqSanitizeHtml(raw);
  return raw.replace(/\r\n?/g, '\n').split(/\n{2,}/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => '<p>' + cjhqEscapeHtml(block).replace(/\n/g, '<br>') + '</p>')
    .join('');
}

/* The last instant of `endDate` in Montreal, as epoch milliseconds. No end
   date means a sentinel far enough out to mean "never expires". Montreal is
   UTC-5 in winter and UTC-4 in summer, so the offset is read from the date
   itself rather than assumed - an hour's error here would expire a page early
   or late on its final day. */
// First instant of the start day in Montreal. Undated pages have no lower bound.
const CJHQ_NO_START_MS = 0;
function cjhqStartOfDayMs(startDate){
  const d = String(startDate || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return CJHQ_NO_START_MS;
  const midnightUtc = Date.parse(d + 'T00:00:00Z');
  const offsetMin = cjhqMontrealOffsetMinutes(new Date(midnightUtc));
  return midnightUtc + offsetMin * 60000;
}
const CJHQ_NO_EXPIRY_MS = 253402300799000;   // 9999-12-31T23:59:59Z
function cjhqEndOfDayMs(endDate){
  const d = String(endDate || '').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)) return CJHQ_NO_EXPIRY_MS;
  // Midnight UTC on the day AFTER, then step back by Montreal's offset on that
  // day and by a millisecond, giving 23:59:59.999 local time.
  const nextUtc = Date.parse(d + 'T00:00:00Z') + 86400000;
  const offsetMin = cjhqMontrealOffsetMinutes(new Date(nextUtc));
  return nextUtc + offsetMin * 60000 - 1;
}
function cjhqMontrealOffsetMinutes(when){
  try{
    const parts = new Intl.DateTimeFormat('en-US', { timeZone:'America/Toronto',
      hour12:false, year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit' }).formatToParts(when);
    const g = t => Number(parts.find(p => p.type === t).value);
    const asUtc = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute'), g('second'));
    return Math.round((when.getTime() - asUtc) / 60000);   // +240 or +300
  }catch(e){ return 300; }
}
let PENDING_NOTICES = {};
async function enhanceResourceMetaFromBackend(){
  const overrides = await fetchCollection('reviewed_overrides');
  REVIEWED_OVERRIDES = Object.fromEntries(overrides.map(o => [o.slug, o.reviewed]));
  const notices = await fetchCollection('pending_change_notices');
  PENDING_NOTICES = Object.fromEntries(notices.map(n => [n.slug, n]));
}

/* ---------- Generic page-content overrides (admin-editable text blocks) ---------- */
async function applyContentOverrides(){
  const overrides = await fetchCollection('content_overrides');
  overrides.forEach(o => {
    const el = document.querySelector(`[data-cid="${o.cid}"]`);
    if(!el) return;
    const enSpan = el.querySelector('span[data-en]');
    const frSpan = el.querySelector('span[data-fr]');
    if(enSpan && o.en) enSpan.innerHTML = cjhqSanitizeHtml(o.en);
    if(frSpan && o.fr) frSpan.innerHTML = cjhqSanitizeHtml(o.fr);
  });
}
function newerReviewed(a, b){
  if(!a || !b) return a || b;
  const M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const v = s => { const m = /^([A-Za-z]+) (\d{4})$/.exec(String(s).trim()); return m && M.includes(m[1]) ? Number(m[2]) * 12 + M.indexOf(m[1]) : NaN; };
  const ta = v(a), tb = v(b);
  if(isNaN(ta) || isNaN(tb)) return a;
  return ta >= tb ? a : b;
}
function translateReviewedDate(s){
  const months = {January:'janvier',February:'février',March:'mars',April:'avril',May:'mai',June:'juin',July:'juillet',August:'août',September:'septembre',October:'octobre',November:'novembre',December:'décembre'};
  for(const [en, fr] of Object.entries(months)){ if(s.startsWith(en)) return s.replace(en, fr); }
  return s;
}
let currentResourceSlug = null;

/* ---------- Error reporting: 404s and unexpected JS errors ---------- */
async function submitErrorReport(extra){
  const report = {
    type: extra.type || 'broken_link',
    attemptedUrl: location.origin + (extra.path || window.__last404Path || location.pathname),
    message: extra.message || '',
    referrer: document.referrer || '',
    userAgent: navigator.userAgent,
    lang: document.documentElement.classList.contains('lang-fr') ? 'fr' : 'en',
    reportedAt: new Date().toISOString(),
  };
  try{
    const response = await fetch('https://error-intake-158970385688.us-east1.run.app/', {
      method:'POST', mode:'cors', headers:{'Content-Type':'application/json'}, body:JSON.stringify(report)
    });
    if(!response.ok) console.warn('Could not save error report:', response.status);
  }catch(e){ console.warn('Could not save error report:', e); }
  return report;
}

(function initErrorHandling(){
  // Passive capture: unexpected JS errors, logged silently (no UI interruption for visitors)
  window.addEventListener('error', (e)=>{
    if(e.message && e.message.includes('ResizeObserver')) return; // noisy browser quirk, not a real bug
    submitErrorReport({ type:'js_error', message:`${e.message} (${e.filename}:${e.lineno})` });
  });
  window.addEventListener('unhandledrejection', (e)=>{
    submitErrorReport({ type:'js_error', message:'Unhandled promise rejection: ' + (e.reason?.message || e.reason) });
  });
  // 404 "report this" button
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('reportBrokenLinkBtn');
    if(!btn) return;
    btn.addEventListener('click', async ()=>{
      btn.disabled = true;
      await submitErrorReport({ type:'broken_link', path: window.__last404Path });
      btn.style.display = 'none';
      document.getElementById('reportBrokenLinkStatus').style.display = 'block';
    });
  });
})();

function initResourceCellHandlers(){
  const wrap = document.getElementById('accordionWrap');
  if(wrap.dataset.delegated) return; // only attach once
  wrap.dataset.delegated = '1';
  wrap.addEventListener('click', (e)=>{
    const cell = e.target.closest('.res-item');
    if(!cell) return;
    // The card is a real <a href> to the official destination so it can be
    // middle-clicked, copied, opened in a new tab and followed without
    // JavaScript. A plain left-click still opens the CJHQ detail panel, which
    // carries the verified requirements, steps and tips - so ordinary use is
    // unchanged and only the escape hatches are new.
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    openResourcePopup(cell.dataset.slug);
  });
}

function openResourcePopup(slug, opts){
  opts = opts || {};
  const it = RESOURCE_BY_SLUG[slug];
  if(!it) return;
  currentResourceSlug = slug;
  const isFr = document.documentElement.classList.contains('lang-fr');
  const isInsurance = INSURANCE_URLS.includes(it.url);
  // Every field below is replaceable from Firestore via resource_overrides,
  // so all of it is untrusted. The built-in content contains no HTML tags at
  // all (verified across all 62 resources), so escaping changes nothing visible.
  const esc  = (v) => cjhqEscapeHtml(v);
  const escL = (a) => Array.isArray(a) ? a.map(cjhqEscapeHtml) : a;
  const title = esc(isFr ? it.fr : it.en);
  const fallbackWhat = isFr ? 'Cliquez ci-dessous pour accéder à cette ressource officielle.' : 'Click below to visit this official resource.';
  const what = esc(isFr ? (it.what_fr || it.desc_fr || fallbackWhat) : (it.what_en || it.desc_en || fallbackWhat));
  const questionLabel = esc(isFr ? it.question_fr : it.question_en);
  const answerText = esc(isFr ? it.answer_fr : it.answer_en);
  const needHeading = esc(isFr ? it.need_heading_fr : it.need_heading_en);
  const needIntro = esc(isFr ? it.need_intro_fr : it.need_intro_en);
  const needList = escL(isFr ? it.need_list_fr : it.need_list_en);
  const need = esc(isFr ? it.need_fr : it.need_en);
  const needText = esc(isFr ? it.need_fr : it.need_en);
  const stepsHeading = esc((isFr ? it.steps_heading_fr : it.steps_heading_en) || (isFr ? 'Comment faire la demande' : 'How to Apply'));
  const stepsList = escL(isFr ? it.steps_list_fr : it.steps_list_en);
  const stepsText = esc(isFr ? it.steps_fr : it.steps_en);
  const tipsHeading = esc((isFr ? it.tips_heading_fr : it.tips_heading_en) || (isFr ? 'Bon à savoir' : 'Good to Know'));
  const tipsList = escL(isFr ? it.tips_list_fr : it.tips_list_en);
  const officialLinks = it.official_links || [];
  const related = (it.related || []).map(s => RESOURCE_BY_SLUG[s]).filter(Boolean);
  const reviewedDate = newerReviewed(REVIEWED_OVERRIDES[slug], it.reviewed);
  const pendingNotice = PENDING_NOTICES[slug];
  // Resources carrying blankForm get a second popup button that generates the
  // blank PDF directly. Only the consent-letter resource sets it.
  const blankBtn = it.blankForm
    ? `<button class="btn res-popup-secondary-btn" type="button" data-popup-blank>
          <span data-en>Download Blank Form</span><span data-fr>Formulaire vierge</span>
        </button>`
    : '';
  const href2 = cjhqSafeUrl(it.url2);
  const secondaryBtn = it.url2 ? (href2
        ? `<a class="btn res-popup-secondary-btn" href="${cjhqEscapeHtml(href2)}" target="_blank" rel="noopener noreferrer" data-popup-open2>
          <span data-en>${cjhqEscapeHtml(it.label_en2)}</span><span data-fr>${cjhqEscapeHtml(it.label_fr2)}</span>
        </a>`
        : `<button class="btn res-popup-secondary-btn" type="button" data-popup-open2>
          <span data-en>${cjhqEscapeHtml(it.label_en2)}</span><span data-fr>${cjhqEscapeHtml(it.label_fr2)}</span>
        </button>`) : '';
  const bulletList = (arr) => arr && arr.length ? `<ul class="res-popup-list">${arr.map(x=>`<li>${x}</li>`).join('')}</ul>` : '';
  // A record may carry STRUCTURED tables and fact boxes. These are arrays of
  // plain strings, never markup: every cell is escaped exactly like every other
  // field, so the rule that nothing in this popup is trusted HTML still holds.
  // They are not in the resource_overrides merge list either, so Firestore
  // cannot supply them at all.
  const facts  = (isFr ? it.facts_fr  : it.facts_en)  || [];
  const tables = (isFr ? it.tables_fr : it.tables_en) || [];
  const factGrid = facts.length
    ? `<div class="res-fee-grid">${facts.map(f =>
        `<div class="res-fee-box"><b>${esc(f.label)}</b>${esc(f.value)}</div>`).join('')}</div>`
    : '';
  const tableBlocks = tables.map(tb => `
      <div class="site-modal-section res-popup-block">
        <h3>${esc(tb.heading)}</h3>
        <div class="res-table-scroll">
          <table class="res-cc-table">
            <thead><tr>${(tb.cols||[]).map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead>
            <tbody>${(tb.rows||[]).map(r=>`<tr>${(r||[]).map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`).join('');
  const body = document.getElementById('resourceShareModalBody');
  body.innerHTML = `
    <div class="site-modal-head">
      <h2 id="resourceModalTitle" style="margin:2px 0; font-size:1.1rem;">${title}</h2>
      <button class="site-modal-close" onclick="closeResourceShareModal()" aria-label="${isFr ? 'Fermer' : 'Close'}" data-en-label="Close" data-fr-label="Fermer">&times;</button>
    </div>
    <div class="site-modal-body">
      ${pendingNotice ? `
      <div class="site-modal-section res-pending-notice">
        <span data-en>⚠️ Heads up: ${cjhqEscapeHtml(pendingNotice.notice_en)}</span><span data-fr>⚠️ À noter : ${cjhqEscapeHtml(pendingNotice.notice_fr)}</span>
      </div>` : ''}
      <div class="site-modal-section">
        <p class="res-popup-what">${what}</p>
        ${factGrid}
      </div>
      ${questionLabel ? `
      <div class="site-modal-section res-popup-block">
        <h3>${questionLabel}</h3>
        <p>${answerText}</p>
      </div>` : ''}
      ${tableBlocks}
      ${!tables.length && ((needList && needList.length) || need) ? `
      <div class="site-modal-section res-popup-block">
        <h3>${needHeading || (isFr ? "Ce qu'il vous faut" : "What You'll Need")}</h3>
        ${needIntro ? `<p class="res-popup-intro-line">${needIntro}</p>` : ''}
        ${needList && needList.length ? bulletList(needList) : `<p>${needText}</p>`}
      </div>` : ''}
      ${(stepsList && stepsList.length) || stepsText ? `
      <div class="site-modal-section res-popup-block">
        <h3>${stepsHeading}</h3>
        ${stepsList && stepsList.length ? `<ol class="res-popup-list res-popup-list-numbered">${stepsList.map(x=>`<li>${x}</li>`).join('')}</ol>` : `<p>${stepsText}</p>`}
      </div>` : ''}
      ${!tables.length && tipsList && tipsList.length ? `
      <div class="site-modal-section res-popup-block">
        <h3>${tipsHeading}</h3>
        ${bulletList(tipsList)}
      </div>` : ''}
      <div class="site-modal-section" style="display:flex; flex-wrap:wrap; gap:10px;">
        ${(() => {
          const href1 = cjhqSafeUrl(it.url);
          const label1 = `<span data-en>${esc(it.label_en1 || 'Go to Application →')}</span><span data-fr>${esc(it.label_fr1 || "Aller à la demande →")}</span>`;
          // A resource may target an internal tool page rather than an external
          // site. data-page lets the existing delegated router handle the click,
          // so it stays in the SPA and modifier-clicks still work.
          if(it.internalPage){
            const p1 = pathForPage(it.internalPage);
            return `<a class="btn dark" href="${cjhqEscapeHtml(p1)}" data-page="${cjhqEscapeHtml(it.internalPage)}" data-popup-open1>${label1}</a>`;
          }
          // A real link, so it announces as a link, shows its destination on
          // hover, and supports middle-click / "copy link address". The
          // insurance disclaimer still intercepts the click below. If the URL
          // fails validation we fall back to a button rather than emit a
          // link with no destination.
          return href1
            ? `<a class="btn dark" href="${cjhqEscapeHtml(href1)}" target="_blank" rel="noopener noreferrer" data-popup-open1>${label1}</a>`
            : `<button class="btn dark" type="button" data-popup-open1>${label1}</button>`;
        })()}${blankBtn}${secondaryBtn}
      </div>
      ${officialLinks.length ? `
      <div class="site-modal-section res-popup-block">
        <h3><span data-en>Official Links</span><span data-fr>Liens officiels</span></h3>
        <ul class="res-popup-list res-official-links">
          ${officialLinks.map(l => { const u = cjhqSafeUrl(l.url); const t = cjhqEscapeHtml(isFr ? l.label_fr : l.label_en);
             return u ? `<li><a href="${cjhqEscapeHtml(u)}" target="_blank" rel="noopener noreferrer">${t}</a></li>` : `<li>${t}</li>`; }).join('')}
        </ul>
      </div>` : ''}
      ${related.length ? `
      <div class="site-modal-section res-popup-block">
        <h3><span data-en>Related Resources</span><span data-fr>Ressources connexes</span></h3>
        <div class="res-related-pills">
          ${related.map(r => `<button type="button" class="res-related-pill" data-related-slug="${esc(r.slug)}">${esc(isFr ? r.fr : r.en)}</button>`).join('')}
        </div>
      </div>` : ''}
      ${reviewedDate ? `<p class="res-reviewed"><span data-en>Last reviewed by CJHQ: ${esc(reviewedDate)}</span><span data-fr>Dernière révision par le CJHQ : ${esc(translateReviewedDate(reviewedDate))}</span></p>` : ''}
      <div class="site-modal-section res-share-row">
        <span class="res-share-label"><span data-en>Share this resource</span><span data-fr>Partager cette ressource</span></span>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="res-share-icon-btn" type="button" onclick="shareResourceVia('email')" title="Email" aria-label="Share by Email"><span aria-hidden="true">📧</span></button>
          <button class="res-share-icon-btn" type="button" onclick="shareResourceVia('whatsapp')" title="WhatsApp" aria-label="Share via WhatsApp"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg></button>
          <button class="res-share-icon-btn" type="button" onclick="shareResourceVia('copy')" title="Copy Link" aria-label="Copy Link"><span aria-hidden="true">🔗</span></button>
        </div>
      </div>
    </div>`;
  body.querySelector('[data-popup-open1]').addEventListener('click', (e)=>{
    if(it.internalPage){ closeResourceShareModal(); return; }   // the router navigates
    if(isInsurance){
      e.preventDefault();
      closeResourceShareModal(); showInsuranceDisclaimer(it.url); return;
    }
    // Rendered as <a> with a validated href: let the browser handle it, so
    // modifier-clicks and middle-clicks work. The <button> fallback (unsafe
    // URL) has no href, so nothing happens - which is the intent.
    if(e.currentTarget.tagName !== 'A'){
      e.preventDefault();
      console.warn('Blocked unsafe resource URL for', slug);
    }
  });
  const btn2 = body.querySelector('[data-popup-open2]');
  const blankEl = body.querySelector('[data-popup-blank]');
  if(blankEl) blankEl.addEventListener('click', ()=>{
    if(typeof window.__ctcDownloadBlank === 'function') window.__ctcDownloadBlank();
  });

  if(btn2) btn2.addEventListener('click', (e)=>{
    if(e.currentTarget.tagName !== 'A'){
      e.preventDefault();
      console.warn('Blocked unsafe secondary URL for', slug);
    }
  });
  body.querySelectorAll('[data-related-slug]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ openResourcePopup(btn.dataset.relatedSlug); });
  });

  document.getElementById('resourceShareModal').classList.add('open');
  // Accessibility: move focus into modal so keyboard users & screen readers know it opened
  const modalBody = document.getElementById('resourceShareModalBody');
  modalBody.setAttribute('aria-labelledby', 'resourceModalTitle');
  setTimeout(()=>{ modalBody.focus(); }, 50);
  // Store trigger element so focus returns correctly on close
  document.getElementById('resourceShareModal')._triggerEl = document.activeElement;
  if(!opts.skipHistory){
    const newPath = SITE_BASE_PATH + `/resources/${slug}`;
    if(location.pathname !== newPath) history.pushState({page:'resources', slug}, '', newPath);
  }
}
function closeResourceShareModal(){
  const modal = document.getElementById('resourceShareModal');
  modal.classList.remove('open');
  // Return focus to the element that opened the modal
  const trigger = modal._triggerEl;
  if(trigger && typeof trigger.focus === 'function') setTimeout(()=> trigger.focus(), 50);
  modal._triggerEl = null;
  const resourcesPrefix = SITE_BASE_PATH + '/resources/';
  if(location.pathname.startsWith(resourcesPrefix)) history.pushState({page:'resources'}, '', SITE_BASE_PATH + '/resources');
}
function resourceDeepLink(slug){
  return location.origin + SITE_BASE_PATH + '/resources/' + slug;
}
function shareResourceVia(method){
  const slug = currentResourceSlug;
  const it = RESOURCE_BY_SLUG[slug];
  const isFr = document.documentElement.classList.contains('lang-fr');
  const title = isFr ? it.fr : it.en;
  const link = resourceDeepLink(slug);
  if(method === 'email'){
    window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent((isFr?'Voici une ressource du CJHQ : ':'Here is a CJHQ resource: ')+link)}`;
  } else if(method === 'whatsapp'){
    window.open(`https://wa.me/?text=${encodeURIComponent(title+' — '+link)}`, '_blank', 'noopener');
  } else if(method === 'copy'){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(link);
    } else {
      prompt(isFr?'Copiez ce lien :':'Copy this link:', link);
    }
  }
}

/* ---------- On-page resource search ---------- */
function initResourceSearch(){
  const input = document.getElementById('resourceSearch');
  if(!input) return;
  const clearBtn = document.getElementById('resourceSearchClear');
  const countEl = document.getElementById('resourceSearchCount');
  const noResultsEl = document.getElementById('resourceNoResults');

  function runFilter(){
    const q = input.value.trim().toLowerCase();
    const isFr = document.documentElement.classList.contains('lang-fr');
    clearBtn.style.display = q ? 'block' : 'none';

    if(!q){
      countEl.style.display = 'none';
      noResultsEl.style.display = 'none';
      document.querySelectorAll('#accordionWrap .accordion-item').forEach(el=>{
        el.style.display = '';
        el.classList.remove('open');
        el.querySelectorAll('.res-item').forEach(li => li.style.display = '');
        el.querySelectorAll('.res-group').forEach(g => g.style.display = '');
      });
      syncAccordionAria();
      return;
    }

    let totalMatches = 0;
    const accItems = document.querySelectorAll('#accordionWrap .accordion-item');
    accItems.forEach((el, catIdx) => {
      const cat = categories[catIdx];
      let catHasMatch = false;
      const groupEls = el.querySelectorAll('.res-group');
      groupEls.forEach((groupEl, gIdx) => {
        const group = cat.groups[gIdx];
        let groupHasMatch = false;
        const liEls = groupEl.querySelectorAll('.res-item');
        liEls.forEach((li, iIdx) => {
          const it = group.items[iIdx];
          const haystack = cjhqNormalizeSearch([it.en, it.fr, it.desc_en, it.desc_fr, it.what_en, it.what_fr].join(' '));
          const match = haystack.includes(cjhqNormalizeSearch(q));
          li.style.display = match ? '' : 'none';
          if(match){ groupHasMatch = true; totalMatches++; }
        });
        groupEl.style.display = groupHasMatch ? '' : 'none';
        if(groupHasMatch) catHasMatch = true;
      });
      el.style.display = catHasMatch ? '' : 'none';
      el.classList.toggle('open', catHasMatch);
    });
    syncAccordionAria();

    countEl.style.display = 'block';
    countEl.textContent = isFr
      ? `${totalMatches} résultat${totalMatches===1?'':'s'} pour « ${input.value.trim()} »`
      : `${totalMatches} result${totalMatches===1?'':'s'} for "${input.value.trim()}"`;
    noResultsEl.style.display = totalMatches === 0 ? 'block' : 'none';
  }

  input.addEventListener('input', runFilter);
  clearBtn.addEventListener('click', ()=>{ input.value=''; runFilter(); input.focus(); });
}


function showInsuranceDisclaimer(url){
  document.getElementById('insuranceModalOverlay').classList.add('open');
  document.getElementById('insuranceModalOverlay').dataset.targetUrl = url;
  return false;
}
function closeInsuranceModal(){
  document.getElementById('insuranceModalOverlay').classList.remove('open');
}
function continueToInsuranceProvider(){
  const url = document.getElementById('insuranceModalOverlay').dataset.targetUrl;
  const safeDest = cjhqSafeUrl(url);
  if(safeDest) window.open(safeDest, '_blank', 'noopener');
  else console.warn('Blocked unsafe insurance destination');
  closeInsuranceModal();
}

function renderContactCats(){
  const wrap = document.getElementById('catToggle');
  contactCats.forEach((c,i)=>{
    wrap.innerHTML += `<button class="${i===0?'active':''}" onclick="selectCat(this,${i})"><span data-en>${c.en}</span><span data-fr>${c.fr}</span></button>`;
  });
}
function selectCat(btn,index){
  btn.parentElement.querySelectorAll('button').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const group = contactFieldGroups[index];
  const field = document.getElementById('inquiryTypeField');
  if(field) field.value = group.en;
  renderDynamicFields(index);
}

function renderDynamicFields(index){
  const wrap = document.getElementById('dynamicFields');
  if(!wrap) return;
  const group = contactFieldGroups[index];
  wrap.innerHTML = group.fields.map(f=>{
    const req = f.required ? 'required' : '';
    // The visible <label> elements were not programmatically associated with
    // their inputs (no for/id pair), so a screen reader announced six
    // unlabelled fields on the contact form. Pairing them changes nothing
    // visible: same labels, same text, same markup shape, same styling.
    // Both the EN and FR label point at the same input; only one is displayed
    // at a time, and a display:none label is excluded from the accessible name.
    const fid = 'cf-' + String(f.name).replace(/[^a-zA-Z0-9_-]/g, '');
    const input = f.type === 'textarea'
      ? `<textarea id="${fid}" name="${f.name}" ${req}></textarea>`
      : `<input id="${fid}" type="${f.type}" name="${f.name}" ${req}>`;
    return `<div class="form-group">
      <label for="${fid}" data-en>${f.en}</label><label for="${fid}" data-fr>${f.fr}</label>
      ${input}
    </div>`;
  }).join('');
}

function renderInitiatives(){
  const grid = document.getElementById('initiativeGrid');
  initiatives.forEach(i=>{
    grid.innerHTML += `<div class="init-card">
      <div class="icon-badge">${iconSVG(i.icon)}</div>
      <h3 data-en>${i.en}</h3><h3 data-fr>${i.fr}</h3>
    </div>`;
  });
}

function renderNewsTopics(){
  const wrap = document.getElementById('topicList');
  newsTopics.forEach(t=>{
    wrap.innerHTML += `<div class="topic-item">${iconSVG(t.icon)}<span><span data-en>${t.en}</span><span data-fr>${t.fr}</span></span></div>`;
  });
}

const pageLabels = {
  'home':{en:'Home', fr:'Accueil'}, 'about':{en:'About', fr:'À propos'},
  'resources':{en:'Resources', fr:'Ressources'}, 'stay-informed':{en:'News & Updates', fr:'Actualités'},
  'contact':{en:'Contact', fr:'Contact'}, 'privacy':{en:'Privacy Policy', fr:'Politique de confidentialité'},
  'terms':{en:'Terms of Use', fr:'Conditions d\'utilisation'}, 'accessibility':{en:'Accessibility', fr:'Accessibilité'},
};

function handleSearch(q, targetId){
  q = q.trim().toLowerCase();
  const box = document.getElementById(targetId || 'searchResults');
  const isFr = document.documentElement.classList.contains('lang-fr');

  if(!q){ box.style.display = 'none'; box.innerHTML = ''; return; }

  const qn = cjhqNormalizeSearch(q);
  let matches = searchIndex
    .filter(item => cjhqNormalizeSearch(isFr ? item.fr : item.en).includes(qn) || cjhqNormalizeSearch(isFr ? item.body_fr : item.body_en).includes(qn))
    .map(item => ({ page:item.page, title: isFr ? item.fr : item.en, body: isFr ? item.body_fr : item.body_en }));

  categories.forEach(c => {
    const title = isFr ? c.fr : c.en;
    const allItems = c.groups.flatMap(g => g.items.map(it => isFr ? it.fr : it.en));
    const items = allItems.join(', ');
    if(cjhqNormalizeSearch(title).includes(qn) || cjhqNormalizeSearch(items).includes(qn)){
      matches.push({ page:'resources', title, body:items });
    }
  });

  // de-duplicate by page+title, cap results
  const seen = new Set();
  matches = matches.filter(m => {
    const key = m.page + '|' + m.title;
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 8);

  // Everything interpolated below is escaped with cjhqEscapeHtml. The search
  // query is user input and was executing as markup: typing
  // <img src=x onerror=...> into the box ran the handler. Titles and bodies come
  // from in-page data today, but they share this template, so they are escaped
  // too rather than relying on where they happen to come from right now.
  //
  // The result buttons no longer carry an inline onclick with an interpolated
  // page name. The page is held in a data attribute and a single delegated
  // listener reads it, so no dynamic value is ever parsed as JavaScript.
  const esc = cjhqEscapeHtml;
  if(matches.length === 0){
    box.innerHTML = `<div class="search-result-empty">${isFr ? 'Aucun résultat pour "' + esc(q) + '"' : 'No results for "' + esc(q) + '"'}</div>`;
  } else {
    box.innerHTML = matches.map(m => `
      <button class="search-result-item" data-search-page="${esc(m.page)}">
        <span class="search-cat">${esc(isFr ? pageLabels[m.page].fr : pageLabels[m.page].en)}</span>
        <strong>${esc(m.title)}</strong>
        <span>${esc(m.body)}</span>
      </button>`).join('');
  }
  box.style.display = 'block';
}

/* One delegated listener for every search result, present and future. Replaces
   the per-button inline onclick so no interpolated value is ever executed. */
document.addEventListener('click', (e) => {
  const btn = e.target && e.target.closest && e.target.closest('[data-search-page]');
  if(!btn) return;
  goToSearchResult(btn.getAttribute('data-search-page'));
});

function goToSearchResult(page){
  goPage(page);
  [['searchResults','siteSearch'], ['drawerSearchResults','drawerSearch']].forEach(([boxId, inputId])=>{
    const box = document.getElementById(boxId);
    const input = document.getElementById(inputId);
    if(box){ box.style.display = 'none'; box.innerHTML = ''; }
    if(input) input.value = '';
  });
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  if(drawer){ drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; }
}

document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.search-box-wrap');
  if(wrap && !wrap.contains(e.target)){
    document.getElementById('searchResults').style.display = 'none';
  }
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('siteSearch').blur();
    // Close resource modal if open
    if(document.getElementById('resourceShareModal').classList.contains('open')){
      closeResourceShareModal();
    }
    // Close site notice popup if open
    const popup = document.getElementById('sitePopupOverlay');
    if(popup && popup.classList.contains('open')) popup.classList.remove('open');
  }
});

function renderCoreValues(){
  const grid = document.getElementById('coreValuesGrid');
  if(!grid) return;
  coreValues.forEach(v=>{
    grid.innerHTML += `<div class="card" style="text-align:center;">
      <div class="icon-badge" style="margin:0 auto 12px;">${iconSVG(v.icon)}</div>
      <h3 data-en>${v.en}</h3><h3 data-fr>${v.fr}</h3>
    </div>`;
  });
}

renderAccordion();
initResourceSearch();
renderContactCats();
renderDynamicFields(0);
renderNewsTopics();
renderCoreValues();

let PARTNERS_DATA = [
  {type:'img', src:"/assets/renewal-canada.webp", w:320, h:111, alt:"Renewal Canada", url:"https://www.renewalcanada.org/"},
  {type:'img', src:"/assets/yaldei.webp", w:320, h:213, alt:"Yaldei", url:"https://www.yaldei.org/"},
  {type:'img', src:"/assets/optimized/refuah-v-chesed.webp", w:505, h:220, alt:"Refuah V'Chesed", url:"https://refuahvchesed.org/"},
  {type:'img', src:"/assets/hatzolah-montreal.webp", w:184, h:220, alt:"Hatzolah Montreal", url:"https://www.hatzoloh.ca/en/"},
  {type:'img', src:"/assets/optimized/chavivim.webp", w:220, h:220, alt:"Chavivim", url:"https://chavivim.org/montreal"},
  {type:'img', src:"/assets/optimized/chaverim-montreal.webp", w:220, h:220, alt:"Chaverim Montreal", url:"https://chaverim.ca/"},
  {type:'img', src:"/assets/shomrim-tosh.webp", w:92, h:92, alt:"Shomrim Tosh", url:"https://www.ktshomrim.com/"},
  {type:'img', src:"/assets/optimized/hatzolah-tosh.webp", w:738, h:124, alt:"Hatzolah Tosh", url:"https://hatzolaht.com/"},
  {type:'img', src:"/assets/optimized/eruv-montreal.webp", w:252, h:192, alt:"Eruv Montreal", url:"https://montrealeruv.ca/"},
  {type:'img', src:"/assets/optimized/bikur-cholim-montreal.webp", w:320, h:320, alt:"Bikur Cholim Montreal", url:null},
  {type:'img', src:"/assets/yad-ve-ezer.webp", w:320, h:164, alt:"Yad Ve'ezer", url:"https://yadvaezer.ca/"},
  {type:'img', src:"/assets/optimized/tzum-gezunt.webp", w:562, h:158, alt:"Tzum Gezunt", url:"https://tzumgezunt.ca/"},
  {type:'img', src:"/assets/chai-lifeline-montreal.webp", w:801, h:220, alt:"Chai Lifeline Montreal", url:"https://chailifelinecanada.org/"},
  {type:'img', src:"/assets/optimized/misaskim-montreal.webp", w:396, h:220, alt:"Misaskim Montreal", url:"https://misaskimmtl.org/"},
  {type:'img', src:"/assets/bonei-olam-montreal.webp", w:166, h:159, alt:"Bonei Olam Montreal", url:"https://www.boneiolam.org/"},
  {type:'img', src:"/assets/interstate-chaverim.webp", w:220, h:210, alt:"Interstate Chaverim", url:"https://www.interstatechaverim.com/"}
];

function shuffleArray(arr){
  const a = arr.slice();
  for(let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
let PARTNER_OVERRIDES_CACHE = {};
function renderPartners(){
  const track = document.getElementById('partnersTrack');
  if(!track) return;
  const visible = PARTNERS_DATA.filter(p => {
    const key = p.type === 'img' ? p.alt : p.name;
    const ov = PARTNER_OVERRIDES_CACHE[key];
    return !(ov && ov.hidden);
  });
  const shuffled = shuffleArray(visible);
  // Partner labels and override URLs come from Firestore, so they are
  // attacker-reachable. Escape every interpolated attribute and allow only
  // http/https destinations - a javascript: URL here would otherwise execute
  // for every visitor. Visible text, images and markup shape are unchanged.
  const escAttr = (v) => String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const safeUrl = (u) => {
    if(!u) return null;
    try{
      const parsed = new URL(String(u), location.href);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : null;
    }catch(err){ return null; }
  };
  const badgeHtml = (p) => {
    const key = p.type === 'img' ? p.alt : p.name;
    const ov = PARTNER_OVERRIDES_CACHE[key];
    const url = safeUrl((ov && ov.url !== undefined) ? ov.url : p.url);
    const label = p.type === 'img' ? p.alt : p.name;
    // width/height let the browser reserve the box before the file loads, so the
    // marquee cannot shift. CSS still controls the rendered size (height is set,
    // width:auto), so these attributes change nothing visually.
    const dims = (p.w && p.h) ? ` width="${p.w}" height="${p.h}"` : '';
    const inner = p.type === 'img'
      ? `<img src="${escAttr(p.src)}" alt="${escAttr(p.alt)}"${dims} loading="lazy" decoding="async">`
      : escAttr(p.name);
    const cls = 'partner-badge' + (p.type === 'img' ? ' partner-badge-logo' : '');
    return url
      ? `<a class="${cls}" href="${escAttr(url)}" target="_blank" rel="noopener noreferrer" title="${escAttr(label)}">${inner}</a>`
      : `<div class="${cls}">${inner}</div>`;
  };
  // The track is emitted twice so the marquee can loop seamlessly. The second
  // copy is a visual duplicate only: hide it from assistive technology and take
  // it out of the tab order so each partner is announced and tabbed to once.
  const realHtml = shuffled.map(badgeHtml).join('');
  const dupHtml  = `<div class="partners-dup" aria-hidden="true">${realHtml}</div>`;
  track.innerHTML = realHtml + dupHtml;
  track.querySelectorAll('.partners-dup a').forEach(a=>a.setAttribute('tabindex','-1'));
}
renderPartners();
async function applyPartnerOverrides(){
  const overrides = await fetchCollection('partner_overrides');
  PARTNER_OVERRIDES_CACHE = Object.fromEntries(overrides.map(o => [o.key, o]));
  renderPartners();
}

/* Marquee: auto-scroll + drag/touch scroll */
(function initPartnersMarquee(){
  const el = document.getElementById('partnersMarquee');
  if(!el) return;
  let isDown = false, startX = 0, startScroll = 0, autoScroll = true, resumeTimer = null;

  // The `prefers-reduced-motion` rule in the stylesheet only disables a CSS
  // animation, and this marquee is driven by JS - so the guard has to be here.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Only animate while the marquee is actually on screen. A display:none
  // element never intersects, so this also stops the loop on every other page.
  let inView = false;
  if('IntersectionObserver' in window){
    new IntersectionObserver(entries=>{ inView = entries[0].isIntersecting; }, {threshold:0.01}).observe(el);
  }else{
    inView = true;
  }

  function tick(){
    if(autoScroll && !isDown && inView && !document.hidden && !reduceMotion.matches){
      el.scrollLeft += 0.6;
      const half = el.scrollWidth / 2;
      if(el.scrollLeft >= half) el.scrollLeft -= half;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function pauseThenResume(){
    autoScroll = false;
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(()=>{ autoScroll = true; }, 3500);
  }

  el.addEventListener('mousedown', e=>{
    isDown = true; el.classList.add('dragging');
    startX = e.pageX; startScroll = el.scrollLeft;
    pauseThenResume();
  });
  window.addEventListener('mouseup', ()=>{ isDown = false; el.classList.remove('dragging'); });
  window.addEventListener('mousemove', e=>{
    if(!isDown) return;
    e.preventDefault();
    el.scrollLeft = startScroll - (e.pageX - startX);
  });
  el.addEventListener('touchstart', ()=>{ pauseThenResume(); }, {passive:true});
  el.addEventListener('wheel', ()=>{ pauseThenResume(); }, {passive:true});

  const leftBtn = document.getElementById('partnersArrowLeft');
  const rightBtn = document.getElementById('partnersArrowRight');
  if(leftBtn) leftBtn.addEventListener('click', ()=>{ pauseThenResume(); el.scrollBy({left:-320, behavior:'smooth'}); });
  if(rightBtn) rightBtn.addEventListener('click', ()=>{ pauseThenResume(); el.scrollBy({left:320, behavior:'smooth'}); });

  // Normalize scroll position within the looping range as the user drags
  el.addEventListener('scroll', ()=>{
    const half = el.scrollWidth / 2;
    if(el.scrollLeft >= half) el.scrollLeft -= half;
    else if(el.scrollLeft < 0) el.scrollLeft += half;
  });
})();


// ---------- NAVIGATION ----------
const FRENCH_ROUTE_BY_PAGE = {
  home:'', resources:'ressources', 'stay-informed':'actualites', about:'a-propos',
  contact:'contact', privacy:'politique-de-confidentialite', terms:'conditions-utilisation',
  accessibility:'accessibilite', 'child-travel-consent':'consentement-voyage-enfant'
};
const PAGE_BY_FRENCH_ROUTE = Object.fromEntries(
  Object.entries(FRENCH_ROUTE_BY_PAGE).map(([page, route]) => [route, page])
);
function pathForPage(name, lang){
  const useFr = lang === 'fr' || (!lang && document.documentElement.classList.contains('lang-fr'));
  if(useFr && Object.prototype.hasOwnProperty.call(FRENCH_ROUTE_BY_PAGE, name)){
    const route = FRENCH_ROUTE_BY_PAGE[name];
    return SITE_BASE_PATH + '/fr/' + (route ? route : '');
  }
  return name === 'home' ? (SITE_BASE_PATH + '/') : (SITE_BASE_PATH + '/' + name);
}
function goPage(name, opts){
  opts = opts || {};
  // Deactivated built-in page -> show 404 instead
  if(HIDDEN_PAGES_CACHE[name] && HIDDEN_PAGES_CACHE[name].hidden){
    if(typeof show404 === 'function'){ show404(name, opts); return; }
  }
  const builtIn = document.getElementById('page-'+name);
  if(builtIn){
    document.documentElement.classList.remove('route-pending');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    builtIn.classList.add('active');
    if(name === 'resources' && firebaseReady) requestResourceBackend();
    highlightActiveNav(name);
    if(!opts.skipScroll) window.scrollTo({top:0, behavior:'instant'});
    if(name === 'child-travel-consent' && typeof window.__ctcOnOpen === 'function'){
      // Re-seed the departure date so the default is always today, even if
      // the tab has been open since yesterday.
      window.__ctcOnOpen();
    }
    if(!opts.skipHistory) updateUrlForPage(name);
    else { updatePageMeta(name); trackPageView(); }
    return;
  }
  // Not a built-in page -> check custom pages. PUBLIC, not the full cache: a
  // draft, a page whose start date has not arrived, and an expired page all
  // fall through to the 404 below, including when the URL is typed directly.
  const custom = CUSTOM_PAGES_PUBLIC[name];
  const pre = window.__CJHQ_PRERENDER;
  if(custom && pre && pre.slug === name && pre.title_en === custom.title_en && pre.title_fr === custom.title_fr
     && pre.body_en === custom.body_en && pre.body_fr === custom.body_fr && pre.body_format === custom.body_format
     && document.getElementById('page-custom').classList.contains('active')){
    // Baked copy matches the live record: leave it alone (no re-render, no scroll jump).
    document.documentElement.classList.remove('route-pending');
    return;
  }
  if(custom){
    document.getElementById('customPageTitle').innerHTML =
      `<span data-en>${cjhqEscapeHtml(custom.title_en)}</span><span data-fr>${cjhqEscapeHtml(custom.title_fr)}</span>`;
    document.getElementById('customPageBody').innerHTML =
      `<div data-en>${cjhqRenderPageBody(custom.body_en, custom.body_format)}</div>` +
      `<div data-fr>${cjhqRenderPageBody(custom.body_fr, custom.body_format)}</div>`;
    cjhqWireOnThisPage(document.getElementById('customPageBody'));
    document.documentElement.classList.remove('route-pending');
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-custom').classList.add('active');
    highlightActiveNav(name);
    if(!opts.skipScroll) window.scrollTo({top:0, behavior:'instant'});
    if(!opts.skipHistory) updateUrlForPage(name);
    else { updatePageMeta(name); trackPageView(); }
    return;
  }
  // Nothing matches -> 404
  if(opts.deferUnknown){
    window.__routeDeferred = true;
    // A baked notice page (tools/generate-notice-pages.py) already carries its
    // content in the static file: keep it on screen, just wire its buttons.
    // Firestore still re-checks it below, so an expired page still turns 404.
    const pre = window.__CJHQ_PRERENDER;
    if(pre && pre.slug === name){
      document.documentElement.classList.remove('route-pending');
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      document.getElementById('page-custom').classList.add('active');
      cjhqWireOnThisPage(document.getElementById('customPageBody'));
      highlightActiveNav(name);
      trackPageView();
      return;
    }
    document.getElementById('customPageTitle').innerHTML = '';
    document.getElementById('customPageBody').innerHTML =
      '<p class="route-loading"><span data-en>Loading…</span><span data-fr>Chargement…</span></p>';
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-custom').classList.add('active');
    return;
  }
  if(typeof show404 === 'function') show404(name, opts);
}
// Report a view to GA4 after the URL and the title are both settled. Wrapped
// so an ad blocker, an offline visitor or a failed gtag load can never break
// navigation - analytics must not be able to take the site down.
// Tracking links made in the admin look like cjhq.org/uci?r=facebook. On the
// first view only, the label is handed to GA4 as the visit's source (medium
// "cjhq_link", campaign = the page), which the admin's "Visits by tracking
// link" card reads. If the address already has any utm_ tag, it is left alone.
let CJHQ_TRK_DONE = false;
function trackedLocation(){
  const href = location.href;
  if(CJHQ_TRK_DONE) return href;
  CJHQ_TRK_DONE = true;
  try{
    const u = new URL(href);
    const r = (u.searchParams.get('r') || '').toLowerCase();
    if(!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(r) || [...u.searchParams.keys()].some(k => /^utm_/i.test(k))) return href;
    const path = u.pathname.length > 1 ? u.pathname.replace(/\/+$/, '') : '/';
    u.searchParams.set('utm_source', r);
    u.searchParams.set('utm_medium', 'cjhq_link');
    u.searchParams.set('utm_campaign', path);
    return u.toString();
  }catch(e){ return href; }
}
function trackPageView(){
  try{
    if(typeof gtag !== 'function') return;
    gtag('event', 'page_view', {
      page_title: document.title,
      page_location: trackedLocation(),
      page_path: location.pathname
    });
  }catch(e){ /* analytics is never allowed to break routing */ }
}

function updateUrlForPage(name){
  const path = pathForPage(name);
  if(location.pathname !== path){
    history.pushState({page:name}, '', path);
  }
  updatePageMeta(name);
  trackPageView();
}
const SPECIAL_INFO_COUNTRIES = [
  {
    id:'canada', name_en:'Canada', name_fr:'Canada', flag:'ca',
    lastVerified:'August 31, 2026',
    intro_en:'Etrogim, lulavim and other plant material are regulated when entering Canada. Requirements depend on the item, its country of origin and the time of year.',
    intro_fr:'Les etroguim, loulavim et autres produits v\u00e9g\u00e9taux sont r\u00e9glement\u00e9s \u00e0 l\u2019entr\u00e9e au Canada. Les exigences d\u00e9pendent de l\u2019article, de son pays d\u2019origine et de la p\u00e9riode de l\u2019ann\u00e9e.',
    before_en:['Check the exact item and its country of origin.',
               'Willow from Europe is not covered by the personal-use lulav provision.',
               'Check whether the authorized seasonal period applies.',
               'Declare plant material and food when required.',
               'Keep the item accessible for inspection.',
               'Recheck the current requirement shortly before departure.'],
    before_fr:['V\u00e9rifiez l\u2019article exact et son pays d\u2019origine.',
               'Le saule provenant d\u2019Europe n\u2019est pas vis\u00e9 par la disposition pour loulav \u00e0 usage personnel.',
               'V\u00e9rifiez si la p\u00e9riode saisonni\u00e8re autoris\u00e9e s\u2019applique.',
               'D\u00e9clarez les produits v\u00e9g\u00e9taux et alimentaires lorsque requis.',
               'Gardez l\u2019article accessible pour inspection.',
               'V\u00e9rifiez de nouveau l\u2019exigence peu avant le d\u00e9part.'],
    warning_en:'The Canadian personal-use provision for lulavim does not automatically apply to etrogim or to other holiday plants.',
    warning_fr:'La disposition canadienne pour les loulavim \u00e0 usage personnel ne s\u2019applique pas automatiquement aux etroguim ni aux autres plantes de f\u00eate.',
    official:[{ label_en:'CFIA \u2014 Directive D-14-03 (includes the lulav provision)',
                label_fr:'ACIA \u2014 Directive D-14-03 (contient la disposition pour loulav)', url:'https://inspection.canada.ca/en/plant-health/invasive-pests-and-plants/directives/horticulture/14-03' },
              { label_en:'CBSA \u2014 Bringing food, plant and animal products into Canada',
                label_fr:'ASFC \u2014 Apporter des aliments, v\u00e9g\u00e9taux et produits animaux au Canada', url:'https://www.cbsa-asfc.gc.ca/services/fpa-apa/bringing-apporter-fpa-eng.html' }]
  },
  {
    id:'united-states', name_en:'United States', name_fr:'\u00c9tats-Unis', flag:'us',
    lastVerified:'August 31, 2026',
    intro_en:'CBP issues guidance each year covering ethrogim, palm fronds, willow and myrtle. These items are inspected by CBP agriculture specialists, who make the admissibility decision.',
    intro_fr:'Le CBP publie chaque ann\u00e9e des directives visant les etroguim, palmes, saule et myrte. Ces articles sont inspect\u00e9s par des sp\u00e9cialistes en agriculture du CBP, qui d\u00e9cident de l\u2019admissibilit\u00e9.',
    before_en:['Ethrogim are admitted only through specified North Atlantic or Northern Pacific ports \u2014 confirm your airport or crossing first.',
               'Expect the container to be opened and the ethrog unwrapped for inspection.',
               'Willow from Europe is prohibited.',
               'Willow that is green, soft, or has sprouted buds is prohibited because it could grow.',
               'Declare the items and let the agriculture specialist decide.'],
    before_fr:['Les etroguim ne sont admis que par certains ports de l\u2019Atlantique Nord ou du Pacifique Nord \u2014 confirmez d\u2019abord votre a\u00e9roport ou poste frontalier.',
               'Attendez-vous \u00e0 ce que le contenant soit ouvert et l\u2019etrog d\u00e9ball\u00e9 pour inspection.',
               'Le saule provenant d\u2019Europe est interdit.',
               'Le saule vert, mou ou dont les bourgeons ont pouss\u00e9 est interdit, car il pourrait pousser.',
               'D\u00e9clarez les articles et laissez le sp\u00e9cialiste en agriculture d\u00e9cider.'],
    warning_en:'Not every U.S. airport or border crossing accepts ethrogim. Confirm your specific port before travelling.',
    warning_fr:'Tous les a\u00e9roports et postes frontaliers am\u00e9ricains n\u2019acceptent pas les etroguim. Confirmez votre point d\u2019entr\u00e9e avant de voyager.',
    official:[{ label_en:'CBP \u2014 Sukkot travel guidance', label_fr:'CBP \u2014 Directives de voyage pour Souccot', url:'https://www.cbp.gov/newsroom/national-media-release/cbp-reminds-travelers-sukkot-travel-guidance' },
              { label_en:'USDA APHIS \u2014 Traveling with agricultural products',
                label_fr:'USDA APHIS \u2014 Voyager avec des produits agricoles', url:'https://www.aphis.usda.gov/traveling-with-ag-products' }]
  },
  {
    id:'israel', name_en:'Israel', name_fr:'Isra\u00ebl', flag:'il',
    lastVerified:'',
    intro_en:'Israel has agricultural import controls covering plants and plant products. Requirements can depend on the item and its country of origin.',
    intro_fr:'Isra\u00ebl applique des contr\u00f4les d\u2019importation agricole visant les plantes et produits v\u00e9g\u00e9taux. Les exigences peuvent d\u00e9pendre de l\u2019article et de son pays d\u2019origine.',
    before_en:['Check the current requirement with the Israeli agricultural authorities before departure.',
               'Do not assume an item permitted in Canada or the United States is permitted in Israel.',
               'Check whether documentation or inspection is required for your specific item.'],
    before_fr:['V\u00e9rifiez l\u2019exigence en vigueur aupr\u00e8s des autorit\u00e9s agricoles isra\u00e9liennes avant le d\u00e9part.',
               'Ne pr\u00e9sumez pas qu\u2019un article permis au Canada ou aux \u00c9tats-Unis l\u2019est en Isra\u00ebl.',
               'V\u00e9rifiez si des documents ou une inspection sont requis pour votre article.'],
    warning_en:'CJHQ does not currently have a verified official link for Israel. Check the current requirements with the relevant Israeli authority before travelling.',
    warning_fr:'CJHQ n\u2019a pas actuellement de lien officiel v\u00e9rifi\u00e9 pour Isra\u00ebl. V\u00e9rifiez les exigences en vigueur aupr\u00e8s de l\u2019autorit\u00e9 isra\u00e9lienne comp\u00e9tente avant de voyager.',
    official:[]
  },
  {
    id:'united-kingdom', name_en:'United Kingdom', name_fr:'Royaume-Uni', flag:'gb',
    lastVerified:'August 31, 2026',
    intro_en:'Great Britain regulates plants and plant products entering from outside the EU. Depending on the item, a phytosanitary certificate may be required.',
    intro_fr:'La Grande-Bretagne r\u00e9glemente les plantes et produits v\u00e9g\u00e9taux en provenance de l\u2019ext\u00e9rieur de l\u2019UE. Selon l\u2019article, un certificat phytosanitaire peut \u00eatre exig\u00e9.',
    before_en:['Check the current rule for the exact item and its country of origin.',
               'Check whether a phytosanitary certificate is required.',
               'Check the rules for your specific point of entry.'],
    before_fr:['V\u00e9rifiez la r\u00e8gle en vigueur pour l\u2019article exact et son pays d\u2019origine.',
               'V\u00e9rifiez si un certificat phytosanitaire est requis.',
               'V\u00e9rifiez les r\u00e8gles de votre point d\u2019entr\u00e9e.'],
    warning_en:'Northern Ireland has different arrangements from Great Britain. Do not automatically apply Great Britain rules to Northern Ireland.',
    warning_fr:'L\u2019Irlande du Nord a des r\u00e8gles diff\u00e9rentes de celles de la Grande-Bretagne. N\u2019appliquez pas automatiquement les r\u00e8gles britanniques \u00e0 l\u2019Irlande du Nord.',
    official:[{ label_en:'GOV.UK \u2014 Bringing food into Great Britain',
                label_fr:'GOV.UK \u2014 Apporter des aliments en Grande-Bretagne', url:'https://www.gov.uk/bringing-food-into-great-britain' }]
  },
  {
    id:'european-union', name_en:'European Union', name_fr:'Union europ\u00e9enne', flag:'eu',
    lastVerified:'',
    intro_en:'The EU has strict plant-health rules for travellers. Plants, plant products, fruit and vegetables carried in passenger luggage from a non-EU country are generally subject to plant-health requirements and may require a phytosanitary certificate.',
    intro_fr:'L\u2019UE applique des r\u00e8gles phytosanitaires strictes pour les voyageurs. Les plantes, produits v\u00e9g\u00e9taux, fruits et l\u00e9gumes transport\u00e9s dans les bagages depuis un pays hors UE sont g\u00e9n\u00e9ralement soumis \u00e0 des exigences phytosanitaires et peuvent exiger un certificat phytosanitaire.',
    before_en:['Check the exact item and its country of origin.',
               'Check whether a phytosanitary certificate is required.',
               'Requirements and exemptions differ by item \u2014 verify before travelling.'],
    before_fr:['V\u00e9rifiez l\u2019article exact et son pays d\u2019origine.',
               'V\u00e9rifiez si un certificat phytosanitaire est requis.',
               'Les exigences et exemptions varient selon l\u2019article \u2014 v\u00e9rifiez avant de voyager.'],
    warning_en:'CJHQ does not currently have a verified official link for the EU. Check the current EU rules before travelling.',
    warning_fr:'CJHQ n\u2019a pas actuellement de lien officiel v\u00e9rifi\u00e9 pour l\u2019UE. V\u00e9rifiez les r\u00e8gles europ\u00e9ennes en vigueur avant de voyager.',
    official:[]
  }
];


const PAGE_META = {
  // Assembled verbatim from the 404 page's existing approved copy: the eyebrow
  // ("Page Not Found" / "Page introuvable") plus the first sentence of the body
  // paragraph. No new wording was written. The "— CJHQ" suffix matches every
  // other entry. Without this, a 404 inherited the previous page's title and
  // canonical - telling search engines an error page was a real one.
  'special-information': { en:'Special Information — Holidays, Travel & Local Information — CJHQ',
    fr:'Information spéciale — Fêtes, voyage et information locale — CJHQ',
    desc_en:'Practical CJHQ information for travelling around Yomim Tovim: what to check before crossing a border with holiday items, and links to the official government sources.',
    desc_fr:'Information pratique de CJHQ pour voyager autour des Yomim Tovim : quoi vérifier avant de traverser une frontière avec des articles de fête, et liens vers les sources gouvernementales officielles.' },
  'child-travel-consent': { en:'Child Travel Consent Letter — CJHQ', fr:'Lettre de consentement au voyage d\'un enfant — CJHQ',
                  desc_en:'Create a simple consent letter for your child\'s Canada-U.S. travel. Complete the form, generate your letter, then print and sign it.',
                  desc_fr:'Créez une lettre de consentement simple pour le voyage Canada-États-Unis de votre enfant. Remplissez le formulaire, générez la lettre, puis imprimez-la et signez-la.' },
  '404':        { en:'Page Not Found — CJHQ',                          fr:'Page introuvable — CJHQ',
                  desc_en:'The link you followed may be outdated, or the page may have moved.',
                  desc_fr:'Le lien que vous avez suivi est peut-être désuet, ou la page a été déplacée.' },
  home:         { en:'Jewish Hasidic Communities in Quebec | CJHQ', fr:'Communautés juives hassidiques du Québec | CJHQ',
                  desc_en:'Contact CJHQ for community assistance and advocacy in Quebec, including Montreal, Outremont and the Tosh community in Boisbriand.',
                  desc_fr:'Communiquez avec le CJHQ pour les communautés juives hassidiques du Québec, notamment à Montréal, Outremont et Tosh, à Boisbriand.' },
  resources:    { en:'Community Resource Centre — CJHQ',               fr:'Centre de ressources communautaires — CJHQ',
                  desc_en:'Government services, travel documents, NEXUS, border crossing, immigration, benefits, healthcare, and municipal resources for Quebec\'s Hasidic Jewish communities.',
                  desc_fr:'Services gouvernementaux, documents de voyage, NEXUS, passage frontalier, immigration, prestations familiales, soins de santé et ressources municipales.' },
  'stay-informed':{ en:'News & Updates — CJHQ',                        fr:'Actualités — CJHQ',
                  desc_en:'Official statements, public announcements, and community information updates from CJHQ — Quebec\'s Hasidic Jewish communities.',
                  desc_fr:'Déclarations officielles, annonces publiques et mises à jour communautaires du CJHQ.' },
  contact:      { en:'Contact CJHQ | Montreal & Quebec Hasidic Communities', fr:'Contacter le CJHQ | Communautés hassidiques de Montréal et du Québec',
                  desc_en:'Contact CJHQ about community matters in Montreal, Outremont or Tosh/Kiryas Tosh in Boisbriand. Inquiries and media requests welcome.',
                  desc_fr:'Contactez le CJHQ pour les questions communautaires hassidiques à Montréal, Outremont et Tosh (Kiryas Tosh), à Boisbriand, au Québec.' },
  about:        { en:'CJHQ | Hasidic Community Council for Montreal & Boisbriand', fr:'CJHQ | Conseil hassidique pour Montréal et Boisbriand',
                  desc_en:'CJHQ is a Jewish Hasidic community council serving Montreal, Outremont and Tosh (Kiryas Tosh) in Boisbriand, Quebec through assistance and advocacy.',
                  desc_fr:'Le CJHQ est un conseil communautaire juif hassidique au service de Montréal, d’Outremont et de Tosh (Kiryas Tosh) à Boisbriand, au Québec.' },
  privacy:      { en:'Privacy Policy — CJHQ',                          fr:'Politique de confidentialité — CJHQ',
                  desc_en:'Privacy Policy of the Jewish Hasidic Council of Quebec.',
                  desc_fr:'Politique de confidentialité du Conseil des Juifs Hassidiques du Québec.' },
  terms:        { en:'Terms of Use — CJHQ',                            fr:'Conditions d\'utilisation — CJHQ',
                  desc_en:'Terms of Use for the CJHQ website.',
                  desc_fr:'Conditions d\'utilisation du site Web du CJHQ.' },
  accessibility:{ en:'Accessibility Statement — CJHQ',                 fr:'Déclaration d\'accessibilité — CJHQ',
                  desc_en:'Accessibility Statement for the CJHQ website.',
                  desc_fr:'Déclaration d\'accessibilité du site Web du CJHQ.' },
};
function updatePageMeta(name){
  const isFr = document.documentElement.classList.contains('lang-fr');
  const meta = PAGE_META[name] || PAGE_META['home'];
  const title = isFr ? meta.fr : meta.en;
  const desc  = isFr ? meta.desc_fr : meta.desc_en;
  // For 404 the canonical must self-reference the URL the visitor actually
  // requested, not a fabricated "/404" path that serves nothing.
  // /fr/ is the home page served at its own URL. Without this branch,
  // pathForPage('home') returns '/' and this function would rewrite the French
  // page's canonical and og:url to the English homepage - telling Google the two
  // are the same page and collapsing /fr/ out of the index. The raw HTML is
  // correct; only this runtime update needed to respect the route.
  const resourceDetail = name === 'resources'
    && /^\/(?:fr\/ressources|resources)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(location.pathname)
    && RESOURCE_BY_SLUG[location.pathname.split('/').pop()];
  const url = (name === '404' || resourceDetail)
    ? (location.origin + location.pathname)
    : (location.origin + pathForPage(name, isFr ? 'fr' : 'en'));
  const detailTitle = resourceDetail ? ((isFr ? resourceDetail.fr : resourceDetail.en) + ' | CJHQ') : title;
  const detailDesc = resourceDetail ? (isFr ? resourceDetail.desc_fr : resourceDetail.desc_en) : desc;
  document.getElementById('pageTitle').textContent = detailTitle;
  document.title = detailTitle;
  const setMeta = (id, val) => { const el = document.getElementById(id); if(el) el.setAttribute('content', val); };
  setMeta('ogTitle', detailTitle);
  setMeta('ogDescription', detailDesc);
  setMeta('ogUrl', url);
  setMeta('twitterTitle', detailTitle);
  setMeta('twitterDescription', detailDesc);
  const canon = document.getElementById('canonicalTag');
  if(canon) canon.setAttribute('href', url);
  // Three cases, deliberately distinct:
  //   admin - noindex, nofollow. It ships that way in admin.html, but this
  //           function used to overwrite it with "index, follow" on load, so a
  //           JS-rendering crawler saw the opposite of what the file said.
  //           robots.txt already disallows /admin, but robots.txt is a request,
  //           not a control - the real protection is Firebase Auth and the
  //           Firestore rules. This restores the meta tag as defence in depth.
  //   404   - noindex, FOLLOW. Not a real URL, but its links are still worth
  //           crawling, so nofollow would be wrong here.
  //   everything else - index, follow, exactly as before.
  const robots = document.querySelector('meta[name="robots"]');
  if(robots){
    robots.setAttribute('content',
      name === 'admin' ? 'noindex, nofollow'
      : name === '404' || resourceDetail ? 'noindex, follow'
      : 'index, follow');
  }
  // Also update on lang switch
  document.querySelectorAll('meta[name="description"]').forEach(m => m.setAttribute('content', detailDesc));
}

// Footer "Subscribe" link. The Constant Contact form is injected
// asynchronously into an empty placeholder, so the old fixed 100ms timer
// scrolled to whatever height the placeholder happened to have at that
// instant, then drifted once the iframe rendered - landing roughly 60% down
// the page with the section heading off screen.
//
// Wait for the iframe to actually have height, then scroll to the card that
// wraps the form (so its lead-in paragraph stays visible) offset by the
// sticky header. Falls back to scrolling anyway if the widget never loads.
function goToSubscribeForm(){
  goPage('stay-informed');
  const holder = document.querySelector('.ctct-inline-form');
  if(!holder) return;
  const target = holder.closest('.card') || holder;
  const doScroll = () => {
    const header = document.querySelector('header');
    const offset = (header ? header.offsetHeight : 0) + 16;
    const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };
  const started = Date.now();
  (function waitForForm(){
    const frame = holder.querySelector('iframe');
    const ready = frame && frame.getBoundingClientRect().height > 40;
    if(ready || Date.now() - started > 4000){ doScroll(); return; }
    requestAnimationFrame(waitForForm);
  })();
}

function highlightActiveNav(name){
  document.querySelectorAll('#mainNav a').forEach(b=>{
    const on = b.dataset.page===name;
    b.classList.toggle('active', on);
    if(on) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
  });
  document.querySelectorAll('#mobileDrawerNav a').forEach(a=>{
    const on = a.dataset.page===name;
    a.classList.toggle('active', on);
    if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });
}
// Header and drawer nav items are real anchors so they are crawlable and
// support middle-click / modifier-click / "copy link address". Their hrefs are
// rewritten through the existing pathForPage() so a GitHub Pages project
// subpath keeps working. Plain left-clicks are intercepted for SPA routing;
// modifier and non-primary clicks fall through to the browser.
// Every internal link now carries data-page, not just the header nav: the brand
// mark, the footer quick links, the legal links and the "contact CJHQ" links in
// the no-results message. They were href="#" with an inline onclick, which meant
// no crawler could follow them and nobody could middle-click them.
function refreshInternalLinkHrefs(root){
  const scope = root || document;
  scope.querySelectorAll('a[data-page]').forEach(a=>{
    a.setAttribute('href', pathForPage(a.dataset.page));
  });
  // The subscribe button routes AND scrolls to the form, so it must not be
  // handled by the generic data-page listener - it carries its own attribute
  // purely so the href is real and crawlable.
  scope.querySelectorAll('a[data-href-page]').forEach(a=>{
    a.setAttribute('href', pathForPage(a.dataset.hrefPage));
  });
}
refreshInternalLinkHrefs();

// One delegated listener covers every data-page link, including any rendered
// later. The drawer keeps its own listener because it must also close itself.
document.addEventListener('click', (e)=>{
  const a = e.target.closest && e.target.closest('a[data-page]');
  if(!a) return;
  if(a.closest('#mobileDrawerNav')) return;
  if(a.classList.contains('nav-dropdown-trigger')) return;
  if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
  e.preventDefault();
  goPage(a.dataset.page);
});

// Nav dropdown: clicking "About" toggles the menu open/closed. Simple and
// reliable on purpose — no hover-to-reveal (fragile across trackpads/gaps)
// and no split click-target between the label and the caret.
(function initNavDropdown(){
  const dropdown = document.getElementById('aboutDropdown');
  if(!dropdown) return;
  const trigger = dropdown.querySelector('.nav-dropdown-trigger');
  trigger.addEventListener('click', (e)=>{
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  dropdown.querySelectorAll('.nav-dropdown-menu a').forEach(a=>{
    a.addEventListener('click', ()=>dropdown.classList.remove('open'));
  });
  document.addEventListener('click', (e)=>{
    if(!dropdown.contains(e.target)) dropdown.classList.remove('open');
  });
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape') dropdown.classList.remove('open');
  });
})();

// ---------- LANGUAGE ----------
function setLang(lang){
  document.documentElement.classList.toggle('lang-fr', lang==='fr');
  document.getElementById('btnEN').classList.toggle('active', lang==='en');
  document.getElementById('btnFR').classList.toggle('active', lang==='fr');
  document.getElementById('btnEN').textContent = 'EN';
  document.documentElement.lang = lang;
  const searchInput = document.getElementById('siteSearch');
  searchInput.placeholder = lang==='fr' ? searchInput.dataset.frPh : searchInput.dataset.enPh;
  const drawerEN = document.getElementById('drawerBtnEN'), drawerFR = document.getElementById('drawerBtnFR');
  if(drawerEN && drawerFR){
    drawerEN.classList.toggle('active', lang==='en');
    drawerFR.classList.toggle('active', lang==='fr');
    drawerEN.textContent = 'EN';
  }
  const drawerSearch = document.getElementById('drawerSearch');
  if(drawerSearch) drawerSearch.placeholder = lang==='fr' ? drawerSearch.dataset.frPh : drawerSearch.dataset.enPh;
  const resSearch = document.getElementById('resourceSearch');
  if(resSearch) resSearch.placeholder = lang==='fr' ? resSearch.dataset.frPh : resSearch.dataset.enPh;
  // Controls whose only label is an aria-label declare both languages on the
  // element, so one pass covers them and no per-control logic is added.
  document.querySelectorAll('[data-en-label]').forEach(el=>{
    el.setAttribute('aria-label', lang==='fr' ? (el.dataset.frLabel || el.dataset.enLabel) : el.dataset.enLabel);
  });
  translateCtctForm(lang);
  // Refresh per-page meta tags for the new language
  const activePage = document.querySelector('.page.active');
  if(activePage){
    const pageName = activePage.id.replace('page-','');
    if(typeof updatePageMeta === 'function') updatePageMeta(pageName);
  }
  // Modules that hold rendered text of their own - the consent letter preview
  // and its placeholders - listen for this. The listener existed but nothing
  // ever fired the event, so a language switch left that text in the old
  // language until the form was resubmitted.
  document.dispatchEvent(new CustomEvent('cjhq:langchange', { detail:{ lang } }));
}
// Translates the Constant Contact signup form's labels/notice/button between
// English and French. Stores each element's original English text in a
// data-attribute the first time it's seen, so switching back to English
// always restores the exact original — nothing is ever permanently
// overwritten. Runs on every language switch (not just to French), which
// is what makes the "stays French when switching back" bug impossible.
// Retries a few times since Constant Contact's widget can finish rendering
// at different times depending on network speed.
const CTCT_LABEL_TRANSLATIONS = {
  'Email': 'Courriel',
  'First Name': 'Prénom',
  'Last Name': 'Nom de famille',
  'Phone': 'Téléphone',
  'Email Lists': "Listes d'envoi",
};
const CTCT_LEGAL_MARKER = 'By submitting this form';
const CTCT_LEGAL_FR = 'En soumettant ce formulaire, vous consentez à recevoir des courriels promotionnels de la part de : CJHQ, 1040, avenue Van Horne, Outremont, QC, H2V 1J5, CA. Vous pouvez révoquer votre consentement à recevoir des courriels en tout temps en utilisant le lien de désabonnement SafeUnsubscribe®, situé au bas de chaque courriel. Les courriels sont gérés par Constant Contact.';
function translateCtctForm(lang){
  function apply(){
    document.querySelectorAll('label, legend, span, div, p, small, h4, h3').forEach(function(el){
      if(el.children.length > 0) return; // leaf text nodes only
      const text = el.textContent.trim();
      if(!el.dataset.ctctOriginalEn){
        const knownMatch = Object.keys(CTCT_LABEL_TRANSLATIONS).find(k => k.toLowerCase() === text.toLowerCase());
        if(knownMatch){
          el.dataset.ctctOriginalEn = knownMatch;
        } else if(text.indexOf(CTCT_LEGAL_MARKER) !== -1){
          el.dataset.ctctOriginalEn = text;
          el.dataset.ctctIsLegal = '1';
        }
      }
      if(el.dataset.ctctOriginalEn){
        if(lang === 'fr'){
          el.textContent = el.dataset.ctctIsLegal ? CTCT_LEGAL_FR : CTCT_LABEL_TRANSLATIONS[el.dataset.ctctOriginalEn];
        } else {
          el.textContent = el.dataset.ctctOriginalEn;
        }
      }
    });
    document.querySelectorAll("button,input[type='submit']").forEach(function(btn){
      const isInput = btn.tagName === 'INPUT';
      const current = (isInput ? btn.value : btn.innerHTML).trim();
      if(!btn.dataset.ctctOriginalEn && (current === 'Sign Up!' || current === "S'inscrire")){
        btn.dataset.ctctOriginalEn = 'Sign Up!';
      }
      if(btn.dataset.ctctOriginalEn){
        const newText = lang === 'fr' ? "S'inscrire" : btn.dataset.ctctOriginalEn;
        if(isInput) btn.value = newText; else btn.innerHTML = newText;
      }
    });
  }
  // Multiple attempts: the widget can render well after the language
  // switch, especially on a slower connection or first page load.
  // Cancel any pending attempts from a previous call first — otherwise a
  // stale retry from an earlier language switch can fire after this one
  // and silently revert the more recent, correct result.
  if(window.__ctctTranslateTimers){
    window.__ctctTranslateTimers.forEach(t => clearTimeout(t));
  }
  window.__ctctTranslateTimers = [800, 1800, 3000, 5000].map(delay => setTimeout(apply, delay));
}
// Persist ONLY on an explicit click. A geographic first-visit default is
// deliberately not written to storage, so "saved" always means "the visitor
// chose this" and never "we guessed this once".
function chooseLang(lang){
  const activePage = document.querySelector('.page.active');
  const pageName = activePage ? activePage.id.replace('page-','') : 'home';
  setLang(lang);
  try{ localStorage.setItem('cjhq_language', lang); }catch(e){}
  if(Object.prototype.hasOwnProperty.call(FRENCH_ROUTE_BY_PAGE, pageName)){
    const nextPath = pathForPage(pageName, lang);
    if(location.pathname !== nextPath) history.pushState({page:pageName}, '', nextPath);
    updatePageMeta(pageName);
  }
}
document.getElementById('btnEN').addEventListener('click', ()=>chooseLang('en'));
document.getElementById('btnFR').addEventListener('click', ()=>chooseLang('fr'));
document.getElementById('drawerBtnEN').addEventListener('click', ()=>chooseLang('en'));
document.getElementById('drawerBtnFR').addEventListener('click', ()=>chooseLang('fr'));

// Sync the toggle buttons, search placeholders and meta tags with whatever the
// head script already applied. The class and lang attribute are set before
// first paint; this only catches up the controls, so there is no flash.
setLang(window.__CJHQ_LANG === 'fr' ? 'fr' : 'en');

// ---------- MOBILE DRAWER ----------
(function initMobileDrawer(){
  const toggle = document.getElementById('mobileNavToggle');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('mobileDrawerOverlay');
  const header = document.querySelector('header');
  if(!toggle || !drawer) return;

  // The panel hangs off the bottom of the header, and the header is not a fixed
  // height: the brand mark is 112px on desktop and 64px below 860px, and French
  // labels can wrap. Measuring the rendered header keeps the panel attached
  // instead of relying on a magic number that breaks at some width.
  function setHeaderHeightVar(){
    if(!header) return;
    const h = Math.round(header.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--header-h', h + 'px');
  }
  setHeaderHeightVar();
  window.addEventListener('resize', setHeaderHeightVar);
  window.addEventListener('orientationchange', setHeaderHeightVar);
  // Late webfont loads change the header height after first paint.
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(setHeaderHeightVar);

  function openDrawer(){
    setHeaderHeightVar();
    drawer.classList.add('open');
    overlay.classList.add('open');
    toggle.setAttribute('aria-expanded','true');
    // The page behind is scroll-locked, but the panel itself still scrolls
    // because .mobile-drawer-inner has its own overflow.
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    toggle.setAttribute('aria-expanded','false');
    document.body.style.overflow = '';
  }
  function toggleDrawer(){
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  }

  // One control opens and closes it, so there is no separate close button to
  // duplicate the hamburger.
  toggle.addEventListener('click', toggleDrawer);
  overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e)=>{
    if(e.key === 'Escape' && drawer.classList.contains('open')){
      closeDrawer();
      toggle.focus();
    }
  });
  // Above the breakpoint the panel is irrelevant; make sure it cannot be left open.
  window.addEventListener('resize', ()=>{
    if(window.innerWidth > 860 && drawer.classList.contains('open')) closeDrawer();
  });

  document.querySelectorAll('#mobileDrawerNav a').forEach(a=>{
    a.addEventListener('click', (e)=>{
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      // A drawer link without data-page runs its own handler, so routing it
      // here as well would fire goPage(undefined) and cancel whatever that
      // handler was doing. It still closes the panel.
      if(!a.dataset.page){ closeDrawer(); return; }
      e.preventDefault();
      goPage(a.dataset.page);
      closeDrawer();
    });
  });
})();

// ---------- CONTACT FORM (verified server intake) ----------
// Replace the two deployment markers only after the server, secrets and
// Firestore rules are deployed and tested. Leaving them unset fails closed.
const CONTACT_INTAKE_URL = 'https://contact-intake-qu3jib66wa-ue.a.run.app';
const contactForm = document.getElementById('contactForm');
if(contactForm){
  const resetContactStatus = () => {
    const statusEl = document.getElementById('contactFormStatus');
    const successEl = document.getElementById('contactSuccess');
    if(statusEl){ statusEl.textContent = ''; statusEl.style.display = 'none'; }
    if(successEl) successEl.hidden = true;
  };
  resetContactStatus();
  window.addEventListener('pageshow', resetContactStatus);
  contactForm.addEventListener('submit', async function(e){
    e.preventDefault();
    const statusEl = document.getElementById('contactFormStatus');
    const btn = document.getElementById('contactSubmitBtn');
    const isFr = document.documentElement.classList.contains('lang-fr');
    btn.disabled = true;
    try {
      if(CONTACT_INTAKE_URL.startsWith('__') || !window.turnstile) throw new Error('intake unavailable');
      const plain = Object.fromEntries(new FormData(contactForm));
      plain.lang = isFr ? 'fr' : 'en';
      const response = await fetch(CONTACT_INTAKE_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify(plain)
      });
      if(!response.ok) throw new Error('intake rejected');
      const successEl = document.getElementById('contactSuccess');
      if(successEl) successEl.hidden = false;
      contactForm.reset();
    } catch(err) {
      statusEl.textContent = isFr
        ? 'Une erreur est survenue. Veuillez réessayer ou nous écrire directement à info@cjhq.org.'
        : 'Something went wrong. Please try again, or email us directly at info@cjhq.org.';
      statusEl.style.color = '#B3261E';
      statusEl.style.display = 'block';
      const successEl = document.getElementById('contactSuccess');
      if(successEl) successEl.hidden = true;
    } finally {
      if(window.turnstile) window.turnstile.reset();
      btn.disabled = false;
    }
  });
}


/* ================= CHILD TRAVEL CONSENT LETTER =================
   A self-contained utility. Everything happens in the browser: nothing is
   sent anywhere, nothing is written to Firestore, nothing is persisted, and
   the form values never touch the URL, analytics or the console. That matters
   here because the form collects a child's passport number.

   The PDF is written by hand rather than with a library. A text-only US Letter
   document needs no dependency, and adding one would mean a third-party script
   handling passport numbers - not a reasonable trade for a few hundred lines.
   ============================================================== */
(function initChildTravelConsent(){
  const form = document.getElementById('ctcForm');
  if(!form) return;

  const $ = (id) => document.getElementById(id);
  const isFr = () => document.documentElement.classList.contains('lang-fr');
  let direction = null;      // 'ca-us' | 'us-ca' | 'custom'
  let travelWith = null;     // 'parent' | 'adult'
  let roundTrip = false;     // return journey asserted, return date required
  let returnTouched = false; // don't clobber a return date the user chose
  let childSeq = 0;          // suffix generator for additional child blocks
  // Field ids of every child block, in the order they appear. The first child
  // keeps the original unsuffixed ids so the existing hints, error elements and
  // validation messages continue to address it unchanged.
  const childIds = [{ name:'ctcChildName', dob:'ctcChildDob' }];

  /* ---------- dates ---------- */
  // Local date as yyyy-mm-dd. Built from the device clock every time the tool
  // opens, never hard-coded and never cached, so the default rolls over daily.
  function todayISO(){
    const d = new Date();
    const p = (n) => String(n).padStart(2,'0');
    return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;
  }
  const MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  // yyyy-mm-dd -> "August 30, 2026" / "30 août 2026". Parsed as plain numbers,
  // not through Date(), so a timezone west of UTC cannot shift it a day back.
  function prettyDate(iso){
    if(!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
    const [y,m,d] = iso.split('-').map(Number);
    return isFr() ? `${d} ${MONTHS_FR[m-1]} ${y}` : `${MONTHS_EN[m-1]} ${d}, ${y}`;
  }

  function setDepartureDefault(){
    const dep = $('ctcDeparture');
    if(dep && !dep.value) dep.value = todayISO();
    syncReturnMin();
  }
  function syncReturnMin(){
    const dep = $('ctcDeparture'), ret = $('ctcReturn');
    if(!dep || !ret) return;
    ret.min = dep.value || '';
    // Only correct a return date the user has not chosen themselves.
    if(!returnTouched && ret.value && dep.value && ret.value < dep.value) ret.value = dep.value;
  }
  $('ctcDeparture').addEventListener('change', syncReturnMin);
  $('ctcReturn').addEventListener('change', ()=>{ returnTouched = true; });

  /* ---------- placeholders ---------- */
  // Every placeholder in this form is declared bilingually on the element, so
  // one pass keeps them all in the current language - including fields added
  // after load. Previously only the two country fields were handled, and only
  // when a direction button was clicked, so a language switch left them stale.
  function syncPlaceholders(root){
    (root || form).querySelectorAll('[data-ph-en]').forEach(el=>{
      el.placeholder = isFr() ? (el.dataset.phFr || el.dataset.phEn) : el.dataset.phEn;
    });
  }

  /* ---------- country picker: "Travelling to" ----------
     A searchable list rather than a free-text box. Nobody should scroll 240
     countries, and a half-typed name must never reach the letter, so the value
     the letter reads is written only when a country is actually chosen. The
     list is embedded in the page: no third-party widget, no CDN, no request.
     Each country carries both names; the one shown - and the one stored, since
     the letter prints it - follows the page language, while the search matches
     either name with accents ignored, so "Eta", "Etats" and "United States" all
     find the same country. */
  const CTC_COUNTRIES = [
    ['Afghanistan'], ['\u00c5land Islands','\u00celes \u00c5land'], ['Albania','Albanie'],
    ['Algeria','Alg\u00e9rie'], ['American Samoa','Samoa am\u00e9ricaines'], ['Andorra','Andorre'], ['Angola'],
    ['Anguilla'], ['Antigua & Barbuda','Antigua-et-Barbuda'], ['Argentina','Argentine'], ['Armenia','Arm\u00e9nie'],
    ['Aruba'], ['Australia','Australie'], ['Austria','Autriche'], ['Azerbaijan','Azerba\u00efdjan'], ['Bahamas'],
    ['Bahrain','Bahre\u00efn'], ['Bangladesh'], ['Barbados','Barbade'], ['Belarus','Bi\u00e9lorussie'],
    ['Belgium','Belgique'], ['Belize'], ['Benin','B\u00e9nin'], ['Bermuda','Bermudes'], ['Bhutan','Bhoutan'],
    ['Bolivia','Bolivie'], ['Bosnia & Herzegovina','Bosnie-Herz\u00e9govine'], ['Botswana'],
    ['Brazil','Br\u00e9sil'],
    ['British Indian Ocean Territory','Territoire britannique de l\u2019oc\u00e9an Indien'],
    ['British Virgin Islands','\u00celes Vierges britanniques'], ['Brunei'], ['Bulgaria','Bulgarie'],
    ['Burkina Faso'], ['Burundi'], ['Cambodia','Cambodge'], ['Cameroon','Cameroun'], ['Canada'],
    ['Cape Verde','Cap-Vert'], ['Cayman Islands','\u00celes Ca\u00efmans'],
    ['Central African Republic','R\u00e9publique centrafricaine'], ['Chad','Tchad'], ['Chile','Chili'],
    ['China','Chine'], ['Christmas Island','\u00cele Christmas'], ['Cocos (Keeling) Islands','\u00celes Cocos'],
    ['Colombia','Colombie'], ['Comoros','Comores'], ['Congo - Brazzaville','Congo-Brazzaville'],
    ['Congo - Kinshasa','Congo-Kinshasa'], ['Cook Islands','\u00celes Cook'], ['Costa Rica'],
    ['C\u00f4te d\u2019Ivoire'], ['Croatia','Croatie'], ['Cuba'], ['Cura\u00e7ao'], ['Cyprus','Chypre'],
    ['Czechia','Tch\u00e9quie'], ['Denmark','Danemark'], ['Djibouti'], ['Dominica','Dominique'],
    ['Dominican Republic','R\u00e9publique dominicaine'], ['Ecuador','\u00c9quateur'], ['Egypt','\u00c9gypte'],
    ['El Salvador','Salvador'], ['Equatorial Guinea','Guin\u00e9e \u00e9quatoriale'],
    ['Eritrea','\u00c9rythr\u00e9e'], ['Estonia','Estonie'], ['Eswatini'], ['Ethiopia','\u00c9thiopie'],
    ['Falkland Islands','\u00celes Malouines'], ['Faroe Islands','\u00celes F\u00e9ro\u00e9'], ['Fiji','Fidji'],
    ['Finland','Finlande'], ['France'], ['French Guiana','Guyane fran\u00e7aise'],
    ['French Polynesia','Polyn\u00e9sie fran\u00e7aise'], ['Gabon'], ['Gambia','Gambie'], ['Georgia','G\u00e9orgie'],
    ['Germany','Allemagne'], ['Ghana'], ['Gibraltar'], ['Greece','Gr\u00e8ce'], ['Greenland','Groenland'],
    ['Grenada','Grenade'], ['Guadeloupe'], ['Guam'], ['Guatemala'], ['Guernsey','Guernesey'],
    ['Guinea','Guin\u00e9e'], ['Guinea-Bissau','Guin\u00e9e-Bissau'], ['Guyana'], ['Haiti','Ha\u00efti'],
    ['Honduras'], ['Hong Kong SAR China','R.A.S. chinoise de Hong Kong'], ['Hungary','Hongrie'],
    ['Iceland','Islande'], ['India','Inde'], ['Indonesia','Indon\u00e9sie'], ['Iran'], ['Iraq','Irak'],
    ['Ireland','Irlande'], ['Isle of Man','\u00cele de Man'], ['Israel','Isra\u00ebl'], ['Italy','Italie'],
    ['Jamaica','Jama\u00efque'], ['Japan','Japon'], ['Jersey'], ['Jordan','Jordanie'], ['Kazakhstan'], ['Kenya'],
    ['Kiribati'], ['Kuwait','Kowe\u00eft'], ['Kyrgyzstan','Kirghizstan'], ['Laos'], ['Latvia','Lettonie'],
    ['Lebanon','Liban'], ['Lesotho'], ['Liberia'], ['Libya','Libye'], ['Liechtenstein'], ['Lithuania','Lituanie'],
    ['Luxembourg'], ['Macao SAR China','R.A.S. chinoise de Macao'], ['Madagascar'], ['Malawi'],
    ['Malaysia','Malaisie'], ['Maldives'], ['Mali'], ['Malta','Malte'], ['Marshall Islands','\u00celes Marshall'],
    ['Martinique'], ['Mauritania','Mauritanie'], ['Mauritius','Maurice'], ['Mayotte'], ['Mexico','Mexique'],
    ['Micronesia','Micron\u00e9sie'], ['Moldova','Moldavie'], ['Monaco'], ['Mongolia','Mongolie'],
    ['Montenegro','Mont\u00e9n\u00e9gro'], ['Montserrat'], ['Morocco','Maroc'], ['Mozambique'],
    ['Myanmar (Burma)','Myanmar (Birmanie)'], ['Namibia','Namibie'], ['Nauru'], ['Nepal','N\u00e9pal'],
    ['Netherlands','Pays-Bas'], ['New Caledonia','Nouvelle-Cal\u00e9donie'], ['New Zealand','Nouvelle-Z\u00e9lande'],
    ['Nicaragua'], ['Niger'], ['Nigeria'], ['Niue'], ['Norfolk Island','\u00cele Norfolk'],
    ['North Korea','Cor\u00e9e du Nord'], ['North Macedonia','Mac\u00e9doine du Nord'],
    ['Northern Mariana Islands','\u00celes Mariannes du Nord'], ['Norway','Norv\u00e8ge'], ['Oman'], ['Pakistan'],
    ['Palau','Palaos'], ['Palestinian Territories','Territoires palestiniens'], ['Panama'],
    ['Papua New Guinea','Papouasie-Nouvelle-Guin\u00e9e'], ['Paraguay'], ['Peru','P\u00e9rou'], ['Philippines'],
    ['Poland','Pologne'], ['Portugal'], ['Puerto Rico','Porto Rico'], ['Qatar'], ['R\u00e9union','La R\u00e9union'],
    ['Romania','Roumanie'], ['Russia','Russie'], ['Rwanda'], ['Samoa'], ['San Marino','Saint-Marin'],
    ['S\u00e3o Tom\u00e9 & Pr\u00edncipe','Sao Tom\u00e9-et-Principe'], ['Saudi Arabia','Arabie saoudite'],
    ['Senegal','S\u00e9n\u00e9gal'], ['Serbia','Serbie'], ['Seychelles'], ['Sierra Leone'],
    ['Singapore','Singapour'], ['Sint Maarten','Saint-Martin (partie n\u00e9erlandaise)'], ['Slovakia','Slovaquie'],
    ['Slovenia','Slov\u00e9nie'], ['Solomon Islands','\u00celes Salomon'], ['Somalia','Somalie'],
    ['South Africa','Afrique du Sud'], ['South Korea','Cor\u00e9e du Sud'], ['South Sudan','Soudan du Sud'],
    ['Spain','Espagne'], ['Sri Lanka'], ['St. Barth\u00e9lemy','Saint-Barth\u00e9lemy'],
    ['St. Helena','Sainte-H\u00e9l\u00e8ne'], ['St. Kitts & Nevis','Saint-Christophe-et-Ni\u00e9v\u00e8s'],
    ['St. Lucia','Sainte-Lucie'], ['St. Martin','Saint-Martin'],
    ['St. Pierre & Miquelon','Saint-Pierre-et-Miquelon'],
    ['St. Vincent & Grenadines','Saint-Vincent-et-les Grenadines'], ['Sudan','Soudan'], ['Suriname'],
    ['Sweden','Su\u00e8de'], ['Switzerland','Suisse'], ['Syria','Syrie'], ['Taiwan','Ta\u00efwan'],
    ['Tajikistan','Tadjikistan'], ['Tanzania','Tanzanie'], ['Thailand','Tha\u00eflande'],
    ['Timor-Leste','Timor oriental'], ['Togo'], ['Tokelau'], ['Tonga'],
    ['Trinidad & Tobago','Trinit\u00e9-et-Tobago'], ['Tunisia','Tunisie'], ['T\u00fcrkiye','Turquie'],
    ['Turkmenistan','Turkm\u00e9nistan'], ['Turks & Caicos Islands','\u00celes Turques-et-Ca\u00efques'], ['Tuvalu'],
    ['U.S. Virgin Islands','\u00celes Vierges des \u00c9tats-Unis'], ['Uganda','Ouganda'], ['Ukraine'],
    ['United Arab Emirates','\u00c9mirats arabes unis'], ['United Kingdom','Royaume-Uni'],
    ['United States','\u00c9tats-Unis'], ['Uruguay'], ['Uzbekistan','Ouzb\u00e9kistan'], ['Vanuatu'],
    ['Vatican City','\u00c9tat de la Cit\u00e9 du Vatican'], ['Venezuela'], ['Vietnam','Vi\u00eat Nam'],
    ['Wallis & Futuna','Wallis-et-Futuna'], ['Western Sahara','Sahara occidental'], ['Yemen','Y\u00e9men'],
    ['Zambia','Zambie'], ['Zimbabwe'],
  ];

  // Accent- and case-insensitive folding, so "Eta" matches "Etats-Unis" and
  // "reunion" matches "Reunion".
  const ctcFold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // Assigned by the pickers below; leaving the custom direction clears both.
  const ctcCountryResets = [];
  const ctcResetCountry = function(){ ctcCountryResets.forEach(function(f){ f(); }); };

  // Both country fields are the same control, so they are the same code. The
  // only difference between them is the id prefix, which is why this is a
  // factory rather than a second copy: a fix to one is a fix to both.
  function ctcCountryPicker(which){
    const ID = (suffix) => 'ctc' + which + 'Country' + suffix;
    let reset = function(){};

    const input = $(ID('Search'));
    const list  = $(ID('List'));
    const store = $(ID(''));
    const otherWrap = $(ID('OtherWrap'));
    const otherIn   = $(ID('Other'));
    if(!input || !list || !store || !otherWrap || !otherIn) return;

    const MAXSHOWN = 8;
    let items = [], active = -1, mode = '', chosenIdx = -1;

    const nameOf = (c) => (isFr() ? (c[1] || c[0]) : c[0]);
    const otherLabel = () => isFr() ? 'Autre (pays non listé)' : 'Other (country not listed)';

    const close = () => {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };

    const setActive = (i) => {
      active = i;
      [...list.children].forEach((li, n) => li.setAttribute('aria-selected', String(n === i)));
      if(i >= 0){
        input.setAttribute('aria-activedescendant', ID('Opt') + i);
        const li = list.children[i];
        if(li && li.scrollIntoView) li.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    };

    function open(q){
      const f = ctcFold(q);
      let hits = f
        ? CTC_COUNTRIES.filter(c => ctcFold(c[0]).indexOf(f) > -1 || ctcFold(c[1] || c[0]).indexOf(f) > -1)
        : CTC_COUNTRIES.slice();
      // Names that START with what was typed come first, so "Uni" offers United
      // Kingdom and United States before Tunisia.
      if(f) hits.sort((a, b) => {
        const sa = ctcFold(nameOf(a)).indexOf(f) === 0 ? 0 : 1;
        const sb = ctcFold(nameOf(b)).indexOf(f) === 0 ? 0 : 1;
        return sa !== sb ? sa - sb : nameOf(a).localeCompare(nameOf(b), isFr() ? 'fr' : 'en');
      });
      items = hits.slice(0, MAXSHOWN).map(c => ({ label: nameOf(c), idx: CTC_COUNTRIES.indexOf(c) }));
      items.push({ label: otherLabel(), other: true });
      list.innerHTML = items.map((it, i) =>
        '<li role="option" id="ctcToCountryOpt' + i + '" data-i="' + i +
        '" class="ctc-combo-opt' + (it.other ? ' ctc-combo-opt-other' : '') +
        '" aria-selected="false">' + cjhqEscapeHtml(it.label) + '</li>').join('');
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      setActive(-1);
    }

    function exitOther(){
      mode = '';
      otherWrap.hidden = true;
      otherIn.value = '';
      input.readOnly = false;
      store.dataset.focusProxy = ID('Search');
    }

    function enterOther(){
      mode = 'other';
      chosenIdx = -1;
      input.value = otherLabel();
      input.readOnly = true;
      otherWrap.hidden = false;
      store.value = otherIn.value.trim();
      store.dataset.focusProxy = ID('Other');
      close();
      otherIn.focus();
    }

    function pick(i){
      const it = items[i];
      if(!it) return;
      if(it.other){ enterOther(); return; }
      exitOther();
      mode = 'list';
      chosenIdx = it.idx;
      input.value = it.label;
      store.value = it.label;
      hideError(ID(''));
      close();
    }

    input.addEventListener('input', ()=>{
      if(input.readOnly) return;
      // Typing again abandons the previous choice: the stored value is cleared
      // so a name left half-typed can never be treated as a country.
      mode = ''; chosenIdx = -1; store.value = '';
      open(input.value);
    });
    input.addEventListener('focus', ()=>{ if(!input.readOnly && list.hidden) open(input.value); });
    // In "Other" mode the box is read-only and shows the Other label; clicking
    // it is how the user goes back to the list.
    input.addEventListener('mousedown', ()=>{
      if(input.readOnly){ exitOther(); input.value = ''; store.value = ''; setTimeout(()=>open(''), 0); }
    });
    input.addEventListener('keydown', (e)=>{
      if(input.readOnly){
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); exitOther(); input.value = ''; store.value = ''; open(''); }
        return;
      }
      if(e.key === 'ArrowDown'){ e.preventDefault(); if(list.hidden) open(input.value); setActive(Math.min(active + 1, items.length - 1)); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); if(!list.hidden) setActive(Math.max(active - 1, 0)); }
      else if(e.key === 'Home' && !list.hidden){ e.preventDefault(); setActive(0); }
      else if(e.key === 'End' && !list.hidden){ e.preventDefault(); setActive(items.length - 1); }
      else if(e.key === 'Enter'){ if(!list.hidden){ e.preventDefault(); pick(active >= 0 ? active : 0); } }
      else if(e.key === 'Escape'){ if(!list.hidden){ e.preventDefault(); close(); } }
      else if(e.key === 'Tab'){ close(); }
    });
    // pointerdown fires before the input's blur, so a tap on a phone and a
    // click on a desktop both land on the option instead of closing the list.
    list.addEventListener('pointerdown', (e)=>{
      const li = e.target.closest('[data-i]');
      if(!li) return;
      e.preventDefault();
      pick(Number(li.dataset.i));
    });
    input.addEventListener('blur', ()=>{
      setTimeout(()=>{
        if(document.activeElement === input || list.contains(document.activeElement)) return;
        close();
        // Nothing chosen: leave the box showing what is actually stored rather
        // than free text the letter will not use.
        if(mode === '') input.value = '';
      }, 120);
    });
    otherIn.addEventListener('input', ()=>{
      store.value = otherIn.value.trim();
      if(store.value) hideError(ID(''));
    });

    // A language switch re-labels the chosen country and the Other option, and
    // restores what is stored in the new language, because the letter prints it.
    document.addEventListener('cjhq:langchange', ()=>{
      if(mode === 'list' && chosenIdx > -1){
        const n = nameOf(CTC_COUNTRIES[chosenIdx]);
        input.value = n; store.value = n;
      } else if(mode === 'other'){
        input.value = otherLabel();
      }
      if(!list.hidden) open(input.readOnly ? '' : input.value);
    });

    // Leaving the custom direction clears the picker with the rest of the form.
    reset = function(){
      exitOther();
      mode = ''; chosenIdx = -1;
      input.value = ''; store.value = '';
      close();
    };
    ctcCountryResets.push(function(){ reset(); });
  }
  ctcCountryPicker('To');
  ctcCountryPicker('From');

  /* ---------- direction ---------- */
  // Who the child travels with: switches the exact letter wording, the
  // signature blocks and whether the accompanying-adult section applies.
  document.querySelectorAll('.ctc-with-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      travelWith = btn.dataset.with;
      document.querySelectorAll('.ctc-with-btn').forEach(b=>b.setAttribute('aria-checked', String(b===btn)));
      hideError('travelWith');
      hideError('ctcParent2Name');
    });
  });

  // Selecting on [data-dir] rather than :not(.ctc-with-btn) keeps the Round
  // Trip toggle - which is not a direction - out of this radio group.
  document.querySelectorAll('.ctc-dir-btn[data-dir]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      direction = btn.dataset.dir;
      document.querySelectorAll('.ctc-dir-btn[data-dir]').forEach(b=>b.setAttribute('aria-checked', String(b===btn)));
      hideError('direction');
      // "Other countries" reveals the two country pickers. They are only
      // required while that option is selected, and both store their value in
      // a hidden input, so focus goes to the visible search box.
      const cd = $('ctcCustomDir');
      const custom = direction === 'custom';
      cd.hidden = !custom;
      if(custom){
        syncPlaceholders();
        const first = $('ctcFromCountrySearch') || $('ctcFromCountry');
        if(first) first.focus();
      }else{
        ctcResetCountry();
        hideError('ctcFromCountry'); hideError('ctcToCountry');
      }
    });
  });

  /* ---------- round trip ---------- */
  // Round Trip is a separate yes/no choice, not a fourth direction: it says the
  // child is coming back, which makes the return date meaningful and required
  // and puts the return leg into the letter.
  const roundBox = $('ctcRoundTrip');
  if(roundBox) roundBox.addEventListener('change', ()=>{
    roundTrip = roundBox.checked;
    const req = $('ctcReturnReq');
    if(req) req.hidden = !roundTrip;
    if(!roundTrip) hideError('ctcReturn');
  });


  /* ---------- validation ---------- */
  const MSG = {
    ctcChildName:     ['Please enter the child\u2019s full name.','Veuillez saisir le nom complet de l\u2019enfant.'],
    ctcChildDob:      ['Please select the child\u2019s date of birth.','Veuillez choisir la date de naissance de l\u2019enfant.'],
    ctcAdultName:     ['Please enter the accompanying adult\u2019s full name.','Veuillez saisir le nom complet de l\u2019adulte accompagnateur.'],
    ctcAdultRel:      ['Please enter the relationship to the child.','Veuillez pr\u00e9ciser le lien avec l\u2019enfant.'],
    ctcAdultPhone:    ['Please enter a phone number.','Veuillez saisir un num\u00e9ro de t\u00e9l\u00e9phone.'],
    ctcParentName:    ['Please enter your full name.','Veuillez saisir votre nom complet.'],
    ctcParentAddress: ['Please enter your address.','Veuillez saisir votre adresse.'],
    ctcParentPhone:   ['Please enter a phone number.','Veuillez saisir un num\u00e9ro de t\u00e9l\u00e9phone.'],
    ctcDeparture:     ['Please select a departure date.','Veuillez choisir une date de d\u00e9part.'],
    ctcReturn:        ['Please select a return date.','Veuillez choisir une date de retour.'],
    direction:        ['Please choose a travel direction.','Veuillez choisir le sens du voyage.'],
    travelWith:       ['Please choose who the child is travelling with.','Veuillez indiquer avec qui l\u2019enfant voyage.'],
    ctcParent2Name:   ['Please enter the second parent or guardian\u2019s full name.','Veuillez saisir le nom complet du second parent ou tuteur.'],
    ctcFromCountry:   ['Please enter the country you are travelling from.','Veuillez saisir le pays de d\u00e9part.'],
    ctcToCountry:     ['Please enter the country you are travelling to.','Veuillez saisir le pays d\u2019arriv\u00e9e.'],
    returnBefore:     ['The return date cannot be earlier than the departure date.','La date de retour ne peut pas pr\u00e9c\u00e9der la date de d\u00e9part.']
  };
  // Additional child blocks carry a numeric suffix on their ids; they reuse the
  // message of the base field rather than duplicating it per child.
  const t = (k) => (MSG[k] || MSG[String(k).replace(/\d+$/,'')])[isFr() ? 1 : 0];

  // A field may delegate its visible presence to another control.
  const focusProxy = (el) => (el && el.dataset && el.dataset.focusProxy) ? $(el.dataset.focusProxy) : null;

  function showError(key, msgKey){
    const el = $('err-' + key);
    if(el){ el.textContent = t(msgKey || key); el.hidden = false; }
    const field = $(key);
    if(field){ field.setAttribute('aria-invalid','true'); field.setAttribute('aria-describedby','err-'+key); }
    // The country picker keeps its value in a hidden input, so the red border
    // and the focus have to go to the search box the visitor can actually see.
    const px = focusProxy(field);
    if(px) px.setAttribute('aria-invalid','true');
  }
  function hideError(key){
    const el = $('err-' + key);
    if(el) el.hidden = true;
    const field = $(key);
    if(field){ field.removeAttribute('aria-invalid'); field.removeAttribute('aria-describedby'); }
    const px = focusProxy(field);
    if(px) px.removeAttribute('aria-invalid');
  }
  // Only these six are mandatory. Everything else is genuinely optional and
  // is simply left unmarked - the form never uses the word "optional".
  const REQUIRED = ['ctcAdultName',
    'ctcParentName','ctcParentPhone',
    'ctcDeparture'];
  // The child fields are required too, but there can be more than one child, so
  // they are derived from the current blocks rather than listed here.
  const childRequired = () => childIds.reduce((a,c)=> a.concat([c.name, c.dob]), []);

  function validate(){
    let firstBad = null;
    REQUIRED.forEach(hideError);
    childRequired().forEach(hideError);
    hideError('direction');
    hideError('ctcReturn');
    $('ctcSummaryErr').hidden = true;

    if(!travelWith){ showError('travelWith'); firstBad = firstBad || document.querySelector('.ctc-with-btn'); }
    if(!direction){ showError('direction'); firstBad = firstBad || document.querySelector('.ctc-dir-btn[data-dir]'); }
    if(direction === 'custom'){
      ['ctcFromCountry','ctcToCountry'].forEach(id=>{
        hideError(id);
        if(!$(id).value.trim()){ showError(id); firstBad = firstBad || focusProxy($(id)) || $(id); }
      });
    }
    // Travelling alone hides the accompanying-adult section, so requiring that
    // name would produce an error against a field the user cannot see or fill.
    REQUIRED.concat(childRequired()).forEach(id=>{
      const el = $(id);
      if(el && !el.value.trim()){ showError(id); firstBad = firstBad || el; }
    });
    const dep = $('ctcDeparture').value, ret = $('ctcReturn').value;
    // Round Trip asserts a return journey in the letter, so the date it is
    // built from has to be there.
    if(roundTrip && !ret){ showError('ctcReturn'); firstBad = firstBad || $('ctcReturn'); }
    else if(dep && ret && ret < dep){ showError('ctcReturn','returnBefore'); firstBad = firstBad || $('ctcReturn'); }

    if(firstBad){
      const s = $('ctcSummaryErr');
      s.textContent = isFr()
        ? 'Veuillez remplir les champs indiqu\u00e9s ci-dessous.'
        : 'Please complete the fields marked below.';
      s.hidden = false;
      firstBad.focus();
      firstBad.scrollIntoView({block:'center', behavior:'smooth'});
      return false;
    }
    return true;
  }

  /* ---------- additional children ---------- */
  // One consent letter can cover siblings travelling together. Each extra child
  // is the same pair of fields with a numeric suffix on every id, so the hints,
  // error elements and validation all work exactly as they do for the first.
  const childList = $('ctcChildList');
  const addChildBtn = $('ctcAddChild');

  function renumberChildren(){
    const blocks = childList ? [...childList.querySelectorAll('.ctc-child')] : [];
    blocks.forEach((b, i)=>{
      const num = b.querySelector('.ctc-child-num');
      if(num){
        num.innerHTML = '<span data-en>Child ' + (i+1) + '</span><span data-fr>Enfant ' + (i+1) + '</span>';
      }
    });
    // The label on the only child block reads plainly; once there are siblings
    // each block is numbered so an error points somewhere unambiguous.
    blocks.forEach(b=>{ const h = b.querySelector('.ctc-child-head'); if(h) h.hidden = blocks.length < 2; });
  }

  function addChild(){
    if(!childList) return;
    childSeq += 1;
    const n = childSeq;
    const nameId = 'ctcChildName' + n, dobId = 'ctcChildDob' + n;
    const wrap = document.createElement('div');
    wrap.className = 'ctc-child';
    wrap.dataset.child = String(n);
    wrap.innerHTML =
      '<div class="ctc-child-head">' +
        '<span class="ctc-child-num"></span>' +
        '<button type="button" class="ctc-child-remove"><span data-en>Remove</span><span data-fr>Retirer</span></button>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="' + nameId + '"><span data-en>Child\'s First and Last Name</span><span data-fr>Pr\u00e9nom et nom de l\'enfant</span> <abbr class="ctc-req" title="required">*</abbr></label>' +
        '<p class="ctc-hint ctc-field-hint" id="hint-' + nameId + '"><span data-en>Enter the child\'s full legal name (first and last name)</span><span data-fr>Entrez le nom l\u00e9gal complet de l\'enfant (pr\u00e9nom et nom de famille)</span></p>' +
        '<input type="text" id="' + nameId + '" aria-describedby="hint-' + nameId + '" autocomplete="off" data-ph-en="First and Last Name" data-ph-fr="Pr\u00e9nom et nom">' +
        '<p class="ctc-err" id="err-' + nameId + '" hidden></p>' +
      '</div>' +
      '<div class="form-group">' +
        '<label for="' + dobId + '"><span data-en>Date of Birth</span><span data-fr>Date de naissance</span> <abbr class="ctc-req" title="required">*</abbr></label>' +
        '<p class="ctc-hint ctc-field-hint" id="hint-' + dobId + '"><span data-en>Enter the child\'s date of birth</span><span data-fr>Entrez la date de naissance de l\'enfant</span></p>' +
        '<input type="date" id="' + dobId + '" aria-describedby="hint-' + dobId + '">' +
        '<p class="ctc-err" id="err-' + dobId + '" hidden></p>' +
      '</div>';
    childList.appendChild(wrap);
    childIds.push({ name:nameId, dob:dobId });
    syncPlaceholders(wrap);
    wrap.querySelector('.ctc-child-remove').addEventListener('click', ()=>{
      const i = childIds.findIndex(c => c.name === nameId);
      if(i >= 0) childIds.splice(i, 1);
      wrap.remove();
      renumberChildren();
    });
    renumberChildren();
    $(nameId).focus();
  }
  if(addChildBtn) addChildBtn.addEventListener('click', addChild);
  renumberChildren();

  /* ---------- gather ---------- */
  // A blank form is the same document with every value replaced by a rule to
  // write on. Reusing the real builder means the printed layout, wording and
  // page size can never drift from the filled-in version.
  // Inline blanks inside the declaration sentence. Shorter than a standalone
  // field line because every value they ask for also has a full-width line of
  // its own in the structured sections below, and because the sentence has to
  // stay on one page. Used only by the blank form.
  const FILL = '\u00a0'.repeat(2) + '_'.repeat(20);
  function blankData(){
    return { blank:true, dir:direction || '', roundTrip:false, travelWith: travelWith || 'adult', parent2Name:'',
      fromCountry:'', toCountry:'',
      children:[{name:'', dob:''}],
      childName:'', childDob:'',
      adultName:'', adultRel:'', adultPhone:'', adultEmail:'',
      parentName:'', parentAddress:'', parentPhone:'', parentEmail:'',
      departure:'', ret:'' };
  }

  function collect(){
    const v = (id) => $(id).value.trim();
    // Blocks the user emptied and left behind are dropped, so a stray blank
    // pair can never print an empty child on the letter.
    const children = childIds
      .map(c => ({ name: $(c.name) ? v(c.name) : '', dob: $(c.dob) ? v(c.dob) : '' }))
      .filter(c => c.name || c.dob);
    return {
      dir: direction,
      roundTrip,
      travelWith, parent2Name: v('ctcParent2Name'),
      fromCountry: v('ctcFromCountry'), toCountry: v('ctcToCountry'),
      children,
      // First child kept flat: the download file name and any older reader of
      // this object keep working unchanged.
      childName: v('ctcChildName'), childDob: v('ctcChildDob'),

      adultName: v('ctcAdultName'), adultRel: v('ctcAdultRel'),
      adultPhone: v('ctcAdultPhone'), adultEmail: v('ctcAdultEmail'),
      parentName: v('ctcParentName'), parentAddress: v('ctcParentAddress'),
      parentPhone: v('ctcParentPhone'), parentEmail: v('ctcParentEmail'),
      departure: v('ctcDeparture'), ret: v('ctcReturn')
    };
  }

  /* ---------- letter copy ---------- */
  function L(d){
    const fr = isFr();
    // In blank mode every interpolated value becomes a rule to write on.
    const B = (v) => d.blank ? FILL : v;
    // A blank form with no direction chosen must not assert one: the ternary
    // would otherwise fall through to United States -> Canada and print it as
    // fact. Leave both countries as rules to complete by hand.
    const fromTo = (d.blank && !d.dir)
      ? [FILL, FILL]
      : d.dir === 'custom'
        // Free-text countries: print exactly what was entered, with the French
        // preposition that works for any country name.
        ? (fr ? [`de ${d.fromCountry}`, `vers ${d.toCountry}`] : [d.fromCountry, d.toCountry])
        : fr
          ? (d.dir==='ca-us' ? ['du Canada','aux \u00c9tats-Unis'] : ['des \u00c9tats-Unis','au Canada'])
          : (d.dir==='ca-us' ? ['Canada','the United States'] : ['the United States','Canada']);
    let dirLine = d.dir === 'custom'
      ? (fr ? `Sens du voyage : ${d.fromCountry} \u2192 ${d.toCountry}`
            : `Travel Direction: ${d.fromCountry} \u2192 ${d.toCountry}`)
      : fr
        ? (d.dir==='ca-us' ? 'Sens du voyage : Canada \u2192 \u00c9tats-Unis' : 'Sens du voyage : \u00c9tats-Unis \u2192 Canada')
        : (d.dir==='ca-us' ? 'Travel Direction: Canada \u2192 United States' : 'Travel Direction: United States \u2192 Canada');
    // Round Trip is stated on the direction line rather than replacing it: the
    // countries are still the outbound leg, the return journey is the addition.
    if(d.roundTrip) dirLine += fr ? ' (aller-retour)' : ' (Round Trip)';
    // Blank form with no direction chosen: print both so it can be ticked by hand.
    if(d.blank && !d.dir){
      // Square-box characters are not in WinAnsi and printed as "?" in the PDF.
      // Plain brackets render everywhere and are just as clear to tick.
      dirLine = fr
        ? 'Sens du voyage :   [  ] Canada \u2192 \u00c9tats-Unis      [  ] \u00c9tats-Unis \u2192 Canada'
        : 'Travel Direction:   [  ] Canada \u2192 United States      [  ] United States \u2192 Canada';
    }
    // Exact supplied wording. Only the bracketed values are substituted and the
    // correct variant chosen from: travel direction, who the child travels
    // with, whether a return date exists, and whether a relationship was given.
    const hasReturn = d.blank ? true : (!!d.ret || d.roundTrip);
    const retDate   = d.blank ? FILL : prettyDate(d.ret);
    const depDate   = d.blank ? FILL : prettyDate(d.departure);
    const origin    = fromTo[0];
    const destCtry  = fromTo[1];
    const who       = d.travelWith || 'adult';
    const rel       = (d.adultRel || '').trim();

    // One letter can cover siblings travelling together. Every child is named
    // with their own date of birth, and the surrounding wording moves to the
    // plural - in both languages - once there is more than one.
    const kids = (d.children && d.children.length) ? d.children : [{ name:d.childName, dob:d.childDob }];
    const many = kids.length > 1;
    // "A, born X, and B, born Y" / "A, ne(e) le X, et de B, ne(e) le Y"
    const kidPhrase = kids.map(c => fr
        ? `${B(c.name)}, n\u00e9(e) le ${d.blank ? FILL : prettyDate(c.dob)}`
        : `${B(c.name)}, born ${d.blank ? FILL : prettyDate(c.dob)}`)
      .reduce((acc, part, i, arr) => {
        if(i === 0) return part;
        const joiner = (i === arr.length - 1) ? (fr ? ' et de ' : ', and ') : (fr ? ', de ' : ', ');
        return acc + joiner + part;
      }, '');
    const guardianOf = fr ? 'parent ou tuteur l\u00e9gal de ' : 'am the parent/legal guardian of ';
    const consentEn   = many ? 'my children to travel' : 'my child to travel';
    const consentFr   = many ? 'mes enfants voyagent' : 'mon enfant voyage';
    const withChildEn = many ? 'the children' : 'the child';
    const withChildFr = many ? 'les enfants' : 'l\u2019enfant';

    // Round-trip clause, appended only when a return date exists.
    const tripEn = hasReturn
      ? ` from ${depDate} through ${retDate}, including the return journey from ${destCtry} back to ${origin}`
      : '';
    const tripFr = hasReturn
      ? ` du ${depDate} au ${retDate}, y compris le voyage de retour depuis ${destCtry} vers ${origin}`
      : '';
    const bothEn = hasReturn ? ' for both the outbound and return journey of the above-mentioned trip'
                             : ' for the above-mentioned trip';
    const bothFr = hasReturn ? ' pour l\u2019aller et le retour du voyage mentionn\u00e9 ci-dessus'
                             : ' pour le voyage mentionn\u00e9 ci-dessus';

    let body;
      const companion = B(d.adultName);
      // "accompanying parent" when the child travels with a parent, otherwise
      // "accompanying adult" - and the relationship only appears if supplied.
      const authEn = who === 'parent'
        ? `I authorize the accompanying parent to travel with ${withChildEn}${bothEn}.`
        : (rel && !d.blank
            ? `I authorize ${companion}, ${rel}, to travel with ${withChildEn}${bothEn}.`
            : `I authorize the accompanying adult to travel with ${withChildEn}${bothEn}.`);
      const authFr = who === 'parent'
        ? `J\u2019autorise le parent accompagnateur \u00e0 voyager avec ${withChildFr}${bothFr}.`
        : (rel && !d.blank
            ? `J\u2019autorise ${companion}, ${rel}, \u00e0 voyager avec ${withChildFr}${bothFr}.`
            : `J\u2019autorise l\u2019adulte accompagnateur \u00e0 voyager avec ${withChildFr}${bothFr}.`);
      body = fr
        ? [`Je soussign\u00e9(e), ${B(d.parentName)}, ${guardianOf}${kidPhrase}, consens \u00e0 ce que ${consentFr} de ${origin} \u00e0 ${destCtry} avec ${companion}${tripFr}.`,
           authFr]
        : [`I, ${B(d.parentName)}, ${guardianOf}${kidPhrase}, and give my consent for ${consentEn} from ${origin} to ${destCtry} with ${companion}${tripEn}.`,
           authEn];

    /* ---- labelled view of the declaration, for the blank form only ----------
       The blank form must not ask anyone to decode "from ___ to ___ with ___
       from ___ through ___". The legal sentence is NOT rewritten: it is split
       into the exact same words plus its blanks, and each blank carries a small
       caption naming what belongs in it. The assertion below re-joins the
       segments and compares them with the legal string that ships in `body`; if
       they ever diverge the labelled view is dropped rather than shown wrong. */
    let bodySegs = null;
    if(d.blank){
      const LBL = fr
        ? { parent:'parent ou tuteur', child:'nom de l\u2019enfant', dob:'date de naissance',
            from:'d\u00e9part de (lieu)', to:'destination (lieu)', adult:'accompagn\u00e9 par',
            dep:'date de d\u00e9part', ret:'date de retour' }
        : { parent:'parent / guardian', child:'child\u2019s full name', dob:'date of birth',
            from:'departure from (place)', to:'travelling to (place)', adult:'accompanied by',
            dep:'departure date', ret:'return date' };
      const T = t => ({ t });
      const S = (v, lab) => (v === FILL ? { blank:true, lab } : { t:String(v) });
      const kidSegs = [];
      kids.forEach((c, i) => {
        if(i > 0) kidSegs.push(T((i === kids.length - 1) ? (fr ? ' et de ' : ', and ') : (fr ? ', de ' : ', ')));
        kidSegs.push(S(B(c.name), LBL.child));
        kidSegs.push(T(fr ? ', n\u00e9(e) le ' : ', born '));
        kidSegs.push(S(d.blank ? FILL : prettyDate(c.dob), LBL.dob));
      });
      const trip = [];
      if(hasReturn){
        trip.push(T(fr ? ' du ' : ' from '), S(depDate, LBL.dep),
                  T(fr ? ' au ' : ' through '), S(retDate, LBL.ret),
                  T(fr ? ', y compris le voyage de retour depuis ' : ', including the return journey from '),
                  S(destCtry, LBL.to),
                  T(fr ? ' vers ' : ' back to '), S(origin, LBL.from));
      }
      const p1 = fr
        ? [T('Je soussign\u00e9(e), '), S(B(d.parentName), LBL.parent), T(', ' + guardianOf)]
            .concat(kidSegs, [T(', consens \u00e0 ce que ' + consentFr + ' de '), S(origin, LBL.from),
                              T(' \u00e0 '), S(destCtry, LBL.to), T(' avec '), S(companion, LBL.adult)], trip, [T('.')])
        : [T('I, '), S(B(d.parentName), LBL.parent), T(', ' + guardianOf)]
            .concat(kidSegs, [T(', and give my consent for ' + consentEn + ' from '), S(origin, LBL.from),
                              T(' to '), S(destCtry, LBL.to), T(' with '), S(companion, LBL.adult)], trip, [T('.')]);
      const flat = segs => segs.map(g => g.blank ? FILL : g.t).join('');
      if(flat(p1) === body[0]) bodySegs = [p1, null];
    }

    return {
      bodySegs,
      title: fr ? 'LETTRE DE CONSENTEMENT AU VOYAGE D\u2019UN ENFANT' : 'CHILD TRAVEL CONSENT LETTER',
      showAdult: true, salutation: fr ? '\u00c0 qui de droit :' : 'To Whom It May Concern:', body,
      secChild:  many ? (fr ? 'RENSEIGNEMENTS SUR LES ENFANTS' : 'CHILDREN INFORMATION')
                      : (fr ? 'RENSEIGNEMENTS SUR L\u2019ENFANT' : 'CHILD INFORMATION'),
      children: kids,
      secAdult:  fr ? 'ADULTE ACCOMPAGNATEUR' : 'ACCOMPANYING ADULT',
      secParent: fr ? 'PARENT / TUTEUR DONNANT SON CONSENTEMENT' : 'PARENT / GUARDIAN PROVIDING CONSENT',
      secTravel: fr ? 'RENSEIGNEMENTS SUR LE VOYAGE' : 'TRAVEL INFORMATION',
      sigParent: fr ? 'SIGNATURE DU PARENT / TUTEUR' : 'PARENT / GUARDIAN SIGNATURE',
      sigOther:  fr ? 'SIGNATURE D\u2019UN AUTRE PARENT / TUTEUR' : 'ADDITIONAL PARENT / GUARDIAN SIGNATURE',
      lblSig: fr ? 'Signature' : 'Signature',
      lblPrinted: fr ? 'Nom en lettres moul\u00e9es' : 'Printed Name',
      lblDate: fr ? 'Date' : 'Date',
      k: fr
        ? {name:'Nom complet :', name2:'Second parent / tuteur :', dob:'Date de naissance :', rel:'Lien avec l\u2019enfant :', phone:'T\u00e9l\u00e9phone :', email:'Courriel :', address:'Adresse :',
           dep:'Date de d\u00e9part :', retn:'Date de retour :'}
        : {name:'Full Name:', name2:'Second Parent / Guardian:', dob:'Date of Birth:', rel:'Relationship to Child:', phone:'Phone:', email:'Email:', address:'Address:',
           dep:'Departure Date:', retn:'Return Date:'},
      // Guidance printed ONLY on the blank downloadable form, beneath each field
      // label. It exists because someone who prints the blank form has not read
      // the web page and has no hint text to fall back on. Every line below is
      // the wording the web page already uses for that field, shortened to one
      // line - no new requirement is introduced and no field is added.
      hints: fr
        ? {childName:'Prénom et nom, exactement comme sur le document de voyage de l’enfant',
           childDob:'JJ / MM / AAAA',
           adultName:'Nom légal complet de l’adulte qui voyage avec l’enfant',
           adultRel:'Par exemple : parent, grand-parent ou autre membre de la famille',
           adultPhone:'Un numéro où joindre cet adulte pendant le voyage',
           adultEmail:'Adresse courriel où joindre cet adulte',
           parentName:'Nom légal complet du parent ou tuteur donnant son consentement',
           parent2Name:'Nom légal complet de l’autre parent ou tuteur, le cas échéant',
           parentAddress:'Rue, ville, province ou état, et code postal',
           parentPhone:'Un numéro où joindre ce parent ou tuteur',
           parentEmail:'Adresse courriel où joindre ce parent ou tuteur',
           dep:'JJ / MM / AAAA', retn:'JJ / MM / AAAA'}
        : {childName:'First and last name, exactly as shown on the child’s travel document',
           childDob:'DD / MM / YYYY',
           adultName:'Full legal name of the adult travelling with the child',
           adultRel:'For example: parent, grandparent, or other relative',
           adultPhone:'A number where this adult can be reached while travelling',
           adultEmail:'Email address where this adult can be reached',
           parentName:'Full legal name of the parent or guardian giving consent',
           parent2Name:'Full legal name of the other parent or guardian, if applicable',
           parentAddress:'Street, city, province/state, and postal code',
           parentPhone:'A number where this parent or guardian can be reached',
           parentEmail:'Email address where this parent or guardian can be reached',
           dep:'DD / MM / YYYY', retn:'DD / MM / YYYY'},
      // The two section notes the web page already shows above these blocks.
      noteAdult:  fr ? 'Personne qui voyage avec l\u2019enfant' : 'Person travelling with the child',
      noteParent: fr ? 'Parent ou tuteur donnant son consentement au voyage de l\u2019enfant'
                     : 'Parent or guardian providing consent for the child\u2019s travel',
      note: fr
        ? 'Important : cette lettre vise \u00e0 documenter le consentement parental ou du tuteur au voyage. Les voyageurs devraient avoir sur eux des pi\u00e8ces d\u2019identit\u00e9 appropri\u00e9es ainsi que tout document pertinent relatif \u00e0 la garde, au partage des responsabilit\u00e9s parentales ou toute ordonnance judiciaire applicable.'
        : 'Important: This letter is intended to document parental/guardian consent for travel. Travellers should carry appropriate identification and any applicable custody, parenting, or court documentation.'
    };
  }

  /* ---------- on-screen preview ---------- */
  function renderPreview(d){
    const x = L(d), esc = cjhqEscapeHtml;
    const row = (k,v) => v ? `<div class="ctc-row"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>` : '';
    // The consenting parent's name is already known, so it is printed rather
    // than left as a rule. Only the signature and the date of signing - which
    // cannot be known when the letter is generated - stay handwritten.
    const sig = (heading, printedName) => `<h3>${esc(heading)}</h3><div class="ctc-siglines">
        <p class="ctc-sigline">${esc(x.lblSig)}: _________________________________________</p>
        <p class="ctc-sigline">${esc(x.lblPrinted)}: ${printedName ? esc(printedName) : '____________________________________'}</p>
        <p class="ctc-sigline">${esc(x.lblDate)}: ______________________________________</p></div>`;
    $('ctcLetter').innerHTML = `
      <h2>${esc(x.title)}</h2>
      <p>${esc(x.salutation)}</p>
      ${x.body.filter(Boolean).map(pp=>`<p>${esc(pp)}</p>`).join('')}
      <h3>${esc(x.secChild)}</h3>
      ${x.children.map(c => row(x.k.name,c.name) + row(x.k.dob,prettyDate(c.dob))).join('')}
      ${x.showAdult ? `<h3>${esc(x.secAdult)}</h3>
      ${row(x.k.name,d.adultName)}${row(x.k.rel,d.adultRel)}${row(x.k.phone,d.adultPhone)}${row(x.k.email,d.adultEmail)}` : ''}
      <h3>${esc(x.secParent)}</h3>
      ${row(x.k.name,d.parentName)}${row(x.k.name2,d.parent2Name)}${row(x.k.address,d.parentAddress.replace(/\s*\n\s*/g,', '))}${row(x.k.phone,d.parentPhone)}${row(x.k.email,d.parentEmail)}
      <h3>${esc(x.secTravel)}</h3>
      ${row(x.k.dep,prettyDate(d.departure))}${row(x.k.retn,prettyDate(d.ret))}
      ${sig(x.sigParent, d.blank ? '' : d.parentName)}${sig(x.sigOther, d.blank ? '' : d.parent2Name)}
      <p class="ctc-note">${esc(x.note)}</p>`;
  }

  /* ================= minimal PDF writer =================
     US Letter, 612 x 792 points, portrait, base-14 fonts with WinAnsiEncoding
     (covers the accented characters French names and Qu\u00e9bec place names need).
     No external library, so nothing third-party ever sees this data. */
  function pdfEscape(str){
    return String(str).replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  }
  // WinAnsi is a single-byte encoding; map the characters this document can
  // actually contain and fall back to a plain ASCII equivalent otherwise, so a
  // stray character can never corrupt the file.
  const WINANSI = {'\u2019':"'", '\u2018':"'", '\u201C':'"', '\u201D':'"', '\u2013':'-', '\u2014':'-', '\u2192':'->', '\u00a0':' '};
  function toWinAnsi(str){
    let out = '';
    for(const ch of String(str)){
      if(WINANSI[ch]){ out += WINANSI[ch]; continue; }
      const c = ch.codePointAt(0);
      out += (c <= 0xFF) ? ch : '?';
    }
    return out;
  }
  const FONT_W = {}; // crude width table: Helvetica averages ~0.5em, bold ~0.55em
  function textWidth(str, size, bold){
    return String(str).length * size * (bold ? 0.545 : 0.5);
  }
  function wrapText(str, size, bold, maxW){
    const words = String(str).split(/\s+/).filter(Boolean);
    const lines = []; let cur = '';
    words.forEach(w=>{
      const probe = cur ? cur + ' ' + w : w;
      if(textWidth(probe, size, bold) > maxW && cur){ lines.push(cur); cur = w; }
      else cur = probe;
    });
    if(cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function buildPdf(d){
    const x = L(d);
    // 0.6in all round - a normal margin for a printable government-style form,
    // and part of how both the blank form and the filled letter fit one page
    // without shrinking the type.
    const PW = 612, PH = 792, M = 43.2;
    const CW = PW - M*2;
    const pages = [];
    let ops = [], y = PH - M;

    const newPage = () => { pages.push(ops.join('\n')); ops = []; y = PH - M; };
    const need = (h) => { if(y - h < M){ newPage(); } };
    function put(str, size, bold, indent, gap, align){
      const f = bold ? '/F2' : '/F1';
      wrapText(str, size, bold, CW - (indent||0)).forEach(line=>{
        need(size * 1.35);
        let tx = M + (indent||0);
        if(align === 'center') tx = (PW - textWidth(line, size, bold)) / 2;
        ops.push(`BT ${f} ${size} Tf 1 0 0 1 ${tx.toFixed(2)} ${(y - size).toFixed(2)} Tm (${pdfEscape(toWinAnsi(line))}) Tj ET`);
        y -= size * 1.35;
      });
      y -= (gap || 0);
    }
    function rule(){ need(8); ops.push(`0.72 w 0.75 G ${M} ${(y-3).toFixed(2)} m ${PW-M} ${(y-3).toFixed(2)} l S`); y -= 9; }

    /* ---------- one-page layout, shared by the blank form and the filled letter
       The two must match, so they run through the same code: same type scale,
       the same two-column field grid, and the two signature blocks side by side.
       A blank cell draws a rule to write on; a filled cell prints the value
       under the same label. Nothing is ever dropped to make a letter fit - if
       the content would run past the page, the WHOLE page is laid out again a
       few percent smaller until it fits, so a letter with three children and
       long names stays on one page without losing a field. */
    function renderOnePage(SC){
      ops = []; pages.length = 0; y = PH - M;
      const GUT = 18, COLW = (CW - GUT) / 2;
      const S_LABEL = 9*SC, S_HINT = 7*SC, S_BODY = 9*SC, S_SEC = 9.2*SC,
            S_TITLE = 13.5*SC, S_NOTE = 7.2*SC, S_VAL = 9.2*SC;
      const WRITE = 13*SC;       // clear height above a writing rule
      const at = (str, size, bold, tx, ty, grey) => {
        if(!str) return;
        ops.push(`BT ${bold?'/F2':'/F1'} ${size.toFixed(2)} Tf ${grey?grey+' g ':''}1 0 0 1 ${tx.toFixed(2)} ${ty.toFixed(2)} Tm (${pdfEscape(toWinAnsi(str))}) Tj ET${grey?' 0 g':''}`);
      };
      const hrule = (x1, x2, ty, w, g) => ops.push(`${w} w ${g} G ${x1.toFixed(2)} ${ty.toFixed(2)} m ${x2.toFixed(2)} ${ty.toFixed(2)} l S`);

      // heading + hairline
      const sec = (title) => { y -= 4*SC; at(title, S_SEC, true, M, y - S_SEC); y -= S_SEC + 2.5*SC;
                               hrule(M, PW - M, y, 0.7, 0.72); y -= 4*SC; };
      const note = (t) => { if(!t) return; at(t, S_NOTE, false, M, y - S_NOTE, '0.42'); y -= S_NOTE + 4*SC; };

      /* ---- blank form: label, guidance under it, then a rule to write on ---- */
      const cell = (tx, w, label, hint) => {
        at(label, S_LABEL, true, tx, y - S_LABEL);
        // Guidance is one line by design. If a future wording change would make
        // it wider than its cell it steps down a little rather than running into
        // the next column - the form must never clip text.
        if(hint){
          let hs = S_HINT;
          while(hs > 5.8*SC && textWidth(hint, hs, false) > w) hs -= 0.2;
          at(hint, hs, false, tx, y - S_LABEL - S_HINT - 2.6*SC, '0.42');
        }
        hrule(tx, tx + w, y - S_LABEL - S_HINT - 2.6*SC - WRITE, 0.6, 0.55);
      };
      const ROW = S_LABEL + S_HINT + 2.6*SC + WRITE + 4*SC;
      const row = (a, b) => { need(ROW); if(a) cell(M, b ? COLW : CW, a[0], a[1]);
                              if(b) cell(M + COLW + GUT, COLW, b[0], b[1]); y -= ROW; };

      /* ---- filled letter: the same cell, with the value printed in it ---- */
      const VLEAD = S_VAL * 1.22, VGAP = 3.2*SC, VPAD = 5*SC;
      const vlines = (v, w) => wrapText(String(v), S_VAL, false, w);
      const valCell = (tx, w, label, value) => {
        at(label, S_LABEL, true, tx, y - S_LABEL);
        vlines(value, w).forEach((ln, i) =>
          at(ln, S_VAL, false, tx, y - S_LABEL - VGAP - S_VAL - i * VLEAD));
      };
      const vrow = (a, b) => {
        const wA = b ? COLW : CW;
        const n = Math.max(a ? vlines(a[1], wA).length : 1, b ? vlines(b[1], COLW).length : 1, 1);
        const h = S_LABEL + VGAP + n * VLEAD + VPAD;
        need(h);
        if(a) valCell(M, wA, a[0], a[1]);
        if(b) valCell(M + COLW + GUT, COLW, b[0], b[1]);
        y -= h;
      };
      // Pairs fields two to a row. A value too long for half the width takes a
      // full-width row of its own rather than wrapping into a narrow column.
      const grid = (items) => {
        const list = items.filter(it => it && it[1]).map(it => [it[0], String(it[1])]);
        let i = 0;
        while(i < list.length){
          const a = list[i], b = list[i+1];
          const aFits = vlines(a[1], COLW).length === 1;
          const bFits = b && vlines(b[1], COLW).length === 1;
          if(aFits && bFits){ vrow(a, b); i += 2; } else { vrow(a, null); i += 1; }
        }
      };

      put(x.title, S_TITLE, true, 0, 2*SC, 'center');
      rule(); y -= 2*SC;
      at(x.salutation, S_BODY, true, M, y - S_BODY); y -= S_BODY + 5*SC;

      /* The declaration, laid out inline with a caption under every blank.
         Words are placed one at a time so a blank can be an atomic box with its
         own caption; a line that contains a blank gets extra leading to make
         room for the caption. Text is never altered - only positioned. */
      const CAP = 5.6*SC, CAPDROP = 8.2*SC, LEAD = 9.4*SC;
      function declBlock(segs, size){
        // Words are measured individually for wrapping, but consecutive words are
        // DRAWN as one string so the PDF viewer does the spacing. Drawing word by
        // word would advance by an estimated width and leave visible gaps.
        const toks = [];
        segs.forEach(g => {
          if(g.blank){
            const w = Math.min(150, Math.max(84, textWidth(g.lab, CAP, false) + 6));
            toks.push({ blank:true, lab:g.lab, w });
          } else String(g.t).split(/(\s+)/).filter(t => t !== '').forEach(t =>
            toks.push({ t, w: textWidth(t, size, false) }));
        });
        let line = [], lw = 0;
        const flush = () => {
          if(!line.length) return;
          while(line.length && !line[0].blank && line[0].t.trim() === ''){ lw -= line[0].w; line.shift(); }
          if(!line.length) return;
          const hasBlank = line.some(t => t.blank);
          need(size * 1.35 + (hasBlank ? LEAD : 0));
          let tx = M, run = '', runX = M;
          const drawRun = () => { if(run !== ''){ at(run, size, false, runX, y - size); run = ''; } };
          line.forEach(t => {
            if(t.blank){
              drawRun();
              hrule(tx, tx + t.w, y - size - 1.5, 0.6, 0.55);
              at(t.lab, CAP, false, tx, y - size - CAPDROP, '0.45');
              tx += t.w; runX = tx;
            } else { if(run === '') runX = tx; run += t.t; tx += t.w; }
          });
          drawRun();
          y -= size * 1.35 + (hasBlank ? LEAD : 0);
          line = []; lw = 0;
        };
        toks.forEach(t => { if(lw + t.w > CW && line.length) flush(); line.push(t); lw += t.w; });
        flush();
      }

      if(x.bodySegs){
        declBlock(x.bodySegs[0], S_BODY); y -= 3*SC;
        put(x.body[1], S_BODY, false, 0, 4*SC);
      } else {
        x.body.filter(Boolean).forEach(pp => put(pp, S_BODY, false, 0, 4*SC));
      }
      y -= 2*SC;

      const H = d.blank ? x.hints : {};
      sec(x.secChild);
      if(d.blank) row([x.k.name, H.childName], [x.k.dob, H.childDob]);
      else grid([].concat.apply([], x.children.map(c =>
             [[x.k.name, c.name], [x.k.dob, prettyDate(c.dob)]])));

      if(x.showAdult){
        sec(x.secAdult); if(d.blank) note(x.noteAdult);
        if(d.blank){
          row([x.k.name, H.adultName], [x.k.rel, H.adultRel]);
          row([x.k.phone, H.adultPhone], [x.k.email, H.adultEmail]);
        } else grid([[x.k.name, d.adultName], [x.k.rel, d.adultRel],
                     [x.k.phone, d.adultPhone], [x.k.email, d.adultEmail]]);
      }

      sec(x.secParent); if(d.blank) note(x.noteParent);
      if(d.blank){
        row([x.k.name, H.parentName], [x.k.name2, H.parent2Name]);
        row([x.k.phone, H.parentPhone], [x.k.email, H.parentEmail]);
        row([x.k.address, H.parentAddress], null);
      } else grid([[x.k.name, d.parentName], [x.k.name2, d.parent2Name],
                   [x.k.phone, d.parentPhone], [x.k.email, d.parentEmail],
                   [x.k.address, (d.parentAddress||'').replace(/\s*\n\s*/g, ', ')]]);

      sec(x.secTravel);
      if(d.blank) row([x.k.dep, H.dep], [x.k.retn, H.retn]);
      else grid([[x.k.dep, prettyDate(d.departure)], [x.k.retn, prettyDate(d.ret)]]);

      /* Both signature blocks side by side - same three lines each, half the
         height, and always kept together with their heading. */
      const SIGH = S_SEC + 3*SC + 8*SC + 3 * (S_HINT + WRITE + 3*SC) + 2*SC + 6*SC + S_NOTE * 3;
      need(SIGH);
      y -= 3*SC;
      at(x.sigParent, S_SEC, true, M, y - S_SEC);
      at(x.sigOther,  S_SEC, true, M + COLW + GUT, y - S_SEC);
      y -= S_SEC + 3*SC; hrule(M, PW - M, y, 0.7, 0.72); y -= 8*SC;
      // The consenting parents' names are already known on a filled letter, so
      // the printed-name line shows them; the signature and date stay handwritten.
      const printed = d.blank ? ['', ''] : [d.parentName || '', d.parent2Name || ''];
      [x.lblSig, x.lblPrinted, x.lblDate].forEach((lbl, idx) => {
        [0, 1].forEach(col => {
          const tx = col === 0 ? M : M + COLW + GUT;
          at(lbl, S_HINT, false, tx, y - S_HINT, '0.42');
          if(idx === 1 && printed[col]){
            let vs = S_VAL;
            while(vs > 6*SC && textWidth(printed[col], vs, false) > COLW) vs -= 0.2;
            at(printed[col], vs, false, tx, y - S_HINT - WRITE + 2.5*SC);
          } else hrule(tx, tx + COLW, y - S_HINT - WRITE, 0.6, 0.55);
        });
        y -= S_HINT + WRITE + 3*SC;
      });

      y -= 2*SC; hrule(M, PW - M, y, 0.7, 0.75); y -= 6*SC;
      put(x.note, S_NOTE + 0.2, false, 0, 0);
      const overflowed = pages.length > 0;
      newPage();
      return overflowed;
    }

    // Try the natural size first and step down only as far as a long letter
    // needs. 0.8 is the floor: below that the type stops being comfortable to
    // read, and a letter that still does not fit would be a bug worth seeing.
    let scale = 1;
    while(renderOnePage(scale) && scale > 0.8) scale = Math.round((scale - 0.03) * 100) / 100;
    return assemble();

    // ---- assemble the PDF objects ----
    function assemble(){
    const objs = [];
    const kids = pages.map((_,i)=> `${4 + i} 0 R`).join(' ');
    objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
    objs[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`;
    objs[3] = '<< /Font << /F1 ' + (4 + pages.length*2) + ' 0 R /F2 ' + (5 + pages.length*2) + ' 0 R >> >>';
    pages.forEach((content, i)=>{
      const pageObj = 4 + i;
      const streamObj = 4 + pages.length + i;
      objs[pageObj] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources 3 0 R /Contents ${streamObj} 0 R >>`;
      objs[streamObj] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    });
    objs[4 + pages.length*2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
    objs[5 + pages.length*2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

    let out = '%PDF-1.4\n';
    const offsets = [];
    for(let i = 1; i < objs.length; i++){
      if(objs[i] === undefined) continue;
      offsets[i] = out.length;
      out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xrefPos = out.length;
    const maxObj = objs.length;
    out += `xref\n0 ${maxObj}\n0000000000 65535 f \n`;
    for(let i = 1; i < maxObj; i++){
      out += (offsets[i] === undefined ? '0000000000 65535 f \n'
                                       : String(offsets[i]).padStart(10,'0') + ' 00000 n \n');
    }
    out += `trailer\n<< /Size ${maxObj} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;

    // Latin-1 bytes: WinAnsi is single-byte, so each char maps to one byte.
    const bytes = new Uint8Array(out.length);
    for(let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xFF;
    return new Blob([bytes], {type:'application/pdf'});
    }
  }

  function safeFileName(name){
    const cleaned = String(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^A-Za-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60);
    return cleaned || 'Child';
  }

  /* ---------- screens ---------- */
  function showPreview(){
    $('ctcFormScreen').hidden = true;
    $('ctcPreviewScreen').hidden = false;
    window.scrollTo({top:0, behavior:'smooth'});
  }
  function showForm(){
    $('ctcPreviewScreen').hidden = true;
    $('ctcFormScreen').hidden = false;   // values are untouched, so nothing is lost
    window.scrollTo({top:0, behavior:'smooth'});
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!validate()) return;
    renderPreview(collect());
    showPreview();
  });
  // Blank form: no validation, nothing entered is used, so it works from an
  // untouched form. Shares the same PDF builder as the filled version.
  // The resource popup offers the blank form next to "Create Letter", so the
  // generator has to be reachable from outside this module.
  window.__ctcDownloadBlank = function(){
    let url;
    try{
      const blob = buildPdf(blankData());
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'CJHQ-Child-Travel-Consent-Blank.pdf';
      document.body.appendChild(a); a.click(); a.remove();
    }catch(err){
      console.warn('[CJHQ] blank consent form PDF generation failed');
      alert(isFr() ? 'Le formulaire vierge n\u2019a pas pu \u00eatre g\u00e9n\u00e9r\u00e9. Veuillez r\u00e9essayer.'
                   : 'The blank form could not be generated. Please try again.');
    }finally{
      if(url) setTimeout(()=> URL.revokeObjectURL(url), 4000);
    }
  };

  // Back to Resources lands on the Travel & Border Crossing category rather
  // than the top of the page, since that is where this tool lives. Modifier
  // clicks fall through to the browser so the real href still works.
  const backBtn = $('ctcBackBtn');
  if(backBtn) backBtn.addEventListener('click', (e)=>{
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    goPage('resources');
    setTimeout(()=>{
      const items = [...document.querySelectorAll('#accordionWrap .accordion-item')];
      const cat = items.find(x => /Travel & Border|Voyage et passage/i.test(x.textContent));
      if(!cat) return;
      if(!cat.classList.contains('open')){
        const head = cat.querySelector('.accordion-head');
        if(head) head.click();
      }
      const header = document.querySelector('header');
      const offset = header ? header.getBoundingClientRect().height + 12 : 90;
      const top = cat.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, 140);
  });

  $('ctcEditBtn').addEventListener('click', showForm);
  $('ctcPrintBtn').addEventListener('click', ()=> window.print());

  // Share the COMPLETED letter. The PDF is built in the browser and handed to
  // the OS share sheet as a file - nothing is uploaded and no URL carrying the
  // child's details is ever created. Blank forms are never shared here: this
  // button only exists on the preview screen, after Generate.
  $('ctcShareBtn').addEventListener('click', async ()=>{
    const d = collect();
    const fr = isFr();
    const fileName = `CJHQ-Child-Travel-Consent-${safeFileName(d.childName)}.pdf`;
    const title = fr ? 'Lettre de consentement au voyage d\u2019un enfant' : 'Child Travel Consent Letter';
    let blob;
    try{
      blob = buildPdf(d);
    }catch(err){
      console.warn('[CJHQ] consent letter PDF generation failed');
      alert(fr ? 'La lettre n\u2019a pas pu \u00eatre pr\u00e9par\u00e9e pour le partage.'
               : 'The letter could not be prepared for sharing.');
      return;
    }

    // 1. Native share with the PDF attached (most phones).
    try{
      const file = new File([blob], fileName, { type:'application/pdf' });
      if(navigator.canShare && navigator.canShare({ files:[file] }) && navigator.share){
        await navigator.share({ files:[file], title });
        return;
      }
    }catch(err){
      if(err && err.name === 'AbortError') return;   // user dismissed the sheet
      console.warn('[CJHQ] file share unavailable, falling back');
    }

    // 2. Native share without file support: send the letter text instead.
    try{
      if(navigator.share){
        const text = $('ctcLetter').innerText.replace(/\n{3,}/g, '\n\n').trim();
        await navigator.share({ title, text });
        return;
      }
    }catch(err){
      if(err && err.name === 'AbortError') return;
      console.warn('[CJHQ] text share failed, falling back to download');
    }

    // 3. Desktop with no share support: download the PDF so it can be attached.
    let url;
    try{
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); a.remove();
      alert(fr ? 'Votre navigateur ne prend pas en charge le partage direct. Le PDF a \u00e9t\u00e9 t\u00e9l\u00e9charg\u00e9 \u2014 vous pouvez maintenant le joindre \u00e0 un courriel ou \u00e0 un message.'
               : 'Your browser does not support direct sharing. The PDF has been downloaded \u2014 you can now attach it to an email or message.');
    }catch(err){
      console.warn('[CJHQ] share fallback download failed');
    }finally{
      if(url) setTimeout(()=> URL.revokeObjectURL(url), 4000);
    }
  });
  $('ctcDownloadBtn').addEventListener('click', ()=>{
    const d = collect();
    let url;
    try{
      const blob = buildPdf(d);
      url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CJHQ-Child-Travel-Consent-${safeFileName(d.childName)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
    }catch(err){
      // Never surface form values in an error.
      console.warn('[CJHQ] consent letter PDF generation failed');
      alert(isFr() ? 'Le PDF n\u2019a pas pu \u00eatre g\u00e9n\u00e9r\u00e9. Vous pouvez utiliser « Imprimer la lettre » \u00e0 la place.'
                   : 'The PDF could not be generated. You can use \u201cPrint Letter\u201d instead.');
    }finally{
      if(url) setTimeout(()=> URL.revokeObjectURL(url), 4000);
    }
  });

  // Re-render the preview if the language is switched while it is open.
  document.addEventListener('cjhq:langchange', ()=>{
    syncPlaceholders();
    renumberChildren();
    if(!$('ctcPreviewScreen').hidden) renderPreview(collect());
  });

  // Called by goPage() so the departure default is today's date on every visit.
  window.__ctcOnOpen = function(){
    setDepartureDefault();
    if(!$('ctcPreviewScreen').hidden) showForm();
  };
  setDepartureDefault();
  syncPlaceholders();
})();

