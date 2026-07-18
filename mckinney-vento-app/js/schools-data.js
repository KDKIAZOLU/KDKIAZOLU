/*
 * Official Baltimore City Public Schools list, SY2025-26.
 * Source: SY2526_School_List.xlsx (embedded as the default reference dataset
 * used to validate/correct school names on import). Users can replace this
 * list at any time via Settings > School Reference List without touching code.
 */
(function (global) {
  'use strict';
  var SCHOOLS = [
  {
    "num": 7,
    "name": "Cecil Elementary School",
    "zip": 21218,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 8,
    "name": "City Springs Elementary/Middle School",
    "zip": 21231,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 10,
    "name": "James McHenry Elementary/Middle School",
    "zip": 21223,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 12,
    "name": "Lakeland Elementary/Middle School",
    "zip": 21230,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 13,
    "name": "Tench Tilghman Elementary/Middle School",
    "zip": 21205,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 15,
    "name": "Stadium School",
    "zip": 21218,
    "grades": "6 to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 16,
    "name": "Johnston Square Elementary School",
    "zip": 21202,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 21,
    "name": "Hilton Elementary School",
    "zip": 21216,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 22,
    "name": "George Washington Elementary School",
    "zip": 21230,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 23,
    "name": "Wolfe Street Academy",
    "zip": 21231,
    "grades": "PK to 5",
    "mgmt": "Charter"
  },
  {
    "num": 27,
    "name": "Commodore John Rodgers Elementary/Middle School",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 28,
    "name": "Sandtown-Winchester Achievement Academy",
    "zip": 21217,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 29,
    "name": "Matthew A. Henson Elementary School",
    "zip": 21217,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 34,
    "name": "Charles Carroll Barrister Elementary School",
    "zip": 21230,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 35,
    "name": "Harlem Park Elementary/Middle School",
    "zip": 21217,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 37,
    "name": "Harford Heights Elementary School",
    "zip": 21213,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 39,
    "name": "Dallas F. Nicholas, Sr., Elementary School",
    "zip": 21218,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 44,
    "name": "Montebello Elementary/Middle School",
    "zip": 21218,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 45,
    "name": "Federal Hill Preparatory Academy",
    "zip": 21230,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 47,
    "name": "Hampstead Hill Academy",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 50,
    "name": "Abbottston Elementary School",
    "zip": 21218,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 51,
    "name": "Waverly Elementary/Middle School",
    "zip": 21218,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 53,
    "name": "Margaret Brent Elementary/Middle School",
    "zip": 21218,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 54,
    "name": "Barclay Elementary/Middle School",
    "zip": 21218,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 55,
    "name": "Hampden Elementary/Middle School",
    "zip": 21211,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 58,
    "name": "Dr. Nathan A. Pitts-Ashburton Elementary/Middle School",
    "zip": 21215,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 60,
    "name": "Gwynns Falls Elementary School",
    "zip": 21216,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 61,
    "name": "Dorothy I. Height Elementary School",
    "zip": 21217,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 62,
    "name": "Park Heights Academy",
    "zip": 21215,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 63,
    "name": "Rosemont Elementary/Middle School",
    "zip": 21216,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 64,
    "name": "Liberty Elementary School",
    "zip": 21207,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 66,
    "name": "Mount Royal Elementary/Middle School",
    "zip": 21217,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 75,
    "name": "Katherine Johnson Global Academy",
    "zip": 21216,
    "grades": "3 to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 76,
    "name": "Francis Scott Key Elementary/Middle School",
    "zip": 21230,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 81,
    "name": "North Bend Elementary/Middle School",
    "zip": 21229,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 83,
    "name": "William Paca Elementary School",
    "zip": 21224,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 84,
    "name": "Thomas Johnson Elementary/Middle School",
    "zip": 21230,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 85,
    "name": "Fort Worthington Elementary/Middle School",
    "zip": 21213,
    "grades": "K to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 86,
    "name": "Lakewood Elementary School",
    "zip": 21213,
    "grades": "PK to K",
    "mgmt": "Traditional"
  },
  {
    "num": 87,
    "name": "Windsor Hills Elementary/Middle School",
    "zip": 21216,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 88,
    "name": "Wildwood Elementary/Middle School",
    "zip": 21229,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 95,
    "name": "Franklin Square Elementary/Middle School",
    "zip": 21223,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 97,
    "name": "Collington Square Elementary/Middle School",
    "zip": 21213,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 105,
    "name": "Moravia Park Elementary School",
    "zip": 21206,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 122,
    "name": "Historic Samuel Coleridge-Taylor Elementary School, The",
    "zip": 21201,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 124,
    "name": "Bay-Brook Elementary/Middle School",
    "zip": 21225,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 125,
    "name": "Furman Templeton Preparatory Academy",
    "zip": 21217,
    "grades": "PK to 5",
    "mgmt": "Charter"
  },
  {
    "num": 130,
    "name": "Booker T. Washington Middle School",
    "zip": 21217,
    "grades": "6 to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 134,
    "name": "Walter P. Carter Elementary/Middle School",
    "zip": 21212,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 142,
    "name": "Robert W. Coleman Elementary School",
    "zip": 21216,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 144,
    "name": "Billie Holiday Elementary School",
    "zip": 21216,
    "grades": "PK to 2",
    "mgmt": "Traditional"
  },
  {
    "num": 150,
    "name": "Mary Ann Winterling Elementary School at Bentalou",
    "zip": 21223,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 159,
    "name": "Cherry Hill Elementary/Middle School, The Historic",
    "zip": 21225,
    "grades": "3 to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 164,
    "name": "Arundel Elementary School",
    "zip": 21225,
    "grades": "PK to 2",
    "mgmt": "Traditional"
  },
  {
    "num": 178,
    "name": "Excel Academy at Francis M. Wood High School",
    "zip": 21223,
    "grades": "9 to 12",
    "mgmt": "Alternative"
  },
  {
    "num": 201,
    "name": "Dickey Hill Elementary/Middle School",
    "zip": 21207,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 203,
    "name": "Maree G. Farring Elementary/Middle School",
    "zip": 21225,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 204,
    "name": "Mary E. Rodman Elementary School",
    "zip": 21229,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 205,
    "name": "Woodhome Elementary/Middle School",
    "zip": 21234,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 206,
    "name": "Furley Elementary School",
    "zip": 21206,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 207,
    "name": "Curtis Bay Elementary School",
    "zip": 21225,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 210,
    "name": "Hazelwood Elementary/Middle School",
    "zip": 21206,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 211,
    "name": "Gardenville Elementary School",
    "zip": 21206,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 212,
    "name": "Garrett Heights Elementary/Middle School",
    "zip": 21214,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 213,
    "name": "Govans Elementary School",
    "zip": 21212,
    "grades": "PK to 5",
    "mgmt": "Charter"
  },
  {
    "num": 215,
    "name": "Highlandtown Elementary/Middle School No. 215",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 217,
    "name": "Belmont Elementary School",
    "zip": 21216,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 219,
    "name": "Yorkwood Elementary School",
    "zip": 21239,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 220,
    "name": "Morrell Park Elementary/Middle School",
    "zip": 21230,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 221,
    "name": "Mount Washington School, The",
    "zip": 21209,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 223,
    "name": "Pimlico Elementary/Middle School",
    "zip": 21215,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 225,
    "name": "Westport Academy",
    "zip": 21230,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 226,
    "name": "Violetville Elementary/Middle School",
    "zip": 21229,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 228,
    "name": "John Ruhrah Elementary/Middle School",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 229,
    "name": "Holabird Academy",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 231,
    "name": "The Belair-Edison School",
    "zip": 21213,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 232,
    "name": "Dream Academy",
    "zip": 21229,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 233,
    "name": "Roland Park Elementary/Middle School",
    "zip": 21210,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 234,
    "name": "Arlington Elementary School",
    "zip": 21215,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 235,
    "name": "Glenmount Elementary/Middle School",
    "zip": 21206,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 236,
    "name": "Hamilton Elementary/Middle School",
    "zip": 21214,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 237,
    "name": "Highlandtown Elementary/Middle School No. 237",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 239,
    "name": "Benjamin Franklin High School at Masonville Cove",
    "zip": 21225,
    "grades": "8 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 240,
    "name": "Graceland Park/O'Donnell Heights Elementary/Middle School",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 241,
    "name": "Fallstaff Elementary/Middle School",
    "zip": 21215,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 242,
    "name": "Northwood Elementary School",
    "zip": 21239,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 243,
    "name": "Armistead Gardens Elementary/Middle School",
    "zip": 21205,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 245,
    "name": "Leith Walk Elementary/Middle School",
    "zip": 21239,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 246,
    "name": "Beechfield Elementary/Middle School",
    "zip": 21229,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 247,
    "name": "Cross Country Elementary/Middle School",
    "zip": 21215,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 248,
    "name": "Sinclair Lane Elementary School",
    "zip": 21213,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 249,
    "name": "Medfield Heights Elementary School",
    "zip": 21211,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 250,
    "name": "Dr. Bernard Harris, Sr., Elementary School",
    "zip": 21213,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 251,
    "name": "Callaway Elementary School",
    "zip": 21215,
    "grades": "PK to 5",
    "mgmt": "Traditional"
  },
  {
    "num": 256,
    "name": "Calvin M. Rodwell Elementary/Middle School",
    "zip": 21207,
    "grades": "PK to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 260,
    "name": "Frederick Elementary School",
    "zip": 21223,
    "grades": "PK to 5",
    "mgmt": "Charter"
  },
  {
    "num": 262,
    "name": "Empowerment Academy",
    "zip": 21216,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 301,
    "name": "William S. Baer School",
    "zip": 21216,
    "grades": "PK to 12",
    "mgmt": "Separate Public Day"
  },
  {
    "num": 307,
    "name": "Claremont School",
    "zip": 21224,
    "grades": "6 to 12",
    "mgmt": "Separate Public Day"
  },
  {
    "num": 313,
    "name": "Lois T. Murray Elementary/Middle School",
    "zip": 21212,
    "grades": "PK to 8",
    "mgmt": "Separate Public Day"
  },
  {
    "num": 314,
    "name": "Sharp-Leadenhall Elementary/Middle School",
    "zip": 21213,
    "grades": "K to 8",
    "mgmt": "Separate Public Day"
  },
  {
    "num": 321,
    "name": "Midtown Academy",
    "zip": 21217,
    "grades": "K to 8",
    "mgmt": "Charter"
  },
  {
    "num": 322,
    "name": "New Song Academy",
    "zip": 21217,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 323,
    "name": "Crossroads School, The",
    "zip": 21231,
    "grades": "6 to 8",
    "mgmt": "Charter"
  },
  {
    "num": 325,
    "name": "ConneXions: A Community Based Arts School",
    "zip": 21216,
    "grades": "6 to 12",
    "mgmt": "Charter"
  },
  {
    "num": 326,
    "name": "City Neighbors Charter School",
    "zip": 21206,
    "grades": "K to 8",
    "mgmt": "Charter"
  },
  {
    "num": 327,
    "name": "Patterson Park Public Charter School",
    "zip": 21224,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 328,
    "name": "Southwest Baltimore Community School",
    "zip": 21223,
    "grades": "PK to 8",
    "mgmt": "Traditonal"
  },
  {
    "num": 332,
    "name": "Green School of Baltimore, The",
    "zip": 21213,
    "grades": "K to 5",
    "mgmt": "Charter"
  },
  {
    "num": 335,
    "name": "Baltimore International Academy",
    "zip": 21206,
    "grades": "K to 8",
    "mgmt": "Charter"
  },
  {
    "num": 336,
    "name": "Baltimore Montessori Public Charter School",
    "zip": 21202,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 341,
    "name": "Reach! Partnership School, The",
    "zip": 21218,
    "grades": "9 to 12",
    "mgmt": "Transformation"
  },
  {
    "num": 345,
    "name": "Joseph C. Briscoe Academy",
    "zip": 21201,
    "grades": "6 to 12",
    "mgmt": "Separate Public Day"
  },
  {
    "num": 346,
    "name": "City Neighbors Hamilton",
    "zip": 21214,
    "grades": "K to 8",
    "mgmt": "Charter"
  },
  {
    "num": 347,
    "name": "KIPP Harmony Academy",
    "zip": 21216,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 348,
    "name": "Baltimore Leadership School for Young Women",
    "zip": 21201,
    "grades": "6 to 12",
    "mgmt": "Charter"
  },
  {
    "num": 362,
    "name": "Bard High School Early College Baltimore",
    "zip": 21216,
    "grades": "9 to 12",
    "mgmt": "Contract"
  },
  {
    "num": 368,
    "name": "Elmer A. Henderson: A Johns Hopkins Partnership School",
    "zip": 21205,
    "grades": "PK to 8",
    "mgmt": "Contract"
  },
  {
    "num": 371,
    "name": "Lillie May Carroll Jackson School",
    "zip": 21213,
    "grades": "5 to 8",
    "mgmt": "Charter"
  },
  {
    "num": 373,
    "name": "Tunbridge Public Charter School",
    "zip": 21212,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 374,
    "name": "Vanguard Collegiate Middle School",
    "zip": 21206,
    "grades": "6 to 8",
    "mgmt": "Traditional"
  },
  {
    "num": 375,
    "name": "Baltimore Collegiate School for Boys",
    "zip": 21218,
    "grades": "4 to 8",
    "mgmt": "Charter"
  },
  {
    "num": 376,
    "name": "City Neighbors High School",
    "zip": 21214,
    "grades": "9 to 12",
    "mgmt": "Charter"
  },
  {
    "num": 377,
    "name": "Green Street Academy",
    "zip": 21229,
    "grades": "6 to 12",
    "mgmt": "Charter"
  },
  {
    "num": 382,
    "name": "Baltimore Design School",
    "zip": 21202,
    "grades": "6 to 12",
    "mgmt": "Transformation"
  },
  {
    "num": 384,
    "name": "Creative City Public Charter School",
    "zip": 21215,
    "grades": "K to 5",
    "mgmt": "Charter"
  },
  {
    "num": 385,
    "name": "Baltimore International Academy West",
    "zip": 21229,
    "grades": "PK to 8",
    "mgmt": "Charter"
  },
  {
    "num": 386,
    "name": "Clay Hill Public Charter School",
    "zip": 21224,
    "grades": "K to 7",
    "mgmt": "Charter"
  },
  {
    "num": 400,
    "name": "Edmondson-Westside High School",
    "zip": 21229,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 403,
    "name": "Baltimore Polytechnic Institute",
    "zip": 21209,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 405,
    "name": "Patterson High School",
    "zip": 21224,
    "grades": "8 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 406,
    "name": "Forest Park High School",
    "zip": 21207,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 407,
    "name": "Western High School",
    "zip": 21209,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 410,
    "name": "Mergenthaler Vocational-Technical High School",
    "zip": 21218,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 413,
    "name": "Achievement Academy at Harbor City High School",
    "zip": 21214,
    "grades": "9 to 12",
    "mgmt": "Alternative"
  },
  {
    "num": 414,
    "name": "Paul Laurence Dunbar High School",
    "zip": 21231,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 415,
    "name": "Baltimore School for the Arts",
    "zip": 21201,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 416,
    "name": "Digital Harbor High School",
    "zip": 21230,
    "grades": "8 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 419,
    "name": "Reginald F. Lewis High School",
    "zip": 21214,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 421,
    "name": "National Academy Foundation",
    "zip": 21205,
    "grades": "6 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 427,
    "name": "Academy for College and Career Exploration",
    "zip": 21211,
    "grades": "6 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 429,
    "name": "Vivien T. Thomas Medical Arts Academy",
    "zip": 21223,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 430,
    "name": "Augusta Fells Savage Institute of Visual Arts",
    "zip": 21217,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 432,
    "name": "Coppin Academy",
    "zip": 21216,
    "grades": "9 to 12",
    "mgmt": "Charter"
  },
  {
    "num": 433,
    "name": "Renaissance Academy",
    "zip": 21217,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 450,
    "name": "Frederick Douglass High School",
    "zip": 21215,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 454,
    "name": "Carver Vocational-Technical High School",
    "zip": 21216,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 480,
    "name": "Baltimore City College",
    "zip": 21218,
    "grades": "9 to 12",
    "mgmt": "Traditional"
  },
  {
    "num": 884,
    "name": "Eager Street Academy",
    "zip": 21202,
    "grades": "6 to 12",
    "mgmt": "Alternative  - Contract"
  },
  {
    "num": 897,
    "name": "Baltimore Revolutionary Academy for Virtual Education",
    "zip": 21214,
    "grades": "6 to 12",
    "mgmt": "Traditional - Virtual"
  },
  {
    "num": "Number",
    "name": "Program",
    "zip": "Zip",
    "grades": "Current Grades Served",
    "mgmt": "Management Type"
  },
  {
    "num": 303,
    "name": "Health & Specialized Student Services",
    "zip": 21217,
    "grades": "K to 12",
    "mgmt": "Alternative Program"
  },
  {
    "num": 734,
    "name": "Middle Alternative Program",
    "zip": 21216,
    "grades": "6 to 8",
    "mgmt": "Alternative Program"
  },
  {
    "num": 854,
    "name": "Success Academy West",
    "zip": 21217,
    "grades": "9 to 12",
    "mgmt": "Alternative Program "
  },
  {
    "num": 855,
    "name": "Success Academy",
    "zip": 21214,
    "grades": "9 to 12",
    "mgmt": "Alternative Program"
  },
  {
    "num": 858,
    "name": "Youth Opportunity",
    "zip": 21217,
    "grades": "9 to 12",
    "mgmt": "Alternative Program - Contract"
  },
  {
    "num": 875,
    "name": "P-TECH at Carver Vocational-Technical High School",
    "zip": 21216,
    "grades": "9 to 12",
    "mgmt": "Traditional Program"
  },
  {
    "num": 877,
    "name": "P-TECH at Paul Laurence Dunbar High School",
    "zip": 21231,
    "grades": "9 to 12",
    "mgmt": "Traditional Program"
  },
  {
    "num": 878,
    "name": "P-TECH at Digital",
    "zip": 21230,
    "grades": "9 to 12",
    "mgmt": "Traditional Program"
  },
  {
    "num": 887,
    "name": "Re-Engagement Center",
    "zip": 21202,
    "grades": "9 to 12",
    "mgmt": "Alternative Program"
  }
];

  // Known nicknames / acronyms / shorthand seen in real family survey responses,
  // mapped to the exact official school name above. This list is a *supplement*
  // to fuzzy matching, not a replacement - fuzzy matching still runs for anything
  // not listed here, and users can add more aliases from the review screen.
  var ALIASES = {
    "acce": "Academy for College and Career Exploration",
    "ace": "Academy for College and Career Exploration",
    "bard": "Bard High School Early College Baltimore",
    "bard early college": "Bard High School Early College Baltimore",
    "poly": "Baltimore Polytechnic Institute",
    "baltimore poly": "Baltimore Polytechnic Institute",
    "baltimore polytecnic institute": "Baltimore Polytechnic Institute",
    "city college": "Baltimore City College",
    "city": "Baltimore City College",
    "mervo": "Mergenthaler Vocational-Technical High School",
    "mergenthaler": "Mergenthaler Vocational-Technical High School",
    "carver": "Carver Vocational-Technical High School",
    "carver vo tech": "Carver Vocational-Technical High School",
    "carver vo-tech": "Carver Vocational-Technical High School",
    "carver votech": "Carver Vocational-Technical High School",
    "dunbar": "Paul Laurence Dunbar High School",
    "digital harbor": "Digital Harbor High School",
    "kipp": "KIPP Harmony Academy",
    "kipp harmony": "KIPP Harmony Academy",
    "augusta fells": "Augusta Fells Savage Institute of Visual Arts",
    "augusta fells savage": "Augusta Fells Savage Institute of Visual Arts",
    "augusta falls": "Augusta Fells Savage Institute of Visual Arts",
    "beechfield": "Beechfield Elementary/Middle School",
    "rodwell": "Calvin M. Rodwell Elementary/Middle School",
    "calvin rodwell": "Calvin M. Rodwell Elementary/Middle School",
    "calvin m rodwell": "Calvin M. Rodwell Elementary/Middle School",
    "belair edison": "The Belair-Edison School",
    "belair-edison": "The Belair-Edison School",
    "booker t": "Booker T. Washington Middle School",
    "booker t washington": "Booker T. Washington Middle School",
    "arundel": "Arundel Elementary School",
    "anne arundel": "Arundel Elementary School",
    "ann arundel": "Arundel Elementary School",
    "bay brook": "Bay-Brook Elementary/Middle School",
    "baybrook": "Bay-Brook Elementary/Middle School",
    "bay broock": "Bay-Brook Elementary/Middle School",
    "cherry hill": "Cherry Hill Elementary/Middle School, The Historic",
    "mount washington": "Mount Washington School, The",
    "coleridge taylor": "Historic Samuel Coleridge-Taylor Elementary School, The",
    "coleridge-taylor": "Historic Samuel Coleridge-Taylor Elementary School, The",
    "furman templeton": "Furman Templeton Preparatory Academy",
    "wolfe street": "Wolfe Street Academy",
    "hampstead hill": "Hampstead Hill Academy",
    "abbottson": "Abbottston Elementary School",
    "abbottsen": "Abbottston Elementary School",
    "pitts ashburton": "Dr. Nathan A. Pitts-Ashburton Elementary/Middle School",
    "ashburton": "Dr. Nathan A. Pitts-Ashburton Elementary/Middle School",
    "park heights": "Park Heights Academy",
    "coppin": "Coppin Academy",
    "renaissance": "Renaissance Academy",
    "reginald lewis": "Reginald F. Lewis High School",
    "frederick douglass": "Frederick Douglass High School",
    "edmondson westside": "Edmondson-Westside High School",
    "edmondson": "Edmondson-Westside High School",
    "forest park": "Forest Park High School",
    "western high": "Western High School",
    "baltimore design": "Baltimore Design School",
    "baltimore school for the arts": "Baltimore School for the Arts",
    "bsa": "Baltimore School for the Arts",
    "green street": "Green Street Academy",
    "national academy foundation": "National Academy Foundation",
    "naf": "National Academy Foundation",
    "vivien thomas": "Vivien T. Thomas Medical Arts Academy",
    "medical arts academy": "Vivien T. Thomas Medical Arts Academy",
    "excel academy": "Excel Academy at Francis M. Wood High School",
    "francis m wood": "Excel Academy at Francis M. Wood High School",
    "benjamin franklin": "Benjamin Franklin High School at Masonville Cove",
    "masonville cove": "Benjamin Franklin High School at Masonville Cove",
    "graceland park": "Graceland Park/O'Donnell Heights Elementary/Middle School",
    "odonnell heights": "Graceland Park/O'Donnell Heights Elementary/Middle School",
    "sandtown winchester": "Sandtown-Winchester Achievement Academy",
    "achievement academy": "Sandtown-Winchester Achievement Academy",
    "matthew henson": "Matthew A. Henson Elementary School",
    "charles carroll barrister": "Charles Carroll Barrister Elementary School",
    "dallas nicholas": "Dallas F. Nicholas, Sr., Elementary School",
    "highlandtown 215": "Highlandtown Elementary/Middle School No. 215",
    "highlandtown 237": "Highlandtown Elementary/Middle School No. 237",
    "connexions": "ConneXions: A Community Based Arts School",
    "city neighbors": "City Neighbors Charter School",
    "city neighbors hamilton": "City Neighbors Hamilton",
    "city neighbors high": "City Neighbors High School",
    "patterson park charter": "Patterson Park Public Charter School",
    "baltimore montessori": "Baltimore Montessori Public Charter School",
    "reach partnership": "Reach! Partnership School, The",
    "joseph briscoe": "Joseph C. Briscoe Academy",
    "briscoe": "Joseph C. Briscoe Academy",
    "baltimore leadership school for young women": "Baltimore Leadership School for Young Women",
    "blsyw": "Baltimore Leadership School for Young Women",
    "elmer henderson": "Elmer A. Henderson: A Johns Hopkins Partnership School",
    "johns hopkins partnership": "Elmer A. Henderson: A Johns Hopkins Partnership School",
    "lillie may carroll jackson": "Lillie May Carroll Jackson School",
    "tunbridge": "Tunbridge Public Charter School",
    "vanguard collegiate": "Vanguard Collegiate Middle School",
    "baltimore collegiate": "Baltimore Collegiate School for Boys",
    "clay hill": "Clay Hill Public Charter School",
    "creative city": "Creative City Public Charter School",
    "southwest baltimore": "Southwest Baltimore Community School",
    "green school": "Green School of Baltimore, The",
    "lois murray": "Lois T. Murray Elementary/Middle School",
    "sharp leadenhall": "Sharp-Leadenhall Elementary/Middle School",
    "william baer": "William S. Baer School",
    "claremont": "Claremont School",
    "midtown": "Midtown Academy",
    "new song": "New Song Academy",
    "crossroads": "Crossroads School, The",
    "empowerment academy": "Empowerment Academy",
    "eager street": "Eager Street Academy",
    "holabird": "Holabird Academy",
    "westport": "Westport Academy",
    "dream academy": "Dream Academy",
    "moravia park": "Moravia Park Elementary School",
    "george washington": "George Washington Elementary School",
    "james mchenry": "James McHenry Elementary/Middle School",
    "commodore john rodgers": "Commodore John Rodgers Elementary/Middle School",
    "harford heights": "Harford Heights Elementary School",
    "tench tilghman": "Tench Tilghman Elementary/Middle School",
    "gwynns falls": "Gwynns Falls Elementary School",
    "dorothy height": "Dorothy I. Height Elementary School",
    "walter carter": "Walter P. Carter Elementary/Middle School",
    "robert coleman": "Robert W. Coleman Elementary School",
    "billie holiday": "Billie Holiday Elementary School",
    "mary ann winterling": "Mary Ann Winterling Elementary School at Bentalou",
    "bentalou": "Mary Ann Winterling Elementary School at Bentalou",
    "maree farring": "Maree G. Farring Elementary/Middle School",
    "mary rodman": "Mary E. Rodman Elementary School",
    "dr bernard harris": "Dr. Bernard Harris, Sr., Elementary School",
    "bernard harris": "Dr. Bernard Harris, Sr., Elementary School",
    "franklin square": "Franklin Square Elementary/Middle School",
    "collington square": "Collington Square Elementary/Middle School",
    "north bend": "North Bend Elementary/Middle School",
    "william paca": "William Paca Elementary School",
    "thomas johnson": "Thomas Johnson Elementary/Middle School",
    "fort worthington": "Fort Worthington Elementary/Middle School",
    "windsor hills": "Windsor Hills Elementary/Middle School",
    "francis scott key": "Francis Scott Key Elementary/Middle School",
    "katherine johnson": "Katherine Johnson Global Academy",
    "p tech carver": "P-TECH at Carver Vocational-Technical High School",
    "ptech carver": "P-TECH at Carver Vocational-Technical High School",
    "p tech dunbar": "P-TECH at Paul Laurence Dunbar High School",
    "ptech dunbar": "P-TECH at Paul Laurence Dunbar High School",
    "p tech digital": "P-TECH at Digital",
    "success academy west": "Success Academy West",
    "success academy": "Success Academy",
    "youth opportunity": "Youth Opportunity",
    "re engagement center": "Re-Engagement Center",
    "reengagement": "Re-Engagement Center",
    "health specialized student services": "Health & Specialized Student Services",
    "middle alternative program": "Middle Alternative Program"
  };

  global.MVSchoolsData = { SCHOOLS: SCHOOLS, ALIASES: ALIASES };
})(typeof window !== 'undefined' ? window : this);
