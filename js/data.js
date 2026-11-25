/* =============================================================
   data.js — the content "database" for site search.
   Every city, maker, and product on the site is listed here once.
   The search box reads this list and filters it as you type.

   All businesses and products are FICTIONAL, created for the
   Marlowby BPA project. City names are real U.S. cities.

   Why a .js file and not .json? Browsers block fetch() of local
   files opened from a laptop (file://). A plain script always
   loads, so search works offline at nationals.
   ============================================================= */

window.MARLOWBY_DATA = {
  cities: [
    { slug: 'savannah', name: 'Savannah', state: 'Georgia', box: 'Box No. 01', when: 'Ships March 2027',
      blurb: 'Live oaks, moss-draped squares, peach preserves, and a guided walk through the historic district.' },
    { slug: 'detroit', name: 'Detroit', state: 'Michigan', box: 'Box No. 02', when: 'Ships April 2027',
      blurb: 'Hot sauce, kettle corn, and screen prints from a city that builds things by hand.' },
    { slug: 'asheville', name: 'Asheville', state: 'North Carolina', box: 'Pilot Box P1', when: 'Shipped August 2026',
      blurb: 'Sourwood honey, hand-thrown pottery, and mountain herbs from the Blue Ridge.' },
    { slug: 'tucson', name: 'Tucson', state: 'Arizona', box: 'Pilot Box P2', when: 'Shipped September 2026',
      blurb: 'Prickly pear syrup, mesquite flour, and woven goods from the Sonoran Desert.' },
    { slug: 'duluth', name: 'Duluth', state: 'Minnesota', box: 'Pilot Box P3', when: 'Shipped October 2026',
      blurb: 'Hand-harvested wild rice, cedar sauna oil, and wool from the shore of Lake Superior.' },
    { slug: 'santa-fe', name: 'Santa Fe', state: 'New Mexico', box: 'Pilot Box P4', when: 'Shipped November 2026',
      blurb: 'Red chile, piñon incense, and juniper soap from the high desert.' }
  ],

  makers: [
    // Savannah — Box No. 01
    { slug: 'whitfield-pantry', name: 'Whitfield Pantry', city: 'savannah', owner: 'Mae Whitfield', product: 'Peach & Vanilla Bean Preserves' },
    { slug: 'forsyth-lane-roasters', name: 'Forsyth Lane Roasters', city: 'savannah', owner: 'Desmond Hale', product: 'Chicory Morning Blend Coffee' },
    { slug: 'lantern-and-lark', name: 'Lantern & Lark', city: 'savannah', owner: 'Priya and Sam Okafor', product: 'Magnolia & Cedar Candle' },
    { slug: 'odalies-sweet-shop', name: "Odalie's Sweet Shop", city: 'savannah', owner: 'Odalie Brooks', product: 'Benne Wafer Cookies' },
    { slug: 'tidewater-paper', name: 'Tidewater Paper Co.', city: 'savannah', owner: 'June Castellano', product: 'Letterpress Squares Map' },
    { slug: 'hollis-walking-tours', name: 'Hollis Walking Tours', city: 'savannah', owner: 'Reuben Hollis', product: 'Squares After Dark Audio Walk' },
    // Detroit — Box No. 02
    { slug: 'rosalinds-kitchen', name: "Rosalind's Kitchen", city: 'detroit', owner: 'Rosalind Pierce', product: 'Smoked Chili Hot Sauce' },
    { slug: 'odell-and-daughters', name: 'Odell & Daughters', city: 'detroit', owner: 'Marcus Odell', product: 'Coney-Spice Kettle Corn' },
    { slug: 'assembly-line-press', name: 'Assembly Line Press', city: 'detroit', owner: 'Tasha Greer', product: 'Screen-Printed City Tote' },
    // Asheville — Pilot P1
    { slug: 'foggy-hollow-honey', name: 'Foggy Hollow Honey', city: 'asheville', owner: 'Walt and Ellie Moss', product: 'Sourwood Honey' },
    { slug: 'two-rivers-pottery', name: 'Two Rivers Pottery', city: 'asheville', owner: 'Nadia Ferrell', product: 'Hand-Thrown Mug' },
    { slug: 'ridgeline-apothecary', name: 'Ridgeline Apothecary', city: 'asheville', owner: 'Cal Brightwater', product: 'Mountain Mint Herbal Tea' },
    // Tucson — Pilot P2
    { slug: 'desert-bloom-kitchen', name: 'Desert Bloom Kitchen', city: 'tucson', owner: 'Lucia Ramos', product: 'Prickly Pear Syrup' },
    { slug: 'old-pueblo-mill', name: 'Old Pueblo Mill', city: 'tucson', owner: 'Hector Vance', product: 'Mesquite Pancake Mix' },
    { slug: 'barrio-loom', name: 'Barrio Loom', city: 'tucson', owner: 'Inés Calder', product: 'Hand-Woven Coasters' },
    // Duluth — Pilot P3
    { slug: 'lakewalk-wild-rice', name: 'Lakewalk Wild Rice Co.', city: 'duluth', owner: 'Anna Lindqvist', product: 'Hand-Harvested Wild Rice' },
    { slug: 'superior-sauna-goods', name: 'Superior Sauna Goods', city: 'duluth', owner: 'Erik Halvorsen', product: 'Cedar Sauna Oil' },
    { slug: 'lift-bridge-wool', name: 'Lift Bridge Wool', city: 'duluth', owner: 'Greta Sorensen', product: 'Merino Knit Hat' },
    // Santa Fe — Pilot P4
    { slug: 'placita-chile', name: 'Placita Chile Co.', city: 'santa-fe', owner: 'Tomás Archuleta', product: 'Red Chile Powder' },
    { slug: 'juniper-and-sage', name: 'Juniper & Sage Soapworks', city: 'santa-fe', owner: 'Willa Chee', product: 'Juniper Sage Soap' },
    { slug: 'adobe-hearth', name: 'Adobe Hearth Ceramics', city: 'santa-fe', owner: 'Rosa Montaño', product: 'Piñon Incense & Clay Burner' }
  ]
};
