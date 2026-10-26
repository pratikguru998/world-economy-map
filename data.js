// World economy dataset — approximate figures, USD billions.
//
// GDP: nominal, 2024 (IMF World Economic Outlook, rounded).
// Sector shares: approximate % of gross value added, from national accounts
//   (World Bank / OECD / national statistics offices), rounded. Shares are
//   normalised to 100% at load time.
// Companies: annual revenue, most recent fiscal year (~FY2024), from company
//   reports and the Fortune Global 500, rounded. Revenue is gross sales, NOT
//   value added, so the companies inside a sector can "add up" to more than
//   the sector's share of GDP — see the note in the UI.

const WORLD_GDP = 110000;

const SECTORS = [
  { key: "ag",        name: "Agriculture & Food" },
  { key: "energy",    name: "Mining, Oil & Utilities" },
  { key: "mfg",       name: "Manufacturing" },
  { key: "constr",    name: "Construction" },
  { key: "trade",     name: "Trade & Retail" },
  { key: "transport", name: "Transport & Logistics" },
  { key: "tech",      name: "Information & Telecom" },
  { key: "fin",       name: "Finance & Insurance" },
  { key: "realestate",name: "Real Estate" },
  { key: "prof",      name: "Professional & Business Services" },
  { key: "public",    name: "Government, Health & Education" },
  { key: "hosp",      name: "Hospitality & Other Services" },
];

