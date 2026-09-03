/* The general answer-quality corpus. Deliberately NOT a list of expected
   prose: each entry states what the ANSWERING SYSTEM should do - which
   handler owns the question and whether retrieval should widen - and the
   suite checks structural properties that hold for any correct wording. */
export const CORPUS = [
  // ---- Passport -----------------------------------------------------------
  { q:'Where do I apply for a passport?',              handler:'CJHQ Resources', breadth:'broad'  },
  { q:'How do I get a passport?',                      handler:'CJHQ Resources', breadth:'broad'  },
  { q:'How do I apply for an adult passport?',         handler:'CJHQ Resources', breadth:'narrow', answered:true, structured:true },
  { q:'How do I renew my passport?',                   handler:'CJHQ Resources', breadth:'narrow', answered:true, structured:true },
  { q:'How do I get a passport for my child?',         handler:'CJHQ Resources', breadth:'broad'  },
  { q:'My passport was stolen, what do I do?',         handler:'CJHQ Resources', breadth:'narrow', answered:true, structured:true },
  { q:'Where is the nearest passport office?',         handler:'CJHQ Resources', breadth:'narrow', answered:true },
  // KNOWN RETRIEVAL GAP, pre-existing and unchanged by this work: "long" and
  // "take" are stopwords and neither appears in "Passport Processing Times",
  // so nothing matches and the assistant correctly declines to guess. Recorded
  // as the current behaviour rather than asserted as correct.
  { q:'How long does a passport take?',                handler:'none', unanswered:true },
  // ---- NEXUS --------------------------------------------------------------
  { q:'What documents do I need for NEXUS?',           handler:'CJHQ Resources', breadth:'broad'  },
  { q:'How do I apply for NEXUS?',                     handler:'CJHQ Resources', breadth:'narrow', answered:true, structured:true },
  { q:'How do I renew my NEXUS card?',                 handler:'CJHQ Resources' },
  { q:'Where do I do my NEXUS interview?',             handler:'CJHQ Resources' },
  // ---- RAMQ ---------------------------------------------------------------
  { q:'How do I renew my RAMQ?',                       handler:'CJHQ Resources' },
  { q:'How do I apply for RAMQ?',                      handler:'CJHQ Resources' },
  { q:'How do I register my newborn with RAMQ?',       handler:'CJHQ Resources', answered:true, structured:true },
  // ---- Community directory (must stay a FindMTL referral) ------------------
  { q:'Where can I find a shul?',                      handler:'Community Directory', directory:true },
  { q:'Where can I find a mikvah?',                    handler:'Community Directory', directory:true },
  { q:'Where can I find kosher food?',                 handler:'Community Directory', directory:true },
  { q:'What minyanim are available?',                  handler:'Community Directory', directory:true },
  // ---- Bare procedural: no topic named, must not guess ---------------------
  { q:'How do I apply?',                               unanswered:true },
  { q:'Where do I go?',                                handler:'none', unanswered:true },
  { q:'What do I need?',                               handler:'none', unanswered:true },
  { q:'What documents do I need?',                     handler:'none', unanswered:true },
  // ---- Broad, single topic word -------------------------------------------
  { q:'passport',                                      handler:'CJHQ Resources', breadth:'broad' },
  { q:'NEXUS',                                         handler:'CJHQ Resources', breadth:'broad' },
  { q:'RAMQ',                                          handler:'CJHQ Resources', breadth:'broad' },
  { q:'kosher food',                                   handler:'Community Directory', directory:true },
  { q:'I need a passport',                             handler:'CJHQ Resources', breadth:'broad' },
  { q:'Tell me about passports',                       handler:'CJHQ Resources', breadth:'broad' },
  // ---- Narrow, route explicitly chosen ------------------------------------
  { q:'What documents do I need for a child passport?',handler:'CJHQ Resources' },
  { q:'Where can I submit an urgent passport application?', handler:'CJHQ Resources' },
  // ---- Multi-resource: the honest answer spans several records -------------
  { q:'I am having a baby, what do I need to register?', multi:true },
  { q:'What do I need to travel to the US with my kids?', multi:true },
  { q:'My child was born abroad, what do I do?',       multi:true },
  // ---- Other categories, for breadth of coverage --------------------------
  // The CCB record carries no steps and no required-documents list at all, so
  // the honest answer is its description plus the official link. Recorded as a
  // DATA gap, not a code one: nothing here should invent the missing list.
  { q:'How do I apply for the Canada Child Benefit?',  handler:'CJHQ Resources', answered:true },
  { q:'How do I get a birth certificate?',             handler:'CJHQ Resources' },
  { q:'When is waste collection in Outremont?',        handler:'CJHQ Resources' },
  { q:'How do I sponsor my parents to come to Canada?',handler:'CJHQ Resources' },
  { q:'How do I apply for Employment Insurance?',      handler:'CJHQ Resources', answered:true, structured:true },
  // ---- French -------------------------------------------------------------
  { q:'Ou puis-je demander un passeport?',             handler:'CJHQ Resources', lang:'fr' },
  { q:'Comment renouveler mon passeport?',             handler:'CJHQ Resources', lang:'fr' },
  // ---- Halachic guard must keep primacy -----------------------------------
  { q:'Can I carry in the eruv on Shabbos according to halacha?', halachic:true },
  { q:'Is it mutar to travel on chol hamoed?',         halachic:true }
];
