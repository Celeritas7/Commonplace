-- import_beginner.sql
-- FAITHFUL extraction from Self_practice_beginner.ipynb (no invented metadata).
-- subject='python'; difficulty=NULL; tags=['import:beginner', <h1 section>].
-- passed: substring match (success/passed/worked/complete -> true; fail/can't/error/issue -> false;
--   negation guard: positive substring + negator (not/n't/never/no, un-/in-) -> false; else NULL).
-- resolved: any later attempt in the same exercise passed (same fixed logic).
-- user_id = e91a5f37-e63a-4fd0-8488-4d7a51d56822 on every row.
-- Idempotent: removes this user's 'pilot' (tag 'pilot') and prior beginner-import rows first, FK order.
-- Counts: exercises=60, attempts=107, mistakes=27.

BEGIN;

DELETE FROM commonplace_mistakes m USING commonplace_exercises e
 WHERE m.exercise_id = e.id AND e.user_id = 'e91a5f37-e63a-4fd0-8488-4d7a51d56822'::uuid
   AND e.subject = 'python' AND e.tags && ARRAY['pilot','import:beginner']::text[];
DELETE FROM commonplace_attempts a USING commonplace_exercises e
 WHERE a.exercise_id = e.id AND e.user_id = 'e91a5f37-e63a-4fd0-8488-4d7a51d56822'::uuid
   AND e.subject = 'python' AND e.tags && ARRAY['pilot','import:beginner']::text[];
DELETE FROM commonplace_exercises e
 WHERE e.user_id = 'e91a5f37-e63a-4fd0-8488-4d7a51d56822'::uuid
   AND e.subject = 'python' AND e.tags && ARRAY['pilot','import:beginner']::text[];

DO $IMPORT$
DECLARE
  ex_id  uuid;
  att_id uuid;
BEGIN
  -- [0] 'Prime Number Checker'  (4 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Prime Number Checker$c$, $c$Prime numbers are numbers that can only be cleanly divided by themselves and 1. Wikipedia$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Browser practice$c$]::text[], 0)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

user_input = input("Please enter any random number of your choice.")

divisors = {}

for divisor in range(1,divisors+1):

    if user_input%divisor == 0:
        divisors.getitems() = divisor

print(divisors)

#def is_prime(number):

#    if number$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def is_prime(number):

    divisors = {}

    for divisor in range(1,number+1):

        if number%divisor == 0:
            divisors[divisor] = divisor

    print(divisors)

user_input = int(input("Please enter any random number of your choice."))
is_prime(user_input)$c$,
          $c$Please enter any random number of your choice.43
{1: 1, 43: 43}
$c$, true)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

def is_prime(number):

    divisors = {}

    for divisor in range(1,number+1):

        if number%divisor == 0:
            divisors[divisor] = divisor

    if len(divisors)<=2:
        return True
    else:
        return False

while True:
    user_input = input("""Please enter any random number of your choice.
Please enter N to exit\n""").lower()

    if user_input == "n":
         break

    num = int(user_input)

    print(is_prime(num))$c$,
          NULL, true)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def is_prime(number):

    divisors = {}

    for divisor in range(1,number+1):

        if number%divisor == 0 and (number != 1 or number != number):
            return False
            break

        elif number%divisor == 0:
            divisors[divisor] = divisor

    if len(divisors)<=2:
        return True
    else:
        return False

while True:
    user_input = input("""Please enter any random number of your choice.
Please enter N to exit\n""").lower()

    if user_input == "n":
         break

    num = int(user_input)

    print(is_prime(num))$c$,
          $c$False
False
False
False
$c$, true)
  RETURNING id INTO att_id;

  -- [1] 'FizzBuzz'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$FizzBuzz$c$, $c$You are going to write a program that automatically prints the solution to the FizzBuzz game. These are the rules of the FizzBuzz game:$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Browser practice$c$]::text[], 1)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
for i in range(1,101):
    if i % 3 == 0 and i % 5 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)$c$,
          $c$1
2
Fizz
4
Buzz
Fizz
7
8
Fizz
Buzz
11
Fizz
13
14
FizzBuzz
16
17
Fizz
19
Buzz
Fizz
22
23
Fizz
Buzz
26
Fizz
28
29
FizzBuzz
31
32
Fizz
34
Buzz
Fizz
37
38
Fizz
Buzz
41
Fizz
43
44
FizzBuzz
46
47
Fizz
49
Buzz
Fizz
52
53
Fizz
Buzz
56
Fizz
58
59
FizzBuzz
61
62
Fizz
64
Buzz
Fizz
67
68
Fizz
Buzz
71
Fizz
73
74
FizzBuzz
76
77
Fizz
79
Buzz
Fizz
82
83
Fizz
Buzz
86
Fizz
88
89
FizzBuzz
91
92
Fizz
94
Buzz
Fizz
97
98
Fizz
Buzz
$c$, NULL)
  RETURNING id INTO att_id;

  -- [2] 'Life in weeks'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Life in weeks$c$, $c$I was reading this article by Tim Urban - Your Life in Weeks and realised just how little time we actually have.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Browser practice$c$]::text[], 2)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$def life_in_weeks(age):

    no_of_weeks= (90 - age)*52

    return no_of_weeks

age = int(input("please enter your age"))

answer = life_in_weeks(age)
print(f"You have {answer} weeks left.")$c$,
          $c$please enter your age34
You have 2912 weeks left.
$c$, NULL)
  RETURNING id INTO att_id;

  -- [3] 'Love Calculator'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Love Calculator$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Browser practice$c$]::text[], 3)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def calculate_love_score(name1,name2):
    combined_name = name1.lower() + name2.lower()
    length = len(name1) + len(name2)

#    print(combined_name, length)

    count1 = 0
    count2 = 0

    for letter in combined_name:
        if letter == "t" or letter == "r" or letter == "u" or letter == "e":
           count1 += 1
        if letter == "l" or letter == "o" or letter == "v" or letter == "e":
           count2 += 1

    return count1*10 +count2

calculate_love_score("Aniket Mangaonkar","Su Pyae sone")
#calculate_love_score("Aniket","tathasu")$c$,
          $c$65$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$def calculate_love_score(name1,name2):
    length = len(name1)+len(name2)
    name = name1.lower()+name2.lower()

    count1 = 0
    count2 = 0

    for letter in name:

        if letter == "t" or letter == "r" or letter == "u" or letter == "e":
            count1 += 1

        if letter == "l" or letter == "o" or letter == "v" or letter == "e":
            count2 += 1

    return count1*10+count2

calculate_love_score("Kanye West", "Kim Kardashian")$c$,
          $c$42$c$, true)
  RETURNING id INTO att_id;

  -- [4] 'Grading exercise'  (3 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Grading exercise$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Browser practice$c$]::text[], 4)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$student_scores = {
    "Harry": 81,
    "Ron": 78,
    "Hermione": 99,
    "Draco": 74,
    "Neville": 62,
}

student_grades = {}

# Copilot help
for student,score in student_scores:

    if 90 < score <= 100:

# Copilot help
        student_grades[student] = "Outstanding"
    elif 80 < score <= 90:
        student_grades[student] = "Exceeds Expectations"
    elif 70 < score <= 80:
        student_grades[student] = "Acceptable"
    elif score <= 70:
        student_grades[student] = "fail"
    else:
        print("Score entry is not valid")

print(student_grades)$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$student_scores = {
    "Harry": 81,
    "Ron": 78,
    "Hermione": 99,
    "Draco": 74,
    "Neville": 62,
}

student_grades = {}

# Copilot help
for student,score in student_scores.items():

    if 90 < score <= 100:

# Copilot help
        student_grades[student] = "Outstanding"
    elif 80 < score <= 90:
        student_grades[student] = "Exceeds Expectations"
    elif 70 < score <= 80:
        student_grades[student] = "Acceptable"
    elif score <= 70:
        student_grades[student] = "fail"
    else:
        print("Score entry is not valid")

print(student_grades)$c$,
          $c${'Harry': 'Exceeds Expectations', 'Ron': 'Acceptable', 'Hermione': 'Outstanding', 'Draco': 'Acceptable', 'Neville': 'fail'}
$c$, true)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$# 🚫 Do not modify this dictionary
student_scores = {
    "Harry": 81,
    "Ron": 78,
    "Hermione": 99,
    "Draco": 74,
    "Neville": 62,
}

# ✅ Create a new dictionary for grades
student_grades = {}

# 🧠 Apply grading logic
for student, score in student_scores.items():
    if score > 90:
        student_grades[student] = "Outstanding"
    elif score > 80:
        student_grades[student] = "Exceeds Expectations"
    elif score > 70:
        student_grades[student] = "Acceptable"
    else:
        student_grades[student] = "Fail"

# 🖨️ Optional: print the result
print(student_grades)$c$,
          $c${'Harry': 'Exceeds Expectations', 'Ron': 'Acceptable', 'Hermione': 'Outstanding', 'Draco': 'Acceptable', 'Neville': 'Fail'}
$c$, true)
  RETURNING id INTO att_id;

  -- [5] 'Burmese birth weekday'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Burmese birth weekday$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 5)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def birth_weekday(character):

  if character == "က":
    return "You born on Monday"
  elif character == "ခ":
    return "You born on Tuesday"
  elif character == "ဂ":
    return "You born on Wednesday"
  elif character == "Hv":
    return "You born on Thursday"
  elif character == "Hv":
    return "You born on Friday"
  elif character == "Hv":
    return "You born on Saturday"
  elif character == "Hv":
    return "You born on Sunday"
  else:
    return "please enter correct character"
while True:
  user_input = input("What is the first character of your name?")

  print(birth_weekday(user_input))$c$,
          $c$What is the first character of your name?You born on
please enter correct character
What is the first character of your name?က
You born on Monday
$c$, NULL)
  RETURNING id INTO att_id;

  -- [6] 'Weekday from the date calculator'  (3 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Weekday from the date calculator$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 6)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def doomsday(century):

    a = century % 400

    if a == 0:
        return 1
    elif a == 100:
        return 0
    elif a == 200:
        return 5
    elif a == 300:
        return 3


def weekday_calculator(date):

    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    if len(str(date)) == 8:

        processor = date % 1000000
        a = doomsday(int(((date % 10000)/100)*100))
        b = processor / 12
        c = processor % 12
        d = c % 4

        temp = a + b + c + d

        weekday_number = int(temp % 7)

        weekday = weekdays[int(weekday_number)]
        return weekday

    else:
        return "Please enter correct date"


while True:

    user_input = input("""Please enter any random date in the format dd/mm/yyyy
Please enter N to exit.""").lower()

    if user_input == "n":
        break

    date_input = int(user_input)

    print(weekday_calculator(date_input))$c$,
          $c$Please enter any random date in the format dd/mm/yyyy
Please enter N to exit.13011992
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def doomsday(century):

    a = century % 400

    if a == 0:
        return 1
    elif a == 100:
        return 0
    elif a == 200:
        return 5
    elif a == 300:
        return 3


def weekday_calculator(date):

    weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    if len(str(date)) == 8:

        processor = date % 1000000
        doomsday_calc = ((date % 10000)/100)*100

        a = doomsday(int(doomsday_calc))
        b = processor / 12
        c = processor % 12
        d = c % 4

        temp = a + b + c + d

        weekday_number = int(temp % 7)

#        weekday = weekdays[int(weekday_number)]
        return weekday

    else:
        return "Please enter correct date"


while True:

    user_input = input("""Please enter any random date in the format dd/mm/yyyy
Please enter N to exit.""").lower()

    if user_input == "n":
        break

    date_input = int(user_input)

    print(weekday_calculator(date_input))

    weekday = weekdays[int(weekday_number)]$c$,
          NULL, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$def doomsday(century):

    a = century % 400

    if a == 0:
        return 1
    elif a == 100:
        return 0
    elif a == 200:
        return 5
    elif a == 300:
        return 3

date = int(input("Please enter"))

processor = date % 1000000
doomsday_calc = int(((date % 10000)/100)*100)
print(doomsday_calc)


a = doomsday(doomsday_calc)
b = processor / 12
c = processor % 12
d = c % 4

print(type(a))
print(type(b))
print(type(c))
print(type(d))


temp = a + b + c + d

weekday_number = int(temp % 7)
print (weekday_number)

print (int(((date % 10000)/100)*100))$c$,
          $c$Please enter13011992
1992
<class 'NoneType'>
<class 'float'>
<class 'int'>
<class 'int'>
$c$, NULL)
  RETURNING id INTO att_id;

  -- [7] 'wih excel'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$wih excel$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 7)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import pandas as pd

# Load the Excel file
excel_url = "https://onedrive.live.com/download?cid=dbb8aacb1133d559&resid=DBB8AACB1133D559!sa09b0673bd3840889fc766eaa4139698" # Replace with your file path or URL
xls = pd.ExcelFile(excel_url)

# Read all sheets into a dictionary
tasklists = {sheet: xls.parse(sheet) for sheet in xls.sheet_names}

location_map = {
    1: "train",
    2: "road",
    3: "company",
    4: "room",
    5: "park",
    6: "share_house",
    7: "exit"
}

mood_map = {
    1: "ok",
    2: "ok_hectic",
    3: "down_hectic",
    4: "down_down_down",
    5: "planning",
    6: "exit"
}

# 🎤 Prompt user
start_input = int(input("""Hey. How are you today. Is i goof ime o ak?
Please ener,
1. for
2. N o exi: """))

mood_input = int(input("""🧠 How's your mood?
1. I'm good. Today was awesome.
2. I'm good. But today was a little hectic.
3. I'm a bit tired. Today was really hectic.
4. I'm totally exhausted. Did overtime today.
5. I want to access the planning team.
6. Please end his chat.
Enter your choice (1–6): \n"""))

location_input = int(input("""📍 Where are you now?
1. Train
2. Walking on road
3. In company
4. In the room
5. Sitting in park
6. Share house (living room)
7. Please end his chat.
Enter your choice (1–7): \n"""))

# 🔄 Map inputs to values
location = location_map.get(location_input, "unknown")
mood = mood_map.get(mood_input, "unknown")

# 🚪 Handle exit
if location == "exit" or mood == "exit":
    print("👋 Ending the session. See ou laer!")
    exit()

def filter_tasks(df, location, mood):
    return df[
        (df["location"].str.lower() == location.lower()) &
        (df["is_available"] == True) &
        (~((df["mood_sensitive"] == True) & (mood == "down")))
    ]["task"].tolist()

filtered = {
    category: filter_tasks(df, location_input, mood_input)
    for category, df in tasklists.items()
}

# Display results
print(f"\n📝 Tasks for location='{location_input}' and mood='{mood_input}':")
for category, tasks in filtered.items():
    if tasks:
        print(f"\n📂 {category}:")
        for t in tasks:
            print(f"  - {t}")$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [8] 'Googleshees -> excel (column names issue)'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Googleshees -> excel (column names issue)$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 8)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

from google.colab import drive
drive.mount('/content/drive')  # ✅ No trailing slash

import pandas as pd
xls = pd.ExcelFile("/content/drive/MyDrive/Mind_Palace/Discussion.xlsx")

# Load all sheets into a dictionary
tasklists = {sheet: xls.parse(sheet) for sheet in xls.sheet_names}

location_map = {
    1: "train",
    2: "road",
    3: "company",
    4: "room",
    5: "park",
    6: "share_house",
    7: "exit"
}

mood_map = {
    1: "ok",
    2: "ok_hectic",
    3: "down_hectic",
    4: "down_down_down",
    5: "planning",
    6: "exit"
}

