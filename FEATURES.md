# Prompts

## Testing

What type of tests does the project actually have?
I think of API tests and UI driven tests. Which are already there?
How do I execute them?


##  Add cost rating

Add a cost rating to the model drop down in the ui where you can select the modelId.
The rating should consists of 4 coins and an optional costs value (for image models).
The cost value should be on the left side, before the first coin.
In the 3 rows of the model description, the rating should be located in the first row aligned to the right.
The 4 coins are always shown, greyed out or fully colored. That means for a rating 1 out of 4,
the first coin is colored and the other 3 are displayed in a very light gray.
The precision is 0,5 coins, find a way to display half coins at any position.
Move the cicle that is shown for the selected model in the drop down menu to the third row at the end, right side.
The value of the rating (number of coins, fix costs) comes from the lib/ai/models.ts, extend the structure accordingly.
Make the design nice to fit into the simple and clean design of the overall page.
Check if radix ui has already a component for this and adapt this if needed.

## Add Anthrophic Claude Models

Add the following models from Anthropic to the application:
- Claude Opus 4
- Claude Sonnet 4
- Claude Haiku 3.5

Consider this cost:
```
Claude Opus 4
Most intelligent model for complex tasks
Input
$15 / MTok
Output
$75 / MTok
Prompt caching
Write $18.75 / MTok
Read $1.50 / MTok
Claude Sonnet 4
Optimal balance of intelligence, cost, and speed
Input
$3 / MTok
Output
$15 / MTok
Prompt caching
Write $3.75 / MTok
Read $0.30 / MTok
Claude Haiku 3.5
Fastest, most cost-effective model
Input
$0.80 / MTok
Output
$4 / MTok
Prompt caching
Write $1 / MTok
Read $0.08 / MTok
```

Consider all parts of the app and analyse everything first!

---

## Cost coins in the drop down are not working in dark mode

Fix the way the coins are shown in darkmode.
We see right now white circles only.
Make sure the way it is displayed right now is not changed in light mode.

---

## Cost calculations on user level and chat level

As a user I want to know which costs I have produced in total and per chat.

Implementation ideas:
- store usage per message in the db in an extra field, this is something that will not change!
- collect this information to calculate the costs on chat level
  - add a field costs on chat level
- collect all chats per user to have it on user level
  - add a field costs on user level

Use the user menue and the chat menue to add the cost information here

---

## GitHub docker image creation

Explain how I can build an image/container the will be stored on github to be easilie used for others to spinn up a docker container on their machine with the latest development state.
Is this build locally or via action on github?
Is the bases a docker file?
When build on github, how are the costs handled?
Ok, to be clear, I want to build the docker image locally and want to push it to github manually via cli.
Provide all neccecary files and commands and a detiled description on how to do this.
Analyse the project first to see what is needed in this context.