// sqlzoo-exercises.js  (auto-generated)
window.SQLZOO_EXERCISES = [
{
"id": "w1",
"ds": "world",
"diff": 1,
"title": "South America by population",
"prompt": "List the <b>name</b> and <b>population</b> of every country in South America, largest population first.",
"hint": "Filter continent = 'South America', then ORDER BY population DESC.",
"sol": "SELECT name, population FROM world WHERE continent='South America' ORDER BY population DESC;",
"order": true
},
{
"id": "w2",
"ds": "world",
"diff": 1,
"title": "Big countries",
"prompt": "Show the <b>name</b> of every country with an area of at least 3,000,000 km\u00b2.",
"hint": "area >= 3000000.",
"sol": "SELECT name FROM world WHERE area >= 3000000;",
"order": false
},
{
"id": "w3",
"ds": "world",
"diff": 1,
"title": "Oceania capitals",
"prompt": "Show the <b>name</b> and <b>capital</b> of the countries in Oceania.",
"hint": "continent = 'Oceania'.",
"sol": "SELECT name, capital FROM world WHERE continent='Oceania';",
"order": false
},
{
"id": "w4",
"ds": "world",
"diff": 1,
"title": "Names beginning with I",
"prompt": "List the <b>name</b> of every country whose name starts with the letter 'I'.",
"hint": "Use LIKE 'I%'.",
"sol": "SELECT name FROM world WHERE name LIKE 'I%';",
"order": false
},
{
"id": "w5",
"ds": "world",
"diff": 2,
"title": "Population per continent",
"prompt": "For each <b>continent</b>, show the continent and its <b>total population</b>, largest total first.",
"hint": "GROUP BY continent, SUM(population), then ORDER BY the sum DESC.",
"sol": "SELECT continent, SUM(population) FROM world GROUP BY continent ORDER BY SUM(population) DESC;",
"order": true
},
{
"id": "w6",
"ds": "world",
"diff": 2,
"title": "Countries per continent",
"prompt": "Show each <b>continent</b> and <b>how many countries</b> it has in the table.",
"hint": "COUNT(*) with GROUP BY continent.",
"sol": "SELECT continent, COUNT(*) FROM world GROUP BY continent;",
"order": false
},
{
"id": "w7",
"ds": "world",
"diff": 2,
"title": "Large-area continents",
"prompt": "Show the <b>continent</b>s whose <b>combined area</b> is more than 10,000,000 km\u00b2.",
"hint": "GROUP BY continent then HAVING SUM(area) > 10000000.",
"sol": "SELECT continent FROM world GROUP BY continent HAVING SUM(area) > 10000000;",
"order": false
},
{
"id": "w8",
"ds": "world",
"diff": 2,
"title": "Average European population",
"prompt": "Show a single number: the <b>average population</b> of the European countries.",
"hint": "AVG(population) WHERE continent='Europe'.",
"sol": "SELECT AVG(population) FROM world WHERE continent='Europe';",
"order": false
},
{
"id": "n1",
"ds": "nobel",
"diff": 1,
"title": "The class of 1962",
"prompt": "List the <b>winner</b> of every Nobel prize awarded in 1962.",
"hint": "WHERE yr = 1962.",
"sol": "SELECT winner FROM nobel WHERE yr=1962;",
"order": false
},
{
"id": "n2",
"ds": "nobel",
"diff": 1,
"title": "Peace prizes, newest first",
"prompt": "Show the <b>yr</b> and <b>winner</b> of every Peace prize, most recent year first.",
"hint": "WHERE subject='Peace' ORDER BY yr DESC.",
"sol": "SELECT yr, winner FROM nobel WHERE subject='Peace' ORDER BY yr DESC;",
"order": false
},
{
"id": "n3",
"ds": "nobel",
"diff": 1,
"title": "The Curies",
"prompt": "Find the <b>yr</b>, <b>subject</b> and <b>winner</b> of every prize whose winner's name contains 'Curie'.",
"hint": "winner LIKE '%Curie%'.",
"sol": "SELECT yr, subject, winner FROM nobel WHERE winner LIKE '%Curie%';",
"order": false
},
{
"id": "n4",
"ds": "nobel",
"diff": 2,
"title": "Prizes per subject",
"prompt": "Show each <b>subject</b> and the <b>number of prizes</b> recorded for it, most first.",
"hint": "COUNT(*) GROUP BY subject ORDER BY COUNT(*) DESC.",
"sol": "SELECT subject, COUNT(*) FROM nobel GROUP BY subject ORDER BY COUNT(*) DESC;",
"order": false
},
{
"id": "n5",
"ds": "nobel",
"diff": 3,
"title": "Shared Physics years",
"prompt": "Which <b>years</b> had a Physics prize shared by more than one winner? Show the year only.",
"hint": "WHERE subject='Physics' GROUP BY yr HAVING COUNT(*) > 1.",
"sol": "SELECT yr FROM nobel WHERE subject='Physics' GROUP BY yr HAVING COUNT(*) > 1;",
"order": false
},
{
"id": "n6",
"ds": "nobel",
"diff": 2,
"title": "Subjects in 1954",
"prompt": "List the <b>distinct subjects</b> that had a winner in 1954. (A good case for DISTINCT.)",
"hint": "SELECT DISTINCT subject ... WHERE yr=1954.",
"sol": "SELECT DISTINCT subject FROM nobel WHERE yr=1954;",
"order": false
},
{
"id": "f1",
"ds": "football",
"diff": 2,
"title": "Scorers and their teams",
"prompt": "List each <b>distinct</b> player who scored together with their <b>team name</b>.",
"hint": "JOIN goal to eteam on goal.teamid = eteam.id; use DISTINCT.",
"sol": "SELECT DISTINCT player, teamname FROM goal JOIN eteam ON goal.teamid=eteam.id;",
"order": false
},
{
"id": "f2",
"ds": "football",
"diff": 2,
"title": "Goals in match 1005",
"prompt": "For match <b>1005</b>, show the <b>player</b>, their <b>team name</b> and the <b>minute</b> (gtime) of each goal.",
"hint": "JOIN goal to eteam, filter matchid = 1005.",
"sol": "SELECT player, teamname, gtime FROM goal JOIN eteam ON goal.teamid=eteam.id WHERE matchid=1005;",
"order": false
},
{
"id": "f3",
"ds": "football",
"diff": 2,
"title": "Germany's fixtures",
"prompt": "Show the <b>stadium</b> and <b>date</b> (mdate) of every game Germany (code GER) played in.",
"hint": "team1='GER' OR team2='GER'.",
"sol": "SELECT stadium, mdate FROM game WHERE team1='GER' OR team2='GER';",
"order": false
},
{
"id": "f4",
"ds": "football",
"diff": 3,
"title": "Top scorers",
"prompt": "Count how many goals each <b>player</b> scored. Show the player and the goal count, most first.",
"hint": "GROUP BY player, COUNT(*), ORDER BY COUNT(*) DESC.",
"sol": "SELECT player, COUNT(*) FROM goal GROUP BY player ORDER BY COUNT(*) DESC;",
"order": false
},
{
"id": "f5",
"ds": "football",
"diff": 3,
"title": "Goals by team name",
"prompt": "Show each <b>team name</b> and the <b>total goals</b> that team scored across all matches, most first.",
"hint": "JOIN goal to eteam, GROUP BY teamname, COUNT(*).",
"sol": "SELECT teamname, COUNT(*) FROM goal JOIN eteam ON goal.teamid=eteam.id GROUP BY teamname ORDER BY COUNT(*) DESC;",
"order": false
}
];