# 🎤 Prompt user
start_input = int(input("""Hey. How are you today. Is i goof ime o ak?
Please ener,
1. for
2. N o exi: """))

mood_input = int(input("""🧠 How's your mood?
1. I'm good. Today was awesome.
2. I'm good. But today was a little hectic.
3. I'm a bit tired. Today was really hectic.
4. I'm totally exhausted. Did overtime today.
5. I want to access the planning team.
6. Please end his chat.
Enter your choice (1–6): \n"""))

location_input = int(input("""📍 Where are you now?
1. Train
2. Walking on road
3. In company
4. In the room
5. Sitting in park
6. Share house (living room)
7. Please end his chat.
Enter your choice (1–7): \n"""))

# 🔄 Map inputs to values
location = location_map.get(location_input, "unknown")
mood = mood_map.get(mood_input, "unknown")

# 🚪 Handle exit
if location == "exit" or mood == "exit":
    print("👋 Ending the session. See ou laer!")
    exit()

def filter_tasks(df, location, mood):
    return df[
        (df["location"].str.lower() == location.lower()) &
        (df["is_available"] == True) &
        (~((df["mood_sensitive"] == True) & (mood == "down")))
    ]["task"].tolist()

filtered = {
    category: filter_tasks(df, location_input, mood_input)
    for category, df in tasklists.items()
}

# Display results
print(f"\n📝 Tasks for location='{location_input}' and mood='{mood_input}':")
for category, tasks in filtered.items():
    if tasks:
        print(f"\n📂 {category}:")
        for t in tasks:
            print(f"  - {t}")$c$,
          $c$Mounted at /content/drive
Hey. How are you today. Is i goof ime o ak?
Please ener,
1. for 
2. N o exi: 1
🧠 How's your mood?
1. I'm good. Today was awesome.
2. I'm good. But today was a little hectic.
3. I'm a bit tired. Today was really hectic.
4. I'm totally exhausted. Did overtime today.
5. I want to access the planning team.
6. Please end his chat.
Enter your choice (1–6): 
1
📍 Where are you now?
1. Train
2. Walking on road
3. In company
4. In the room
5. Sitting in park
6. Share house (living room)
7. Please end his chat.
Enter your choice (1–7): 
1
$c$, NULL)
  RETURNING id INTO att_id;

  -- [9] 'Googleshees -> excel'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Googleshees -> excel$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 9)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
from google.colab import drive
drive.mount('/content/drive')  # ✅ No trailing slash

import pandas as pd
xls = pd.ExcelFile("/content/drive/MyDrive/Mind_Palace/Discussion.xlsx")

# Load all sheets into a dictionary
tasklists = {
    sheet: xls.parse(sheet).rename(columns=lambda col: col.strip().lower().replace(" ", "_"))
    for sheet in xls.sheet_names
}


location_map = {
    1: "train",
    2: "road",
    3: "company",
    4: "room",
    5: "park",
    6: "share_house",
    7: "exit"
}

mood_map = {
    1: "ok",
    2: "ok_hectic",
    3: "down_hectic",
    4: "down_down_down",
    5: "planning",
    6: "exit"
}

# 🎤 Prompt user
start_input = int(input("""Hey. How are you today. Is i goof ime o ak?
1. Yes
2. No, exit: """))


mood_input = int(input("""🧠 How's your mood?
1. I'm good. Today was awesome.
2. I'm good. But today was a little hectic.
3. I'm a bit tired. Today was really hectic.
4. I'm totally exhausted. Did overtime today.
5. I want to access the planning team.
6. Please end his chat.
Enter your choice (1–6): \n"""))

location_input = int(input("""📍 Where are you now?
1. Train
2. Walking on road
3. In company
4. In the room
5. Sitting in park
6. Share house (living room)
7. Please end his chat.
Enter your choice (1–7): \n"""))

# 🔄 Map inputs to values
location = location_map.get(location_input, "unknown")
mood = mood_map.get(mood_input, "unknown")

# 🚪 Handle exit
if location == "exit" or mood == "exit":
    print("👋 Ending the session. See ou laer!")
    exit()

def normalize_mood(mood):
    return "down" if "down" in mood else "ok"

normalized_mood = normalize_mood(mood)

df = tasklists["Study_taks"]
print(df.columns.tolist())

for sheet_name, df in tasklists.items():
    print(f"\n📄 {sheet_name}")
    print(f"🧩 Columns: {[repr(col) for col in df.columns]}")
    print(f"✅ Has 'name'? {'name' in df.columns}")
    print(f"✅ Has 'train'? {'train' in df.columns}")

def filter_tasks(df, location, mood):
    required_columns = ["name", location]

    # Check if required columns exist
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        print(f"⚠️ Skipping sheet — missing columns: {missing}")
        return []



#     df = df.dropna(subset=["name"])

#     # Mood-sensitive logic
#     if mood == "down" and "mood_check" in df.columns:
#         df = df[df["mood_check"].isna()]

#     # Filter by location availability
#     df = df[df[location] == True]

#     return df["name"].tolist()


# filtered = {
#     category.title: filter_tasks(df, location, normalized_mood)
#     for category, df in tasklists.items()
# }

# # Display results
# print(f"\n📝 Tasks for location='{location}' and mood='{mood}':")
# for category, tasks in filtered.items():
#     if tasks:
#         print(f"\n📂 {category}:")
#         for t in tasks:
#             print(f"  - {t}")$c$,
          $c$Drive already mounted at /content/drive; to attempt to forcibly remount, call drive.mount("/content/drive", force_remount=True).
Hey. How are you today. Is i goof ime o ak?
1. Yes
2. No, exit: 1
🧠 How's your mood?
1. I'm good. Today was awesome.
2. I'm good. But today was a little hectic.
3. I'm a bit tired. Today was really hectic.
4. I'm totally exhausted. Did overtime today.
5. I want to access the planning team.
6. Please end his chat.
Enter your choice (1–6): 
1
📍 Where are you now?
1. Train
2. Walking on road
3. In company
4. In the room
5. Sitting in park
6. Share house (living room)
7. Please end his chat.
Enter your choice (1–7): 
1
['subject', 'category', 'name', 'mood', 'train', 'road', 'company', 'room', 'park', 'share_house']

📄 Media
🧩 Columns: ["'subject'", "'categoty'", "'name'", "'mood'", "'train'", "'road'", "'company'", "'room'", "'park'", "'share_house'"]
✅ Has 'name'? True
✅ Has 'train'? True

📄 Receipe
🧩 Columns: ["'subject'", "'categoty'", "'name'", "'mood'", "'train'", "'road'", "'company'", "'room'", "'park'", "'share_house'"]
✅ Has 'name'? True
✅ Has 'train'? True

📄 Errands
🧩 Columns: ["'subject'", "'categoty'", "'name'", "'mood'", "'train'", "'road'", "'company'", "'room'", "'park'", "'share_house'"]
✅ Has 'name'? True
✅ Has 'train'? True

📄 Study_taks
🧩 Columns: ["'subject'", "'category'", "'name'", "'mood'", "'train'", "'road'", "'company'", "'room'", "'park'", "'share_house'"]
✅ Has 'name'? True
✅ Has 'train'? True
$c$, NULL)
  RETURNING id INTO att_id;

  -- [10] 'Googleshees'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Googleshees$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 10)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$!pip install --upgrade gspread pandas gspread-dataframe

from google.colab import auth
auth.authenticate_user()

import gspread
from google.auth import default
creds, _ = default()
gc = gspread.authorize(creds)

# Option 1: Use full URL
sheet = gc.open_by_url("https://docs.google.com/spreadsheets/d/1UzOwxplJPGIZLYm-4KBEo8FuI7n5zDkjKIqYl6qqKp8/edit?usp=sharing")

# Option 2: Use just the ID
# sheet = gc.open_by_key("15VW4iVyvvuW0tuea0q5P_6ewoo9Z1WGY")

from gspread_dataframe import get_as_dataframe

worksheet = sheet.worksheet("Study_task")  # Replace with your sheet name
df = get_as_dataframe(worksheet)
print(df.head())

tasklists = {
    sheet_title: get_as_dataframe(sheet.worksheet(sheet_title))
    for sheet_title in sheet.worksheets()
}

location_map = {
    1: "train",
    2: "road",
    3: "company",
    4: "room",
    5: "park",
    6: "share_house",
    7: "exit"
}

mood_map = {
    1: "ok",
    2: "ok_hectic",
    3: "down_hectic",
    4: "down_down_down",
    5: "planning",
    6: "exit"
}

start_input = int(input("""Hey. How are you today? Is it a good time to talk?
1. Yes
2. No, exit: """))

mood_input = int(input("""🧠 How's your mood?
1. I'm good. Today was awesome.
2. I'm good. But today was a little hectic.
3. I'm a bit tired. Today was really hectic.
4. I'm totally exhausted. Did overtime today.
5. I want to access the planning team.
6. Please end this chat.
Enter your choice (1–6): """))

location_input = int(input("""📍 Where are you now?
1. Train
2. Walking on road
3. In company
4. In the room
5. Sitting in park
6. Share house (living room)
7. Please end this chat.
Enter your choice (1–7): """))

location = location_map.get(location_input, "unknown")
mood = mood_map.get(mood_input, "unknown")

if location == "exit" or mood == "exit":
    print("👋 Ending the session. Take care!")
    exit()

def normalize_mood(mood):
    return "down" if "down" in mood else "ok"

normalized_mood = normalize_mood(mood)

def filter_tasks(df, location, mood):
    df = df.dropna(subset=["task", "location", "is_available", "mood_sensitive"])  # Clean up
    return df[
        (df["location"].str.lower() == location.lower()) &
        (df["is_available"] == True) &
        (~((df["mood_sensitive"] == True) & (mood == "down")))
    ]["task"].tolist()

filtered = {
    category.title: filter_tasks(df, location, normalized_mood)
    for category, df in tasklists.items()
}

print(f"\n📝 Tasks for location='{location}' and mood='{mood}':")
for category, tasks in filtered.items():
    if tasks:
        print(f"\n📂 {category}:")
        for t in tasks:
            print(f"  - {t}")
$c$,
          $c$Requirement already satisfied: gspread in /usr/local/lib/python3.12/dist-packages (6.2.1)
Requirement already satisfied: pandas in /usr/local/lib/python3.12/dist-packages (2.3.2)
Requirement already satisfied: gspread-dataframe in /usr/local/lib/python3.12/dist-packages (4.0.0)
Requirement already satisfied: google-auth>=1.12.0 in /usr/local/lib/python3.12/dist-packages (from gspread) (2.38.0)
Requirement already satisfied: google-auth-oauthlib>=0.4.1 in /usr/local/lib/python3.12/dist-packages (from gspread) (1.2.2)
Requirement already satisfied: numpy>=1.26.0 in /usr/local/lib/python3.12/dist-packages (from pandas) (2.0.2)
Requirement already satisfied: python-dateutil>=2.8.2 in /usr/local/lib/python3.12/dist-packages (from pandas) (2.9.0.post0)
Requirement already satisfied: pytz>=2020.1 in /usr/local/lib/python3.12/dist-packages (from pandas) (2025.2)
Requirement already satisfied: tzdata>=2022.7 in /usr/local/lib/python3.12/dist-packages (from pandas) (2025.2)
Requirement already satisfied: six>=1.12.0 in /usr/local/lib/python3.12/dist-packages (from gspread-dataframe) (1.17.0)
Requirement already satisfied: cachetools<6.0,>=2.0.0 in /usr/local/lib/python3.12/dist-packages (from google-auth>=1.12.0->gspread) (5.5.2)
Requirement already satisfied: pyasn1-modules>=0.2.1 in /usr/local/lib/python3.12/dist-packages (from google-auth>=1.12.0->gspread) (0.4.2)
Requirement already satisfied: rsa<5,>=3.1.4 in /usr/local/lib/python3.12/dist-packages (from google-auth>=1.12.0->gspread) (4.9.1)
Requirement already satisfied: requests-oauthlib>=0.7.0 in /usr/local/lib/python3.12/dist-packages (from google-auth-oauthlib>=0.4.1->gspread) (2.0.0)
Requirement already satisfied: pyasn1<0.7.0,>=0.6.1 in /usr/local/lib/python3.12/dist-packages (from pyasn1-modules>=0.2.1->google-auth>=1.12.0->gspread) (0.6.1)
Requirement already satisfied: oauthlib>=3.0.0 in /usr/local/lib/python3.12/dist-packages (from requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (3.3.1)
Requirement already satisfied: requests>=2.0.0 in /usr/local/lib/python3.12/dist-packages (from requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (2.32.4)
Requirement already satisfied: charset_normalizer<4,>=2 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (3.4.3)
Requirement already satisfied: idna<4,>=2.5 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (3.10)
Requirement already satisfied: urllib3<3,>=1.21.1 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (2.5.0)
Requirement already satisfied: certifi>=2017.4.17 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (2025.8.3)
    subject          category                     name  mood  train  road  \
0        AI              Phon           Coding pracice   1.0    1.0   0.0   
1       NaN  machine learning             book reading   1.0    1.0   1.0   
2       NaN               NaN                      NaN   1.0    0.0   0.0   
3       NaN               NaN                      NaN   1.0    0.0   0.0   
4  Japanese             Kanji  Solving the Kanji tests   1.0    1.0   0.0   

   company  room  park  share_house  
0      1.0   0.0   0.0          0.0  
1      1.0   1.0   1.0          1.0  
2      0.0   0.0   0.0          0.0  
3      0.0   0.0   0.0          0.0  
4      0.0   0.0   1.0          1.0  
$c$, NULL)
  RETURNING id INTO att_id;

  -- [11] 'new google shees'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$new google shees$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 11)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$!pip install --upgrade gspread pandas gspread-dataframe

from google.colab import auth
auth.authenticate_user()

import gspread
from google.auth import default
from gspread_dataframe import get_as_dataframe

creds, _ = default()
gc = gspread.authorize(creds)

# 🔗 Connect to your Google Sheet
sheet = gc.open_by_url("https://docs.google.com/spreadsheets/d/1UzOwxplJPGIZLYm-4KBEo8FuI7n5zDkjKIqYl6qqKp8/edit?usp=sharing")

# 📥 Load all sheets into a dictionary with normalized columns
def clean_columns(df):
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")
    df = df.rename(columns={"categoty": "category"})  # Fix typo if needed
    return df

tasklists = {
    ws.title: clean_columns(get_as_dataframe(ws, evaluate_formulas=True, header=0))
    for ws in sheet.worksheets()
}

location_map = {
    1: "train", 2: "road", 3: "company", 4: "room", 5: "park", 6: "share_house", 7: "exit"
}
mood_map = {
    1: "ok", 2: "ok_hectic", 3: "down_hectic", 4: "down_down_down", 5: "planning", 6: "exit"
}

start_input = int(input("Hey. Is it a good time to talk?\n1. Yes\n2. No, exit: "))
if start_input == 2:
    print("👋 Ending the session. Take care!")
    exit()

mood_input = int(input("🧠 How's your mood?\n1–6: "))
location_input = int(input("📍 Where are you now?\n1–7: "))

location = location_map.get(location_input, "unknown")
mood = mood_map.get(mood_input, "unknown")

if location == "exit" or mood == "exit":
    print("👋 Ending the session. Take care!")
    exit()

def normalize_mood(mood):
    return "down" if "down" in mood else "ok"

normalized_mood = normalize_mood(mood)

def filter_tasks(df, location, mood):
    required_columns = ["name", location]
    missing = [col for col in required_columns if col not in df.columns]
    if missing:
        print(f"⚠️ Skipping sheet — missing columns: {missing}")
        return []

    df = df.dropna(subset=["name"])

    if mood == "down" and "mood_check" in df.columns:
        df = df[df["mood_check"].isna()]

    df = df[df[location] == True]

    return df["name"].tolist()

