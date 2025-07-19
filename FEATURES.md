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

---

## Restrict sign up for defined user

Add a table to the db with the name Allowed_User.
This table has one column with the name email.
When doing a sign up or sign in there will be a check if the email is in this table/column.
If not the user get a ustom message, like contact Thorsten Schminkel to get access to the system.
The message is a modal dialog, check the app how modal dialogs should look like.
Fill the table initally with thorsten@schminkel.de

---

## Add some marketing information about the app to the fist page (login)

Create a component that I can add to the top of my login page.
The key befefit of this app is that you can test and use all available big models in one app.
The idea is pay per use without any monthly fees, fair an easy.
The user has full controll over their spendings and sees this in the message, the chat and overall per user.
The user can buy credits in order to have money to spend. And can use even a small amount of money over a long periode of time.
Add this information to the login page so that the use has a basic understanding of what he or she is doing the login for.
Do not implement those features, focus on the illustration of these features on the login page, marketing text only.
Make the illustration clear, not too much text and maybe some fancy design.
Make also very short in the explaination, this is still a login page not a landing page!

---

## Add roles to users

Admin can add user to allowed user list

---

## Add EU Bedrock support

Add model from Bedrock that are hosted in the EU

--

## Drizzle Studio Setuo

I want to improve my docker container and want to run drizzle studio in it per default. Set this up for me

---

## Redis Role and Feature

Explain to me in very simple words where Redis is used in this project and what purpose it solves.
Which functionality from a user perspective is improved?
What is not working when Redis is not available?
Explain which data are stored in Redis for what amount of time and how much load is on the system.

