# ---- Colour helpers (ANSI escape codes) ----
RED    = "\033[91m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"   # turns colour back off

print(f"{BOLD}{CYAN}Welcome to Python Pizza Deliveries!{RESET}")

# Ask everything up front (.upper() so 's' works like 'S')
size          = input(f"{YELLOW}What size pizza do you want? S, M or L: {RESET}").upper()
add_pepperoni = input(f"{YELLOW}Do you want pepperoni? Y or N: {RESET}").upper()
extra_cheese  = input(f"{YELLOW}Do you want extra cheese? Y or N: {RESET}").upper()

bill = 0
if size == "S":
    bill = 15
elif size == "M":
    bill = 20
elif size == "L":
    bill = 25
else:
    print(f"{RED}Please enter S, M or L.{RESET}")

# Toppings apply to EVERY size, not just Large
if add_pepperoni == "Y":
    bill += 2 if size == "S" else 3   # course charges $2 on small, $3 otherwise
if extra_cheese == "Y":
    bill += 1

print(f"{BOLD}{GREEN}Your final bill is: ${bill}{RESET}")