# ✅ Move this OUTSIDE the function
filtered = {
    category: filter_tasks(df, location, normalized_mood)
    for category, df in tasklists.items()
}

print(f"\n📝 Tasks for location='{location}' and mood='{mood}':")
for category, tasks in filtered.items():
    if tasks:
        print(f"\n📂 {category}:")
        for t in tasks:
            print(f"  - {t}")
$c$,
          $c$Requirement already satisfied: gspread in /usr/local/lib/python3.12/dist-packages (6.2.1)
Requirement already satisfied: pandas in /usr/local/lib/python3.12/dist-packages (2.3.2)
Requirement already satisfied: gspread-dataframe in /usr/local/lib/python3.12/dist-packages (4.0.0)
Requirement already satisfied: google-auth>=1.12.0 in /usr/local/lib/python3.12/dist-packages (from gspread) (2.38.0)
Requirement already satisfied: google-auth-oauthlib>=0.4.1 in /usr/local/lib/python3.12/dist-packages (from gspread) (1.2.2)
Requirement already satisfied: numpy>=1.26.0 in /usr/local/lib/python3.12/dist-packages (from pandas) (2.0.2)
Requirement already satisfied: python-dateutil>=2.8.2 in /usr/local/lib/python3.12/dist-packages (from pandas) (2.9.0.post0)
Requirement already satisfied: pytz>=2020.1 in /usr/local/lib/python3.12/dist-packages (from pandas) (2025.2)
Requirement already satisfied: tzdata>=2022.7 in /usr/local/lib/python3.12/dist-packages (from pandas) (2025.2)
Requirement already satisfied: six>=1.12.0 in /usr/local/lib/python3.12/dist-packages (from gspread-dataframe) (1.17.0)
Requirement already satisfied: cachetools<6.0,>=2.0.0 in /usr/local/lib/python3.12/dist-packages (from google-auth>=1.12.0->gspread) (5.5.2)
Requirement already satisfied: pyasn1-modules>=0.2.1 in /usr/local/lib/python3.12/dist-packages (from google-auth>=1.12.0->gspread) (0.4.2)
Requirement already satisfied: rsa<5,>=3.1.4 in /usr/local/lib/python3.12/dist-packages (from google-auth>=1.12.0->gspread) (4.9.1)
Requirement already satisfied: requests-oauthlib>=0.7.0 in /usr/local/lib/python3.12/dist-packages (from google-auth-oauthlib>=0.4.1->gspread) (2.0.0)
Requirement already satisfied: pyasn1<0.7.0,>=0.6.1 in /usr/local/lib/python3.12/dist-packages (from pyasn1-modules>=0.2.1->google-auth>=1.12.0->gspread) (0.6.1)
Requirement already satisfied: oauthlib>=3.0.0 in /usr/local/lib/python3.12/dist-packages (from requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (3.3.1)
Requirement already satisfied: requests>=2.0.0 in /usr/local/lib/python3.12/dist-packages (from requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (2.32.4)
Requirement already satisfied: charset_normalizer<4,>=2 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (3.4.3)
Requirement already satisfied: idna<4,>=2.5 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (3.10)
Requirement already satisfied: urllib3<3,>=1.21.1 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (2.5.0)
Requirement already satisfied: certifi>=2017.4.17 in /usr/local/lib/python3.12/dist-packages (from requests>=2.0.0->requests-oauthlib>=0.7.0->google-auth-oauthlib>=0.4.1->gspread) (2025.8.3)
Hey. Is it a good time to talk?
1. Yes
2. No, exit: 1
🧠 How's your mood?
1–6: 1
📍 Where are you now?
1–7: 1

📝 Tasks for location='train' and mood='ok':

📂 Study_task:
  - Coding pracice
  - book reading
  - Solving the Kanji tests

📂 Media:
  - om mani padme ham
  - namo namo shankara

📂 Receipe:
  - jus chicken fried

📂 Grossories:
  - Cauliflower
  - gongura

📂 Errands:
  - 888.0
  - 999.0
$c$, NULL)
  RETURNING id INTO att_id;

  -- [12] 'inermediae'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$inermediae$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$own project$c$]::text[], 12)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$# Tasklists organized by category
study_tasks = [
    {"task": "Review Japanese grammar notes", "location": "home", "mood_sensitive": True},
    {"task": "Analyze subtitle encoding", "location": "home", "mood_sensitive": True},
    {"task": "Sketch Rock-Paper-Scissors diagram", "location": "home", "mood_sensitive": True}
]

fruits_timings = [
    {"task": "Prepare lunch", "location": "home", "mood_sensitive": False},
    {"task": "Buy groceries", "location": "market", "mood_sensitive": False}
]

cooking_tasks = [
    {"task": "Prepare lunch", "location": "home", "mood_sensitive": False},
    {"task": "Buy groceries", "location": "market", "mood_sensitive": False}
]

cooked_food_tasks = [
    {"task": "Check fridge for leftovers", "location": "home", "mood_sensitive": False}
]

errand_tasks = [
    {"task": "Visit post office", "location": "outside", "mood_sensitive": False}
]

def filter_category_tasks(tasklist, location, mood):
    return [
        task["task"]
        for task in tasklist
        if task["location"] == location and not (mood == "down" and task["mood_sensitive"])
    ]

location_input = input("Enter your current location (e.g., home, market, outside): ").strip().lower()
mood_input = input("How's your mood? (ok/down): ").strip().lower()

# Apply filtering
filtered = {
    "Study": filter_category_tasks(study_tasks, location_input, mood_input),
    "fruits_timings": filter_category_tasks(fruits_timings, location_input, mood_input),
    "Cooking": filter_category_tasks(cooking_tasks, location_input, mood_input),
    "Cooked Food": filter_category_tasks(cooked_food_tasks, location_input, mood_input),
    "Errands": filter_category_tasks(errand_tasks, location_input, mood_input)
}

# Display results
print(f"\n📝 Tasks for location='{location_input}' and mood='{mood_input}':")
for category, tasks in filtered.items():
    if tasks:
        print(f"\n📂 {category}:")
        for t in tasks:
            print(f"  - {t}")$c$,
          $c$Enter your current location (e.g., home, market, outside): home
How's your mood? (ok/down): ok

📝 Tasks for location='home' and mood='ok':

📂 Study:
  - Review Japanese grammar notes
  - Analyze subtitle encoding
  - Sketch Rock-Paper-Scissors diagram

📂 fruits_timings:
  - Prepare lunch

📂 Cooking:
  - Prepare lunch

📂 Cooked Food:
  - Check fridge for leftovers
$c$, NULL)
  RETURNING id INTO att_id;

  -- [13] '1. Start'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. Start$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$17. Fhjshsjejsb$c$]::text[], 13)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
class User:

    def __init__self(id,name):
        userid =
        name =
        followers = 0$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
class User:

    def __init__(self,user_id,username):
        self.id = user_id
        self.username = username
        self.followers = 0
        self.following = 0

    def follow(self,user):
        user.followers += 1
        self.following += 1

user_01 = User("001","Aniket")
user_02 = User("002","Vinit")

user_01.follow(user_02)

print(user_01.followers)
print(user_01.following)
print(user_02.followers)
print(user_02.following)$c$,
          $c$0
1
1
0
$c$, true)
  RETURNING id INTO att_id;

  -- [14] 'Question answer task'  (5 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Question answer task$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$17. Fhjshsjejsb$c$]::text[], 14)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

class Quiz:

    def __init__(self,question,answer):
        self.quesion = question
        self.answer = answer

    def result():
        question == answer

quesion_01("1.",2+3,5)

print(quesion_01.quesion)
print(quesion_01.answer)$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
class Quiz:

    def __init__(self,question,answer):
        self.quesion = question
        self.answer = answer

    def result():
        question == answer

quesion_01 = Quiz(2+3,5)
quesion_02 = Quiz(4+5,9)
quesion_03 = Quiz(6+7,13)
print(quesion_03.quesion)
print(quesion_03.answer)$c$,
          $c$13
13
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$class Quiz:

    def __init__(self, question, answer):
        self.q = question
        self.a = answer
        return q,a

question_01(1+3,4)
question_02(5+6,11)
question_03(11+13,34)
print(question_01.q)
print(question_01.a)$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Second failed attempt 1$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$class Quiz:

    def __init__(self, question, answer):
        self.q = question
        self.a = answer
        return q,a

    def result():
        if question == answer:
            return "Your answer is correct"
        else:
            return "Your answer is wrong"

question_01 = Quiz(1+3,4)
question_02 = Quiz(5+6,11)
question_03 = Quiz(11+13,34)
print(question_01.q)
print(question_01.a)$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Second failed attempt 2$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
class Quiz:

    def __init__(self, question, answer):
        self.q = question
        self.a = answer

    def result():
        if question == answer:
            return "Your answer is correct"
        else:
            return "Your answer is wrong"

question_01 = Quiz("1+3",4)
question_02 = Quiz("5+6",11)
question_03 = Quiz("11+13",34)
print(question_01.q)
print(question_01.a)$c$,
          $c$1+3
4
$c$, true)
  RETURNING id INTO att_id;

  -- [15] '1. 🐢 project'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. 🐢 project$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 16: Day 16 - Intermediate - Object Oriented Programming (OOP)$c$]::text[], 15)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

from turtle import Turtle, Screen

timmy = Turtle()
print(timmy)

my_screen = Screen()
print(my_screen.canvheight)
my_screen.exitonclick()$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [16] '2. ☕ Machine project'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$2. ☕ Machine project$c$, $c$Same as procedural programming just using OOPs way$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 16: Day 16 - Intermediate - Object Oriented Programming (OOP)$c$]::text[], 16)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
class __init__(self, coffee_choice,water

MENU = {
    "espresso": {
        "ingredients": {
            "water": 50,
            "coffee": 18,
        },
        "cost": 1.5,
    },
    "latte": {
        "ingredients": {
            "water": 200,
            "milk": 150,
            "coffee": 24,
        },
        "cost": 2.5,
    },
    "cappuccino": {
        "ingredients": {
            "water": 250,
            "milk": 100,
            "coffee": 24,
        },
        "cost": 3.0,
    }
}

resources = {
    "water": 300,
    "milk": 200,
    "coffee": 100,
}

number_to_drink = {
    1: "espresso",
    2: "latte",
    3: "cappuccino",
}

def user_input():

    coffee_choice = input("""Welcome to our café
What would you like to have?
Choose,
1: espresso
2: latte
3: cappuccino \n""")

    if coffee_choice == "off" or coffee_choice == "report":
        return coffee_choice

    return int(coffee_choice)

water_left = resources["water"]
milk_left = resources["milk"]
coffee_left = resources["coffee"]


while True:

    while True:

        while True:

            coffee_choice = user_input()

            if coffee_choice == "off":
                print("Turning off the ☕ machine")
                break

            if coffee_choice == "report":
                print(resources)
                break

            if all([coffee_choice != 3,coffee_choice != 2,coffee_choice != 1]):
                print("Please enter the correct choice")

            drink = number_to_drink.get(coffee_choice)
            print(drink)

            water_alert = False
            milk_alert = False
            coffee_alert = False

            water_consumed = 0
            milk_consumed = 0
            coffee_consumed = 0

            if water_left-(MENU[drink]["ingredients"]["water"]) < 0:
                water_alert = True
                break

            elif (coffee_left-MENU[drink]["ingredients"]["coffee"]) < 0:
                coffee_alert = True
                break

            if drink != "espresso":
                if (milk_left-MENU[drink]["ingredients"]["milk"]) < 0:
                    milk_alert = True
                    break

            if coffee_choice == 1:
                choice_1 = input("""Your have chosen espresso.
Please enter Y to confirm your order.
Please enter N to return to the menu.\n""").lower()

                if choice_1 == "n":
                    break
                elif choice_1 == "y":
#                    print(MENU[coffee_choice])

#.                  Correction using copilot
                    print(f"Here is your {list(MENU.keys())[0]}")  # dynamically gets the first drink name

#                    water_left = resources["water"]-MENU(["expresso"]["ingredients"]["water"])

                    water_consumed = resources["water"]-MENU["espresso"]["ingredients"]["water"]
                    milk_consumed = milk_consumed
                    coffee_consumed = resources["coffee"]-MENU["espresso"]["ingredients"]["coffee"]

            elif coffee_choice == 2:
                choice_2 = input("""Your have chosen latte.
Please enter Y to confirm your order.
Please enter N to return to the menu.\n""").lower()

                if choice_2 == "n":
                    break
                elif choice_1 == "y":
#                    print(MENU[coffee_choice])

#.                  Correction using copilot
                    print(f"Here is your {list(MENU.keys())[1]}")  # dynamically gets the first drink name

#                    water_left = resources["water"]-MENU(["expresso"]["ingredients"]["water"])

                    water_consumed = MENU["latte"]["ingredients"]["water"]
                    milk_consumed = MENU["latte"]["ingredients"]["milk"]
                    coffee_consumed = MENU["latte"]["ingredients"]["coffee"]
            elif coffee_choice == 3:
                choice_3 = input("""Your have chosen cappuccino.
Please enter Y to confirm your order.
Please enter N to return to the menu.\n""").lower()

                if choice_3 == "n":
                    break
                elif choice_1 == "y":
#                    print(MENU[coffee_choice])

#.                  Correction using copilot
                    print(f"Here is your {list(MENU.keys())[2]}")  # dynamically gets the first drink name

#                    water_left = resources["water"]-MENU(["expresso"]["ingredients"]["water"])

                    water_consumed = MENU["cappuccino"]["ingredients"]["water"]
                    milk_consumed = MENU["cappuccino"]["ingredients"]["milk"]
                    coffee_consumed = MENU["cappuccino"]["ingredients"]["coffee"]

            water_left = water_left - water_consumed
            milk_left = milk_left - milk_consumed
            coffee_left = coffee_left - coffee_consumed

            print(f"water left is {water_left}")
            print(f"milk left is {milk_left}")
            print(f"coffee left is {coffee_left}")


    if coffee_choice == "off":
        break

    if any([choice_1 == "n", choice_2 == "n", choice_3 == "n"]):
        break

    if water_alert != False:
        print("""There is a insufficient water in the machine.
Please call the staff and try again.""")

        if milk_alert != False:
            print("""There is a insufficient milk in the machine.
Please call the staff and try again.""")

            if coffee_alert != False:
                print("""There is are insufficient coffee beans in machine.
Please call the staff and try again.""")
    break$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [17] 'right angle triangle 📐 (right aligned)'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$right angle triangle 📐 (right aligned)$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Loops basics$c$]::text[], 17)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():
    height= int(input("Enter height of the star triangle:\n"))

    return height

height = user_input()

blanks = height - 1
stars = 1

for loops in height:

    blanks -= 1
    stars += 1

    print(" ")
    print("✳")$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():
    height= int(input("Enter height of the star triangle:\n"))

    return height

height = user_input()

blanks = height
stars = 0

for loops in range(height):

    blanks -= 1
    stars += 1

    print(" " * blanks + "*" * stars)$c$,
          $c$Enter height of the star triangle:
10
         *
        **
       ***
      ****
     *****
    ******
   *******
  ********
 *********
**********
$c$, true)
  RETURNING id INTO att_id;

  -- [18] 'right angle triangle (left aligned)'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$right angle triangle (left aligned)$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Loops basics$c$]::text[], 18)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():
    height= int(input("Enter height of the star triangle:\n"))

    return height

