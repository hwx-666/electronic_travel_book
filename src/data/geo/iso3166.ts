// 自动生成文件，勿手改。数据源：lukes/ISO-3166-Countries-with-Regional-Codes (CC0)
// 用途：world-atlas 的 TopoJSON 里国家 id 是 ISO 3166-1 数字码（如 156），
// 本文件提供数字码 → { code: alpha-2, name: 英文名 } 的映射：
//  - ISO_NUMERIC 供 world.ts 将 TopoJSON id 转成路由/点亮标识用的 alpha-2；
//  - ALPHA2_NAME 供展示层查国家英文名（搜索高亮、占位页等）。
// 注意：alpha-3 → alpha-2 的映射在 alpha3.ts（geoBoundaries 键用 alpha-3）。

export interface IsoCountry {
  /** ISO 3166-1 alpha-2，如 CN / US */
  code: string
  /** 英文名，如 China */
  name: string
}

/** 数字码（3 位字符串）→ 国家信息 */
export const ISO_NUMERIC: Record<string, IsoCountry> = {
  "100": {
    "code": "BG",
    "name": "Bulgaria"
  },
  "104": {
    "code": "MM",
    "name": "Myanmar"
  },
  "108": {
    "code": "BI",
    "name": "Burundi"
  },
  "112": {
    "code": "BY",
    "name": "Belarus"
  },
  "116": {
    "code": "KH",
    "name": "Cambodia"
  },
  "120": {
    "code": "CM",
    "name": "Cameroon"
  },
  "124": {
    "code": "CA",
    "name": "Canada"
  },
  "132": {
    "code": "CV",
    "name": "Cabo Verde"
  },
  "136": {
    "code": "KY",
    "name": "Cayman Islands"
  },
  "140": {
    "code": "CF",
    "name": "Central African Republic"
  },
  "144": {
    "code": "LK",
    "name": "Sri Lanka"
  },
  "148": {
    "code": "TD",
    "name": "Chad"
  },
  "152": {
    "code": "CL",
    "name": "Chile"
  },
  "156": {
    "code": "CN",
    "name": "China"
  },
  "158": {
    "code": "TW",
    "name": "Taiwan, Province of China"
  },
  "162": {
    "code": "CX",
    "name": "Christmas Island"
  },
  "166": {
    "code": "CC",
    "name": "Cocos (Keeling) Islands"
  },
  "170": {
    "code": "CO",
    "name": "Colombia"
  },
  "174": {
    "code": "KM",
    "name": "Comoros"
  },
  "175": {
    "code": "YT",
    "name": "Mayotte"
  },
  "178": {
    "code": "CG",
    "name": "Congo"
  },
  "180": {
    "code": "CD",
    "name": "Congo, Democratic Republic of the"
  },
  "184": {
    "code": "CK",
    "name": "Cook Islands"
  },
  "188": {
    "code": "CR",
    "name": "Costa Rica"
  },
  "191": {
    "code": "HR",
    "name": "Croatia"
  },
  "192": {
    "code": "CU",
    "name": "Cuba"
  },
  "196": {
    "code": "CY",
    "name": "Cyprus"
  },
  "203": {
    "code": "CZ",
    "name": "Czechia"
  },
  "204": {
    "code": "BJ",
    "name": "Benin"
  },
  "208": {
    "code": "DK",
    "name": "Denmark"
  },
  "212": {
    "code": "DM",
    "name": "Dominica"
  },
  "214": {
    "code": "DO",
    "name": "Dominican Republic"
  },
  "218": {
    "code": "EC",
    "name": "Ecuador"
  },
  "222": {
    "code": "SV",
    "name": "El Salvador"
  },
  "226": {
    "code": "GQ",
    "name": "Equatorial Guinea"
  },
  "231": {
    "code": "ET",
    "name": "Ethiopia"
  },
  "232": {
    "code": "ER",
    "name": "Eritrea"
  },
  "233": {
    "code": "EE",
    "name": "Estonia"
  },
  "234": {
    "code": "FO",
    "name": "Faroe Islands"
  },
  "238": {
    "code": "FK",
    "name": "Falkland Islands (Malvinas)"
  },
  "239": {
    "code": "GS",
    "name": "South Georgia and the South Sandwich Islands"
  },
  "242": {
    "code": "FJ",
    "name": "Fiji"
  },
  "246": {
    "code": "FI",
    "name": "Finland"
  },
  "248": {
    "code": "AX",
    "name": "Åland Islands"
  },
  "250": {
    "code": "FR",
    "name": "France"
  },
  "254": {
    "code": "GF",
    "name": "French Guiana"
  },
  "258": {
    "code": "PF",
    "name": "French Polynesia"
  },
  "260": {
    "code": "TF",
    "name": "French Southern Territories"
  },
  "262": {
    "code": "DJ",
    "name": "Djibouti"
  },
  "266": {
    "code": "GA",
    "name": "Gabon"
  },
  "268": {
    "code": "GE",
    "name": "Georgia"
  },
  "270": {
    "code": "GM",
    "name": "Gambia"
  },
  "275": {
    "code": "PS",
    "name": "Palestine, State of"
  },
  "276": {
    "code": "DE",
    "name": "Germany"
  },
  "288": {
    "code": "GH",
    "name": "Ghana"
  },
  "292": {
    "code": "GI",
    "name": "Gibraltar"
  },
  "296": {
    "code": "KI",
    "name": "Kiribati"
  },
  "300": {
    "code": "GR",
    "name": "Greece"
  },
  "304": {
    "code": "GL",
    "name": "Greenland"
  },
  "308": {
    "code": "GD",
    "name": "Grenada"
  },
  "312": {
    "code": "GP",
    "name": "Guadeloupe"
  },
  "316": {
    "code": "GU",
    "name": "Guam"
  },
  "320": {
    "code": "GT",
    "name": "Guatemala"
  },
  "324": {
    "code": "GN",
    "name": "Guinea"
  },
  "328": {
    "code": "GY",
    "name": "Guyana"
  },
  "332": {
    "code": "HT",
    "name": "Haiti"
  },
  "334": {
    "code": "HM",
    "name": "Heard Island and McDonald Islands"
  },
  "336": {
    "code": "VA",
    "name": "Holy See"
  },
  "340": {
    "code": "HN",
    "name": "Honduras"
  },
  "344": {
    "code": "HK",
    "name": "Hong Kong"
  },
  "348": {
    "code": "HU",
    "name": "Hungary"
  },
  "352": {
    "code": "IS",
    "name": "Iceland"
  },
  "356": {
    "code": "IN",
    "name": "India"
  },
  "360": {
    "code": "ID",
    "name": "Indonesia"
  },
  "364": {
    "code": "IR",
    "name": "Iran, Islamic Republic of"
  },
  "368": {
    "code": "IQ",
    "name": "Iraq"
  },
  "372": {
    "code": "IE",
    "name": "Ireland"
  },
  "376": {
    "code": "IL",
    "name": "Israel"
  },
  "380": {
    "code": "IT",
    "name": "Italy"
  },
  "384": {
    "code": "CI",
    "name": "Côte d'Ivoire"
  },
  "388": {
    "code": "JM",
    "name": "Jamaica"
  },
  "392": {
    "code": "JP",
    "name": "Japan"
  },
  "398": {
    "code": "KZ",
    "name": "Kazakhstan"
  },
  "400": {
    "code": "JO",
    "name": "Jordan"
  },
  "404": {
    "code": "KE",
    "name": "Kenya"
  },
  "408": {
    "code": "KP",
    "name": "Korea, Democratic People's Republic of"
  },
  "410": {
    "code": "KR",
    "name": "Korea, Republic of"
  },
  "414": {
    "code": "KW",
    "name": "Kuwait"
  },
  "417": {
    "code": "KG",
    "name": "Kyrgyzstan"
  },
  "418": {
    "code": "LA",
    "name": "Lao People's Democratic Republic"
  },
  "422": {
    "code": "LB",
    "name": "Lebanon"
  },
  "426": {
    "code": "LS",
    "name": "Lesotho"
  },
  "428": {
    "code": "LV",
    "name": "Latvia"
  },
  "430": {
    "code": "LR",
    "name": "Liberia"
  },
  "434": {
    "code": "LY",
    "name": "Libya"
  },
  "438": {
    "code": "LI",
    "name": "Liechtenstein"
  },
  "440": {
    "code": "LT",
    "name": "Lithuania"
  },
  "442": {
    "code": "LU",
    "name": "Luxembourg"
  },
  "446": {
    "code": "MO",
    "name": "Macao"
  },
  "450": {
    "code": "MG",
    "name": "Madagascar"
  },
  "454": {
    "code": "MW",
    "name": "Malawi"
  },
  "458": {
    "code": "MY",
    "name": "Malaysia"
  },
  "462": {
    "code": "MV",
    "name": "Maldives"
  },
  "466": {
    "code": "ML",
    "name": "Mali"
  },
  "470": {
    "code": "MT",
    "name": "Malta"
  },
  "474": {
    "code": "MQ",
    "name": "Martinique"
  },
  "478": {
    "code": "MR",
    "name": "Mauritania"
  },
  "480": {
    "code": "MU",
    "name": "Mauritius"
  },
  "484": {
    "code": "MX",
    "name": "Mexico"
  },
  "492": {
    "code": "MC",
    "name": "Monaco"
  },
  "496": {
    "code": "MN",
    "name": "Mongolia"
  },
  "498": {
    "code": "MD",
    "name": "Moldova, Republic of"
  },
  "499": {
    "code": "ME",
    "name": "Montenegro"
  },
  "500": {
    "code": "MS",
    "name": "Montserrat"
  },
  "504": {
    "code": "MA",
    "name": "Morocco"
  },
  "508": {
    "code": "MZ",
    "name": "Mozambique"
  },
  "512": {
    "code": "OM",
    "name": "Oman"
  },
  "516": {
    "code": "NA",
    "name": "Namibia"
  },
  "520": {
    "code": "NR",
    "name": "Nauru"
  },
  "524": {
    "code": "NP",
    "name": "Nepal"
  },
  "528": {
    "code": "NL",
    "name": "Netherlands, Kingdom of the"
  },
  "531": {
    "code": "CW",
    "name": "Curaçao"
  },
  "533": {
    "code": "AW",
    "name": "Aruba"
  },
  "534": {
    "code": "SX",
    "name": "Sint Maarten (Dutch part)"
  },
  "535": {
    "code": "BQ",
    "name": "Bonaire, Sint Eustatius and Saba"
  },
  "540": {
    "code": "NC",
    "name": "New Caledonia"
  },
  "548": {
    "code": "VU",
    "name": "Vanuatu"
  },
  "554": {
    "code": "NZ",
    "name": "New Zealand"
  },
  "558": {
    "code": "NI",
    "name": "Nicaragua"
  },
  "562": {
    "code": "NE",
    "name": "Niger"
  },
  "566": {
    "code": "NG",
    "name": "Nigeria"
  },
  "570": {
    "code": "NU",
    "name": "Niue"
  },
  "574": {
    "code": "NF",
    "name": "Norfolk Island"
  },
  "578": {
    "code": "NO",
    "name": "Norway"
  },
  "580": {
    "code": "MP",
    "name": "Northern Mariana Islands"
  },
  "581": {
    "code": "UM",
    "name": "United States Minor Outlying Islands"
  },
  "583": {
    "code": "FM",
    "name": "Micronesia, Federated States of"
  },
  "584": {
    "code": "MH",
    "name": "Marshall Islands"
  },
  "585": {
    "code": "PW",
    "name": "Palau"
  },
  "586": {
    "code": "PK",
    "name": "Pakistan"
  },
  "591": {
    "code": "PA",
    "name": "Panama"
  },
  "598": {
    "code": "PG",
    "name": "Papua New Guinea"
  },
  "600": {
    "code": "PY",
    "name": "Paraguay"
  },
  "604": {
    "code": "PE",
    "name": "Peru"
  },
  "608": {
    "code": "PH",
    "name": "Philippines"
  },
  "612": {
    "code": "PN",
    "name": "Pitcairn"
  },
  "616": {
    "code": "PL",
    "name": "Poland"
  },
  "620": {
    "code": "PT",
    "name": "Portugal"
  },
  "624": {
    "code": "GW",
    "name": "Guinea-Bissau"
  },
  "626": {
    "code": "TL",
    "name": "Timor-Leste"
  },
  "630": {
    "code": "PR",
    "name": "Puerto Rico"
  },
  "634": {
    "code": "QA",
    "name": "Qatar"
  },
  "638": {
    "code": "RE",
    "name": "Réunion"
  },
  "642": {
    "code": "RO",
    "name": "Romania"
  },
  "643": {
    "code": "RU",
    "name": "Russian Federation"
  },
  "646": {
    "code": "RW",
    "name": "Rwanda"
  },
  "652": {
    "code": "BL",
    "name": "Saint Barthélemy"
  },
  "654": {
    "code": "SH",
    "name": "Saint Helena, Ascension and Tristan da Cunha"
  },
  "659": {
    "code": "KN",
    "name": "Saint Kitts and Nevis"
  },
  "660": {
    "code": "AI",
    "name": "Anguilla"
  },
  "662": {
    "code": "LC",
    "name": "Saint Lucia"
  },
  "663": {
    "code": "MF",
    "name": "Saint Martin (French part)"
  },
  "666": {
    "code": "PM",
    "name": "Saint Pierre and Miquelon"
  },
  "670": {
    "code": "VC",
    "name": "Saint Vincent and the Grenadines"
  },
  "674": {
    "code": "SM",
    "name": "San Marino"
  },
  "678": {
    "code": "ST",
    "name": "Sao Tome and Principe"
  },
  "682": {
    "code": "SA",
    "name": "Saudi Arabia"
  },
  "686": {
    "code": "SN",
    "name": "Senegal"
  },
  "688": {
    "code": "RS",
    "name": "Serbia"
  },
  "690": {
    "code": "SC",
    "name": "Seychelles"
  },
  "694": {
    "code": "SL",
    "name": "Sierra Leone"
  },
  "702": {
    "code": "SG",
    "name": "Singapore"
  },
  "703": {
    "code": "SK",
    "name": "Slovakia"
  },
  "704": {
    "code": "VN",
    "name": "Viet Nam"
  },
  "705": {
    "code": "SI",
    "name": "Slovenia"
  },
  "706": {
    "code": "SO",
    "name": "Somalia"
  },
  "710": {
    "code": "ZA",
    "name": "South Africa"
  },
  "716": {
    "code": "ZW",
    "name": "Zimbabwe"
  },
  "724": {
    "code": "ES",
    "name": "Spain"
  },
  "728": {
    "code": "SS",
    "name": "South Sudan"
  },
  "729": {
    "code": "SD",
    "name": "Sudan"
  },
  "732": {
    "code": "EH",
    "name": "Western Sahara"
  },
  "740": {
    "code": "SR",
    "name": "Suriname"
  },
  "744": {
    "code": "SJ",
    "name": "Svalbard and Jan Mayen"
  },
  "748": {
    "code": "SZ",
    "name": "Eswatini"
  },
  "752": {
    "code": "SE",
    "name": "Sweden"
  },
  "756": {
    "code": "CH",
    "name": "Switzerland"
  },
  "760": {
    "code": "SY",
    "name": "Syrian Arab Republic"
  },
  "762": {
    "code": "TJ",
    "name": "Tajikistan"
  },
  "764": {
    "code": "TH",
    "name": "Thailand"
  },
  "768": {
    "code": "TG",
    "name": "Togo"
  },
  "772": {
    "code": "TK",
    "name": "Tokelau"
  },
  "776": {
    "code": "TO",
    "name": "Tonga"
  },
  "780": {
    "code": "TT",
    "name": "Trinidad and Tobago"
  },
  "784": {
    "code": "AE",
    "name": "United Arab Emirates"
  },
  "788": {
    "code": "TN",
    "name": "Tunisia"
  },
  "792": {
    "code": "TR",
    "name": "Türkiye"
  },
  "795": {
    "code": "TM",
    "name": "Turkmenistan"
  },
  "796": {
    "code": "TC",
    "name": "Turks and Caicos Islands"
  },
  "798": {
    "code": "TV",
    "name": "Tuvalu"
  },
  "800": {
    "code": "UG",
    "name": "Uganda"
  },
  "804": {
    "code": "UA",
    "name": "Ukraine"
  },
  "807": {
    "code": "MK",
    "name": "North Macedonia"
  },
  "818": {
    "code": "EG",
    "name": "Egypt"
  },
  "826": {
    "code": "GB",
    "name": "United Kingdom of Great Britain and Northern Ireland"
  },
  "831": {
    "code": "GG",
    "name": "Guernsey"
  },
  "832": {
    "code": "JE",
    "name": "Jersey"
  },
  "833": {
    "code": "IM",
    "name": "Isle of Man"
  },
  "834": {
    "code": "TZ",
    "name": "Tanzania, United Republic of"
  },
  "840": {
    "code": "US",
    "name": "United States of America"
  },
  "850": {
    "code": "VI",
    "name": "Virgin Islands (U.S.)"
  },
  "854": {
    "code": "BF",
    "name": "Burkina Faso"
  },
  "858": {
    "code": "UY",
    "name": "Uruguay"
  },
  "860": {
    "code": "UZ",
    "name": "Uzbekistan"
  },
  "862": {
    "code": "VE",
    "name": "Venezuela, Bolivarian Republic of"
  },
  "876": {
    "code": "WF",
    "name": "Wallis and Futuna"
  },
  "882": {
    "code": "WS",
    "name": "Samoa"
  },
  "887": {
    "code": "YE",
    "name": "Yemen"
  },
  "894": {
    "code": "ZM",
    "name": "Zambia"
  },
  "004": {
    "code": "AF",
    "name": "Afghanistan"
  },
  "008": {
    "code": "AL",
    "name": "Albania"
  },
  "012": {
    "code": "DZ",
    "name": "Algeria"
  },
  "016": {
    "code": "AS",
    "name": "American Samoa"
  },
  "020": {
    "code": "AD",
    "name": "Andorra"
  },
  "024": {
    "code": "AO",
    "name": "Angola"
  },
  "010": {
    "code": "AQ",
    "name": "Antarctica"
  },
  "028": {
    "code": "AG",
    "name": "Antigua and Barbuda"
  },
  "032": {
    "code": "AR",
    "name": "Argentina"
  },
  "051": {
    "code": "AM",
    "name": "Armenia"
  },
  "036": {
    "code": "AU",
    "name": "Australia"
  },
  "040": {
    "code": "AT",
    "name": "Austria"
  },
  "031": {
    "code": "AZ",
    "name": "Azerbaijan"
  },
  "044": {
    "code": "BS",
    "name": "Bahamas"
  },
  "048": {
    "code": "BH",
    "name": "Bahrain"
  },
  "050": {
    "code": "BD",
    "name": "Bangladesh"
  },
  "052": {
    "code": "BB",
    "name": "Barbados"
  },
  "056": {
    "code": "BE",
    "name": "Belgium"
  },
  "084": {
    "code": "BZ",
    "name": "Belize"
  },
  "060": {
    "code": "BM",
    "name": "Bermuda"
  },
  "064": {
    "code": "BT",
    "name": "Bhutan"
  },
  "068": {
    "code": "BO",
    "name": "Bolivia, Plurinational State of"
  },
  "070": {
    "code": "BA",
    "name": "Bosnia and Herzegovina"
  },
  "072": {
    "code": "BW",
    "name": "Botswana"
  },
  "074": {
    "code": "BV",
    "name": "Bouvet Island"
  },
  "076": {
    "code": "BR",
    "name": "Brazil"
  },
  "086": {
    "code": "IO",
    "name": "British Indian Ocean Territory"
  },
  "096": {
    "code": "BN",
    "name": "Brunei Darussalam"
  },
  "090": {
    "code": "SB",
    "name": "Solomon Islands"
  },
  "092": {
    "code": "VG",
    "name": "Virgin Islands (British)"
  }
}

