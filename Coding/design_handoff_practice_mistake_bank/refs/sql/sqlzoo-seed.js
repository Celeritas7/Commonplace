// sqlzoo-seed.js  (auto-generated)
// SQLZoo-style practice datasets for the SQL Lab: world, nobel, and a sample football tournament.
// Schemas mirror the classic SQLZoo tutorials; data is original/representative, not copied from SQLZoo.
window.SQLZOO_SCHEMA = [
{
"name": "world",
"rows": 52,
"cols": [
"name",
"continent",
"area",
"population",
"gdp",
"capital"
]
},
{
"name": "nobel",
"rows": 48,
"cols": [
"yr",
"subject",
"winner"
]
},
{
"name": "eteam",
"rows": 8,
"cols": [
"id",
"teamname",
"coach"
]
},
{
"name": "game",
"rows": 8,
"cols": [
"id",
"mdate",
"stadium",
"team1",
"team2"
]
},
{
"name": "goal",
"rows": 21,
"cols": [
"matchid",
"teamid",
"player",
"gtime"
]
}
];

window.SQLZOO_SEED = "CREATE TABLE world (\n  name TEXT, continent TEXT, area INTEGER, population INTEGER, gdp INTEGER, capital TEXT\n);\nINSERT INTO world VALUES\n ('China','Asia',9596960,1402000000,14342900000000,'Beijing'),\n ('India','Asia',3287590,1380000000,2875000000000,'New Delhi'),\n ('Japan','Asia',377930,126500000,5081800000000,'Tokyo'),\n ('Indonesia','Asia',1904569,273500000,1119000000000,'Jakarta'),\n ('Pakistan','Asia',881912,220900000,278000000000,'Islamabad'),\n ('Bangladesh','Asia',147570,164700000,302000000000,'Dhaka'),\n ('Saudi Arabia','Asia',2149690,34810000,793000000000,'Riyadh'),\n ('South Korea','Asia',100210,51780000,1646700000000,'Seoul'),\n ('Vietnam','Asia',331212,97340000,271000000000,'Hanoi'),\n ('Thailand','Asia',513120,69800000,543500000000,'Bangkok'),\n ('Iran','Asia',1648195,83990000,191700000000,'Tehran'),\n ('Israel','Asia',20770,9217000,395000000000,'Jerusalem'),\n ('Russia','Eurasia',17125242,145930000,1483500000000,'Moscow'),\n ('Turkey','Eurasia',783562,84340000,720100000000,'Ankara'),\n ('Kazakhstan','Eurasia',2724900,18750000,180000000000,'Nur-Sultan'),\n ('Germany','Europe',357114,83240000,3846000000000,'Berlin'),\n ('France','Europe',551695,67390000,2716000000000,'Paris'),\n ('United Kingdom','Europe',242495,67220000,2827000000000,'London'),\n ('Italy','Europe',301340,59550000,2001000000000,'Rome'),\n ('Spain','Europe',505990,47350000,1281000000000,'Madrid'),\n ('Poland','Europe',312696,37950000,596000000000,'Warsaw'),\n ('Netherlands','Europe',41850,17440000,913000000000,'Amsterdam'),\n ('Sweden','Europe',450295,10350000,537000000000,'Stockholm'),\n ('Norway','Europe',385207,5379000,362000000000,'Oslo'),\n ('Greece','Europe',131957,10720000,189400000000,'Athens'),\n ('Ireland','Europe',70273,4938000,425000000000,'Dublin'),\n ('Portugal','Europe',92090,10310000,231300000000,'Lisbon'),\n ('Nigeria','Africa',923768,206100000,432000000000,'Abuja'),\n ('Egypt','Africa',1001450,102300000,363000000000,'Cairo'),\n ('South Africa','Africa',1221037,59310000,302000000000,'Pretoria'),\n ('Ethiopia','Africa',1104300,114900000,96000000000,'Addis Ababa'),\n ('Kenya','Africa',580367,53770000,95500000000,'Nairobi'),\n ('Algeria','Africa',2381741,43850000,145000000000,'Algiers'),\n ('Morocco','Africa',446550,36910000,119000000000,'Rabat'),\n ('Ghana','Africa',238533,31070000,67000000000,'Accra'),\n ('United States','North America',9826675,331000000,21433000000000,'Washington'),\n ('Canada','North America',9984670,38010000,1736000000000,'Ottawa'),\n ('Mexico','North America',1964375,128900000,1076000000000,'Mexico City'),\n ('Guatemala','North America',108889,17910000,77000000000,'Guatemala City'),\n ('Cuba','Caribbean',109884,11330000,100000000000,'Havana'),\n ('Jamaica','Caribbean',10991,2961000,15700000000,'Kingston'),\n ('Haiti','Caribbean',27750,11400000,8500000000,'Port-au-Prince'),\n ('Brazil','South America',8515767,212600000,1445000000000,'Brasilia'),\n ('Argentina','South America',2780400,45380000,449700000000,'Buenos Aires'),\n ('Colombia','South America',1141748,50880000,271000000000,'Bogota'),\n ('Chile','South America',756102,19120000,252900000000,'Santiago'),\n ('Peru','South America',1285216,32970000,226800000000,'Lima'),\n ('Venezuela','South America',916445,28440000,482000000000,'Caracas'),\n ('Australia','Oceania',7692024,25690000,1393000000000,'Canberra'),\n ('New Zealand','Oceania',268838,5084000,212000000000,'Wellington'),\n ('Papua New Guinea','Oceania',462840,8947000,24800000000,'Port Moresby'),\n ('Fiji','Oceania',18274,896000,5500000000,'Suva');\n\nCREATE TABLE nobel (yr INTEGER, subject TEXT, winner TEXT);\nINSERT INTO nobel VALUES\n (1903,'Physics','Henri Becquerel'),\n (1903,'Physics','Marie Curie'),\n (1903,'Physics','Pierre Curie'),\n (1921,'Physics','Albert Einstein'),\n (1922,'Physics','Niels Bohr'),\n (1956,'Physics','John Bardeen'),\n (1956,'Physics','Walter Brattain'),\n (1956,'Physics','William Shockley'),\n (1965,'Physics','Richard Feynman'),\n (2013,'Physics','Peter Higgs'),\n (2013,'Physics','Francois Englert'),\n (2020,'Physics','Roger Penrose'),\n (1908,'Chemistry','Ernest Rutherford'),\n (1911,'Chemistry','Marie Curie'),\n (1954,'Chemistry','Linus Pauling'),\n (1964,'Chemistry','Dorothy Hodgkin'),\n (2020,'Chemistry','Emmanuelle Charpentier'),\n (2020,'Chemistry','Jennifer Doudna'),\n (1945,'Medicine','Alexander Fleming'),\n (1945,'Medicine','Ernst Chain'),\n (1945,'Medicine','Howard Florey'),\n (1962,'Medicine','Francis Crick'),\n (1962,'Medicine','James Watson'),\n (1983,'Medicine','Barbara McClintock'),\n (2015,'Medicine','Tu Youyou'),\n (1907,'Literature','Rudyard Kipling'),\n (1949,'Literature','William Faulkner'),\n (1953,'Literature','Winston Churchill'),\n (1954,'Literature','Ernest Hemingway'),\n (1982,'Literature','Gabriel Garcia Marquez'),\n (2016,'Literature','Bob Dylan'),\n (1901,'Peace','Henry Dunant'),\n (1901,'Peace','Frederic Passy'),\n (1964,'Peace','Martin Luther King'),\n (1979,'Peace','Mother Teresa'),\n (1989,'Peace','Dalai Lama'),\n (1993,'Peace','Nelson Mandela'),\n (1993,'Peace','F.W. de Klerk'),\n (2009,'Peace','Barack Obama'),\n (2014,'Peace','Malala Yousafzai'),\n (2014,'Peace','Kailash Satyarthi'),\n (1970,'Economics','Paul Samuelson'),\n (1976,'Economics','Milton Friedman'),\n (2002,'Economics','Daniel Kahneman'),\n (2009,'Economics','Elinor Ostrom'),\n (2019,'Economics','Abhijit Banerjee'),\n (2019,'Economics','Esther Duflo'),\n (2019,'Economics','Michael Kremer');\n\nCREATE TABLE eteam (id TEXT PRIMARY KEY, teamname TEXT, coach TEXT);\nINSERT INTO eteam VALUES\n ('ENG','England','Gareth Southgate'),\n ('FRA','France','Didier Deschamps'),\n ('GER','Germany','Hansi Flick'),\n ('ESP','Spain','Luis Enrique'),\n ('ITA','Italy','Roberto Mancini'),\n ('NED','Netherlands','Louis van Gaal'),\n ('POR','Portugal','Fernando Santos'),\n ('POL','Poland','Czeslaw Michniewicz');\n\nCREATE TABLE game (id INTEGER PRIMARY KEY, mdate TEXT, stadium TEXT, team1 TEXT, team2 TEXT);\nINSERT INTO game VALUES\n (1001,'2024-06-12','Wembley','ENG','POL'),\n (1002,'2024-06-12','Allianz Arena','GER','ESP'),\n (1003,'2024-06-13','Stade de France','FRA','ITA'),\n (1004,'2024-06-13','De Kuip','NED','POR'),\n (1005,'2024-06-16','Wembley','ENG','GER'),\n (1006,'2024-06-16','Camp Nou','ESP','FRA'),\n (1007,'2024-06-17','Olimpico','ITA','POL'),\n (1008,'2024-06-17','De Kuip','POR','NED');\n\nCREATE TABLE goal (matchid INTEGER, teamid TEXT, player TEXT, gtime INTEGER);\nINSERT INTO goal VALUES\n (1001,'ENG','Harry Kane',23),\n (1001,'ENG','Bukayo Saka',67),\n (1002,'GER','Kai Havertz',40),\n (1002,'ESP','Alvaro Morata',75),\n (1003,'FRA','Kylian Mbappe',12),\n (1003,'FRA','Antoine Griezmann',55),\n (1003,'ITA','Ciro Immobile',88),\n (1004,'POR','Cristiano Ronaldo',61),\n (1005,'ENG','Harry Kane',18),\n (1005,'ENG','Jude Bellingham',73),\n (1005,'GER','Kai Havertz',34),\n (1005,'GER','Thomas Muller',90),\n (1006,'ESP','Alvaro Morata',9),\n (1006,'ESP','Pedri',44),\n (1006,'ESP','Ferran Torres',80),\n (1006,'FRA','Kylian Mbappe',57),\n (1007,'ITA','Ciro Immobile',29),\n (1008,'POR','Cristiano Ronaldo',15),\n (1008,'POR','Bruno Fernandes',49),\n (1008,'NED','Memphis Depay',38),\n (1008,'NED','Cody Gakpo',84);\n";