// shares are in SECTORS order:
//          ag  energy mfg constr trade trans tech  fin  realest prof public hosp
const COUNTRIES = [
  // The five largest economies also carry `subs`: sector key → list of
  // [sub-industry, share of that sector's value added, companies]. Sub-industry
  // shares that don't add up to 1 leave an "Other …" slice. Sector shares for these
  // five follow the latest national accounts (BEA 2024, NBS China 2024, Destatis 2024,
  // Cabinet Office Japan 2022, MoSPI India FY2024-25), regrouped into the 12 sectors.
  {
    name: "United States", flag: "🇺🇸", gdp: 29180,
    shares: [0.9, 2.9, 10, 4.5, 12.2, 3.3, 5.5, 7.5, 13, 13, 19.8, 6.5],
    cos: {
      ag: [["Cargill", 160], ["Bunge", 53]],
      constr: [["D.R. Horton", 37], ["Lennar", 35], ["Bechtel", 21], ["PulteGroup", 18]],
    },
    subs: {
      energy: [
        ["Oil & gas extraction", 0.45, [["ExxonMobil", 340], ["Chevron", 196], ["ConocoPhillips", 56], ["Occidental", 27], ["EOG Resources", 24]]],
        ["Metal & mineral mining", 0.07, [["Freeport-McMoRan", 25], ["Newmont", 18]]],
        ["Electric & gas utilities", 0.48, [["Duke Energy", 30], ["Southern Company", 27], ["NextEra Energy", 25], ["Exelon", 23], ["Dominion Energy", 14]]],
      ],
      mfg: [
        ["Chemicals & pharma", 0.22, [["Johnson & Johnson", 89], ["Procter & Gamble", 84], ["Merck", 64], ["Pfizer", 64], ["AbbVie", 56], ["Eli Lilly", 45], ["Dow", 43]]],
        ["Food, beverage & tobacco", 0.16, [["PepsiCo", 92], ["Archer-Daniels-Midland", 86], ["Tyson Foods", 53], ["Coca-Cola", 47], ["Philip Morris", 38]]],
        ["Computers, chips & electronics", 0.13, [["Apple", 391], ["Nvidia", 130], ["Dell", 96], ["HP Inc", 54], ["Cisco", 54], ["Intel", 53]]],
        ["Petroleum refining", 0.07, [["Phillips 66", 145], ["Marathon Petroleum", 140], ["Valero", 130]]],
        ["Motor vehicles & parts", 0.07, [["General Motors", 187], ["Ford", 185], ["Tesla", 98]]],
        ["Machinery", 0.07, [["Caterpillar", 65], ["Deere", 51], ["GE Vernova", 35]]],
        ["Aerospace & defense", 0.06, [["RTX", 81], ["Lockheed Martin", 71], ["Boeing", 66], ["GE Aerospace", 39]]],
      ],
      trade: [
        ["Retail", 0.52, [["Walmart", 648], ["Amazon", 638], ["Costco", 254], ["Home Depot", 159], ["Kroger", 150], ["Walgreens", 147], ["Target", 107]]],
        ["Wholesale", 0.48, [["McKesson", 309], ["Cencora", 294], ["Cardinal Health", 227], ["Sysco", 78]]],
      ],
      transport: [
        ["Trucking", 0.25, [["J.B. Hunt", 12], ["XPO", 8]]],
        ["Couriers & warehousing", 0.25, [["UPS", 91], ["FedEx", 88]]],
        ["Airlines", 0.2, [["Delta Air Lines", 61], ["United Airlines", 57], ["American Airlines", 54]]],
        ["Railroads", 0.07, [["Union Pacific", 24], ["BNSF", 24], ["CSX", 15]]],
      ],
      tech: [
        ["Software & internet", 0.45, [["Alphabet", 350], ["Microsoft", 245], ["Meta", 165], ["Oracle", 53]]],
        ["Telecom & cable", 0.3, [["Verizon", 135], ["Comcast", 124], ["AT&T", 122], ["T-Mobile US", 81], ["Charter", 55]]],
        ["Media & entertainment", 0.25, [["Disney", 91], ["Netflix", 39], ["Warner Bros. Discovery", 39]]],
      ],
      fin: [
        ["Banking", 0.45, [["JPMorgan Chase", 278], ["Bank of America", 192], ["Citigroup", 170], ["Wells Fargo", 125]]],
        ["Insurance", 0.3, [["UnitedHealth Group", 400], ["Berkshire Hathaway", 371], ["Cigna", 247], ["Elevance Health", 177], ["MetLife", 70]]],
        ["Investment & payments", 0.25, [["Goldman Sachs", 126], ["Morgan Stanley", 104], ["Visa", 36], ["BlackRock", 20]]],
      ],
      realestate: [
        ["Housing (incl. owner-occupied rent)", 0.62, [["Equity Residential", 3], ["Invitation Homes", 2.6]]],
        ["Commercial property & REITs", 0.28, [["CBRE", 36], ["American Tower", 10], ["Prologis", 8], ["Simon Property", 6]]],
        ["Rental & leasing", 0.1, [["United Rentals", 15], ["Enterprise Mobility", 38]]],
      ],
      prof: [
        ["Legal, consulting, IT & R&D", 0.62, [["Accenture", 65], ["IBM", 63], ["Booz Allen", 11]]],
        ["Admin, staffing & waste", 0.25, [["Waste Management", 22], ["ADP", 19], ["ManpowerGroup", 18], ["Republic Services", 16]]],
        ["Management of companies", 0.13, []],
      ],
      public: [
        ["Government (federal, state, local)", 0.56, []],
        ["Health care", 0.38, [["CVS Health", 373], ["Kaiser Permanente", 115], ["HCA Healthcare", 70]]],
        ["Private education", 0.06, []],
      ],
      hosp: [
        ["Restaurants & food service", 0.45, [["Starbucks", 36], ["McDonald's", 26], ["Chipotle", 11]]],
        ["Arts, sports & entertainment", 0.18, [["Live Nation", 23]]],
        ["Hotels", 0.12, [["Marriott", 25], ["Hilton", 11]]],
      ],
    },
  },
  {
    name: "China", flag: "🇨🇳", gdp: 18750,
    shares: [6.8, 5.4, 26.2, 6.9, 10.2, 4.5, 4, 7.3, 6.2, 4.5, 13.4, 3],
    cos: {
      ag: [["COFCO", 100], ["Muyuan Foods", 19], ["New Hope Group", 15]],
      constr: [["China State Construction", 310], ["China Railway Group", 160], ["China Railway Construction", 150], ["China Communications Construction", 105], ["PowerChina", 90]],
      realestate: [["China Vanke", 47], ["Poly Developments", 43], ["Country Garden", 35]],
      prof: [["CITIC Group", 100]],
    },
    subs: {
      energy: [
        ["Power grid & generation", 0.4, [["State Grid", 545], ["China Southern Power Grid", 120], ["China Huaneng", 60]]],
        ["Coal & metal mining", 0.35, [["China Energy Investment", 110], ["China Shenhua", 47], ["Zijin Mining", 43]]],
        ["Oil & gas", 0.25, [["Sinopec", 430], ["PetroChina", 410], ["CNOOC", 58]]],
      ],
      mfg: [
        ["Electronics & telecom equipment", 0.18, [["Huawei", 120], ["Xiaomi", 51], ["Luxshare", 37], ["BOE Technology", 28]]],
        ["Food, drink & textiles", 0.14, [["WH Group", 26], ["Kweichow Moutai", 24], ["Yili", 16], ["Wuliangye", 12], ["Anta Sports", 10]]],
        ["Machinery & appliances", 0.13, [["Midea", 56], ["Haier", 55], ["Gree", 26], ["Sany Heavy", 11]]],
        ["Chemicals & pharma", 0.12, [["Sinochem", 150], ["Wanhua Chemical", 26]]],
        ["Steel & metals", 0.12, [["China Baowu Steel", 160], ["HBIS", 55], ["Chalco", 33]]],
        ["Autos, EVs & batteries", 0.09, [["BYD", 107], ["SAIC Motor", 87], ["FAW Group", 80], ["CATL", 50], ["Geely Auto", 33]]],
      ],
      trade: [
        ["Retail & e-commerce", 0.5, [["JD.com", 160], ["Alibaba", 137], ["PDD Holdings", 54]]],
        ["Wholesale & commodity trading", 0.5, [["China Minmetals", 125], ["Xiamen C&D", 100], ["Xiamen Xiangyu", 75]]],
      ],
      transport: [
        ["Rail", 0.25, [["China State Railway Group", 170]]],
        ["Shipping, post & logistics", 0.5, [["China Post", 110], ["SF Express", 39], ["COSCO Shipping", 32]]],
        ["Airlines", 0.1, [["China Southern Airlines", 24], ["Air China", 23], ["China Eastern", 18]]],
      ],
      tech: [
        ["Internet & software", 0.6, [["ByteDance", 155], ["Tencent", 92], ["Baidu", 18], ["NetEase", 15]]],
        ["Telecom", 0.4, [["China Mobile", 140], ["China Telecom", 72], ["China Unicom", 54]]],
      ],
      fin: [
        ["Banking", 0.7, [["ICBC", 223], ["China Construction Bank", 197], ["Agricultural Bank of China", 190], ["Bank of China", 175]]],
        ["Insurance", 0.2, [["Ping An Insurance", 162], ["China Life", 115], ["PICC", 85]]],
        ["Securities & fintech", 0.1, [["Ant Group", 25], ["CITIC Securities", 9]]],
      ],
      public: [
        ["Government", 0.45, []],
        ["Health care", 0.3, [["Sinopharm", 85], ["Mindray", 5]]],
        ["Education", 0.25, [["New Oriental", 4.3], ["TAL Education", 2]]],
      ],
      hosp: [
        ["Restaurants & delivery", 0.6, [["Meituan", 46], ["Yum China", 11], ["Haidilao", 6]]],
        ["Travel & hotels", 0.4, [["Trip.com", 7]]],
      ],
    },
  },
  {
    name: "Germany", flag: "🇩🇪", gdp: 4660,
    shares: [0.9, 3, 19.7, 6, 10, 4.2, 5, 3.6, 10, 11.5, 18.6, 5.4],
    cos: {
      ag: [["BayWa", 22], ["Südzucker", 11]],
      energy: [["E.ON", 87], ["Uniper", 70], ["EnBW", 37], ["RWE", 26]],
      constr: [["Hochtief", 35], ["Heidelberg Materials", 23]],
      transport: [["DHL Group", 91], ["Deutsche Bahn", 49], ["Lufthansa", 41], ["Hapag-Lloyd", 21]],
      tech: [["Deutsche Telekom", 125], ["SAP", 37], ["Bertelsmann", 20], ["Vodafone Germany", 14]],
      realestate: [["Vonovia", 7], ["LEG Immobilien", 1.3]],
      prof: [["Dekra", 4.5], ["TÜV SÜD", 3.5]],
      hosp: [["TUI", 25], ["Delivery Hero", 13]],
    },
    subs: {
      mfg: [
        ["Automotive", 0.25, [["Volkswagen", 350], ["Mercedes-Benz", 157], ["BMW", 154], ["Bosch", 98], ["ZF Friedrichshafen", 50], ["Continental", 43]]],
        ["Chemicals & pharma", 0.16, [["BASF", 70], ["Bayer", 51], ["Boehringer Ingelheim", 28], ["Merck KGaA", 23], ["Henkel", 23]]],
        ["Machinery & equipment", 0.15, [["Siemens Energy", 37], ["Kion", 12], ["GEA", 6], ["Trumpf", 5]]],
        ["Electrical & electronics", 0.12, [["Siemens", 82], ["Siemens Healthineers", 24], ["Infineon", 16]]],
        ["Metals", 0.1, [["Thyssenkrupp", 38], ["Aurubis", 18], ["Salzgitter", 11]]],
        ["Food & beverage", 0.06, [["Dr. Oetker", 8], ["Tönnies", 8]]],
      ],
      trade: [
        ["Retail", 0.55, [["Schwarz Group (Lidl)", 190], ["Aldi", 140], ["Rewe", 95], ["Edeka", 80], ["Ceconomy", 24], ["Zalando", 11]]],
        ["Wholesale", 0.45, [["Phoenix Group", 37], ["Metro", 33]]],
      ],
      fin: [
        ["Insurance & reinsurance", 0.5, [["Allianz", 175], ["Munich Re", 85], ["Talanx", 50], ["Hannover Re", 30]]],
        ["Banking", 0.5, [["Deutsche Bank", 32], ["Commerzbank", 30], ["DZ Bank", 20]]],
      ],
      public: [
        ["Government & defence", 0.45, []],
        ["Health & social care", 0.38, [["Fresenius", 24], ["Asklepios", 6]]],
        ["Education", 0.17, []],
      ],
    },
  },
  {
    name: "Japan", flag: "🇯🇵", gdp: 4030,
    shares: [1, 2.3, 20, 5.5, 13.5, 4.8, 5, 4.2, 11.8, 8.5, 17.5, 5.8],
    cos: {
      ag: [["Zen-Noh", 40]],
      constr: [["Daiwa House", 35], ["Sekisui House", 27], ["Kajima", 18], ["Obayashi", 16]],
      transport: [["JR East", 19], ["JR Central", 12], ["Nippon Express", 17], ["NYK Line", 16], ["ANA Holdings", 15]],
      realestate: [["Mitsui Fudosan", 17], ["Mitsubishi Estate", 11]],
      prof: [["Recruit Holdings", 23], ["Secom", 7]],
      hosp: [["Zensho", 7], ["Oriental Land", 4.5]],
    },
    subs: {
      energy: [
        ["Oil refining & gas", 0.4, [["ENEOS", 95], ["Idemitsu Kosan", 60], ["Cosmo Energy", 20], ["INPEX", 15]]],
        ["Electric power", 0.6, [["TEPCO", 45], ["Kansai Electric", 28], ["Chubu Electric", 24]]],
      ],
      mfg: [
        ["Autos & parts", 0.2, [["Toyota", 310], ["Honda", 140], ["Nissan", 85], ["Denso", 47], ["Suzuki", 37], ["Mazda", 33], ["Subaru", 31]]],
        ["Electronics & chip equipment", 0.17, [["Hitachi", 65], ["Panasonic", 55], ["Mitsubishi Electric", 36], ["Canon", 30], ["Tokyo Electron", 16], ["Keyence", 7]]],
        ["Machinery", 0.14, [["Mitsubishi Heavy", 33], ["Daikin", 31], ["Komatsu", 28], ["Kubota", 20], ["Fanuc", 5]]],
        ["Chemicals & pharma", 0.14, [["Takeda", 30], ["Mitsubishi Chemical", 30], ["Shin-Etsu Chemical", 16], ["Astellas", 13]]],
        ["Food, drink & tobacco", 0.12, [["Japan Tobacco", 21], ["Suntory", 20], ["Asahi Group", 19], ["Kirin", 16], ["Ajinomoto", 10]]],
        ["Steel & metals", 0.1, [["Nippon Steel", 59], ["JFE Holdings", 35], ["Sumitomo Electric", 30]]],
      ],
      trade: [
        ["Trading houses (sogo shosha)", 0.4, [["Mitsubishi Corp", 130], ["Mitsui & Co", 95], ["Itochu", 95], ["Toyota Tsusho", 68], ["Marubeni", 50], ["Sumitomo Corp", 47]]],
        ["Retail", 0.6, [["Seven & i", 80], ["Aeon", 65], ["Fast Retailing (Uniqlo)", 21], ["Pan Pacific (Don Quijote)", 14]]],
      ],
      tech: [
        ["Telecom", 0.45, [["NTT", 92], ["SoftBank Corp", 43], ["KDDI", 39]]],
        ["Media, games & internet", 0.3, [["Sony", 87], ["SoftBank Group", 47], ["Rakuten", 15], ["Nintendo", 11]]],
        ["Software & IT services", 0.25, [["NTT Data", 30], ["Fujitsu", 26], ["NEC", 23]]],
      ],
      fin: [
        ["Banking", 0.5, [["MUFG", 80], ["SMFG", 60], ["Mizuho", 50], ["Japan Post Bank", 15]]],
        ["Insurance", 0.4, [["Nippon Life", 70], ["Dai-ichi Life", 65], ["Tokio Marine", 50], ["Japan Post Insurance", 45], ["MS&AD", 40]]],
        ["Securities", 0.1, [["Nomura", 12], ["Daiwa Securities", 4]]],
      ],
      public: [
        ["Health & elderly care", 0.48, []],
        ["Government", 0.35, []],
        ["Education", 0.17, []],
      ],
    },
  },
  {
    name: "India", flag: "🇮🇳", gdp: 3910,
    shares: [17.9, 4.3, 13.9, 8.75, 10.5, 4.1, 5.5, 5.5, 7.5, 4.4, 12, 3.9],
    cos: {
      constr: [["Larsen & Toubro", 27], ["NCC", 2.5], ["Tata Projects", 2.4], ["Afcons", 1.5]],
      prof: [["Quess Corp", 2.3], ["TeamLease", 1.3]],
    },
    subs: {
      ag: [
        ["Crop farming (smallholders)", 0.55, []],
        ["Livestock & dairy", 0.3, [["Amul (GCMMF)", 7.3], ["Mother Dairy", 2]]],
        ["Forestry & fishing", 0.15, [["Avanti Feeds", 0.6]]],
      ],
      energy: [
        ["Power & utilities", 0.45, [["NTPC", 21], ["Tata Power", 7.3], ["Adani Power", 6.7], ["Power Grid", 5.5]]],
        ["Coal & metal mining", 0.35, [["Vedanta", 18], ["Coal India", 17], ["NMDC", 2.6]]],
        ["Oil & gas extraction", 0.2, [["ONGC", 17], ["Oil India", 4]]],
      ],
      mfg: [
        ["Food & FMCG", 0.15, [["ITC", 9], ["Hindustan Unilever", 7.4], ["Adani Wilmar", 6.5], ["Nestlé India", 2.4], ["Britannia", 2]]],
        ["Refining & petrochemicals", 0.15, [["Indian Oil", 94], ["Reliance (oil-to-chemicals)", 70], ["BPCL", 54], ["HPCL", 52]]],
        ["Metals & cement", 0.14, [["Tata Steel", 26], ["Hindalco", 26], ["JSW Steel", 21], ["SAIL", 12], ["UltraTech Cement", 8.5]]],
        ["Autos & two-wheelers", 0.12, [["Tata Motors", 52], ["Mahindra & Mahindra", 18], ["Maruti Suzuki", 17], ["Bajaj Auto", 5.5], ["Hero MotoCorp", 4.5]]],
        ["Pharma & chemicals", 0.12, [["Sun Pharma", 6], ["UPL", 5.3], ["Asian Paints", 4], ["Dr. Reddy's", 3.4], ["Cipla", 3.1]]],
        ["Electronics & machinery", 0.1, [["Dixon Technologies", 4.6], ["BHEL", 3], ["Siemens India", 2.5]]],
        ["Textiles & apparel", 0.08, [["Welspun Living", 1.2], ["Arvind", 1]]],
      ],
      trade: [
        ["Kirana & traditional trade", 0.6, []],
        ["Organised retail & e-commerce", 0.2, [["Reliance Retail", 37], ["Flipkart", 7], ["Avenue Supermarts (DMart)", 6.5], ["Trent", 2.5]]],
        ["Wholesale", 0.2, [["Adani Enterprises", 12], ["Redington", 11]]],
      ],
      transport: [
        ["Road transport", 0.6, [["Delhivery", 1], ["TCI", 0.5]]],
        ["Railways", 0.2, [["Indian Railways", 30]]],
        ["Ports & logistics", 0.12, [["Adani Ports", 3.4], ["Container Corp", 1], ["Blue Dart", 0.7]]],
        ["Airlines", 0.08, [["IndiGo", 9], ["Air India", 4.8]]],
      ],
      tech: [
        ["IT services & outsourcing", 0.65, [["TCS", 29], ["Infosys", 19], ["HCLTech", 13], ["Wipro", 10], ["Tech Mahindra", 6.3], ["LTIMindtree", 4.3]]],
        ["Telecom", 0.3, [["Bharti Airtel", 20], ["Jio Platforms", 14], ["Vodafone Idea", 5]]],
        ["Media", 0.05, [["Zee Entertainment", 1], ["Sun TV", 0.5]]],
      ],
      fin: [
        ["Banking", 0.6, [["State Bank of India", 60], ["HDFC Bank", 40], ["ICICI Bank", 25], ["Axis Bank", 15], ["Kotak Mahindra", 10]]],
        ["Insurance", 0.25, [["LIC", 100], ["SBI Life", 10]]],
        ["NBFCs & fintech", 0.15, [["Bajaj Finance", 7.6], ["Shriram Finance", 4.4], ["Paytm", 0.8]]],
      ],
      realestate: [
        ["Housing (incl. owner-occupied rent)", 0.75, []],
        ["Developers & commercial", 0.25, [["Macrotech (Lodha)", 1.6], ["DLF", 0.8], ["Godrej Properties", 0.6], ["Embassy REIT", 0.5]]],
      ],
      public: [
        ["Government & defence", 0.6, []],
        ["Health care", 0.22, [["Apollo Hospitals", 2.6], ["Max Healthcare", 0.8], ["Fortis", 0.8]]],
        ["Education", 0.18, []],
      ],
      hosp: [
        ["Hotels, restaurants & delivery", 0.35, [["Swiggy", 1.4], ["Zomato", 1.2], ["Indian Hotels (Taj)", 0.8], ["Jubilant FoodWorks", 0.8]]],
        ["Personal & household services", 0.65, []],
      ],
    },
  },
  {
    name: "United Kingdom", flag: "🇬🇧", gdp: 3640,
    shares: [0.7, 3, 9, 6, 10.5, 4, 7, 8.5, 13, 12, 21, 5],
    cos: {
      energy: [["Shell", 285], ["BP", 190], ["Centrica", 30], ["National Grid", 25]],
      mfg: [["Unilever", 65], ["AstraZeneca", 54], ["GSK", 40], ["Jaguar Land Rover", 37], ["BAE Systems", 35], ["Rolls-Royce", 22]],
      constr: [["Balfour Beatty", 10], ["Taylor Wimpey", 4.5]],
      trade: [["Tesco", 87], ["Sainsbury's", 41], ["Marks & Spencer", 17]],
      transport: [["IAG (British Airways)", 40], ["easyJet", 12]],
      tech: [["Vodafone", 40], ["BT Group", 26], ["RELX", 12], ["Arm", 3.2]],
      fin: [["HSBC", 66], ["Barclays", 33], ["Lloyds", 23], ["Legal & General", 15], ["Prudential", 10]],
      realestate: [["Landsec", 1], ["British Land", 0.8]],
      prof: [["Experian", 7], ["Capita", 3]],
      hosp: [["Compass Group", 42], ["Whitbread", 3.6]],
    },
  },
  {
    name: "France", flag: "🇫🇷", gdp: 3160,
    shares: [1.7, 2.5, 11, 5.5, 10.5, 4.5, 5, 4, 13, 13, 25, 4.3],
    cos: {
      energy: [["TotalEnergies", 195], ["EDF", 150], ["Engie", 80]],
      mfg: [["LVMH", 92], ["Renault", 61], ["Saint-Gobain", 50], ["Sanofi", 47], ["L'Oréal", 47], ["Michelin", 30]],
      constr: [["Vinci", 77], ["Bouygues", 61], ["Eiffage", 25]],
      trade: [["Carrefour", 95], ["E.Leclerc", 60], ["Auchan", 35]],
      transport: [["CMA CGM", 55], ["SNCF", 46], ["Air France-KLM", 34]],
      tech: [["Orange", 43], ["Vivendi", 20]],
      fin: [["AXA", 120], ["BNP Paribas", 52], ["Crédit Agricole", 40], ["Société Générale", 30]],
      realestate: [["Unibail-Rodamco-Westfield", 3.5]],
      prof: [["Capgemini", 24], ["Teleperformance", 11]],
      hosp: [["Sodexo", 26], ["Accor", 6]],
    },
  },
  {
    name: "Italy", flag: "🇮🇹", gdp: 2370,
    shares: [2, 3, 16, 5, 11, 5, 3.5, 5, 14, 9.5, 18, 8],
    cos: {
      energy: [["Eni", 95], ["Enel", 85]],
      mfg: [["Leonardo", 19], ["Prysmian", 18], ["Ferrari", 7], ["Pirelli", 7]],
      constr: [["Webuild", 13]],
      trade: [["Conad", 22], ["Coop Italia", 15], ["Esselunga", 10]],
      transport: [["Ferrovie dello Stato", 18], ["Poste Italiane", 14]],
      tech: [["TIM (Telecom Italia)", 15]],
      fin: [["Generali", 95], ["Intesa Sanpaolo", 30], ["UniCredit", 26]],
    },
  },
  {
    name: "Canada", flag: "🇨🇦", gdp: 2240,
    shares: [2, 9, 9.5, 7.5, 10.5, 4.5, 3.5, 7, 13, 8, 19, 6.5],
    cos: {
      ag: [["Nutrien", 26]],
      energy: [["Suncor", 40], ["Enbridge", 39], ["Canadian Natural", 26], ["Hydro-Québec", 12]],
      mfg: [["Magna International", 43], ["Saputo", 13], ["Bombardier", 9]],
      constr: [["AtkinsRéalis", 7]],
      trade: [["Couche-Tard", 73], ["Loblaw", 45], ["Empire Company", 23]],
      transport: [["Air Canada", 16], ["CN Rail", 13], ["CPKC", 11]],
      tech: [["BCE", 18], ["Rogers", 15], ["Shopify", 9]],
      fin: [["Brookfield", 90], ["Royal Bank of Canada", 42], ["TD Bank", 40], ["Manulife", 30]],
      prof: [["CGI", 11], ["Thomson Reuters", 7]],
      hosp: [["Restaurant Brands Intl", 8]],
    },
  },
  {
    name: "Brazil", flag: "🇧🇷", gdp: 2170,
    shares: [7, 5, 13, 4, 13, 5, 3, 8, 9, 8, 19, 6],
    cos: {
      ag: [["JBS", 77], ["BRF", 11]],
      energy: [["Petrobras", 92], ["Raízen", 45], ["Vale", 38]],
      mfg: [["Ambev", 17], ["Gerdau", 12], ["Suzano", 9], ["Embraer", 6.4]],
      constr: [["MRV", 2]],
      trade: [["Carrefour Brasil", 22], ["Magazine Luiza", 7]],
      transport: [["Rumo", 2.5]],
      tech: [["Telefônica Brasil (Vivo)", 10]],
      fin: [["Banco do Brasil", 50], ["Itaú Unibanco", 40], ["Bradesco", 35], ["Nubank", 12]],
      public: [["Rede D'Or", 8]],
    },
  },
  {
    name: "Russia", flag: "🇷🇺", gdp: 2160,
    shares: [4, 14, 14, 5, 13, 7, 3, 5, 9, 6, 13, 7],
    cos: {
      energy: [["Rosneft", 115], ["Gazprom", 110], ["Lukoil", 95], ["Nornickel", 12]],
      mfg: [["Rostec", 30], ["NLMK", 10], ["Severstal", 9]],
      constr: [["PIK Group", 6]],
      trade: [["X5 Group", 45], ["Magnit", 31]],
      transport: [["Russian Railways", 32], ["Aeroflot", 9]],
      tech: [["Yandex", 12], ["MTS", 7], ["Rostelecom", 7]],
      fin: [["Sberbank", 60], ["VTB", 40]],
    },
  },
  {
    name: "South Korea", flag: "🇰🇷", gdp: 1870,
    shares: [2, 2.5, 26, 5.5, 8, 3.5, 5, 6, 8, 9, 17, 7.5],
    cos: {
      energy: [["KEPCO", 70], ["SK Innovation", 55], ["S-Oil", 26]],
      mfg: [["Samsung Electronics", 220], ["Hyundai Motor", 128], ["Kia", 79], ["LG Electronics", 64], ["POSCO", 54], ["SK Hynix", 48], ["LG Chem", 37]],
      constr: [["Samsung C&T", 31], ["Hyundai E&C", 23]],
      trade: [["Coupang", 30], ["E-Mart", 21], ["Lotte Shopping", 10]],
      transport: [["Korean Air", 12], ["HMM", 8]],
      tech: [["KT", 19], ["SK Telecom", 13], ["Naver", 7.5], ["Kakao", 6]],
      fin: [["KB Financial", 30], ["Samsung Life", 25], ["Shinhan Financial", 25]],
    },
  },
  {
    name: "Mexico", flag: "🇲🇽", gdp: 1850,
    shares: [3.5, 6, 20, 6.5, 19, 7, 2, 5, 10, 5, 11, 5],
    cos: {
      energy: [["Pemex", 90], ["CFE", 25], ["Grupo México", 16]],
      mfg: [["Grupo Bimbo", 22], ["Cemex", 16]],
      trade: [["Walmart de México", 52], ["FEMSA (OXXO)", 41], ["Liverpool", 10]],
      transport: [["Aeroméxico", 5], ["Volaris", 3]],
      tech: [["América Móvil", 46], ["Televisa", 3]],
      fin: [["BBVA México", 20], ["Banorte", 17]],
    },
  },
  {
    name: "Australia", flag: "🇦🇺", gdp: 1800,
    shares: [2.5, 13, 5.5, 8, 9, 5, 2.5, 9, 12, 9, 18, 6.5],
    cos: {
      ag: [["Elders", 2]],
      energy: [["BHP", 56], ["Rio Tinto", 54], ["Fortescue", 18], ["Woodside", 13], ["AGL Energy", 9]],
      mfg: [["CSL", 15], ["Amcor", 13.6], ["BlueScope", 11]],
      constr: [["Lendlease", 6]],
      trade: [["Woolworths", 44], ["Wesfarmers", 29], ["Coles", 29]],
      transport: [["Qantas", 15], ["Transurban", 3]],
      tech: [["Telstra", 15], ["Atlassian", 4.4]],
      fin: [["Commonwealth Bank", 19], ["Westpac", 15], ["NAB", 14], ["ANZ", 14], ["Macquarie", 12]],
      realestate: [["Scentre Group", 1.7], ["Goodman Group", 1.5]],
      public: [["Ramsay Health Care", 11]],
    },
  },
  {
    name: "Spain", flag: "🇪🇸", gdp: 1730,
    shares: [2.5, 3, 11.5, 6, 13, 4.5, 4, 4, 12, 9, 19, 11.5],
    cos: {
      energy: [["Repsol", 64], ["Iberdrola", 49], ["Endesa", 23], ["Naturgy", 21]],
      mfg: [["Grifols", 7.8], ["Acerinox", 6]],
      constr: [["ACS", 45], ["Acciona", 20], ["Ferrovial", 10]],
      trade: [["Inditex (Zara)", 41], ["Mercadona", 41], ["El Corte Inglés", 18]],
      transport: [["Aena", 6]],
      tech: [["Telefónica", 44], ["Amadeus", 6.5]],
      fin: [["Santander", 70], ["BBVA", 45], ["Mapfre", 30], ["CaixaBank", 20]],
      hosp: [["Meliá Hotels", 2]],
    },
  },
  {
    name: "Indonesia", flag: "🇮🇩", gdp: 1400,
    shares: [13, 11, 19, 10, 13, 5.5, 4.5, 4, 2.5, 2, 9, 6.5],
    cos: {
      ag: [["Astra Agro Lestari", 1.4]],
      energy: [["Pertamina", 75], ["PLN", 35], ["Adaro Energy", 6.5]],
      mfg: [["Astra International", 21], ["Indofood", 7], ["Gudang Garam", 7]],
      constr: [["Wijaya Karya", 1.4]],
      trade: [["Indomaret", 9], ["Alfamart", 7], ["GoTo", 1]],
      transport: [["Garuda Indonesia", 3.4]],
      tech: [["Telkom Indonesia", 9.6]],
      fin: [["Bank Rakyat Indonesia", 15], ["Bank Mandiri", 12], ["Bank Central Asia", 7]],
    },
  },
  {
    name: "Turkey", flag: "🇹🇷", gdp: 1320,
    shares: [6, 3, 22, 6, 13, 9, 3, 3, 7, 5, 13, 10],
    cos: {
      energy: [["BOTAŞ", 30], ["Tüpraş", 25]],
      mfg: [["Koç Holding", 60], ["Ford Otosan", 18], ["Arçelik", 9], ["Erdemir", 6]],
      trade: [["BİM", 12], ["Migros Türk", 9]],
      transport: [["Turkish Airlines", 22]],
      tech: [["Turkcell", 5], ["Türk Telekom", 5]],
      fin: [["Ziraat Bankası", 25], ["İşbank", 18], ["Garanti BBVA", 15]],
    },
  },
  {
    name: "Netherlands", flag: "🇳🇱", gdp: 1230,
    shares: [1.5, 2.5, 11.5, 5, 13.5, 5, 6, 7, 8, 14, 20, 6],
    cos: {
      energy: [["Eneco", 8]],
      mfg: [["Stellantis", 170], ["Airbus", 75], ["Heineken", 39], ["ASML", 30], ["Philips", 19]],
      trade: [["Ahold Delhaize", 97]],
      transport: [["PostNL", 3.6]],
      tech: [["Prosus", 6], ["KPN", 6]],
      fin: [["ING", 25], ["Aegon", 15], ["Rabobank", 15], ["ABN AMRO", 10]],
      prof: [["Randstad", 26], ["Wolters Kluwer", 6]],
    },
  },
  {
    name: "Saudi Arabia", flag: "🇸🇦", gdp: 1100,
    shares: [2.5, 38, 14, 6, 9, 4, 3, 4, 5, 2, 9, 3.5],
    cos: {
      energy: [["Saudi Aramco", 480], ["Saudi Electricity", 20], ["Ma'aden", 9]],
      mfg: [["SABIC", 37], ["Almarai", 5.6]],
      trade: [["Jarir", 2.5]],
      transport: [["Saudia", 8]],
      tech: [["stc", 20]],
      fin: [["Al Rajhi Bank", 10], ["Saudi National Bank", 10]],
    },
  },
  {
    name: "Switzerland", flag: "🇨🇭", gdp: 940,
    shares: [0.7, 2, 19, 5, 15, 4, 5, 9, 7, 9, 18, 6.3],
    cos: {
      energy: [["Glencore", 230], ["Axpo", 9]],
      mfg: [["Nestlé", 101], ["Roche", 68], ["Novartis", 50], ["ABB", 33]],
      trade: [["Vitol", 400], ["Trafigura", 240], ["Coop", 38], ["Migros", 33]],
      transport: [["MSC", 90], ["Kuehne+Nagel", 27]],
      tech: [["Swisscom", 12]],
      fin: [["Zurich Insurance", 70], ["UBS", 48], ["Swiss Re", 46]],
      prof: [["Adecco", 26], ["SGS", 8]],
    },
  },
  {
    name: "Poland", flag: "🇵🇱", gdp: 910,
    shares: [2.5, 5, 18, 7, 16, 7, 4, 4, 5, 7, 16, 8.5],
    cos: {
      energy: [["Orlen", 85], ["PGE", 22], ["KGHM", 8]],
      trade: [["Biedronka (Jerónimo Martins)", 23], ["LPP", 5], ["Allegro", 2.8]],
      transport: [["PKP Group", 7], ["LOT Polish Airlines", 2]],
      tech: [["Asseco", 4.2], ["Orange Polska", 3.2], ["CD Projekt", 0.3]],
      fin: [["PKO Bank Polski", 12], ["PZU", 7], ["Bank Pekao", 5]],
    },
  },
  {
    name: "Taiwan", flag: "🇹🇼", gdp: 790,
    shares: [1.5, 2, 35, 3, 15, 3, 4, 7, 8, 4, 12, 5.5],
    cos: {
      energy: [["CPC Corporation", 40], ["Taipower", 20]],
      mfg: [["Foxconn (Hon Hai)", 213], ["TSMC", 90], ["Quanta Computer", 43], ["Pegatron", 40], ["MediaTek", 17], ["Formosa Plastics", 7]],
      trade: [["President Chain Store (7-Eleven TW)", 9]],
      transport: [["Evergreen Marine", 13], ["China Airlines", 7]],
      tech: [["Chunghwa Telecom", 7]],
      fin: [["Fubon Financial", 16], ["Cathay Financial", 15], ["CTBC Financial", 9]],
    },
  },
];