height = user_input()

blanks = height
stars = 0

for loops in range(height):

    blanks -= 1
    stars += 1

    print("*" * stars + " " * blanks)$c$,
          $c$Enter height of the star triangle:
10
*         
**        
***       
****      
*****     
******    
*******   
********  
********* 
**********
$c$, true)
  RETURNING id INTO att_id;

  -- [19] 'Full triangle (Pyramid)🔺'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Full triangle (Pyramid)🔺$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Loops basics$c$]::text[], 19)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():

    user_choice = input("""Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the program""").lower()

    height = int(input("what is the height of the triangle? \n"))

    return user_choice, height


while True:

     choice, height = user_input()

     if choice == "n":
         print("You have exited the program")
         break

     elif choice != "y":
         print("Please enter correct choice")

     else:

         blanks = height
         stars = 1

         for stars in range (height):

             blanks = blanks -1
             stars = stars*2 -1

             print(" " * blanks + "*" * stars + " " * blanks)$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$can't exit the loop. And one layer of stars is printing blank$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():

    user_choice = input("""Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the program""").lower()
    height = 0

    if user_choice == "y":
        height = int(input("what is the height of the triangle? \n"))

    return user_choice, height


while True:

     choice, height = user_input()

     if choice == "n":
         print("You have exited the program")
         break

     elif choice != "y":
         print("Please enter correct choice")

     else:
         blanks = height

         for stars in range (height):

             blanks = blanks -1
             stars = (stars+1)*2 -1

             print(" " * blanks + "*" * stars + " " * blanks)$c$,
          $c$Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programY
what is the height of the triangle? 
5
    *    
   ***   
  *****  
 ******* 
*********
Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programN
You have exited the program
$c$, true)
  RETURNING id INTO att_id;

  -- [20] 'Full triangle (Pyramid inverted)🔻'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Full triangle (Pyramid inverted)🔻$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Loops basics$c$]::text[], 20)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():

    user_choice = input("""Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the program""").lower()

    return user_choice


while True:

     choice = user_input()

     if choice == "n":
         print("You have exited the program")
         break

     elif choice != "y":
         print("Please enter correct choice")

     else:
         height = int(input("what is the height of the triangle? \n"))
         stars = height

         for blanks in range (height):

             blanks = blanks +1 -1
             stars = (height)*2-1
             height -= 1

             print(" " * blanks + "*" * stars + " " * blanks)$c$,
          $c$Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programY
what is the height of the triangle? 
5
*********
 ******* 
  *****  
   ***   
    *    
Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programN
You have exited the program
$c$, true)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():

    user_choice = input("""Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the program""").lower()

    return user_choice

while True:

    choice = user_input()

    if choice == "n":
        print("You have exited the program")
        break

    elif choice != "y":
        print("Please enter correct choice")

    else:

        while True:
            height = int(input("""To form a pyramid.
Input the height of the pyramid as
3 or more. what is the height of
the triangle? \n"""))

            if height >= 3:
                break

            else:
                print("Please enter the correct height value")

        actual_height = int(height/2 + 0.5)
        print(actual_height)
        blanks = actual_height

        for stars in range(actual_height):

            blanks = blanks -1
            stars = (stars+1)*2 -1

            print(" " * blanks + "*" * stars + " " * blanks)

        stars = actual_height-1

        for blanks in range(actual_height-1):

            temp = blanks
            blanks = blanks+1
            stars = stars*2-1

            print(" " * blanks + "*" * stars + " " * blanks)
            stars = temp+1$c$,
          $c$Welcome to triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programY
To form a pyramid.
Input the height of the pyramid as
3 or more. what is the height of
the triangle? 
6
3
  *  
 *** 
*****
 *** 
  *  
$c$, NULL)
  RETURNING id INTO att_id;

  -- [21] 'Hollow Pyramid'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Hollow Pyramid$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Loops basics$c$]::text[], 21)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():

    user_choice = input("""Welcome to hollow triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the program""").lower()

    return user_choice


while True:

     choice = user_input()

     if choice == "n":
         print("You have exited the program")
         break

     elif choice != "y":
         print("Please enter correct choice")
     else:
         height = int(input("what is the height of the triangle? \n"))
         blanks_outer = height
         blanks_inner = 0

         for stars in range (height):

             blanks_inner = stars

             blanks_outer = blanks_outer -1
             stars = (stars+1)*2 -1
             blanks_inner = (blanks_inner)*2-1

             if stars == 1:
                 print(" " * blanks_outer + "*" * 1)
             elif stars == height:
                 print(" " * blanks_outer + "*" * stars)
             elif stars > 0:
                 print(" " * blanks_outer + "*" * 1 + " " * blanks_inner+ "*" * 1 + " " * blanks_outer)$c$,
          $c$Welcome to hollow triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programY
what is the height of the triangle? 
5
    *
   * *   
  *****
 *     * 
*       *
Welcome to hollow triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programN
You have exited the program
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Failed output. Funny one 😂$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

def user_input():

    user_choice = input("""Welcome to hollow triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the program""").lower()

    return user_choice


while True:

     choice = user_input()

     if choice == "n":
         print("You have exited the program")
         break

     elif choice != "y":
         print("Please enter correct choice")
     else:
         height = int(input("what is the height of the triangle? \n"))
         blanks_outer = height
         blanks_inner = 0

         for stars in range (height):

             blanks_inner = stars

             blanks_outer = blanks_outer -1
             stars = (stars+1)*2 -1
             blanks_inner = (blanks_inner)*2-1

             print(" " * blanks_outer + "*" * 1 + " " * blanks_outer+ "*" * 1 + " " * blanks_outer)$c$,
          $c$Welcome to hollow triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the program5
Please enter correct choice
Welcome to hollow triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programY
what is the height of the triangle? 
5
    *    *    
   *   *   
  *  *  
 * * 
**
Welcome to hollow triangle maker program.
Please enter Y to continue making triangles.
Please enter N to exit the programN
You have exited the program
$c$, NULL)
  RETURNING id INTO att_id;

  -- [22] 'Hangman_art'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Hangman_art$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 7: Hangman Game$c$]::text[], 22)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$stages = [r'''
  +---+
  |   |
  O   |
 /|\  |
 / \  |
      |
=========
''', r'''
  +---+
  |   |
  O   |
 /|\  |
 /    |
      |
=========
''', r'''
  +---+
  |   |
  O   |
 /|\  |
      |
      |
=========
''', '''
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========''', '''
  +---+
  |   |
  O   |
  |   |
      |
      |
=========
''', '''
  +---+
  |   |
  O   |
      |
      |
      |
=========
''', '''
  +---+
  |   |
      |
      |
      |
      |
=========
''']

logo = r'''
 _
| |
| |__   __ _ _ __   __ _ _ __ ___   __ _ _ __
| '_ \ / _` | '_ \ / _` | '_ ` _ \ / _` | '_ \
| | | | (_| | | | | (_| | | | | | | (_| | | | |
|_| |_|\__,_|_| |_|\__, |_| |_| |_|\__,_|_| |_|
                    __/ |
                   |___/    '''
$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [23] 'Hangman_word'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Hangman_word$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 7: Hangman Game$c$]::text[], 23)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$word_list = [
    'abruptly',
    'absurd',
    'abyss',
    'affix',
    'askew',
    'avenue',
    'awkward',
    'axiom',
    'azure',
    'bagpipes',
    'bandwagon',
    'banjo',
    'bayou',
    'beekeeper',
    'bikini',
    'blitz',
    'blizzard',
    'boggle',
    'bookworm',
    'boxcar',
    'boxful',
    'buckaroo',
    'buffalo',
    'buffoon',
    'buxom',
    'buzzard',
    'buzzing',
    'buzzwords',
    'caliph',
    'cobweb',
    'cockiness',
    'croquet',
    'crypt',
    'curacao',
    'cycle',
    'daiquiri',
    'dirndl',
    'disavow',
    'dizzying',
    'duplex',
    'dwarves',
    'embezzle',
    'equip',
    'espionage',
    'euouae',
    'exodus',
    'faking',
    'fishhook',
    'fixable',
    'fjord',
    'flapjack',
    'flopping',
    'fluffiness',
    'flyby',
    'foxglove',
    'frazzled',
    'frizzled',
    'fuchsia',
    'funny',
    'gabby',
    'galaxy',
    'galvanize',
    'gazebo',
    'giaour',
    'gizmo',
    'glowworm',
    'glyph',
    'gnarly',
    'gnostic',
    'gossip',
    'grogginess',
    'haiku',
    'haphazard',
    'hyphen',
    'iatrogenic',
    'icebox',
    'injury',
    'ivory',
    'ivy',
    'jackpot',
    'jaundice',
    'jawbreaker',
    'jaywalk',
    'jazziest',
    'jazzy',
    'jelly',
    'jigsaw',
    'jinx',
    'jiujitsu',
    'jockey',
    'jogging',
    'joking',
    'jovial',
    'joyful',
    'juicy',
    'jukebox',
    'jumbo',
    'kayak',
    'kazoo',
    'keyhole',
    'khaki',
    'kilobyte',
    'kiosk',
    'kitsch',
    'kiwifruit',
    'klutz',
    'knapsack',
    'larynx',
    'lengths',
    'lucky',
    'luxury',
    'lymph',
    'marquis',
    'matrix',
    'megahertz',
    'microwave',
    'mnemonic',
    'mystify',
    'naphtha',
    'nightclub',
    'nowadays',
    'numbskull',
    'nymph',
    'onyx',
    'ovary',
    'oxidize',
    'oxygen',
    'pajama',
    'peekaboo',
    'phlegm',
    'pixel',
    'pizazz',
    'pneumonia',
    'polka',
    'pshaw',
    'psyche',
    'puppy',
    'puzzling',
    'quartz',
    'queue',
    'quips',
    'quixotic',
    'quiz',
    'quizzes',
    'quorum',
    'razzmatazz',
    'rhubarb',
    'rhythm',
    'rickshaw',
    'schnapps',
    'scratch',
    'shiv',
    'snazzy',
    'sphinx',
    'spritz',
    'squawk',
    'staff',
    'strength',
    'strengths',
    'stretch',
    'stronghold',
    'stymied',
    'subway',
    'swivel',
    'syndrome',
    'thriftless',
    'thumbscrew',
    'topaz',
    'transcript',
    'transgress',
    'transplant',
    'triphthong',
    'twelfth',
    'twelfths',
    'unknown',
    'unworthy',
    'unzip',
    'uptown',
    'vaporize',
    'vixen',
    'vodka',
    'voodoo',
    'vortex',
    'voyeurism',
    'walkway',
    'waltz',
    'wave',
    'wavy',
    'waxy',
    'wellspring',
    'wheezy',
    'whiskey',
    'whizzing',
    'whomever',
    'wimpy',
    'witchcraft',
    'wizard',
    'woozy',
    'wristwatch',
    'wyvern',
    'xylophone',
    'yachtsman',
    'yippee',
    'yoked',
    'youthful',
    'yummy',
    'zephyr',
    'zigzag',
    'zigzagging',
    'zilch',
    'zipper',
    'zodiac',
    'zombie',
]
$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [24] 'Step 1'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Step 1$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 7: Hangman Game$c$]::text[], 24)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

word_list = ["artwork", "baboon", "camel"]

Count_list = len(word_list)
print(Count_list)

a = random.randint(0,Count_list-1)

print(word_list[a])

Count_word = len(word_list[a])
print(Count_word)

c = random.randint(0,Count_word-1)

word = word_list[a]

print(word[c])

b = input("Please choose any random word: ")

for word in range (Count_word):
    if b == word:
        print(True)$c$,
          $c$3
artwork
7
o
Please choose any random word: 2
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Failed1$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
import random

word_list = ["artwork", "baboon", "camel"]

Count_list = len(word_list)
print(Count_list)



Count_word = len(word_list[a])
print(Count_word)

c = random.randint(0,Count_word-1)

word = word_list[a]

print(word[c])

a = random.randint(0,Count_list-1)
print(word_list[a])

b = input("Please choose any random word: ")
for character in word_list[a]:

    if b == character:
        print(True)
    else:
        print(False)$c$,
          $c$3
7
k
baboon
Please choose any random word: o
False
False
False
True
True
False
$c$, NULL)
  RETURNING id INTO att_id;

  -- [25] 'Step 2'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Step 2$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 7: Hangman Game$c$]::text[], 25)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

import random

word_list = ["artwork", "baboon", "camel"]


c = random.randint(0,len(word_list)-1)


print("-" * len(word_list[c]))

a = random.randint(0,len(word_list[c])-1)
print(word_list[c])

b = input("Please choose any random word: ")

Answer = ""
for character in word_list[c]:

    if b == character:
        Answer += b
    else:
        Answer += "-"


print(Answer)$c$,
          $c$-----
camel
Please choose any random word: c
c----
$c$, NULL)
  RETURNING id INTO att_id;

  -- [26] 'Step 4'  (3 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Step 4$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 7: Hangman Game$c$]::text[], 26)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

import random

word_list = ["artwork", "baboon", "camel"]


c = random.randint(0,len(word_list)-1)


print("-" * len(word_list[c]))

a = random.randint(0,len(word_list[c])-1)
print(word_list[c])

Answer = ""

while True:
    b = input("Please choose any random word: \n")

    if Answer == word_list[c]:
        print("You won!!!")
        break

    elif Answer == "":
        for character in word_list[c]:

            if b == character:
                Answer += b
            else:
                Answer += "-"
    else:
        temp1 = ""
        for character in Answer:

            if character == "-":
                for character in word_list[c]:
                    if character == b:
                        temp1 += b
                    else:
                        temp1 += "-"
            elif character != b:
                temp1 += character
            else:
                temp1 += b
        Answer = temp1

    print(Answer)$c$,
          $c$-------
artwork
a------
a---w------w------w------w------w------w---
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$


import random

word_list = ["artwork", "baboon", "camel"]


c = random.randint(0,len(word_list)-1)


print("-" * len(word_list[c]))

a = random.randint(0,len(word_list[c])-1)
print(word_list[c])

Answer = ""

def process_-:
    for character in word_list[c]:
        if character == b:
            temp1 += b
            return temp1
        else:
            temp1 += "-"
            return temp1

while True:
    b = input("Please choose any random word: \n").lower()

    if Answer == word_list[c]:
        print("You won!!!")
        break

    elif Answer == "":
        for character in word_list[c]:

            if b == character:
                Answer += b
            else:
                Answer += "-"
    else:
        temp1 = ""
        for character in Answer:

            if character == "-":
                process_-(temp1)
            elif character != b:
                temp1 += b
   #         else:
   #             temp1 += b
   #     Answer = temp1

    print(Answer)$c$,
          NULL, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
import random

word_list = ["artwork", "baboon", "camel"]


c = random.randint(0,len(word_list)-1)


print("-" * len(word_list[c]))

a = random.randint(0,len(word_list[c])-1)
print(word_list[c])

Answer = ""

while True:
    b = input("Please choose any random word: \n")

    if Answer == word_list[c]:
        print("You won!!!")
        break

    elif Answer == "":
        for character in word_list[c]:

            if b == character:
                Answer += b
            else:
                Answer += "-"
    else:
        temp1 = ""