/** alpha-2 → 英文名 */
export const ALPHA2_NAME: Record<string, string> = {
  "AF": "Afghanistan",
  "AX": "Åland Islands",
  "AL": "Albania",
  "DZ": "Algeria",
  "AS": "American Samoa",
  "AD": "Andorra",
  "AO": "Angola",
  "AI": "Anguilla",
  "AQ": "Antarctica",
  "AG": "Antigua and Barbuda",
  "AR": "Argentina",
  "AM": "Armenia",
  "AW": "Aruba",
  "AU": "Australia",
  "AT": "Austria",
  "AZ": "Azerbaijan",
  "BS": "Bahamas",
  "BH": "Bahrain",
  "BD": "Bangladesh",
  "BB": "Barbados",
  "BY": "Belarus",
  "BE": "Belgium",
  "BZ": "Belize",
  "BJ": "Benin",
  "BM": "Bermuda",
  "BT": "Bhutan",
  "BO": "Bolivia, Plurinational State of",
  "BQ": "Bonaire, Sint Eustatius and Saba",
  "BA": "Bosnia and Herzegovina",
  "BW": "Botswana",
  "BV": "Bouvet Island",
  "BR": "Brazil",
  "IO": "British Indian Ocean Territory",
  "BN": "Brunei Darussalam",
  "BG": "Bulgaria",
  "BF": "Burkina Faso",
  "BI": "Burundi",
  "CV": "Cabo Verde",
  "KH": "Cambodia",
  "CM": "Cameroon",
  "CA": "Canada",
  "KY": "Cayman Islands",
  "CF": "Central African Republic",
  "TD": "Chad",
  "CL": "Chile",
  "CN": "China",
  "CX": "Christmas Island",
  "CC": "Cocos (Keeling) Islands",
  "CO": "Colombia",
  "KM": "Comoros",
  "CG": "Congo",
  "CD": "Congo, Democratic Republic of the",
  "CK": "Cook Islands",
  "CR": "Costa Rica",
  "CI": "Côte d'Ivoire",
  "HR": "Croatia",
  "CU": "Cuba",
  "CW": "Curaçao",
  "CY": "Cyprus",
  "CZ": "Czechia",
  "DK": "Denmark",
  "DJ": "Djibouti",
  "DM": "Dominica",
  "DO": "Dominican Republic",
  "EC": "Ecuador",
  "EG": "Egypt",
  "SV": "El Salvador",
  "GQ": "Equatorial Guinea",
  "ER": "Eritrea",
  "EE": "Estonia",
  "SZ": "Eswatini",
  "ET": "Ethiopia",
  "FK": "Falkland Islands (Malvinas)",
  "FO": "Faroe Islands",
  "FJ": "Fiji",
  "FI": "Finland",
  "FR": "France",
  "GF": "French Guiana",
  "PF": "French Polynesia",
  "TF": "French Southern Territories",
  "GA": "Gabon",
  "GM": "Gambia",
  "GE": "Georgia",
  "DE": "Germany",
  "GH": "Ghana",
  "GI": "Gibraltar",
  "GR": "Greece",
  "GL": "Greenland",
  "GD": "Grenada",
  "GP": "Guadeloupe",
  "GU": "Guam",
  "GT": "Guatemala",
  "GG": "Guernsey",
  "GN": "Guinea",
  "GW": "Guinea-Bissau",
  "GY": "Guyana",
  "HT": "Haiti",
  "HM": "Heard Island and McDonald Islands",
  "VA": "Holy See",
  "HN": "Honduras",
  "HK": "Hong Kong",
  "HU": "Hungary",
  "IS": "Iceland",
  "IN": "India",
  "ID": "Indonesia",
  "IR": "Iran, Islamic Republic of",
  "IQ": "Iraq",
  "IE": "Ireland",
  "IM": "Isle of Man",
  "IL": "Israel",
  "IT": "Italy",
  "JM": "Jamaica",
  "JP": "Japan",
  "JE": "Jersey",
  "JO": "Jordan",
  "KZ": "Kazakhstan",
  "KE": "Kenya",
  "KI": "Kiribati",
  "KP": "Korea, Democratic People's Republic of",
  "KR": "Korea, Republic of",
  "KW": "Kuwait",
  "KG": "Kyrgyzstan",
  "LA": "Lao People's Democratic Republic",
  "LV": "Latvia",
  "LB": "Lebanon",
  "LS": "Lesotho",
  "LR": "Liberia",
  "LY": "Libya",
  "LI": "Liechtenstein",
  "LT": "Lithuania",
  "LU": "Luxembourg",
  "MO": "Macao",
  "MG": "Madagascar",
  "MW": "Malawi",
  "MY": "Malaysia",
  "MV": "Maldives",
  "ML": "Mali",
  "MT": "Malta",
  "MH": "Marshall Islands",
  "MQ": "Martinique",
  "MR": "Mauritania",
  "MU": "Mauritius",
  "YT": "Mayotte",
  "MX": "Mexico",
  "FM": "Micronesia, Federated States of",
  "MD": "Moldova, Republic of",
  "MC": "Monaco",
  "MN": "Mongolia",
  "ME": "Montenegro",
  "MS": "Montserrat",
  "MA": "Morocco",
  "MZ": "Mozambique",
  "MM": "Myanmar",
  "NA": "Namibia",
  "NR": "Nauru",
  "NP": "Nepal",
  "NL": "Netherlands, Kingdom of the",
  "NC": "New Caledonia",
  "NZ": "New Zealand",
  "NI": "Nicaragua",
  "NE": "Niger",
  "NG": "Nigeria",
  "NU": "Niue",
  "NF": "Norfolk Island",
  "MK": "North Macedonia",
  "MP": "Northern Mariana Islands",
  "NO": "Norway",
  "OM": "Oman",
  "PK": "Pakistan",
  "PW": "Palau",
  "PS": "Palestine, State of",
  "PA": "Panama",
  "PG": "Papua New Guinea",
  "PY": "Paraguay",
  "PE": "Peru",
  "PH": "Philippines",
  "PN": "Pitcairn",
  "PL": "Poland",
  "PT": "Portugal",
  "PR": "Puerto Rico",
  "QA": "Qatar",
  "RE": "Réunion",
  "RO": "Romania",
  "RU": "Russian Federation",
  "RW": "Rwanda",
  "BL": "Saint Barthélemy",
  "SH": "Saint Helena, Ascension and Tristan da Cunha",
  "KN": "Saint Kitts and Nevis",
  "LC": "Saint Lucia",
  "MF": "Saint Martin (French part)",
  "PM": "Saint Pierre and Miquelon",
  "VC": "Saint Vincent and the Grenadines",
  "WS": "Samoa",
  "SM": "San Marino",
  "ST": "Sao Tome and Principe",
  "SA": "Saudi Arabia",
  "SN": "Senegal",
  "RS": "Serbia",
  "SC": "Seychelles",
  "SL": "Sierra Leone",
  "SG": "Singapore",
  "SX": "Sint Maarten (Dutch part)",
  "SK": "Slovakia",
  "SI": "Slovenia",
  "SB": "Solomon Islands",
  "SO": "Somalia",
  "ZA": "South Africa",
  "GS": "South Georgia and the South Sandwich Islands",
  "SS": "South Sudan",
  "ES": "Spain",
  "LK": "Sri Lanka",
  "SD": "Sudan",
  "SR": "Suriname",
  "SJ": "Svalbard and Jan Mayen",
  "SE": "Sweden",
  "CH": "Switzerland",
  "SY": "Syrian Arab Republic",
  "TW": "Taiwan, Province of China",
  "TJ": "Tajikistan",
  "TZ": "Tanzania, United Republic of",
  "TH": "Thailand",
  "TL": "Timor-Leste",
  "TG": "Togo",
  "TK": "Tokelau",
  "TO": "Tonga",
  "TT": "Trinidad and Tobago",
  "TN": "Tunisia",
  "TR": "Türkiye",
  "TM": "Turkmenistan",
  "TC": "Turks and Caicos Islands",
  "TV": "Tuvalu",
  "UG": "Uganda",
  "UA": "Ukraine",
  "AE": "United Arab Emirates",
  "GB": "United Kingdom of Great Britain and Northern Ireland",
  "US": "United States of America",
  "UM": "United States Minor Outlying Islands",
  "UY": "Uruguay",
  "UZ": "Uzbekistan",
  "VU": "Vanuatu",
  "VE": "Venezuela, Bolivarian Republic of",
  "VN": "Viet Nam",
  "VG": "Virgin Islands (British)",
  "VI": "Virgin Islands (U.S.)",
  "WF": "Wallis and Futuna",
  "EH": "Western Sahara",
  "YE": "Yemen",
  "ZM": "Zambia",
  "ZW": "Zimbabwe"
}
