/* The Complete 2022 Web Development Bootcamp (Angela Yu, The App Brewery, on Udemy): course index only.
   Lesson titles come from the curriculum index in Drive (#Data_storage/HTML_CSS_JS/HTML_CSS_process/Temp/Index.docx),
   with OCR mistakes corrected. No lesson content is stored here; the study-book PDFs stay in Drive.
   One line per lesson. Lesson numbers are worked out in order; "Coding Exercise" and "Quiz" lines have no number,
   as on Udemy. */
window.BOOTCAMP = {
  course: 'The Complete 2022 Web Development Bootcamp',
  by: 'Angela Yu · The App Brewery (Udemy)',
  // the study books made from the transcripts (Drive file ids; they open in Google Drive)
  books: {
    start: '12s8d9nDYtr77NOAOhEko3HnQX4qt6Uex',
    full: '1NOtYJLB9afRUUYKo7Vn905Szrgzq2Gm4',
    folder: '19nktWOteu-zlq_xcCapfw8S_Xx8Ya5I5',
    sections: { 1: '1N2D8zR7tJ2y4FegHn5VrOLvBI17Gw7Ex', 2: '1TLy70eu9-Nvp1lDHjRwFYqHe8UXgFtdM', 3: '18WJxoutwO56PurrZ1mArJsuI6AnQ0uEj',
                4: '1xNj7_wJc8Oicp_pVQMNdmzWV7uQB_jkb', 5: '1vYBOPzwt8vdS_6pDgK_2ALA1Hq83sEOQ' }
  },
  parts: [
    { title: 'HTML & CSS', from: 1, to: 8 },
    { title: 'JavaScript & the DOM', from: 9, to: 15 },
    { title: 'Command line, backend & APIs', from: 16, to: 23 },
    { title: 'Databases & deployment', from: 24, to: 31 },
    { title: 'Security, React & next steps', from: 32, to: 35 }
  ],
  sections: [
{ n: 1, title: 'Front-End Web Development', lessons: `
What You'll Get in This Course
Download the Course Syllabus
Download the Course Resources
Download the 12 Rules to Learn to Code eBook [Latest Edition]
How Does the Internet Actually Work?
How Do Websites Actually Work?
How to Get the Most Out of the Course
What you'll Need to Get Started - Setup Your Local Web Development Environment
Setup Packages
How to Get Help When You're Stuck
Pathfinder` },
{ n: 2, title: 'Introduction to HTML', lessons: `
Introduction to HTML
The Anatomy of an HTML Tag
What we're building - HTML Personal Site
What is The HTML Boilerplate?
How to Structure Text in HTML
HTML Lists
HTML Image Elements
HTML Links and Anchor Tags
How to Ace this Course` },
{ n: 3, title: 'Intermediate HTML', lessons: `
HTML Tables
Using HTML Tables for Layout
HTML Tables Code Challenge
How to Type Emojis
HTML Tables Solution Walkthrough
HTML Forms
Forms in Practice - Create a Contact Me Form
Coding Exercise 1: HTML Challenge
Publish Your Website!
Tip from Angela - Habit Building with the Calendar Trick
Get Monthly Tips and Tools to Level Up as a Developer` },
{ n: 4, title: 'Introduction to CSS', lessons: `
Introduction to CSS
Inline CSS
A Quick Note About the Next Lesson
Internal CSS
External CSS
How to Debug CSS Code
The Anatomy of CSS Syntax
CSS Selectors
Classes vs. Ids
Quiz 1: CSS Quiz
Tip from Angela - Dealing with Distractions
Join the Student Community` },
{ n: 5, title: 'Intermediate CSS', lessons: `
What We'll Make - Stylised Personal Site
What Are Favicons?
HTML Divs
The Box Model of Website Styling
CSS Display Property
Learn More About Web Design
CSS Static and Relative Positioning
Absolute positioning
The Dark Art of Centering Elements with CSS
Font Styling in Our Personal Site
Learn More About Typography
Adding Content to Our Website
CSS Sizing
Font Properties Challenge 1 - Change the Font Colour
Font Properties Challenge 2 - Change the Font Weight
Font Properties Challenge 3 - Change the Line Height
CSS Font Property Challenge Solutions
CSS Float and Clear
CSS Challenge
Stylised Personal Site Solution Walkthrough
[Optional] Get More Practice HTML and CSS
Tip from Angela - Nothing Easy is Worth Doing!` },
{ n: 6, title: 'Introduction to Bootstrap 4', lessons: `
What is Bootstrap?
Installing Bootstrap
Web Design 101 - Wireframing
The Bootstrap Navigation Bar
What We'll Make: TinDog
Download the Starting Files
Setting Up Our New Project
Bootstrap Grid Layout System
Getting Montserrat Black and other Font Weights
Adding Grid Layouts to Our Website
A Note About CSS Link Order
Bootstrap Containers
Bootstrap Buttons & Font Awesome
Styling Our Website Challenges and Solutions
Bootstrap Challenge 1
Solution to Bootstrap Challenge 1
Tip from Angela - How to Deal with Procrastination` },
{ n: 7, title: 'Intermediate Bootstrap', lessons: `
The Bootstrap Carousel Part 1
The Bootstrap Carousel Part 2
Bootstrap Cards
The CSS Z-Index and Stacking Order
Media Query Breakpoints
Bootstrap Challenge 2
Bootstrap Challenge 2 Solution
How to become a Better Programmer - Code Refactoring
Put it into Practice - Refactor our Website Part 1
Advanced CSS - Combining Selectors
Refactoring our Website Part 2
Advanced CSS - Selector Priority
Completing the Website
Download the Completed Website
Tip from Angela - Building a Programming Habit` },
{ n: 8, title: 'Web Design School - Create a Website that People Love', lessons: `
Introduction to Web Design
Understanding Colour Theory
Understanding Typography and How to Choose a Font
Manage ATTENTION with effective User Interface (UI) Design
User Experience (UX) Design
Web Design in Practice - Let's apply what we've learnt!` },
{ n: 9, title: 'Introduction to Javascript ES6', lessons: `
Introduction to Javascript
Javascript Alerts - Adding Behaviour to Websites
Data Types
Javascript Variables
Javascript Variables Exercise Start
Coding Exercise 2: Javascript Variables Exercise
Javascript Variables Exercise Solution
Naming and Naming Conventions for Javascript Variables
Quiz 2: Javascript Variable Naming Quiz
String Concatenation
String Lengths and Retrieving the Number of Characters
Slicing and Extracting Parts of a String
Challenge: Changing Casing in Text
Challenge: Changing String Casing Solution
Basic Arithmetic and the Modulo Operator in Javascript
Increment and Decrement Expressions
Quiz 3: Javascript Numbers Quiz
Functions Part 1: Creating and Calling Functions
Functions Part 1 Challenge - The Karel Robot
The Karel Chess Board Solution
A Quick Note About the Next Lesson
Functions Part 2: Parameters and Arguments
Coding Exercise 3: Life in Weeks Coding Exercise
Life in Weeks Solution
Functions Part 3: Outputs & Return Values
Challenge: Create a BMI Calculator
Coding Exercise 4: BMI Calculator Challenge
Challenge: BMI Calculator Solution
Quiz 4: JavaScript Functions Quiz
Tip from Angela - Set Your Expectations` },
{ n: 10, title: 'Intermediate Javascript', lessons: `
Random Number Generation in Javascript: Building a Love Calculator
Control Statements: Using If-Else Conditionals & Logic
Comparators and Equality
Combining Comparators
Coding Exercise 5: BMI Calculator Advanced (IF/ELSE)
Introducing the Leap Year Code Challenge
Coding Exercise 6: Leap Year Challenge Exercise
Leap Year Solution
Collections: Working with Javascript Arrays
Adding Elements and Intermediate Array Techniques
Coding Exercise 7: Who's Buying Lunch? Code Challenge
Who's Buying Lunch Solution
Control Statements: While Loops
Solution to the 99 Bottles Challenge
Control Statements: For Loops
Introducing the Fibonacci Code Challenge
Coding Exercise 8: The Fibonacci Exercise
Fibonacci Solution
Tip from Angela - Retrieval is How You Learn` },
{ n: 11, title: 'The Document Object Model (DOM)', lessons: `
Adding Javascript to Websites
Introduction to the Document Object Model (DOM)
Solution to the DOM Challenge
Selecting HTML Elements with Javascript
Manipulating and Changing Styles of HTML Elements with Javascript
The Separation of Concerns: Structure vs Style vs Behaviour
Text Manipulation and the Text Content Property
Manipulating HTML Element Attributes
Tip from Angela - The 20 Minute Method` },
{ n: 12, title: 'Boss Level Challenge 1 - The Dicee Game', lessons: `
Challenge: The Dicee Challenge
Dicee Challenge Step 0 - Download the Skeleton Project
Dicee Challenge Step 1 - Create an External Javascript File
Dicee Challenge Step 2 - Add Dice Images
Dicee Challenge Step 3 - Create a Random Number
Dicee Challenge Step 4 - Change the <img> to a Random Dice
Dicee Challenge Step 5 - Change both <img> Elements
Dicee Challenge Step 6 - Change the Title to Display a Winner
The Solution to the Dicee Challenge
Download the Completed Website
Tip from Angela - Learning Before you Eat` },
{ n: 13, title: 'Advanced Javascript and DOM Manipulation', lessons: `
What We'll Make: Drum Kit
Download the Starting Files
Adding Event Listeners to a Button
Higher Order Functions and Passing Functions as Arguments
Higher Order Function Challenge Solution
How to Play Sounds on a Website
A Deeper Understanding of Javascript Objects
How to Use Switch Statements in Javascript
Objects, their Methods and the Dot Notation
A Quick Note About the Next Lesson
Using Keyboard Event Listeners to Check for Key Presses
Understanding Callbacks and How to Respond to Events
Adding Animation to Websites
Download the Completed Website
Tip from Angela - Dealing with Lack of Progress` },
{ n: 14, title: 'jQuery', lessons: `
What is jQuery?
How to Incorporate jQuery into Websites
How Minification Works to Reduce File Size
Selecting Elements with jQuery
Manipulating Styles with jQuery
Manipulating Text with jQuery
Manipulating Attributes with jQuery
Adding Event Listeners with jQuery
Adding and Removing Elements with jQuery
Website Animations with jQuery
Tip from Angela - Mixing Knowledge` },
{ n: 15, title: 'Boss Level Challenge 2 - The Simon Game', lessons: `
What You'll Make: The Simon Game
Play the Game
Step 0 - Download the Starting Files
Step 1 - Add Javascript and jQuery
Step 1 - Answer
Step 2 - Create A New Pattern
Step 2 - Answer
Step 3 - Show the Sequence to the User with Animations and Sounds
Step 3 - Answer
Step 4 - Check Which Button is Pressed
Step 4 - Answer
Step 5 - Add Sounds to Button Clicks
Step 5 - Answer
Step 6 - Add Animations to User Clicks
Step 6 - Answer
Step 7 - Start the Game
Step 7 - Answer
Step 8 - Check the User's Answer Against the Game Sequence
Step 8 - Answer
Step 9 - Game Over
Step 9 - Answer
Step 10 - Restart the Game
Step 10 - Answer
Download the Completed Project Code
Tip from Angela - Dealing with Frustration` },
{ n: 16, title: 'The Unix Command Line', lessons: `
Installing the Hyper Terminal
Command Line Hyper Setup
Understanding the Command Line. Long Live the Command Line!
Command Line Techniques and Directory Navigation
Creating, Opening, and Removing Files through the Command Line
Tip from Angela - Sleep is My Secret Weapon` },
{ n: 17, title: 'Backend Web Development', lessons: `
Backend Web Development Explained` },
{ n: 18, title: 'Node.js', lessons: `
What is Node.js?
Install Node.js on Mac
Install Node.js on Windows
The Power of the Command Line and How to Use Node
The Node REPL (Read Evaluation Print Loops)
How to Use the Native Node Modules
The NPM Package Manager and Installing External Node Modules
Tip from Angela - Step Up to the Challenge` },
{ n: 19, title: 'Express.js with Node.js', lessons: `
What is Express?
Creating Our First Server with Express
Handling Requests and Responses: the GET Request
Nodemon Installation
Understanding and Working with Routes
What We'll Make: A Calculator
Calculator Setup Challenge
Calculator Setup: Challenge Solution
Responding to Requests with HTML Files
Processing Post Requests with Body Parser
BMI Routing Challenge
Solution to the BMI Routing Challenge
Tip from Angela - How to Solidify Your Knowledge` },
{ n: 20, title: 'APIs - Application Programming Interfaces', lessons: `
Why Do We Need APIs?
API Endpoints, Paths and Parameters
API Authentication and Postman
What is JSON?
Making GET Requests with the Node HTTPS Module
How to Parse JSON
Using Express to Render a Website with Live API Data
Using Body Parser to Parse POST Requests to the Server
The Mailchimp API - What You'll Make
Setting Up the Sign Up Page
Posting Data to Mailchimp's Servers via their API
Adding Success and Failure Pages
Deploying Your Server with Heroku
Tip from Angela - Location, Location, Location!` },
{ n: 21, title: 'Git, Github and Version Control', lessons: `
Introduction to Version Control and Git
Version Control Using Git and the Command Line
GitHub and Remote Repositories
GitHub Private Repos are now Free!
Gitignore
Cloning
Branching and Merging
Optional Git Challenge
Forking and Pull Requests
Tip from Angela - Spaced Repetition` },
{ n: 22, title: 'EJS', lessons: `
What We'll Make: A ToDoList
Linter Errors with EJS
Templates? Why Do We Need Templates?
Creating Your First EJS Templates
Running Code Inside the EJS Template
Passing Data from Your Webpage to Your Server
The Concept of Scope in the Context of Javascript
Adding Pre-Made CSS Stylesheets to Your Website
Understanding Templating vs. Layouts
Understanding Node Module Exports: How to Pass Functions and Data between Files
Tip from Angela - Use Accountability in your Favour` },
{ n: 23, title: 'Boss Level Challenge 3 - Blog Website', lessons: `
A New Challenge Format and What We'll Make: A Blog
Setting Up the Blog Project
Challenge 1
Challenge 1 Solution
Challenge 2
Challenge 2 Solution
Challenge 3
Challenge 3 Solution
Challenge 4
Challenge 4 Solution
Challenge 5
Challenge 5 Solution
Challenge 6
Challenge 6 Solution
Challenge 7
Challenge 7 Solution
Challenge 8
Challenge 8 Solution
Challenge 9
Challenge 9 Solution
Challenge 10
Challenge 10 Solution
Challenge 11
Challenge 11 Solution
Challenge 12
Challenge 12 Solution
Challenge 13
Challenge 13 Solution
Challenge 14 and Solution
Challenge 15
Challenge 15 Solution
Express Routing Parameters
Challenge 16
Challenge 16 Solution
Challenge 17
Challenge 17 Solution
Challenge 18
Challenge 18 Solution
Challenge 19
Challenge 19 Solution
Challenge 20
Challenge 20 Solution
Challenge 21
Challenge 21 Solution
Tip from Angela - When Life Gives You Lemons` },
{ n: 24, title: 'Databases', lessons: `
Databases Explained: SQL vs. NOSQL` },
{ n: 25, title: 'SQL', lessons: `
SQL Commands: CREATE Table and INSERT Data
SQL Commands: READ, SELECT, and WHERE
Updating Single Values and Adding Columns in SQL
SQL Commands: DELETE
Understanding SQL Relationships, Foreign Keys and Inner Joins
Tip from Angela - Find All the Hard Working People` },
{ n: 26, title: 'MongoDB', lessons: `
Installing MongoDB on Mac
Installing MongoDB on Windows
MongoDB CRUD Operations in the Shell: Create
MongoDB CRUD Operations in the Shell: Reading & Queries
MongoDB CRUD Operations in the Shell: Update
MongoDB CRUD Operations in the Shell: Delete
Relationships in MongoDB
Working with The Native MongoDB Driver
If You Have Forgotten to Quit the Mongod Server
Tip from Angela - Daily Routines` },
{ n: 27, title: 'Mongoose', lessons: `
Introduction to Mongoose
Reading from Your Database with Mongoose
Data Validation with Mongoose
Updating and Deleting Data Using Mongoose
Establishing Relationships and Embedding Documents using Mongoose
Tip from Angela - Deep Work` },
{ n: 28, title: 'Putting Everything Together', lessons: `
Let's take the ToDoList Project to the Next Level and Connect it with Mongoose
Rendering Database Items in the ToDoList App
Adding New Items to our ToDoList Database
Deleting Items from our ToDoList Database
Creating Custom Lists using Express Route Parameters
Adding New Items to the Custom ToDo Lists
Revisiting Lodash and Deleting Items from Custom ToDo Lists
Tip from Angela - One Step at a Time` },
{ n: 29, title: 'Deploying Your Web Application', lessons: `
How to Deploy Web Apps with a Database
How to Setup MongoDB Atlas
Deploying an App with a Database to Heroku
Tip from Angela - Discipline Breeds Discipline` },
{ n: 30, title: 'Boss Level Challenge 4 - Blog Website Upgrade', lessons: `
Challenge: Give your Blog a Database
Step 0 - Download the Starting Files
Step 1 - Save Composed Posts with MongoDB
Step 2 - Get the Home Page to Render the Posts
Step 3 - Fix the bug
Step 4 - Render the correct blog post based on post _id
Completed Blog with Database Solution
Tip from Angela - Dealing with Limitations` },
{ n: 31, title: 'Build Your Own RESTful API From Scratch', lessons: `
What is REST?
Creating a Database with Robo 3T
Set Up Server Challenge
Set Up Server Solution
GET All Articles
POST a New Article
DELETE All Articles
Chained Route Handlers Using Express
GET a Specific Article
PUT a Specific Article
PATCH a Specific Article
DELETE a Specific Article
Download the Completed Project Code
Tip from Angela - How to Get a Job as Programmer` },
{ n: 32, title: 'Authentication & Security', lessons: `
Introduction to Authentication
Getting Set Up
Level 1 - Register Users with Username and Password
How to Review the Source Code
Level 2 - Database Encryption
Using Environment Variables to Keep Secrets Safe
Level 3 - Hashing Passwords
Hacking 101
Level 4 - Salting and Hashing Passwords with bcrypt
What are Cookies and Sessions?
Using Passport.js to Add Cookies and Sessions
Level 6 - OAuth 2.0 & How to Implement Sign In with Google
Finishing Up the App - Letting Users Submit Secrets
Download the Completed Project Code
Tip from Angela - How to Work as a Freelancer` },
{ n: 33, title: 'React.js', lessons: `
What is React?
What we will make in this React module
Introduction to Code Sandbox and the Structure of the Module
Introduction to JSX and Babel
JSX Code Practice
Javascript Expressions in JSX & ES6 Template Literals
Javascript Expressions in JSX Practice
JSX Attributes & Styling React Elements
Inline Styling for React Elements
React Styling Practice
React Components
React Components Practice
Javascript ES6 - Import, Export and Modules
Javascript ES6 Import, Export and Modules Practice
[Windows] Local Environment Setup for React Development
[Mac] Local Environment Setup for React Development
Keeper App Project - Part 1 Challenge
Keeper App Part 1 Solution
React Props
React Props Practice
React DevTools
Mapping Data to Components
Mapping Data to Components Practice
Javascript ES6 Map/Filter/Reduce
Javascript ES6 Arrow functions
Keeper App Project - Part 2
React Conditional Rendering with the Ternary Operator & AND Operator
Conditional Rendering Practice
State in React - Declarative vs. Imperative Programming
React Hooks - useState
useState Hook Practice
Javascript ES6 Object & Array Destructuring
Javascript ES6 Destructuring Challenge Solution
Event Handling in React
React Forms
Class Components vs. Functional Components
Changing Complex State
Changing Complex State Practice
Javascript ES6 Spread Operator
Javascript ES6 Spread Operator Practice
Managing a Component Tree
Managing a Component Tree Practice
Keeper App Project - Part 3
React Dependencies & Styling the Keeper App
Tip from Angela - How to Build Your Own Product` },
{ n: 34, title: 'Bonus Module: Ask Angela Anything', lessons: `
AAA 1 - How to Soak in Programming Concepts and more...
AAA 2 - Schedule for Learning to Code and more...
AAA 3 - How to Start Freelancing and more...
AAA 4 - The Live AMA` },
{ n: 35, title: 'Next Steps', lessons: `
Vote for the Next Module!` }
  ]
};