#        for character in word_list[c]:
#
#            if b == character:
#                temp1 += b
#            elif b == "-":
#                temp1 += "-"
#            else:
#                for character in Answer:
#                    if b == "-":
#                        temp1 += "-"
#                        break
#                    elif b != "-":
#                        temp1 += b
#                        break
#                    else:
#                        break


        for character1 in Answer:

            if character1 == "-":
                for character2 in word_list[c]:
                    if b == character2:
                        temp1 += b
                    else:
                        temp1 += "-"
            else:
                temp1 += character1
        Answer = temp1

    print(Answer)$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Not successful$c$, false);

  -- [27] '4. Multiple ifs'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$4. Multiple ifs$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 3: Control flow and logical operator$c$]::text[], 27)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$print("Welcome to the rollercoaster!")
height = int(input("What is your height in cm? "))
ticket = 0

if height >= 120:
    print("You can ride the rollercoaster")
    age = int(input("What is your age? "))
    if age <= 12:
        ticket = 5
        print("Please pay $5.")
    elif age <= 18:
        ticket = 7
        print("Please pay $7.")
    else:
        ticket = 12
        print("Please pay $12.")

    want_photo = input("Would you like photo? (Y/N) ")
    if want_photo == "Y" or want_photo == "y":

      ticket += 3

      #print(f"Your updated ticket value is {ticket} + 3") Confused here
      #print(f"Your updated ticket value is {ticket} + {3}") Confused here
      print(f"Your updated ticket value is {ticket}")

    else:
        print(f"Your ticket value is {ticket}")
else:
    print("Sorry you have to grow taller before you can ride.")$c$,
          $c$Welcome to the rollercoaster!
What is your height in cm? 158
You can ride the rollercoaster
What is your age? 33
Please pay $12.
Would you like photo? (Y/N) y
Your updated ticket value is 15
$c$, NULL)
  RETURNING id INTO att_id;

  -- [28] '5. Python Pizza'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$5. Python Pizza$c$, $c$Congratulations, you've got a job at Python Pizza! Your first job is to build an automatic pizza order program.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 3: Control flow and logical operator$c$]::text[], 28)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$print("Welcome to Python Pizza Deliveries!")

Bill =0

user_ip= input("What size pizza do you want? S, M or L: ")
if(user_ip == "S"):
    Bill = 15
    print("Your bill is $15")

elif(user_ip == "M"):
    Bill = 20
    print("Your bill is $20")

elif(user_ip == "L"):
    Bill = 25
    print("Your bill is $25")


    pepperoni = input("Do you want pepperoni on your pizza? Y or N: ")

    if(pepperoni == "Y"):
         Bill += 3
         print(f"Your updated bill is ${Bill}")

    extra_cheese = input("Do you want extra cheese? Y or N: ")

    if(extra_cheese == "Y"):
        Bill += 1
        print(f"Your updated bill is ${Bill}")

else:
    print("Please enter the correct pizza size")$c$,
          $c$Welcome to Python Pizza Deliveries!
What size pizza do you want? S, M or L: M
Your bill is $20
$c$, NULL)
  RETURNING id INTO att_id;

  -- [29] '6. Logical operator'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$6. Logical operator$c$, $c$You can combine different conditions using logical operators.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 3: Control flow and logical operator$c$]::text[], 29)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$print("Welcome to the rollercoaster!")
height = int(input("What is your height in cm? "))
bill = 0

if height >= 120:
    print("You can ride the rollercoaster!")
    age = int(input("What is your age? "))
    if age < 12:
        bill = 5
        print("Child tickets are $5.")
    elif age <= 18:
        bill = 7
        print("Youth tickets are $7.")
    elif 45 <= age <= 55:
        print("Congratulations 🎉. Ticket is free for you!!!.")
    else:
        bill = 12
        print("Adult tickets are $12.")

    wants_photo = input("Do you want a photo taken? Y or N. ")
    if wants_photo == "Y":
        bill += 3

    print(f"Your final bill is ${bill}")

else:
    print("Sorry, you have to grow taller before you can ride.")$c$,
          $c$Welcome to the rollercoaster!
What is your height in cm? 158
You can ride the rollercoaster!
What is your age? 45
Congratulations 🎉. Ticket is free for you!!!.
Do you want a photo taken? Y or N. Y
Your final bill is $3
$c$, NULL)
  RETURNING id INTO att_id;

  -- [30] '1. Random module'  (3 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. Random module$c$, $c$Pseudorandom Number Generators$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 4: Randomization and Python Lists$c$]::text[], 30)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

a = random.random()*10
b = random.uniform(1,10)

print(a)
print(b)$c$,
          $c$4.591954090757673
3.2355255046961418
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$# Heads and tails game

import random

heads = random.randint(0,1)
tails = random.randint(0,1)

count_heads = 0
count_tails = 0

print(heads)
print(tails)

for flip in range (1,11):

    if heads == 1:
        count_heads += 1
    else:
        count_tails += 1

print(count_heads)
print(count_tails)$c$,
          $c$0
1
0
10
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
# Heads and tails game

import random

count_heads = 0
count_tails = 0

print(heads)
print(tails)

for flip in range (1,11):

    heads = random.randint(0,1)
    tails = random.randint(0,1)

    if heads == 1:
        count_heads += 1
    else:
        count_tails += 1

print(count_heads)
print(count_tails)$c$,
          $c$0
0
7
3
$c$, NULL)
  RETURNING id INTO att_id;

  -- [31] '2. Lists'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$2. Lists$c$, $c$You can create a simple collection of ordered items using a Python list. e.g.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 4: Randomization and Python Lists$c$]::text[], 31)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$states_of_america = ["Delaware", "Pennsylvania", "New Jersey", "Georgia", "Connecticut", "Massachusetts", "Maryland", "South Carolina", "New Hampshire", "Virginia", "New York", "North Carolina", "Rhode Island", "Vermont", "Kentucky", "Tennessee", "Ohio", "Louisiana", "Indiana", "Mississippi", "Illinois", "Alabama", "Maine", "Missouri", "Arkansas", "Michigan", "Florida", "Texas", "Iowa", "Wisconsin", "California", "Minnesota", "Oregon", "Kansas", "West Virginia", "Nevada", "Nebraska", "Colorado", "North Dakota", "South Dakota", "Montana", "Washington", "Idaho", "Wyoming", "Utah", "Oklahoma", "New Mexico", "Arizona", "Alaska", "Hawaii"]


print(states_of_america[-5])


fruits = ["Cherry", "Apple", "Pear"]
fruits[0] = "Orange"
fruits.append("Mango")

print(fruits)$c$,
          $c$Oklahoma
['Orange', 'Apple', 'Pear', 'Mango']
$c$, NULL)
  RETURNING id INTO att_id;

  -- [32] '3. Banker Roulette'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$3. Banker Roulette$c$, $c$Figure out how to pick a random name from the list of friends.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 4: Randomization and Python Lists$c$]::text[], 32)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
import random

friends = ["Alice", "Bob", "Charlie", "David", "Emanuel"]

a = random.randint(0,4)

print(friends[a])$c$,
          $c$Charlie
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

friends = ["Alice", "Bob", "Charlie", "David", "Emanuel"]

Count= len(friends)
print(Count)

a = random.randint(0,Count-1)

print(friends[a])$c$,
          $c$5
Charlie
$c$, NULL)
  RETURNING id INTO att_id;

  -- [33] '4. IndexError'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$4. IndexError$c$, $c$Length of List$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 4: Randomization and Python Lists$c$]::text[], 33)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$states_of_america = ["Delaware", "Pennsylvania", "New Jersey", "Georgia", "Connecticut", "Massachusetts", "Maryland",
                     "South Carolina", "New Hampshire", "Virginia", "New York", "North Carolina", "Rhode Island",
                     "Vermont", "Kentucky", "Tennessee", "Ohio", "Louisiana", "Indiana", "Mississippi", "Illinois",
                     "Alabama", "Maine", "Missouri", "Arkansas", "Michigan", "Florida", "Texas", "Iowa", "Wisconsin",
                     "California", "Minnesota", "Oregon", "Kansas", "West Virginia", "Nevada", "Nebraska", "Colorado",
                     "North Dakota", "South Dakota", "Montana", "Washington", "Idaho", "Wyoming", "Utah", "Oklahoma",
                     "New Mexico", "Arizona", "Alaska", "Hawaii"]

print(states_of_america)

$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [34] '5. Rock Paper Scissors'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$5. Rock Paper Scissors$c$, $c$You are going to build a Rock, Paper, Scissors game. You will need to use what you have learnt about randomisation and Lists to achieve this.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 4: Randomization and Python Lists$c$]::text[], 34)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$rock = '''
    _______
---'   ____)
      (_____)
      (_____)
      (____)
---.__(___)
'''

paper = '''
    _______
---'   ____)____
          ______)
          _______)
         _______)
---.__________)
'''

scissors = '''
    _______
---'   ____)____
          ______)
       __________)
      (____)
---.__(___)
'''

print(rock)$c$,
          $c$
    _______
---'   ____)
      (_____)
      (_____)
      (____)
---.__(___)

$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$rock = '''
    _______
---'   ____)
      (_____)
      (_____)
      (____)
---.__(___)
'''

paper = '''
    _______
---'   ____)____
          ______)
          _______)
         _______)
---.__________)
'''

scissors = '''
    _______
---'   ____)____
          ______)
       __________)
      (____)
---.__(___)
'''

sign = [rock, paper, scissors]

import random

def user_input():
    print("Welcome to the Rock Papers and Scissors game. Please choose from the following options.")
    print("1 for Rock,")
    print("2 for Paper and")
    print("3 for Scissors")
    print("4 to quit the game")

    a = int(input("Please enter your choice: "))
    return a


while True:
    a = user_input()
    b = random.randint(1,3)

    if a == 4:
      print("Game over")
      break

    if a == b:
        print(f"Your choice is,")
        print(sign[(a-1)])
        print(f"Computer choice is,")
        print(sign[(b-1)])
        print("It's a tie")

    elif (a == 1 and b == 3) or (a == 2 and b == 1) or (a == 3 and b == 2):
        print(f"Your choice is,")
        print(sign[(a-1)])
        print(f"Computer choice is,")
        print(sign[(b-1)])
        print ("You won!!!")

    elif (a == 1 and b == 2) or (a == 2 and b == 3) or (a == 3 and b == 1):
        print(f"Your choice is,")
        print(sign[(a-1)])
        print(f"Computer choice is,")
        print(sign[(b-1)])
        print("You lost")

    else:
        print("Please enter the correct option")$c$,
          $c$Welcome to the Rock Papers and Scissors game. Please choose from the following options.
1 for Rock,
2 for Paper and
3 for Scissors
4 to quit the game
Please enter your choice: 1
Your choice is,

    _______
---'   ____)
      (_____)
      (_____)
      (____)
---.__(___)

Computer choice is,

    _______
---'   ____)
      (_____)
      (_____)
      (____)
---.__(___)

It's a tie
Welcome to the Rock Papers and Scissors game. Please choose from the following options.
1 for Rock,
2 for Paper and
3 for Scissors
4 to quit the game
Please enter your choice: 2
Your choice is,

    _______
---'   ____)____
          ______)
          _______)
         _______)
---.__________)

Computer choice is,

    _______
---'   ____)
      (_____)
      (_____)
      (____)
---.__(___)

You won!!!
Welcome to the Rock Papers and Scissors game. Please choose from the following options.
1 for Rock,
2 for Paper and
3 for Scissors
4 to quit the game
Please enter your choice: 4
Game over
$c$, NULL)
  RETURNING id INTO att_id;

  -- [35] '1. For loops'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. For loops$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 5: Python loops$c$]::text[], 35)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$fruits = ["Apple", "Peach", "Pear"]

for fruit in fruits:
    print(fruits)
    print(fruits) + "pie"$c$,
          $c$['Apple', 'Peach', 'Pear']
['Apple', 'Peach', 'Pear']
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$fruits = ["Apple", "Peach", "Pear"]

for fruit in fruits:
    print(fruit)
    print(fruit + " pie")$c$,
          $c$Apple
Apple pie
Peach
Peach pie
Pear
Pear pie
$c$, NULL)
  RETURNING id INTO att_id;

  -- [36] '2. Highest score'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$2. Highest score$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 5: Python loops$c$]::text[], 36)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$student_scores = [150, 142, 185, 120, 171, 184, 149, 24, 59, 68, 199, 78, 65, 89, 86, 55, 91, 64, 89]

Total_sum_scores = sum(student_scores)
print(Total_sum_scores)


for score in student_scores:
    score_count = 0
    score_count += int(print(score))

print(score_count)$c$,
          $c$2068
150
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
student_scores = [150, 142, 185, 120, 171, 184, 149, 24, 59, 68, 199, 78, 65, 89, 86, 55, 91, 64, 89]

Total_sum_scores = sum(student_scores)
print(Total_sum_scores)

Max_score = max(student_scores)
print(Max_score)

Total_score = 0

for score in student_scores:

    Total_score += score

print(Total_score)


Max = 0

for score in student_scores:
    if Max < score:
        Max = score

print(Max)$c$,
          $c$2068
199
2068
199
$c$, NULL)
  RETURNING id INTO att_id;

  -- [37] '3. For loops with Random'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$3. For loops with Random$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 5: Python loops$c$]::text[], 37)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$Sum = 0

for i in range (1,100):

    if i <=100:
      Sum += i

print(Sum)$c$,
          $c$4950
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
Sum = 0

for i in range (1,101):
      Sum += i

print(Sum)$c$,
          $c$5050
$c$, NULL)
  RETURNING id INTO att_id;

  -- [38] '4. Password generator'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$4. Password generator$c$, $c$Simple$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 5: Python loops$c$]::text[], 38)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
import random

letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
symbols = ['!', '#', '$', '%', '&', '(', ')', '*', '+']



print("Welcome to the PyPassword Generator!")
nr_letters = int(input("How many letters would you like in your password?\n"))
nr_symbols = int(input(f"How many symbols would you like?\n"))
nr_numbers = int(input(f"How many numbers would you like?\n"))

Count_letters = len(letters)
Count_numbers = len(numbers)
Count_symbols = len(symbols)

print(Count_letters)
print(Count_numbers)
print(Count_symbols)

print(letters[1])

for letter in letters(1,Count_letters):
    a = random.randint(1,Count_letters)
    print(letter)
#    print(letters[a])
#    Lettter_pw = letters(a)
#    print(Letter_pw)

#for number in numbers(Count_letters,nrletters+nrsymbols):
#    b = random.randint(1,Count_numbers)
#    Lettter_nu = numbers(b)
#    print(Letter_nu)

#for symbol in symbols(nrletters+nrsymbols,nrletters+nrsymbols+nrnumbers):
#    c = random.randint(1,Count_symbols)
#    Lettter_sy = symbols(c)
#    print(Letter_sy)$c$,
          $c$Welcome to the PyPassword Generator!
How many letters would you like in your password?
8
How many symbols would you like?
2
How many numbers would you like?
1
52
10
9
b
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, false);

  -- [39] '2. Positional vs Keyword Arguments'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$2. Positional vs Keyword Arguments$c$, $c$Multiple Inputs$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 8: Function Parameters & Caesar Cipher$c$]::text[], 39)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$# Functions with multiple input

def greet(name, greeting):
    print(f"{greeting} {name}")

greet("Aniket", "Yo!")

#-----------------------------------------------------

# Functions with 2 inputs

def greet_with(name, location):
  print(f"Hello {name}")
  print(f"What is it like in {location}")


greet_with("Aniket", "Japan")
$c$,
          $c$Yo! Aniket
Hello Aniket
What is it like in Japan
$c$, NULL)
  RETURNING id INTO att_id;

  -- [40] '3. Caesar Cipher 1'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$3. Caesar Cipher 1$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 8: Function Parameters & Caesar Cipher$c$]::text[], 40)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random
alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