// Everything else, grouped by region. Countries have the same shape as COUNTRIES;
// the region's GDP not covered by its listed countries becomes a "Rest of …" slice.
// Revenue for state-owned firms that don't publish full accounts (ADNOC, NIOC,
// QatarEnergy, Sonatrach, NNPC, …) is a rough estimate.
//          ag  energy mfg constr trade trans tech  fin  realest prof public hosp
const REGIONS = [
  {
    name: "Other Asia-Pacific", gdp: 5600,
    countries: [
      {
        name: "Singapore", flag: "🇸🇬", gdp: 550,
        shares: [0, 3, 18, 3.5, 20, 9, 5.5, 14, 3.5, 10, 9.5, 4],
        cos: {
          energy: [["Sembcorp", 7]],
          mfg: [["Flex", 26]],
          trade: [["Wilmar International", 67], ["Olam Group", 35]],
          transport: [["Singapore Airlines", 14], ["PSA International", 6]],
          tech: [["Sea Ltd", 17], ["Singtel", 11]],
          fin: [["DBS", 17], ["OCBC", 11], ["UOB", 10]],
          realestate: [["CapitaLand", 4]],
          hosp: [["Genting Singapore", 2]],
        },
      },
      {
        name: "Thailand", flag: "🇹🇭", gdp: 530,
        shares: [8.5, 4.5, 26, 2.5, 17, 5, 3, 7.5, 7.5, 4.5, 9, 5],
        cos: {
          ag: [["Charoen Pokphand Foods", 18]],
          energy: [["PTT", 90], ["EGAT", 18]],
          mfg: [["Siam Cement Group", 15], ["Thai Beverage", 9]],
          trade: [["CP All (7-Eleven TH)", 26], ["Central Retail", 7]],
          transport: [["Thai Airways", 5], ["Airports of Thailand", 2]],
          tech: [["True Corp", 6], ["Advanced Info Service", 6]],
          fin: [["Kasikornbank", 6], ["Bangkok Bank", 6], ["SCB X", 5]],
          hosp: [["Minor International", 5]],
        },
      },
      {
        name: "Philippines", flag: "🇵🇭", gdp: 470,
        shares: [9, 4, 17, 7, 19, 4, 3, 10, 7, 9, 7, 4],
        cos: {
          energy: [["Petron", 10], ["Meralco", 8]],
          mfg: [["San Miguel Corp", 27]],
          trade: [["SM Investments", 10], ["Puregold", 4]],
          transport: [["Philippine Airlines", 3], ["Cebu Pacific", 2]],
          tech: [["PLDT", 4], ["Globe Telecom", 3]],
          fin: [["BDO Unibank", 4], ["BPI", 3]],
          hosp: [["Jollibee Foods", 5]],
        },
      },
      {
        name: "Vietnam", flag: "🇻🇳", gdp: 470,
        shares: [12, 7, 25, 6, 13, 5, 3, 5, 4, 3, 9, 8],
        cos: {
          energy: [["Petrovietnam", 40], ["EVN", 22]],
          mfg: [["Samsung Electronics Vietnam", 60], ["Hoa Phat Group", 5.5], ["Vinamilk", 2.5]],
          trade: [["Mobile World", 5.5]],
          transport: [["Vietnam Airlines", 4]],
          tech: [["Viettel", 7], ["FPT", 2.5]],
          fin: [["Vietcombank", 3.5], ["BIDV", 3]],
          realestate: [["Vingroup", 6.5]],
        },
      },
      {
        name: "Bangladesh", flag: "🇧🇩", gdp: 450,
        shares: [11, 2, 22, 8, 15, 7, 2, 3, 6, 2, 10, 12],
        cos: {
          energy: [["Petrobangla", 3]],
          mfg: [["Walton", 1], ["Beximco", 1], ["Square Pharmaceuticals", 0.6]],
          tech: [["Grameenphone", 1.3]],
          fin: [["BRAC Bank", 0.5]],
        },
      },
      {
        name: "Malaysia", flag: "🇲🇾", gdp: 420,
        shares: [7, 9, 23, 4, 18, 4, 7, 7, 3.5, 3, 11, 3.5],
        cos: {
          ag: [["SD Guthrie", 5], ["IOI Corp", 3]],
          energy: [["Petronas", 75], ["Tenaga Nasional", 13]],
          trade: [["Sime Darby", 12]],
          transport: [["MISC", 3], ["Malaysia Airlines", 3]],
          tech: [["CelcomDigi", 3], ["Maxis", 2]],
          fin: [["Maybank", 13], ["CIMB", 6], ["Public Bank", 6]],
          public: [["IHH Healthcare", 5]],
          hosp: [["Genting", 6]],
        },
      },
      {
        name: "Hong Kong", flag: "🇭🇰", gdp: 410,
        shares: [0.1, 1.5, 1, 4, 18, 6, 4, 23, 11, 7, 18, 6.4],
        cos: {
          energy: [["CLP Holdings", 11]],
          trade: [["CK Hutchison", 37], ["Jardine Matheson", 36]],
          transport: [["Cathay Pacific", 13], ["MTR Corp", 8]],
          tech: [["Lenovo", 57], ["PCCW", 5]],
          fin: [["AIA Group", 20], ["Hang Seng Bank", 6], ["HKEX", 3]],
          realestate: [["Sun Hung Kai Properties", 10], ["Henderson Land", 3]],
        },
      },
      {
        name: "Pakistan", flag: "🇵🇰", gdp: 370,
        shares: [23, 3, 12, 2.5, 19, 9, 2.5, 3, 6, 2, 9, 9],
        cos: {
          energy: [["Pakistan State Oil", 13], ["OGDCL", 1.5]],
          mfg: [["Lucky Cement", 1.5], ["Engro", 1.5]],
          transport: [["PIA", 0.9]],
          tech: [["Jazz", 1]],
          fin: [["HBL", 2], ["MCB Bank", 1]],
        },
      },
      {
        name: "New Zealand", flag: "🇳🇿", gdp: 260,
        shares: [6, 3, 9, 6.5, 11, 4, 3, 6.5, 13, 9, 18, 11],
        cos: {
          ag: [["Fonterra", 15], ["Zespri", 2.4]],
          energy: [["Contact Energy", 2], ["Mercury NZ", 2]],
          mfg: [["Fletcher Building", 4.5], ["Fisher & Paykel Healthcare", 1]],
          trade: [["Foodstuffs", 9], ["Woolworths NZ", 5]],
          transport: [["Air New Zealand", 4]],
          tech: [["Spark NZ", 2.2]],
        },
      },
    ],
  },
  {
    name: "Other Europe", gdp: 4300,
    countries: [
      {
        name: "Ireland", flag: "🇮🇪", gdp: 580,
        shares: [1, 0.7, 40, 2.5, 7, 3, 16, 7, 6, 6, 8, 2.8],
        cos: {
          ag: [["Kerry Group", 9]],
          energy: [["DCC", 20]],
          mfg: [["CRH", 35], ["Medtronic", 33], ["Eaton", 25], ["Johnson Controls", 23], ["Smurfit Westrock", 21]],
          trade: [["Musgrave", 6]],
          transport: [["Ryanair", 14]],
          fin: [["Bank of Ireland", 6], ["AIB", 5]],
        },
      },
      {
        name: "Austria", flag: "🇦🇹", gdp: 520,
        shares: [1.2, 3, 18, 7, 12, 5, 4, 4, 10, 10, 19, 6.8],
        cos: {
          energy: [["OMV", 37], ["Verbund", 10]],
          mfg: [["voestalpine", 18], ["Red Bull", 12], ["Andritz", 9]],
          constr: [["Strabag", 19]],
          trade: [["Spar Österreich", 18]],
          transport: [["Austrian Post", 3.3]],
          tech: [["A1 Telekom Austria", 6]],
          fin: [["Vienna Insurance Group", 13], ["Erste Group", 12], ["Raiffeisen Bank Intl", 10]],
        },
      },
      {
        name: "Norway", flag: "🇳🇴", gdp: 480,
        shares: [2, 25, 7, 6, 8, 5, 4, 5, 7, 6, 18, 7],
        cos: {
          ag: [["Mowi", 6]],
          energy: [["Equinor", 103], ["Aker BP", 13], ["Statkraft", 9]],
          mfg: [["Norsk Hydro", 18], ["Yara", 14], ["Orkla", 6]],
          trade: [["NorgesGruppen", 12]],
          transport: [["Norwegian Air", 3]],
          tech: [["Telenor", 7]],
          fin: [["DNB", 9]],
        },
      },
      {
        name: "Denmark", flag: "🇩🇰", gdp: 410,
        shares: [1, 2, 20, 5, 13, 9, 5, 6, 8, 9, 17, 5],
        cos: {
          ag: [["Arla Foods", 15], ["Danish Crown", 9]],
          energy: [["Ørsted", 11]],
          mfg: [["Novo Nordisk", 42], ["Vestas", 18], ["Carlsberg", 11], ["Lego", 10]],
          transport: [["Maersk", 56], ["DSV", 24]],
          fin: [["Danske Bank", 8]],
          prof: [["ISS", 12]],
        },
      },
      {
        name: "Romania", flag: "🇷🇴", gdp: 380,
        shares: [4, 4, 18, 7, 18, 6, 7, 3, 9, 6, 13, 5],
        cos: {
          energy: [["OMV Petrom", 7], ["Hidroelectrica", 2]],
          mfg: [["Dacia", 9]],
          trade: [["Dedeman", 2]],
          tech: [["Bitdefender", 0.3]],
          fin: [["Banca Transilvania", 3]],
        },
      },
      {
        name: "Czechia", flag: "🇨🇿", gdp: 340,
        shares: [2, 4, 25, 5, 13, 6, 5, 4, 8, 7, 15, 6],
        cos: {
          energy: [["ČEZ", 13]],
          mfg: [["Škoda Auto", 30]],
          trade: [["Alza.cz", 2]],
          transport: [["České dráhy", 2]],
          fin: [["ČSOB", 3], ["Komerční banka", 2]],
        },
      },
      {
        name: "Portugal", flag: "🇵🇹", gdp: 310,
        shares: [2.5, 3, 13, 4.5, 16, 5.5, 5, 5, 12, 9, 17, 7.5],
        cos: {
          energy: [["Galp", 25], ["EDP", 17]],
          mfg: [["The Navigator Company", 2.3]],
          trade: [["Sonae", 9], ["Pingo Doce (Jerónimo Martins)", 5]],
          transport: [["TAP Air Portugal", 4.5]],
          tech: [["NOS", 1.7]],
          fin: [["Millennium bcp", 4], ["Caixa Geral de Depósitos", 4]],
        },
      },
      {
        name: "Finland", flag: "🇫🇮", gdp: 300,
        shares: [2.5, 3, 18, 7, 11, 5, 7, 3, 12, 8, 20, 3.5],
        cos: {
          energy: [["Neste", 22], ["Fortum", 7]],
          mfg: [["Kone", 12], ["UPM", 11], ["Stora Enso", 10], ["Wärtsilä", 7]],
          trade: [["S Group", 15], ["Kesko", 13]],
          tech: [["Nokia", 21], ["Elisa", 2.3]],
          fin: [["Nordea", 13], ["Sampo", 9]],
        },
      },
      {
        name: "Greece", flag: "🇬🇷", gdp: 250,
        shares: [4, 3, 10, 3, 18, 8, 3.5, 4, 17, 6, 16, 7.5],
        cos: {
          energy: [["Helleniq Energy", 13], ["Motor Oil Hellas", 13], ["PPC", 9]],
          trade: [["Sklavenitis", 5]],
          transport: [["Aegean Airlines", 1.7]],
          tech: [["OTE", 4]],
          fin: [["National Bank of Greece", 4], ["Piraeus Bank", 4]],
        },
      },
      {
        name: "Hungary", flag: "🇭🇺", gdp: 220,
        shares: [4, 3, 20, 5, 13, 6, 5, 4, 7, 9, 17, 7],
        cos: {
          energy: [["MOL Group", 26], ["MVM", 9]],
          mfg: [["Richter Gedeon", 2.2]],
          transport: [["Wizz Air", 6]],
          tech: [["Magyar Telekom", 2.6]],
          fin: [["OTP Bank", 8]],
        },
      },
    ],
  },
  {
    name: "Middle East & Central Asia", gdp: 3200,
    countries: [
      {
        name: "UAE", flag: "🇦🇪", gdp: 540,
        shares: [0.8, 25, 10, 8, 16, 8, 3, 9, 7, 5, 6, 2.2],
        cos: {
          energy: [["ADNOC", 110], ["ENOC", 30], ["TAQA", 14]],
          mfg: [["Emirates Global Aluminium", 9]],
          trade: [["Al-Futtaim", 12], ["Majid Al Futtaim", 9], ["Lulu Retail", 8]],
          transport: [["Emirates Group", 37], ["DP World", 20], ["Etihad", 7]],
          tech: [["e& (Etisalat)", 15]],
          fin: [["Emirates NBD", 12], ["First Abu Dhabi Bank", 10]],
          realestate: [["Emaar", 10], ["Aldar", 6]],
        },
      },
      {
        name: "Israel", flag: "🇮🇱", gdp: 540,
        shares: [1.2, 2, 13, 6, 10, 4, 18, 7, 12, 11, 13, 2.8],
        cos: {
          energy: [["Delek Group", 4]],
          mfg: [["Teva", 16], ["Elbit Systems", 7], ["ICL Group", 7]],
          tech: [["Amdocs", 5], ["NICE", 2.7], ["Check Point", 2.6], ["Bezeq", 2.4], ["Wix", 1.8]],
          fin: [["Bank Leumi", 8], ["Bank Hapoalim", 8]],
        },
      },
      {
        name: "Iran", flag: "🇮🇷", gdp: 430,
        shares: [12, 20, 15, 5, 13, 7, 3, 5, 9, 3, 6, 2],
        cos: {
          energy: [["National Iranian Oil Co", 50]],
          mfg: [["Iran Khodro", 6], ["Mobarakeh Steel", 6]],
          tech: [["MCI (Hamrah-e Aval)", 2]],
          fin: [["Bank Melli", 5]],
        },
      },
      {
        name: "Kazakhstan", flag: "🇰🇿", gdp: 290,
        shares: [4, 16, 12, 6, 17, 8, 2.5, 3.5, 8, 5, 12, 6],
        cos: {
          energy: [["KazMunayGas", 25], ["ERG", 6], ["Kazatomprom", 3]],
          transport: [["Air Astana", 1.3]],
          tech: [["Kazakhtelecom", 1]],
          fin: [["Kaspi.kz", 5], ["Halyk Bank", 4]],
        },
      },
      {
        name: "Iraq", flag: "🇮🇶", gdp: 270,
        shares: [4, 45, 2, 6, 10, 8, 2, 1, 7, 2, 11, 2],
        cos: {
          energy: [["Basra Oil Company", 50]],
          tech: [["Zain Iraq", 1.5], ["Asiacell", 1.5]],
          fin: [["Rafidain Bank", 2]],
        },
      },
      {
        name: "Qatar", flag: "🇶🇦", gdp: 220,
        shares: [0.3, 35, 8, 13, 8, 4, 3, 7, 6, 4, 9, 2.7],
        cos: {
          energy: [["QatarEnergy", 55]],
          mfg: [["Industries Qatar", 4]],
          transport: [["Qatar Airways", 22]],
          tech: [["Ooredoo", 6]],
          fin: [["QNB", 13]],
        },
      },
      {
        name: "Kuwait", flag: "🇰🇼", gdp: 160,
        shares: [0.5, 45, 6, 2, 6, 3, 3, 9, 6, 3, 15, 1.5],
        cos: {
          energy: [["Kuwait Petroleum Corp", 90]],
          trade: [["Alshaya", 5], ["Agility", 4]],
          tech: [["Zain", 6]],
          fin: [["National Bank of Kuwait", 6], ["Kuwait Finance House", 6]],
        },
      },
    ],
  },
  {
    name: "Africa", gdp: 2900,
    countries: [
      {
        name: "South Africa", flag: "🇿🇦", gdp: 400,
        shares: [2.5, 9, 13, 3, 13, 7.5, 3, 12, 9, 9, 18, 1],
        cos: {
          energy: [["Eskom", 18], ["Sasol", 15], ["Valterra Platinum", 6]],
          mfg: [["Aspen Pharmacare", 2.4], ["Tiger Brands", 2]],
          trade: [["Shoprite", 13], ["Bidcorp", 12], ["Pick n Pay", 6]],
          transport: [["Transnet", 4.5]],
          tech: [["MTN Group", 10], ["Vodacom", 8], ["Naspers", 7]],
          fin: [["Standard Bank", 13], ["FirstRand", 9], ["Old Mutual", 6], ["Sanlam", 6]],
          public: [["Netcare", 1.5]],
        },
      },
      {
        name: "Egypt", flag: "🇪🇬", gdp: 390,
        shares: [11, 9, 16, 6, 14, 5, 3, 4, 10, 3, 12, 7],
        cos: {
          energy: [["EGPC", 30]],
          mfg: [["Elsewedy Electric", 4], ["Oriental Weavers", 0.6]],
          constr: [["Orascom Construction", 3.3]],
          transport: [["Suez Canal Authority", 4]],
          tech: [["Telecom Egypt", 2]],
          fin: [["National Bank of Egypt", 8], ["CIB", 2.5]],
        },
      },
      {
        name: "Algeria", flag: "🇩🇿", gdp: 260,
        shares: [13, 20, 6, 10, 14, 6, 2, 3, 6, 2, 15, 3],
        cos: {
          energy: [["Sonatrach", 50]],
          mfg: [["Cevital", 4]],
          tech: [["Mobilis", 1]],
        },
      },
      {
        name: "Nigeria", flag: "🇳🇬", gdp: 250,
        shares: [24, 7, 9, 4, 16, 1.5, 15, 3, 6, 3, 8, 3.5],
        cos: {
          energy: [["NNPC", 25], ["Seplat Energy", 1.1]],
          mfg: [["Dangote Group", 5], ["BUA Group", 1.2], ["Nestlé Nigeria", 0.6]],
          trade: [["Jumia", 0.2]],
          tech: [["MTN Nigeria", 2.8]],
          fin: [["Access Holdings", 3.5], ["Zenith Bank", 2], ["GTCO", 1.5]],
        },
      },
      {
        name: "Morocco", flag: "🇲🇦", gdp: 150,
        shares: [11, 3, 16, 6, 12, 5, 3, 5, 8, 5, 18, 8],
        cos: {
          energy: [["OCP Group", 9]],
          trade: [["Marjane", 1.2]],
          transport: [["Royal Air Maroc", 2]],
          tech: [["Maroc Telecom", 4]],
          fin: [["Attijariwafa Bank", 4], ["Banque Populaire", 3]],
        },
      },
      {
        name: "Ethiopia", flag: "🇪🇹", gdp: 150,
        shares: [33, 2, 6, 20, 11, 4, 2, 2, 5, 3, 7, 5],
        cos: {
          transport: [["Ethiopian Airlines", 7]],
          tech: [["Ethio Telecom", 1.5]],
          fin: [["Commercial Bank of Ethiopia", 2]],
        },
      },
      {
        name: "Kenya", flag: "🇰🇪", gdp: 120,
        shares: [21, 2, 7.5, 7, 8, 9, 3, 7, 9, 5, 12, 9.5],
        cos: {
          ag: [["KTDA (tea)", 0.8]],
          energy: [["Kenya Power", 1.2], ["KenGen", 0.5]],
          mfg: [["East African Breweries", 0.9]],
          transport: [["Kenya Airways", 1.3]],
          tech: [["Safaricom", 2.6]],
          fin: [["Equity Group", 1.3], ["KCB Group", 1.2]],
        },
      },
    ],
  },
  {
    name: "Other Latin America", gdp: 2790,
    countries: [
      {
        name: "Argentina", flag: "🇦🇷", gdp: 630,
        shares: [7, 5, 17, 3, 14, 6, 3, 4, 10, 6, 18, 7],
        cos: {
          ag: [["Aceitera General Deheza", 6], ["Molinos Río de la Plata", 1.5]],
          energy: [["YPF", 19], ["Pan American Energy", 7]],
          mfg: [["Arcor", 4]],
          trade: [["MercadoLibre", 21]],
          transport: [["Aerolíneas Argentinas", 2]],
          tech: [["Telecom Argentina", 4]],
          fin: [["Banco Nación", 8], ["Grupo Galicia", 6]],
        },
      },
      {
        name: "Colombia", flag: "🇨🇴", gdp: 420,
        shares: [8, 8, 11, 6, 17, 4, 3, 5, 9, 8, 15, 6],
        cos: {
          energy: [["Ecopetrol", 32], ["Grupo EPM", 7]],
          mfg: [["Grupo Nutresa", 4], ["Cementos Argos", 3]],
          trade: [["Grupo Éxito", 5]],
          transport: [["Avianca", 5]],
          tech: [["Claro Colombia", 4]],
          fin: [["Bancolombia", 9], ["Grupo Aval", 8]],
        },
      },
      {
        name: "Chile", flag: "🇨🇱", gdp: 330,
        shares: [4, 14, 10, 6, 11, 6, 3, 7, 9, 10, 15, 5],
        cos: {
          ag: [["Empresas CMPC", 7.5]],
          energy: [["Codelco", 16], ["Antofagasta", 6.6], ["SQM", 4.5], ["Enel Chile", 4]],
          trade: [["Empresas Copec", 29], ["Cencosud", 17], ["Falabella", 13]],
          transport: [["LATAM Airlines", 13]],
          tech: [["Entel", 2.5]],
          fin: [["Banco de Chile", 4], ["Santander Chile", 3.5]],
        },
      },
      {
        name: "Peru", flag: "🇵🇪", gdp: 290,
        shares: [7, 13, 13, 6, 11, 5, 3, 5, 6, 5, 15, 11],
        cos: {
          energy: [["Southern Copper", 11.4], ["Petroperú", 5], ["Buenaventura", 1.1]],
          constr: [["AENZA", 1]],
          trade: [["InRetail", 5]],
          fin: [["Credicorp", 6], ["Interbank", 2]],
        },
      },
      {
        name: "Ecuador", flag: "🇪🇨", gdp: 125,
        shares: [9, 10, 13, 9, 11, 7, 2, 4, 6, 5, 15, 9],
        cos: {
          energy: [["Petroecuador", 10]],
          trade: [["Corporación Favorita", 2.6]],
          fin: [["Banco Pichincha", 1.5]],
        },
      },
      {
        name: "Venezuela", flag: "🇻🇪", gdp: 100,
        shares: [5, 30, 10, 3, 12, 5, 3, 3, 8, 3, 12, 6],
        cos: {
          energy: [["PDVSA", 18]],
          mfg: [["Empresas Polar", 3]],
          tech: [["CANTV", 0.5]],
        },
      },
    ],
  },
];