#direction = input("Type 'encode' to encrypt, type 'decode' to decrypt:\n").lower()
#text = input("Type your message:\n").lower()
#shift = int(input("Type the shift number:\n"))


# TODO-1: Create a function called 'encrypt()' that takes 'original_text' and 'shift_amount' as 2 inputs.
def encrypt(original_text,shift_amount):
  New_text = chr(ord(original_text)+shift_amount)
  print(f"The output is: {New_text}")

Letter_input = input("Please enter any random letter: ")
Shift = input("Please enter the shift for this letter: ")
encrypt(Letter_input,Shift)


# TODO-2: Inside the 'encrypt()' function, shift each letter of the 'original_text' forwards in the alphabet
#  by the shift amount and print the encrypted text.

# TODO-4: What happens if you try to shift z forwards by 9? Can you fix the code?

# TODO-3: Call the 'encrypt()' function and pass in the user inputs. You should be able to test the code and encrypt a
#  message.$c$,
          $c$Please enter any random letter: a
Please enter the shift for this letter: 2
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Character change Failed$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random
alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

#direction = input("Type 'encode' to encrypt, type 'decode' to decrypt:\n").lower()
#text = input("Type your message:\n").lower()
#shift = int(input("Type the shift number:\n"))


#-----------------Character shift--------------------------

# TODO-1: Create a function called 'encrypt()' that takes 'original_text' and 'shift_amount' as 2 inputs.
# def encrypt(original_text,shift_amount):
#     New_text = chr(int(ord(original_text)) + shift_amount)
#     print(f"The output is: {New_text}")

# Letter_input = input("Please enter any random letter: ")
# Shift = int(input("Please enter the shift for this letter: "))
# encrypt(Letter_input,Shift)


#-----------------text shift-------------------------


def encrypt(original_text,shift_amount):
    Cipher_text = ""
    for character in original_text:
        index_new = alphabet.index(character) + shift_amount

        if index_new <= len(alphabet):
            index_new = alphabet.index(character) + shift_amount
        else:
            index_new = (alphabet.index(character) + shift_amount) % len(alphabet)
        character_new = alphabet[index_new]
        Cipher_text += character_new
    print(f"The output is: {Cipher_text}")

Letter_input = input("Please enter any random text: ").lower()
Shift = int(input("Please enter the shift for this letter: "))
encrypt(Letter_input,Shift)

# TODO-2: Inside the 'encrypt()' function, shift each letter of the 'original_text' forwards in the alphabet
#  by the shift amount and print the encrypted text.

# TODO-4: What happens if you try to shift z forwards by 9? Can you fix the code?


# TODO-3: Call the 'encrypt()' function and pass in the user inputs. You should be able to test the code and encrypt a
#  message.$c$,
          $c$Please enter any random text: Aniketz
Please enter the shift for this letter: 3
The output is: dqlnhwc
$c$, true)
  RETURNING id INTO att_id;

  -- [41] '4. Caesar Cipher 2'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$4. Caesar Cipher 2$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 8: Function Parameters & Caesar Cipher$c$]::text[], 41)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

direction = input("Type 'encode' to encrypt, type 'decode' to decrypt:\n").lower()
text = input("Type your message:\n").lower()
shift = int(input("Type the shift number:\n"))

# TODO-1: Create a function called 'decrypt()' that takes 'original_text' and 'shift_amount' as inputs.

#-----------------Given by teacher--------------------------


if direction == "encode":
    encrypt(original_text=text, shift_amount=shift)
elif direction == "decode":
    decrypt(original_text=text, shift_amount=shift)
else:
    print("Please enter correct input")

def encrypt(text,shift):
    Cipher_text = ""

    for character in text:
        index_new = alphabet.index(character) + shift

        if index_new > len(alphabet):
            index_new = (alphabet.index(character) + shift) % len(alphabet)
        character_new = alphabet[index_new]
        Cipher_text += character_new
    print(f"The output is: {Cipher_text}")


# TODO-2: Inside the 'decrypt()' function, shift each letter of the 'original_text' *backwards* in the alphabet
#  by the shift amount and print the decrypted text.


def decrypt(text,shift):

    Mesaage_text = ""
    for character in text:
        index_new = alphabet.index(character) - shift

        if index_new <= 0:
            index_new = len(alphabet) - index_new

        character_new = alphabet[index_new]
        Mesaage_text += character_new
    print(f"The output is: {Mesaage_text}")
# TODO-3: Combine the 'encrypt()' and 'decrypt()' functions into one function called 'caesar()'.


#  Use the value of the user chosen 'direction' variable to determine which functionality to use.$c$,
          $c$Type 'encode' to encrypt, type 'decode' to decrypt:
decode
Type your message:
Aniketz
Type the shift number:
2
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

# TODO-1: Create a function called 'decrypt()' that takes 'original_text' and 'shift_amount' as inputs.

#-----------------Given by teacher--------------------------

def encrypt(original_text,shift_amount):
    Cipher_text = ""

    for character in text:
        index_new = alphabet.index(character) + shift

        if index_new > len(alphabet):
            index_new = (alphabet.index(character) + shift) % len(alphabet)
        character_new = alphabet[index_new]

        Cipher_text += character_new
    print(f"The output is: {Cipher_text}")


# TODO-2: Inside the 'decrypt()' function, shift each letter of the 'original_text' *backwards* in the alphabet
#  by the shift amount and print the decrypted text.


def decrypt(original_text,shift_amount):

    Mesaage_text = ""
    for character in text:
        index_new = alphabet.index(character) - shift

        if index_new <= 0:
            index_new = len(alphabet) + index_new

        character_new = alphabet[index_new]
        Mesaage_text += character_new
    print(f"The output is: {Mesaage_text}")

# TODO-3: Combine the 'encrypt()' and 'decrypt()' functions into one function called 'caesar()'.


#  Use the value of the user chosen 'direction' variable to determine which functionality to use.

direction = int(input("Type '1' to encrypt, type '2' to decrypt:\n"))
text = input("Type your message:\n").lower()
shift = int(input("Type the shift number:\n"))


if direction == 1:
    encrypt(original_text=text, shift_amount=shift)
elif direction == 2:
    decrypt(original_text=text, shift_amount=shift)
else:
    print("Please enter correct input")$c$,
          $c$Type '1' to encrypt, type '2' to decrypt:
2
Type your message:
Aniketz
Type the shift number:
2
The output is: ylgicrx
$c$, NULL)
  RETURNING id INTO att_id;

  -- [42] '5. Caesar Cipher 3'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$5. Caesar Cipher 3$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 8: Function Parameters & Caesar Cipher$c$]::text[], 42)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$# TODO-1: Import and print the logo from art.py when the program starts.


alphabet = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z']

# TODO-2: What happens if the user enters a number/symbol/space?


def caesar(original_text, shift_amount, encode_or_decode):
    output_text = ""

    for letter in original_text:
        if encode_or_decode == "decode":
            shift_amount *= -1

        if letter in alphabet:
            shifted_position = alphabet.index(letter) + shift_amount
            shifted_position %= len(alphabet)
            output_text += alphabet[shifted_position]

        else:
            output_text += letter

    print(f"{encode_or_decode}d result: {output_text}")


# TODO-3: Can you figure out a way to restart the cipher program?


direction = int(input("""Type 1 to encrypt,
type 2 to decrypt:\n"""))

if direction == 1:
    direction = "encode"
elif direction == 2:
    direction = "dencode"
else:
    print("Please enter correct value")

text = input("Type your message:\n").lower()
shift = int(input("Type the shift number:\n"))

caesar(original_text=text, shift_amount=shift, encode_or_decode=direction)$c$,
          $c$Type 1 to encrypt,
type 2 to decrypt:
1
Type your message:
Aniket
Type the shift number:
3
encoded result: dqlnhw
$c$, NULL)
  RETURNING id INTO att_id;

  -- [43] '1. Functions with inputs'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. Functions with inputs$c$, $c$Previously, we've seen that functions allow us to package code into a named block which can be used repeatedly at a later point.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 9: Dictionaries, nesting and scret auction$c$]::text[], 43)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def greet():

    print("Hello Aniket!")
    print("Hello again Aniket!")
    print("I like typing this!")


def greet_with_name(name):

    print(f"Hello {name}!")
    print(f"Hello again {name}!")
    print("I like typing this!")


greet()

a = input("What is your name? ")
greet_with_name(a)$c$,
          $c$Hello Aniket!
Hello again Aniket!
I like typing this!
What is your name? Aniket
Hello Aniket!
Hello again Aniket!
I like typing this!
$c$, NULL)
  RETURNING id INTO att_id;

  -- [44] '2. Nested Lists and Dictionaries'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$2. Nested Lists and Dictionaries$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 9: Dictionaries, nesting and scret auction$c$]::text[], 44)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

#Practice 1: failed

#travel_log = {
#    "France": ["Paris", "Lille", "Dijon"],
#    "Germany": ["Stuttgart", "Berlin"],
#}

#print(travel_log(France[1]))


#Practice 2: Passed

nested_list = ["A", "B", ["C", "D"]]

print(nested_list[2][1])


#practice 3: passed

travel_log_new = {
  "France": {
    "cities_visited": ["Paris", "Lille", "Dijon"],
    "total_visits": 12
   },
  "Germany": {
    "cities_visited": ["Berlin", "Hamburg", "Stuttgart"],
    "total_visits": 5
   },
}

print(travel_log_new["Germany"]["cities_visited"][2])$c$,
          $c$D
Stuttgart
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

#Practice 1: assistance
travel_log = {
    "France": ["Paris", "Lille", "Dijon"],
    "Germany": ["Stuttgart", "Berlin"],
}

print(travel_log["France"][1])



#Practice 2: Passed

nested_list = ["A", "B", ["C", "D"]]

print(nested_list[2][1])


#practice 3: passed
travel_log_new = {
  "France": {
    "cities_visited": ["Paris", "Lille", "Dijon"],
    "total_visits": 12
   },
  "Germany": {
    "cities_visited": ["Berlin", "Hamburg", "Stuttgart"],
    "total_visits": 5
   },
}

print(travel_log_new["Germany"]["cities_visited"][2])$c$,
          $c$Lille
D
$c$, NULL)
  RETURNING id INTO att_id;

  -- [45] '3. Blind Auction Project'  (6 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$3. Blind Auction Project$c$, $c$The goal is to build a blind auction program.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 9: Dictionaries, nesting and scret auction$c$]::text[], 45)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$# TODO-1: Ask the user for input

def user_input():
    Bidder_name = input("What is your name? /n")
    Bid = int(input("What is your bud amount? /n"))
    New_bidder = input("Is there any new bidder? Yes/No: /n").lower

    return Bidder_name, Bid, New_bidder

# TODO-2: Save data into dictionary {name: price}

price ={}

while True:
    if user_input().New_bidder == "no":
        print("Bidding complete!!!")
        break

    print("Still here")
    break


# TODO-3: Whether if new bids need to be added
# TODO-4: Compare bids in dictionary$c$,
          $c$What is your name? /nAniket
What is your bud amount? /n100
Is there any new bidder? Yes/No: /nNo
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
# TODO-1: Ask the user for input

def user_input():
    Bidder_name = input("What is your name? \n")
    Bid = int(input("What is your bud amount? \n"))

    while True:

        New_bidder = input("Is there any new bidder? Yes/No: \n").lower()

        if New_bidder == "yes":
            print("\n" *100)
            break
        elif New_bidder == "no":
            break

        print("Please enter correct choice")

    return Bidder_name, Bid, New_bidder

# TODO-2: Save data into dictionary {name: price}

price ={}

while True:
    Bidder_name, Bid, New_bidder = user_input()

    if New_bidder == "no":
        print("Bidding complete!!!")

        print(price)

        print("The winner is, ")
        break

    price[Bidder_name] = Bid

# TODO-3: Whether if new bids need to be added
# TODO-4: Compare bids in dictionary$c$,
          $c$What is your name? 
Aniket
What is your bud amount? 
150
Is there any new bidder? Yes/No: 
Yes





































































































What is your name? 
Vinit
What is your bud amount? 
1000
Is there any new bidder? Yes/No: 
No
Bidding complete!!!
{'Aniket': 150}
The winner is, 
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
# TODO-1: Ask the user for input

def user_input():
    Bidder_name = input("What is your name? \n")
    Bid = int(input("What is your bud amount? \n"))

    while True:

        New_bidder = input("Is there any new bidder? Yes/No: \n").lower()

        if New_bidder == "yes":
            print("\n" *100)
            break
        elif New_bidder == "no":
            break

        print("Please enter correct choice")

    return Bidder_name, Bid, New_bidder

# TODO-2: Save data into dictionary {name: price}

price ={}

while True:
    Bidder_name, Bid, New_bidder = user_input()

    if New_bidder == "no":
        print("Bidding complete!!!")

        print(price)

        print("The winner is, ")
        break

    price[Bidder_name] = Bid

# TODO-3: Whether if new bids need to be added
# TODO-4: Compare bids in dictionary$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$last input issue$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

# TODO-1: Ask the user for input

def user_input():
    Bidder_name = input("What is your name? \n")
    Bid = int(input("What is your bid amount? \n"))

    while True:

        New_bidder = input("Is there any new bidder? Yes/No: \n").lower()

        if New_bidder == "yes":
            print("\n" *100)
            break
        elif New_bidder == "no":
            break

        print("Please enter correct choice")

    return Bidder_name, Bid, New_bidder

# TODO-2: Save data into dictionary {name: price}

price ={}

while True:
    Bidder_name, Bid, New_bidder = user_input()

    if New_bidder == "yes":
        price[Bidder_name] = Bid

    elif New_bidder == "no":
        print("Bidding complete!!!")

        print(price)

        print("The winner is, ")
        break

# TODO-3: Whether if new bids need to be added
# TODO-4: Compare bids in dictionary$c$,
          $c$What is your name? 
Aniket
What is your bid amount? 
100
Is there any new bidder? Yes/No: 
Yes





































































































What is your name? 
Vinit
What is your bid amount? 
200
Is there any new bidder? Yes/No: 
N
Please enter correct choice
Is there any new bidder? Yes/No: 
No
Bidding complete!!!
{'Aniket': 100}
The winner is, 
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

# TODO-1: Ask the user for input

def user_input():
    Bidder_name = input("What is your name? \n")
    Bid = input("What is your bid amount? \n")
    New_bidder = input("Is there any new bidder? Yes/No: \n").lower()

    return Bidder_name, Bid, New_bidder

# TODO-2: Save data into dictionary {name: price}

price ={}

while True:
    Bidder_name, Bid, New_bidder = user_input()

    if Bidder_name.isalpha() != True or Bid.isdigit() != True or New_bidder != "yes" or New_bidder != "no":
        print("Please enter correct choice")

    price[Bidder_name] = int(Bid)

    if New_bidder == "no":
        print("Bidding complete!!!")

        print(price)
        print(max(Bid))

        print("The winner is, ")
        break

    elif New_bidder == "yes":
        print("\n" *100)



# TODO-3: Whether if new bids need to be added
# TODO-4: Compare bids in dictionary$c$,
          $c$What is your name? 
Anikey
What is your bid amount? 
200
Is there any new bidder? Yes/No: 
Yes
Please enter correct choice





































































































What is your name? 
Vinit 
What is your bid amount? 
300
Is there any new bidder? Yes/No: 
No
Please enter correct choice
Bidding complete!!!
{'Anikey': 200, 'Vinit ': 300}
3
The winner is, 
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$can't apply exception handling. Maybe bcz the user input is in function and. Exception handling is not there.$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def user_input():
    Bidder_name = input("What is your name? \n")
    Bid = input("What is your bid amount? \n")
    New_bidder = input("Is there any new bidder? Yes/No: \n").lower()
    return Bidder_name, Bid, New_bidder

price = {}

while True:
    Bidder_name, Bid, New_bidder = user_input()

    if not Bidder_name.isalpha() or not Bid.isdigit() or New_bidder not in ["yes", "no"]:
        print("Please enter correct choice")
        continue

    price[Bidder_name] = int(Bid)

    if New_bidder == "no":
        print("Bidding complete!!!")
        print(price)

        winner = max(price, key=price.get)
        print(f"The winner is {winner} with a bid of {price[winner]}")
        break

    elif New_bidder == "yes":
        print("\n" * 100)$c$,
          $c$What is your name? 
Anikey
What is your bid amount? 
200
Is there any new bidder? Yes/No: 
Yes





































































































What is your name? 
Vinut
What is your bid amount? 
300
Is there any new bidder? Yes/No: 
No
Bidding complete!!!
{'Anikey': 200, 'Vinut': 300}
The winner is Vinut with a bid of 300
$c$, NULL)
  RETURNING id INTO att_id;

  -- [46] 'Where to assign'  (3 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Where to assign$c$, $c$Complex$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 9: Dictionaries, nesting and scret auction$c$]::text[], 46)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
symbols = ['!', '#', '$', '%', '&', '(', ')', '*', '+']



print("Welcome to the PyPassword Generator!")
#nr_letters = int(input("How many letters would you like in your password?\n"))
#nr_symbols = int(input(f"How many symbols would you like?\n"))
#nr_numbers = int(input(f"How many numbers would you like?\n"))

nr_letters = 2
nr_symbols = 2
nr_numbers = 2


Count_letters = len(letters)
Count_numbers = len(numbers)
Count_symbols = len(symbols)

print(Count_letters)
print(Count_numbers)
print(Count_symbols)

print(letters[1])


Letter_pw=""
for _ in range(nr_letters):

    a = random.randint(0,Count_letters-1)
    print(a)
    print(letters[a])
    Letter_pw.append(letters[a])

print(Letter_pw)

#for number in numbers(Count_letters,nrletters+nrsymbols):
#    b = random.randint(1,Count_numbers)
#    Lettter_nu = numbers(b)
#    print(Letter_nu)

#for symbol in symbols(nrletters+nrsymbols,nrletters+nrsymbols+nrnumbers):
#    c = random.randint(1,Count_symbols)
#    Lettter_sy = symbols(c)
#    print(Letter_sy)$c$,
          $c$Welcome to the PyPassword Generator!
52
10
9
b
44
S
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
import random

letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
symbols = ['!', '#', '$', '%', '&', '(', ')', '*', '+']



print("Welcome to the PyPassword Generator!")
nr_letters = int(input("How many letters would you like in your password?\n"))
nr_symbols = int(input(f"How many symbols would you like?\n"))
nr_numbers = int(input(f"How many numbers would you like?\n"))

Count_letters = len(letters)
Count_numbers = len(numbers)
Count_symbols = len(symbols)

print(Count_letters)
print(Count_numbers)
print(Count_symbols)

Letter_pw=""

for Letter in range(nr_letters):

    a = random.randint(0,Count_letters-1)
    Letter_pw += letters[a]

print(Letter_pw)


for symbol in range(nr_symbols):
    b = random.randint(0,Count_symbols-1)
    Letter_pw += symbols[b]
print(Letter_pw)


for number in range(nr_numbers):
    c = random.randint(0,Count_numbers-1)
    Letter_pw += numbers[c]

print(Letter_pw)$c$,
          $c$Welcome to the PyPassword Generator!
How many letters would you like in your password?
3
How many symbols would you like?
3
How many numbers would you like?
3
52
10
9
aME
aME!(*
aME!(*218
$c$, true)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$

import random

letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
numbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
symbols = ['!', '#', '$', '%', '&', '(', ')', '*', '+']



print("Welcome to the PyPassword Generator!")
#nr_letters = int(input("How many letters would you like in your password?\n"))
#nr_symbols = int(input(f"How many symbols would you like?\n"))
#nr_numbers = int(input(f"How many numbers would you like?\n"))
Password= int(input(f"How many characters password would you like to form?"))

Count_letters = len(letters)
Count_numbers = len(numbers)
Count_symbols = len(symbols)

print(Count_letters)
print(Count_numbers)
print(Count_symbols)

Letter_pw=""


for Letter in range(Password):
    z = random.randint(1,3)

    if z == 1:
        a = random.randint(0,Count_letters-1)
        Letter_pw += letters[a]

    elif z == 2:
        b = random.randint(0,Count_symbols-1)
        Letter_pw += symbols[b]

    else:
        c = random.randint(0,Count_numbers-1)
        Letter_pw += numbers[c]

print(Letter_pw)$c$,
          $c$Welcome to the PyPassword Generator!
How many characters password would you like to form?8
52
10
9
$+V87*3i
$c$, NULL)
  RETURNING id INTO att_id;

  -- [47] '1. Dictionaries'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. Dictionaries$c$, $c$A dictionary in Python functions similarly to a dictionary in real life. It's a data structure that allows us to associate a key to a value and pair the two pieces of data together.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 9: Dictionaries, nesting and scret auction$c$]::text[], 47)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$programming_dictionary = {"Bug": "An error in a program that prevents the program from running as expected.", "Function": "A piece of code that you can easily call over and over again."}


$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [48] '1. Functions with outputs'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. Functions with outputs$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 10: Functions with Outputs$c$]::text[], 48)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def format_name(f_name,l_name):
    print(f"Your name is {f_name} {l_name})


First_name = input("What is your first name?")
Last_name = input("What is your last name?")

format_name(First_name,Last_name)$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Failed$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def format_name(f_name,l_name):
    print(f"Your name is {f_name} {l_name}")


First_name = input("What is your first name?").title()
Last_name = input("What is your last name?").title()

#for smaller code like current one
format_name(First_name,Last_name)

#format_name(First_name=f_name,Last_name=l_name)

#Recommended to use for larger code
format_name(f_name=First_name,l_name=Last_name)$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [49] '2. Multiple return values'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$2. Multiple return values$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 10: Functions with Outputs$c$]::text[], 49)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$def format_name(f_name, l_name):
    formated_f_name = f_name.title()
    formated_l_name = l_name.title()
    return f"{formated_f_name} {formated_l_name}"


print(format_name("AnGEla", "YU"))$c$,
          NULL, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$def canBuyAlcohol(age):
    if age >= 18:
        return True
    else:
        return False

def canBuyAlcohol(age):
    # If the data type of the age input is not a int, then exit.
    if type(age) != int:
        return

    if age >= 18:
        return True
    else:
        return False$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [50] '**Leap year**'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$**Leap year**$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 10: Functions with Outputs$c$]::text[], 50)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$def is_leap_year(year):
    # Write your code here.
    # Don't change the function name.

    if year % 100 == 0 or year % 4 != 0 and year % 400 != 0:
        print(f"{year} is not a leap year")
    else:
        print(f"{year} a leap year")


year = int(input("please enter a random year: "))
is_leap_year(year)$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [51] '3. Docstrings'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$3. Docstrings$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 10: Functions with Outputs$c$]::text[], 51)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$"""
This is the
documentation of Docstring
"""

def format_name(f_name, l_name):
    """This function formats the name to title case"""
    formated_f_name = f_name.title()
    formated_l_name = l_name.title()
    return f"{formated_f_name} {formated_l_name}"


formatted_name = format_name("AnGeLa", "YU")

length = len(formatted_name)
$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [52] '4. Calculator project'  (3 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$4. Calculator project$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 10: Functions with Outputs$c$]::text[], 52)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$def add(n1, n2):
    return n1 + n2

def subtract(n1, n2):
    return n1 - n2

def multiply(n1, n2):
    return n1 * n2

def devide(n1, n2):
    return n1 / n2

while True:
    print("Welcome to Calculator program")

    while True:
        Number1 = int(input ("What's the first number? "))

        result = 0
        while True:

            result = Number1

            Operation = input("""
            +
            -
            *
            /
            Pick an operation: """)

            print(type(Operation))
            if Operation!= "+" or Operation!= "-" or Operation!= "*" or Operation!= "/":
                print("please enter correct choice")

            else:
                break

        Number2 = int(input("What's the second number? "))

        if Operation == "+":
            add(result, Number2)

        elif Operation == "-":
            subtract(result, Number2)

        elif Operation == "*":
            multiply(result, Number2)

        elif Operation == "/":
            devide(result, Number2)

        else:
            break

        print(f"The result is {result}")

        User_input = print("Please enter Y to continue current calculation or N to start new calculation")

        if User_input == "n":
            break$c$,
          NULL, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Small issue$c$, true);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$        while True:

            result = Number1

            Operation = input("""
            +
            -
            *
            /
            Pick an operation: """)

            print(type(Operation))
            if Operation!= "+" or Operation!= "-" or Operation!= "*" or Operation!= "/":
                print("please enter correct choice")

            else:
                break$c$,
          NULL, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
def add(n1, n2):
    return n1 + n2

def subtract(n1, n2):
    return n1 - n2

def multiply(n1, n2):
    return n1 * n2

def devide(n1, n2):
    return n1 / n2

while True:
    print("Welcome to Calculator program")
    User_input = ""

    while True:

        if User_input == "n" or User_input == "":
            Number1 = int(input ("What's the first number? "))
            result = 0
        while True:
            if result == 0:
                result = Number1
            else:
                Number1 = result
            print(result)

            Operation = input("""
            +
            -
            *
            /
            Pick an operation: \n""")

            if Operation == "+" or Operation == "-" or Operation == "*" or Operation == "/":
                break
            else:
                print("please enter correct choice")

        Number2 = int(input("What's the second number? "))

        if Operation == "+":
            result = add(result, Number2)
            print(result)

        elif Operation == "-":
            result = subtract(result, Number2)

        elif Operation == "*":
            result = multiply(result, Number2)

        elif Operation == "/":
            result = devide(result, Number2)

        else:
            break
        print(result)
        print(f"The result is {result}")

        User_input = input("Please enter Y to continue current calculation or N to start new calculation").lower()

        if User_input == "n":
            print("\n"*100)
            print(f"The result is, {result}")
            break$c$,
          $c$Welcome to Calculator program
What's the first number? 12
12

            +
            -
            *
            /
            Pick an operation: 
+
What's the second number? 5
17
17
The result is 17
Please enter Y to continue current calculation or N to start new calculationN





































































































The result is, 17
Welcome to Calculator program
$c$, true)
  RETURNING id INTO att_id;

  -- [53] '1. Namespaces and scope'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. Namespaces and scope$c$, $c$Local Scope$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 12: Scope and the Number Guessing Game$c$]::text[], 53)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$enemies = 1


def increase_enemies():
    enemies = 2
    print(f"enemies inside function: {enemies}")


increase_enemies()
print(f"enemies outside function: {enemies}")$c$,
          $c$enemies inside function: 2
enemies outside function: 1
$c$, NULL)
  RETURNING id INTO att_id;

  -- [54] '2. Block scope'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$2. Block scope$c$, $c$Python is a bit different from other programming languages in that it does not have block scope.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 12: Scope and the Number Guessing Game$c$]::text[], 54)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$enemies = 1


def increase_enemies():
    enemies = 2
    print(f"enemies inside function: {enemies}")


increase_enemies()
print(f"enemies outside function: {enemies}")$c$,
          $c$enemies inside function: 2
enemies outside function: 1
$c$, NULL)
  RETURNING id INTO att_id;

  -- [55] '3. Globle vars'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$3. Globle vars$c$, $c$You can force the code allow you to modify something with global if you use the global keyword before you use it.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 12: Scope and the Number Guessing Game$c$]::text[], 55)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
a = 1
def my_function():
    a += 1
    print(a)

#But this will work

a = 1
def my_function():
    global a
    a += 1
    print(a)

print(a)

my_function()$c$,
          $c$1
2
$c$, NULL)
  RETURNING id INTO att_id;

  -- [56] '5. Number guessing project'  (6 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$5. Number guessing project$c$, $c$The goal is to build a guess the number game.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 12: Scope and the Number Guessing Game$c$]::text[], 56)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

def user_input():

    difficulty_level = int(input("""Please choose the difficulty level,
1. Easy
2. Hard"""))

def random_value_processor():

    random_number = random.randint(1,100)

    return random_number


while True:

    start_game = input("Please enter Y to start the game. N to end it."). lower()

    if start_game == "n":
        break
    elif start_game != "y":
        print("Please enter correct choice")

    Attempts = 0

    while True:

        difficulty = user_input()

        random = random_value_processor()

        print(difficulty)

        if difficulty == 1:
            Attempts = 10
        else:
            Attempts = 5

        print(Attempts)

        for Attempt in range(Attempts):

            user_guess = int(input("Please guess the number /n"))
            if user_guess < random_number:
                print("Number is too low")
            elif user_guess > random_number:
                print("Number is too high")
            else:
                print("Your guess is correct")
    break$c$,
          $c$Please enter Y to start the game. N to end it.N
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$User guess is failing$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

def user_input():

    difficulty_level = int(input("""Please choose the difficulty level,
1. Easy
2. Hard"""))

    return difficulty_level


def random_value_processor():

    random_number = random.randint(1,100)

    return random_number


while True:

    start_game = input("Please enter Y to start the game. N to end it."). lower()

    if start_game == "n":
        break
    elif start_game != "y":
        print("Please enter correct choice")

    Attempts = 0

    while True:

        difficulty = user_input()
        random_number = random_value_processor()

        print(difficulty)
        print(random_number)

        if difficulty == 1:
            Attempts += 10
        else:
            Attempts += 5

        print(f"attempts are {Attempts}")

        for Attempt in range(Attempts):

            user_guess = int(input("Please guess the number\n"))

            if random_number-user_guess <= 3:
                print("Number is slightly low")
            elif user_guess-random_number <= 3:
                print("Number is slightly high")
            elif user_guess < random_number:
                print("Number is too low")
            elif user_guess > random_number:
                print("Number is too high")
            else:
                print("Your guess is correct")

            print(random_number-user_guess)

            Attempts -= 1
            print(f"{Attempts} attempts left")

            if Attempts == 0:
                break

        print(f"The answer was {random_number}")
        break
    break$c$,
          $c$Please enter Y to start the game. N to end it.Y
Please choose the difficulty level,
1. Easy
2. Hard2
2
63
attempts are 5
Please guess the number
30
Number is slightly high
33
4 attempts left
Please guess the number
50
Number is slightly high
13
3 attempts left
Please guess the number
60
Number is slightly low
3
2 attempts left
Please guess the number
63
Number is slightly low
0
1 attempts left
Please guess the number
50
Number is slightly high
13
0 attempts left
The answer was 63
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Some looping issue. Keeping for record.$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

def user_input():

    difficulty_level = int(input("""Please choose the difficulty level,
1. Easy
2. Hard\n"""))

    return difficulty_level


def random_value_processor():

    random_number = random.randint(1,100)

    return random_number


while True:

    start_game = input("Please enter Y to start the game. N to end it.\n"). lower()

    if start_game == "n":
        break
    elif start_game != "y":
        print("Please enter correct choice\n")

    Attempts = 0

    while True:

        difficulty = user_input()
        random_number = random_value_processor()

        print(difficulty)
        print(random_number)

        if difficulty == 1:
            Attempts += 10
        else:
            Attempts += 5

        print(f"attempts are {Attempts}")

        for Attempt in range(Attempts):

            while True:

                user_guess = int(input("Please guess the number \n"))

                if user_guess.isdigit() == True:
                    break
                else:
                    print("Please enter the number value")

            if random_number-user_guess <= 3:
                print("Number is slightly low")
            elif user_guess-random_number <= 3:
                print("Number is slightly high")
            elif user_guess < random_number:
                print("Number is too low")
            elif user_guess > random_number:
                print("Number is too high")
            else:
                print("Your guess is correct")

            print(random_number-user_guess)

            Attempts -= 1
            print(f"{Attempts} attempts left")

            if Attempts == 0:
                break

        print(f"The answer was {random_number}")
        break
    break$c$,
          $c$Please enter Y to start the game. N to end it.
Y
Please choose the difficulty level,
1. Easy
2. Hard
2
2
20
attempts are 5
Please guess the number 
40
$c$, false)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_mistakes (user_id, exercise_id, attempt_id, subject, reason, resolved)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, att_id, 'python', $c$Issue with the interger value check algorithm.$c$, false);
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
import random

def user_input():

    difficulty_level = int(input("""Please choose the difficulty level,
1. Easy
2. Hard\n"""))

    return difficulty_level


def random_value_processor():

    random_number = random.randint(1,100)

    return random_number


while True:

    start_game = input("Please enter Y to start the game. N to end it.\n"). lower()

    if start_game == "n":
        break
    elif start_game != "y":
        print("Please enter correct choice\n")

    Attempts = 0

    while True:

        difficulty = user_input()
        random_number = random_value_processor()

        if difficulty == 1:
            Attempts += 10
        else:
            Attempts += 5

        print(f"attempts are {Attempts}")

        for Attempt in range(Attempts):

            while True:
                guess = input("Please guess the number \n")
                if guess.isdigit():
                    user_guess = int(guess)
                    break
                else:
                    print("Please enter a valid number")

            print(user_guess-random_number)
            print(random_number-user_guess)

            if user_guess-random_number == 0:
                print("Your guess is correct")
            elif 0 < random_number-user_guess <= 3:
                print("Number is slightly low")
            elif 0 < user_guess-random_number <= 3:
                print("Number is slightly high")
            elif user_guess < random_number:
                print("Number is too low")
            elif user_guess > random_number:
                print("Number is too high")

            print(random_number-user_guess)

            Attempts -= 1
            print(f"{Attempts} attempts left")

            if Attempts == 0:
                break
        break

        print(f"The answer was {random_number}")

        if Attempts >= 0 and user_guess-random_number == 0:
            print("Congratulations
    break$c$,
          $c$Please enter Y to start the game. N to end it.
Y
Please choose the difficulty level,
1. Easy
2. Hard
2
attempts are 5
Please guess the number 
50
17
-17
Number is too high
-17
4 attempts left
Please guess the number 
30
-3
3
Number is slightly low
3
3 attempts left
Please guess the number 
35
2
-2
Number is slightly high
-2
2 attempts left
Please guess the number 
33
0
0
Your guess is correct
0
1 attempts left
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
import random

def user_input():

    User_choice = int(input("""Choose any one option from the below
1: Do you want to draw
   a new card?
2: Don't draw the card.
   Pass the move to Computer
3: To end the game and
   match the score \n"""))

    card_score = [1,2,3,4,5,6,7,8,9,10,10,10,10]

    user_card = random.randint(1,len(card_score))
    computer_card = random.randint(1,len(card_score))

    return User_choice, user_card, computer_card

def computer_input(score):

    if 10 < score < 18:
        return random.randint(1,2)

    elif score > 18:
        return random.randint(2,3)

    else:
        return 1

while True:
    print("Welcome to the Blackjack game")
    start = input("""Type Y to start the game.
    Type N to exit the game.""").lower()

    if start == "n":
        print("Game over")
        break

    elif start != "y":
        print("Please enter correct input value")

    max_score = 0
    round = 0
    user_score = 0
    computer_score = 0

    while True:

        while True:
            user_choice, user_card_value, computer_card_value= user_input()
            computer_choice = computer_input(computer_card_value)

            if user_choice not in [1,2,3]:
                print("Please input the correct choice")
            else:
                break

        if user_choice == 3 or computer_choice == 3 or max_score > 21:

            if user_score == max_score and max_score > 21:
                print(f"You lost as your score is, {user_score}. You crossed the max allowed score value of 21.")

            elif computer_score == max_score and max_score > 21:
                print(f"You won as computer score is, {computer_score}. Computer crossed the max allowed score value of 21.")

            elif user_score > computer_score:
                print(f"You won with the score {max_score} Vs computer score {computer_score}")

            elif computer_score > user_score:
                print(f"Computer won with the score {max_score} Vs your score {user_score}")

            else:
                print(f"It's a tie. Score levels at {max_score}")

            break

#        if user_choice != 3 or computer_choice != 3:
        if all([user_choice != 3, computer_choice != 3]):

            round += 1

            if user_choice == 1 or user_choice == 2:
                if user_score + user_card_value > 21:
                    print("")

                elif user_choice == 1:
                    user_score += user_card_value

                else:
                    user_score

            if computer_choice == 1 or computer_choice == 2:
                if computer_score + computer_card_value > 21:
                    print("")

                elif computer_choice == 1:
                    computer_score += computer_card_value

                else:
                    computer_score

#            if any([user_score + user_card_value < 21, computer_score + computer_card_value < 21]):
            if user_choice == 1 or user_choice == 2 or computer_choice == 1 or computer_choice == 2:
                    print(f"Your score after round {round} is {user_score}")
                    print(f"Computer score after round {round} is {computer_score}")

            max_score = max(user_score,computer_score)$c$,
          NULL, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$print(max(2,2))

import random

def computer_input(score):

    if 10 < score < 18:
        return random.randint(1,2)

    elif score > 18:
        return random.randint(2,3)

    else:
        return 1

def user_input():

    User_choice = int(input("""Choose any one option from the below
1: Do you want to draw a new card?
2: Don't draw the card. Pass the move to Computer
3: To end the game and match the score \n"""))

    card_score = [1,2,3,4,5,6,7,8,9,10,10,10,10]

    user_card = random.randint(1,len(card_score))
    computer_card = random.randint(1,len(card_score))

    return User_choice, user_card, computer_card

user_choice, user_card_value, computer_card_value= user_input()

print(user_choice)
print(type(user_choice))
print(user_card_value)
print(computer_card_value)

print(type(computer_input(15)))$c$,
          $c$2
Choose any one option from the below
1: Do you want to draw a new card?
2: Don't draw the card. Pass the move to Computer
3: To end the game and match the score 
1
1
<class 'int'>
9
3
<class 'int'>
$c$, NULL)
  RETURNING id INTO att_id;

  -- [57] '1. Coffee machine project'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$1. Coffee machine project$c$, $c$The goal is to build the program for a coffee machine.$c$, NULL,
          ARRAY[$c$import:beginner$c$, $c$Section 15: Local Development Environment Setup & the Coffee Machine$c$]::text[], 57)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$
MENU = {
    "espresso": {
        "ingredients": {
            "water": 50,
            "coffee": 18,
        },
        "cost": 1.5,
    },
    "latte": {
        "ingredients": {
            "water": 200,
            "milk": 150,
            "coffee": 24,
        },
        "cost": 2.5,
    },
    "cappuccino": {
        "ingredients": {
            "water": 250,
            "milk": 100,
            "coffee": 24,
        },
        "cost": 3.0,
    }
}

resources = {
    "water": 300,
    "milk": 200,
    "coffee": 100,
}

number_to_drink = {
    1: "espresso",
    2: "latte",
    3: "cappuccino",
}

def user_input():

    coffee_choice = input("""Welcome to our café
What would you like to have?
Choose,
1: espresso
2: latte
3: cappuccino \n""")

    if coffee_choice == "off" or coffee_choice == "report":
        return coffee_choice

    return int(coffee_choice)

water_left = resources["water"]
milk_left = resources["milk"]
coffee_left = resources["coffee"]


while True:

    while True:

        while True:

            coffee_choice = user_input()

            if coffee_choice == "off":
                print("Turning off the ☕ machine")
                break

            if coffee_choice == "report":
                print(resources)
                break

            if all([coffee_choice != 3,coffee_choice != 2,coffee_choice != 1]):
                print("Please enter the correct choice")

            drink = number_to_drink.get(coffee_choice)
            print(drink)

            water_alert = False
            milk_alert = False
            coffee_alert = False

            water_consumed = 0
            milk_consumed = 0
            coffee_consumed = 0

            if water_left-(MENU[drink]["ingredients"]["water"]) < 0:
                water_alert = True
                break

            elif (coffee_left-MENU[drink]["ingredients"]["coffee"]) < 0:
                coffee_alert = True
                break

            if drink != "espresso":
                if (milk_left-MENU[drink]["ingredients"]["milk"]) < 0:
                    milk_alert = True
                    break

            if coffee_choice == 1:
                choice_1 = input("""Your have chosen espresso.
Please enter Y to confirm your order.
Please enter N to return to the menu.\n""").lower()

                if choice_1 == "n":
                    break
                elif choice_1 == "y":
#                    print(MENU[coffee_choice])

#.                  Correction using copilot
                    print(f"Here is your {list(MENU.keys())[0]}")  # dynamically gets the first drink name

#                    water_left = resources["water"]-MENU(["expresso"]["ingredients"]["water"])

                    water_consumed = resources["water"]-MENU["espresso"]["ingredients"]["water"]
                    milk_consumed = milk_consumed
                    coffee_consumed = resources["coffee"]-MENU["espresso"]["ingredients"]["coffee"]

            elif coffee_choice == 2:
                choice_2 = input("""Your have chosen latte.
Please enter Y to confirm your order.
Please enter N to return to the menu.\n""").lower()

                if choice_2 == "n":
                    break
                elif choice_1 == "y":
#                    print(MENU[coffee_choice])

#.                  Correction using copilot
                    print(f"Here is your {list(MENU.keys())[1]}")  # dynamically gets the first drink name

#                    water_left = resources["water"]-MENU(["expresso"]["ingredients"]["water"])

                    water_consumed = MENU["latte"]["ingredients"]["water"]
                    milk_consumed = MENU["latte"]["ingredients"]["milk"]
                    coffee_consumed = MENU["latte"]["ingredients"]["coffee"]
            elif coffee_choice == 3:
                choice_3 = input("""Your have chosen cappuccino.
Please enter Y to confirm your order.
Please enter N to return to the menu.\n""").lower()

                if choice_3 == "n":
                    break
                elif choice_1 == "y":
#                    print(MENU[coffee_choice])

#.                  Correction using copilot
                    print(f"Here is your {list(MENU.keys())[2]}")  # dynamically gets the first drink name

#                    water_left = resources["water"]-MENU(["expresso"]["ingredients"]["water"])

                    water_consumed = MENU["cappuccino"]["ingredients"]["water"]
                    milk_consumed = MENU["cappuccino"]["ingredients"]["milk"]
                    coffee_consumed = MENU["cappuccino"]["ingredients"]["coffee"]

            water_left = water_left - water_consumed
            milk_left = milk_left - milk_consumed
            coffee_left = coffee_left - coffee_consumed

            print(f"water left is {water_left}")
            print(f"milk left is {milk_left}")
            print(f"coffee left is {coffee_left}")


    if coffee_choice == "off":
        break

    if any([choice_1 == "n", choice_2 == "n", choice_3 == "n"]):
        break

    if water_alert != False:
        print("""There is a insufficient water in the machine.
Please call the staff and try again.""")

        if milk_alert != False:
            print("""There is a insufficient milk in the machine.
Please call the staff and try again.""")

            if coffee_alert != False:
                print("""There is are insufficient coffee beans in machine.
Please call the staff and try again.""")
    break$c$,
          NULL, NULL)
  RETURNING id INTO att_id;

  -- [58] 'Please choose between the following options,'  (1 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Please choose between the following options,$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Games$c$]::text[], 58)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

def user_ip():

  print("Please choose between the following options,")
  print("1: Rock")
  print("2: Paper")
  print("3: Scissors")
  print("4: Quit")
  a= int(input("Please enter your Input: "))

  return a

while True:
  a=user_ip()
  b=random.randint(1,3)

  print ("You chose: " + str(a))
  print ("Computer chose: " + str(b))

  if (a==4):
    print ("Game is over!")
    break

  else:
    if ((a==1 and b == 3) or (a==2 and b==1) or (a==3 and b==2)):
      print("You won!!!")

    elif((a==1 and b == 2) or (a==2 and b == 3) or (a==3 and b == 1)):
      print("You lost")

    elif(a==b):
      print("It's a Tie")

    else:
      print("This input is not recognised. Please choose option between 1-3 or 4 to quit the game.")$c$,
          $c$Please choose between the following options,
1: Rock
2: Paper
3: Scissors
4: Quit
Please enter your Input: 7
You chose: 7
Computer chose: 2
This input is not recognised. Please choose option between 1-3 or 4 to quit the game.
Please choose between the following options,
1: Rock
2: Paper
3: Scissors
4: Quit
Please enter your Input: 3
You chose: 3
Computer chose: 1
You lost
Please choose between the following options,
1: Rock
2: Paper
3: Scissors
4: Quit
Please enter your Input: 4
You chose: 4
Computer chose: 3
Game is over!
$c$, NULL)
  RETURNING id INTO att_id;

  -- [59] 'Me and computer will roll the dices.'  (2 attempts)
  INSERT INTO commonplace_exercises (user_id, subject, title, prompt, difficulty, tags, order_index)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', 'python', $c$Me and computer will roll the dices.$c$, NULL, NULL,
          ARRAY[$c$import:beginner$c$, $c$Games$c$]::text[], 59)
  RETURNING id INTO ex_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$import random

def user_input():
  print("Enter y to start the game/n")
  print("Enter q to quit the game")

  a= int(input("Please enter your Input: "))

  return a


while True:

  a= user_input()
  roll_b = 1
  roll_c = 1

  b = random.randint(1,6)
  c = random.randint(1,6)

  if (a == "q"):
    print("Game is over")
    break

  elif (roll_b == 6 and roll_c == 6):
    print("The results are,/n")
    print("The use score is: {b},/n")
    print("The computer score is: {c},/n")

  # Counting the dice rolls for user

  else:
    for roll in range (1,6):
      if (b != 6):
        roll_b += roll_b
      else:
        roll_b

    count_b = b
    b= b+ count_b

    print("User score is: " + str(b))$c$,
          $c$Enter y to start the game/n
Enter q to quit the game
$c$, NULL)
  RETURNING id INTO att_id;
  INSERT INTO commonplace_attempts (user_id, exercise_id, subject, language, code, stdout, passed)
  VALUES ('e91a5f37-e63a-4fd0-8488-4d7a51d56822', ex_id, 'python', 'python', $c$


import random

word_list = ["artwork", "baboon", "camel"]


c = random.randint(0,len(word_list)-1)


print("-" * len(word_list[c]))

a = random.randint(0,len(word_list[c])-1)
print(word_list[c])

Answer = ""

while True:
    b = input("Please choose any random word: \n")

    if Answer == word_list[c]:
        print("You won!!!")
        break

    elif Answer == "":
        for character in word_list[c]:

            if b == character:
                Answer += b
            else:
                Answer += "-"
    else:
        temp1 = ""
        for character in Answer:

            if character == "-":
                for character in word_list[c]:
                    if character == b:
                        temp1 += b
                    else:
                        temp1 += "-"
            elif character != b:
                temp1 += character
            else:
                temp1 += b
        Answer = temp1

    print(Answer)$c$,
          NULL, NULL)
  RETURNING id INTO att_id;
END
$IMPORT$;

COMMIT;
